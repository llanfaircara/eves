"use client";

import { useCallback, useEffect, useState } from "react";
import TaskForm from "@/components/manager/task-form";
import TaskTable from "@/components/manager/task-table";
import { Loader2 } from "lucide-react";

type Task = React.ComponentProps<typeof TaskTable>["tasks"][number];

export default function ManagerTasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <TaskForm onCreated={fetchTasks} />
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : (
        <TaskTable tasks={tasks} onUpdate={fetchTasks} />
      )}
    </div>
  );
}
