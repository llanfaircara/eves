"use client";

import { useCallback, useEffect, useState } from "react";
import CreateUserForm from "@/components/admin/create-user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

type User = { id: string; name: string; email: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; createdAt: string };

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function remove(id: string) {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      fetchUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <CreateUserForm onCreated={fetchUsers} />

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : u.role === "MANAGER" ? "secondary" : "outline"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {u.role !== "ADMIN" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(u.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
