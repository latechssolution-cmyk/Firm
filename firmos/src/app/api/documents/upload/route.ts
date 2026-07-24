import { NextRequest, NextResponse } from "next/server";
import { getDB, persist, uid, uploadScan, enqueueJob, audit, STORAGE_BUCKET_NAME } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { CaseDocument } from "@/lib/db/types";

export const runtime = "nodejs";
// Kept under Vercel's ~4.5 MB serverless request-body limit. Larger scans would
// use a signed direct-to-Storage upload URL (future enhancement).
const MAX_BYTES = 4 * 1024 * 1024;

/** Upload a scanned document → Storage, create a Document, enqueue OCR (images). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const caseId = String(form.get("caseId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "file empty or too large (max 4 MB)" }, { status: 400 });

  const db = await getDB();
  const kase = db.cases.find((c) => c.id === caseId);
  if (!kase) return NextResponse.json({ error: "case not found" }, { status: 404 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `${caseId}/${uid("f")}-${safeName}`;
  const stored = await uploadScan(path, await file.arrayBuffer(), file.type || "application/octet-stream");
  if (!stored) return NextResponse.json({ error: "storage not configured or upload failed" }, { status: 503 });

  const isImage = /^image\//.test(file.type);
  const docId = uid("d");
  // OCR runs on images (Tesseract). PDFs/others are stored & searchable by title only.
  const jobId = isImage ? await enqueueJob("ocr", { bucket: STORAGE_BUCKET_NAME, filePath: path, docId }) : null;

  const doc: CaseDocument = {
    id: docId, caseId, kind: "uploaded", title: title || file.name,
    status: "filed", visibility: "firm",
    fileRef: path, fileType: file.type,
    ocrStatus: isImage ? "pending" : "none", ocrJobId: jobId ?? undefined,
    createdBy: user.id, createdAt: new Date().toISOString(),
  };
  db.documents.unshift(doc);
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "document", entityId: doc.title, detail: isImage ? "Scan uploaded — OCR queued" : "File uploaded" });
  await persist();

  return NextResponse.json({ docId, jobId, ocr: isImage });
}
