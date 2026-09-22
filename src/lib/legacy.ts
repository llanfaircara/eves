import legacy from "./eves-legacy-data.json";

export type LegacyLease = (typeof legacy)["leases"][number];

export function getLegacyData() {
  return legacy as {
    generatedAt: string;
    totalLeases: number;
    properties: { name: string; units: string[] }[];
    leases: LegacyLease[];
  };
}

export function getLegacyProperties() {
  const data = getLegacyData();
  // Build units per property from leases
  const map = new Map<string, Set<string>>();
  for (const l of data.leases) {
    if (!map.has(l.property)) map.set(l.property, new Set());
    if (l.unit && l.unit !== "UNKNOWN") map.get(l.property)!.add(l.unit);
  }
  return [...map.entries()].map(([name, units]) => ({
    name,
    unitCount: units.size,
    leaseCount: data.leases.filter((x) => x.property === name).length,
  }));
}

export function getLegacyLeasesForTable() {
  const data = getLegacyData();
  return data.leases.slice(0, 100).map((l, i) => ({
    id: l.controlNumber || `legacy-${i}`,
    tenant: {
      firstName: l.firstName || l.fullName.split(" ")[0] || "Unknown",
      lastName: l.lastName || l.fullName.split(" ").slice(1).join(" ") || "",
      mobile: l.mobile,
      email: l.email,
      company: l.company,
    },
    unit: { property: l.property, unitNumber: l.unit },
    contractType: l.terms?.toUpperCase().includes("M2M") ? "M2M" : l.terms?.toUpperCase().includes("TRIAL") ? "TRIAL" : "LONG_TERM",
    rentalStart: l.rentalStart,
    rentalEnd: l.rentalEnd,
    rate: l.rate,
    total: l.totalAmount,
    status: l.status || "ACTIVE",
    sourceFile: l.sourceFile,
  }));
}
