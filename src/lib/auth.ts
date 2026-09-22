import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
  // Store session as JWT — no DB session table needed
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;

          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true, role: true },
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          // Return shapes what goes into JWT on first sign-in
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          } as never;
        } catch (err) {
          console.error("[auth:authorize]", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: `user` is present
      if (user) {
        token.id = (user as unknown as { id: string }).id;
        token.role = (user as unknown as { role: "MANAGER" | "EMPLOYEE" }).role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "MANAGER" | "EMPLOYEE";
        session.user.name = token.name;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

// Helper for server components / API routes
import { getServerSession } from "next-auth";

export function getAuthSession() {
  return getServerSession(authOptions);
}
