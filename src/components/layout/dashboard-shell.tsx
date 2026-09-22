import Sidebar from "@/components/layout/sidebar";

export default function DashboardShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: "MANAGER" | "EMPLOYEE";
  userName?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
