"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import TenantDetailDialog from "@/components/tenants/tenant-detail-dialog";

type Unit = {
  id: string;
  unitNumber: string;
  status: string;
  monthlyRate: unknown;
  tenant?: string;
  end?: string | null;
  lease?: {
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
};

type Prop = {
  id: string;
  name: string;
  address: string | null;
  units: Unit[];
};

export default function PropertiesClient({ props }: { props: Prop[] }) {
  const [selected, setSelected] = useState<Unit["lease"] | null>(null);
  const [open, setOpen] = useState(false);

  function onUnitClick(u: Unit) {
    if (u.status !== "OCCUPIED" || !u.lease) return;
    setSelected(u.lease);
    setOpen(true);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {props.map((p) => {
          const vacant = p.units.filter((u) => u.status === "VACANT").length;
          const occupied = p.units.filter((u) => u.status === "OCCUPIED").length;
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {p.name}
                </CardTitle>
                <CardDescription>{p.address || "No address"} — {p.units.length} units</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {vacant} vacant
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {occupied} occupied
                  </Badge>
                  <Badge variant="secondary">{p.units.length} total</Badge>
                </div>
                <div className="divide-y rounded-lg border">
                  {p.units.map((u) => {
                    const isOccupied = u.status === "OCCUPIED";
                    const clickable = isOccupied && !!u.lease;
                    return (
                      <button
                        key={u.id}
                        onClick={() => onUnitClick(u)}
                        disabled={!clickable}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          clickable ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-medium">{u.unitNumber}</div>
                          {isOccupied && u.tenant && <div className="truncate text-xs text-muted-foreground">{u.tenant}</div>}
                          {!isOccupied && <div className="text-xs text-muted-foreground">Click to add tenant via Intake</div>}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className={isOccupied ? "font-medium whitespace-nowrap" : "text-muted-foreground whitespace-nowrap"}>
                            {u.monthlyRate === "—" || u.monthlyRate === null ? "—" : `₱${Number(u.monthlyRate).toLocaleString()}`}
                            {isOccupied && <span className="text-xs text-muted-foreground"> / mo</span>}
                          </div>
                          {isOccupied && u.end && <div className="text-xs text-muted-foreground whitespace-nowrap">until {new Date(u.end).toLocaleDateString()}</div>}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            u.status === "VACANT"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : u.status === "OCCUPIED"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-muted"
                          }
                        >
                          {u.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isNaN(Number(p.address?.match(/(\d+) contracts/)?.[1] || "")) ? "" : "Click an occupied unit to view tenant, lease agreement, and property details."}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TenantDetailDialog open={open} onOpenChange={setOpen} lease={selected as never} />
    </>
  );
}
