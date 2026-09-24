"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ForecastUnit, ReservationPayload } from "@/lib/executive";
import { Plus, Trash2 } from "lucide-react";

const schema = z
  .object({
    intent: z.enum(["New Lease", "Renewal", "Transfer", "Hold"]),
    term: z.enum(["Trial", "Month-to-Month", "6 Months", "1 Year"]),
    leaseStart: z.string().min(1, "Lease start is required"),
    leaseEnd: z.string().min(1, "Lease end is required"),
    moveInDate: z.string().min(1, "Move-in date is required"),
    rentDueDate: z.string().min(1, "Rent due date is required"),
    monthlyRent: z.coerce.number().min(1, "Monthly rent must be at least ₱1"),
    firstDeposit: z.coerce.number().min(0, "Must be at least 0"),
    firstDepositDue: z.string().min(1, "Due date is required"),
    secondDeposit: z.coerce.number().min(0, "Must be at least 0"),
    secondDepositDue: z.string().min(1, "Due date is required"),
    addons: z
      .array(z.object({ label: z.string().min(1, "Label required"), amount: z.coerce.number().min(0, "Must be at least 0") }))
      .default([]),
    noticePeriodDays: z.coerce.number().int().min(0, "Must be at least 0").max(365, "Max 365 days"),
    leaseStatus: z.enum(["Draft", "Pending Review", "Ready"]),
  })
  .refine((d) => new Date(d.leaseEnd) >= new Date(d.leaseStart), {
    message: "Lease end must be on or after lease start",
    path: ["leaseEnd"],
  });

type FormValues = z.infer<typeof schema>;

export default function ReserveUnitDialog({
  open,
  onOpenChange,
  unit,
  onReserved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit: ForecastUnit | null;
  onReserved: (payload: ReservationPayload) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      intent: "New Lease",
      term: "1 Year",
      leaseStart: "",
      leaseEnd: "",
      moveInDate: "",
      rentDueDate: "",
      monthlyRent: 0,
      firstDeposit: 0,
      firstDepositDue: "",
      secondDeposit: 0,
      secondDepositDue: "",
      addons: [],
      noticePeriodDays: 30,
      leaseStatus: "Draft",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "addons" });

  // Pre-populate from unit context whenever a new unit is selected
  useEffect(() => {
    if (unit && open) {
      const start = unit.earliestAvailable;
      const end = new Date(new Date(start).getTime() + 365 * 86400000).toISOString().slice(0, 10);
      reset({
        intent: "New Lease",
        term: "1 Year",
        leaseStart: start,
        leaseEnd: end,
        moveInDate: start,
        rentDueDate: start,
        monthlyRent: unit.monthlyRate ?? 0,
        firstDeposit: unit.monthlyRate ?? 0,
        firstDepositDue: start,
        secondDeposit: unit.monthlyRate ?? 0,
        secondDepositDue: start,
        addons: [],
        noticePeriodDays: 30,
        leaseStatus: "Draft",
      });
    }
  }, [unit, open, reset]);

  async function onSubmit(values: FormValues) {
    if (!unit) return;
    onReserved({
      unitId: unit.unitId,
      property: unit.property,
      ...values,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reserve unit {unit ? `${unit.property} ${unit.unitId}` : ""}</DialogTitle>
          <DialogDescription>
            {unit
              ? `Available ${unit.earliestAvailable} • ${unit.occupancy} • ${unit.monthlyRate ? `₱${Number(unit.monthlyRate).toLocaleString()} / mo` : "Rate TBD"}`
              : "Select a unit to reserve."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Intent *</Label>
              <Select value={watch("intent")} onValueChange={(v) => setValue("intent", (v ?? "New Lease") as FormValues["intent"], { shouldValidate: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Lease">New Lease</SelectItem>
                  <SelectItem value="Renewal">Renewal</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                </SelectContent>
              </Select>
              {errors.intent && <p className="text-xs text-destructive">{errors.intent.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={watch("term")} onValueChange={(v) => setValue("term", (v ?? "1 Year") as FormValues["term"], { shouldValidate: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Month-to-Month">Month-to-Month</SelectItem>
                  <SelectItem value="6 Months">6 Months</SelectItem>
                  <SelectItem value="1 Year">1 Year</SelectItem>
                </SelectContent>
              </Select>
              {errors.term && <p className="text-xs text-destructive">{errors.term.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseStart">Lease start date *</Label>
              <Input id="leaseStart" type="date" {...register("leaseStart")} />
              {errors.leaseStart && <p className="text-xs text-destructive">{errors.leaseStart.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseEnd">Lease end date *</Label>
              <Input id="leaseEnd" type="date" {...register("leaseEnd")} />
              {errors.leaseEnd && <p className="text-xs text-destructive">{errors.leaseEnd.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="moveInDate">Move-in date *</Label>
              <Input id="moveInDate" type="date" {...register("moveInDate")} />
              {errors.moveInDate && <p className="text-xs text-destructive">{errors.moveInDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentDueDate">Rent due date *</Label>
              <Input id="rentDueDate" type="date" {...register("rentDueDate")} />
              {errors.rentDueDate && <p className="text-xs text-destructive">{errors.rentDueDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Monthly rent (₱) *</Label>
              <Input id="monthlyRent" type="number" step="0.01" min={0} {...register("monthlyRent")} />
              {errors.monthlyRent && <p className="text-xs text-destructive">{errors.monthlyRent.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="noticePeriodDays">Notice period (days) *</Label>
              <Input id="noticePeriodDays" type="number" min={0} max={365} {...register("noticePeriodDays")} />
              {errors.noticePeriodDays && <p className="text-xs text-destructive">{errors.noticePeriodDays.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstDeposit">1st deposit (₱) *</Label>
              <Input id="firstDeposit" type="number" step="0.01" min={0} {...register("firstDeposit")} />
              {errors.firstDeposit && <p className="text-xs text-destructive">{errors.firstDeposit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstDepositDue">1st deposit due *</Label>
              <Input id="firstDepositDue" type="date" {...register("firstDepositDue")} />
              {errors.firstDepositDue && <p className="text-xs text-destructive">{errors.firstDepositDue.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondDeposit">2nd deposit (₱) *</Label>
              <Input id="secondDeposit" type="number" step="0.01" min={0} {...register("secondDeposit")} />
              {errors.secondDeposit && <p className="text-xs text-destructive">{errors.secondDeposit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondDepositDue">2nd deposit due *</Label>
              <Input id="secondDepositDue" type="date" {...register("secondDepositDue")} />
              {errors.secondDepositDue && <p className="text-xs text-destructive">{errors.secondDepositDue.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Lease status</Label>
              <Select value={watch("leaseStatus")} onValueChange={(v) => setValue("leaseStatus", (v ?? "Draft") as FormValues["leaseStatus"], { shouldValidate: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                </SelectContent>
              </Select>
              {errors.leaseStatus && <p className="text-xs text-destructive">{errors.leaseStatus.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Add-ons</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ label: "", amount: 0 })}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No add-ons — e.g., parking, storage, utilities.</p>
            ) : (
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-[1fr_140px_40px] items-start gap-2">
                    <div className="space-y-1">
                      <Input placeholder="parking / storage / utilities" {...register(`addons.${i}.label` as const)} />
                      {errors.addons?.[i]?.label && (
                        <p className="text-xs text-destructive">{errors.addons[i]?.label?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Input type="number" step="0.01" min={0} placeholder="0" {...register(`addons.${i}.amount` as const)} />
                      {errors.addons?.[i]?.amount && (
                        <p className="text-xs text-destructive">{errors.addons[i]?.amount?.message}</p>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove add-on">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Reserving..." : "Reserve unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
