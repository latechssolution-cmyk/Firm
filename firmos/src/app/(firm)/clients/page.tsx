import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { ClientsManager } from "@/components/ClientsManager";

export default async function ClientsPage() {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const clients = db.clients.map((cl) => ({
    id: cl.id, name: cl.name, cnic: cl.cnic, phone: cl.phone, address: cl.address,
    languagePref: cl.languagePref,
    caseCount: db.cases.filter((c) => c.clientId === cl.id && c.status === "active").length,
  }));
  return (
    <div>
      <PageTitle>Clients <span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>({clients.length})</span></PageTitle>
      <ClientsManager clients={clients} />
    </div>
  );
}
