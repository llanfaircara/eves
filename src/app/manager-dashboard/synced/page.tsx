import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import monitoring from "@/lib/monitoring-data.json";
import legacy from "@/lib/eves-legacy-data.json";
import SyncedTenantsClient from "@/components/synced/synced-tenants-client";

export const dynamic = "force-dynamic";

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
function normProp(s: string) {
  const lower = s.toLowerCase().trim();
  if (lower === "b&b" || lower === "b & b" || lower.includes("b&b")) return "bnb";
  const t = lower.replace(/&/g, "").replace(/[^a-z]/g, "").replace(/888|168/g, "").trim();
  if (t === "bb" || t === "b" || t === "bnb" || t === "bbb") return "bnb";
  return t;
}
function normName(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

type MonTenant = { unit: string; name: string; rate: unknown; contract: string; payments: { month: string; rent: number | null; raw: string | null; unpaid: boolean }[]; hasReservation?: boolean; closeToRenewal?: boolean; willNotRenew?: boolean };
type LegacyLease = {
  fullName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  age?: string;
  gender?: string;
  property: string;
  unit: string;
  sourceFile: string;
  controlNumber: string;
  documentLink?: string;
  barCode?: string;
  mobile: string;
  email: string;
  company?: string;
  address?: string;
  rate: number | null;
  terms: string;
  rentalStart: string | null;
  rentalEnd: string | null;
  totalAmount: number | null;
  status: string;
  waterReading?: string;
  electricReading?: string;
  raw?: Record<string, string>;
};

export default function SyncedPage() {
  // @ts-ignore - JSON import typing
  const sheets = (monitoring as unknown as { sheets: Record<string, MonTenant[]> }).sheets;
  // @ts-ignore - JSON import typing
  const leases = (legacy as unknown as { leases: LegacyLease[]; totalLeases: number }).leases;

  const monList: (MonTenant & { property: string })[] = [];
  for (const [prop, tenants] of Object.entries(sheets)) {
    for (const t of tenants) monList.push({ ...t, property: prop });
  }

  const legacyByNorm = new Map<string, LegacyLease[]>();
  for (const l of leases) {
    const key = norm(l.fullName) + "|" + normProp(l.property);
    if (!legacyByNorm.has(key)) legacyByNorm.set(key, []);
    legacyByNorm.get(key)!.push(l);
    const key2 = norm(l.firstName + l.lastName) + "|" + normProp(l.property);
    if (!legacyByNorm.has(key2)) legacyByNorm.set(key2, []);
    legacyByNorm.get(key2)!.push(l);
  }

  const syncedPairs: Array<{ mon: MonTenant & { property: string }; legacy: LegacyLease }> = [];
  const missing: Array<MonTenant & { property: string; reason: string; suggestion?: string }> = [];

  for (const m of monList) {
    const nFull = norm(m.name);
    const nProp = normProp(m.property);
    let match: LegacyLease | undefined;
    const candidates = legacyByNorm.get(nFull + "|" + nProp) || legacyByNorm.get(nFull) || [];
    if (candidates.length > 0) {
      match = candidates.find((c) => norm(c.unit) === norm(m.unit)) || candidates[0];
    } else {
      const tokens = normName(m.name).split(" ");
      const first = tokens[0] || "";
      const last = tokens[tokens.length - 1] || "";
      const key = norm(first + last);
      const cand2 = leases.filter((l) => norm(l.firstName + l.lastName) === key || norm(l.fullName).includes(nFull) || nFull.includes(norm(l.fullName)));
      if (cand2.length > 0) match = cand2[0];
    }

    if (match) {
      syncedPairs.push({ mon: m, legacy: match });
    } else {
      const sameNameInOtherProp = leases.find((l) => norm(l.fullName) === nFull || norm(l.firstName + l.lastName) === norm(m.name.split(" ")[0] + m.name.split(" ").slice(-1)[0]));
      let reason = "No matching Responses entry";
      let suggestion: string | undefined;
      if (sameNameInOtherProp) {
        reason = `Name exists but in property ${sameNameInOtherProp.property} unit ${sameNameInOtherProp.unit}, not ${m.property} ${m.unit}`;
        suggestion = `Property/unit mismatch — check if ${m.name} moved from ${sameNameInOtherProp.property} ${sameNameInOtherProp.unit} to ${m.property} ${m.unit} without new Responses form`;
      } else if (!m.unit || m.unit === "UNKNOWN") {
        reason = "Unit is UNKNOWN/empty in monitoring — cannot match";
      } else {
        const propLeases = leases.filter((l) => normProp(l.property) === nProp);
        if (propLeases.length === 0) reason = `No Responses for property ${m.property} (normalized ${nProp}) at all — sheet ${m.property} maps to ${nProp.toUpperCase()}, but no Responses file for that base property`;
        else reason = `No Responses with name "${m.name}" in ${m.property} (normalized ${nProp.toUpperCase()}) — likely never filled Intake/Responses form, only in IT MONITORING`;
        suggestion = "Create via Tenant Intake to sync";
      }
      missing.push({ ...m, reason, suggestion });
    }
  }

  const syncedCount = syncedPairs.length;
  const monNames = new Set(monList.map((m) => norm(m.name)));
  const notInMonitoring = leases.filter((l) => !monNames.has(norm(l.fullName)) && !monNames.has(norm(l.firstName + l.lastName)));
  const notInMonUnique = Array.from(new Map(notInMonitoring.map((l) => [norm(l.fullName), l])).values()).slice(0, 20);
  const syncRate = monList.length ? Math.round((syncedCount / monList.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Synced Tenant Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Live cross-check — <code>IT MONITORING 2026.xlsx</code> (290 tenants) ↔ <code>Responses</code> (483 leases from EVES DOCS). Shows what syncs, what is missing, and why. Click synced rows for all info from both files.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monitoring tenants</CardDescription>
            <CardTitle className="text-2xl">{monList.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">From IT MONITORING 9 sheets</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-700">Synced</CardDescription>
            <CardTitle className="text-2xl text-green-700">{syncedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-700">{syncRate}% of monitoring found in Responses</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700">Missing in Tenants</CardDescription>
            <CardTitle className="text-2xl text-red-600">{missing.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-700">In monitoring but not in Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Responses not in monitoring</CardDescription>
            <CardTitle className="text-2xl">{notInMonUnique.length}+</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{leases.length} total Responses • {notInMonUnique.length} sample not in monitoring</p>
          </CardContent>
        </Card>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-green-600" style={{ width: `${syncRate}%` }} />
      </div>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6 text-sm text-yellow-800">
          <strong>How sync works:</strong> Normalized <code>fullName + property</code> exact, then fallback <code>first+last</code> fuzzy (ECO888 → ECO). <code>SHERYL BALLESTEROS NOBLEZA — GREEN B1</code> is missing because she exists only in <code>GREEN</code> monitoring (6 red) with no matching <code>GREEN (Responses).xlsx</code> row — likely never filled the Intake form. Create her via <code>Tenant Intake</code> to sync.
        </CardContent>
      </Card>

      {/* Synced tenants — all info from both files, clickable */}
      <Card>
        <CardHeader>
          <CardTitle>Synced Tenants — all info from both files ({syncedPairs.length})</CardTitle>
          <CardDescription>Click any row to see monitoring payments + Responses lease agreement, property/unit, tenant profile, utilities, and raw Excel fields combined.</CardDescription>
        </CardHeader>
        <CardContent>
          <SyncedTenantsClient pairs={syncedPairs as never} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missing in Tenants — in Monitoring but not in Responses ({missing.length})</CardTitle>
          <CardDescription>These tenants appear in payment ledger but have no lease/tenant record — click Intake to add, or check property/unit mismatch.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[110px_1fr_90px_260px_1fr] gap-2 border-b pb-2 text-xs font-semibold text-muted-foreground">
              <div>Property • Unit</div>
              <div>Name</div>
              <div>Rate</div>
              <div>Reason / Why missing</div>
              <div>Suggestion</div>
            </div>
            {missing.slice(0, 100).map((m, i) => (
              <div key={m.property + m.unit + m.name + i} className="grid grid-cols-[110px_1fr_90px_260px_1fr] gap-2 border-b py-2 text-sm last:border-0">
                <div className="font-mono text-xs">
                  {m.property} — {m.unit || "—"}
                </div>
                <div className="truncate font-medium" title={m.name}>
                  {m.name}
                </div>
                <div className="text-xs whitespace-nowrap">₱{m.rate ? Number(m.rate).toLocaleString() : "—"}</div>
                <div className="text-xs text-red-600 break-words">{m.reason}</div>
                <div className="text-xs text-muted-foreground break-words">{m.suggestion || "—"}</div>
              </div>
            ))}
          </div>
          {missing.length > 100 && <p className="mt-2 text-xs text-muted-foreground">Showing 100 of {missing.length} — export full via /prisma/eves-import.csv</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responses not in Monitoring — sample ({notInMonUnique.length})</CardTitle>
          <CardDescription>Tenants with Intake/Responses form but not yet in payment ledger (new move-ins, or monitoring not updated).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[110px_1fr_110px_90px] gap-2 border-b pb-2 text-xs font-semibold text-muted-foreground">
              <div>Property • Unit</div>
              <div>Name</div>
              <div>Control #</div>
              <div>Source</div>
            </div>
            {notInMonUnique.map((l) => (
              <div key={l.controlNumber} className="grid grid-cols-[110px_1fr_110px_90px] gap-2 border-b py-2 text-sm last:border-0">
                <div className="font-mono text-xs">
                  {l.property} — {l.unit}
                </div>
                <div className="truncate font-medium">{l.fullName}</div>
                <div className="font-mono text-xs">{l.controlNumber}</div>
                <div className="truncate text-xs text-muted-foreground">{l.sourceFile.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
