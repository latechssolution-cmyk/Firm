import { notFound } from "next/navigation";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setDocumentStatus, logDocumentView, deleteDocument } from "@/lib/actions";
import { Card, PageTitle, Badge, Button, toneForDocStatus } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { PrintButton } from "@/components/PrintButton";
import { WorkerRender } from "@/components/WorkerRender";
import { supabaseConfigured, signedScanUrl } from "@/lib/db";

export default async function DocumentDetail({ params }: { params: { id: string } }) {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === params.id);
  if (!doc) notFound();
  await logDocumentView(doc.id); // every view is logged (PRD SEC-2)
  const kase = db.cases.find((c) => c.id === doc.caseId);
  const fileUrl = doc.fileRef ? await signedScanUrl(doc.fileRef) : null;

  return (
    <div className="max-w-3xl">
      <PageTitle right={<Badge tone={toneForDocStatus(doc.status)}>{doc.status}</Badge>}>{doc.title}</PageTitle>
      <div className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {kase && <>Case: <Link href={`/cases/${kase.id}`}>{kase.number}</Link> · </>}
        Visibility: {doc.visibility === "shared" ? "shared with client" : "firm only"} · Created {doc.createdAt.slice(0, 10)}
      </div>

      <Card>
        {doc.body ? (
          <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{doc.body}</pre>
        ) : doc.kind === "uploaded" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {fileUrl
                ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="themed btn-secondary rounded-full px-4 py-2 font-semibold no-underline">↓ View / download scan</a>
                : <span style={{ color: "var(--color-text-secondary)" }}>Stored file (link unavailable).</span>}
              {doc.ocrStatus === "done" && <Badge tone="success">OCR complete</Badge>}
              {doc.ocrStatus === "pending" && <Badge tone="warning">OCR in progress</Badge>}
              {doc.ocrStatus === "failed" && <Badge tone="danger">OCR failed</Badge>}
              {doc.ocrStatus === "none" && <Badge tone="info">stored (no OCR)</Badge>}
            </div>
            {doc.ocrText && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Extracted text · searchable</div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-sm leading-relaxed" style={{ background: "var(--color-muted-bg)" }}>{doc.ocrText}</pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No content.</p>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PrintButton />
        <form action={setDocumentStatus} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="docId" value={doc.id} />
          <select name="status" defaultValue={doc.status} className="!w-auto">
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="filed">Filed</option>
          </select>
          <select name="visibility" defaultValue={doc.visibility} className="!w-auto">
            <option value="firm">Firm only</option>
            <option value="shared">Share with client</option>
          </select>
          <Button kind="primary">Update</Button>
        </form>
        <div className="ml-auto"><DeleteButton id={doc.id} action={deleteDocument} confirm={`Delete "${doc.title}"?`} /></div>
      </div>

      {doc.body && (
        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            High-fidelity render · OCI worker
          </div>
          <WorkerRender docId={doc.id} workerConfigured={supabaseConfigured()} />
        </div>
      )}
    </div>
  );
}
