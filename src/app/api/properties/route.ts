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
        const byProp = new Map<string, Set<string>>();
        for (const l of legacy.leases) {
          if (!byProp.has(l.property)) byProp.set(l.property, new Set());
          if (l.unit && l.unit !== "UNKNOWN") byProp.get(l.property)!.add(l.unit);
        }
        const properties = [...byProp.entries()].slice(0, 12).map(([name, set]) => ({
          id: name.toLowerCase(),
          name,
          units: [...set].slice(0, 6).map((u, i) => ({ id: `${name.toLowerCase()}-${i}`, unitNumber: u, status: i % 3 === 0 ? "OCCUPIED" : "VACANT", monthlyRate: "—" })),
        }));
        return NextResponse.json({
          properties,
          employees: [
            { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
            { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
          ],
          warning: `Database not connected — showing ${legacy.totalLeases} legacy contracts.`,
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
