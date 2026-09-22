import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

// Fallback in-memory users when DB is unreachable (P1001 localhost:5432)
// Allows immediate demo login without Postgres running. DB users take precedence when available.
const FALLBACK_USERS = [
  { id: "fallback-admin-adrian", name: "Adrian", email: "adrian@eves.local", passwordPlain: "sharedroom228", role: "ADMIN" as const },
  { id: "fallback-manager", name: "Eves Manager", email: "manager@eves.local", passwordPlain: "Manager123!", role: "MANAGER" as const },
  { id: "fallback-employee", name: "Jane Employee", email: "employee@eves.local", passwordPlain: "Employee123!", role: "EMPLOYEE" as const },
  { id: "fallback-employee2", name: "John Field", email: "employee2@eves.local", passwordPlain: "Employee123!", role: "EMPLOYEE" as const },
];

function checkFallback(email: string, password: string) {
  const u = FALLBACK_USERS.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (u && u.passwordPlain === password) {
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Try DB first
        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true, role: true },
          });
          if (user && user.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
              return { id: user.id, name: user.name, email: user.email, role: user.role } as never;
            }
            return null;
          }
          // DB reachable but user not found → try fallback before returning null
          const fb = checkFallback(email, password);
          if (fb) return fb as never;
          // Try demo-users file (created via admin UI when DB down)
          try {
            const { verifyDemoUser } = await import("@/lib/demo-users");
            const demo = await verifyDemoUser(email, password);
            if (demo) return { id: demo.id, name: demo.name, email: demo.email, role: demo.role } as never;
          } catch {}
          return null;
        } catch (err) {
          console.warn("[auth:authorize] DB unreachable, trying fallback", (err as Error).message);
          const fb = checkFallback(email, password);
          if (fb) return fb as never;
          try {
            const { verifyDemoUser } = await import("@/lib/demo-users");
            const demo = await verifyDemoUser(email, password);
            if (demo) return { id: demo.id, name: demo.name, email: demo.email, role: demo.role } as never;
          } catch {}
          console.error("[auth:authorize]", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as unknown as { id: string }).id;
        token.role = (user as unknown as { role: "ADMIN" | "MANAGER" | "EMPLOYEE" }).role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "MANAGER" | "EMPLOYEE";
        session.user.name = token.name;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

import { getServerSession } from "next-auth";
export function getAuthSession() {
  return getServerSession(authOptions);
}
