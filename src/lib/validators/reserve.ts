import { z } from "zod";

// Mirrors ReserveUnitDialog schema, plus tenant identity required for Lease creation.
// Financial fields are distinct scalars (no generic "amount") to prevent swap.

export const reserveSchema = z
  .object({
    // Target unit (ForecastUnit.id is prop-unit; we need DB unit lookup)
    unitId: z.string().min(1, "unitId required"), // accepts "BNB 1-A" etc; resolved server-side
    property: z.string().min(1, "Property required"),
    // Optional exact DB unit id if caller has it
    dbUnitId: z.string().cuid().optional().nullable(),

    // Tenant identity — new tenant per reservation (form collects minimal fields)
    // For "Renewal/Transfer" the same tenant may be re-used if email matches.
    tenantFirstName: z.string().min(1, "First name required").max(100).trim().optional().nullable(),
    tenantLastName: z.string().min(1, "Last name required").max(100).trim().optional().nullable(),
    tenantName: z.string().max(200).trim().optional().nullable(), // fallback single field
    tenantEmail: z.string().email().optional().or(z.literal("")).nullable(),
    tenantMobile: z.string().max(20).optional().nullable(),
    tenantCompany: z.string().max(150).optional().nullable(),

    intent: z.enum(["New Lease", "Renewal", "Transfer", "Hold"]),
    term: z.enum(["Trial", "Month-to-Month", "6 Months", "1 Year"]),
    leaseStart: z.string().min(1, "Lease start required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
    leaseEnd: z.string().min(1, "Lease end required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
    moveInDate: z.string().min(1, "Move-in required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
    rentDueDate: z.string().min(1, "Rent due required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
    monthlyRent: z.coerce.number().min(1, "Monthly rent must be at least ₱1"),
    firstDeposit: z.coerce.number().min(0),
    firstDepositDue: z.string().min(1, "1st deposit due required"),
    secondDeposit: z.coerce.number().min(0),
    secondDepositDue: z.string().min(1, "2nd deposit due required"),
    addons: z
      .array(z.object({ label: z.string().min(1), amount: z.coerce.number().min(0) }))
      .default([]),
    noticePeriodDays: z.coerce.number().int().min(0).max(365),
    leaseStatus: z.enum(["Draft", "Pending Review", "Ready"]),
  })
  .refine((d) => new Date(d.leaseEnd) >= new Date(d.leaseStart), {
    message: "Lease end must be on or after lease start",
    path: ["leaseEnd"],
  })
  .refine(
    (d) => {
      // Require at least a name (either split or single)
      const hasSplit = d.tenantFirstName && d.tenantLastName;
      const hasSingle = d.tenantName && d.tenantName.trim().length > 0;
      return !!(hasSplit || hasSingle);
    },
    { message: "Tenant name is required", path: ["tenantName"] }
  );

export type ReserveInput = z.infer<typeof reserveSchema>;

export function contractTypeFromTerm(term: ReserveInput["term"]): "TRIAL" | "M2M" | "LONG_TERM" {
  if (term === "Trial") return "TRIAL";
  if (term === "Month-to-Month") return "M2M";
  return "LONG_TERM";
}

export function leaseStatusFromDraft(s: ReserveInput["leaseStatus"]): "PENDING" | "ACTIVE" {
  // Draft/Pending Review → PENDING; Ready → ACTIVE (document still Draft Generated)
  return s === "Ready" ? "ACTIVE" : "PENDING";
}
