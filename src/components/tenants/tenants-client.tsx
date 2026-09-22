"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import TenantDetailDialog from "./tenant-detail-dialog";

type LeaseRow = {
  id?: string;
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

export default function TenantsClient({ leases }: { leases: LeaseRow[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LeaseRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = leases.filter((l) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(q) ||
      l.unit.toLowerCase().includes(q) ||
      l.property.toLowerCase().includes(q) ||
      l.controlNumber.toLowerCase().includes(q) ||
      l.mobile.toLowerCase().includes(q)
    );
  });

  function onRowClick(l: LeaseRow) {
    setSelected(l);
    setOpen(true);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenant, unit, control #..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} / {leases.length} shown — click row for details</span>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.controlNumber + l.unit} className="cursor-pointer hover:bg-muted/50" onClick={() => onRowClick(l)}>
                  <TableCell>
                    <div className="font-medium">{l.fullName || `${l.firstName} ${l.lastName}`}</div>
                    <div className="text-xs text-muted-foreground font-mono">{l.controlNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{l.mobile || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[16ch]">{l.email || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono">{l.property} — {l.unit}</div>
                    <div className="text-xs text-muted-foreground">{l.sourceFile.split(" ")[0]}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.terms || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.rentalStart ? new Date(l.rentalStart).toLocaleDateString() : "—"} → {l.rentalEnd ? new Date(l.rentalEnd).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm">₱{l.rate ? Number(l.rate).toLocaleString() : l.totalAmount ? Number(l.totalAmount).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={l.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-muted"}>
                      {l.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TenantDetailDialog open={open} onOpenChange={setOpen} lease={selected} />
    </>
  );
}
