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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {lease.fullName || `${lease.firstName} ${lease.lastName}`}
            <Badge variant="outline" className={isOccupied ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
              {isOccupied ? "OCCUPIED" : "VACANT"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {lease.property} — {lease.unit} • {lease.terms || "—"} • ₱{lease.rate ? Number(lease.rate).toLocaleString() : "—"} / mo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Lease Agreement */}
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Lease Agreement
            </h4>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Control #:</span> <span className="font-mono font-medium">{lease.controlNumber}</span>
              </div>
              {lease.barCode && (
                <div>
                  <span className="text-muted-foreground">Bar Code:</span> {lease.barCode}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Property:</span> <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {lease.property}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unit:</span> <span className="font-mono">{lease.unit}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Terms:</span> {lease.terms || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Rate:</span> {lease.rate ? `₱${Number(lease.rate).toLocaleString()}` : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span> {lease.totalAmount ? `₱${Number(lease.totalAmount).toLocaleString()}` : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Period:</span> {lease.rentalStart || "—"} → {lease.rentalEnd || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span> <Badge variant="outline">{lease.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Source:</span> <span className="truncate text-xs">{lease.sourceFile}</span>
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
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> Tenant Information
            </h4>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Name:</span> {lease.fullName}
              </div>
              <div>
                <span className="text-muted-foreground">First / Last:</span> {lease.firstName} {lease.middleName} {lease.lastName}
              </div>
              {lease.age && (
                <div>
                  <span className="text-muted-foreground">Age / Gender:</span> {lease.age} {lease.gender}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" /> {lease.mobile || "—"}
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" /> {lease.email || "—"}
              </div>
              {lease.company && (
                <div>
                  <span className="text-muted-foreground">Company:</span> {lease.company}
                </div>
              )}
              {lease.address && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Address:</span> {lease.address}
                </div>
              )}
            </div>
          </div>

          {/* Utilities */}
          <div className="rounded-lg border p-3">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Droplets className="h-4 w-4" /> Utilities & Checklist
            </h4>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div className="flex items-center gap-1">
                <Droplets className="h-3 w-3" /> Water: {lease.waterReading || "—"}
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Electric: {lease.electricReading || "—"}
              </div>
            </div>
            {lease.raw && Object.keys(lease.raw).some((k) => k.toLowerCase().includes("switches") || k.toLowerCase().includes("water")) && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">View full checklist (raw Excel)</summary>
                <div className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                  {Object.entries(lease.raw).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 gap-2 border-b py-1 last:border-0">
                      <span className="font-medium">{k}:</span> <span>{v}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
