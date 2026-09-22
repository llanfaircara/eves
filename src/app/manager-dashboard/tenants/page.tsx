import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type LeaseRow = {
  id: string;
  tenantId: string;
  unitId: string;
  contractType: string;
  rentalStartDate: string | Date;
  rentalEndDate: string | Date;
  totalAmountToSettle: unknown;
  status: string;
  createdAt: string | Date;
  tenant: { id: string; firstName: string; lastName: string; mobileNumber: string; email: string | null; company: string | null };
  unit: { id: string; unitNumber: string; property: { name: string } };
};

async function getLeases(): Promise<{ leases: LeaseRow[]; warning?: string }> {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, mobileNumber: true, email: true, company: true } },
        unit: { select: { id: true, unitNumber: true, property: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { leases: leases as unknown as LeaseRow[] };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      try {
        const { getLegacyData } = await import("@/lib/legacy");
        const legacy = getLegacyData();
        const leases: LeaseRow[] = legacy.leases.slice(0, 50).map((l, i) => ({
          id: l.controlNumber || `legacy-${i}`,
          tenantId: `t-${i}`,
          unitId: `u-${i}`,
          contractType: l.terms?.toUpperCase().includes("TRIAL") ? "TRIAL" : l.terms?.toUpperCase().includes("M2M") ? "M2M" : "LONG_TERM",
          rentalStartDate: l.rentalStart || new Date().toISOString(),
          rentalEndDate: l.rentalEnd || new Date(Date.now() + 180 * 86400000).toISOString(),
          totalAmountToSettle: String(l.totalAmount ?? l.rate ?? "—"),
          status: l.status || "ACTIVE",
          createdAt: new Date().toISOString(),
          tenant: {
            id: `t-${i}`,
            firstName: l.firstName || l.fullName.split(" ")[0] || "Unknown",
            lastName: l.lastName || l.fullName.split(" ").slice(1).join(" ") || "",
            mobileNumber: l.mobile || "—",
            email: l.email || null,
            company: l.company || null,
          },
          unit: { id: `u-${i}`, unitNumber: l.unit || "UNKNOWN", property: { name: l.property } },
        }));
        return {
          leases,
          warning: `Database not connected — showing ${leases.length} of ${legacy.totalLeases} legacy contracts from EVES DOCS. Run import to DB to persist.`,
        };
      } catch {
        const demo: LeaseRow[] = [
          {
            id: "demo-lease-1",
            tenantId: "t1",
            unitId: "u1",
            contractType: "M2M",
            rentalStartDate: new Date().toISOString(),
            rentalEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            totalAmountToSettle: "210000",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            tenant: { id: "t1", firstName: "Juan", lastName: "Dela Cruz", mobileNumber: "09171234567", email: "juan@example.com", company: "Acme" },
            unit: { id: "u1", unitNumber: "ECO-002", property: { name: "ECO" } },
          },
        ];
        return { leases: demo, warning: "Database not connected — showing demo tenants & leases." };
      }
    }
    throw e;
  }
}

function ContractBadge({ v }: { v: string }) {
  return <Badge variant="outline">{v}</Badge>;
}
function StatusBadge({ v }: { v: string }) {
  const cls = v === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : v === "EXPIRED" ? "bg-red-50 text-red-700 border-red-200" : "bg-muted";
  return <Badge variant="outline" className={cls}>{v}</Badge>;
}

export default async function TenantsPage() {
  const { leases, warning } = await getLeases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenants & Leases</h1>
        <p className="text-sm text-muted-foreground">Centralized view of all tenants, their units, contract type and lease status — replacing legacy spreadsheets.</p>
      </div>

      {warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">{warning} Set <code>DATABASE_URL</code> and run <code>npx prisma db push && npm run db:seed</code> + use <code>/intake</code> to create real entries.</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 overflow-auto">
          {leases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tenants yet. Use Tenant Intake to create your first lease.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.tenant.firstName} {l.tenant.lastName}</div>
                      {l.tenant.company && <div className="text-xs text-muted-foreground">{l.tenant.company}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.tenant.mobileNumber}</div>
                      <div className="text-xs text-muted-foreground">{l.tenant.email || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">{l.unit.property.name} — {l.unit.unitNumber}</div>
                    </TableCell>
                    <TableCell><ContractBadge v={l.contractType} /></TableCell>
                    <TableCell className="text-xs">
                      {new Date(l.rentalStartDate).toLocaleDateString()} → {new Date(l.rentalEndDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">₱{String(l.totalAmountToSettle)}</TableCell>
                    <TableCell><StatusBadge v={l.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
