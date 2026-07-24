import { notFound } from "next/navigation";
import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateCase } from "@/lib/actions";
import { Card, PageTitle, Button } from "@/components/ui";

export default async function EditCasePage({ params }: { params: { id: string } }) {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === params.id);
  if (!kase) notFound();

  return (
    <div className="max-w-2xl">
      <PageTitle right={<Link href={`/cases/${kase.id}`} className="text-sm">← Back to case</Link>}>Edit Case</PageTitle>
      <Card>
        <form action={updateCase} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={kase.id} />
          <label className="text-sm md:col-span-2">Title
            <input name="title" required defaultValue={kase.title} className="mt-1" />
          </label>
          <label className="text-sm">Case number
            <input name="number" required defaultValue={kase.number} className="mt-1" />
          </label>
          <label className="text-sm">Type
            <select name="type" defaultValue={kase.type} className="mt-1">
              <option value="civil">Civil suit</option>
              <option value="criminal">Criminal</option>
              <option value="family">Family</option>
              <option value="writ">Writ petition</option>
              <option value="appeal">Appeal / Revision</option>
            </select>
          </label>
          <label className="text-sm">Court
            <select name="courtId" defaultValue={kase.courtId} className="mt-1">
              {db.courts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.bench ? ` (${c.bench})` : ""} — {c.city}</option>)}
            </select>
          </label>
          <label className="text-sm">Client
            <select name="clientId" defaultValue={kase.clientId} className="mt-1">
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Plaintiff / Petitioner
            <input name="plaintiff" required defaultValue={kase.parties.plaintiff} className="mt-1" />
          </label>
          <label className="text-sm">Defendant / Respondent
            <input name="defendant" required defaultValue={kase.parties.defendant} className="mt-1" />
          </label>
          <label className="text-sm">Stage
            <input name="stage" defaultValue={kase.stage} className="mt-1" />
          </label>
          <label className="text-sm">Status
            <select name="status" defaultValue={kase.status} className="mt-1">
              <option value="active">Active</option>
              <option value="decided">Decided</option>
              <option value="dormant">Dormant</option>
            </select>
          </label>
          <label className="text-sm">FIR No.
            <input name="firNo" defaultValue={kase.firNo ?? ""} className="mt-1" />
          </label>
          <label className="text-sm">Sections (comma-separated)
            <input name="sections" defaultValue={(kase.sections ?? []).join(", ")} className="mt-1" />
          </label>
          <label className="text-sm">Limitation / deadline date
            <input type="date" name="limitationDate" defaultValue={kase.limitationDate ?? ""} className="mt-1" />
          </label>
          <div className="md:col-span-2"><Button kind="primary">Save changes</Button></div>
        </form>
      </Card>
    </div>
  );
}
