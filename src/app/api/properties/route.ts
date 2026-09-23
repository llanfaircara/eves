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
        const monitoring = await import("@/lib/monitoring-data.json").then((m) => (m.default || m) as { sheets: Record<string, { unit: string }[]> });
        const normProp = (s: string) => {
          const lower = s.toLowerCase().trim();
          if (lower === "b&b" || lower === "b & b" || lower.includes("b&b")) return "bnb";
          const t = lower.replace(/&/g, "").replace(/[^a-z]/g, "").replace(/888|168/g, "").trim();
          if (t === "bb" || t === "b" || t === "bnb" || t === "bbb") return "bnb";
          return t;
        };
        const monByProp = new Map<string, Set<string>>();
        for (const [sheet, tenants] of Object.entries(monitoring.sheets)) {
          const base = normProp(sheet);
          if (!monByProp.has(base)) monByProp.set(base, new Set());
          for (const t of tenants) {
            const u = (t.unit || "").toLowerCase().trim();
            if (u && u !== "unknown") monByProp.get(base)!.add(u);
          }
        }
        const byPropUnit = new Map<string, Map<string, typeof legacy.leases[number]>>();
        for (const l of legacy.leases) {
          if (!l.unit || l.unit === "UNKNOWN") continue;
          if (!byPropUnit.has(l.property)) byPropUnit.set(l.property, new Map());
          const m = byPropUnit.get(l.property)!;
          const curEnd = l.rentalEnd || "";
          const exEnd = m.get(l.unit)?.rentalEnd || "";
          if (!m.has(l.unit) || curEnd > exEnd) m.set(l.unit, l);
        }
        // Merge monitoring-only units
        for (const [sheet, tenants] of Object.entries(monitoring.sheets)) {
          const base = normProp(sheet);
          let legacyKey = [...byPropUnit.keys()].find((k) => normProp(k) === base);
          if (!legacyKey) {
            legacyKey = sheet.replace(/888|168/g, "").trim();
            if (!byPropUnit.has(legacyKey)) byPropUnit.set(legacyKey, new Map());
          }
          const unitMap = byPropUnit.get(legacyKey)!;
          for (const t of tenants as { unit: string; name: string; rate: unknown }[]) {
            const u = (t.unit || "").trim();
            if (!u || u.toLowerCase() === "unknown") continue;
            if (!unitMap.has(u)) {
              const placeholder = {
                property: legacyKey,
                unit: u,
                fullName: t.name,
                rate: typeof t.rate === "number" ? t.rate : null,
                rentalEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                rentalStart: new Date().toISOString().slice(0, 10),
              } as unknown as typeof legacy.leases[number];
              unitMap.set(u, placeholder);
            }
          }
        }
        const properties = [...byPropUnit.entries()].slice(0, 20).map(([name, unitMap]) => ({
          id: name.toLowerCase(),
          name: name === "BNB" ? "BNB (B&B)" : name,
          units: [...unitMap.entries()].map(([unitNumber, lease]) => {
            const monUnits = monByProp.get(normProp(name));
            const inMonitoring = monUnits ? monUnits.has(unitNumber.toLowerCase().trim()) : false;
            const end = lease.rentalEnd ? new Date(lease.rentalEnd) : null;
            const today = new Date(); today.setHours(0,0,0,0);
            const occupied = inMonitoring || (end ? end >= today : true);
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
          warning: `Database not connected — showing ${legacy.totalLeases} legacy + monitoring merged (BNB/B&B synced, occupancy = in monitoring OR rentalEnd ≥ today).`,
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
