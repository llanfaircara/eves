"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, FileText, Building2, User, Phone, Mail, Droplets, Zap } from "lucide-react";

type SyncedPair = {
  mon: {
    unit: string;
    name: string;
    rate: unknown;
    contract: string;
    property: string;
    payments: { month: string; rent: number | null; raw: string | null; unpaid: boolean }[];
    hasReservation?: boolean;
    closeToRenewal?: boolean;
    willNotRenew?: boolean;
  };
  legacy: {
    controlNumber: string;
    documentLink?: string;
    barCode?: string;
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
    property: string;
    unit: string;
  };
};

export default function SyncedTenantsClient({ pairs }: { pairs: SyncedPair[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SyncedPair | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = pairs.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.mon.name.toLowerCase().includes(q) ||
      p.legacy.fullName.toLowerCase().includes(q) ||
      p.mon.unit.toLowerCase().includes(q) ||
      p.legacy.controlNumber.toLowerCase().includes(q) ||
      p.mon.property.toLowerCase().includes(q)
    );
  });

  function onClick(pair: SyncedPair) {
    setSelected(pair);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search synced tenant, unit, control #..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} / {pairs.length} synced — click row for all info from both files</span>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[110px_1fr_90px_110px_90px_80px] gap-2 border-b pb-2 text-xs font-semibold text-muted-foreground">
              <div>Property • Unit</div>
              <div>Name (Monitoring ↔ Responses)</div>
              <div>Rate</div>
              <div>Period</div>
              <div>Contact</div>
              <div>Agreement</div>
            </div>
            {filtered.slice(0, 100).map((pair, i) => (
              <button
                key={pair.legacy.controlNumber + i}
                onClick={() => onClick(pair)}
                className="grid w-full grid-cols-[110px_1fr_90px_110px_90px_80px] gap-2 border-b py-2 text-left text-sm last:border-0 hover:bg-muted/50"
              >
                <div className="font-mono text-xs">
                  {pair.mon.property} — {pair.mon.unit}
                  <div className="text-xs text-muted-foreground">{pair.legacy.property} — {pair.legacy.unit}</div>
                </div>
                <div>
                  <div className="truncate font-medium">{pair.mon.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{pair.legacy.fullName} • {pair.legacy.controlNumber}</div>
                </div>
                <div className="text-xs whitespace-nowrap">₱{pair.mon.rate ? Number(pair.mon.rate).toLocaleString() : pair.legacy.rate ? Number(pair.legacy.rate).toLocaleString() : "—"}</div>
                <div className="text-xs">
                  {pair.legacy.rentalStart ? new Date(pair.legacy.rentalStart).toLocaleDateString() : "—"} → {pair.legacy.rentalEnd ? new Date(pair.legacy.rentalEnd).toLocaleDateString() : "—"}
                </div>
                <div className="text-xs truncate">{pair.legacy.mobile || pair.mon.name}</div>
                <div className="text-xs truncate">{pair.legacy.documentLink ? "Doc ✓" : "—"}</div>
              </button>
            ))}
          </div>
          {filtered.length > 100 && <p className="mt-2 text-xs text-muted-foreground">Showing 100 of {filtered.length} — use search to narrow</p>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <div className="overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 break-words pr-6">
                <User className="h-5 w-5" />
                {selected?.mon.name || selected?.legacy.fullName}
                <Badge variant="outline">{selected?.mon.property} — {selected?.mon.unit}</Badge>
                {selected?.mon.hasReservation && <Badge className="bg-green-100 text-green-700 border-green-300">Reservation</Badge>}
                {selected?.mon.closeToRenewal && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Renewal</Badge>}
                {selected?.mon.willNotRenew && <Badge className="bg-blue-100 text-blue-700 border-blue-300">Will not renew</Badge>}
              </DialogTitle>
              <DialogDescription className="break-words">
                Synced — Monitoring ↔ Responses • Clicked tenant shows all info from both files
              </DialogDescription>
            </DialogHeader>

            {selected && (
              <div className="space-y-4 pt-4">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4" /> Monitoring (IT MONITORING 2026.xlsx)
                  </h4>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">Property • Unit:</span> {selected.mon.property} — {selected.mon.unit}
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Rate:</span> {selected.mon.rate ? `₱${Number(selected.mon.rate).toLocaleString()}` : "—"} • <span className="text-muted-foreground">Contract:</span> {selected.mon.contract || "—"}
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Payments (6 months):</span>
                      <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
                        {selected.mon.payments.map((p, i) => (
                          <div key={i} className={`rounded border p-2 text-center text-xs ${p.unpaid ? "bg-red-100 border-red-300 text-red-700" : p.rent ? "bg-green-50 border-green-200 text-green-700" : "bg-muted"}`}>
                            <div className="font-medium">{p.month}</div>
                            <div className="whitespace-nowrap font-bold">{p.rent ? `₱${Number(p.rent).toLocaleString()}` : "—"}</div>
                            <div>{p.unpaid ? "UNPAID" : p.rent ? "Paid" : "Pending"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" /> Responses (Lease Agreement)
                  </h4>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">Control #:</span> <span className="font-mono break-all">{selected.legacy.controlNumber}</span>
                    </div>
                    {selected.legacy.barCode && (
                      <div className="min-w-0 break-words">
                        <span className="text-muted-foreground">Bar Code:</span> {selected.legacy.barCode}
                      </div>
                    )}
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">Property • Unit:</span> {selected.legacy.property} — {selected.legacy.unit}
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Terms:</span> {selected.legacy.terms || "—"} • <span className="text-muted-foreground">Rate:</span> {selected.legacy.rate ? `₱${Number(selected.legacy.rate).toLocaleString()}` : "—"}
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">Period:</span> {selected.legacy.rentalStart || "—"} → {selected.legacy.rentalEnd || "—"}
                    </div>
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">Source:</span> <span className="text-xs break-all">{selected.legacy.sourceFile}</span>
                    </div>
                  </div>
                  {selected.legacy.documentLink && (
                    <a href={selected.legacy.documentLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                      <FileText className="h-4 w-4" /> Open Lease Document
                    </a>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4" /> Tenant Full Profile (from Responses)
                  </h4>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">Name:</span> {selected.legacy.fullName}
                    </div>
                    <div className="min-w-0 break-words">
                      <span className="text-muted-foreground">First / Middle / Last:</span> {selected.legacy.firstName} {selected.legacy.middleName} {selected.legacy.lastName}
                    </div>
                    {(selected.legacy as unknown as { age?: string }).age && (
                      <div>
                        <span className="text-muted-foreground">Age / Gender:</span> {(selected.legacy as unknown as { age?: string }).age} {(selected.legacy as unknown as { gender?: string }).gender}
                      </div>
                    )}
                    <div className="flex items-center gap-1 break-words">
                      <Phone className="h-3 w-3 shrink-0" /> {selected.legacy.mobile || "—"}
                    </div>
                    <div className="flex items-center gap-1 break-words">
                      <Mail className="h-3 w-3 shrink-0" /> <span className="break-all">{selected.legacy.email || "—"}</span>
                    </div>
                    {selected.legacy.company && (
                      <div className="min-w-0 break-words">
                        <span className="text-muted-foreground">Company:</span> {selected.legacy.company}
                      </div>
                    )}
                    {(selected.legacy as unknown as { address?: string }).address && (
                      <div className="md:col-span-2 min-w-0 break-words">
                        <span className="text-muted-foreground">Address:</span> {(selected.legacy as unknown as { address?: string }).address}
                      </div>
                    )}
                    {selected.legacy.waterReading && (
                      <div className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" /> Water: {selected.legacy.waterReading}
                      </div>
                    )}
                    {selected.legacy.electricReading && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Electric: {selected.legacy.electricReading}
                      </div>
                    )}
                  </div>
                  {selected.legacy.raw && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium">View all raw Excel fields</summary>
                      <div className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                        {Object.entries(selected.legacy.raw).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b py-1.5 last:border-0">
                            <span className="break-words font-medium text-muted-foreground">{k}:</span> <span className="break-words">{v}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
