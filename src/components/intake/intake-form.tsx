"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { intakeSchema, type IntakeInput } from "@/lib/validators/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, ArrowRight, ArrowLeft } from "lucide-react";

type PropertyWithUnits = {
  id: string;
  name: string;
  units: { id: string; unitNumber: string; status: string; monthlyRate: string | number }[];
};

const STEPS = [
  { id: 1, title: "Tenant Info", desc: "Who is moving in?" },
  { id: 2, title: "Lease Details", desc: "Property, unit & terms" },
  { id: 3, title: "Move-in Checklist", desc: "Meters & condition" },
];

export default function IntakeForm({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<PropertyWithUnits[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<IntakeInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(intakeSchema as any),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobileNumber: "",
      email: "",
      company: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      propertyId: "",
      unitId: "",
      contractType: "M2M",
      rentalStartDate: new Date().toISOString().slice(0, 10),
      rentalEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      totalAmountToSettle: 0,
      leaseStatus: "ACTIVE",
      waterReading: null,
      electricReading: null,
      checklistJson: { waterHeater: "ok", aircon: "ok", locks: "ok", windows: "ok", appliances: "ok", cleanliness: "ok", keysReceived: true, contractSigned: false },
      remarks: "",
    },
  });

  const propertyId = watch("propertyId");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/properties");
        const data = await res.json();
        if (res.ok) setProperties(data.properties || []);
      } catch {
        /* ignore */
      } finally {
        setLoadingMeta(false);
      }
    }
    load();
  }, []);

  const units = propertyId ? properties.find((p) => p.id === propertyId)?.units || [] : [];
  const vacantUnits = units.filter((u) => u.status === "VACANT");

  async function nextStep() {
    const fields: Record<number, (keyof IntakeInput)[]> = {
      1: ["firstName", "lastName", "mobileNumber", "email"],
      2: ["propertyId", "unitId", "contractType", "rentalStartDate", "rentalEndDate", "totalAmountToSettle"],
      3: ["waterReading", "electricReading"],
    };
    const ok = await trigger(fields[step] as never);
    if (ok) setStep((s) => Math.min(3, s + 1));
  }

  async function onSubmit(values: IntakeInput) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Coerce readings
      const payload = {
        ...values,
        email: values.email || null,
        waterReading: values.waterReading === null || values.waterReading === undefined || (values.waterReading as unknown as string) === "" ? null : Number(values.waterReading),
        electricReading: values.electricReading === null || values.electricReading === undefined || (values.electricReading as unknown as string) === "" ? null : Number(values.electricReading),
      };
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = data.details ? JSON.stringify(data.details) : "";
        throw new Error(data.error + (details ? `: ${details}` : ""));
      }
      setSuccess(`Intake saved: ${data.tenant.firstName} ${data.tenant.lastName} → ${data.lease.id.slice(0, 6)} (${units.find((u) => u.id === values.unitId)?.unitNumber})`);
      onSuccess?.();
      // Don't reset immediately — let user see success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save intake");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMeta) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>New Tenant Intake — Unified Move-in Form</CardTitle>
        <CardDescription>Replaces Google Forms. Saves Tenant + Lease + Move-in Inspection in one transaction.</CardDescription>
        {/* Progress */}
        <div className="mt-4 flex gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex-1 rounded-lg border p-3 ${step === s.id ? "border-primary bg-primary/5" : step > s.id ? "border-green-200 bg-green-50" : "bg-muted/30"}`}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step > s.id ? "bg-green-600 text-white" : step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </div>
                <p className="text-sm font-medium">{s.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</p>}

          {/* Step 1 */}
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input {...register("firstName")} placeholder="Juan" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input {...register("lastName")} placeholder="Dela Cruz" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input {...register("mobileNumber")} placeholder="0917..." />
                {errors.mobileNumber && <p className="text-xs text-destructive">{errors.mobileNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} placeholder="optional@..." type="email" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input {...register("company")} placeholder="Employer (optional)" />
              </div>
              <div className="md:col-span-2 border-t pt-4">
                <p className="mb-3 text-sm font-medium">Emergency Contact (optional)</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input {...register("emergencyContactName")} placeholder="Maria" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input {...register("emergencyContactPhone")} placeholder="0917..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input {...register("emergencyContactRelationship")} placeholder="Spouse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select
                  value={watch("propertyId") || undefined}
                  onValueChange={(v) => {
                    setValue("propertyId", v as never);
                    setValue("unitId", "" as never);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select ADI, BNB, DREAM..." /></SelectTrigger>
                  <SelectContent className="max-h-64 w-[320px]">
                    {properties.map((p) => {
                      const vacant = p.units.filter((u) => u.status === "VACANT").length;
                      const total = p.units.length;
                      return (
                        <SelectItem key={p.id} value={p.id} className="py-2">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {total} units • {vacant} vacant • {total - vacant} occupied
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select
                  value={(watch("unitId") as string) || undefined}
                  onValueChange={(v) => setValue("unitId", v as never)}
                  disabled={!propertyId}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder={propertyId ? "Select vacant unit" : "Choose property first"} /></SelectTrigger>
                  <SelectContent className="max-h-72 w-[360px]">
                    {vacantUnits.length === 0 && propertyId ? <div className="px-3 py-2 text-xs text-muted-foreground">No vacant units — all occupied</div> : null}
                    {vacantUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="py-2">
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono font-medium">{u.unitNumber}</span>
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">VACANT</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ₱{u.monthlyRate === "—" || u.monthlyRate === null ? "—" : Number(u.monthlyRate).toLocaleString()} / mo
                        </div>
                      </SelectItem>
                    ))}
                    {units.filter((u) => u.status !== "VACANT").length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Occupied — cannot select</div>
                    )}
                    {units.filter((u) => u.status !== "VACANT").map((u) => (
                      <SelectItem key={u.id} value={u.id} disabled className="py-2 opacity-60">
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono">{u.unitNumber}</span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 border border-blue-200">OCCUPIED</span>
                        </div>
                        <div className="text-xs text-muted-foreground">₱{u.monthlyRate === "—" ? "—" : Number(u.monthlyRate).toLocaleString()} / mo • occupied</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
                <p className="text-xs text-muted-foreground">Only VACANT units should be selected for new leases.</p>
              </div>

              <div className="space-y-2">
                <Label>Contract Type *</Label>
                <Select value={watch("contractType")} onValueChange={(v) => setValue("contractType", v as never)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[280px]">
                    <SelectItem value="TRIAL">Trial — short stay</SelectItem>
                    <SelectItem value="M2M">Month-to-Month (M2M) — flexible monthly</SelectItem>
                    <SelectItem value="LONG_TERM">Long Term — 6 mo / 1 yr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lease Status</Label>
                <Select value={watch("leaseStatus") || "ACTIVE"} onValueChange={(v) => setValue("leaseStatus", v as never)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[240px]">
                    <SelectItem value="ACTIVE">Active — currently occupied</SelectItem>
                    <SelectItem value="PENDING">Pending — awaiting move-in</SelectItem>
                    <SelectItem value="EXPIRED">Expired — past end date</SelectItem>
                    <SelectItem value="TERMINATED">Terminated — early end</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rental Start Date *</Label>
                <Input type="date" {...register("rentalStartDate")} />
                {errors.rentalStartDate && <p className="text-xs text-destructive">{errors.rentalStartDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Rental End Date *</Label>
                <Input type="date" {...register("rentalEndDate")} />
                {errors.rentalEndDate && <p className="text-xs text-destructive">{errors.rentalEndDate.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Total Amount To Settle (₱) *</Label>
                <Input type="number" step="0.01" {...register("totalAmountToSettle")} placeholder="e.g., 35000" />
                {errors.totalAmountToSettle && <p className="text-xs text-destructive">{errors.totalAmountToSettle.message}</p>}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Water Meter Reading</Label>
                  <Input type="number" step="0.01" {...register("waterReading")} placeholder="e.g., 0123.5" />
                  {errors.waterReading && <p className="text-xs text-destructive">{errors.waterReading.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Electric Meter Reading</Label>
                  <Input type="number" step="0.01" {...register("electricReading")} placeholder="e.g., 4567" />
                  {errors.electricReading && <p className="text-xs text-destructive">{errors.electricReading.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Checklist (condition at move-in)</Label>
                <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                  {[
                    ["waterHeater", "Water Heater"],
                    ["aircon", "Aircon"],
                    ["locks", "Locks/Keys"],
                    ["windows", "Windows"],
                    ["appliances", "Appliances"],
                    ["cleanliness", "Cleanliness"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Select
                        value={((watch(`checklistJson.${key}` as never) as unknown) as string) || "ok"}
                        onValueChange={(v) => setValue(`checklistJson.${key}` as never, v as never)}
                      >
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ok">OK</SelectItem>
                          <SelectItem value="issue">Issue noted</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 md:col-span-3 pt-2">
                    <input type="checkbox" {...register("checklistJson.keysReceived" as never)} className="h-4 w-4 rounded border" />
                    <Label className="font-normal">Keys received</Label>
                    <input type="checkbox" {...register("checklistJson.contractSigned" as never)} className="h-4 w-4 rounded border ml-6" />
                    <Label className="font-normal">Contract signed</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea rows={3} {...register("remarks")} placeholder="Any issues, missing items, agreements..." />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            {step < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Saving..." : "Complete Intake — Save"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
