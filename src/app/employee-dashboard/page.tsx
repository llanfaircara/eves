import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EmployeeTasksClient from "@/components/employee/employee-tasks-client";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  let stats: { total: number; pending: number; inProgress: number; completed: number } | null = null;
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      prisma.task.count({ where: { assignedToId: userId } }),
      prisma.task.count({ where: { assignedToId: userId, status: "PENDING" } }),
      prisma.task.count({ where: { assignedToId: userId, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { assignedToId: userId, status: "COMPLETED" } }),
    ]);
    stats = { total, pending, inProgress, completed };
  } catch {
    stats = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My To-Do List</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, <span className="font-medium text-foreground">{session?.user.name}</span> — here are the jobs assigned to you.
          Update the status as you work and add notes for your manager.
        </p>
      </div>

      {stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-xs uppercase text-muted-foreground">Assigned</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs uppercase text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs uppercase text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs uppercase text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent></Card>
        </div>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 text-sm text-yellow-800">
            Database not connected. Set <code>DATABASE_URL</code> and run <code>npx prisma db push && npm run db:seed</code> to load your tasks.
          </CardContent>
        </Card>
      )}

      <EmployeeTasksClient />
    </div>
  );
}
