import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { intakeSchema } from "@/lib/validators/intake";

// POST /api/intake → authenticated (MANAGER or EMPLOYEE) — creates Tenant + Lease + Inspection atomically
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

    const d = parsed.data;

    // Validate property/unit relation and vacancy
    const unit = await prisma.unit.findUnique({
      where: { id: d.unitId },
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
    if (d.email) {
      const existing = await prisma.tenant.findUnique({ where: { email: d.email } });
      if (existing) {
        return NextResponse.json({ error: "A tenant with this email already exists" }, { status: 409 });
      }
    }

    const emergencyContacts = d.emergencyContactName || d.emergencyContactPhone
      ? [{ name: d.emergencyContactName || "", phone: d.emergencyContactPhone || "", relationship: d.emergencyContactRelationship || "" }]
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          mobileNumber: d.mobileNumber.trim(),
          email: d.email || null,
          company: d.company || null,
          emergencyContacts: emergencyContacts as never,
        },
      });

      const lease = await tx.lease.create({
        data: {
          tenantId: tenant.id,
          unitId: d.unitId,
          contractType: d.contractType as never,
          rentalStartDate: new Date(d.rentalStartDate),
          rentalEndDate: new Date(d.rentalEndDate),
          totalAmountToSettle: d.totalAmountToSettle,
          status: d.leaseStatus as never,
        },
      });

      const inspection = await tx.inspection.create({
        data: {
          leaseId: lease.id,
          type: "MOVE_IN",
          waterReading: d.waterReading ?? null,
          electricReading: d.electricReading ?? null,
          checklistJson: (d.checklistJson as never) ?? null,
          remarks: d.remarks || null,
        },
      });

      // Mark unit occupied (idempotent if already)
      await tx.unit.update({
        where: { id: d.unitId },
        data: { status: "OCCUPIED" },
      });

      return { tenant, lease, inspection };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/intake]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
