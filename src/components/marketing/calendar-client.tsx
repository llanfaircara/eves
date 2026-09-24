"use client";

import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CalendarEvent } from "@/lib/executive";
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileText, List } from "lucide-react";

type ViewMode = "month" | "week" | "list";

const tagStyles: Record<CalendarEvent["tag"], string> = {
  "Lease ends": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Vacant: "bg-green-100 text-green-800 border-green-200",
  "Renewal due": "bg-blue-100 text-blue-800 border-blue-200",
  "Move-in": "bg-orange-100 text-orange-800 border-orange-200",
};

export default function CalendarClient({
  events,
  properties,
}: {
  events: CalendarEvent[];
  properties: string[];
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (propertyFilter === "all" || e.property === propertyFilter) &&
          (tagFilter === "all" || e.tag === tagFilter)
      ),
    [events, propertyFilter, tagFilter]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered]);

  function shift(dir: 1 | -1) {
    if (view === "month") setCursor((d) => addMonths(d, dir));
    else if (view === "week") setCursor((d) => addDays(d, dir * 7));
    else setCursor((d) => addMonths(d, dir));
  }

  const monthCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const listRows = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return filtered
      .filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 100);
  }, [filtered, cursor]);

  const title =
    view === "week"
      ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
      : format(cursor, "MMMM yyyy");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
              <CalendarDays className="h-4 w-4" />
              Month
            </Button>
            <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
              Week
            </Button>
            <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Property</p>
          <Select value={propertyFilter} onValueChange={(v) => setPropertyFilter(v ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Tag</p>
          <Select value={tagFilter} onValueChange={(v) => setTagFilter(v ?? "all")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              <SelectItem value="Lease ends">Lease ends</SelectItem>
              <SelectItem value="Vacant">Vacant</SelectItem>
              <SelectItem value="Renewal due">Renewal due</SelectItem>
              <SelectItem value="Move-in">Move-in</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button variant="outline" onClick={() => console.log("[marketing/calendar] Report requested", { propertyFilter, tagFilter })}>
            <FileText className="h-4 w-4" />
            Report
          </Button>
          <Button variant="outline" onClick={() => console.log("[marketing/calendar] Export requested", { propertyFilter, tagFilter })}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <span className="text-xs text-muted-foreground">{filtered.length} events</span>
        </div>
      </div>

      {view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming events — {format(cursor, "MMMM yyyy")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            {listRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No events for these filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Tag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listRows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.unit}</div>
                      </TableCell>
                      <TableCell>{e.property}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tagStyles[e.tag]}>
                          {e.tag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(view === "month" ? monthCells : weekDays).map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = byDate.get(key) ?? [];
                const outside = view === "month" && !isSameMonth(day, cursor);
                return (
                  <div
                    key={key}
                    className={`min-h-20 rounded-lg border p-1.5 text-left md:min-h-24 ${
                      isSameDay(day, new Date()) ? "border-primary ring-1 ring-primary" : "border-border"
                    } ${outside ? "bg-muted/30 text-muted-foreground" : "bg-card"}`}
                  >
                    <p className="text-xs font-medium">{format(day, "d")}</p>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <Badge key={e.id} variant="outline" className={`${tagStyles[e.tag]} max-w-full truncate`}>
                          {e.property} {e.unit}
                        </Badge>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
