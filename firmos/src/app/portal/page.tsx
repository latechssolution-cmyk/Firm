import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { Card, Badge, rupees, Empty, toneForDocStatus } from "@/components/ui";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import Link from "next/link";

export default async function PortalPage() {
  const user = await requireUser(["client"]);
  const db = await getDB();
  // RBAC scoping: a client sees ONLY their own cases (PRD CP-1).
  const myCases = db.cases.filter((c) => c.clientId === user.clientId);

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div>
          <div className="font-bold">{db.firm.name} — Client Portal</div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{user.name} · read-only · secure login</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action={logout}><button className="themed rounded-md px-3 py-1.5 text-sm btn-secondary">Sign out</button></form>
        </div>
      </div>

      {myCases.length === 0 && <Card><Empty>No cases on file.</Empty></Card>}

      <div className="flex flex-col gap-4">
        {myCases.map((kase) => {
          const court = db.courts.find((ct) => ct.id === kase.courtId);
          const hearings = db.hearings.filter((h) => h.caseId === kase.id).sort((a, b) => b.date.localeCompare(a.date));
          const next = hearings.filter((h) => !h.outcomeNote && h.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))[0];
          const sharedDocs = db.documents.filter((d) => d.caseId === kase.id && d.visibility === "shared");
          const fees = db.fees.filter((f) => f.caseId === kase.id);
          const balance = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0) - fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);

          return (
            <Card key={kase.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{kase.title}</h2>
                <Badge tone={kase.status === "active" ? "info" : "success"}>{kase.status}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md p-3" style={{ background: "var(--color-muted-bg)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Case status</div>
                  <div className="mt-1 text-sm font-bold">{kase.stage}</div>
                </div>
                <div className="rounded-md p-3" style={{ background: "var(--color-muted-bg)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Next hearing</div>
                  <div className="mt-1 text-sm font-bold">{next ? `${next.date}${next.time ? ` · ${next.time}` : ""}` : "—"}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{court?.name}{court?.room ? ` · ${court.room}` : ""}</div>
                </div>
                <div className="rounded-md p-3" style={{ background: "var(--color-muted-bg)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Balance due</div>
                  <div className="mt-1 text-sm font-bold" style={{ color: balance > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{rupees(Math.max(balance, 0))}</div>
                  {balance > 0 && <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Online payment available when gateway is enabled</div>}
                </div>
              </div>

              <h3 className="mb-2 mt-4 text-sm font-bold">Case timeline <span className="font-normal" style={{ color: "var(--color-text-secondary)" }}>· updated after every hearing</span></h3>
              <div className="flex flex-col gap-1">
                {hearings.filter((h) => h.outcomeNote).slice(0, 6).map((h) => (
                  <div key={h.id} className="flex items-start gap-2 text-sm">
                    <span style={{ color: "var(--color-success)" }}>✓</span>
                    <div>
                      <span className="font-semibold">{h.outcomeNote}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>{h.date}</span>
                    </div>
                  </div>
                ))}
                {hearings.filter((h) => h.outcomeNote).length === 0 && <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No updates yet.</span>}
              </div>

              {sharedDocs.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-bold">Documents shared with you</h3>
                  <div className="flex flex-col gap-1">
                    {sharedDocs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>{d.title}</span>
                        <Badge tone={toneForDocStatus(d.status)}>{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
        You see only your own case — nothing else. Every view is logged. · <Link href="/reception">Contact the chambers</Link>
      </p>
    </main>
  );
}
