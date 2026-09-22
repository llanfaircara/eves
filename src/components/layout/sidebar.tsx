"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  LogOut,
  Users,
  FileText,
  Shield,
  UserCog,
  Home,
  CreditCard,
  X,
} from "lucide-react";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Administration",
    items: [
      { href: "/admin-dashboard", label: "Admin Overview", icon: Shield, roles: ["ADMIN"] },
      { href: "/admin-dashboard/users", label: "User Management", icon: UserCog, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Management",
    items: [
      { href: "/manager-dashboard", label: "Manager Overview", icon: LayoutDashboard, roles: ["MANAGER", "ADMIN"] },
      { href: "/intake", label: "Tenant Intake", icon: FileText, roles: ["MANAGER", "ADMIN"] },
      { href: "/manager-dashboard/tasks", label: "Tasks", icon: ClipboardList, roles: ["MANAGER", "ADMIN"] },
      { href: "/manager-dashboard/properties", label: "Properties", icon: Building2, roles: ["MANAGER", "ADMIN"] },
      { href: "/manager-dashboard/tenants", label: "Tenants & Leases", icon: Users, roles: ["MANAGER", "ADMIN"] },
      { href: "/manager-dashboard/payments", label: "Payment Monitoring", icon: CreditCard, roles: ["MANAGER", "ADMIN"] },
      { href: "/manager-dashboard/synced", label: "Synced Monitoring", icon: Users, roles: ["MANAGER", "ADMIN"] },
      { href: "/receipts", label: "Payment Receipts", icon: CreditCard, roles: ["MANAGER", "ADMIN", "EMPLOYEE"] },
    ],
  },
  {
    title: "My Work",
    items: [
      { href: "/employee-dashboard", label: "My Tasks", icon: ClipboardList, roles: ["EMPLOYEE", "ADMIN"] },
      { href: "/intake", label: "Tenant Intake", icon: FileText, roles: ["EMPLOYEE"] },
      { href: "/receipts", label: "Payment Receipts", icon: CreditCard, roles: ["EMPLOYEE"] },
    ],
  },
  {
    title: "My Work",
    items: [
      { href: "/employee-dashboard", label: "My Tasks", icon: ClipboardList, roles: ["EMPLOYEE", "ADMIN"] },
      { href: "/intake", label: "Tenant Intake", icon: FileText, roles: ["EMPLOYEE"] },
    ],
  },
];

export default function Sidebar({
  role,
  userName,
  userEmail,
  onClose,
}: {
  role: Role;
  userName?: string | null;
  userEmail?: string | null;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const portalLabel = role === "ADMIN" ? "Admin Portal" : role === "MANAGER" ? "Manager Portal" : "Employee Portal";

  // Avoid duplicate Intake for ADMIN (appears in both Management and My Work) — dedupe by href
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

  // Deduplicate hrefs for ADMIN (Intake appears once)
  const seen = new Set<string>();
  const dedupedGroups = visibleGroups.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    }),
  }));

  // Also always show Home for ADMIN to get back to overview
  const homeItem: NavItem = { href: "/", label: "Home", icon: Home };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          E
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-none">EVES</p>
          <p className="text-xs text-muted-foreground">{portalLabel}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Home — always visible */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Home className="h-4 w-4" />
          Home
        </Link>

        {dedupedGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">ADI • BNB • DREAM • ECO • GREEN • KALAYAAN</p>
          <p className="mt-2 text-xs text-muted-foreground">All tasks & leases across portfolio</p>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium leading-none truncate">{userName || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          <p className="mt-1 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {role}
          </p>
        </div>
        <Button
          variant="ghost"
          className="mt-3 w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
