import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { intakeSchema } from "@/lib/validators/intake";

// Helper to generate control number like DARLENE example: 4A0896D00E96 (10 hex chars)
function genControlNumber(): string {
  return Math.random().toString(16).slice(2, 12).toUpperCase().padEnd(10, "0");
}
function toDateOrNull(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// POST /api/intake → authenticated (MANAGER or EMPLOYEE) — creates Tenant + Lease + Inspection atomically, then generates PDF
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = intakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data as Record<string, unknown> & typeof parsed.data;

    // Normalize names: prefer explicit first/last, fallback to fullName split
    let firstName = (d.firstName as string | null | undefined)?.trim() || "";
    let lastName = (d.lastName as string | null | undefined)?.trim() || "";
    let middleName = (d.middleName as string | null | undefined)?.trim() || null;
    const fullNameRaw = (d.fullName as string | null | undefined)?.trim();
    if ((!firstName || !lastName) && fullNameRaw) {
      const parts = fullNameRaw.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        if (!firstName) firstName = parts[0];
        if (!lastName) lastName = parts[parts.length - 1];
        if (!middleName && parts.length > 2) middleName = parts.slice(1, -1).join(" ");
      } else if (parts.length === 1) {
        if (!firstName) firstName = parts[0];
        if (!lastName) lastName = "-";
      }
    }
    if (!firstName) firstName = "Unknown";
    if (!lastName) lastName = "Tenant";

    // Validate property/unit relation and vacancy
    const unit = await prisma.unit.findUnique({
      where: { id: d.unitId as string },
      include: { property: true, leases: { where: { status: "ACTIVE" }, take: 1 } },
    });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    if (unit.propertyId !== d.propertyId) {
      return NextResponse.json({ error: "Unit does not belong to selected property" }, { status: 400 });
    }
    if (unit.leases.length > 0) {
      return NextResponse.json({ error: "Unit is already occupied by an active lease" }, { status: 409 });
    }

    // Unique email check if provided
    const emailRaw = (d.email as string | null | undefined)?.trim() || null;
    if (emailRaw) {
      const existing = await prisma.tenant.findUnique({ where: { email: emailRaw } });
      if (existing) {
        return NextResponse.json({ error: "A tenant with this email already exists" }, { status: 409 });
      }
    }

    // Emergency contacts: up to 2, with email/messenger
    const ec1 = (d.emergencyContactName as string | null) || (d.emergencyContactPhone as string | null)
      ? {
          name: (d.emergencyContactName as string) || "",
          phone: (d.emergencyContactPhone as string) || "",
          email: (d.emergencyContactEmail as string) || "",
          messenger: (d.emergencyContactMessenger as string) || (d.emergencyContactRelationship as string) || "",
        }
      : null;
    const ec2 = (d.emergencyContact2Name as string | null) || (d.emergencyContact2Phone as string | null)
      ? {
          name: (d.emergencyContact2Name as string) || "",
          phone: (d.emergencyContact2Phone as string) || "",
          email: (d.emergencyContact2Email as string) || "",
          messenger: (d.emergencyContact2Messenger as string) || "",
        }
      : null;
    const emergencyContacts = [ec1, ec2].filter(Boolean).length ? [ec1, ec2].filter(Boolean) : undefined;

    // Financials: compute total if not provided
    const rate = (d.rate as number | null | undefined) ?? null;
    const oneMonth = (d.oneMonthAdvance as number | null | undefined) ?? null;
    const twoMonths = (d.twoMonthsDeposit as number | null | undefined) ?? null;
    const addonsAmt = (d.addonsAmount as number | null | undefined) ?? null;
    let totalAmountToSettle = d.totalAmountToSettle as number | null | undefined;
    if ((totalAmountToSettle === null || totalAmountToSettle === undefined) && (rate !== null || oneMonth !== null || twoMonths !== null)) {
      totalAmountToSettle = (oneMonth ?? rate ?? 0) + (twoMonths ?? (rate !== null ? rate * 2 : 0)) + (addonsAmt ?? 0);
    }
    if (totalAmountToSettle === null || totalAmountToSettle === undefined) totalAmountToSettle = rate ?? 0;

    const contractType = (d.contractType as string) || (() => {
      const t = String((d.terms as string) || "").toLowerCase();
      if (t.includes("trial")) return "TRIAL";
      if (t.includes("m2m") || t.includes("month-to-month") || t.includes("m2m")) return "M2M";
      return "LONG_TERM";
    })();

    const terms = (d.terms as string | null) || (contractType === "LONG_TERM" ? "1 year" : contractType === "M2M" ? "Month-to-Month" : "Trial");

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName?.trim() || null,
          age: (d.age as number | null | undefined) ?? null,
          gender: (d.gender as string | null | undefined)?.trim() || null,
          nationality: (d.nationality as string | null | undefined)?.trim() || null,
          religion: (d.religion as string | null | undefined)?.trim() || null,
          civilStatus: (d.civilStatus as string | null | undefined)?.trim() || null,
          mobileNumber: (d.mobileNumber as string).trim(),
          email: emailRaw,
          fbMessenger: (d.fbMessenger as string | null | undefined)?.trim() || null,
          permanentAddress: (d.permanentAddress as string | null | undefined)?.trim() || null,
          recentAddress: (d.recentAddress as string | null | undefined)?.trim() || null,
          company: (d.company as string | null | undefined)?.trim() || null,
          companyPosition: (d.position as string | null | undefined)?.trim() || null,
          workStatus: (d.workStatus as string | null | undefined)?.trim() || null,
          companyAddress: (d.companyAddress as string | null | undefined)?.trim() || null,
          companyTel: (d.companyTel as string | null | undefined)?.trim() || null,
          companyEmail: (d.companyEmail as string | null | undefined)?.trim() || null,
          companyMessenger: (d.companyMessenger as string | null | undefined)?.trim() || null,
          marketingSource: (d.howDidYouFindOut as string | null | undefined)?.trim() || null,
          idType: (d.typeOfId as string | null | undefined)?.trim() || null,
          idNumber: (d.idNumber as string | null | undefined)?.trim() || null,
          idLink: (d.idLink as string | null | undefined)?.trim() || null,
          dateIssued: toDateOrNull(d.dateIssued as string | null | undefined),
          emergencyContacts: emergencyContacts as never,
        },
      });

      const lease = await tx.lease.create({
        data: {
          tenantId: tenant.id,
          unitId: d.unitId as string,
          contractType: contractType as never,
          rentalStartDate: new Date(d.rentalStartDate as string),
          rentalEndDate: new Date(d.rentalEndDate as string),
          totalAmountToSettle: totalAmountToSettle as number,
          status: (d.leaseStatus as string) as never,
          monthlyRent: rate ?? null,
          rate: rate ?? null,
          advance1Month: oneMonth ?? null,
          deposit2Months: twoMonths ?? null,
          securityDeposit: twoMonths ?? (rate !== null ? rate * 2 : null),
          advanceDeposit: oneMonth ?? rate ?? null,
          addons: d.addons ? ([{ label: String(d.addons), amount: addonsAmt ?? 0 }] as never) : undefined,
          addonsAmount: addonsAmt ?? null,
          occupancySupportFee: (d.occupancySupportFee as number | null | undefined) ?? null,
          leaseTerm: terms,
          terms: terms,
          dueDateText: (d.dueDate as string | null | undefined)?.trim() || null,
          contactNumberAlt: (d.contactNumber as string | null | undefined)?.trim() || null,
          fbMessenger: (d.fbMessenger as string | null | undefined)?.trim() || null,
          permanentAddressAlt: (d.permanentAddress as string | null | undefined)?.trim() || null,
          numPersons: (d.numberOfPerson as number | null | undefined) ?? null,
          waterReading: (d.waterReading as number | null | undefined) ?? null,
          electricReading: (d.electricReading as number | null | undefined) ?? null,
          availFrom: toDateOrNull(d.availmentFrom as string | null | undefined),
          availTo: toDateOrNull(d.availmentTo as string | null | undefined),
          items: (d.items as string | null | undefined)?.trim() || null,
          currentDate: toDateOrNull(d.date as string | null | undefined) ?? new Date(),
          timeIn: (d.timeIn as string | null | undefined)?.trim() || null,
          day20: toDateOrNull(d.day20 as string | null | undefined),
          dateSigned: toDateOrNull(d.dateSigned as string | null | undefined),
          propertyRep: (d.propertyRepresentative as string | null | undefined)?.trim() || null,
          propertyLoc: `Eve's Residences, ${unit.property.name} at ${unit.property.address ?? "No. 69 Matahimik St. Riverside II Brgy. Sto. Domingo Cainta, Rizal"}`,
          controlNumber: genControlNumber(),
          barCode: null,
          documentStatus: "PENDING_GENERATION" as never,
        },
      });

      const inspection = await tx.inspection.create({
        data: {
          leaseId: lease.id,
          type: "MOVE_IN",
          waterReading: (d.waterReading as number | null | undefined) ?? null,
          electricReading: (d.electricReading as number | null | undefined) ?? null,
          switches: (d.switches as string | null | undefined) || null,
          switchesCom: (d.switchesComment as string | null | undefined) || null,
          sockets: (d.sockets as string | null | undefined) || null,
          socketsCom: (d.socketsComment as string | null | undefined) || null,
          cabinet: (d.cabinet as string | null | undefined) || null,
          cabinetCom: (d.cabinetComment as string | null | undefined) || null,
          lavatory: (d.lavatory as string | null | undefined) || null,
          lavatoryCom: (d.lavatoryComment as string | null | undefined) || null,
          lightBulb: (d.lightBulb as string | null | undefined) || null,
          lightBulbCom: (d.lightBulbComment as string | null | undefined) || null,
          faucets: (d.faucets as string | null | undefined) || null,
          faucetsCom: (d.faucetsComment as string | null | undefined) || null,
          showerHead: (d.showerHead as string | null | undefined) || null,
          showerHeadCom: (d.showerHeadComment as string | null | undefined) || null,
          toiletFlush: (d.toiletFlush as string | null | undefined) || null,
          toiletFlushCom: (d.toiletFlushComment as string | null | undefined) || null,
          toiletBowl: (d.toiletBowl as string | null | undefined) || null,
          toiletBowlCom: (d.toiletBowlComment as string | null | undefined) || null,
          kitchenSink: (d.kitchenSink as string | null | undefined) || null,
          kitchenSinkCom: (d.kitchenSinkComment as string | null | undefined) || null,
          wallPaint: (d.wallPaint as string | null | undefined) || null,
          wallPaintCom: (d.wallPaintComment as string | null | undefined) || null,
          optional: (d.optionalItem as string | null | undefined) || null,
          optionalCom: (d.optionalComment as string | null | undefined) || null,
          windows: (d.windows as string | null | undefined) || null,
          windowsCom: (d.windowsComment as string | null | undefined) || null,
          checklistJson: (d.checklistJson as never) ?? undefined,
          remarks: (d.remarks as string | null | undefined) || null,
        },
      });

      await tx.unit.update({
        where: { id: d.unitId as string },
        data: { status: "OCCUPIED" },
      });

      return { tenant, lease, inspection };
    });

    // Generate PDF after transaction (outside, so failure doesn't rollback lease)
    let documentLink: string | null = null;
    let documentStatus: string | null = null;
    try {
      const fullLease = await prisma.lease.findUnique({
        where: { id: result.lease.id },
        include: { tenant: true, unit: { include: { property: true } }, inspections: true },
      });
      if (fullLease) {
        const { generateLeasePDF } = await import("@/lib/lease-pdf/generator");
        const buf = await generateLeasePDF(fullLease as never);
        const { uploadLeasePdf } = await import("@/lib/storage");
        const { url } = await uploadLeasePdf(fullLease.id, buf);
        documentLink = url;
        documentStatus = "DRAFT_GENERATED";
        await prisma.lease.update({ where: { id: fullLease.id }, data: { documentLink: url, documentStatus: "DRAFT_GENERATED" as never, documentError: null } });
      }
    } catch (pdfErr) {
      const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
      console.error("[POST /api/intake] PDF generation failed", msg);
      await prisma.lease.update({ where: { id: result.lease.id }, data: { documentStatus: "GENERATION_FAILED" as never, documentError: msg.slice(0, 2000) } }).catch(() => {});
      documentStatus = "GENERATION_FAILED";
    }

    return NextResponse.json({ ...result, documentLink, documentStatus }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/intake]", err);
    return NextResponse.json({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// GET /api/intake → list recent intakes (leases + tenant + unit)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leases = await prisma.lease.findMany({
      include: {
        tenant: true,
        unit: { include: { property: true } },
        inspections: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ leases });
  } catch (err) {
    console.error("[GET /api/intake]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
