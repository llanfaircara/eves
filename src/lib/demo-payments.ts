import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "src/lib/demo-payments.json");

export type DemoPayment = {
  id: string;
  tenantName: string;
  property: string;
  unit: string;
  month: string;
  amount: number;
  receiptUrl?: string | null;
  receiptName?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedById?: string | null;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

function ensure() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2));
}
export function getDemoPayments(): DemoPayment[] {
  ensure();
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
export function addDemoPayment(data: Omit<DemoPayment, "id" | "createdAt" | "updatedAt" | "status"> & { status?: DemoPayment["status"] }): DemoPayment {
  ensure();
  const list = getDemoPayments();
  const now = new Date().toISOString();
  const item: DemoPayment = {
    id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantName: data.tenantName,
    property: data.property,
    unit: data.unit,
    month: data.month,
    amount: data.amount,
    receiptUrl: data.receiptUrl || null,
    receiptName: data.receiptName || null,
    status: data.status || "PENDING",
    submittedById: data.submittedById || null,
    submittedByName: data.submittedByName || null,
    submittedByEmail: data.submittedByEmail || null,
    reviewedById: null,
    reviewedByName: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(item);
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  return item;
}
export function updateDemoPayment(id: string, patch: Partial<DemoPayment>): DemoPayment | null {
  ensure();
  const list = getDemoPayments();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  return updated;
}
