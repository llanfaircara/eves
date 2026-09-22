import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskStatusSchema } from "@/lib/validators/task";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/tasks/:id → MANAGER can edit any, EMPLOYEE can update own assigned status/notes
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateTaskStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    const isOwnTask = existing.assignedToId === session.user.id;
    if (!isManager && !isOwnTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, notes } = parsed.data;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: status as never,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    return NextResponse.json({ task: updated });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("Task not found")) {
      // Fallback to demo file
      const { getDemoTasks, updateDemoTask } = await import("@/lib/demo-tasks");
      const existing = getDemoTasks().find((t) => t.id === id);
      if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
      const isOwnTask = existing.assignedToId === session.user.id;
      if (!isManager && !isOwnTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const { status, notes } = parsed.data;
      const updated = updateDemoTask(id, { status: status as never, notes: notes ?? existing.notes } as never);
      if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json({ task: updated });
    }
    console.error("[PATCH /api/tasks/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden — Managers only" }, { status: 403 });
  }
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("Record to delete")) {
      const { deleteDemoTask } = await import("@/lib/demo-tasks");
      const ok = deleteDemoTask(id);
      if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }
    console.error("[DELETE /api/tasks/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
