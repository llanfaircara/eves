import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let counts: { users: number; admins: number; managers: number; employees: number; tasks: number; properties: number } | null = null;
  try {
    const [users, admins, managers, employees, tasks, properties] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "MANAGER" } }),
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.task.count(),
      prisma.property.count(),
    ]);
    counts = { users, admins, managers, employees, tasks, properties };
  } catch {
    counts = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome, Adrian — you can create Managers & Employees and manage the platform.</p>
      </div>

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{counts.users}</p><p className="text-xs text-muted-foreground">{counts.admins} admin • {counts.managers} manager • {counts.employees} employee</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{counts.tasks}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Properties</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{counts.properties}</p><p className="text-xs text-muted-foreground">ADI • BNB • DREAM • ECO • GREEN • KALAYAAN</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin-dashboard/users" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Manage Users — Create Manager/Employee</Link>
          <Link href="/manager-dashboard" className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium">View Manager Dashboard</Link>
          <Link href="/intake" className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium">Open Intake Form</Link>
        </CardContent>
      </Card>
    </div>
  );
}
