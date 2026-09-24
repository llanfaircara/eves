"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ForecastUnit, ReservationPayload } from "@/lib/executive";
import ReserveUnitDialog from "./reserve-unit-dialog";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

type SortKey = "unitId" | "property" | "earliestAvailable" | "monthlyRate";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

export default function ForecastTable({ units }: { units: ForecastUnit[] }) {
  const [query, setQuery] = useState("");
  const [property, setProperty] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("earliestAvailable");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, ForecastUnit["confidence"]>>({});
  const [selected, setSelected] = useState<ForecastUnit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastReservation, setLastReservation] = useState<ReservationPayload | null>(null);

  const properties = useMemo(() => [...new Set(units.map((u) => u.property))].sort(), [units]);

  const withOverrides: ForecastUnit[] = useMemo(
    () => units.map((u) => (overrides[u.id] ? { ...u, confidence: overrides[u.id] } : u)),
    [units, overrides]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withOverrides.filter((u) => {
      if (property !== "all" && u.property !== property) return false;
      if (!q) return true;
      return (
        u.unitId.toLowerCase().includes(q) ||
        u.property.toLowerCase().includes(q) ||
        (u.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [withOverrides, query, property]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "monthlyRate") cmp = (a.monthlyRate ?? -1) - (b.monthlyRate ?? -1);
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  function handleReserve(unit: ForecastUnit) {
    setSelected(unit);
    setDialogOpen(true);
  }

  function handleOverride(unit: ForecastUnit) {
    // Placeholder behavior consistent with app: flip confidence locally
    setOverrides((prev) => ({
      ...prev,
      [unit.id]: unit.confidence === "Confirmed" ? "Estimated" : "Confirmed",
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search unit, property, tenant..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Property</span>
          <Select
            value={property}
            onValueChange={(v) => {
              setProperty(v ?? "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[180px]">
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
        <span className="text-sm text-muted-foreground md:ml-auto">
          {sorted.length} of {units.length} units
        </span>
      </div>

      {lastReservation && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-sm text-green-800">
            Reserved {lastReservation.property} {lastReservation.unitId} — {lastReservation.intent} / {lastReservation.term},{" "}
            {lastReservation.leaseStart} → {lastReservation.leaseEnd} ({lastReservation.leaseStatus}).
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-auto pt-6">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No units match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("unitId")}>
                      Unit {sortIcon("unitId")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("property")}>
                      Property {sortIcon("property")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("earliestAvailable")}>
                      Earliest Available {sortIcon("earliestAvailable")}
                    </button>
                  </TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("monthlyRate")}>
                      Rate {sortIcon("monthlyRate")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono font-medium">{u.unitId}</TableCell>
                    <TableCell>{u.property}</TableCell>
                    <TableCell className="whitespace-nowrap">{u.earliestAvailable}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.confidence === "Confirmed"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }
                      >
                        {u.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.occupancy === "Vacant"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {u.occupancy}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {u.monthlyRate !== null ? `₱${Number(u.monthlyRate).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleReserve(u)}>
                          Reserve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOverride(u)}>
                          Override
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {safePage + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
            Next
          </Button>
        </div>
      </div>

      <ReserveUnitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={selected}
        onReserved={(payload) => setLastReservation(payload)}
      />
    </div>
  );
}
