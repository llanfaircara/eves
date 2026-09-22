import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const properties = await prisma.property.findMany({
      include: { units: { select: { id: true, unitNumber: true, status: true, monthlyRate: true } } },
      orderBy: { name: "asc" },
    });

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ properties, employees });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      try {
        const { getLegacyData } = await import("@/lib/legacy");
        const legacy = getLegacyData();
        const byPropUnit = new Map<string, Map<string, typeof legacy.leases[number]>>();
        for (const l of legacy.leases) {
          if (!l.unit || l.unit === "UNKNOWN") continue;
          if (!byPropUnit.has(l.property)) byPropUnit.set(l.property, new Map());
          const m = byPropUnit.get(l.property)!;
          const curEnd = l.rentalEnd || "";
          const exEnd = m.get(l.unit)?.rentalEnd || "";
          if (!m.has(l.unit) || curEnd > exEnd) m.set(l.unit, l);
        }
        const properties = [...byPropUnit.entries()].slice(0, 20).map(([name, unitMap]) => ({
          id: name.toLowerCase(),
          name,
          units: [...unitMap.entries()].map(([unitNumber, lease]) => {
            const end = lease.rentalEnd ? new Date(lease.rentalEnd) : null;
            const today = new Date(); today.setHours(0,0,0,0);
            const occupied = end ? end >= today : true;
            return {
              id: `${name.toLowerCase()}-${unitNumber}`,
              unitNumber,
              status: occupied ? "OCCUPIED" : "VACANT",
              monthlyRate: lease.rate ?? "—",
            };
          }),
        }));
        return NextResponse.json({
          properties,
          employees: [
            { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
            { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
          ],
          warning: `Database not connected — showing ${legacy.totalLeases} legacy contracts (latest per unit, occupancy by rentalEnd ≥ today, rate from Excel).`,
        });
      } catch {
        return NextResponse.json({
          properties: ["ADI","BNB","DREAM","ECO","GREEN","KALAYAAN"].map((name,i)=>({ id: name.toLowerCase(), name, units: [
            { id: `${name.toLowerCase()}-001`, unitNumber: `${name}-001`, status: "VACANT", monthlyRate: "15000" },
            { id: `${name.toLowerCase()}-002`, unitNumber: `${name}-002`, status: "VACANT", monthlyRate: "17500" },
            { id: `${name.toLowerCase()}-003`, unitNumber: `${name}-003`, status: "OCCUPIED", monthlyRate: "20000" },
          ]})),
          employees: [
            { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
            { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
          ],
          warning: "Database not connected — showing demo properties.",
        });
      }
    }
    console.error("[GET /api/properties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
