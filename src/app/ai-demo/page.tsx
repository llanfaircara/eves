import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";
import JevDemoClient from "@/components/ai/jev-demo-client";

export const dynamic = "force-dynamic";

export default async function AiDemoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell role={session.user.role} userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jev AI — Tenant Triage Demo</h1>
          <p className="text-sm text-muted-foreground">
            TypeSafe System One demo for EVES: <code>Jev</code> turns a tenant message + property context into typed judgments (Choice, Noul, Score) your code can route. No prompt-and-parse — code owns the workflow.
          </p>
        </div>
        <JevDemoClient />
      </div>
    </DashboardShell>
  );
}
