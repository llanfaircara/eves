"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Min 2 chars").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 chars").max(72),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

type Values = z.infer<typeof schema>;

export default function CreateUserForm({ onCreated }: { onCreated?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: { name: "", email: "", password: "", role: "EMPLOYEE" },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error + (data.details ? `: ${JSON.stringify(data.details)}` : ""));
      setSuccess(`Created ${data.user.role} ${data.user.name} (${data.user.email})`);
      reset();
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Manager / Employee</CardTitle>
        <CardDescription>Admin only — creates credentials for team members. They can immediately log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Maria Santos" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager — can manage tasks & properties</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee — sees assigned To-Do</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="user@eves.local" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" placeholder="min 6 chars" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Creating..." : "Create User"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
