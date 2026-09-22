import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150).trim(),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000).trim(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING").optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date"),
  assignedToId: z.string().min(1, "Assignee required"),
  propertyId: z.string().optional().nullable().or(z.literal("")),
  unitId: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
