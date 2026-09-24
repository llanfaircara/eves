import ForecastTable from "@/components/marketing/forecast-table";
import { getForecastUnits } from "@/lib/executive";

export const dynamic = "force-dynamic";

export default function ForecastPage() {
  const units = getForecastUnits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unit Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Earliest availability, confidence, and occupancy — search, sort, and paginate. Reserve a unit to start a draft lease.
        </p>
      </div>
      <ForecastTable units={units} />
    </div>
  );
}
