import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser, canSeeFees } from "@/lib/auth";
import { Card, Stat, Badge, PageTitle, toneForReadiness, rupees, Empty } from "@/components/ui";
import { GlobalSearch } from "@/components/GlobalSearch";

export default async function Dashboard() {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const active = db.cases.filter((c) => c.status === "active");
  const tomorrowHearings = db.hearings.filter((h) => h.date === tomorrow);
  const agreed = db.fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const received = db.fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  const pending = agreed - received;
  const missed = db.hearings.filter((h) => h.date < new Date().toISOString().slice(0, 10) && h.readiness === "pending" && !h.outcomeNote).length;
  const urgent = db.inquiries.filter((q) => q.urgency === "urgent" && q.status === "new");

  const byCourtType: Record<string, number> = {};
  for (const c of active) {
    const t = db.courts.find((x) => x.id === c.courtId)?.type ?? "other";
    byCourtType[t] = (byCourtType[t] ?? 0) + 1;
  }
  const courtLabels: Record<string, string> = { HC: "High Court", "district-civil": "Civil", sessions: "Sessions", family: "Family", tribunal: "Tribunals", SC: "Supreme Court" };
  const total = active.length || 1;

  return (
    <div>
      <PageTitle right={<GlobalSearch />}>Practice Overview</PageTitle>

      {urgent.length > 0 && (
        <div className="themed mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-danger)", background: "var(--color-surface)" }}>
          <span className="font-bold" style={{ color: "var(--color-danger)" }}>⚑ {urgent.length} urgent {urgent.length === 1 ? "inquiry" : "inquiries"}</span>
          {" — "}
          {urgent.map((q) => (
            <Link key={q.id} href="/inquiries" className="underline">{q.matterType} ({q.callerName})</Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active cases" value={String(active.length)} sub="All courts" />
        <Stat label="Hearings tomorrow" value={String(tomorrowHearings.length)} sub="Cause list ready" tone="info" />
        {canSeeFees(user)
          ? <Stat label="Fees pending" value={rupees(pending)} sub="Reminders available" tone="warning" />
          : <Stat label="Documents" value={String(db.documents.length)} sub="On file" />}
        <Stat label="Missed dates" value={String(missed)} sub="Always" tone={missed === 0 ? "success" : "danger"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Tomorrow&apos;s Cause List</h2>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{tomorrowHearings.length} hearings</span>
          </div>
          {tomorrowHearings.length === 0 && <Empty>No hearings tomorrow.</Empty>}
          <div className="flex flex-col gap-2">
            {tomorrowHearings.map((h) => {
              const kase = db.cases.find((c) => c.id === h.caseId)!;
              const court = db.courts.find((ct) => ct.id === kase.courtId);
              return (
                <Link key={h.id} href={`/cases/${kase.id}`}
                  className="themed flex items-center justify-between gap-3 rounded-md border p-3 no-underline"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{kase.title} <span className="font-normal" style={{ color: "var(--color-text-secondary)" }}>· {kase.number}</span></div>
                    <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {court?.name}{court?.bench ? ` (${court.bench})` : ""}{court?.room ? ` · ${court.room}` : ""} {h.time ? `· ${h.time}` : ""} · {h.purpose}
                    </div>
                  </div>
                  <Badge tone={toneForReadiness(h.readiness)}>{h.readiness === "ready" ? "File ready" : h.readiness === "pending" ? "Prepare" : "—"}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Cases by Court</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(byCourtType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <div key={t}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{courtLabels[t] ?? t}</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{n} ({Math.round((n / total) * 100)}%)</span>
                </div>
                <div className="h-2 w-full rounded-full" style={{ background: "var(--color-muted-bg)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${(n / total) * 100}%`, background: "var(--color-info)" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border p-3 text-xs" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
            <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>⚡ Auto-alert</span>{" "}
            Every next-date entry notifies the client automatically — see the notification queue in Settings.
          </div>
        </Card>
      </div>
    </div>
  );
}
