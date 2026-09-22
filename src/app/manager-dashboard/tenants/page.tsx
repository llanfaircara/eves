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
  try {
    const dbLeases = await prisma.lease.findMany({
      include: {
        tenant: { select: { firstName: true, lastName: true, mobileNumber: true, email: true, company: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Map DB shape to LegacyLease shape for unified client
    const mapped: LegacyLease[] = dbLeases.map((l) => ({
      controlNumber: l.id.slice(0, 8).toUpperCase(),
      property: l.unit.property.name,
      unit: l.unit.unitNumber,
      fullName: `${l.tenant.firstName} ${l.tenant.lastName}`,
      firstName: l.tenant.firstName,
      lastName: l.tenant.lastName,
      mobile: l.tenant.mobileNumber,
      email: l.tenant.email || "",
      company: l.tenant.company || "",
      rate: l.totalAmountToSettle ? Number(l.totalAmountToSettle) : null,
      terms: l.contractType,
      rentalStart: l.rentalStartDate ? new Date(l.rentalStartDate).toISOString().slice(0, 10) : null,
      rentalEnd: l.rentalEndDate ? new Date(l.rentalEndDate).toISOString().slice(0, 10) : null,
      totalAmount: l.totalAmountToSettle ? Number(l.totalAmountToSettle) : null,
      status: l.status,
      sourceFile: "DB",
    }));
    return { leases: mapped };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { getLegacyData } = await import("@/lib/legacy");
      const legacy = getLegacyData();
      const leases: LegacyLease[] = legacy.leases.map((l) => ({
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
      return {
        leases,
        warning: `Database not connected — showing ${leases.length} legacy contracts from EVES DOCS (${legacy.totalLeases} total). Data from Responses sheets; click a row to see lease agreement, property/unit, and full tenant info. Run npx prisma db push && import to persist.`,
      };
    }
    throw e;
  }
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
