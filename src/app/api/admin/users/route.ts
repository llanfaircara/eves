import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(72),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      // Fallback demo users when DB not configured
      return NextResponse.json({
        users: [
          { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local", role: "ADMIN", createdAt: new Date().toISOString() },
          { id: "fallback-manager", name: "Eves Manager", email: "manager@eves.local", role: "MANAGER", createdAt: new Date().toISOString() },
          { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local", role: "EMPLOYEE", createdAt: new Date().toISOString() },
        ],
        warning: "Database not connected — showing fallback demo users. Set DATABASE_URL and run npx prisma db push && npm run db:seed to persist.",
      });
    }
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name: name.trim(), email, password: hash, role: role as never },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || "";
    if (msg.includes("Can't reach database") || msg.includes("P1001")) {
      return NextResponse.json({ error: "Database not connected — set DATABASE_URL and run npx prisma db push before creating users. Fallback login works for demo, but creation requires DB." }, { status: 503 });
    }
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
