import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";
import ReceiptsClient from "@/components/receipts/receipts-client";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell role={session.user.role} userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Receipts</h1>
          <p className="text-sm text-muted-foreground">Employees/tenants submit receipts — Manager/Admin approves to mark PAID. Synced to Payment Monitoring.</p>
        </div>
        <ReceiptsClient role={session.user.role} />
      </div>
    </DashboardShell>
  );
}
