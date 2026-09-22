import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import monitoring from "@/lib/monitoring-data.json";

export const dynamic = "force-dynamic";

type SheetData = {
  unit: string;
  name: string;
  rate: unknown;
  contract: string;
  payments: { month: string; rent: number | null; raw: string | null; unpaid: boolean }[];
};

export default function PaymentsPage() {
  const sheets = (monitoring as { sheets: Record<string, SheetData[]> }).sheets;
  const allProps = Object.keys(sheets);

  // Global stats
  let totalTenants = 0;
  let totalPayments = 0;
  let unpaidCount = 0;
  let unpaidAmount = 0;
  let totalDue = 0;

  for (const tenants of Object.values(sheets)) {
    totalTenants += tenants.length;
    for (const t of tenants) {
      for (const p of t.payments) {
        totalPayments++;
        if (p.rent) totalDue += p.rent;
        if (p.unpaid) {
          unpaidCount++;
          if (p.rent) unpaidAmount += p.rent;
        }
      }
    }
  }
  const paidAmount = totalDue - unpaidAmount;
  const collectionRate = totalDue ? Math.round((paidAmount / totalDue) * 100) : 0;

  // Most delinquent tenants
  const allTenants = Object.entries(sheets).flatMap(([prop, tenants]) =>
    tenants.map((t) => ({ ...t, property: prop, unpaid: t.payments.filter((p) => p.unpaid).length }))
  );
  const worst = [...allTenants].sort((a, b) => b.unpaid - a.unpaid).slice(0, 5).filter((t) => t.unpaid > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Live from <code>IT MONITORING 2026.xlsx</code> + <code>ALL PROPERTIES.xlsx</code> — red boxes = unpaid (fill #FBD4B4). Database + live Sheets combined.
        </p>
      </div>

      {/* Global stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tenants</CardDescription>
            <CardTitle className="text-2xl">{totalTenants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{allProps.join(" • ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid (red)</CardDescription>
            <CardTitle className="text-2xl text-red-600">{unpaidCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totalPayments} payments • {(unpaidCount / totalPayments * 100).toFixed(1)}% red</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid Amount</CardDescription>
            <CardTitle className="text-2xl text-red-600">₱{unpaidAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">of ₱{totalDue.toLocaleString()} due</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collection Rate</CardDescription>
            <CardTitle className="text-2xl">{collectionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">₱{paidAmount.toLocaleString()} collected</p>
          </CardContent>
        </Card>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-green-600 transition-all" style={{ width: `${collectionRate}%` }} />
      </div>

      {worst.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm text-red-800">Most delinquent (red boxes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {worst.map((t) => (
              <div key={t.property + t.unit + t.name} className="flex justify-between text-sm">
                <span className="font-medium">
                  {t.name} — {t.property} {t.unit} — {t.unpaid} unpaid
                </span>
                <span className="text-muted-foreground">{t.contract}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-property tables */}
      {Object.entries(sheets).map(([prop, tenants]) => {
        if (tenants.length === 0) return null;
        const months = tenants[0]?.payments.map((p) => p.month) || [];
        const propUnpaid = tenants.flatMap((t) => t.payments).filter((p) => p.unpaid).length;
        return (
          <Card key={prop}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{prop}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {tenants.length} tenants • {propUnpaid} red
                </span>
              </CardTitle>
              <CardDescription>
                Red = unpaid (fill #FBD4B4). Months: {months.join(" • ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="min-w-[800px]">
                <div className="grid gap-1">
                  {/* Header */}
                  <div className="grid grid-cols-[120px_1fr_80px_repeat(6,90px)] gap-1 border-b pb-2 text-xs font-semibold text-muted-foreground">
                    <div>Unit</div>
                    <div>Name</div>
                    <div>Rate</div>
                    {months.map((m) => (
                      <div key={m} className="text-center">
                        {m}
                      </div>
                    ))}
                  </div>
                  {tenants.map((t, i) => (
                    <div key={t.unit + t.name + i} className="grid grid-cols-[120px_1fr_80px_repeat(6,90px)] gap-1 border-b py-1.5 text-sm last:border-0">
                      <div className="font-mono text-xs">{t.unit || "—"}</div>
                      <div className="truncate text-xs" title={t.name}>
                        {t.name}
                      </div>
                      <div className="text-xs">₱{t.rate ? Number(t.rate).toLocaleString() : "—"}</div>
                      {t.payments.map((p, idx) => (
                        <div
                          key={idx}
                          className={`rounded px-1 py-1 text-center text-xs ${
                            p.unpaid
                              ? "bg-red-100 text-red-700 border border-red-300 font-medium"
                              : p.rent
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-muted text-muted-foreground"
                          }`}
                          title={p.unpaid ? `UNPAID ${p.month}` : p.rent ? `Paid ${p.rent}` : "Pending"}
                        >
                          {p.rent ? `₱${Number(p.rent).toLocaleString()}` : p.unpaid ? " unpaid" : "—"}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Red boxes from IT MONITORING 2026.xlsx — unpaid rent. Cross-check with ALL PROPERTIES.xlsx for due dates.</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
