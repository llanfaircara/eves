import ActivityFeed from "@/components/executive/activity-feed";
import KpiCards from "@/components/executive/kpi-cards";
import RevenueChart from "@/components/executive/revenue-chart";
import { getActivityFeedDb, getExpiringLeases, getOverdueInvoices, getRevenueSeries } from "@/lib/executive";

export const dynamic = "force-dynamic";

export default async function ExecutivePage() {
  const revenue = getRevenueSeries();
  const activity = await getActivityFeedDb(12);
  const overdue = getOverdueInvoices();
  const expiring = getExpiringLeases(60);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio performance at a glance — revenue, overdue invoices, and upcoming lease expirations.
        </p>
      </div>

      <KpiCards
        overdueCount={overdue.count}
        overdueAmount={overdue.amount}
        overdueNullRentCount={overdue.nullRentCount}
        overdueRateFallbackSum={overdue.rateFallbackSum}
        expiringCount={expiring.length}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={revenue} />
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
