import { notFound } from "next/navigation";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateCase } from "@/lib/actions";
import { Card, PageTitle } from "@/components/ui";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditCasePage({ params }: { params: { id: string } }) {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === params.id);
  if (!kase) notFound();

  return (
    <div className="max-w-2xl">
      <PageTitle right={<Link href={`/cases/${kase.id}`} className="text-sm">← Back to case</Link>}>Edit Case</PageTitle>
      <Card>
        <form action={updateCase} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={kase.id} />
          <Field label="Case title" required className="md:col-span-2">
            <input name="title" required defaultValue={kase.title} />
          </Field>
          <Field label="Case number" required>
            <input name="number" required defaultValue={kase.number} />
          </Field>
          <Field label="Case type">
            <select name="type" defaultValue={kase.type}>
              <option value="civil">Civil suit</option>
              <option value="criminal">Criminal</option>
              <option value="family">Family</option>
              <option value="writ">Writ petition</option>
              <option value="appeal">Appeal / Revision</option>
            </select>
          </Field>
          <Field label="Court">
            <select name="courtId" defaultValue={kase.courtId}>
              {db.courts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.bench ? ` (${c.bench})` : ""} — {c.city}</option>)}
            </select>
          </Field>
          <Field label="Client">
            <select name="clientId" defaultValue={kase.clientId}>
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Plaintiff / Petitioner" required>
            <input name="plaintiff" required defaultValue={kase.parties.plaintiff} />
          </Field>
          <Field label="Defendant / Respondent" required>
            <input name="defendant" required defaultValue={kase.parties.defendant} />
          </Field>
          <Field label="Current stage">
            <input name="stage" defaultValue={kase.stage} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={kase.status}>
              <option value="active">Active</option>
              <option value="decided">Decided</option>
              <option value="dormant">Dormant</option>
            </select>
          </Field>
          <Field label="FIR No.">
            <input name="firNo" defaultValue={kase.firNo ?? ""} />
          </Field>
          <Field label="Sections" hint="Comma-separated">
            <input name="sections" defaultValue={(kase.sections ?? []).join(", ")} />
          </Field>
          <Field label="Limitation / deadline date">
            <input type="date" name="limitationDate" defaultValue={kase.limitationDate ?? ""} />
          </Field>
          <div className="md:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
