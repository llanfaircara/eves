"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueMetric } from "@/lib/executive";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function peso(n: number) {
  return `₱${Math.round(n).toLocaleString()}`;
}

export default function RevenueChart({ data }: { data: RevenueMetric[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Collected vs invoiced — rolling 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full" role="img" aria-label="Collected vs invoiced revenue chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `₱${Math.round(v / 1000)}k`}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  peso(Number(value ?? 0)),
                  name === "collected" ? "Collected" : "Invoiced",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="collected" name="Collected" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="invoiced" name="Invoiced" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
