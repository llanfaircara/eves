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
  { id: 1, title: "Booking & Contract", desc: "Time, unit, terms & financials" },
  { id: 2, title: "Personal Info", desc: "Who is moving in?" },
  { id: 3, title: "Employment & Emergency", desc: "Work & contacts" },
  { id: 4, title: "Move-in Checklist", desc: "Unit condition (13 items)" },
  { id: 5, title: "Utilities & Availment", desc: "Readings & items" },
  { id: 6, title: "ID & Sign-off", desc: "ID & representative" },
];

const CHECKLIST_ITEMS: Array<{ key: "switches" | "sockets" | "cabinet" | "lavatory" | "lightBulb" | "faucets" | "showerHead" | "toiletFlush" | "toiletBowl" | "kitchenSink" | "wallPaint" | "optionalItem" | "windows"; label: string }> = [
  { key: "switches", label: "Switches" },
  { key: "sockets", label: "Sockets" },
  { key: "cabinet", label: "Cabinet" },
  { key: "lavatory", label: "Lavatory" },
  { key: "lightBulb", label: "Light Bulb" },
  { key: "faucets", label: "Faucets" },
  { key: "showerHead", label: "Shower Head" },
  { key: "toiletFlush", label: "Toilet Flush" },
  { key: "toiletBowl", label: "Toilet Bowl" },
  { key: "kitchenSink", label: "Kitchen Sink" },
  { key: "wallPaint", label: "Wall Paint" },
  { key: "optionalItem", label: "Optional (bed, aircon, etc.)" },
  { key: "windows", label: "Windows" },
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
    mode: "onSubmit",
    defaultValues: {
      timeIn: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().slice(0, 10),
      fullName: "",
      contactNumber: "",
      fbMessenger: "",
      permanentAddress: "",
      propertyId: "",
      unitId: "",
      terms: "1 year",
      contractType: "LONG_TERM",
      rate: 5399,
      oneMonthAdvance: 5399,
      twoMonthsDeposit: 10798,
      addons: "",
      addonsAmount: 0,
      subjectToOccupancySupport: "NO",
      occupancySupportFee: 0,
      rentalStartDate: new Date().toISOString().slice(0, 10),
      rentalEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      day20: "",
      dueDate: "Every 6th of the month",
      totalAmountToSettle: 0,
      leaseStatus: "ACTIVE",
      lastName: "",
      firstName: "",
      middleName: "",
      age: undefined as never,
      gender: "",
      nationality: "Filipino",
      religion: "",
      recentAddress: "",
      civilStatus: "Single",
      mobileNumber: "",
      email: "",
      company: "",
      workStatus: "REGULAR",
      position: "",
      companyAddress: "",
      companyTel: "",
      companyEmail: "",
      companyMessenger: "",
      howDidYouFindOut: "Facebook",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactEmail: "",
      emergencyContactMessenger: "",
      emergencyContact2Name: "",
      emergencyContact2Phone: "",
      emergencyContact2Email: "",
      emergencyContact2Messenger: "",
      switches: "YES" as never,
      switchesComment: "",
      sockets: "YES" as never,
      socketsComment: "",
      cabinet: "YES" as never,
      cabinetComment: "",
      lavatory: "YES" as never,
      lavatoryComment: "",
      lightBulb: "YES" as never,
      lightBulbComment: "",
      faucets: "YES" as never,
      faucetsComment: "",
      showerHead: "YES" as never,
      showerHeadComment: "",
      toiletFlush: "YES" as never,
      toiletFlushComment: "",
      toiletBowl: "YES" as never,
      toiletBowlComment: "",
      kitchenSink: "YES" as never,
      kitchenSinkComment: "",
      wallPaint: "YES" as never,
      wallPaintComment: "",
      optionalItem: "N/A" as never,
      optionalComment: "",
      windows: "YES" as never,
      windowsComment: "",
      numberOfPerson: 1 as never,
      waterReading: null as never,
      electricReading: null as never,
      availmentFrom: "",
      availmentTo: "",
      items: "1",
      typeOfId: "philhealth",
      idLink: "",
      idNumber: "",
      dateIssued: new Date().toISOString().slice(0, 10),
      dateSigned: new Date().toISOString().slice(0, 10),
      propertyRepresentative: "",
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
      1: ["propertyId", "unitId", "rentalStartDate", "rentalEndDate"] as never,
      2: ["firstName", "lastName", "mobileNumber"] as never,
      3: [] as never,
      4: [] as never,
      5: ["numberOfPerson", "waterReading", "electricReading"] as never,
      6: [] as never,
    };
    const ok = await trigger(fields[step] as never);
    if (ok) setStep((s) => Math.min(6, s + 1));
  }

  function onInvalid(errs: typeof errors) {
    const flat = Object.entries(errs).map(([k, v]) => `${k}: ${(v as { message?: string })?.message || "invalid"}`).join("; ");
    setError(flat ? `Please fix: ${flat.slice(0, 600)}` : "Validation failed — check required fields on earlier steps.");
    // Jump to first step with error
    const keys = Object.keys(errs);
    const stepMap: Record<string, number> = {
      propertyId: 1, unitId: 1, rentalStartDate: 1, rentalEndDate: 1, rate: 1, terms: 1,
      firstName: 2, lastName: 2, mobileNumber: 2, age: 2, gender: 2, civilStatus: 2,
      numberOfPerson: 5, waterReading: 5, electricReading: 5,
    };
    for (const k of keys) {
      if (stepMap[k]) { setStep(stepMap[k]); break; }
    }
    console.warn("[Intake] validation failed", errs);
  }

  async function onSubmit(values: IntakeInput) {
    console.log("[Intake] submit", values);
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        email: (values.email as string) || null,
        companyEmail: (values.companyEmail as string) || null,
        emergencyContactEmail: (values.emergencyContactEmail as string) || null,
        emergencyContact2Email: (values.emergencyContact2Email as string) || null,
        waterReading: values.waterReading === null || values.waterReading === undefined || (values.waterReading as unknown as string) === "" ? null : Number(values.waterReading),
        electricReading: values.electricReading === null || values.electricReading === undefined || (values.electricReading as unknown as string) === "" ? null : Number(values.electricReading),
        rate: (values.rate as unknown as string) === "" ? null : Number(values.rate),
        oneMonthAdvance: (values.oneMonthAdvance as unknown as string) === "" ? null : Number(values.oneMonthAdvance),
        twoMonthsDeposit: (values.twoMonthsDeposit as unknown as string) === "" ? null : Number(values.twoMonthsDeposit),
        addonsAmount: (values.addonsAmount as unknown as string) === "" ? null : Number(values.addonsAmount),
        occupancySupportFee: (values.occupancySupportFee as unknown as string) === "" ? null : Number(values.occupancySupportFee),
        age: (values.age as unknown as string) === "" ? null : Number(values.age),
        numberOfPerson: (values.numberOfPerson as unknown as string) === "" ? null : Number(values.numberOfPerson),
        totalAmountToSettle: (values.totalAmountToSettle as unknown as string) === "" || values.totalAmountToSettle === null ? null : Number(values.totalAmountToSettle),
      };
      // If totalAmountToSettle is null, let API compute from rate+deposits
      if (payload.totalAmountToSettle === null || payload.totalAmountToSettle === 0) {
        const r = Number(payload.rate) || 0;
        const one = Number(payload.oneMonthAdvance) || r;
        const two = Number(payload.twoMonthsDeposit) || r * 2;
        const add = Number(payload.addonsAmount) || 0;
        payload.totalAmountToSettle = one + two + add;
      }
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
      const docMsg = data.documentLink ? ` • Lease PDF generated` : data.documentStatus === "GENERATION_FAILED" ? ` • PDF failed, retry in Tenants` : "";
      setSuccess(`Intake saved: ${data.tenant.firstName} ${data.tenant.lastName} → ${data.lease.controlNumber || data.lease.id.slice(0, 6)} (${units.find((u) => u.id === values.unitId)?.unitNumber})${docMsg}`);
      onSuccess?.();
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
        <CardTitle>New Tenant Intake — Full Questionnaire (ECO-LONG TERM)</CardTitle>
        <CardDescription>83 questions from Google Forms. Saves Tenant + Lease + Inspection + Lease PDF in one transaction. Replaces all legacy spreadsheets.</CardDescription>
        <div className="mt-4 flex gap-1.5 overflow-x-auto">
          {STEPS.map((s) => (
            <div key={s.id} className={`min-w-[110px] flex-1 rounded-lg border p-2.5 ${step === s.id ? "border-primary bg-primary/5" : step > s.id ? "border-green-200 bg-green-50" : "bg-muted/30"}`}>
              <div className="flex items-center gap-1.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${step > s.id ? "bg-green-600 text-white" : step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </div>
                <p className="text-xs font-medium leading-tight">{s.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">{error}</p>}
          {success && <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 whitespace-pre-wrap">{success}</p>}
          {Object.keys(errors).length > 0 && !error && (
            <p className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              Validation: {Object.entries(errors).slice(0, 8).map(([k, v]) => `${k}: ${(v as { message?: string })?.message || "invalid"}`).join(" • ")}
            </p>
          )}

          {/* Step 1: Booking & Contract */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Booking Details — replaces Google Form pages 1-2</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>TIME IN:</Label>
                  <Input {...register("timeIn")} placeholder="8:30 AM" />
                </div>
                <div className="space-y-2">
                  <Label>DATE: *</Label>
                  <Input type="date" {...register("date")} />
                </div>
                <div className="space-y-2">
                  <Label>DUE DATE:</Label>
                  <Input {...register("dueDate")} placeholder="Every 6th of the month" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select value={watch("propertyId") || undefined} onValueChange={(v) => { setValue("propertyId", v as never); setValue("unitId", "" as never); }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select ADI, BNB..." /></SelectTrigger>
                    <SelectContent className="max-h-64 w-[320px]">
                      {properties.map((p) => {
                        const vacant = p.units.filter((u) => u.status === "VACANT").length;
                        return <SelectItem key={p.id} value={p.id} className="py-2"><div className="flex flex-col items-start"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.units.length} units • {vacant} vacant</span></div></SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Unit No. *</Label>
                  <Select value={(watch("unitId") as string) || undefined} onValueChange={(v) => setValue("unitId", v as never)} disabled={!propertyId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={propertyId ? "Select vacant unit" : "Choose property first"} /></SelectTrigger>
                    <SelectContent className="max-h-72 w-[360px]">
                      {vacantUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="py-2">
                          <div className="flex w-full items-center justify-between gap-2"><span className="font-mono font-medium">{u.unitNumber}</span><span className="rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">VACANT</span></div>
                          <div className="text-xs text-muted-foreground">₱{Number(u.monthlyRate).toLocaleString()} / mo</div>
                        </SelectItem>
                      ))}
                      {units.filter((u) => u.status !== "VACANT").map((u) => (
                        <SelectItem key={u.id} value={u.id} disabled className="py-2 opacity-60"><div className="flex w-full items-center justify-between gap-2"><span className="font-mono">{u.unitNumber}</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 border border-blue-200">OCCUPIED</span></div></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>FULLNAME: * (auto from Personal Info, or override)</Label>
                  <Input {...register("fullName")} placeholder="DARLENE DE LEON MANDAP" />
                </div>
                <div className="space-y-2">
                  <Label>CONTACT NUMBER: *</Label>
                  <Input {...register("contactNumber")} placeholder="0917..." />
                </div>
                <div className="space-y-2">
                  <Label>FB/MESSENGER: *</Label>
                  <Input {...register("fbMessenger")} placeholder="Dhan Dhan De Leon" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>PERMANENT ADDRESS: *</Label>
                  <Input {...register("permanentAddress")} placeholder="104 Alicante..." />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>TERMS: *</Label>
                  <Select value={watch("terms") || undefined} onValueChange={(v) => { setValue("terms", v as never); const t = String(v).toLowerCase(); if (t.includes("trial")) setValue("contractType", "TRIAL" as never); else if (t.includes("m2m") || t.includes("month")) setValue("contractType", "M2M" as never); else setValue("contractType", "LONG_TERM" as never); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1 year">1 year</SelectItem><SelectItem value="6 months">6 months</SelectItem><SelectItem value="Month-to-Month">Month-to-Month</SelectItem><SelectItem value="Trial">Trial</SelectItem><SelectItem value="30 DAYS">30 DAYS</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>RATE: * (₱)</Label>
                  <Input type="number" step="0.01" {...register("rate")} />
                </div>
                <div className="space-y-2">
                  <Label>1 MONTH ADVANCE: *</Label>
                  <Input type="number" step="0.01" {...register("oneMonthAdvance")} />
                </div>
                <div className="space-y-2">
                  <Label>2 MONTHS DEPOSIT: *</Label>
                  <Input type="number" step="0.01" {...register("twoMonthsDeposit")} />
                </div>
                <div className="space-y-2">
                  <Label>ADD-ONS:</Label>
                  <Input {...register("addons")} placeholder="Parking, etc." />
                </div>
                <div className="space-y-2">
                  <Label>ADD-ONS AMOUNT:</Label>
                  <Input type="number" step="0.01" {...register("addonsAmount")} />
                </div>
                <div className="space-y-2">
                  <Label>SUBJECT TO OCCUPANCY SUPPORT?:</Label>
                  <Select value={watch("subjectToOccupancySupport") || "NO"} onValueChange={(v) => setValue("subjectToOccupancySupport", v as never)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="YES">YES</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>OCCUPANCY SUPPORT FEE:</Label>
                  <Input type="number" step="0.01" {...register("occupancySupportFee")} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>RENTAL START: *</Label>
                  <Input type="date" {...register("rentalStartDate")} />
                  {errors.rentalStartDate && <p className="text-xs text-destructive">{errors.rentalStartDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>RENTAL END: *</Label>
                  <Input type="date" {...register("rentalEndDate")} />
                  {errors.rentalEndDate && <p className="text-xs text-destructive">{errors.rentalEndDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>20TH DAY: *</Label>
                  <Input type="date" {...register("day20")} />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount To Settle (₱)</Label>
                  <Input type="number" step="0.01" {...register("totalAmountToSettle")} placeholder="auto = 1mo+2mo+addons" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Personal Information — Google Form pages 3-5</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>LAST NAME: *</Label>
                  <Input {...register("lastName")} placeholder="Mandap" />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <Label>FIRSTNAME: *</Label>
                  <Input {...register("firstName")} placeholder="Darlene" />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <Label>MIDDLE NAME: *</Label>
                  <Input {...register("middleName")} placeholder="De Leon" />
                </div>
                <div className="space-y-2">
                  <Label>AGE: *</Label>
                  <Input type="number" {...register("age")} placeholder="43" />
                </div>
                <div className="space-y-2">
                  <Label>GENDER: *</Label>
                  <Select value={watch("gender") || undefined} onValueChange={(v) => setValue("gender", v as never)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>NATIONALITY: *</Label>
                  <Input {...register("nationality")} placeholder="Filipino" />
                </div>
                <div className="space-y-2">
                  <Label>RELIGION: *</Label>
                  <Input {...register("religion")} placeholder="Roman Catholic" />
                </div>
                <div className="space-y-2">
                  <Label>CIVIL STATUS: *</Label>
                  <Select value={watch("civilStatus") || undefined} onValueChange={(v) => setValue("civilStatus", v as never)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Widowed">Widowed</SelectItem><SelectItem value="Separated">Separated</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>RECENT ADDRESS: *</Label>
                  <Input {...register("recentAddress")} placeholder="#69 Matahimik..." />
                </div>
                <div className="space-y-2">
                  <Label>MOBILE NUMBER: *</Label>
                  <Input {...register("mobileNumber")} placeholder="0917..." />
                  {errors.mobileNumber && <p className="text-xs text-destructive">{errors.mobileNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>EMAIL: *</Label>
                  <Input type="email" {...register("email")} placeholder="dhan55110@gmail.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>COMPANY: *</Label>
                  <Input {...register("company")} placeholder="Optum" />
                </div>
                <div className="space-y-2">
                  <Label>WORK STATUS: *</Label>
                  <Select value={watch("workStatus") || undefined} onValueChange={(v) => setValue("workStatus", v as never)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="REGULAR">REGULAR</SelectItem><SelectItem value="CONRTACTUAL">CONRTACTUAL</SelectItem><SelectItem value="OTHER">OTHER</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>POSITION: *</Label>
                  <Input {...register("position")} placeholder="Supervisor" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>COMPANY ADDRESS: *</Label>
                  <Input {...register("companyAddress")} placeholder="One Ayala Makati" />
                </div>
                <div className="space-y-2">
                  <Label>COMPANY TEL: *</Label>
                  <Input {...register("companyTel")} placeholder="NA" />
                </div>
                <div className="space-y-2">
                  <Label>COMPANY EMAIL: *</Label>
                  <Input {...register("companyEmail")} placeholder="NA" />
                </div>
                <div className="space-y-2">
                  <Label>COMPANY FB/MESSENGER: *</Label>
                  <Input {...register("companyMessenger")} placeholder="NA" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>HOW DID YOU FIND OUT ABOUT EVE’S RESIDENCES?: *</Label>
                  <Input {...register("howDidYouFindOut")} placeholder="Facebook" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Emergency Contacts */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">In Case of Emergency — 2 contacts</p>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">FIRST CONTACT PERSON</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>1. NAME: *</Label>
                    <Input {...register("emergencyContactName")} placeholder="Jonathan Leo Zerna" />
                  </div>
                  <div className="space-y-2">
                    <Label>1. PHONE NUMBER: *</Label>
                    <Input {...register("emergencyContactPhone")} placeholder="0916..." />
                  </div>
                  <div className="space-y-2">
                    <Label>1. EMAIL: *</Label>
                    <Input {...register("emergencyContactEmail")} placeholder="zjonathanleo@gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>1. MESSENGER: *</Label>
                    <Input {...register("emergencyContactMessenger")} placeholder="NA" />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">SECOND CONTACT PERSON</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>2. NAME: *</Label>
                    <Input {...register("emergencyContact2Name")} placeholder="NA" />
                  </div>
                  <div className="space-y-2">
                    <Label>2. PHONE NUMBER: *</Label>
                    <Input {...register("emergencyContact2Phone")} placeholder="NA" />
                  </div>
                  <div className="space-y-2">
                    <Label>2. EMAIL: *</Label>
                    <Input {...register("emergencyContact2Email")} placeholder="NA" />
                  </div>
                  <div className="space-y-2">
                    <Label>2. FB/MESSENGER: *</Label>
                    <Input {...register("emergencyContact2Messenger")} placeholder="NA" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Move-in Checklist */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Room Move-in & Move-out Checklist — 13 particulars</p>
              <p className="text-xs text-muted-foreground">For each particular, select YES/No and add comment if needed (matches Google Form).</p>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.map(({ key, label }) => {
                  const commentKey = (key === "optionalItem" ? "optionalComment" : `${key}Comment`) as keyof IntakeInput;
                  const current = (watch as unknown as (n: string) => unknown)(key) as string | undefined;
                  return (
                    <div key={key} className="grid grid-cols-[160px_120px_1fr] gap-2 items-center rounded-md border px-3 py-2">
                      <Label className="text-xs">{label} *</Label>
                      <Select value={current || "YES"} onValueChange={(v) => setValue(key as never, v as never)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="YES">YES</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="N/A">N/A</SelectItem></SelectContent>
                      </Select>
                      <Input placeholder="Comment" {...register(commentKey as never)} className="h-8" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Utilities & Availment */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Water/Electric Reading & Utility Deposit</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>NUMBER OF PERSON *</Label>
                  <Input type="number" {...register("numberOfPerson")} placeholder="2" />
                </div>
                <div className="space-y-2">
                  <Label>WATER READING *</Label>
                  <Input type="number" step="0.01" {...register("waterReading")} placeholder="88" />
                </div>
                <div className="space-y-2">
                  <Label>ELECTRIC READING *</Label>
                  <Input type="number" step="0.01" {...register("electricReading")} placeholder="88" />
                </div>
                <div className="space-y-2">
                  <Label>AVAILMENT FROM:</Label>
                  <Input type="date" {...register("availmentFrom")} />
                </div>
                <div className="space-y-2">
                  <Label>AVAILMENT TO:</Label>
                  <Input type="date" {...register("availmentTo")} />
                </div>
                <div className="space-y-2">
                  <Label>ITEM/S:</Label>
                  <Input {...register("items")} placeholder="1" />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: ID & Sign-off */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">ID & Sign-off — completes the lease</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>TYPE OF ID SUBMITTED: *</Label>
                  <Select value={watch("typeOfId") || undefined} onValueChange={(v) => setValue("typeOfId", v as never)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="philhealth">philhealth</SelectItem><SelectItem value="UMID">UMID</SelectItem><SelectItem value="Driver's License">Driver&apos;s License</SelectItem><SelectItem value="Passport">Passport</SelectItem><SelectItem value="NBI">NBI</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID NUMBER: *</Label>
                  <Input {...register("idNumber")} placeholder="01-050503819-9" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>ID: * (Drive link)</Label>
                  <Input {...register("idLink")} placeholder="https://drive.google.com/open?id=..." />
                </div>
                <div className="space-y-2">
                  <Label>DATE ISSUED: *</Label>
                  <Input type="date" {...register("dateIssued")} />
                </div>
                <div className="space-y-2">
                  <Label>DATE SIGNED: *</Label>
                  <Input type="date" {...register("dateSigned")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>PROPERTY REPRESENTATIVE</Label>
                  <Input {...register("propertyRepresentative")} placeholder="Marla" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea rows={3} {...register("remarks")} placeholder="Any additional notes..." />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 6 ? (
              <Button type="button" onClick={nextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Saving..." : "Complete Intake — Save & Generate Lease"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
