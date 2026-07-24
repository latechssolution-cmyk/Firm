import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { recordPayment, sendFeeReminder, remindAllOverdue } from "@/lib/actions";
import { PageTitle, Card, Button, Stat, rupees } from "@/components/ui";
import { feeAnalytics } from "@/lib/insights";
import { IconFees } from "@/components/icons";

export default async function FeesPage() {
  await requireUser(["admin", "associate"]);
  const db = await getDB();
  const fa = feeAnalytics(db);

  const perCase = db.cases
    .map((c) => {
      const fees = db.fees.filter((f) => f.caseId === c.id);
      const agreed = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
      const received = fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
      return { c, agreed, received, balance: agreed - received };
    })
    .filter((r) => r.agreed > 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <PageTitle right={
        <form action={remindAllOverdue}>
          <Button kind="secondary">Remind all overdue ({fa.casesWithBalance})</Button>
        </form>
      }>
        Fees &amp; Billing
      </PageTitle>

      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat featured label="Received" value={rupees(fa.received)} sub={`${fa.collectionRate}% of agreed`} icon={<IconFees size={18} />} />
        <Stat label="Agreed" value={rupees(fa.agreed)} />
        <Stat label="Pending" value={rupees(fa.pending)} tone="warning" sub={`${fa.casesWithBalance} cases`} />
        <Stat label="Collection rate" value={`${fa.collectionRate}%`} tone={fa.collectionRate >= 70 ? "success" : "warning"} />
      </div>

      <Card className="overflow-x-auto !p-0">
        <table>
          <thead><tr><th>Case</th><th>Client</th><th>Agreed</th><th>Received</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            {perCase.map(({ c, agreed, received, balance }) => {
              const client = db.clients.find((cl) => cl.id === c.clientId);
              return (
                <tr key={c.id}>
                  <td><Link href={`/cases/${c.id}`} className="font-semibold">{c.title}</Link><div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{c.number}</div></td>
                  <td>{client?.name}</td>
                  <td>{rupees(agreed)}</td>
                  <td>{rupees(received)}</td>
                  <td className="font-bold" style={{ color: balance > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{rupees(balance)}</td>
                  <td>
                    {balance > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={recordPayment} className="flex items-center gap-1">
                          <input type="hidden" name="caseId" value={c.id} />
                          <input name="amount" type="number" min={1} max={balance} placeholder="Amount" className="!w-24 !py-1 text-xs" aria-label="Payment amount" />
                          <select name="method" className="!w-auto !py-1 text-xs" aria-label="Method">
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="gateway">Gateway</option>
                          </select>
                          <Button kind="secondary">Record</Button>
                        </form>
                        <form action={sendFeeReminder}>
                          <input type="hidden" name="caseId" value={c.id} />
                          <Button kind="secondary">Remind</Button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Online payment (PayFast/Kuickpay checkout &amp; payment links) activates when gateway credentials are configured — Settings → Integrations. Reminders queue to WhatsApp/SMS.
      </p>
    </div>
  );
}
