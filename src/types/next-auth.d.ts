import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    name?: string | null;
    email?: string | null;
  }
}
