import { z } from "zod";

export const intakeSchema = z.object({
  // Step 1 — Tenant Info
  firstName: z.string().min(1, "Required").max(100).trim(),
  lastName: z.string().min(1, "Required").max(100).trim(),
  mobileNumber: z.string().min(7, "Valid mobile required").max(20).trim(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  company: z.string().max(150).optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  emergencyContactRelationship: z.string().max(50).optional().nullable(),

  // Step 2 — Lease Details
  propertyId: z.string().cuid("Select a property"),
  unitId: z.string().cuid("Select a unit"),
  contractType: z.enum(["TRIAL", "M2M", "LONG_TERM"]),
  rentalStartDate: z.string().min(1, "Start date required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  rentalEndDate: z.string().min(1, "End date required").refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  totalAmountToSettle: z.coerce.number().min(0, "Must be >= 0"),
  leaseStatus: z.enum(["ACTIVE", "PENDING", "EXPIRED", "TERMINATED"]).default("ACTIVE"),

  // Step 3 — Move-in Checklist (Utilities/Meter Readings)
  waterReading: z.coerce.number().min(0).optional().nullable(),
  electricReading: z.coerce.number().min(0).optional().nullable(),
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
  });

export type IntakeInput = z.infer<typeof intakeSchema>;
