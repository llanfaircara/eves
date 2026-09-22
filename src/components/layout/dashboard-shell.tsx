"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function DashboardShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  userName?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex w-64 shrink-0 flex-col bg-card shadow-xl">
            <Sidebar role={role} userName={userName} userEmail={userEmail} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">E</div>
            <span className="text-sm font-semibold">EVES</span>
            <span className="text-xs text-muted-foreground">{role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Employee"}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="truncate text-xs text-muted-foreground">{userName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
