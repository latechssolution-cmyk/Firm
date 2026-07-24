import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createCase } from "@/lib/actions";
import { Card, PageTitle } from "@/components/ui";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { ConflictCheck } from "@/components/ConflictCheck";

export default async function NewCasePage() {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  return (
    <div className="max-w-2xl">
      <PageTitle right={<Link href="/cases" className="text-sm">← All cases</Link>}>New Case</PageTitle>
      <Card>
        <form action={createCase} className="grid gap-4 md:grid-cols-2">
          <Field label="Case title" required className="md:col-span-2">
            <input name="title" required placeholder="e.g. Akhtar vs. State" />
          </Field>
          <Field label="Case number" required>
            <input name="number" required placeholder="e.g. Crl. Misc. No. 1234-B/2026" />
          </Field>
          <Field label="Case type" required>
            <select name="type">
              <option value="civil">Civil suit (CPC 1908)</option>
              <option value="criminal">Criminal (CrPC/PPC)</option>
              <option value="family">Family (FCA 1964)</option>
              <option value="writ">Writ petition (Art. 199)</option>
              <option value="appeal">Appeal / Revision</option>
            </select>
          </Field>
          <Field label="Court">
            <select name="courtId">
              {db.courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.bench ? ` (${c.bench})` : ""} — {c.city}</option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <select name="clientId">
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Plaintiff / Petitioner" required>
            <input name="plaintiff" required />
          </Field>
          <Field label="Defendant / Respondent" required>
            <input name="defendant" required />
          </Field>
          <Field label="Current stage" hint="Leave blank to default to 'Instituted'">
            <input name="stage" placeholder="e.g. Plaint filed" />
          </Field>
          <Field label="FIR No." hint="Criminal matters only">
            <input name="firNo" placeholder="e.g. 412/2026" />
          </Field>
          <Field label="Sections" hint="Comma-separated statute references" className="md:col-span-2">
            <input name="sections" placeholder="e.g. 302/34 PPC" />
          </Field>
          <ConflictCheck />
          <div className="md:col-span-2"><SubmitButton>Create case</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
