import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function EmployeeDashboardPlaceholder() {
  const session = await getServerSession(authOptions);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Employee To-Do (Step 4)</h1>
      <p className="text-muted-foreground">Welcome, {session?.user?.name} ({session?.user?.role})</p>
      <p className="mt-4 text-sm">Your assigned tasks will appear in Step 4.</p>
    </div>
  );
}
