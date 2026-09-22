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
      // Fallback demo tasks when DB not connected
      return NextResponse.json({
        tasks: [
          {
            id: "demo-1",
            title: "Inspect water leak — ECO-001",
            description: "Tenant reported leak under kitchen sink. Check piping and replace seal.",
            status: "PENDING",
            dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
            notes: "Priority: high. Bring tools.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedTo: { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local" },
            createdBy: { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
            property: { id: "eco", name: "ECO" },
            unit: { id: "eco-001", unitNumber: "ECO-001", monthlyRate: "15000" },
          },
          {
            id: "demo-2",
            title: "Collect rent — GREEN portfolio",
            description: "Follow up on overdue GREEN units for May.",
            status: "IN_PROGRESS",
            dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedTo: { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local" },
            createdBy: { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local" },
            property: { id: "green", name: "GREEN" },
            unit: null,
          },
        ],
        warning: "Database not connected — showing demo tasks.",
      });
    }
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks → MANAGER only
export async function POST(req: Request) {
  try {
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

    // Validate assignee exists and is EMPLOYEE (but allow MANAGER assignee too for flexibility)
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true } });
    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }

    // Validate property/unit if provided
    if (propertyId) {
      const prop = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!prop) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    if (unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: unitId } });
      if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      // Ensure unit belongs to property if both provided
      if (propertyId && unit.propertyId !== propertyId) {
        return NextResponse.json({ error: "Unit does not belong to selected property" }, { status: 400 });
      }
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
      return NextResponse.json({ error: "Database not connected — set DATABASE_URL and run npx prisma db push && npm run db:seed to persist tasks. Demo mode shows sample tasks." }, { status: 503 });
    }
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
