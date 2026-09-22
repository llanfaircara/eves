import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

type PropertyWithUnits = {
  id: string;
  name: string;
  address: string | null;
  units: { id: string; unitNumber: string; status: string; monthlyRate: unknown }[];
};

async function getProperties(): Promise<{ props: PropertyWithUnits[]; warning?: string }> {
  try {
    const props = await prisma.property.findMany({
      include: { units: { select: { id: true, unitNumber: true, status: true, monthlyRate: true } } },
      orderBy: { name: "asc" },
    });
    return { props: props as never };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      try {
        const { getLegacyData } = await import("@/lib/legacy");
        const legacy = getLegacyData();
        // Group leases by property -> unit -> latest lease
        const byPropUnit = new Map<string, Map<string, typeof legacy.leases[number]>>();
        for (const l of legacy.leases) {
          if (!l.unit || l.unit === "UNKNOWN") continue;
          if (!byPropUnit.has(l.property)) byPropUnit.set(l.property, new Map());
          const unitMap = byPropUnit.get(l.property)!;
          const existing = unitMap.get(l.unit);
          // Keep latest by rentalEnd (or rentalStart if end missing)
          const curEnd = l.rentalEnd || l.rentalStart || "";
          const exEnd = existing?.rentalEnd || existing?.rentalStart || "";
          if (!existing || curEnd > exEnd) unitMap.set(l.unit, l);
        }
        const props: PropertyWithUnits[] = [...byPropUnit.entries()]
          .sort((a, b) => b[1].size - a[1].size)
          .slice(0, 20)
          .map(([name, unitMap]) => {
            const units = [...unitMap.entries()].map(([unitNumber, lease], i) => {
              const end = lease.rentalEnd ? new Date(lease.rentalEnd) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOccupied = end ? end >= today : true; // if no end date, assume occupied
              return {
                id: `${name.toLowerCase()}-${unitNumber}`,
                unitNumber,
                status: isOccupied ? "OCCUPIED" : "VACANT",
                monthlyRate: lease.rate ?? "—",
                tenant: lease.fullName,
                end: lease.rentalEnd,
              } as unknown as PropertyWithUnits["units"][number];
            });
            const occupiedCount = units.filter((u) => u.status === "OCCUPIED").length;
            const totalMonthly = units
              .filter((u) => u.status === "OCCUPIED" && typeof u.monthlyRate === "number")
              .reduce((s, u) => s + Number(u.monthlyRate), 0);
            return {
              id: name.toLowerCase(),
              name,
              address: `${name} — ${unitMap.size} units, ${occupiedCount} occupied • ₱${totalMonthly.toLocaleString()} / mo • ${legacy.leases.filter((x) => x.property === name).length} contracts`,
              units,
            };
          });
        return {
          props,
          warning: `Database not connected — showing ${legacy.totalLeases} legacy contracts from EVES DOCS (latest per unit, occupancy by rentalEnd ≥ today). Accurate rates from Excel RATE column; vacancy derived from end date — verify against IT MONITORING 2026.xlsx for ground truth. Set DATABASE_URL and run import to persist.`,
        };
      } catch {
        const demo: PropertyWithUnits[] = ["ADI", "BNB", "DREAM", "ECO", "GREEN", "KALAYAAN"].map((name) => ({
          id: name.toLowerCase(),
          name,
          address: `${name} Property, Metro Manila`,
          units: [
            { id: `${name.toLowerCase()}-001`, unitNumber: `${name}-001`, status: "VACANT", monthlyRate: "15000" },
            { id: `${name.toLowerCase()}-002`, unitNumber: `${name}-002`, status: "OCCUPIED", monthlyRate: "17500" },
            { id: `${name.toLowerCase()}-003`, unitNumber: `${name}-003`, status: "VACANT", monthlyRate: "20000" },
          ],
        }));
        return { props: demo, warning: "Database not connected — showing demo properties." };
      }
    }
    throw e;
  }
}

export default async function PropertiesPage() {
  const { props, warning } = await getProperties();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-sm text-muted-foreground">6 legacy portfolios — ADI, BNB, DREAM, ECO, GREEN, KALAYAAN — and their units. Track vacancy and rates.</p>
      </div>

      {warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">{warning}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {props.map((p) => {
          const vacant = p.units.filter((u) => u.status === "VACANT").length;
          const occupied = p.units.filter((u) => u.status === "OCCUPIED").length;
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {p.name}
                </CardTitle>
                <CardDescription>{p.address || "No address"} — {p.units.length} units</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">{vacant} vacant</Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">{occupied} occupied</Badge>
                  <Badge variant="secondary">{p.units.length} total</Badge>
                </div>
                <div className="divide-y rounded-lg border">
                  {p.units.map((u) => {
                    const anyU = u as unknown as { tenant?: string; end?: string | null };
                    const isOccupied = u.status === "OCCUPIED";
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-mono font-medium">{u.unitNumber}</div>
                          {isOccupied && anyU.tenant && (
                            <div className="truncate text-xs text-muted-foreground">{anyU.tenant}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={isOccupied ? "font-medium" : "text-muted-foreground"}>
                            {u.monthlyRate === "—" || u.monthlyRate === null ? "—" : `₱${Number(u.monthlyRate).toLocaleString()}`}
                            {isOccupied && <span className="text-xs text-muted-foreground"> / mo</span>}
                          </div>
                          {isOccupied && anyU.end && (
                            <div className="text-xs text-muted-foreground">until {new Date(anyU.end).toLocaleDateString()}</div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            u.status === "VACANT"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : u.status === "OCCUPIED"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-muted"
                          }
                        >
                          {u.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {p.units.length > 12 && (
                  <p className="text-xs text-muted-foreground">Showing {p.units.length} units — all distinct unitNumbers from legacy. Vacancy = rentalEnd ≥ today.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
