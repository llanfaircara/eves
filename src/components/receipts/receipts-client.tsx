"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Upload, FileText, Loader2 } from "lucide-react";

type Receipt = {
  id: string;
  tenantName: string;
  property: string;
  unit: string;
  month: string;
  amount: number;
  receiptUrl?: string | null;
  receiptName?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  createdAt: string;
};

export default function ReceiptsClient({ role }: { role: "ADMIN" | "MANAGER" | "EMPLOYEE" }) {
  const canReview = role === "ADMIN" || role === "MANAGER";
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | Receipt["status"]>("ALL");

  // Form state — unit synced to property, amount auto-matches rent
  const [form, setForm] = useState({ tenantName: "", property: "eco", unit: "", month: new Date().toISOString().slice(0, 7), amount: "", receipt: null as File | null });
  const [properties, setProperties] = useState<{ id: string; name: string; units: { id: string; unitNumber: string; status: string; monthlyRate: string | number }[] }[]>([]);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((d) => {
        if (d.properties) setProperties(d.properties);
      })
      .catch(() => {});
  }, []);

  const unitsForProperty = form.property ? properties.find((p) => p.id === form.property.toLowerCase() || p.name === form.property)?.units || [] : [];

  function onPropertyChange(v: string) {
    setForm({ ...form, property: v, unit: "", amount: "" });
  }
  function onUnitChange(v: string) {
    const unit = unitsForProperty.find((u) => u.unitNumber === v || u.id === v);
    const rate = unit?.monthlyRate;
    const amountStr = rate && rate !== "—" && rate !== null ? String(rate).replace(/[^0-9.]/g, "") : "";
    setForm({ ...form, unit: v, amount: amountStr || form.amount });
  }

  async function fetchReceipts() {
    try {
      const res = await fetch("/api/receipts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReceipts(data.receipts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchReceipts();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.set("tenantName", form.tenantName);
      fd.set("property", form.property);
      fd.set("unit", form.unit);
      fd.set("month", form.month);
      fd.set("amount", form.amount);
      if (form.receipt) fd.set("receipt", form.receipt);
      const res = await fetch("/api/receipts", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSuccess(`Submitted — pending admin approval (${data.receipt.id.slice(0, 6)})`);
      setForm({ tenantName: "", property: "ECO", unit: "", month: new Date().toISOString().slice(0, 7), amount: "", receipt: null });
      fetchReceipts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function review(id: string, status: Receipt["status"]) {
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: reviewNote[id] || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchReceipts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  const filtered = filter === "ALL" ? receipts : receipts.filter((r) => r.status === filter);
  const pending = receipts.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Submit Payment Receipt
          </CardTitle>
          <CardDescription>Tenant or employee uploads receipt (photo/PDF). Status stays PENDING until Manager/Admin approves — then it counts as PAID in monitoring.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tenant Name *</Label>
              <Input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} placeholder="e.g., SHERYL BALLESTEROS" required />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Auto from unit rent" required />
              <p className="text-xs text-muted-foreground">Auto-matches selected unit&apos;s rent — editable if needed (e.g., partial, penalties).</p>
            </div>
            <div className="space-y-2">
              <Label>Property *</Label>
              {/* @ts-ignore */}
              <Select value={form.property} onValueChange={onPropertyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[320px]">
                  {properties.length
                    ? properties.map((p) => {
                        const vacant = p.units.filter((u) => u.status === "VACANT").length;
                        return (
                          <SelectItem key={p.id} value={p.id} className="py-2">
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.units.length} units • {vacant} vacant
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    : ["ADI", "BNB", "DREAM", "ECO", "GREEN", "KALAYAAN", "PLEASANT", "PENTHAUZ", "HOMEY"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              {/* @ts-ignore */}
              <Select value={form.unit} onValueChange={onUnitChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={form.property ? "Select unit" : "Choose property first"} />
                </SelectTrigger>
                <SelectContent className="w-[360px] max-h-64">
                  {unitsForProperty.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No units — choose property</div>
                  ) : (
                    unitsForProperty.map((u) => (
                      <SelectItem key={u.id} value={u.unitNumber} className="py-2">
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono font-medium">{u.unitNumber}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs border ${u.status === "VACANT" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{u.status}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">₱{u.monthlyRate === "—" || u.monthlyRate === null ? "—" : Number(u.monthlyRate).toLocaleString()} / mo</div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.unit && unitsForProperty.find((u) => u.unitNumber === form.unit) && (
                <p className="text-xs text-muted-foreground">
                  Rent for {form.unit}: ₱{Number(unitsForProperty.find((u) => u.unitNumber === form.unit)?.monthlyRate || 0).toLocaleString()} / mo — auto-filled
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Month *</Label>
              <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Receipt (photo/PDF)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0] || null })} />
              {form.receipt && <p className="text-xs text-muted-foreground">{form.receipt.name} • {(form.receipt.size / 1024).toFixed(0)} KB</p>}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit — pending approval"}
              </Button>
            </div>
            {error && <p className="md:col-span-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {success && <p className="md:col-span-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</p>}
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value as never)} className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="ALL">All ({receipts.length})</option>
          <option value="PENDING">Pending ({receipts.filter((r) => r.status === "PENDING").length})</option>
          <option value="APPROVED">Approved ({receipts.filter((r) => r.status === "APPROVED").length})</option>
          <option value="REJECTED">Rejected ({receipts.filter((r) => r.status === "REJECTED").length})</option>
        </select>
        {canReview && pending > 0 && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{pending} pending approval</Badge>}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No receipts. Submit above to start approval flow.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id} className={r.status === "PENDING" ? "border-yellow-200" : r.status === "APPROVED" ? "border-green-200" : "border-red-200"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">
                    {r.tenantName} — {r.property} {r.unit}
                  </span>
                  <Badge variant="outline" className={r.status === "PENDING" ? "bg-yellow-50 text-yellow-700 border-yellow-300" : r.status === "APPROVED" ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}>
                    {r.status === "PENDING" ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> PENDING
                      </span>
                    ) : r.status === "APPROVED" ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> APPROVED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <X className="h-3 w-3" /> REJECTED
                      </span>
                    )}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {r.month} • ₱{Number(r.amount).toLocaleString()} • by {r.submittedByName || r.submittedByEmail || "—"} • {new Date(r.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.receiptUrl && (
                  <div className="rounded-lg border bg-muted/20 p-2">
                    <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                      <FileText className="h-4 w-4" /> {r.receiptName || "View receipt"}
                    </a>
                    {r.receiptUrl.startsWith("data:image") && <img src={r.receiptUrl} alt="receipt" className="mt-2 max-h-48 w-full rounded object-contain" />}
                  </div>
                )}
                {r.reviewNote && <p className="text-xs text-muted-foreground">Review note: {r.reviewNote}</p>}
                {r.reviewedByName && <p className="text-xs text-muted-foreground">Reviewed by {r.reviewedByName}</p>}

                {canReview && r.status === "PENDING" && (
                  <div className="space-y-2">
                    <Input placeholder="Review note (optional)" value={reviewNote[r.id] || ""} onChange={(e) => setReviewNote({ ...reviewNote, [r.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => review(r.id, "APPROVED")}>
                        <Check className="mr-1 h-4 w-4" /> Approve — mark PAID
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={() => review(r.id, "REJECTED")}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Approving syncs to Payment Monitoring — will remove red unpaid for that month.</p>
                  </div>
                )}
                {!canReview && r.status === "PENDING" && <p className="text-xs text-muted-foreground">Awaiting manager/admin approval to count as PAID.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
