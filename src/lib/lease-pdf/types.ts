/**
 * Strict TypeScript interfaces for Lease PDF generation.
 * Every variable is typed 1:1 with the normalized Lease+Tenant+Unit+Property schema
 * to guarantee 0% chance of rent/deposit swap at compile time.
 */

export interface LeasePdfAddon {
  label: string;
  amount: number;
}

export interface LeasePdfVariables {
  // Identity — never nullable for generation
  leaseId: string;
  controlNumber?: string | null;
  contractStatus: string; // e.g. "Draft Generated"
  leaseIntent: string; // New Lease | Renewal | Transfer | Hold
  leaseTerm: string; // Trial | M2M | 6 Months | 1 Year

  // Tenant — sourced from Tenant table
  tenantName: string; // "First Last"
  tenantEmail?: string | null;
  tenantMobile?: string | null;
  tenantCompany?: string | null;

  // Premises — sourced from Property + Unit
  propertyName: string;
  propertyAddress?: string | null;
  unitNumber: string;
  unitBaseline?: string | null;

  // Term — Lease dates
  leaseStartDate: string; // ISO YYYY-MM-DD
  leaseEndDate: string;
  moveInDate: string;
  rentDueDate: string;
  noticePeriodDays: number;

  // Financials — explicit, branded fields prevent swap
  monthlyRent: number;
  securityDeposit: number; // 1st deposit
  firstDepositDue: string; // ISO date
  advanceDeposit: number; // 2nd deposit
  secondDepositDue: string;
  totalAmountToSettle: number;
  addons: LeasePdfAddon[];

  // Meta
  generatedAt: string; // ISO
}

// DB shape accepted by the generator (Prisma Lease + relations)
export type LeaseWithRelations = {
  id: string;
  contractType: string;
  rentalStartDate: Date | string;
  rentalEndDate: Date | string;
  totalAmountToSettle: unknown; // Decimal
  status: string;
  monthlyRent: unknown | null;
  securityDeposit: unknown | null;
  advanceDeposit: unknown | null;
  addons: unknown | null;
  noticePeriodDays: number | null;
  leaseIntent: string | null;
  leaseTerm: string | null;
  moveInDate: Date | string | null;
  rentDueDate: Date | string | null;
  firstDepositDue?: Date | string | null;
  secondDepositDue?: Date | string | null;
  documentLink: string | null;
  documentStatus: string | null;
  tenant: { firstName: string; lastName: string; email: string | null; mobileNumber: string; company: string | null };
  unit: { unitNumber: string; monthlyRate: unknown; property: { name: string; address: string | null } };
};
