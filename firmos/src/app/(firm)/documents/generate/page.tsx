import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateDocument } from "@/lib/actions";
import { Card, PageTitle, Button } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TEMPLATES } from "@/lib/templates";

export default async function GeneratePage({ searchParams }: { searchParams: { template?: string; caseId?: string } }) {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const template = TEMPLATES.find((t) => t.id === searchParams.template) ?? TEMPLATES[0];
  const kase = db.cases.find((c) => c.id === searchParams.caseId) ?? db.cases[0];
  const client = db.clients.find((cl) => cl.id === kase.clientId);
  const court = db.courts.find((ct) => ct.id === kase.courtId);
  const body = template.render(kase, client, court, db.firm.name);

  return (
    <div className="max-w-3xl">
      <PageTitle>Generate Document</PageTitle>
      <Card>
        <form method="get" className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">Template
            <select name="template" defaultValue={template.id} className="mt-1">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Case
            <select name="caseId" defaultValue={kase.id} className="mt-1">
              {db.cases.slice(0, 40).map((c) => <option key={c.id} value={c.id}>{c.number} — {c.title}</option>)}
            </select>
          </label>
          <div className="md:col-span-2"><Button kind="secondary">Refill from case data</Button></div>
        </form>

        <form action={generateDocument}>
          <input type="hidden" name="caseId" value={kase.id} />
          <input type="hidden" name="templateType" value={template.id} />
          <input type="hidden" name="title" value={`${template.name} — ${kase.number}`} />
          <label className="text-sm">Draft (auto-filled from case &amp; client fields — edit freely)
            <textarea name="body" rows={20} defaultValue={body} className="mt-1 font-mono text-xs" />
          </label>
          <div className="mt-3"><SubmitButton>Save as draft</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
