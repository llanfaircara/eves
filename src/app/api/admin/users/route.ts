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
      const { getDemoUsers } = await import("@/lib/demo-users");
      const demo = getDemoUsers();
      const fallback = [
        { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local", role: "ADMIN", createdAt: new Date().toISOString() },
        { id: "fallback-manager", name: "Eves Manager", email: "manager@eves.local", role: "MANAGER", createdAt: new Date().toISOString() },
        { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local", role: "EMPLOYEE", createdAt: new Date().toISOString() },
      ];
      const users = [...fallback, ...demo.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }))];
      return NextResponse.json({
        users,
        warning: `Database not connected — showing ${users.length} users (fallback + ${demo.length} demo-created). They can log in demo mode; set DATABASE_URL and run npx prisma db push && npm run db:seed to persist permanently.`,
      });
    }
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  try {
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
      // Fallback persistence to demo-users.json
      try {
        const { findDemoUser, addDemoUser, getDemoUsers } = await import("@/lib/demo-users");
        // Also check hardcoded fallback emails
        if (email === "adrian@eves.local" || email === "manager@eves.local" || email === "employee@eves.local") {
          return NextResponse.json({ error: "Email already exists (fallback demo user)" }, { status: 409 });
        }
        if (findDemoUser(email)) {
          return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
        const user = await addDemoUser(name, email, password, role as never);
        return NextResponse.json(
          {
            user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
            warning: "Database not connected — user saved to demo file (src/lib/demo-users.json) and can log in in demo mode. Set DATABASE_URL to persist permanently.",
          },
          { status: 201 }
        );
      } catch (e) {
        console.error("[POST fallback]", e);
        return NextResponse.json({ error: (e as Error).message || "Failed to create demo user" }, { status: 400 });
      }
    }
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
