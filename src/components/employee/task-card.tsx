"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, User, Clock, Loader2, Save } from "lucide-react";
import CompleteButton from "./complete-button";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED";
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  const label = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    AWAITING_APPROVAL: "Awaiting Approval",
    COMPLETED: "Completed",
  } as const;
  return (
    <Badge variant="outline" className={map[status]}>
      {label[status]}
    </Badge>
  );
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-xs text-muted-foreground">No due date</span>;
  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = due < now;
  const isToday = due.toDateString() === now.toDateString();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
        isOverdue ? "border-red-200 bg-red-50 text-red-700" : isToday ? "border-yellow-200 bg-yellow-50 text-yellow-800" : "border-muted bg-muted text-muted-foreground"
      }`}
    >
      <Calendar className="h-3 w-3" />
      {due.toLocaleDateString()} {isOverdue && "• Overdue"} {isToday && "• Due today"}
    </span>
  );
}

export default function TaskCard({
  task,
  onUpdated,
}: {
  task: Task;
  onUpdated?: () => void;
}) {
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [notes, setNotes] = useState(task.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isDirty = status !== task.status || notes !== (task.notes || "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSuccess("Updated successfully");
      onUpdated?.();
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base leading-tight">{task.title}</CardTitle>
            <CardDescription className="line-clamp-2 text-sm">{task.description}</CardDescription>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <DueBadge dueDate={task.dueDate} />
          {task.property && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs">
              <MapPin className="h-3 w-3" />
              {task.property.name} {task.unit ? `• ${task.unit.unitNumber}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" /> Assigned by {task.createdBy.name}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status + satisfying finish — no dropdown to Completed */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`status-${task.id}`}>Status</Label>
            <Select value={status === "AWAITING_APPROVAL" ? "AWAITING_APPROVAL" : status === "COMPLETED" ? "COMPLETED" : status} onValueChange={(v) => setStatus(v as Task["status"])}>
              <SelectTrigger id={`status-${task.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                {task.status === "AWAITING_APPROVAL" && <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>}
                {task.status === "COMPLETED" && <SelectItem value="COMPLETED">Completed</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Use the green button below to mark finished — satisfying animation, then awaiting approval.</p>
          </div>
          <div className="space-y-2">
            <Label>Due</Label>
            <p className="pt-2 text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
          </div>
        </div>
        {task.status === "AWAITING_APPROVAL" && <p className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-700">Already awaiting manager approval — hang tight.</p>}
        {task.status === "COMPLETED" && <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">This task is completed and approved by manager.</p>}

        <div className="space-y-2">
          <Label htmlFor={`notes-${task.id}`}>Notes</Label>
          <Textarea
            id={`notes-${task.id}`}
            placeholder="Add progress notes, findings, ETA..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{notes.length}/2000</p>
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {success && <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!isDirty || saving} variant="outline" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save progress"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStatus(task.status);
              setNotes(task.notes || "");
              setError(null);
            }}
            disabled={!isDirty || saving}
          >
            Reset
          </Button>
        </div>

        {/* Satisfying finish — replaces dropdown Completed */}
        {task.status !== "AWAITING_APPROVAL" && task.status !== "COMPLETED" && (
          <CompleteButton
            disabled={saving}
            onComplete={async () => {
              const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "COMPLETED", notes: notes.trim() || null }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed");
              setSuccess(data.message || "Sent for manager approval");
              onUpdated?.();
            }}
          />
        )}

        <p className="text-xs text-muted-foreground">
          Tip: Use <strong>In Progress</strong> while working, then hit the green <strong>Mark as Finished</strong> button for a satisfying send-off to your manager.
        </p>
      </CardContent>
    </Card>
  );
}
