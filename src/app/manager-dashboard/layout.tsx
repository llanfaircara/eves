import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/employee-dashboard");

  return (
    <DashboardShell role="MANAGER" userName={session.user.name} userEmail={session.user.email}>
      {children}
    </DashboardShell>
  );
}
