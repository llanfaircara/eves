"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validators/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type PropertyWithUnits = {
  id: string;
  name: string;
  units: { id: string; unitNumber: string; status: string; monthlyRate: string | number }[];
};

export default function TaskForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
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
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createTaskSchema as any),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: "",
      propertyId: "",
      unitId: "",
      dueDate: "",
      notes: "",
    },
  });

  const selectedPropertyId = watch("propertyId");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/properties");
        const data = await res.json();
        if (res.ok) {
          setProperties(data.properties || []);
          setEmployees(data.employees || []);
        } else {
          setError(data.error || "Failed to load form data");
        }
      } catch {
        setError("Network error loading form data");
      } finally {
        setLoadingMeta(false);
      }
    }
    load();
  }, []);

  async function onSubmit(values: CreateTaskInput) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...values,
        propertyId: values.propertyId || null,
        unitId: values.unitId || null,
        dueDate: values.dueDate || null,
        notes: values.notes || null,
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Failed to create task";
        const details = data.details ? JSON.stringify(data.details) : "";
        throw new Error(details ? `${msg}: ${details}` : msg);
      }
      setSuccess(`Task "${data.task.title}" assigned to ${data.task.assignedTo.name}`);
      reset();
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  const unitsForProperty = selectedPropertyId
    ? properties.find((p) => p.id === selectedPropertyId)?.units || []
    : [];

  if (loadingMeta) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Assign New Job / Task</CardTitle>
        <CardDescription>Create and delegate a job to an employee. It will appear in their To-Do list.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">{success}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="e.g., Fix AC in ECO-102, Collect rent GREEN" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={3} placeholder="Detailed instructions..." {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Assignee (Employee) *</Label>
              <Select onValueChange={(v) => setValue("assignedToId" as never, v as never, { shouldValidate: true })} value={(watch("assignedToId") as unknown as string) || undefined}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="w-[340px] max-h-64">
                  {employees.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No employees found — create via Admin → User Management</div>
                  ) : (
                    employees.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="py-2">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{e.name}</span>
                          <span className="text-xs text-muted-foreground break-all">{e.email}</span>
                          <span className="text-xs text-muted-foreground font-mono">{e.id.slice(0, 8)}…</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.assignedToId && <p className="text-xs text-destructive">{errors.assignedToId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Related Property</Label>
              <Select
                onValueChange={(v) => {
                  setValue("propertyId", v === "none" ? "" : v, { shouldValidate: true });
                  setValue("unitId", "", { shouldValidate: true });
                }}
                value={watch("propertyId") || "none"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional — choose property" />
                </SelectTrigger>
                <SelectContent className="w-[320px] max-h-64">
                  <SelectItem value="none">— No property —</SelectItem>
                  {properties.map((p) => {
                    const vacant = p.units.filter((u) => u.status === "VACANT").length;
                    return (
                      <SelectItem key={p.id} value={p.id} className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.units.length} units • {vacant} vacant • {p.units.length - vacant} occupied
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Related Unit</Label>
              <Select
                onValueChange={(v) => setValue("unitId", v === "none" ? "" : v)}
                value={(watch("unitId") as string) || "none"}
                disabled={!selectedPropertyId || unitsForProperty.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedPropertyId ? "Select unit" : "Choose property first"} />
                </SelectTrigger>
                <SelectContent className="w-[360px] max-h-72">
                  <SelectItem value="none">— No unit —</SelectItem>
                  {unitsForProperty.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="py-2">
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-mono font-medium">{u.unitNumber}</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium border ${u.status === "VACANT" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{u.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">₱{u.monthlyRate === "—" || u.monthlyRate === null ? "—" : Number(u.monthlyRate).toLocaleString()} / mo • {u.id.slice(0, 6)}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} placeholder="Optional notes, priority, tools needed..." {...register("notes")} />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Assigning..." : "Assign Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
