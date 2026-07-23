import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createCase } from "@/lib/actions";
import { Card, PageTitle, Button } from "@/components/ui";

export default function NewCasePage() {
  requireUser(["admin", "associate", "clerk"]);
  const db = getDB();
  return (
    <div className="max-w-2xl">
      <PageTitle>New Case</PageTitle>
      <Card>
        <form action={createCase} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">Title
            <input name="title" required placeholder="e.g. Akhtar vs. State" className="mt-1" />
          </label>
          <label className="text-sm">Case number
            <input name="number" required placeholder="e.g. Crl. Misc. No. 1234-B/2026" className="mt-1" />
          </label>
          <label className="text-sm">Type
            <select name="type" className="mt-1">
              <option value="civil">Civil suit (CPC 1908)</option>
              <option value="criminal">Criminal (CrPC/PPC)</option>
              <option value="family">Family (FCA 1964)</option>
              <option value="writ">Writ petition (Art. 199)</option>
              <option value="appeal">Appeal / Revision</option>
            </select>
          </label>
          <label className="text-sm">Court
            <select name="courtId" className="mt-1">
              {db.courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.bench ? ` (${c.bench})` : ""} — {c.city}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Client
            <select name="clientId" className="mt-1">
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Plaintiff / Petitioner
            <input name="plaintiff" required className="mt-1" />
          </label>
          <label className="text-sm">Defendant / Respondent
            <input name="defendant" required className="mt-1" />
          </label>
          <label className="text-sm">Stage
            <input name="stage" placeholder="e.g. Plaint filed" className="mt-1" />
          </label>
          <label className="text-sm">FIR No. (criminal only)
            <input name="firNo" placeholder="e.g. 412/2026" className="mt-1" />
          </label>
          <label className="text-sm md:col-span-2">Sections (comma-separated)
            <input name="sections" placeholder="e.g. 302/34 PPC" className="mt-1" />
          </label>
          <div className="md:col-span-2"><Button kind="primary">Create case</Button></div>
        </form>
      </Card>
    </div>
  );
}
