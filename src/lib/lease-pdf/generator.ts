import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LeaseAgreementDocument } from "./template";
import type { LeasePdfVariables, LeaseWithRelations } from "./types";

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function toStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  const s = String(v).trim();
  return s || fallback;
}
function toIso(d: Date | string | null | undefined, fallbackIso: string): string {
  if (!d) return fallbackIso;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return fallbackIso;
  return dt.toISOString().slice(0, 10);
}
function toDisplayDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
}
function amountInWords(n: number): string {
  if (!n || Number.isNaN(n)) return "Zero Pesos";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const numToWords = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? " " + ones[num%10] : "");
    if (num < 1000) return ones[Math.floor(num/100)] + " Hundred" + (num%100 ? " " + numToWords(num%100) : "");
    if (num < 1000000) return numToWords(Math.floor(num/1000)) + " Thousand" + (num%1000 ? " " + numToWords(num%1000) : "");
    return numToWords(Math.floor(num/1000000)) + " Million" + (num%1000000 ? " " + numToWords(num%1000000) : "");
  };
  const pesos = Math.floor(n);
  const centavos = Math.round((n - pesos) * 100);
  let s = numToWords(pesos) + " Pesos";
  if (centavos) s += ` and ${numToWords(centavos)} Centavos`;
  return s;
}
function emergencyContactsToEC(contacts: unknown): { ec1: { name: string|null,tel:string|null,email:string|null,mssgr:string|null}, ec2: { name: string|null,tel:string|null,email:string|null,mssgr:string|null}} {
  const arr = Array.isArray(contacts) ? contacts as Array<Record<string,unknown>> : [];
  const norm = (c?: Record<string,unknown>) => ({
    name: c ? toStr(c.name ?? c.Name ?? c["1. NAME:"] ?? c["2. NAME:"], "N/A") : "N/A",
    tel: c ? toStr(c.phone ?? c.tel ?? c["1. PHONE NUMBER:"] ?? c["2. PHONE NUMBER:"] ?? c.phoneNumber, "N/A") : "N/A",
    email: c ? toStr(c.email ?? c["1. EMAIL:"] ?? c["2. EMAIL:"], "N/A") : "N/A",
    mssgr: c ? toStr(c.messenger ?? c.mssgr ?? c.relationship ?? c["1. MESSENGER:"] ?? c["2. FB/MESSENGER:"], "N/A") : "N/A",
  });
  // handle legacy emergencyContacts format [{name, phone, relationship}] vs spreadsheet 2 contacts
  if (arr.length === 0) return { ec1: { name: "N/A", tel: "N/A", email: "N/A", mssgr: "N/A" }, ec2: { name: "N/A", tel: "N/A", email: "N/A", mssgr: "N/A" } };
  // if single contact with name/phone/relationship, map to ec1
  if (arr.length === 1 && arr[0] && ("relationship" in arr[0] || "phone" in arr[0])) {
    const e = norm(arr[0]);
    return { ec1: e, ec2: { name: "N/A", tel: "N/A", email: "N/A", mssgr: "N/A" } };
  }
  return { ec1: norm(arr[0]), ec2: norm(arr[1]) };
}
function checklistFromLease(lease: LeaseWithRelations): LeasePdfVariables["checklist"] {
  const insp = lease.inspections?.[0];
  const fallbackJson = (insp?.checklistJson as Record<string,unknown> | null) ?? null;
  const get = (field: string, jsonKey?: string): string => {
    const v = (insp as Record<string,unknown> | undefined)?.[field];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
    if (fallbackJson && jsonKey && fallbackJson[jsonKey] !== undefined) return String(fallbackJson[jsonKey]);
    return "N/A";
  };
  const getCom = (field: string) => toStr((insp as Record<string,unknown> | undefined)?.[field] ?? null, "N/A");
  const rows: Array<[string,string,string]> = [
    ["Switches", get("switches","switches"), getCom("switchesCom")],
    ["Sockets", get("sockets","sockets"), getCom("socketsCom")],
    ["Cabinet", get("cabinet","cabinet"), getCom("cabinetCom")],
    ["Lavatory", get("lavatory","lavatory"), getCom("lavatoryCom")],
    ["Light Bulb", get("lightBulb","lightBulb"), getCom("lightBulbCom")],
    ["Faucets", get("faucets","faucets"), getCom("faucetsCom")],
    ["Shower Head", get("showerHead","showerHead"), getCom("showerHeadCom")],
    ["Toilet Flush", get("toiletFlush","toiletFlush"), getCom("toiletFlushCom")],
    ["Toilet Bowl", get("toiletBowl","toiletBowl"), getCom("toiletBowlCom")],
    ["Kitchen Sink", get("kitchenSink","kitchenSink"), getCom("kitchenSinkCom")],
    ["Wall Paint", get("wallPaint","wallPaint"), getCom("wallPaintCom")],
    ["Optional (bed mattress, aircon, tables, etc.)", get("optional","optional"), getCom("optionalCom")],
    ["Windows", get("windows","windows"), getCom("windowsCom")],
  ];
  return rows.map(([label,value,comment])=> ({ label, value: toStr(value,"N/A"), comment: toStr(comment,"N/A") }));
}

/**
 * Map a Prisma Lease + Tenant + Unit + Property into strict PDF variables.
 * Branded financial fields are mapped explicitly — a swap would be a type error.
 */
export function mapLeaseToPdfVariables(lease: LeaseWithRelations): LeasePdfVariables {
  const startIso = toIso(lease.rentalStartDate as Date | string, new Date().toISOString().slice(0, 10));
  const endIso = toIso(lease.rentalEndDate as Date | string, startIso);
  const moveIso = toIso(lease.moveInDate as Date | string | null, startIso);
  const rentDueIso = toIso(lease.rentDueDate as Date | string | null, startIso);
  const firstDue = toIso((lease as Record<string, unknown>).firstDepositDue as Date | string | null, startIso);
  const secondDue = toIso((lease as Record<string, unknown>).secondDepositDue as Date | string | null, startIso);
  const availFromIso = lease.availFrom ? toIso(lease.availFrom as Date | string, "") : null;
  const availToIso = lease.availTo ? toIso(lease.availTo as Date | string, "") : null;
  const currentDateIso = lease.currentDate ? toIso(lease.currentDate as Date | string, startIso) : toIso(lease.rentalStartDate as Date | string, startIso);
  const day20Iso = lease.day20 ? toIso(lease.day20 as Date | string, "") : null;
  const penaltyDayIso = lease.penaltyDay ? toIso(lease.penaltyDay as Date | string, "") : null;
  const dateSignedIso = lease.dateSigned ? toIso(lease.dateSigned as Date | string, "") : currentDateIso;
  const dateIssuedIso = lease.tenant.dateIssued ? toIso(lease.tenant.dateIssued as Date | string, "") : null;

  const monthlyRent = toNum(lease.monthlyRent ?? lease.rate ?? lease.unit.monthlyRate, 0);
  const rate = toNum(lease.rate ?? monthlyRent, monthlyRent);
  const securityDeposit = toNum(lease.securityDeposit ?? lease.deposit2Months, monthlyRent * 2);
  const advanceDeposit = toNum(lease.advanceDeposit ?? lease.advance1Month, monthlyRent);
  const addonsRaw = Array.isArray(lease.addons) ? (lease.addons as Array<{ label: string; amount: number }>) : [];
  const addons = addonsRaw.map((a) => ({ label: String(a.label), amount: Number(a.amount) || 0 }));
  const addonsAmount = lease.addonsAmount !== null && lease.addonsAmount !== undefined ? toNum(lease.addonsAmount, addons.reduce((s,a)=>s+a.amount,0)) : (addons.length ? addons.reduce((s,a)=>s+a.amount,0) : null);
  const totalSettle = toNum(lease.totalAmountToSettle, securityDeposit + addons.reduce((s,a)=>s+a.amount,0));

  const legalName = `${lease.tenant.firstName} ${lease.tenant.middleName ? lease.tenant.middleName + " " : ""}${lease.tenant.lastName}`.trim().toUpperCase();
  const propertyLoc = lease.propertyLoc ?? `Eve's Residences, ${lease.unit.property.name} at ${lease.unit.property.address ?? "No. 69 Matahimik St. Riverside II Brgy. Sto. Domingo Cainta, Rizal"}`;
  const controlNumber = lease.controlNumber ?? lease.id.slice(0, 10).toUpperCase();
  const amountInWordsVal = amountInWords(totalSettle);
  const { ec1, ec2 } = emergencyContactsToEC(lease.tenant.emergencyContacts);
  const checklist = checklistFromLease(lease);

  return {
    leaseId: lease.id,
    controlNumber,
    barCode: lease.barCode ?? null,
    contractStatus: lease.documentStatus ?? lease.status ?? "Draft Generated",
    leaseIntent: lease.leaseIntent ?? "New Lease",
    leaseTerm: lease.leaseTerm ?? lease.terms ?? String(lease.contractType),
    terms: lease.terms ?? lease.leaseTerm ?? String(lease.contractType),
    legalName,
    lastName: lease.tenant.lastName,
    firstName: lease.tenant.firstName,
    middleName: lease.tenant.middleName ?? null,
    age: lease.tenant.age !== null && lease.tenant.age !== undefined ? String(lease.tenant.age) : null,
    gender: lease.tenant.gender ?? null,
    nationality: lease.tenant.nationality ?? null,
    religion: lease.tenant.religion ?? null,
    civilStatus: lease.tenant.civilStatus ?? null,
    permAddress: lease.tenant.permanentAddress ?? lease.permanentAddressAlt ?? null,
    recAddress: lease.tenant.recentAddress ?? null,
    contactNo: lease.contactNumberAlt ?? lease.tenant.mobileNumber,
    mobileNumber: lease.tenant.mobileNumber,
    emailAddr: lease.tenant.email ?? null,
    fbMessenger: lease.tenant.fbMessenger ?? lease.fbMessenger ?? null,
    company: lease.tenant.company ?? null,
    position: lease.tenant.companyPosition ?? null,
    workStatus: lease.tenant.workStatus ?? null,
    compAddr: lease.tenant.companyAddress ?? null,
    compTel: lease.tenant.companyTel ?? null,
    compEmail: lease.tenant.companyEmail ?? null,
    compMssgr: lease.tenant.companyMessenger ?? null,
    marketingSrc: lease.tenant.marketingSource ?? null,
    ec1Name: ec1.name,
    ec1Tel: ec1.tel,
    ec1Email: ec1.email,
    ec1Mssgr: ec1.mssgr,
    ec2Name: ec2.name,
    ec2Tel: ec2.tel,
    ec2Email: ec2.email,
    ec2Mssgr: ec2.mssgr,
    propertyName: lease.unit.property.name,
    propertyLoc,
    propertyAddress: lease.unit.property.address,
    unitNumber: lease.unit.unitNumber,
    rate,
    dueDateText: lease.dueDateText ?? (lease.rentDueDate ? `Every ${new Date(lease.rentDueDate as Date | string).getDate()}th of the month` : `Every ${new Date(startIso).getDate()}th of the month`),
    amountInWords: amountInWordsVal,
    totalSettle,
    monthlyRent: rate,
    securityDeposit,
    advanceDeposit,
    advance1Month: toNum(lease.advance1Month, advanceDeposit) || null,
    deposit2Months: toNum(lease.deposit2Months, securityDeposit) || null,
    firstDepositDue: firstDue,
    secondDepositDue: secondDue,
    totalAmountToSettle: totalSettle,
    addons,
    addonsAmount,
    occupancySupportFee: lease.occupancySupportFee !== null && lease.occupancySupportFee !== undefined ? toNum(lease.occupancySupportFee, 0) : null,
    rentalStart: toDisplayDate(startIso) ?? startIso,
    rentalEnd: toDisplayDate(endIso) ?? endIso,
    leaseStartDate: startIso,
    leaseEndDate: endIso,
    moveInDate: moveIso,
    rentDueDate: rentDueIso,
    availFrom: availFromIso ? toDisplayDate(availFromIso) : null,
    availTo: availToIso ? toDisplayDate(availToIso) : null,
    items: lease.items ?? null,
    currentDate: toDisplayDate(currentDateIso) ?? currentDateIso,
    day20: day20Iso ? toDisplayDate(day20Iso) : null,
    penaltyDay: penaltyDayIso ? toDisplayDate(penaltyDayIso) : null,
    numPer: lease.numPersons !== null && lease.numPersons !== undefined ? String(lease.numPersons) : null,
    water: lease.waterReading !== null && lease.waterReading !== undefined ? String(lease.waterReading) : (lease.inspections?.[0]?.waterReading !== null && lease.inspections?.[0]?.waterReading !== undefined ? String(lease.inspections?.[0]?.waterReading) : null),
    electric: lease.electricReading !== null && lease.electricReading !== undefined ? String(lease.electricReading) : (lease.inspections?.[0]?.electricReading !== null && lease.inspections?.[0]?.electricReading !== undefined ? String(lease.inspections?.[0]?.electricReading) : null),
    checklist,
    idType: lease.tenant.idType ?? null,
    idNumber: lease.tenant.idNumber ?? null,
    idLink: lease.tenant.idLink ?? null,
    dateIssued: dateIssuedIso ? toDisplayDate(dateIssuedIso) : null,
    dateSigned: dateSignedIso ? toDisplayDate(dateSignedIso) : null,
    propertyRep: lease.propertyRep ?? null,
    noticePeriodDays: lease.noticePeriodDays ?? 30,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateLeasePDF(lease: LeaseWithRelations): Promise<Buffer> {
  const variables = mapLeaseToPdfVariables(lease);
  if (!variables.legalName) throw new Error("Tenant name is required for PDF generation");
  if (!variables.unitNumber) throw new Error("Unit number is required for PDF generation");
  if (variables.rate < 0 || variables.securityDeposit < 0 || variables.advanceDeposit < 0) {
    throw new Error("Financial amounts must be non-negative");
  }
  const element = React.createElement(LeaseAgreementDocument, { data: variables }) as unknown as React.ReactElement;
  const buf = await (renderToBuffer as unknown as (el: React.ReactElement) => Promise<Buffer | Uint8Array>)(element);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as Uint8Array);
}

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
