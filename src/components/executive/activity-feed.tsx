import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "@/lib/executive";

const typeStyles: Record<ActivityItem["type"], string> = {
  audit: "bg-muted text-muted-foreground border-border",
  task: "bg-blue-100 text-blue-800 border-blue-200",
  payment: "bg-green-100 text-green-800 border-green-200",
  lease: "bg-yellow-100 text-yellow-800 border-yellow-200",
  intake: "bg-orange-100 text-orange-800 border-orange-200",
};

const typeLabels: Record<ActivityItem["type"], string> = {
  audit: "Audit",
  task: "Job order",
  payment: "Payment",
  lease: "Contract",
  intake: "Intake",
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Chronological system and user audit events</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                <Badge variant="outline" className={typeStyles[a.type]}>
                  {typeLabels[a.type]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{a.title}</p>
                  {a.detail && <p className="truncate text-xs text-muted-foreground">{a.detail}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.actor ? `${a.actor} • ` : ""}
                    {new Date(a.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
