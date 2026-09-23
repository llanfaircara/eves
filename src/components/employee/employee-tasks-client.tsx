"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TaskCard, { type Task } from "@/components/employee/task-card";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ClipboardList, Search } from "lucide-react";

export default function EmployeeTasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | Task["status"]>("ALL");
  const [query, setQuery] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tasks");
      setTasks(data.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter !== "ALL" && t.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${t.title} ${t.description} ${t.property?.name || ""} ${t.unit?.unitNumber || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter, query]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "PENDING").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      awaiting: tasks.filter((t) => (t.status as string) === "AWAITING_APPROVAL").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>;
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No tasks assigned yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your manager hasn&apos;t assigned any jobs yet. Check back soon or contact your manager for new assignments across ADI, BNB, DREAM, ECO, GREEN, KALAYAAN.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filter:</span>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All ({counts.all})</SelectItem>
              <SelectItem value="PENDING">Pending ({counts.pending})</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress ({counts.inProgress})</SelectItem>
              <SelectItem value="AWAITING_APPROVAL">Awaiting ({counts.awaiting})</SelectItem>
              <SelectItem value="COMPLETED">Completed ({counts.completed})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title, property, unit..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{counts.pending}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">In Progress</p>
          <p className="text-xl font-bold text-blue-600">{counts.inProgress}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Awaiting</p>
          <p className="text-xl font-bold text-orange-600">{counts.awaiting}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs uppercase text-muted-foreground">Completed</p>
          <p className="text-xl font-bold text-green-600">{counts.completed}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No tasks match &quot;{query}&quot; in {filter}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} onUpdated={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}
