import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ──────────────────────────────────────────────────
// Route config
// ──────────────────────────────────────────────────
const PUBLIC_PATHS = ["/", "/login", "/api/auth"];
const MANAGER_PREFIXES = ["/manager", "/manager-dashboard", "/api/manager"];
const EMPLOYEE_PREFIXES = ["/employee", "/employee-dashboard", "/api/employee"];
const AUTHED_DASHBOARDS = ["/manager-dashboard", "/employee-dashboard"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/" || pathname === "/login") return true;
  // allow static assets
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js)$/)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p);
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public + auth api + static
  if (isPublic(pathname)) {
    // If already authed and hitting /login -> redirect to role dashboard
    if (pathname === "/login") {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token?.role === "MANAGER") {
        return NextResponse.redirect(new URL("/manager-dashboard", req.url));
      }
      if (token?.role === "EMPLOYEE") {
        return NextResponse.redirect(new URL("/employee-dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated -> to login, preserve callbackUrl
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Protect manager routes
  if (startsWithAny(pathname, MANAGER_PREFIXES)) {
    if (role !== "MANAGER") {
      // Employee trying to access manager area -> send to own dashboard
      return NextResponse.redirect(new URL("/employee-dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protect employee routes
  if (startsWithAny(pathname, EMPLOYEE_PREFIXES)) {
    if (role !== "EMPLOYEE") {
      return NextResponse.redirect(new URL("/manager-dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Generic authed check for any other protected route
  if (AUTHED_DASHBOARDS.some((p) => pathname.startsWith(p))) {
    if (!role) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manager-dashboard/:path*",
    "/employee-dashboard/:path*",
    "/manager/:path*",
    "/employee/:path*",
    "/login",
    "/api/manager/:path*",
    "/api/employee/:path*",
  ],
};
