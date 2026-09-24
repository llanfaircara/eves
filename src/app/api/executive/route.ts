import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRevenueSeries, getOverdueInvoices, getExpiringLeases } from "@/lib/executive";

export const dynamic = "force-dynamic";

// GET /api/executive — aggregation queries for revenue chart + expiring leases KPI
export async function GET() {
  try {
    const revenue = getRevenueSeries();
    const overdue = getOverdueInvoices();
    const expiringLegacy = getExpiringLeases(60);

    // DB-aware: count pending/failed documents + lease expirations from DB
    let dbExpiring: Array<{ id: string; unit: string; property: string; tenant: string; end: string; daysLeft: number }> = [];
    let dbRevenueNote: string | null = null;
    try {
      const in60 = new Date(Date.now() + 60 * 86400000);
      const today = new Date();
      const leases = await prisma.lease.findMany({
        where: { rentalEndDate: { gte: today, lte: in60 }, status: { in: ["ACTIVE", "PENDING"] as never } },
        include: { tenant: true, unit: { include: { property: true } } },
        orderBy: { rentalEndDate: "asc" },
        take: 20,
      });
      dbExpiring = leases.map((l) => ({
        id: l.id,
        unit: l.unit.unitNumber,
        property: l.unit.property.name,
        tenant: `${l.tenant.firstName} ${l.tenant.lastName}`,
        end: new Date(l.rentalEndDate).toISOString().slice(0, 10),
        daysLeft: Math.ceil((new Date(l.rentalEndDate).getTime() - today.getTime()) / 86400000),
      }));
      dbRevenueNote = `${dbExpiring.length} draft/active leases expiring soon (DB)`;
    } catch {
      dbRevenueNote = null;
    }

    return NextResponse.json({
      revenue,
      overdue,
      expiring: expiringLegacy,
      dbExpiring,
      dbRevenueNote,
    });
  } catch (e) {
    console.error("[GET /api/executive]", e);
    return NextResponse.json({ error: "Failed to load executive metrics" }, { status: 500 });
  }
}
