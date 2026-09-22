import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ManagerDashboardPlaceholder() {
  const session = await getServerSession(authOptions);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Manager Dashboard (Step 3)</h1>
      <p className="text-muted-foreground">Welcome, {session?.user?.name} ({session?.user?.role})</p>
      <p className="mt-4 text-sm">Task delegation UI arrives in Step 3.</p>
    </div>
  );
}
