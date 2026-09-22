import ManagerTasksClient from "@/components/manager/manager-tasks-client";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks / Jobs</h1>
        <p className="text-sm text-muted-foreground">Create, assign, and track all jobs across ADI, BNB, DREAM, ECO, GREEN, KALAYAAN.</p>
      </div>
      <ManagerTasksClient />
    </div>
  );
}
