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

  // Try DB first, fallback to demo file if not found or DB down
  let existing: { id: string; assignedToId: string; status: string; notes?: string | null } | null = null;
  let isDemo = false;
  try {
    const dbTask = await prisma.task.findUnique({ where: { id } });
    if (dbTask) {
      existing = dbTask as unknown as { id: string; assignedToId: string; status: string };
    } else {
      // Not in DB — try demo file
      const { getDemoTasks } = await import("@/lib/demo-tasks");
      const demo = getDemoTasks().find((t) => t.id === id);
      if (demo) {
        existing = { id: demo.id, assignedToId: demo.assignedToId, status: demo.status, notes: demo.notes } as unknown as { id: string; assignedToId: string; status: string };
        isDemo = true;
      } else {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    }
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { getDemoTasks } = await import("@/lib/demo-tasks");
      const demo = getDemoTasks().find((t) => t.id === id);
      if (!demo) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      existing = { id: demo.id, assignedToId: demo.assignedToId, status: demo.status, notes: demo.notes } as unknown as { id: string; assignedToId: string; status: string };
      isDemo = true;
    } else {
      throw err;
    }
  }

  try {
    const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
    const isOwnTask = existing.assignedToId === session.user.id;
    if (!isManager && !isOwnTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let { status, notes } = parsed.data;
    if (!isManager && status === "COMPLETED") {
      status = "AWAITING_APPROVAL" as never;
    }
    if (status === "COMPLETED" && !isManager) {
      return NextResponse.json({ error: "Only manager can mark as completed — sent for approval" }, { status: 403 });
    }
    if (existing.status === "AWAITING_APPROVAL" && status === "AWAITING_APPROVAL" && !isManager) {
      return NextResponse.json({ error: "Already awaiting approval" }, { status: 400 });
    }

    if (isDemo) {
      const { updateDemoTask } = await import("@/lib/demo-tasks");
      const updated = updateDemoTask(id, { status: status as never, notes: notes ?? (existing as unknown as { notes: string | null }).notes } as never);
      if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json({ task: updated, ...(status === "AWAITING_APPROVAL" ? { message: "Sent for manager approval" } : {}) });
    }

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

    return NextResponse.json({ task: updated, ...(status === "AWAITING_APPROVAL" ? { message: "Sent for manager approval" } : {}) });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("Task not found") || msg.includes("Record to update")) {
      const { getDemoTasks, updateDemoTask } = await import("@/lib/demo-tasks");
      const existing = getDemoTasks().find((t) => t.id === id);
      if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      const isManager = session.user.role === "MANAGER" || session.user.role === "ADMIN";
      const isOwnTask = existing.assignedToId === session.user.id;
      if (!isManager && !isOwnTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      let { status, notes } = parsed.data;
      if (!isManager && status === "COMPLETED") status = "AWAITING_APPROVAL" as never;
      if (status === "COMPLETED" && !isManager) {
        return NextResponse.json({ error: "Only manager can mark as completed — sent for approval" }, { status: 403 });
      }
      const updated = updateDemoTask(id, { status: status as never, notes: notes ?? existing.notes } as never);
      if (!updated) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json({ task: updated, ...(status === "AWAITING_APPROVAL" ? { message: "Sent for manager approval" } : {}) });
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
