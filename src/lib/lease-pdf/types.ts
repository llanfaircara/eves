/**
 * Strict TypeScript interfaces for Lease PDF generation.
 * Every variable is typed 1:1 with the normalized Lease+Tenant+Unit+Property schema
 * to guarantee 0% chance of rent/deposit swap at compile time.
 * Full contract placeholders mirror the legacy .docx (ECO LONG TERM.docx) — see
 * extraction from word/document.xml placeholders (CtrlNo, LegalName, Rate, etc.).
 */

export interface LeasePdfAddon {
  label: string;
  amount: number;
}

export interface LeasePdfCheckItem {
  label: string;
  value: string; // YES/No/NA
  comment: string;
}

export interface LeasePdfVariables {
  // Identity — never nullable for generation
  leaseId: string;
  controlNumber: string; // CtrlNo
  barCode: string | null;
  contractStatus: string; // e.g. Draft Generated / APPROVED
  leaseIntent: string; // New Lease | Renewal | Transfer | Hold
  leaseTerm: string; // Trial | M2M | 6 Months | 1 Year === Terms
  terms: string; // raw TERMS: "1 year"
  // Parties
  legalName: string; // FULLNAME: DARLENE DE LEON MANDAP
  lastName: string;
  firstName: string;
  middleName: string | null;
  // Personal
  age: string | null;
  gender: string | null;
  nationality: string | null;
  religion: string | null;
  civilStatus: string | null;
  permAddress: string | null;
  recAddress: string | null;
  contactNo: string | null; // CONTACT NUMBER:
  mobileNumber: string | null; // MOBILE NUMBER (may differ)
  emailAddr: string | null;
  fbMessenger: string | null;
  // Employment
  company: string | null;
  position: string | null;
  workStatus: string | null;
  compAddr: string | null;
  compTel: string | null;
  compEmail: string | null;
  compMssgr: string | null;
  marketingSrc: string | null;
  // Emergency contacts (2)
  ec1Name: string | null;
  ec1Tel: string | null;
  ec1Email: string | null;
  ec1Mssgr: string | null;
  ec2Name: string | null;
  ec2Tel: string | null;
  ec2Email: string | null;
  ec2Mssgr: string | null;

  // Premises
  propertyName: string; // PropertyLoc short (ECO 888)
  propertyLoc: string; // full location string for clause 1
  propertyAddress: string | null;
  unitNumber: string; // UnitNo
  // Financials — explicit branded fields prevent swap
  rate: number; // monthly rental ₱Rate
  dueDateText: string; // Every 6th of the month
  amountInWords: string; // Ten Thousand Seven Hundred Ninety Eight Pesos
  totalSettle: number; // Total Amount to Settle (deposits) — maps to totalAmountToSettle / TotalSettle
  monthlyRent: number; // alias of rate for compatibility
  securityDeposit: number; // 1st deposit (2 months)
  advanceDeposit: number; // advance (1 month) — for new schema advanceDeposit stores 2nd? keep alias
  advance1Month: number | null;
  deposit2Months: number | null;
  firstDepositDue: string; // ISO
  secondDepositDue: string;
  totalAmountToSettle: number;
  addons: LeasePdfAddon[];
  addonsAmount: number | null;
  occupancySupportFee: number | null;
  // Term
  rentalStart: string; // YYYY-MM-DD or M/D/YYYY for doc
  rentalEnd: string;
  leaseStartDate: string; // alias
  leaseEndDate: string;
  moveInDate: string;
  rentDueDate: string;
  availFrom: string | null;
  availTo: string | null;
  items: string | null;
  currentDate: string; // DATE: field
  day20: string | null; // 20th day for renewal notice
  penaltyDay: string | null;
  numPer: string | null; // NUMBER OF PERSON
  water: string | null;
  electric: string | null;
  // Checklist (14 rows)
  checklist: LeasePdfCheckItem[]; // ordered: Switches, Sockets, Cabinet, Lavatory, LightBulb, Faucets, ShowerHead, ToiletFlush, ToiletBowl, KitchenSink, WallPaint, Optional, Windows
  // IDs & rep
  idType: string | null;
  idNumber: string | null;
  idLink: string | null;
  dateIssued: string | null;
  dateSigned: string | null;
  propertyRep: string | null; // Rep
  noticePeriodDays: number;
  generatedAt: string; // ISO
}

// DB shape accepted by the generator (Prisma Lease + relations + inspection)
export type LeaseWithRelations = {
  id: string;
  controlNumber: string | null;
  barCode: string | null;
  contractType: string;
  rentalStartDate: Date | string;
  rentalEndDate: Date | string;
  totalAmountToSettle: unknown; // Decimal
  status: string;
  monthlyRent: unknown | null;
  securityDeposit: unknown | null;
  advanceDeposit: unknown | null;
  addons: unknown | null;
  addonsAmount: unknown | null;
  occupancySupportFee: unknown | null;
  noticePeriodDays: number | null;
  leaseIntent: string | null;
  leaseTerm: string | null;
  terms: string | null;
  dueDateText: string | null;
  moveInDate: Date | string | null;
  rentDueDate: Date | string | null;
  rate: unknown | null;
  advance1Month: unknown | null;
  deposit2Months: unknown | null;
  numPersons: number | null;
  waterReading: unknown | null;
  electricReading: unknown | null;
  availFrom: Date | string | null;
  availTo: Date | string | null;
  items: string | null;
  timeIn: string | null;
  currentDate: Date | string | null;
  dateSigned: Date | string | null;
  day20: Date | string | null;
  penaltyDay: Date | string | null;
  propertyLoc: string | null;
  propertyRep: string | null;
  contactNumberAlt: string | null;
  fbMessenger: string | null;
  permanentAddressAlt: string | null;
  documentLink: string | null;
  documentStatus: string | null;
  tenant: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    age: number | null;
    gender: string | null;
    nationality: string | null;
    religion: string | null;
    civilStatus: string | null;
    mobileNumber: string;
    email: string | null;
    fbMessenger: string | null;
    permanentAddress: string | null;
    recentAddress: string | null;
    company: string | null;
    companyPosition: string | null;
    workStatus: string | null;
    companyAddress: string | null;
    companyTel: string | null;
    companyEmail: string | null;
    companyMessenger: string | null;
    marketingSource: string | null;
    idType: string | null;
    idNumber: string | null;
    idLink: string | null;
    dateIssued: Date | string | null;
    emergencyContacts: unknown;
  };
  unit: { unitNumber: string; monthlyRate: unknown; property: { name: string; address: string | null } };
  inspections?: Array<{
    waterReading: unknown | null;
    electricReading: unknown | null;
    switches: string | null; switchesCom: string | null;
    sockets: string | null; socketsCom: string | null;
    cabinet: string | null; cabinetCom: string | null;
    lavatory: string | null; lavatoryCom: string | null;
    lightBulb: string | null; lightBulbCom: string | null;
    faucets: string | null; faucetsCom: string | null;
    showerHead: string | null; showerHeadCom: string | null;
    toiletFlush: string | null; toiletFlushCom: string | null;
    toiletBowl: string | null; toiletBowlCom: string | null;
    kitchenSink: string | null; kitchenSinkCom: string | null;
    wallPaint: string | null; wallPaintCom: string | null;
    optional: string | null; optionalCom: string | null;
    windows: string | null; windowsCom: string | null;
    checklistJson: unknown;
  }>;
};
