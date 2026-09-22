import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.role === "MANAGER") redirect("/manager-dashboard");
    redirect("/employee-dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-6 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">EVES Property Management</h1>
        <p className="text-muted-foreground">
          Centralized dashboard for ADI, BNB, DREAM, ECO, GREEN & KALAYAAN. Role-based access, automated
          lease tracking & task delegation — replacing legacy spreadsheets.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium hover:bg-muted"
          >
            Manager / Employee Access
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Manager sees all properties · Employee sees assigned To-Do list · Secure NextAuth + PostgreSQL
        </p>
      </div>
    </div>
  );
}
