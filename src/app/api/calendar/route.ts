import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/executive";

export const dynamic = "force-dynamic";

// GET /api/calendar — lease end dates mapped to CalendarEvent format
export async function GET() {
  try {
    const events = getCalendarEvents();
    return NextResponse.json({ events });
  } catch (e) {
    console.error("[GET /api/calendar]", e);
    return NextResponse.json({ error: "Failed to load calendar events" }, { status: 500 });
  }
}
