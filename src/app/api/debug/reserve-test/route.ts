import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/debug/reserve-test — no auth, runs minimal reserve transaction to surface DB/storage errors
export async function GET() {
  const info: Record<string, unknown> = { env: { hasDb: !!process.env.DATABASE_URL, hasDirect: !!process.env.DIRECT_URL, node: process.version } };
  try {
    // 1. DB connectivity
    const propCount = await prisma.property.count();
    info.propCount = propCount;

    // 2. Try to find/create test property/unit (use unique test id)
    const testPropName = "DEBUG_PROP";
    let prop = await prisma.property.findFirst({ where: { name: testPropName } });
    if (!prop) {
      prop = await prisma.property.create({ data: { name: testPropName, address: "debug" } });
      info.createdProp = prop.id;
    } else {
      info.foundProp = prop.id;
    }

    const testUnitNumber = `DEBUG-${Date.now().toString().slice(-6)}`;
    let unit = await prisma.unit.create({
      data: { propertyId: prop.id, unitNumber: testUnitNumber, monthlyRate: 10000, status: "VACANT" },
    });
    info.unit = unit.id;

    // 3. Create tenant + lease
    const tenant = await prisma.tenant.create({
      data: { firstName: "Debug", lastName: "Tester", mobileNumber: "09170000000", email: `debug-${Date.now()}@example.com` },
    });
    info.tenant = tenant.id;

    const lease = await prisma.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        contractType: "LONG_TERM",
        rentalStartDate: new Date("2026-09-24"),
        rentalEndDate: new Date("2027-09-24"),
        totalAmountToSettle: 30000,
        status: "PENDING",
        monthlyRent: 10000,
        securityDeposit: 10000,
        advanceDeposit: 10000,
        addons: [],
        noticePeriodDays: 30,
        leaseIntent: "New Lease",
        leaseTerm: "1 Year",
        moveInDate: new Date("2026-09-24"),
        rentDueDate: new Date("2026-09-24"),
        documentStatus: "PENDING_GENERATION",
      },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    info.lease = lease.id;

    // 4. Generate PDF
    try {
      const { generateLeasePDF } = await import("@/lib/lease-pdf/generator");
      const buf = await generateLeasePDF(lease as never);
      info.pdf = { bytes: buf.length, header: buf.subarray(0, 4).toString() };
      // 5. Storage
      const { uploadLeasePdf } = await import("@/lib/storage");
      const { url } = await uploadLeasePdf(lease.id, buf);
      info.upload = url;
      await prisma.lease.update({ where: { id: lease.id }, data: { documentLink: url, documentStatus: "DRAFT_GENERATED" } });
    } catch (pdfErr) {
      info.pdfError = pdfErr instanceof Error ? pdfErr.stack?.slice(0, 2000) : String(pdfErr);
      await prisma.lease.update({ where: { id: lease.id }, data: { documentStatus: "GENERATION_FAILED", documentError: String(pdfErr).slice(0, 2000) } });
    }

    // cleanup
    await prisma.lease.delete({ where: { id: lease.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    await prisma.unit.delete({ where: { id: unit.id } });
    // keep prop

    return NextResponse.json({ ok: true, info });
  } catch (e) {
    const stack = e instanceof Error ? e.stack : String(e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg, stack: stack?.slice(0, 4000), info }, { status: 500 });
  }
}
