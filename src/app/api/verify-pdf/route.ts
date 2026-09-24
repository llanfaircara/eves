import { NextResponse } from "next/server";
import { generateLeasePDF } from "@/lib/lease-pdf/generator";

export const dynamic = "force-dynamic";

// GET /api/verify-pdf — integration check: mock payload → PDF buffer → %PDF header
// No auth needed; for CI/build verification only. Remove or protect in production if desired.
export async function GET() {
  const mockLease = {
    id: "cuid_test_verify_001",
    contractType: "LONG_TERM",
    rentalStartDate: "2026-04-01",
    rentalEndDate: "2027-03-31",
    totalAmountToSettle: 85000,
    status: "PENDING",
    monthlyRent: 15000,
    securityDeposit: 15000,
    advanceDeposit: 15000,
    addons: [{ label: "Parking", amount: 2000 }],
    noticePeriodDays: 30,
    leaseIntent: "New Lease",
    leaseTerm: "1 Year",
    moveInDate: "2026-04-01",
    rentDueDate: "2026-04-05",
    documentLink: null,
    documentStatus: null,
    tenant: { firstName: "Juan", lastName: "Dela Cruz", email: "juan@example.com", mobileNumber: "09171234567", company: "Acme Corp" },
    unit: { unitNumber: "A-101", monthlyRate: 15000, property: { name: "BNB", address: "123 Main St" } },
  } as never;

  try {
    const start = Date.now();
    const buffer = await generateLeasePDF(mockLease);
    const header = buffer.subarray(0, 4).toString();
    const valid = header === "%PDF" && buffer.length > 5000;
    return NextResponse.json({
      ok: valid,
      header,
      bytes: buffer.length,
      ms: Date.now() - start,
      message: valid ? "Mock reservation payload → valid PDF" : "PDF invalid",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
