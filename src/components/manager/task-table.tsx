"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED";
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  property: { id: string; name: string } | null;
  unit: { id: string; unitNumber: string } | null;
};

function StatusBadge({ status }: { status: Task["status"] }) {
  const map = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
    AWAITING_APPROVAL: "bg-orange-100 text-orange-800 border-orange-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
  } as const;
  const label: Record<Task["status"], string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    AWAITING_APPROVAL: "Awaiting Approval",
    COMPLETED: "Completed",
  };
  return <Badge variant="outline" className={map[status]}>{label[status]}</Badge>;
}

export default function TaskTable({
  tasks,
  onUpdate,
}: {
  tasks: Task[];
  onUpdate?: () => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  async function changeStatus(id: string, status: Task["status"]) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      onUpdate?.();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

  async function approve(id: string) {
    await changeStatus(id, "COMPLETED");
  }
  async function reject(id: string) {
    await changeStatus(id, "IN_PROGRESS");
  }

  async function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onUpdate?.();
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No tasks yet. Assign your first job above.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Jobs / Tasks ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[28ch]">{t.description}</div>
                  {t.notes && <div className="text-xs text-muted-foreground italic">Notes: {t.notes}</div>}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{t.assignedTo.name}</div>
                  <div className="text-xs text-muted-foreground">{t.assignedTo.email}</div>
                  <div className="text-xs text-muted-foreground">by {t.createdBy.name}</div>
                </TableCell>
                <TableCell>
                  {t.property ? (
                    <span className="text-sm">
                      {t.property.name}
                      {t.unit ? ` — ${t.unit.unitNumber}` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell>
                  {t.status === "AWAITING_APPROVAL" ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white" onClick={() => approve(t.id)} disabled={updating === t.id}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 border-orange-200 text-orange-700" onClick={() => reject(t.id)} disabled={updating === t.id}>
                        Reject
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(t.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={t.status}
                        onValueChange={(v) => changeStatus(t.id, v as Task["status"])}
                        disabled={updating === t.id}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
