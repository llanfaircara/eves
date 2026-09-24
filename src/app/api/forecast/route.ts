import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getForecastUnits as getLegacyForecast } from "@/lib/executive";
import type { ForecastUnit } from "@/lib/executive";

// GET /api/forecast — joins Unit + Lease to output ForecastUnit[]
// DB-backed when units exist; falls back to legacy JSON otherwise.
export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      include: {
        property: true,
        leases: {
          where: { status: { in: ["ACTIVE", "PENDING"] as never } },
          orderBy: { rentalEndDate: "desc" },
          take: 1,
          include: { tenant: true },
        },
      },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    });

    if (units.length === 0) {
      return NextResponse.json({ units: getLegacyForecast() });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: ForecastUnit[] = units.map((u) => {
      const lease = u.leases[0] ?? null;
      const end = lease?.rentalEndDate ? new Date(lease.rentalEndDate) : null;
      const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;
      const isOccupied = u.status === "OCCUPIED" || u.status === "RESERVED" || (!!validEnd && validEnd >= today);
      const earliest = validEnd && validEnd >= today ? validEnd : today;
      return {
        id: u.id,
        unitId: u.unitNumber,
        property: u.property.name,
        earliestAvailable: earliest.toISOString().slice(0, 10),
        confidence: validEnd ? "Confirmed" : "Estimated",
        occupancy: isOccupied ? "Occupied" : "Vacant",
        monthlyRate: u.monthlyRate ? Number(u.monthlyRate) : null,
        tenantName: lease ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : undefined,
        leaseEnd: lease?.rentalEndDate ? new Date(lease.rentalEndDate).toISOString().slice(0, 10) : null,
      };
    });

    return NextResponse.json({ units: rows });
  } catch (e) {
    console.error("[GET /api/forecast]", e);
    return NextResponse.json({ units: getLegacyForecast() });
  }
}
