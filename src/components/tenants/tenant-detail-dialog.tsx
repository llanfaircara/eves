"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Droplets, Zap, User, Phone, Mail } from "lucide-react";

type Lease = {
  controlNumber: string;
  documentLink?: string;
  barCode?: string;
  property: string;
  unit: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  age?: string;
  gender?: string;
  mobile: string;
  email: string;
  company?: string;
  address?: string;
  rate: number | null;
  terms: string;
  rentalStart: string | null;
  rentalEnd: string | null;
  totalAmount: number | null;
  status: string;
  waterReading?: string;
  electricReading?: string;
  sourceFile: string;
  raw?: Record<string, string>;
};

export default function TenantDetailDialog({
  open,
  onOpenChange,
  lease,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lease: Lease | null;
}) {
  if (!lease) return null;
  const isOccupied = lease.rentalEnd ? new Date(lease.rentalEnd) >= new Date(new Date().setHours(0, 0, 0, 0)) : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 break-words pr-6">
              <User className="h-5 w-5 shrink-0" />
              <span className="break-words">{lease.fullName || `${lease.firstName} ${lease.lastName}`}</span>
              <Badge variant="outline" className={isOccupied ? "bg-blue-50 text-blue-700 shrink-0" : "bg-green-50 text-green-700 shrink-0"}>
                {isOccupied ? "OCCUPIED" : "VACANT"}
              </Badge>
            </DialogTitle>
            <DialogDescription className="break-words">
              {lease.property} — {lease.unit} • {lease.terms || "—"} • ₱{lease.rate ? Number(lease.rate).toLocaleString() : "—"} / mo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
          {/* Lease Agreement */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Lease Agreement
            </h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Control #:</span> <span className="font-mono font-medium break-all">{lease.controlNumber}</span>
              </div>
              {lease.barCode && (
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground">Bar Code:</span> <span className="break-all">{lease.barCode}</span>
                </div>
              )}
              <div className="min-w-0">
                <span className="text-muted-foreground">Property:</span> <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3 shrink-0" /> {lease.property}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Unit:</span> <span className="font-mono break-words">{lease.unit}</span>
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Terms:</span> {lease.terms || "—"}
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Rate:</span> {lease.rate ? `₱${Number(lease.rate).toLocaleString()}` : "—"}
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Total:</span> {lease.totalAmount ? `₱${Number(lease.totalAmount).toLocaleString()}` : "—"}
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Period:</span> {lease.rentalStart || "—"} → {lease.rentalEnd || "—"}
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="ml-1">{lease.status}</Badge>
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Source:</span> <span className="text-xs break-all">{lease.sourceFile}</span>
              </div>
            </div>
            {lease.documentLink && (
              <a
                href={lease.documentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" /> Open Lease Document
              </a>
            )}
          </div>

          {/* Tenant */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> Tenant Information
            </h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">Name:</span> {lease.fullName}
              </div>
              <div className="min-w-0 break-words">
                <span className="text-muted-foreground">First / Last:</span> {lease.firstName} {lease.middleName} {lease.lastName}
              </div>
              {lease.age && (
                <div className="min-w-0">
                  <span className="text-muted-foreground">Age / Gender:</span> {lease.age} {lease.gender}
                </div>
              )}
              <div className="flex min-w-0 items-center gap-1 break-words">
                <Phone className="h-3 w-3 shrink-0 text-muted-foreground" /> <span className="break-all">{lease.mobile || "—"}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1 break-words">
                <Mail className="h-3 w-3 shrink-0 text-muted-foreground" /> <span className="break-all">{lease.email || "—"}</span>
              </div>
              {lease.company && (
                <div className="min-w-0 break-words">
                  <span className="text-muted-foreground">Company:</span> {lease.company}
                </div>
              )}
              {lease.address && (
                <div className="md:col-span-2 min-w-0 break-words">
                  <span className="text-muted-foreground">Address:</span> {lease.address}
                </div>
              )}
            </div>
          </div>

          {/* Utilities */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Droplets className="h-4 w-4" /> Utilities & Checklist
            </h4>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="flex min-w-0 items-center gap-1 break-words">
                <Droplets className="h-3 w-3 shrink-0" /> <span>Water: {lease.waterReading || "—"}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1 break-words">
                <Zap className="h-3 w-3 shrink-0" /> <span>Electric: {lease.electricReading || "—"}</span>
              </div>
            </div>
            {lease.raw && Object.keys(lease.raw).length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">View full checklist (raw Excel)</summary>
                <div className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                  <div className="space-y-1">
                    {Object.entries(lease.raw).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b py-1.5 last:border-0">
                        <span className="break-words font-medium text-muted-foreground">{k}:</span>{" "}
                        <span className="break-words">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
