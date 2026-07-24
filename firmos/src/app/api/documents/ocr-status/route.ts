import { NextRequest, NextResponse } from "next/server";
import { getDB, getJob, persist } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Polled by the uploader. Checks the OCR job and, when the worker has finished,
 * writes the extracted text into the document (ocrText) so global search finds
 * it. Idempotent — safe to call repeatedly.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { docId } = (await req.json()) as { docId: string };
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === docId);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Already finalized.
  if (doc.ocrStatus === "done" || doc.ocrStatus === "failed" || doc.ocrStatus === "none") {
    return NextResponse.json({ status: doc.ocrStatus, chars: doc.ocrText?.length ?? 0 });
  }
  if (!doc.ocrJobId) return NextResponse.json({ status: doc.ocrStatus ?? "none", chars: 0 });

  const job = await getJob(doc.ocrJobId);
  if (!job) return NextResponse.json({ status: "pending", chars: 0 });

  if (job.status === "done") {
    const result = job.result as { text?: string; chars?: number } | null;
    doc.ocrText = result?.text ?? "";
    doc.ocrStatus = "done";
    await persist();
    revalidatePath(`/cases/${doc.caseId}`);
    revalidatePath(`/documents/${doc.id}`);
    return NextResponse.json({ status: "done", chars: doc.ocrText.length });
  }
  if (job.status === "failed") {
    doc.ocrStatus = "failed";
    await persist();
    return NextResponse.json({ status: "failed", error: job.error, chars: 0 });
  }
  return NextResponse.json({ status: job.status === "claimed" ? "running" : "pending", chars: 0 });
}
