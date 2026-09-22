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
} from "lucide-react";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: Role[] };

const nav: NavItem[] = [
  { href: "/admin-dashboard", label: "Admin", icon: Shield, roles: ["ADMIN"] },
  { href: "/admin-dashboard/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/manager-dashboard", label: "Overview", icon: LayoutDashboard, roles: ["MANAGER", "ADMIN"] },
  { href: "/manager-dashboard/tasks", label: "Tasks", icon: ClipboardList, roles: ["MANAGER", "ADMIN"] },
  { href: "/employee-dashboard", label: "My Tasks", icon: ClipboardList, roles: ["EMPLOYEE"] },
  { href: "/intake", label: "Tenant Intake", icon: FileText },
  { href: "/manager-dashboard/properties", label: "Properties", icon: Building2, roles: ["MANAGER", "ADMIN"] },
  { href: "/manager-dashboard/tenants", label: "Tenants", icon: Users, roles: ["MANAGER", "ADMIN"] },
];

export default function Sidebar({
  role,
  userName,
  userEmail,
}: {
  role: Role;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const filtered = nav.filter((item) => !item.roles || item.roles.includes(role));

  const portalLabel = role === "ADMIN" ? "Admin Portal" : role === "MANAGER" ? "Manager Portal" : "Employee Portal";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          E
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">EVES</p>
          <p className="text-xs text-muted-foreground">{portalLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {role === "ADMIN" ? "Administration" : role === "MANAGER" ? "Management" : "Work"}
        </p>
        {filtered.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
        <div className="pt-4">
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</p>
          <p className="px-3 text-xs text-muted-foreground">ADI • BNB • DREAM • ECO • GREEN • KALAYAAN</p>
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
