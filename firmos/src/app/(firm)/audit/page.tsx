import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle, Card, Badge } from "@/components/ui";

export default async function AuditPage({ searchParams }: { searchParams: { action?: string } }) {
  await requireUser(["admin"]);
  const db = await getDB();
  const filter = searchParams.action;
  const events = db.audit.filter((e) => (filter ? e.action === filter : true)).slice(0, 200);
  const actions = ["login", "view", "download", "edit", "create"];
  return (
    <div>
      <PageTitle>Audit Log</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <a href="/audit" className={`nav-link themed !py-1 ${!filter ? "active" : ""}`}>All</a>
        {actions.map((a) => (
          <a key={a} href={`/audit?action=${a}`} className={`nav-link themed !py-1 capitalize ${filter === a ? "active" : ""}`}>{a}</a>
        ))}
      </div>
      <Card className="overflow-x-auto !p-0">
        <table>
          <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs">{new Date(e.at).toLocaleString()}</td>
                <td>{e.userName ?? "—"}</td>
                <td><Badge tone={e.action === "download" ? "warning" : e.action === "edit" || e.action === "create" ? "info" : "neutral"}>{e.action}</Badge></td>
                <td>{e.entityType}: {e.entityId}</td>
                <td className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{e.detail ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
