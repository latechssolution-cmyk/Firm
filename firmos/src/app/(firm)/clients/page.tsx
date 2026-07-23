import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle, Card } from "@/components/ui";

export default async function ClientsPage() {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  return (
    <div>
      <PageTitle>Clients</PageTitle>
      <Card className="overflow-x-auto !p-0">
        <table>
          <thead><tr><th>Name</th><th>CNIC</th><th>Phone</th><th>Language</th><th>Active cases</th></tr></thead>
          <tbody>
            {db.clients.map((cl) => {
              const cases = db.cases.filter((c) => c.clientId === cl.id && c.status === "active");
              return (
                <tr key={cl.id}>
                  <td className="font-semibold">{cl.name}</td>
                  <td>{cl.cnic ?? "—"}</td>
                  <td>{cl.phone}</td>
                  <td className="uppercase">{cl.languagePref}</td>
                  <td>
                    {cases.slice(0, 3).map((c) => (
                      <Link key={c.id} href={`/cases/${c.id}`} className="mr-2">{c.number}</Link>
                    ))}
                    {cases.length > 3 && <span style={{ color: "var(--color-text-secondary)" }}>+{cases.length - 3} more</span>}
                    {cases.length === 0 && <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
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
