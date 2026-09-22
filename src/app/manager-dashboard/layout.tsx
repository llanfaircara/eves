import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // ADMIN can access manager area (has all manager perms)
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") redirect("/employee-dashboard");

  // Show as MANAGER shell even for ADMIN to keep manager UI consistent
  const shellRole = session.user.role === "ADMIN" ? "MANAGER" as const : session.user.role;
  return (
    <DashboardShell role={shellRole} userName={session.user.name} userEmail={session.user.email}>
      {children}
    </DashboardShell>
  );
}
