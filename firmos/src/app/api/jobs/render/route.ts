import { NextRequest, NextResponse } from "next/server";
import { getDB, enqueueJob, audit } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Enqueue a high-fidelity PDF render of a document on the OCI worker. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { docId } = (await req.json()) as { docId: string };
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === docId);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const esc = (doc.body ?? doc.title).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const html = `<html><head><meta charset="utf-8"><style>body{font-family:serif;white-space:pre-wrap;font-size:12pt;line-height:1.5;margin:2cm}</style></head><body>${esc}</body></html>`;
  const jobId = await enqueueJob("pdf", { html });
  if (!jobId) return NextResponse.json({ error: "worker unavailable (Supabase not configured)" }, { status: 503 });
  await audit({ userId: user.id, userName: user.name, action: "create", entityType: "job", entityId: doc.title, detail: `PDF render queued (${jobId})` });
  return NextResponse.json({ jobId });
}
