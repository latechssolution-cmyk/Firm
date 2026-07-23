import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Poll a worker job's status/result (PRD §4.3). Staff only. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const job = await getJob(params.id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Never ship the full base64 in the poll; expose a ready flag + size.
  const result = job.result as { pdfBase64?: string; bytes?: number } | null;
  return NextResponse.json({
    id: job.id, status: job.status, error: job.error,
    ready: job.status === "done" && !!result?.pdfBase64,
    bytes: result?.bytes ?? null,
  });
}
