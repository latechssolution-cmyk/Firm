import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Download the finished PDF produced by the OCI worker. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const job = await getJob(params.id);
  const result = job?.result as { pdfBase64?: string } | null;
  if (!job || job.status !== "done" || !result?.pdfBase64) {
    return NextResponse.json({ error: "not ready" }, { status: 404 });
  }
  const pdf = Buffer.from(result.pdfBase64, "base64");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="firmos-${job.id}.pdf"`,
    },
  });
}
