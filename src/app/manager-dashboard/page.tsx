import { prisma } from "@/lib/prisma";
import ManagerTasksClient from "@/components/manager/manager-tasks-client";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  // Server-side summary for header stats (try/catch so page renders even without DB in dev)
  let stats: { total: number; pending: number; inProgress: number; completed: number; properties: number; units: number } | null = null;
  try {
    const [total, pending, inProgress, completed, properties, units] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: "PENDING" } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.property.count(),
      prisma.unit.count(),
    ]);
    stats = { total, pending, inProgress, completed, properties, units };
  } catch {
    // DB not connected (e.g., initial setup without DATABASE_URL) — degrade gracefully
    stats = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          View all properties, units, tenants & leases. Create & track jobs assigned to employees.
        </p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase">Total Tasks</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase">In Progress</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground uppercase">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent></Card>
        </div>
      )}

      {!stats && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">
            Database not connected. Set <code>DATABASE_URL</code> in <code>.env</code> and run <code>npx prisma db push && npm run db:seed</code> to enable stats and task data.
          </CardContent>
        </Card>
      )}

      <ManagerTasksClient />
    </div>
  );
}
