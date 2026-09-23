"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentTenantDialog from "./payment-tenant-dialog";

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
};
type Sheets = Record<string, Tenant[]>;

export default function PaymentsClient({ sheets }: { sheets: Sheets }) {
  const [selected, setSelected] = useState<(Tenant & { property: string }) | null>(null);
  const [open, setOpen] = useState(false);

  function onTenantClick(t: Tenant, property: string) {
    setSelected({ ...t, property });
    setOpen(true);
  }

  const allProps = Object.keys(sheets);
  let totalTenants = 0;
  let totalPayments = 0;
  let unpaidCount = 0;
  let unpaidAmount = 0;
  let totalDue = 0;
  let reservationCount = 0;
  let renewalCount = 0;
  let notRenewCount = 0;

  for (const tenants of Object.values(sheets)) {
    totalTenants += tenants.length;
    for (const t of tenants) {
      if ((t as Tenant).hasReservation) reservationCount++;
      if ((t as Tenant).closeToRenewal) renewalCount++;
      if ((t as Tenant).willNotRenew) notRenewCount++;
      for (const p of t.payments) {
        totalPayments++;
        if (p.rent) totalDue += p.rent;
        if (p.unpaid) {
          unpaidCount++;
          if (p.rent) unpaidAmount += p.rent;
        }
      }
    }
  }
  const paidAmount = totalDue - unpaidAmount;
  const collectionRate = totalDue ? Math.round((paidAmount / totalDue) * 100) : 0;

  const allTenants = Object.entries(sheets).flatMap(([prop, tenants]) =>
    tenants.map((t) => ({ ...t, property: prop, unpaid: t.payments.filter((p) => p.unpaid).length }))
  );
  const worst = [...allTenants].sort((a, b) => b.unpaid - a.unpaid).slice(0, 5).filter((t) => t.unpaid > 0);
  const renewalList = Object.entries(sheets)
    .flatMap(([prop, tenants]) => tenants.filter((t) => (t as Tenant).closeToRenewal).map((t) => ({ ...t, property: prop })))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Monitoring</h1>
        <p className="text-sm text-muted-foreground">Live from IT MONITORING 2026.xlsx — click any tenant to see full payment info.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-red-100 text-red-700 border-red-300">Red = unpaid</Badge>
          <Badge className="bg-green-100 text-green-700 border-green-300">Green = reservation fee before moveout</Badge>
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Yellow = close to renewal</Badge>
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">Blue = will not renew</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tenants</CardDescription>
            <CardTitle className="text-2xl">{totalTenants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{allProps.join(" • ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid (red)</CardDescription>
            <CardTitle className="text-2xl text-red-600">{unpaidCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totalPayments} payments • {(unpaidCount / totalPayments * 100).toFixed(1)}% red</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid Amount</CardDescription>
            <CardTitle className="text-2xl text-red-600 whitespace-nowrap">₱{unpaidAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground whitespace-nowrap">of ₱{totalDue.toLocaleString()} due</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collection Rate</CardDescription>
            <CardTitle className="text-2xl">{collectionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground whitespace-nowrap">₱{paidAmount.toLocaleString()} collected</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-700">Reservation (green)</CardDescription>
            <CardTitle className="text-2xl text-green-700">{reservationCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-700">Sent reservation fee before moveout</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-700">Close to renewal (yellow)</CardDescription>
            <CardTitle className="text-2xl text-yellow-700">{renewalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-yellow-700">Yellow boxes in Excel</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700">Will not renew (blue)</CardDescription>
            <CardTitle className="text-2xl text-blue-700">{notRenewCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-700">Blue boxes in Excel</p>
          </CardContent>
        </Card>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-green-600 transition-all" style={{ width: `${collectionRate}%` }} />
      </div>

      {worst.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm text-red-800">Most delinquent (red boxes) — click to view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {worst.map((t) => (
              <button
                key={t.property + t.unit + t.name}
                onClick={() => onTenantClick(t, t.property)}
                className="flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-red-100"
              >
                <span className="font-medium">
                  {t.name} — {t.property} {t.unit} — {t.unpaid} unpaid
                </span>
                <span className="text-muted-foreground">{t.contract}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {renewalList.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">Close to renewal (yellow) — click to view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renewalList.map((t) => (
              <button
                key={t.property + t.unit + t.name}
                onClick={() => onTenantClick(t, t.property)}
                className="flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-yellow-100"
              >
                <span className="font-medium">
                  {t.name} — {t.property} {t.unit}
                </span>
                <span className="text-muted-foreground">{t.contract} • {t.rate ? `₱${Number(t.rate).toLocaleString()}` : "—"}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {Object.entries(sheets).map(([prop, tenants]) => {
        if (tenants.length === 0) return null;
        const months = tenants[0]?.payments.map((p) => p.month) || [];
        const propUnpaid = tenants.flatMap((t) => t.payments).filter((p) => p.unpaid).length;
        const propRes = tenants.filter((t) => (t as Tenant).hasReservation).length;
        const propRenew = tenants.filter((t) => (t as Tenant).closeToRenewal).length;
        const propNotRenew = tenants.filter((t) => (t as Tenant).willNotRenew).length;
        return (
          <Card key={prop}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{prop}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {tenants.length} tenants • {propUnpaid} red • {propRes} green • {propRenew} yellow • {propNotRenew} blue
                </span>
              </CardTitle>
              <CardDescription>Red unpaid • Green reservation • Yellow close to renewal • Blue will not renew • Months: {months.join(" • ")} • Click tenant for details</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="min-w-[900px]">
                <div className="grid gap-1">
                  <div className="grid grid-cols-[100px_1fr_70px_70px_repeat(6,90px)] gap-1 border-b pb-2 text-xs font-semibold text-muted-foreground">
                    <div>Unit</div>
                    <div>Name</div>
                    <div>Rate</div>
                    <div>Status</div>
                    {months.map((m) => (
                      <div key={m} className="text-center">
                        {m}
                      </div>
                    ))}
                  </div>
                  {tenants.map((t, i) => (
                    <button
                      key={t.unit + t.name + i}
                      onClick={() => onTenantClick(t, prop)}
                      className="grid w-full grid-cols-[100px_1fr_70px_70px_repeat(6,90px)] gap-1 border-b py-1.5 text-left text-sm last:border-0 hover:bg-muted/50"
                    >
                      <div className="font-mono text-xs">{(t as Tenant).unit || "—"}</div>
                      <div className="truncate text-xs" title={t.name}>
                        {t.name}
                      </div>
                      <div className="text-xs whitespace-nowrap">₱{t.rate ? Number(t.rate).toLocaleString() : "—"}</div>
                      <div className="flex gap-1">
                        {(t as Tenant).hasReservation && <Badge className="bg-green-100 text-green-700 border-green-300 h-5 px-1 text-xs">G</Badge>}
                        {(t as Tenant).closeToRenewal && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 h-5 px-1 text-xs">Y</Badge>}
                        {(t as Tenant).willNotRenew && <Badge className="bg-blue-100 text-blue-700 border-blue-300 h-5 px-1 text-xs">B</Badge>}
                      </div>
                      {t.payments.map((p, idx) => (
                        <div
                          key={idx}
                          className={`rounded px-1 py-1 text-center text-xs whitespace-nowrap ${p.unpaid ? "bg-red-100 text-red-700 border border-red-300 font-medium" : p.rent ? "bg-green-50 text-green-700 border border-green-200" : "bg-muted text-muted-foreground"}`}
                        >
                          {p.rent ? `₱${Number(p.rent).toLocaleString()}` : p.unpaid ? "unpaid" : "—"}
                        </div>
                      ))}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Click any tenant row to see payment details, property/unit, and status. Colors from IT MONITORING 2026.xlsx fills.</p>
            </CardContent>
          </Card>
        );
      })}

      <PaymentTenantDialog open={open} onOpenChange={setOpen} tenant={selected as never} property={selected?.property} />
    </div>
  );
}
