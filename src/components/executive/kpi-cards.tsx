import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KpiCards({
  overdueCount,
  overdueAmount,
  overdueNullRentCount,
  overdueRateFallbackSum,
  expiringCount,
}: {
  overdueCount: number;
  overdueAmount: number;
  overdueNullRentCount?: number;
  overdueRateFallbackSum?: number;
  expiringCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Overdue invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{overdueCount}</p>
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
              Action needed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">₱{overdueAmount.toLocaleString()} outstanding across monitoring</p>
          {!!overdueNullRentCount && (
            <p className="text-xs text-muted-foreground">
              Incl. {overdueNullRentCount} red cells with no amount typed, estimated at ₱{(overdueRateFallbackSum ?? 0).toLocaleString()} from tenant rates — same as Payment Monitoring.
            </p>
          )}
          <Link
            href="/manager-dashboard/payments"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            View payments
          </Link>
        </CardContent>
      </Card>

      <Card className="border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Leases expiring soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{expiringCount}</p>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Within 60 days
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Follow up on renewals in the marketing calendar</p>
          <Link
            href="/marketing/calendar"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium"
          >
            View calendar
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
