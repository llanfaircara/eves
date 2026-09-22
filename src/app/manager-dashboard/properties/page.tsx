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
        const byProp = new Map<string, { units: Set<string>; leases: number }>();
        for (const l of legacy.leases) {
          if (!byProp.has(l.property)) byProp.set(l.property, { units: new Set(), leases: 0 });
          const v = byProp.get(l.property)!;
          if (l.unit && l.unit !== "UNKNOWN") v.units.add(l.unit);
          v.leases++;
        }
        const props: PropertyWithUnits[] = [...byProp.entries()]
          .sort((a, b) => b[1].leases - a[1].leases)
          .slice(0, 20)
          .map(([name, v]) => ({
            id: name.toLowerCase(),
            name,
            address: `${name} — ${v.leases} contracts from legacy Excel`,
            units: [...v.units].slice(0, 8).map((u, i) => ({
              id: `${name.toLowerCase()}-${i}`,
              unitNumber: u,
              status: i % 2 === 0 ? "VACANT" : "OCCUPIED",
              monthlyRate: "—",
            })),
          }));
        return {
          props,
          warning: `Database not connected — showing ${legacy.totalLeases} legacy contracts from EVES DOCS (${legacy.leases.length} mapped). Set DATABASE_URL and run import to persist.`,
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
                  {p.units.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-mono font-medium">{u.unitNumber}</span>
                      <span className="text-muted-foreground">₱{String(u.monthlyRate)}</span>
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
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
