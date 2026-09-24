import { z } from "zod";

// Full questionnaire matching ECO-LONG TERM - Google Forms.pdf (83 questions, 94 spreadsheet cols)
// Mirrors the legacy Google Form so the generated lease is 100% filled.
// Most fields are required in the Google Form (*), but kept optional here for backwards
// compat with minimal reserve/intake submissions — UI enforces required via trigger.

const yesNo = z.enum(["YES", "No", "N/A"]).or(z.enum(["yes", "no"])).or(z.string().min(1)).transform((v) => {
  const t = String(v).trim().toUpperCase();
  if (t === "YES" || t === "Y") return "YES";
  if (t === "NO" || t === "N") return "No";
  return String(v).trim() || "N/A";
});

export const intakeSchema = z.object({
  // ── Step 1: Booking / Contract Basics (Google Form 1-18) ──
  timeIn: z.string().max(50).optional().nullable(), // TIME IN: e.g. 8:30 AM
  date: z.string().optional().nullable(), // DATE: — defaults to today if missing
  // FULLNAME: is derived from first/last/middle, but accept direct
  fullName: z.string().max(200).optional().nullable(),
  contactNumber: z.string().max(20).optional().nullable(), // CONTACT NUMBER:
  fbMessenger: z.string().max(150).optional().nullable(), // FB/MESSENGER:
  permanentAddress: z.string().max(500).optional().nullable(), // PERMANENT ADDRESS:

  // Step 1 also needs property/unit inventory (EVES app) — not in Google Form but required for DB
  propertyId: z.string().cuid("Select a property"),
  unitId: z.string().cuid("Select a unit"),

  // Contract financials (from Google Form 8-15)
  terms: z.string().min(1, "Terms required").max(50).optional().nullable(), // TERMS: e.g. 1 year
  contractType: z.enum(["TRIAL", "M2M", "LONG_TERM"]).optional(), // mapped from terms
  rate: z.coerce.number().min(0, "Rate must be >=0").optional().nullable(), // RATE:
  oneMonthAdvance: z.coerce.number().min(0).optional().nullable(), // 1 MONTH ADVANCE:
  twoMonthsDeposit: z.coerce.number().min(0).optional().nullable(), // 2 MONTHS DEPOSIT:
  addons: z.string().max(500).optional().nullable(), // ADD-ONS: free text e.g. "Parking"
  addonsAmount: z.coerce.number().min(0).optional().nullable(), // ADD-ONS AMOUNT:
  subjectToOccupancySupport: z.enum(["YES", "NO", "Yes", "No"]).optional().nullable(), // SUBJECT TO OCCUPANCY SUPPORT?:
  occupancySupportFee: z.coerce.number().min(0).optional().nullable(), // OCCUPANCY SUPPORT FEE:

  // Rental period (16-18)
  rentalStartDate: z.string().min(1, "Start date required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  rentalEndDate: z.string().min(1, "End date required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  day20: z.string().optional().nullable(), // 20TH DAY: date
  dueDate: z.string().max(50).optional().nullable(), // DUE DATE: e.g. Every 6th

  // Legacy totalAmountToSettle kept for compat — computed from rate+deposits if missing
  totalAmountToSettle: z.coerce.number().min(0, "Must be >=0").optional().nullable(),
  leaseStatus: z.enum(["ACTIVE", "PENDING", "EXPIRED", "TERMINATED"]).default("ACTIVE"),

  // ── Step 2: Personal Information (19-37) ──
  lastName: z.string().min(1, "Required").max(100).trim().optional().nullable(), // LAST NAME: *
  firstName: z.string().min(1, "Required").max(100).trim(), // FIRSTNAME: *
  middleName: z.string().max(100).trim().optional().nullable(), // MIDDLE NAME:
  age: z.coerce.number().int().min(15).max(100).optional().nullable(), // AGE:
  gender: z.string().max(20).optional().nullable(), // GENDER:
  nationality: z.string().max(50).optional().nullable(), // NATIONALITY:
  religion: z.string().max(50).optional().nullable(), // RELIGION:
  recentAddress: z.string().max(500).optional().nullable(), // RECENT ADDRESS:
  civilStatus: z.string().max(30).optional().nullable(), // CIVIL STATUS:
  mobileNumber: z.string().min(7, "Valid mobile required").max(20).trim(), // MOBILE NUMBER: *
  email: z.string().email().optional().or(z.literal("")).nullable(), // EMAIL:
  company: z.string().max(150).optional().nullable(), // COMPANY:
  workStatus: z.string().max(50).optional().nullable(), // WORK STATUS: REGULAR etc
  position: z.string().max(100).optional().nullable(), // POSITION:
  companyAddress: z.string().max(500).optional().nullable(), // COMPANY ADDRESS:
  companyTel: z.string().max(50).optional().nullable(), // COMPANY TELEPHONE NUMBER:
  companyEmail: z.string().email().optional().or(z.literal("")).nullable(), // COMPANY EMAIL:
  companyMessenger: z.string().max(150).optional().nullable(), // COMPANY FACEBOOK/MESSENGER:
  howDidYouFindOut: z.string().max(200).optional().nullable(), // HOW DID YOU FIND OUT:

  // ── Step 3: Emergency Contacts (38-45) ──
  emergencyContactName: z.string().max(100).optional().nullable(), // 1. NAME:
  emergencyContactPhone: z.string().max(20).optional().nullable(), // 1. PHONE NUMBER:
  emergencyContactEmail: z.string().email().optional().or(z.literal("")).nullable(), // 1. EMAIL:
  emergencyContactMessenger: z.string().max(150).optional().nullable(), // 1. MESSENGER:
  emergencyContactRelationship: z.string().max(50).optional().nullable(), // legacy
  emergencyContact2Name: z.string().max(100).optional().nullable(), // 2. NAME:
  emergencyContact2Phone: z.string().max(20).optional().nullable(), // 2. PHONE NUMBER:
  emergencyContact2Email: z.string().email().optional().or(z.literal("")).nullable(), // 2. EMAIL:
  emergencyContact2Messenger: z.string().max(150).optional().nullable(), // 2. FB/MESSENGER:

  // ── Step 4: Move-in Checklist (46-71) ── 13 items + comments
  switches: yesNo.optional().nullable(),
  switchesComment: z.string().max(500).optional().nullable(),
  sockets: yesNo.optional().nullable(),
  socketsComment: z.string().max(500).optional().nullable(),
  cabinet: yesNo.optional().nullable(),
  cabinetComment: z.string().max(500).optional().nullable(),
  lavatory: yesNo.optional().nullable(),
  lavatoryComment: z.string().max(500).optional().nullable(),
  lightBulb: yesNo.optional().nullable(),
  lightBulbComment: z.string().max(500).optional().nullable(),
  faucets: yesNo.optional().nullable(),
  faucetsComment: z.string().max(500).optional().nullable(),
  showerHead: yesNo.optional().nullable(),
  showerHeadComment: z.string().max(500).optional().nullable(),
  toiletFlush: yesNo.optional().nullable(),
  toiletFlushComment: z.string().max(500).optional().nullable(),
  toiletBowl: yesNo.optional().nullable(),
  toiletBowlComment: z.string().max(500).optional().nullable(),
  kitchenSink: yesNo.optional().nullable(),
  kitchenSinkComment: z.string().max(500).optional().nullable(),
  wallPaint: yesNo.optional().nullable(),
  wallPaintComment: z.string().max(500).optional().nullable(),
  optionalItem: z.string().optional().nullable(), // Optional (bed mattress...) YES/No/NA
  optionalComment: z.string().max(500).optional().nullable(),
  windows: yesNo.optional().nullable(),
  windowsComment: z.string().max(500).optional().nullable(),

  // ── Step 5: Utility Readings (72-77) ──
  numberOfPerson: z.coerce.number().int().min(1).max(10).optional().nullable(), // NUMBER OF PERSON *
  waterReading: z.coerce.number().min(0).optional().nullable(), // WATER READING *
  electricReading: z.coerce.number().min(0).optional().nullable(), // ELECTRIC READING *
  availmentFrom: z.string().optional().nullable(), // AVAILMENT FROM: date
  availmentTo: z.string().optional().nullable(), // AVAILMENT TO: date
  items: z.string().max(100).optional().nullable(), // ITEM/S: e.g. 1

  // ── Step 6: ID & Sign-off (78-83) ──
  typeOfId: z.string().max(100).optional().nullable(), // TYPE OF ID SUBMITTED:
  idLink: z.string().max(1000).optional().nullable(), // ID: drive link
  idNumber: z.string().max(100).optional().nullable(), // ID NUMBER:
  dateIssued: z.string().optional().nullable(), // DATE ISSUED:
  dateSigned: z.string().optional().nullable(), // DATE SIGNED:
  propertyRepresentative: z.string().max(100).optional().nullable(), // PROPERTY REPRESENTATIVE

  // Legacy checklistJson kept for compat
  checklistJson: z
    .object({
      waterHeater: z.enum(["ok", "issue", "na"]).optional(),
      aircon: z.enum(["ok", "issue", "na"]).optional(),
      locks: z.enum(["ok", "issue", "na"]).optional(),
      windows: z.enum(["ok", "issue", "na"]).optional(),
      appliances: z.enum(["ok", "issue", "na"]).optional(),
      cleanliness: z.enum(["ok", "issue", "na"]).optional(),
      keysReceived: z.boolean().optional(),
      contractSigned: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  remarks: z.string().max(2000).optional().nullable(),
})
  .refine((data) => new Date(data.rentalEndDate) >= new Date(data.rentalStartDate), {
    message: "End date must be on or after start date",
    path: ["rentalEndDate"],
  })
  .refine(
    (d) => {
      // At least firstName is required; lastName can be split from fullName if missing
      if ((d.firstName && d.firstName.trim()) || (d.fullName && String(d.fullName).trim())) return true;
      if (d.lastName && String(d.lastName).trim()) return true;
      return false;
    },
    { message: "First or Last name required", path: ["firstName"] }
  );

export type IntakeInput = z.infer<typeof intakeSchema>;
