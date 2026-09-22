import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden — Admin/Manager only to approve" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { status, reviewNote } = parsed.data;

  try {
    const receipt = await prisma.paymentReceipt.update({
      where: { id },
      data: {
        status: status as never,
        reviewedById: session.user.id,
        reviewNote: reviewNote || null,
      },
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { getDemoPayments, updateDemoPayment } = await import("@/lib/demo-payments");
      const list = getDemoPayments();
      const found = list.find((p) => p.id === id);
      if (!found) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      if (found.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
      const updated = updateDemoPayment(id, {
        status: status as never,
        reviewedById: session.user.id,
        reviewedByName: session.user.name || null,
        reviewNote: reviewNote || null,
      });
      return NextResponse.json({ receipt: updated });
    }
    console.error("[PATCH /api/receipts/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
