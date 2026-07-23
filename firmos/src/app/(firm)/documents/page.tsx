import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle, Card, Badge, toneForDocStatus } from "@/components/ui";
import { TEMPLATES } from "@/lib/templates";

export default function DocumentsPage() {
  requireUser(["admin", "associate", "clerk"]);
  const db = getDB();
  return (
    <div>
      <PageTitle right={<Link href="/documents/generate" className="btn-primary themed rounded-md px-4 py-2 text-sm font-semibold no-underline">+ Generate from template</Link>}>
        Documents
      </PageTitle>

      <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {TEMPLATES.map((t) => (
          <Link key={t.id} href={`/documents/generate?template=${t.id}`} className="no-underline">
            <Card className="h-full">
              <div className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.name}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>{t.description}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="overflow-x-auto !p-0">
        <table>
          <thead><tr><th>Title</th><th>Case</th><th>Kind</th><th>Status</th><th>Visibility</th><th>Created</th></tr></thead>
          <tbody>
            {db.documents.map((d) => {
              const kase = db.cases.find((c) => c.id === d.caseId);
              return (
                <tr key={d.id}>
                  <td><Link href={`/documents/${d.id}`} className="font-semibold">{d.title}</Link></td>
                  <td>{kase ? <Link href={`/cases/${kase.id}`}>{kase.number}</Link> : "—"}</td>
                  <td>{d.kind}</td>
                  <td><Badge tone={toneForDocStatus(d.status)}>{d.status}</Badge></td>
                  <td>{d.visibility === "shared" ? <Badge tone="info">shared with client</Badge> : <span style={{ color: "var(--color-text-secondary)" }}>firm only</span>}</td>
                  <td className="whitespace-nowrap">{d.createdAt.slice(0, 10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
