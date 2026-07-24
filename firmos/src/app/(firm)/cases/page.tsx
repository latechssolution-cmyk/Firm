import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser, canSeeFees } from "@/lib/auth";
import { deleteCase } from "@/lib/actions";
import { PageTitle, Badge, Card } from "@/components/ui";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DeleteButton } from "@/components/DeleteButton";

export default async function CasesPage({ searchParams }: { searchParams: { type?: string } }) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const type = searchParams.type;
  const cases = db.cases.filter((c) => (type ? c.type === type : true));
  const types = ["civil", "criminal", "family", "writ", "appeal"];

  return (
    <div>
      <PageTitle right={<div className="flex items-center gap-2"><GlobalSearch /><Link href="/cases/new" className="btn-primary themed rounded-md px-4 py-2 text-sm font-semibold no-underline">+ New case</Link></div>}>
        Cases <span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>({cases.length})</span>
      </PageTitle>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/cases" className={`nav-link themed !py-1 ${!type ? "active" : ""}`}>All</Link>
        {types.map((t) => (
          <Link key={t} href={`/cases?type=${t}`} className={`nav-link themed !py-1 capitalize ${type === t ? "active" : ""}`}>{t}</Link>
        ))}
      </div>

      <Card className="overflow-x-auto !p-0">
        <table>
          <thead>
            <tr><th>Case</th><th>Number</th><th>Court</th><th>Stage</th><th>Client</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {cases.slice(0, 100).map((c) => {
              const court = db.courts.find((ct) => ct.id === c.courtId);
              const client = db.clients.find((cl) => cl.id === c.clientId);
              return (
                <tr key={c.id}>
                  <td><Link href={`/cases/${c.id}`} className="font-semibold">{c.title}</Link></td>
                  <td className="whitespace-nowrap">{c.number}</td>
                  <td>{court?.name}{court?.bench ? ` (${court.bench})` : ""}</td>
                  <td>{c.stage}</td>
                  <td>{client?.name}</td>
                  <td><Badge tone={c.status === "active" ? "info" : c.status === "decided" ? "success" : "neutral"}>{c.status}</Badge></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/cases/${c.id}/edit`} className="themed btn-secondary rounded-md px-2.5 py-1 text-xs font-semibold no-underline">Edit</Link>
                      {canSeeFees(user) && <DeleteButton id={c.id} action={deleteCase} small confirm={`Delete "${c.title}" and all its records?`} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
