import CalendarClient from "@/components/marketing/calendar-client";
import { getCalendarEvents, getProperties } from "@/lib/executive";

export const dynamic = "force-dynamic";

export default function MarketingCalendarPage() {
  const events = getCalendarEvents();
  const properties = getProperties();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Track lease endings and vacancies — switch views, paginate dates, and filter by property or tag.
        </p>
      </div>
      <CalendarClient events={events} properties={properties} />
    </div>
  );
}
