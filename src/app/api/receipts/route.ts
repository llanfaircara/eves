import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  tenantName: z.string().min(2).max(100).trim(),
  property: z.string().min(1).max(50).trim(),
  unit: z.string().min(1).max(50).trim(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  amount: z.coerce.number().min(0),
  receiptUrl: z.string().max(5000).optional().nullable(),
  receiptName: z.string().max(200).optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const where = session.user.role === "ADMIN" || session.user.role === "MANAGER" ? {} : { submittedById: session.user.id };
    const receipts = await prisma.paymentReceipt.findMany({
      where,
      include: { submittedBy: { select: { name: true, email: true } }, reviewedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Normalize for client (flatten)
    const mapped = receipts.map((r) => ({
      id: r.id,
      tenantName: r.tenantName,
      property: r.property,
      unit: r.unit,
      month: r.month,
      amount: Number(r.amount),
      receiptUrl: r.receiptUrl,
      receiptName: r.receiptName,
      status: r.status,
      submittedByName: r.submittedBy?.name || null,
      submittedByEmail: r.submittedBy?.email || null,
      reviewedByName: r.reviewedBy?.name || null,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json({ receipts: mapped });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { getDemoPayments } = await import("@/lib/demo-payments");
      const all = getDemoPayments();
      const filtered = session.user.role === "ADMIN" || session.user.role === "MANAGER" ? all : all.filter((p) => p.submittedById === session.user.id);
      return NextResponse.json({ receipts: filtered, warning: "Demo mode — receipts stored in file" });
    }
    console.error("[GET /api/receipts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Support both JSON and FormData (for file upload)
  let data: Record<string, unknown>;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    data = {
      tenantName: fd.get("tenantName"),
      property: fd.get("property"),
      unit: fd.get("unit"),
      month: fd.get("month"),
      amount: fd.get("amount"),
      receiptUrl: fd.get("receiptUrl"),
      receiptName: fd.get("receiptName"),
    };
    // If file present, store as data URL (demo) — in prod use S3
    const file = fd.get("receipt") as File | null;
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const b64 = buf.toString("base64");
      const mime = file.type || "application/octet-stream";
      data.receiptUrl = `data:${mime};base64,${b64}`;
      data.receiptName = file.name;
    }
  } else {
    data = await req.json();
  }

  const parsed = submitSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { tenantName, property, unit, month, amount, receiptUrl, receiptName } = parsed.data;

  try {
    const receipt = await prisma.paymentReceipt.create({
      data: {
        tenantName: tenantName.trim(),
        property: property.trim().toUpperCase(),
        unit: unit.trim(),
        month,
        amount,
        receiptUrl: receiptUrl || null,
        receiptName: receiptName || null,
        status: "PENDING",
        submittedById: session.user.id,
      },
    });
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      const { addDemoPayment } = await import("@/lib/demo-payments");
      const receipt = addDemoPayment({
        tenantName: tenantName.trim(),
        property: property.trim().toUpperCase(),
        unit: unit.trim(),
        month,
        amount: Number(amount),
        receiptUrl: (receiptUrl as string) || null,
        receiptName: (receiptName as string) || null,
        submittedById: session.user.id,
        submittedByName: session.user.name || null,
        submittedByEmail: session.user.email || null,
      });
      return NextResponse.json({ receipt, warning: "Demo mode — saved to file, pending admin approval" }, { status: 201 });
    }
    console.error("[POST /api/receipts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
