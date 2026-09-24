import legacy from "./eves-legacy-data.json";
import monitoring from "./monitoring-data.json";

// ── Type-safe entities ──────────────────────────────────────────────
export interface RevenueMetric {
  month: string; // YYYY-MM
  label: string; // e.g. "Apr 26"
  collected: number;
  invoiced: number;
}

export interface ActivityItem {
  id: string;
  type: "audit" | "task" | "payment" | "lease" | "intake";
  title: string;
  detail?: string;
  actor?: string;
  timestamp: string; // ISO
}

export type ForecastConfidence = "Confirmed" | "Estimated";
export type OccupancyStatus = "Vacant" | "Occupied";

export interface ForecastUnit {
  id: string;
  unitId: string;
  property: string;
  earliestAvailable: string; // YYYY-MM-DD
  confidence: ForecastConfidence;
  occupancy: OccupancyStatus;
  monthlyRate: number | null;
  tenantName?: string;
  leaseEnd?: string | null;
}

export type ReservationIntent = "New Lease" | "Renewal" | "Transfer" | "Hold";
export type ReservationTerm = "Trial" | "Month-to-Month" | "6 Months" | "1 Year";
export type LeaseDraftStatus = "Draft" | "Pending Review" | "Ready";

export interface ReservationAddon {
  label: string;
  amount: number;
}

export interface ReservationPayload {
  unitId: string;
  property: string;
  intent: ReservationIntent;
  term: ReservationTerm;
  leaseStart: string;
  leaseEnd: string;
  moveInDate: string;
  rentDueDate: string;
  monthlyRent: number;
  firstDeposit: number;
  firstDepositDue: string;
  secondDeposit: number;
  secondDepositDue: string;
  addons: ReservationAddon[];
  noticePeriodDays: number;
  leaseStatus: LeaseDraftStatus;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  property: string;
  unit: string;
  tag: "Lease ends" | "Vacant" | "Renewal due" | "Move-in";
  tenantName?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────
type MonTenant = {
  unit: string;
  name: string;
  rate: unknown;
  contract: string;
  payments: { month: string; rent: number | null; unpaid: boolean }[];
};

type LegacyLease = {
  property: string;
  unit: string;
  fullName: string;
  rate: number | null;
  rentalEnd: string | null;
  rentalStart: string | null;
  controlNumber: string;
};

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function normProp(s: string): string {
  const lower = s.toLowerCase().trim();
  if (lower === "b&b" || lower.includes("b&b")) return "BNB";
  if (lower === "bnb" || lower === "bb") return "BNB";
  return s.replace(/888|168/g, "").trim().toUpperCase();
}

// ── Revenue: collected vs invoiced, rolling 6 months ────────────────
// Collected = sum(rent where present and not unpaid).
// Invoiced = collected + expected for unpaid/empty cells (rate fallback).
export function getRevenueSeries(): RevenueMetric[] {
  const sheets = (monitoring as { sheets: Record<string, MonTenant[]> }).sheets;
  const byMonth = new Map<string, { collected: number; invoiced: number }>();

  for (const tenants of Object.values(sheets)) {
    for (const t of tenants) {
      const rate = toNumber(t.rate) ?? 0;
      for (const p of t.payments) {
        if (!byMonth.has(p.month)) byMonth.set(p.month, { collected: 0, invoiced: 0 });
        const bucket = byMonth.get(p.month)!;
        if (p.rent !== null && !p.unpaid) {
          bucket.collected += p.rent;
          bucket.invoiced += p.rent;
        } else if (p.unpaid) {
          bucket.invoiced += p.rent ?? rate;
        } else if (p.rent === null && rate > 0) {
          // Pending cell: count toward invoiced at rate so collected<invoiced gap is visible
          bucket.invoiced += rate;
        }
      }
    }
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([month, v]) => ({
      month,
      label: monthLabel(month),
      collected: Math.round(v.collected),
      invoiced: Math.round(v.invoiced),
    }));
}

export interface PaymentSheetTenant {
  rate: unknown;
  payments: { month: string; rent: number | null; unpaid: boolean }[];
}

export interface PaymentSummary {
  count: number;
  amount: number;
  totalPayments: number;
  nullRentCount: number;
  rateFallbackSum: number;
}

// Single source of truth for "unpaid" across Payments + Executive.
// Definition: every red (unpaid) cell counts; where the cell has no typed
// amount, fall back to the tenant's monthly rate as the estimated invoice.
export function summarizePayments(sheets: Record<string, PaymentSheetTenant[]>): PaymentSummary {
  let count = 0;
  let amount = 0;
  let totalPayments = 0;
  let nullRentCount = 0;
  let rateFallbackSum = 0;
  for (const tenants of Object.values(sheets)) {
    for (const t of tenants) {
      const rate = toNumber(t.rate) ?? 0;
      for (const p of t.payments) {
        totalPayments += 1;
        if (p.unpaid) {
          count += 1;
          if (p.rent !== null) {
            amount += p.rent;
          } else {
            nullRentCount += 1;
            rateFallbackSum += rate;
            amount += rate;
          }
        }
      }
    }
  }
  return {
    count,
    amount: Math.round(amount),
    totalPayments,
    nullRentCount,
    rateFallbackSum: Math.round(rateFallbackSum),
  };
}

export function getOverdueInvoices(): { count: number; amount: number; nullRentCount: number; rateFallbackSum: number } {
  const sheets = (monitoring as { sheets: Record<string, MonTenant[]> }).sheets;
  const s = summarizePayments(sheets);
  return { count: s.count, amount: s.amount, nullRentCount: s.nullRentCount, rateFallbackSum: s.rateFallbackSum };
}

export function getExpiringLeases(withinDays = 60): (LegacyLease & { daysLeft: number })[] {
  const leases = ((legacy as unknown as { leases: LegacyLease[] }).leases ?? []) as LegacyLease[];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: (LegacyLease & { daysLeft: number })[] = [];
  for (const l of leases) {
    if (!l.rentalEnd) continue;
    const end = new Date(l.rentalEnd);
    if (Number.isNaN(end.getTime())) continue;
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= withinDays) out.push({ ...l, daysLeft });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ── Activity feed: deterministic mock stitched from real data ───────
// Matches project data-fetch pattern: server builds from legacy JSON,
// client renders. Timestamps are relative to now so feed stays fresh.
export function getActivityFeed(limit = 12): ActivityItem[] {
  const leases = ((legacy as unknown as { leases: LegacyLease[] }).leases ?? []).slice(0, 40);
  const now = Date.now();
  const items: ActivityItem[] = [];
  const kinds: ActivityItem["type"][] = ["lease", "payment", "task", "intake", "audit"];

  leases.slice(0, limit).forEach((l, i) => {
    const type = kinds[i % kinds.length];
    const ts = new Date(now - (i + 1) * 47 * 60 * 1000).toISOString();
    switch (type) {
      case "lease":
        items.push({
          id: `act-lease-${l.controlNumber}`,
          type,
          title: `Contract updated — ${l.fullName}`,
          detail: `${l.property} ${l.unit} • ends ${l.rentalEnd ?? "—"}`,
          actor: "System",
          timestamp: ts,
        });
        break;
      case "payment":
        items.push({
          id: `act-pay-${l.controlNumber}`,
          type,
          title: `Payment recorded — ${l.property} ${l.unit}`,
          detail: l.rate ? `₱${Number(l.rate).toLocaleString()} • ${l.fullName}` : l.fullName,
          actor: "Cashier",
          timestamp: ts,
        });
        break;
      case "task":
        items.push({
          id: `act-task-${l.controlNumber}`,
          type,
          title: `Job order created — inspect ${l.property} ${l.unit}`,
          detail: `Assigned to field team`,
          actor: "Manager",
          timestamp: ts,
        });
        break;
      case "intake":
        items.push({
          id: `act-intake-${l.controlNumber}`,
          type,
          title: `Tenant intake submitted — ${l.fullName}`,
          detail: `${l.property} ${l.unit}`,
          actor: "Employee",
          timestamp: ts,
        });
        break;
      default:
        items.push({
          id: `act-audit-${l.controlNumber}`,
          type: "audit",
          title: "Audit run completed",
          detail: "Monitoring sync check passed",
          actor: "System",
          timestamp: ts,
        });
    }
  });

  return items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

// ── Forecast: one row per distinct unit ─────────────────────────────
export function getForecastUnits(): ForecastUnit[] {
  const leases = ((legacy as unknown as { leases: LegacyLease[] }).leases ?? []) as LegacyLease[];
  const sheets = (monitoring as { sheets: Record<string, MonTenant[]> }).sheets;

  // Latest lease per property+unit
  const latest = new Map<string, LegacyLease>();
  for (const l of leases) {
    if (!l.unit || l.unit === "UNKNOWN") continue;
    const key = `${normProp(l.property)}|${l.unit.toLowerCase().trim()}`;
    const cur = latest.get(key);
    const curEnd = l.rentalEnd || "";
    const exEnd = cur?.rentalEnd || "";
    if (!cur || curEnd > exEnd) latest.set(key, l);
  }

  // Occupied lookup from monitoring
  const occupied = new Set<string>();
  for (const [sheet, tenants] of Object.entries(sheets)) {
    for (const t of tenants) {
      if (t.unit) occupied.add(`${normProp(sheet)}|${t.unit.toLowerCase().trim()}`);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows: ForecastUnit[] = [];

  for (const [key, l] of latest.entries()) {
    const [propNorm, unitLower] = key.split("|");
    const end = l.rentalEnd ? new Date(l.rentalEnd) : null;
    const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;
    const inMonitoring = occupied.has(key);
    const isOccupied = inMonitoring || (validEnd ? validEnd >= today : true);
    const earliest = validEnd && validEnd >= today ? validEnd : today;
    rows.push({
      id: `${propNorm}-${unitLower}`.replace(/[^a-z0-9-]/g, "-"),
      unitId: l.unit,
      property: normProp(l.property),
      earliestAvailable: earliest.toISOString().slice(0, 10),
      confidence: validEnd ? "Confirmed" : "Estimated",
      occupancy: isOccupied ? "Occupied" : "Vacant",
      monthlyRate: toNumber(l.rate),
      tenantName: l.fullName,
      leaseEnd: l.rentalEnd,
    });
  }

  return rows.sort((a, b) => (a.property === b.property ? a.unitId.localeCompare(b.unitId) : a.property.localeCompare(b.property)));
}

// ── Calendar events: lease ends + vacancies ─────────────────────────
export function getCalendarEvents(): CalendarEvent[] {
  const units = getForecastUnits();
  const events: CalendarEvent[] = [];
  for (const u of units) {
    if (u.leaseEnd) {
      events.push({
        id: `lease-${u.id}`,
        title: `Lease ends — ${u.tenantName ?? u.unitId}`,
        date: u.leaseEnd.slice(0, 10),
        property: u.property,
        unit: u.unitId,
        tag: "Lease ends",
        tenantName: u.tenantName,
      });
    }
    if (u.occupancy === "Vacant") {
      events.push({
        id: `vacant-${u.id}`,
        title: `Vacant — ${u.unitId}`,
        date: u.earliestAvailable,
        property: u.property,
        unit: u.unitId,
        tag: "Vacant",
        tenantName: u.tenantName,
      });
    }
  }
  // Renewal-due = lease ends within 60 days
  const soon = new Set(getExpiringLeases(60).map((l) => `${normProp(l.property)}|${l.unit.toLowerCase().trim()}`));
  for (const u of units) {
    if (soon.has(`${normProp(u.property)}|${u.unitId.toLowerCase().trim()}`)) {
      events.push({
        id: `renewal-${u.id}`,
        title: `Renewal due — ${u.tenantName ?? u.unitId}`,
        date: u.leaseEnd ?? u.earliestAvailable,
        property: u.property,
        unit: u.unitId,
        tag: "Renewal due",
        tenantName: u.tenantName,
      });
    }
  }
  return events;
}

export function getProperties(): string[] {
  const leases = ((legacy as unknown as { leases: LegacyLease[] }).leases ?? []) as LegacyLease[];
  return [...new Set(leases.map((l) => normProp(l.property)))].sort();
}
