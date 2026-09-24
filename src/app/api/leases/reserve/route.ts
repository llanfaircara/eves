import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reserveSchema, contractTypeFromTerm, leaseStatusFromDraft } from "@/lib/validators/reserve";
import { generateLeasePDF } from "@/lib/lease-pdf/generator";
import { uploadLeasePdf } from "@/lib/storage";

// POST /api/leases/reserve — Reserve Unit → create Tenant+Lease, generate PDF, store link
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Only MANAGER/ADMIN can reserve (employee can intake, but reserve is marketing/manager)
  const role = (session.user as { role?: string }).role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — manager or admin only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reserveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Resolve unit: prefer dbUnitId, else lookup by property + unitId label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unit: any = null;
  if (d.dbUnitId) {
    unit = await prisma.unit.findUnique({ where: { id: d.dbUnitId }, include: { property: true } });
  } else {
    const prop = await prisma.property.findFirst({ where: { name: d.property } });
    if (prop) {
      unit = await prisma.unit.findFirst({
        where: { propertyId: prop.id, unitNumber: d.unitId },
        include: { property: true },
      });
      // Fallback: try case-insensitive / trimmed
      if (!unit) {
        unit = await prisma.unit.findFirst({
          where: { propertyId: prop.id, unitNumber: { equals: d.unitId, mode: "insensitive" } },
          include: { property: true },
        } as never);
      }
    }
    // Last fallback: search all properties by unitNumber label (forecast id may be ambiguous)
    if (!unit) {
      unit = await prisma.unit.findFirst({
        where: { unitNumber: d.unitId },
        include: { property: true },
      });
    }
  }

  // If unit still not found, create property+unit on the fly (sustainable — no spreadsheet needed)
  if (!unit) {
    const propName = d.property.trim().toUpperCase().replace(/888|168/g, "").trim() || "BNB";
    let prop = await prisma.property.findFirst({ where: { name: propName } });
    if (!prop) prop = await prisma.property.create({ data: { name: propName } });
    const created = await prisma.unit.create({
      data: { propertyId: prop.id, unitNumber: d.unitId, monthlyRate: d.monthlyRent, status: "RESERVED" as never },
      include: { property: true },
    });
    unit = created as unknown as typeof unit;
  }

  // Parse tenant name
  let firstName = (d.tenantFirstName ?? "").trim();
  let lastName = (d.tenantLastName ?? "").trim();
  if (!firstName || !lastName) {
    const full = (d.tenantName ?? "").trim();
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      firstName = firstName || parts[0];
      lastName = lastName || parts.slice(1).join(" ");
    } else if (parts.length === 1) {
      firstName = firstName || parts[0];
      lastName = lastName || "-";
    }
  }
  const mobile = (d.tenantMobile ?? "").trim() || "09XXXXXXXXX";
  const emailRaw = (d.tenantEmail ?? "").trim() || null;
  const email = emailRaw && emailRaw.length > 0 ? emailRaw : null;

  // Financials — keep distinct variables (type safety: no swap)
  const monthlyRent = Number(d.monthlyRent);
  const securityDeposit = Number(d.firstDeposit);
  const advanceDeposit = Number(d.secondDeposit);
  const addons = d.addons ?? [];
  const addonsTotal = addons.reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalAmountToSettle = monthlyRent + securityDeposit + advanceDeposit + addonsTotal;

  // Create Tenant + Lease atomically; unit marked RESERVED (not yet OCCUPIED until move-in)
  let leaseId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let tenant;
      if (email) {
        const existing = await tx.tenant.findUnique({ where: { email } });
        if (existing) {
          // For Renewal/Transfer reuse; for New Lease also allow reuse by email
          tenant = existing;
          // Update mobile/company if provided
          await tx.tenant.update({
            where: { id: existing.id },
            data: {
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              mobileNumber: mobile !== "09XXXXXXXXX" ? mobile : existing.mobileNumber,
              company: d.tenantCompany?.trim() || existing.company,
            },
          });
        } else {
          tenant = await tx.tenant.create({
            data: { firstName, lastName, mobileNumber: mobile, email, company: d.tenantCompany?.trim() || null },
          });
        }
      } else {
        tenant = await tx.tenant.create({
          data: { firstName, lastName, mobileNumber: mobile, email: null, company: d.tenantCompany?.trim() || null },
        });
      }

      const lease = await tx.lease.create({
        data: {
          tenantId: tenant.id,
          unitId: unit!.id,
          contractType: contractTypeFromTerm(d.term) as never,
          rentalStartDate: new Date(d.leaseStart),
          rentalEndDate: new Date(d.leaseEnd),
          totalAmountToSettle,
          status: leaseStatusFromDraft(d.leaseStatus) as never,
          monthlyRent,
          securityDeposit,
          advanceDeposit,
          addons: addons as never,
          noticePeriodDays: d.noticePeriodDays,
          leaseIntent: d.intent,
          leaseTerm: d.term,
          moveInDate: new Date(d.moveInDate),
          rentDueDate: new Date(d.rentDueDate),
          documentStatus: "PENDING_GENERATION" as never,
        },
      });

      await tx.unit.update({
        where: { id: unit!.id },
        data: { status: "RESERVED" as never },
      });

      return { tenant, lease };
    });
    leaseId = result.lease.id;
  } catch (e) {
    console.error("[POST /api/leases/reserve] transaction failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("Unique")) {
      return NextResponse.json({ error: "Tenant email already exists or unit conflict", details: msg }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create reservation", details: msg }, { status: 500 });
  }

  // Step B/C/D: generate PDF → upload → update lease. Failure flags lease, does NOT roll back reservation.
  try {
    const fullLease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    if (!fullLease) throw new Error("Lease not found after creation");

    const buffer = await generateLeasePDF(fullLease as never);
    const { url } = await uploadLeasePdf(leaseId, buffer);

    const updated = await prisma.lease.update({
      where: { id: leaseId },
      data: { documentLink: url, documentStatus: "DRAFT_GENERATED" as never, documentError: null },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    return NextResponse.json(
      {
        lease: updated,
        documentLink: url,
        message: "Lease Generated Successfully!",
      },
      { status: 201 }
    );
  } catch (pdfErr) {
    const errMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
    console.error("[POST /api/leases/reserve] PDF generation/upload failed", errMsg);
    try {
      await prisma.lease.update({
        where: { id: leaseId },
        data: { documentStatus: "GENERATION_FAILED" as never, documentError: errMsg.slice(0, 2000) },
      });
    } catch {}
    // Return lease id so admin can retry
    return NextResponse.json(
      {
        error: "Reservation saved but document generation failed",
        leaseId,
        documentStatus: "GENERATION_FAILED",
        details: errMsg,
        retryUrl: `/api/leases/${leaseId}/document?retry=1`,
      },
      { status: 202 }
    );
  }
}
