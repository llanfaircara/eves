import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/layout/dashboard-shell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // ADMIN can view employee area too
  if (session.user.role !== "EMPLOYEE" && session.user.role !== "ADMIN") redirect("/manager-dashboard");

  const shellRole = session.user.role === "ADMIN" ? "EMPLOYEE" as const : session.user.role;
  return (
    <DashboardShell role={shellRole} userName={session.user.name} userEmail={session.user.email}>
      {children}
    </DashboardShell>
  );
}
