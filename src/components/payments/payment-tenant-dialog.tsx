"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, CreditCard, Calendar, User, Phone, Mail } from "lucide-react";

type Payment = { month: string; rent: number | null; raw: string | null; unpaid: boolean };
type Tenant = {
  unit: string;
  name: string;
  rate: unknown;
  contract: string;
  payments: Payment[];
  hasReservation?: boolean;
  closeToRenewal?: boolean;
  willNotRenew?: boolean;
  property?: string;
};

export default function PaymentTenantDialog({
  open,
  onOpenChange,
  tenant,
  property,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant: (Tenant & { property?: string }) | null;
  property?: string;
}) {
  if (!tenant) return null;
  const prop = tenant.property || property || "—";
  const unpaid = tenant.payments.filter((p) => p.unpaid);
  const paid = tenant.payments.filter((p) => !p.unpaid && p.rent !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 break-words pr-6">
              <User className="h-5 w-5 shrink-0" />
              <span className="break-words">{tenant.name}</span>
              <Badge variant="outline" className="shrink-0 break-all">
                {tenant.unit || "—"}
              </Badge>
              {tenant.hasReservation && <Badge className="bg-green-100 text-green-700 border-green-300 shrink-0">Reservation</Badge>}
              {tenant.closeToRenewal && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 shrink-0">Close to renewal</Badge>}
              {tenant.willNotRenew && <Badge className="bg-blue-100 text-blue-700 border-blue-300 shrink-0">Will not renew</Badge>}
            </DialogTitle>
            <DialogDescription className="break-words">
              {prop} — {tenant.unit} • {tenant.contract || "—"} • ₱{tenant.rate ? Number(tenant.rate).toLocaleString() : "—"} / mo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4" /> Tenant & Unit
            </h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Name:</span> {tenant.name}
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Property:</span> {prop}
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Unit:</span> <span className="font-mono break-all">{tenant.unit || "—"}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Contract:</span> <Badge variant="outline" className="ml-1">{tenant.contract || "—"}</Badge>
              </div>
              <div className="min-w-0 whitespace-nowrap">
                <span className="text-muted-foreground">Rate:</span> {tenant.rate ? `₱${Number(tenant.rate).toLocaleString()}` : "—"}
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Status:</span>
                {tenant.hasReservation && <span className="ml-1 break-words text-green-700">Reservation •</span>}
                {tenant.closeToRenewal && <span className="ml-1 break-words text-yellow-700">Renewal •</span>}
                {tenant.willNotRenew && <span className="ml-1 break-words text-blue-700">Not renewing •</span>}
                {!tenant.hasReservation && !tenant.closeToRenewal && !tenant.willNotRenew && <span className="ml-1">Active</span>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4" /> Payments (red = unpaid)
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {tenant.payments.map((p, i) => (
                <div
                  key={i}
                  className={`min-w-0 rounded-lg border p-2 text-center ${p.unpaid ? "bg-red-100 border-red-300 text-red-700" : p.rent ? "bg-green-50 border-green-200 text-green-700" : "bg-muted text-muted-foreground"}`}
                >
                  <div className="text-xs font-medium">{p.month}</div>
                  <div className="text-sm font-bold whitespace-nowrap">{p.rent ? `₱${Number(p.rent).toLocaleString()}` : "—"}</div>
                  <div className="text-xs">{p.unpaid ? "UNPAID" : p.rent ? "Paid" : "Pending"}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 break-words text-xs">
              <span className="break-words text-muted-foreground">
                {unpaid.length} unpaid • {paid.length} paid • {tenant.payments.length} months
              </span>
              {unpaid.length > 0 && <span className="break-words text-red-600">Unpaid: {unpaid.map((p) => p.month).join(", ")}</span>}
            </div>
          </div>

          <p className="break-words text-xs text-muted-foreground">
            Data from <code>IT MONITORING 2026.xlsx</code> — red fill #FBD4B4/#FF0000 = unpaid, green #92D050 = reservation, yellow #FFFF00 = close to renewal, blue #00B0F0 = will not renew. Cross-check <code>ALL PROPERTIES.xlsx</code> for due dates.
          </p>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
