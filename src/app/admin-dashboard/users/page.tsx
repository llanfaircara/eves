import UsersClient from "@/components/admin/users-client";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Admin — create Managers and Employees. Admins cannot be created via UI (seed only).</p>
      </div>
      <UsersClient />
    </div>
  );
}
