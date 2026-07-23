import { notFound } from "next/navigation";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setDocumentStatus, logDocumentView } from "@/lib/actions";
import { Card, PageTitle, Badge, Button, toneForDocStatus } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

export default async function DocumentDetail({ params }: { params: { id: string } }) {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const doc = db.documents.find((d) => d.id === params.id);
  if (!doc) notFound();
  await logDocumentView(doc.id); // every view is logged (PRD SEC-2)
  const kase = db.cases.find((c) => c.id === doc.caseId);

  return (
    <div className="max-w-3xl">
      <PageTitle right={<Badge tone={toneForDocStatus(doc.status)}>{doc.status}</Badge>}>{doc.title}</PageTitle>
      <div className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {kase && <>Case: <Link href={`/cases/${kase.id}`}>{kase.number}</Link> · </>}
        Visibility: {doc.visibility === "shared" ? "shared with client" : "firm only"} · Created {doc.createdAt.slice(0, 10)}
      </div>

      <Card>
        {doc.body
          ? <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{doc.body}</pre>
          : <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Uploaded scan — file stored in object storage (Supabase Storage in production).</p>}
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
      </div>
    </div>
  );
}
