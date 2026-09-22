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

    const where = session.user.role === "MANAGER" ? {} : { assignedToId: session.user.id };

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
    if (session.user.role !== "MANAGER") {
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
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
