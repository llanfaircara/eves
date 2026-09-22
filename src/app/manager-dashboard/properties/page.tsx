import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PropertiesClient from "@/components/properties/properties-client";

export const dynamic = "force-dynamic";

type Unit = {
  id: string;
  unitNumber: string;
  status: string;
  monthlyRate: unknown;
  tenant?: string;
  end?: string | null;
  lease?: unknown;
};

type PropertyWithUnits = {
  id: string;
  name: string;
  address: string | null;
  units: Unit[];
};

async function getProperties(): Promise<{ props: PropertyWithUnits[]; warning?: string }> {
  try {
    const props = await prisma.property.findMany({
      include: {
        units: {
          select: { id: true, unitNumber: true, status: true, monthlyRate: true },
          // For DB mode, also fetch latest lease per unit for dialog (simplified: first lease)
        },
      },
      orderBy: { name: "asc" },
    });
    // For DB mode, units have no tenant detail yet — dialog will be disabled (vacant)
    return { props: props as never };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      try {
        const { getLegacyData } = await import("@/lib/legacy");
        const legacy = getLegacyData();
        const byPropUnit = new Map<string, Map<string, typeof legacy.leases[number]>>();
        for (const l of legacy.leases) {
          if (!l.unit || l.unit === "UNKNOWN") continue;
          if (!byPropUnit.has(l.property)) byPropUnit.set(l.property, new Map());
          const unitMap = byPropUnit.get(l.property)!;
          const existing = unitMap.get(l.unit);
          const curEnd = l.rentalEnd || l.rentalStart || "";
          const exEnd = existing?.rentalEnd || existing?.rentalStart || "";
          if (!existing || curEnd > exEnd) unitMap.set(l.unit, l);
        }
        const props: PropertyWithUnits[] = [...byPropUnit.entries()]
          .sort((a, b) => b[1].size - a[1].size)
          .slice(0, 20)
          .map(([name, unitMap]) => {
            const units: Unit[] = [...unitMap.entries()].map(([unitNumber, lease]) => {
              const end = lease.rentalEnd ? new Date(lease.rentalEnd) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOccupied = end ? end >= today : true;
              return {
                id: `${name.toLowerCase()}-${unitNumber}`,
                unitNumber,
                status: isOccupied ? "OCCUPIED" : "VACANT",
                monthlyRate: lease.rate ?? "—",
                tenant: lease.fullName,
                end: lease.rentalEnd,
                lease: lease,
              } as unknown as Unit;
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
          warning: `Database not connected — showing ${legacy.totalLeases} legacy contracts from EVES DOCS (latest per unit, occupancy by rentalEnd ≥ today). Accurate rates from Excel RATE column; click an occupied unit to see tenant, lease agreement, and property details. Set DATABASE_URL and run import to persist.`,
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

  const totalUnits = props.reduce((s, p) => s + p.units.length, 0);
  const occupiedUnits = props.reduce((s, p) => s + p.units.filter((u) => u.status === "OCCUPIED").length, 0);
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalMonthly = props.reduce(
    (s, p) =>
      s +
      p.units
        .filter((u) => u.status === "OCCUPIED" && typeof u.monthlyRate === "number")
        .reduce((a, u) => a + Number(u.monthlyRate), 0),
    0
  );
  const totalContracts = props.reduce((s, p) => {
    const m = p.address?.match(/(\d+) contracts/);
    return s + (m ? Number(m[1]) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
        <p className="text-sm text-muted-foreground">Portfolio overview — all legacy properties combined (vacancy & rate from Excel RATE, occupancy by rentalEnd ≥ today). Click an occupied unit to view its tenant.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Properties</CardDescription>
            <CardTitle className="text-2xl">{props.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{props.map((p) => p.name).join(" • ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="text-2xl">{totalUnits}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge className="bg-blue-600">{occupiedUnits} occupied</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {vacantUnits} vacant
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{occupancyRate}% occupancy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Revenue (occupied)</CardDescription>
            <CardTitle className="text-2xl whitespace-nowrap">₱{totalMonthly.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Sum of RATE for occupied units • {occupiedUnits} paying</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Legacy Contracts</CardDescription>
            <CardTitle className="text-2xl">{totalContracts || "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rows from EVES DOCS Responses</p>
          </CardContent>
        </Card>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${occupancyRate}%` }} />
      </div>

      {warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">{warning}</CardContent>
        </Card>
      )}

      <PropertiesClient props={props as never} />
    </div>
  );
}
