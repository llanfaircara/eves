import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import TenantsClient from "@/components/tenants/tenants-client";

export const dynamic = "force-dynamic";

type LegacyLease = {
  controlNumber: string;
  documentLink?: string;
  barCode?: string;
  property: string;
  unit: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  age?: string;
  gender?: string;
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
  sourceFile: string;
  raw?: Record<string, string>;
};

async function getLeases(): Promise<{ leases: LegacyLease[]; warning?: string }> {
  // Always load legacy as baseline — DB is additive, not replacement.
  // This keeps the 497 legacy contracts visible after the first DB intake/reserve,
  // satisfying the "sustainable & editable after spreadsheets phased out" requirement:
  // legacy remains until explicitly migrated, DB entries are merged on top.
  const { getLegacyData } = await import("@/lib/legacy");
  const legacyRaw = getLegacyData();
  const legacyLeases: LegacyLease[] = legacyRaw.leases.map((l) => ({
    controlNumber: l.controlNumber,
    documentLink: l.documentLink,
    barCode: l.barCode,
    property: l.property,
    unit: l.unit,
    fullName: l.fullName,
    firstName: l.firstName,
    lastName: l.lastName,
    middleName: (l as unknown as { middleName?: string }).middleName,
    age: (l as unknown as { age?: string }).age,
    gender: (l as unknown as { gender?: string }).gender,
    mobile: l.mobile,
    email: l.email,
    company: l.company,
    address: (l as unknown as { address?: string }).address,
    rate: l.rate,
    terms: l.terms,
    rentalStart: l.rentalStart,
    rentalEnd: l.rentalEnd,
    totalAmount: l.totalAmount,
    status: l.status,
    waterReading: (l as unknown as { waterReading?: string }).waterReading,
    electricReading: (l as unknown as { electricReading?: string }).electricReading,
    sourceFile: l.sourceFile,
    raw: (l as unknown as { raw?: Record<string, string> }).raw,
  }));

  let dbMapped: LegacyLease[] = [];
  let warning: string | undefined;
  try {
    const dbLeases = await prisma.lease.findMany({
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            mobileNumber: true,
            email: true,
            company: true,
            age: true,
            gender: true,
            permanentAddress: true,
          },
        },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    dbMapped = dbLeases.map((l) => ({
      controlNumber: (l as unknown as { controlNumber?: string }).controlNumber || l.id.slice(0, 8).toUpperCase(),
      documentLink: (l as unknown as { documentLink?: string | null }).documentLink || undefined,
      barCode: (l as unknown as { barCode?: string | null }).barCode || undefined,
      property: l.unit.property.name,
      unit: l.unit.unitNumber,
      fullName: `${l.tenant.firstName} ${l.tenant.middleName ? l.tenant.middleName + " " : ""}${l.tenant.lastName}`.trim(),
      firstName: l.tenant.firstName,
      lastName: l.tenant.lastName,
      middleName: l.tenant.middleName || undefined,
      age: l.tenant.age ? String(l.tenant.age) : undefined,
      gender: l.tenant.gender || undefined,
      mobile: l.tenant.mobileNumber,
      email: l.tenant.email || "",
      company: l.tenant.company || "",
      address: l.tenant.permanentAddress || undefined,
      rate: l.totalAmountToSettle ? Number(l.totalAmountToSettle) : null,
      terms: (l as unknown as { terms?: string }).terms || l.contractType,
      rentalStart: l.rentalStartDate ? new Date(l.rentalStartDate).toISOString().slice(0, 10) : null,
      rentalEnd: l.rentalEndDate ? new Date(l.rentalEndDate).toISOString().slice(0, 10) : null,
      totalAmount: l.totalAmountToSettle ? Number(l.totalAmountToSettle) : null,
      status: l.status,
      waterReading: (l as unknown as { waterReading?: unknown }).waterReading ? String((l as unknown as { waterReading?: unknown }).waterReading) : undefined,
      electricReading: (l as unknown as { electricReading?: unknown }).electricReading ? String((l as unknown as { electricReading?: unknown }).electricReading) : undefined,
      sourceFile: "DB" + ((l as unknown as { documentStatus?: string }).documentStatus ? ` • ${ (l as unknown as { documentStatus?: string }).documentStatus}` : ""),
    }));
    if (dbMapped.length > 0) {
      warning = `Showing ${dbMapped.length} database lease(s) + ${legacyLeases.length} legacy contracts (${legacyRaw.totalLeases} total from EVES DOCS). New intakes/reserves appear first and include full contract PDFs.`;
    }
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      warning = `Database not connected — showing ${legacyLeases.length} legacy contracts from EVES DOCS (${legacyRaw.totalLeases} total). Data from Responses sheets; click a row to see lease agreement, property/unit, and full tenant info. Run npx prisma db push && import to persist.`;
      return { leases: legacyLeases, warning };
    }
    // For any other error, still return legacy + warning and log
    console.error("[getLeases] DB error, falling back to legacy", e);
    warning = `Database error — showing legacy contracts only. ${msg.slice(0, 200)}`;
    return { leases: legacyLeases, warning };
  }

  // Merge: DB first, then legacy deduped by controlNumber (DB never collides with legacy 8-char hex, but be safe)
  const seen = new Set(dbMapped.map((l) => l.controlNumber));
  const dedupedLegacy = legacyLeases.filter((l) => !seen.has(l.controlNumber));
  return { leases: [...dbMapped, ...dedupedLegacy], warning };
}

export default async function TenantsPage() {
  const { leases, warning } = await getLeases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenants & Leases</h1>
        <p className="text-sm text-muted-foreground">
          Centralized view — click any tenant to see full profile, lease agreement (DOCUMENT LINK), property & unit, contract terms, and utilities. Replaces legacy spreadsheets.
        </p>
      </div>

      {warning && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">{warning}</CardContent>
        </Card>
      )}

      <TenantsClient leases={leases} />
    </div>
  );
}
