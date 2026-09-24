import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Mock storage provider — writes PDFs to public/leases (served statically).
 * Swap to S3/Vercel Blob by replacing uploadPdf / getPdfUrl without changing callers.
 * Path traversal is blocked; only lease PDFs are accepted.
 */

const PUBLIC_LEASE_DIR = path.join(process.cwd(), "public", "leases");
const TMP_LEASE_DIR = path.join("/tmp", "eves-leases");
const PUBLIC_PREFIX = "/leases";

function safeFilename(leaseId: string): string {
  const id = leaseId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  if (!id) throw new Error("Invalid leaseId for storage");
  return `${id}.pdf`;
}

export async function uploadLeasePdf(leaseId: string, buffer: Buffer): Promise<{ url: string; key: string }> {
  if (!buffer || buffer.length < 100) throw new Error("Empty PDF buffer");
  if (buffer.subarray(0, 4).toString() !== "%PDF") throw new Error("Buffer is not a PDF");

  const filename = safeFilename(leaseId);
  // Try public dir first (local dev, serves statically), fallback to /tmp on Vercel (read-only FS)
  const candidates = [PUBLIC_LEASE_DIR, TMP_LEASE_DIR];
  let lastErr: unknown = null;
  for (const dir of candidates) {
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buffer);
      break;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  if (lastErr && !(await getLeasePdfBuffer(leaseId))) throw lastErr as Error;
  // Always return API-served URL (works on both dev and Vercel) plus static prefix
  // Document route serves from either location; static /leases/* only works locally
  const url = `/api/leases/${leaseId}/document`;
  return { url, key: filename };
}

export async function getLeasePdfBuffer(leaseId: string): Promise<Buffer | null> {
  const filename = safeFilename(leaseId);
  for (const dir of [PUBLIC_LEASE_DIR, TMP_LEASE_DIR]) {
    try {
      return await readFile(path.join(dir, filename));
    } catch {
      continue;
    }
  }
  return null;
}

export function getLeasePdfUrl(leaseId: string): string {
  return `${PUBLIC_PREFIX}/${safeFilename(leaseId)}`;
}
