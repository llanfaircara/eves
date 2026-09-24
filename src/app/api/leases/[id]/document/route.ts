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
    include: { tenant: true, unit: { include: { property: true } }, inspections: true },
  });
  if (!lease) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

  // Try stored file first (public/leases or /tmp — ephemeral on Vercel, so often missing)
  let buffer = await getLeasePdfBuffer(id);

  // Auto-regenerate if file missing OR status indicates failure/pending.
  // On Vercel /tmp is per-instance ephemeral, so missing file is expected even when
  // documentStatus=DRAFT_GENERATED. Generate on-demand instead of requiring ?retry=1.
  const shouldGenerate = !buffer || lease.documentStatus === "GENERATION_FAILED" || lease.documentStatus === "PENDING_GENERATION" || !lease.documentLink;
  // Respect explicit retry=0? No — if file missing, always generate. If file exists and retry=1, force regenerate.
  const forceRegen = retry;
  if (shouldGenerate || forceRegen) {
    try {
      // Re-fetch with inspections if we didn't already (lease already has them)
      const fresh = await generateLeasePDF(lease as never);
      // Best-effort cache to /tmp/public for this instance; failure to write is non-fatal
      await uploadLeasePdf(id, fresh).catch(() => {});
      // Keep documentLink as the API URL (not static /leases/*.pdf) so it works on Vercel read-only FS
      const apiUrl = `/api/leases/${id}/document`;
      if (lease.documentLink !== apiUrl || lease.documentStatus !== "DRAFT_GENERATED") {
        await prisma.lease.update({
          where: { id },
          data: { documentLink: apiUrl, documentStatus: "DRAFT_GENERATED" as never, documentError: null },
        }).catch(() => {});
      }
      buffer = fresh;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.lease.update({
        where: { id },
        data: { documentStatus: "GENERATION_FAILED" as never, documentError: msg.slice(0, 2000) },
      }).catch(() => {});
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
