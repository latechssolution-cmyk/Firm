import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/db";
import { requireUser, canSeeFees } from "@/lib/auth";
import { recordHearing } from "@/lib/actions";
import { Card, PageTitle, Badge, Button, toneForDocStatus, rupees, Empty } from "@/components/ui";
import { CaseSummary } from "@/components/CaseSummary";
import { IconClock, IconSparkle } from "@/components/icons";
import { caseDeadlines, caseAgeDays, nextHearing, isStale, suggestNextStage, stageFlow } from "@/lib/insights";

export default async function CaseDetail({ params }: { params: { id: string } }) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === params.id);
  if (!kase) notFound();
  const court = db.courts.find((ct) => ct.id === kase.courtId);
  const client = db.clients.find((cl) => cl.id === kase.clientId);
  const hearings = db.hearings.filter((h) => h.caseId === kase.id).sort((a, b) => b.date.localeCompare(a.date));
  const docs = db.documents.filter((d) => d.caseId === kase.id);
  const fees = db.fees.filter((f) => f.caseId === kase.id);
  const agreed = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const received = fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  const thread = db.cases.filter((c) => c.matterThreadId === kase.matterThreadId && c.id !== kase.id);

  const deadlines = caseDeadlines(db, kase);
  const next = nextHearing(db, kase.id);
  const age = caseAgeDays(kase);
  const stale = isStale(db, kase);
  const suggested = suggestNextStage(kase.type, kase.stage);

  const deadlineTone = (d: number) => (d < 0 ? "danger" : d <= 5 ? "danger" : d <= 14 ? "warning" : "info") as "danger" | "warning" | "info";

  return (
    <div>
      <PageTitle right={<Badge tone={kase.status === "active" ? "info" : "success"}>{kase.status}</Badge>}>
        {kase.title}
      </PageTitle>
      <div className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {kase.number} · {court?.name}{court?.bench ? ` (${court.bench})` : ""}{court?.room ? ` · ${court.room}` : ""} · Stage: <span style={{ color: "var(--color-text-primary)" }}>{kase.stage}</span>
        {kase.firNo && <> · FIR {kase.firNo}{kase.policeStation ? `, ${kase.policeStation}` : ""}</>}
        {kase.sections && kase.sections.length > 0 && <> · u/s {kase.sections.join(", ")}</>}
      </div>

      {thread.length > 0 && (
        <div className="mb-4 text-sm">
          Matter thread:{" "}
          {thread.map((t) => (
            <Link key={t.id} href={`/cases/${t.id}`} className="mr-2">{t.number} ({t.status})</Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-bold"><IconSparkle size={18} /> Case Brief</h2>
            <CaseSummary caseId={kase.id} />
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Hearing Timeline</h2>
            {hearings.length === 0 && <Empty>No hearings recorded.</Empty>}
            <div className="flex flex-col gap-2">
              {hearings.map((h) => (
                <div key={h.id} className="rounded-md border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{h.date}{h.time ? ` · ${h.time}` : ""} — {h.purpose}</span>
                    {!h.outcomeNote && <Badge tone={h.readiness === "ready" ? "success" : "warning"}>{h.readiness === "ready" ? "File ready" : "Upcoming"}</Badge>}
                  </div>
                  {h.outcomeNote && <div className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>{h.outcomeNote}{h.nextDate ? ` — next date ${h.nextDate}` : ""}</div>}
                </div>
              ))}
            </div>

            <h3 className="mb-2 mt-5 font-bold">Record hearing outcome</h3>
            <p className="mb-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              One entry updates the diary, the client portal timeline, and queues the client notification (PRD CM-6).
            </p>
            <form action={recordHearing} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="caseId" value={kase.id} />
              <label className="text-sm md:col-span-2">Outcome
                <textarea name="outcome" required rows={2} placeholder="e.g. Arguments heard; order reserved" className="mt-1" />
              </label>
              <label className="text-sm">Purpose
                <input name="purpose" placeholder="e.g. Arguments" className="mt-1" />
              </label>
              <label className="text-sm">Next date
                <input type="date" name="nextDate" className="mt-1" />
              </label>
              <label className="text-sm md:col-span-2">
                Case stage after this hearing
                <select name="newStage" defaultValue="" className="mt-1">
                  <option value="">Keep &quot;{kase.stage}&quot;</option>
                  {suggested && <option value={suggested}>→ Advance to: {suggested} (suggested)</option>}
                  {stageFlow(kase.type).filter((s) => s !== kase.stage && s !== suggested).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2"><Button kind="primary">Save hearing</Button></div>
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-bold"><IconClock size={18} /> Case Health</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--color-text-secondary)" }}>Age</span><span>{age} days</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--color-text-secondary)" }}>Next hearing</span><span>{next ? `${next.date}${next.time ? ` · ${next.time}` : ""}` : "—"}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--color-text-secondary)" }}>Hearings held</span><span>{hearings.filter((h) => h.outcomeNote).length}</span></div>
              {stale && <div className="mt-1"><Badge tone="warning">Stale — no date scheduled</Badge></div>}
            </div>
            {deadlines.length > 0 && (
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Deadlines</div>
                <div className="flex flex-col gap-1.5">
                  {deadlines.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span>{d.label}<span className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>{d.date}</span></span>
                      <Badge tone={deadlineTone(d.daysLeft)}>{d.daysLeft < 0 ? `${-d.daysLeft}d overdue` : `${d.daysLeft}d left`}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">Client</h2>
            <div className="text-sm">{client?.name}</div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {client?.cnic && <>CNIC {client.cnic} · </>}{client?.phone}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">Documents</h2>
              <Link href={`/documents/generate?caseId=${kase.id}`} className="text-sm">+ Generate</Link>
            </div>
            {docs.length === 0 && <Empty>None yet.</Empty>}
            <div className="flex flex-col gap-2">
              {docs.map((d) => (
                <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center justify-between gap-2 text-sm no-underline" style={{ color: "var(--color-text-primary)" }}>
                  <span className="truncate underline">{d.title}</span>
                  <Badge tone={toneForDocStatus(d.status)}>{d.status}</Badge>
                </Link>
              ))}
            </div>
          </Card>

          {canSeeFees(user) && (
            <Card>
              <h2 className="mb-2 font-bold">Fees</h2>
              <div className="text-sm">Agreed {rupees(agreed)} · Received {rupees(received)}</div>
              <div className="mt-1 text-sm font-bold" style={{ color: agreed - received > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                Balance {rupees(agreed - received)}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
