import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validators/task";

// GET /api/tasks → MANAGER sees all, EMPLOYEE sees only assigned
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = session.user.role === "MANAGER" || session.user.role === "ADMIN" ? {} : { assignedToId: session.user.id };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true, monthlyRate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { getDemoTasks } = await import("@/lib/demo-tasks");
      const { getDemoUsers } = await import("@/lib/demo-users");
      let tasks = getDemoTasks();
      // Merge fallback hardcoded if file empty
      if (tasks.length === 0) {
        const { getDemoTasks: _ } = await import("@/lib/demo-tasks");
        tasks = getDemoTasks();
      }
      // Filter for employee
      const session = await getServerSession(authOptions);
      if (session?.user && session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
        tasks = tasks.filter((t) => t.assignedToId === session.user.id);
      }
      return NextResponse.json({ tasks, warning: "Demo mode — tasks from file" });
    }
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks → MANAGER only
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Managers only" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, status, dueDate, assignedToId, propertyId, unitId, notes } = parsed.data;

  try {
    // Validate assignee exists (check DB and fallback)
    let assignee: { id: string; name: string; email: string } | null = null;
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true, name: true, email: true } });
      if (dbUser) assignee = dbUser as never;
    } catch {}
    if (!assignee) {
      // Check fallback/demo users
      const { getDemoUsers } = await import("@/lib/demo-users");
      const demoUsers = getDemoUsers();
      const fallbackMap: Record<string, { id: string; name: string; email: string }> = {
        "fallback-employee": { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
        "fallback-employee2": { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
        "fallback-manager": { id: "fallback-manager", name: "Eves Manager", email: "manager@eves.local" },
        "fallback-admin-adrian": { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
      };
      assignee = fallbackMap[assignedToId] || demoUsers.find((u) => u.id === assignedToId) as never;
      // Also check demo file for any created users
      if (!assignee) {
        const demo = demoUsers.find((u) => u.id === assignedToId);
        if (demo) assignee = { id: demo.id, name: demo.name, email: demo.email };
      }
    }
    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found — check assignee ID. In demo mode, use fallback-employee or create via Admin" }, { status: 404 });
    }

    // Validate property/unit if provided (try DB, fallback to demo properties)
    let property: { id: string; name: string } | null = null;
    let unit: { id: string; unitNumber: string } | null = null;
    if (propertyId) {
      try {
        const prop = await prisma.property.findUnique({ where: { id: propertyId } });
        if (prop) property = { id: prop.id, name: prop.name };
      } catch {}
      if (!property) {
        // Fallback: check legacy properties via API fallback list
        try {
          const { getLegacyData } = await import("@/lib/legacy");
          const legacy = getLegacyData();
          const found = legacy.properties.find((p) => p.name.toLowerCase() === propertyId.toLowerCase() || p.name.toLowerCase() === propertyId);
          // Fallback properties from demo API are by id = name.toLowerCase()
          const demoProps = ["ADI", "BNB", "DREAM", "ECO", "GREEN", "KALAYAAN", "PLEASANT", "PENTHAUZ", "HOMEY", "MONTHLY"];
          if (demoProps.map((x) => x.toLowerCase()).includes(propertyId.toLowerCase())) {
            property = { id: propertyId.toLowerCase(), name: propertyId.toUpperCase() };
          } else if (found) {
            property = { id: found.name.toLowerCase(), name: found.name };
          }
        } catch {}
      }
    }
    if (unitId) {
      // For demo, accept any unitId as valid (since units are from legacy)
      unit = { id: unitId, unitNumber: unitId };
      try {
        const dbUnit = await prisma.unit.findUnique({ where: { id: unitId } });
        if (dbUnit) unit = { id: dbUnit.id, unitNumber: dbUnit.unitNumber };
      } catch {}
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        status: (status as "PENDING" | "IN_PROGRESS" | "COMPLETED") ?? "PENDING",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        createdById: session.user.id,
        propertyId: propertyId || null,
        unitId: unitId || null,
        notes: notes?.trim() || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      // Fallback to file
      const { addDemoTask } = await import("@/lib/demo-tasks");
      const { getDemoUsers } = await import("@/lib/demo-users");
      // Resolve assignee name/email for file
      let assignee: { id: string; name: string; email: string } | null = null;
      const demoUsers = getDemoUsers();
      const fallbackMap: Record<string, { id: string; name: string; email: string }> = {
        "fallback-employee": { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
        "fallback-employee2": { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
        "fallback-manager": { id: "fallback-manager", name: "Eves Manager", email: "manager@eves.local" },
        "fallback-admin-adrian": { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
      };
      assignee = fallbackMap[assignedToId] || (demoUsers.find((u) => u.id === assignedToId) as never);
      if (!assignee) assignee = { id: assignedToId, name: "Unknown", email: "unknown@eves.local" };

      // Resolve property/unit names for display
      let propName: string | null = null;
      let unitNumber: string | null = null;
      if (propertyId) {
        // Try to get property name from id
        const propIdLower = propertyId.toLowerCase();
        const known = ["adi", "bnb", "dream", "eco", "green", "kalayaan", "pleasant", "penthauz", "homey", "monthly"];
        if (known.includes(propIdLower)) propName = propIdLower.toUpperCase();
        else propName = propertyId;
      }
      if (unitId) unitNumber = unitId;

      const now = new Date().toISOString();
      const demoTask = {
        id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        description: description.trim(),
        status: (status as "PENDING" | "IN_PROGRESS" | "COMPLETED") ?? "PENDING",
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes?.trim() || null,
        assignedToId,
        assignedTo: { id: assignee.id, name: assignee.name, email: assignee.email },
        createdById: session.user.id,
        createdBy: { id: session.user.id, name: session.user.name || "Admin", email: session.user.email || "" },
        propertyId: propertyId || null,
        property: propName ? { id: propertyId as string, name: propName } : null,
        unitId: unitId || null,
        unit: unitNumber ? { id: unitId as string, unitNumber } : null,
        createdAt: now,
        updatedAt: now,
      };
      const saved = addDemoTask(demoTask as never);
      return NextResponse.json({ task: saved, warning: "Demo mode — saved to file" }, { status: 201 });
    }
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
