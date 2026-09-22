import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
    if (id === session.user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      try {
        if (id.startsWith("fallback-")) {
          return NextResponse.json({ error: "Cannot delete built-in fallback user" }, { status: 400 });
        }
        const { deleteDemoUser } = await import("@/lib/demo-users");
        const ok = deleteDemoUser(id);
        if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
        return NextResponse.json({ success: true });
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
    }
    console.error("[DELETE /api/admin/users/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
