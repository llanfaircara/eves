import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "src/lib/demo-tasks.json");

export type DemoTask = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED";
  dueDate: string | null;
  notes: string | null;
  assignedToId: string;
  assignedTo: { id: string; name: string; email: string };
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  propertyId: string | null;
  property: { id: string; name: string } | null;
  unitId: string | null;
  unit: { id: string; unitNumber: string; monthlyRate?: string } | null;
  createdAt: string;
  updatedAt: string;
};

// In-memory fallback for Vercel read-only filesystem
let memTasks: DemoTask[] | null = null;

function ensure() {
  try {
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2));
  } catch {
    // Vercel read-only — use memory
    if (!memTasks) memTasks = [];
  }
}

function seed(): DemoTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-1",
      title: "Inspect water leak — ECO-001",
      description: "Tenant reported leak under kitchen sink. Check piping and replace seal.",
      status: "PENDING",
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      notes: "Priority: high. Bring tools.",
      assignedToId: "fallback-employee",
      assignedTo: { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
      createdById: "fallback-admin-adrian",
      createdBy: { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
      propertyId: "eco",
      property: { id: "eco", name: "ECO" },
      unitId: "eco-001",
      unit: { id: "eco-001", unitNumber: "ECO-001", monthlyRate: "15000" },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "demo-2",
      title: "Collect rent — GREEN portfolio",
      description: "Follow up on overdue GREEN units for May.",
      status: "IN_PROGRESS",
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      notes: null,
      assignedToId: "fallback-employee2",
      assignedTo: { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
      createdById: "fallback-admin-adrian",
      createdBy: { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
      propertyId: "green",
      property: { id: "green", name: "GREEN" },
      unitId: null,
      unit: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function getDemoTasks(): DemoTask[] {
  if (memTasks) return memTasks;
  ensure();
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length === 0) {
      const demo = seed();
      try {
        fs.writeFileSync(FILE, JSON.stringify(demo, null, 2));
      } catch {
        memTasks = demo;
      }
      return demo;
    }
    if (Array.isArray(arr) && arr.length > 0) return arr;
    const demo = seed();
    try {
      fs.writeFileSync(FILE, JSON.stringify(demo, null, 2));
    } catch {
      memTasks = demo;
    }
    return demo;
  } catch {
    if (!memTasks) memTasks = seed();
    return memTasks;
  }
}

function persist(list: DemoTask[]) {
  if (memTasks !== null) {
    memTasks = list;
    return;
  }
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  } catch {
    // Vercel read-only — keep in memory
    memTasks = list;
  }
}

export function addDemoTask(task: DemoTask): DemoTask {
  const list = getDemoTasks();
  list.unshift(task);
  persist(list);
  return task;
}

export function updateDemoTask(id: string, patch: Partial<DemoTask>): DemoTask | null {
  const list = getDemoTasks();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  persist(list);
  return updated;
}

export function deleteDemoTask(id: string): boolean {
  const list = getDemoTasks();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  persist(list);
  return true;
}

export function findDemoTask(id: string): DemoTask | undefined {
  return getDemoTasks().find((t) => t.id === id);
}
