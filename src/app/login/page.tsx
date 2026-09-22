import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginForm from "@/components/auth/login-form";

export const metadata = {
  title: "Login — EVES Property Management",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Already authed -> redirect by role
  if (session?.user) {
    if (session.user.role === "MANAGER") redirect("/manager-dashboard");
    redirect("/employee-dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">EVES</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Property Management — ADI • BNB • DREAM • ECO • GREEN • KALAYAAN
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manager & Employee portal
          </p>
        </div>
        <LoginForm callbackUrl={params.callbackUrl} serverError={params.error} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo: manager@eves.local / Manager123! &nbsp;|&nbsp; employee@eves.local / Employee123!
        </p>
      </div>
    </div>
  );
}
