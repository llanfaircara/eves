import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";
import IntakeForm from "@/components/intake/intake-form";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell role={session.user.role} userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Intake / Move-in Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Unified form — captures Tenant Info + Lease Details + Utilities/Meter Readings in one flow. Saved atomically (Tenant → Lease → Inspection) and marks the unit as OCCUPIED.
          </p>
        </div>
        <IntakeForm />
      </div>
    </DashboardShell>
  );
}
