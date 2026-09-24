import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLeasePDF } from "@/lib/lease-pdf/generator";
import { uploadLeasePdf, getLeasePdfBuffer } from "@/lib/storage";

export const dynamic = "force-dynamic";

// GET /api/leases/:id/document?retry=1&download=1
// Auth required (MANAGER/ADMIN or EMPLOYEE). Serves PDF inline, or regenerates if missing/failed and retry=1.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const retry = url.searchParams.get("retry") === "1";
  const download = url.searchParams.get("download") === "1";

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: { tenant: true, unit: { include: { property: true } } },
  });
  if (!lease) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

  // Try stored file first
  let buffer = await getLeasePdfBuffer(id);

  // If missing and retry requested, or documentStatus is FAILED, regenerate
  if ((!buffer || lease.documentStatus === "GENERATION_FAILED") && retry) {
    try {
      const fresh = await generateLeasePDF(lease as never);
      await uploadLeasePdf(id, fresh);
      await prisma.lease.update({
        where: { id },
        data: { documentLink: `/leases/${id}.pdf`, documentStatus: "DRAFT_GENERATED" as never, documentError: null },
      });
      buffer = fresh;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.lease.update({
        where: { id },
        data: { documentStatus: "GENERATION_FAILED" as never, documentError: msg.slice(0, 2000) },
      });
      return NextResponse.json({ error: "Regeneration failed", details: msg }, { status: 500 });
    }
  }

  if (!buffer) {
    return NextResponse.json(
      {
        error: "Document not yet generated",
        documentStatus: lease.documentStatus,
        documentLink: lease.documentLink,
        retryUrl: `/api/leases/${id}/document?retry=1`,
      },
      { status: 404 }
    );
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="EVES-Lease-${lease.unit.unitNumber}-${lease.tenant.lastName}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=300",
    },
  });
}
