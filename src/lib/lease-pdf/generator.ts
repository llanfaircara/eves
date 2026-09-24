import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LeaseAgreementDocument } from "./template";
import type { LeasePdfVariables, LeaseWithRelations } from "./types";

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function toIso(d: Date | string | null | undefined, fallbackIso: string): string {
  if (!d) return fallbackIso;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return fallbackIso;
  return dt.toISOString().slice(0, 10);
}

/**
 * Map a Prisma Lease + Tenant + Unit + Property into strict PDF variables.
 * Branded financial fields (monthlyRent vs securityDeposit vs advanceDeposit) are
 * mapped explicitly — a swap would be a type error, not a silent bug.
 */
export function mapLeaseToPdfVariables(lease: LeaseWithRelations): LeasePdfVariables {
  const startIso = toIso(lease.rentalStartDate as Date | string, new Date().toISOString().slice(0, 10));
  const endIso = toIso(lease.rentalEndDate as Date | string, startIso);
  const moveIso = toIso(lease.moveInDate as Date | string | null, startIso);
  const rentDueIso = toIso(lease.rentDueDate as Date | string | null, startIso);
  // Deposit dues: prefer explicit fields if present, else fall back to lease start
  const firstDue = toIso((lease as Record<string, unknown>).firstDepositDue as Date | string | null, startIso);
  const secondDue = toIso((lease as Record<string, unknown>).secondDepositDue as Date | string | null, startIso);

  const monthlyRent = toNum(lease.monthlyRent ?? lease.unit.monthlyRate, 0);
  const securityDeposit = toNum(lease.securityDeposit, monthlyRent);
  const advanceDeposit = toNum(lease.advanceDeposit, monthlyRent);
  const addonsRaw = Array.isArray(lease.addons) ? (lease.addons as Array<{ label: string; amount: number }>) : [];
  const addons = addonsRaw.map((a) => ({ label: String(a.label), amount: Number(a.amount) || 0 }));

  const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`.trim();

  return {
    leaseId: lease.id,
    controlNumber: null,
    contractStatus: lease.documentStatus ?? lease.status ?? "Draft Generated",
    leaseIntent: lease.leaseIntent ?? "New Lease",
    leaseTerm: lease.leaseTerm ?? String(lease.contractType),
    tenantName,
    tenantEmail: lease.tenant.email,
    tenantMobile: lease.tenant.mobileNumber,
    tenantCompany: lease.tenant.company,
    propertyName: lease.unit.property.name,
    propertyAddress: lease.unit.property.address,
    unitNumber: lease.unit.unitNumber,
    leaseStartDate: startIso,
    leaseEndDate: endIso,
    moveInDate: moveIso,
    rentDueDate: rentDueIso,
    noticePeriodDays: lease.noticePeriodDays ?? 30,
    monthlyRent,
    securityDeposit,
    firstDepositDue: firstDue,
    advanceDeposit,
    secondDepositDue: secondDue,
    totalAmountToSettle: toNum(lease.totalAmountToSettle, monthlyRent + securityDeposit + advanceDeposit),
    addons,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a Lease Agreement PDF buffer from DB data.
 * Server-side only; returns a Node Buffer ready for upload/storage.
 */
export async function generateLeasePDF(lease: LeaseWithRelations): Promise<Buffer> {
  const variables = mapLeaseToPdfVariables(lease);
  // Defensive: ensure financials are sane before rendering
  if (!variables.tenantName) throw new Error("Tenant name is required for PDF generation");
  if (!variables.unitNumber) throw new Error("Unit number is required for PDF generation");
  if (variables.monthlyRent < 0 || variables.securityDeposit < 0 || variables.advanceDeposit < 0) {
    throw new Error("Financial amounts must be non-negative");
  }
  const element = React.createElement(LeaseAgreementDocument, { data: variables }) as unknown as React.ReactElement;
  const buf = await (renderToBuffer as unknown as (el: React.ReactElement) => Promise<Buffer | Uint8Array>)(element);
  // renderToBuffer returns Buffer | Uint8Array depending on React-PDF version
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as Uint8Array);
}

/**
 * Convenience: fetch lease by id (with relations) then generate.
 * Caller handles storage + DB update; this isolates PDF concerns.
 */
export async function generateLeasePDFById(
  leaseId: string,
  fetcher: (id: string) => Promise<LeaseWithRelations | null>
): Promise<{ buffer: Buffer; variables: LeasePdfVariables }> {
  const lease = await fetcher(leaseId);
  if (!lease) throw new Error(`Lease ${leaseId} not found`);
  const variables = mapLeaseToPdfVariables(lease);
  const buffer = await generateLeasePDF(lease);
  return { buffer, variables };
}
