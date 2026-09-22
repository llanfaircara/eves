import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const DOCS = "/Users/adriansalvador/Downloads/EVES DOCS";

type LeaseRow = {
  sourceFile: string;
  controlNumber: string;
  barCode: string;
  documentLink: string;
  date: string | null;
  property: string;
  unit: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  age: string;
  gender: string;
  mobile: string;
  email: string;
  company: string;
  address: string;
  rate: number | null;
  terms: string;
  rentalStart: string | null;
  rentalEnd: string | null;
  totalAmount: number | null;
  status: string;
  waterReading: string;
  electricReading: string;
  raw: Record<string, string>;
};

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
function toDateStr(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}
function parseRate(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}
function inferPropertyFromFile(fname: string): string {
  const up = fname.toUpperCase();
  if (up.includes("ADI")) return "ADI";
  if (up.includes("BNB") || up.includes("B&B")) return "BNB";
  if (up.includes("DREAM")) return "DREAM";
  if (up.includes("ECO")) return "ECO";
  if (up.includes("GREEN")) return "GREEN";
  if (up.includes("KALAYAAN")) return "KALAYAAN";
  if (up.includes("PLEASANT")) return "PLEASANT";
  if (up.includes("PENTHAUZ")) return "PENTHAUZ";
  if (up.includes("HOMEY")) return "HOMEY";
  if (up.includes("MONTHLY")) return "MONTHLY";
  return "UNKNOWN";
}
function findHeaderIdx(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().replace(/[:\n]/g, "").trim());
  for (const cand of candidates) {
    const c = cand.toLowerCase().replace(/[:\n]/g, "").trim();
    const idx = norm.findIndex((h) => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

async function main() {
  console.log("📂 Scanning", DOCS);
  const files = fs.readdirSync(DOCS).filter((f) => f.endsWith(".xlsx"));
  console.log(`Found ${files.length} xlsx files`);

  const allLeases: LeaseRow[] = [];
  const propUnits = new Map<string, Set<string>>();
  const propCounts = new Map<string, number>();

  const KNOWN_PROPS = ["ADI","BNB","DREAM","ECO","GREEN","KALAYAAN","PLEASANT","PENTHAUZ","HOMEY","MONTHLY","B&B"];
  for (const fname of files) {
    // Skip master monitoring — handled separately
    if (fname.toLowerCase().includes("monitoring")) continue;
    const fpath = path.join(DOCS, fname);
    try {
      const wb = XLSX.readFile(fpath, { cellDates: true });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];

      if (rows.length < 2) continue;
      const headerRow = rows[0] as string[];
      const headers = headerRow.map((h) => String(h || "").trim());
      // console.log(fname, headers.slice(0, 15));

      // Find column indexes with flexible matching
      const idxDoc = findHeaderIdx(headers, ["DOCUMENT LINK", "DOC LINK"]);
      const idxControl = findHeaderIdx(headers, ["CONTROL NUMBER"]);
      const idxBar = findHeaderIdx(headers, ["BAR CODE"]);
      const idxDate = findHeaderIdx(headers, ["DATE:"]);
      const idxFullName = findHeaderIdx(headers, ["FULLNAME", "FULLNAME:"]);
      const idxFirst = findHeaderIdx(headers, ["FIRSTNAME", "FIRSTNAME:"]);
      const idxLast = findHeaderIdx(headers, ["LAST NAME", "LAST NAME:"]);
      const idxMiddle = findHeaderIdx(headers, ["MIDDLE NAME"]);
      const idxAge = findHeaderIdx(headers, ["AGE:"]);
      const idxGender = findHeaderIdx(headers, ["GENDER"]);
      const idxUnit = findHeaderIdx(headers, ["Unit No.", "Room Letter", "Unit Number/Type", "Unit No.:"]);
      const idxTerms = findHeaderIdx(headers, ["TERMS", "Terms", "Type of Agreement", "PERIOD (DAYS)"]);
      const idxRate = findHeaderIdx(headers, ["RATE", "Rental Amount", "Monthly Rental Rate", "Rate per days"]);
      const idxTotal = findHeaderIdx(headers, ["TOTAL AMOUNT TO SETTLE", "Total Amount to Settle", "Total Amount Paid"]);
      const idxStart = findHeaderIdx(headers, ["RENTAL START", "Move-in Date", "Target Move-In Date"]);
      const idxEnd = findHeaderIdx(headers, ["RENTAL END", "End of Contract", "RENTAL END:"]);
      const idxMobile = findHeaderIdx(headers, ["MOBILE NUMBER", "CONTACT NUMBER", "Mobile Number", "Contact Number (Active"]);
      const idxEmail = findHeaderIdx(headers, ["EMAIL:", "EMAIL", "Email Address"]);
      const idxCompany = findHeaderIdx(headers, ["COMPANY:"]);
      const idxAddress = findHeaderIdx(headers, ["PERMANENT ADDRESS", "RECENT ADDRESS"]);
      const idxWater = findHeaderIdx(headers, ["WATER READING"]);
      const idxElectric = findHeaderIdx(headers, ["ELECTRIC READING"]);
      const idxStatus = findHeaderIdx(headers, ["STATUS"]);
      const idxProperty = findHeaderIdx(headers, ["Property:", "Property"]);

      const propFromFile = inferPropertyFromFile(fname);
      let count = 0;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] as unknown[];
        if (!r || r.every((c) => c === null || c === "")) continue;
        const control = normalize(r[idxControl] ?? r[1]);
        const fullName = normalize(r[idxFullName]);
        const unit = normalize(r[idxUnit]);
        // Skip header-like or empty
        if (!control && !fullName) continue;
        if (fullName.toLowerCase().includes("fullname")) continue;

        const firstName = normalize(r[idxFirst]);
        const lastName = normalize(r[idxLast]);
        const middleName = normalize(idxMiddle !== -1 ? r[idxMiddle] : "");
        const age = normalize(idxAge !== -1 ? r[idxAge] : "");
        const gender = normalize(idxGender !== -1 ? r[idxGender] : "");
        const mobile = normalize(r[idxMobile]);
        const email = normalize(r[idxEmail]);
        const company = normalize(r[idxCompany]);
        const address = normalize(idxAddress !== -1 ? r[idxAddress] : "");
        const terms = normalize(r[idxTerms]);
        const rate = parseRate(r[idxRate]);
        const total = parseRate(r[idxTotal]);
        const start = toDateStr(r[idxStart]);
        const end = toDateStr(r[idxEnd]);
        const status = normalize(r[idxStatus]) || "ACTIVE";
        const documentLink = normalize(idxDoc !== -1 ? r[idxDoc] : "");
        const barCode = normalize(idxBar !== -1 ? r[idxBar] : "");
        const dateStr = toDateStr(idxDate !== -1 ? r[idxDate] : "");
        const waterReading = normalize(idxWater !== -1 ? r[idxWater] : "");
        const electricReading = normalize(idxElectric !== -1 ? r[idxElectric] : "");
        const raw: Record<string, string> = {};
        headers.forEach((h, hi) => {
          const v = normalize(r[hi]);
          if (h && v) raw[h] = v;
        });
        let property = propFromFile;
        if (idxProperty !== -1) {
          const pv = normalize(r[idxProperty]);
          if (pv) {
            const up = pv.toUpperCase().trim();
            // Only overwrite if pv is a known property name (exact), not representative names
            const matched = KNOWN_PROPS.find((k) => up === k || up.startsWith(k + " ") || up.includes(` ${k} `));
            if (matched) property = matched === "B&B" ? "BNB" : matched;
            // otherwise keep filename inference
          }
        }

        // Track units
        if (property && unit) {
          if (!propUnits.has(property)) propUnits.set(property, new Set());
          propUnits.get(property)!.add(unit);
        }
        propCounts.set(property, (propCounts.get(property) || 0) + 1);

        allLeases.push({
          sourceFile: fname,
          controlNumber: control || `ROW-${i}`,
          barCode,
          documentLink,
          date: dateStr,
          property,
          unit: unit || "UNKNOWN",
          fullName: fullName || `${firstName} ${lastName}`.trim(),
          firstName: firstName || fullName.split(" ")[0] || "Unknown",
          lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
          middleName,
          age,
          gender,
          mobile,
          email,
          company,
          address,
          rate,
          terms,
          rentalStart: start,
          rentalEnd: end,
          totalAmount: total ?? rate,
          status,
          waterReading,
          electricReading,
          raw,
        });
        count++;
      }
      console.log(`  ${fname}: ${count} rows → property ${propFromFile}`);
    } catch (e) {
      console.error(`  ❌ ${fname}:`, (e as Error).message);
    }
  }

  // Also parse IT MONITORING 2026.xlsx for additional context
  const monitoring = path.join(DOCS, "IT MONITORING 2026.xlsx");
  if (fs.existsSync(monitoring)) {
    const wb = XLSX.readFile(monitoring, { cellDates: true });
    console.log(`\n=== IT MONITORING 2026: ${wb.SheetNames.join(", ")} ===`);
    for (const sh of wb.SheetNames) {
      const ws = wb.Sheets[sh];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
      if (rows.length < 3) continue;
      // Count non-empty tenant rows (col 1 = unit like 1-A, col 2 = name)
      let tenants = 0;
      for (let i = 2; i < rows.length; i++) {
        const r = rows[i] as unknown[];
        if (r && r[1] && String(r[1]).trim() && !String(r[1]).toLowerCase().includes("name")) tenants++;
      }
      console.log(`  ${sh}: ~${tenants} tenant rows`);
    }
  }

  console.log(`\n📊 Summary: ${allLeases.length} total leases/contracts parsed`);
  console.log("Properties breakdown:");
  for (const [prop, cnt] of [...propCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const units = propUnits.get(prop)?.size || 0;
    console.log(`  ${prop}: ${cnt} leases, ${units} distinct units (${[...(propUnits.get(prop) || [])].slice(0, 5).join(", ")}${units > 5 ? "..." : ""})`);
  }

  // Save JSON for fallback demo and for DB import
  const outDir = path.join(process.cwd(), "src/lib");
  const outPath = path.join(outDir, "eves-legacy-data.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    totalLeases: allLeases.length,
    properties: [...propUnits.entries()].map(([name, units]) => ({ name, units: [...units] })),
    leases: allLeases.slice(0, 500), // cap for JSON size, but full count above
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\n💾 Written ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB) with ${payload.leases.length} sample leases`);

  // Also write full CSV for inspection
  const csvPath = path.join(process.cwd(), "prisma/eves-import.csv");
  const header = ["controlNumber","documentLink","barCode","property","unit","fullName","firstName","lastName","mobile","email","rate","terms","rentalStart","rentalEnd","waterReading","electricReading","sourceFile"];
  const lines = [header.join(",")];
  for (const l of allLeases) {
    lines.push([l.controlNumber, `"${(l.documentLink||'').replace(/"/g,'""')}"`, l.barCode, l.property, l.unit, `"${l.fullName.replace(/"/g,'""')}"`, l.firstName, l.lastName, l.mobile, l.email, l.rate, `"${l.terms}"`, l.rentalStart, l.rentalEnd, l.waterReading, l.electricReading, l.sourceFile].join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n"));
  console.log(`💾 CSV ${csvPath} (${allLeases.length} rows)`);

  console.log("\n✅ Importer done. Next: wire fallback APIs to read eves-legacy-data.json or push to DB via prisma");
}
main().catch((e) => { console.error(e); process.exit(1); });
