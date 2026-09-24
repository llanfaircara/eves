import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ──────────────────────────────────────────────────
// Route config
// ──────────────────────────────────────────────────
const PUBLIC_PATHS = ["/", "/login", "/api/auth"];
const ADMIN_PREFIXES = ["/admin", "/admin-dashboard", "/api/admin"];
const MANAGER_PREFIXES = ["/manager", "/manager-dashboard", "/executive", "/marketing", "/api/manager"];
const EMPLOYEE_PREFIXES = ["/employee", "/employee-dashboard", "/api/employee"];
const AUTHED_DASHBOARDS = ["/manager-dashboard", "/employee-dashboard", "/admin-dashboard", "/executive"];
const AUTHED_ANY = ["/intake", "/api/intake", "/api/tasks", "/api/properties"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/" || pathname === "/login") return true;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js)$/)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p);
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function redirectByRole(req: NextRequest, role: string) {
  if (role === "ADMIN") return NextResponse.redirect(new URL("/admin-dashboard", req.url));
  if (role === "MANAGER") return NextResponse.redirect(new URL("/manager-dashboard", req.url));
  return NextResponse.redirect(new URL("/employee-dashboard", req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token?.role) return redirectByRole(req, token.role as string);
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Admin routes — ADMIN only (highest privilege)
  if (startsWithAny(pathname, ADMIN_PREFIXES)) {
    if (role !== "ADMIN") {
      // Managers/employees trying to access admin → send to own dashboard
      return redirectByRole(req, role || "EMPLOYEE");
    }
    return NextResponse.next();
  }

  // Manager routes — ADMIN + MANAGER allowed (admin can do everything manager can)
  if (startsWithAny(pathname, MANAGER_PREFIXES)) {
    if (role !== "MANAGER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/employee-dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Employee routes — EMPLOYEE + ADMIN + MANAGER? Only EMPLOYEE dedicated; allow ADMIN to view
  if (startsWithAny(pathname, EMPLOYEE_PREFIXES)) {
    if (role !== "EMPLOYEE" && role !== "ADMIN") {
      // Manager trying to access employee dashboard → allow as manager redirect? keep isolated
      if (role === "MANAGER") return NextResponse.redirect(new URL("/manager-dashboard", req.url));
      return redirectByRole(req, role || "EMPLOYEE");
    }
    return NextResponse.next();
  }

  if (AUTHED_DASHBOARDS.some((p) => pathname.startsWith(p))) {
    if (!role) return NextResponse.redirect(new URL("/login", req.url));
  }

  if (AUTHED_ANY.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin-dashboard/:path*",
    "/admin/:path*",
    "/manager-dashboard/:path*",
    "/employee-dashboard/:path*",
    "/executive",
    "/marketing/:path*",
    "/manager/:path*",
    "/employee/:path*",
    "/intake/:path*",
    "/intake",
    "/login",
    "/api/admin/:path*",
    "/api/manager/:path*",
    "/api/employee/:path*",
    "/api/intake/:path*",
    "/api/tasks/:path*",
    "/api/properties/:path*",
  ],
};
