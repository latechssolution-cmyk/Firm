import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser, canSeeFees } from "@/lib/auth";
import { Card, Stat, Badge, PageTitle, toneForReadiness, rupees, Empty } from "@/components/ui";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AttentionPanel } from "@/components/AttentionPanel";
import { attentionItems, feeAnalytics } from "@/lib/insights";
import { IconCases, IconDiary, IconFees, IconCheck, IconDocs } from "@/components/icons";

export default async function Dashboard() {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const active = db.cases.filter((c) => c.status === "active");
  const tomorrowHearings = db.hearings.filter((h) => h.date === tomorrow);
  const fa = feeAnalytics(db);
  const missed = db.hearings.filter((h) => h.date < new Date().toISOString().slice(0, 10) && h.readiness === "pending" && !h.outcomeNote).length;
  const attention = attentionItems(db).filter((i) => canSeeFees(user) || i.kind !== "fee");

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active cases" value={String(active.length)} sub="All courts" icon={<IconCases size={18} />} />
        <Stat label="Hearings tomorrow" value={String(tomorrowHearings.length)} sub="Cause list ready" tone="info" icon={<IconDiary size={18} />} />
        {canSeeFees(user)
          ? <Stat label="Fees pending" value={rupees(fa.pending)} sub={`${fa.collectionRate}% collected`} tone="warning" icon={<IconFees size={18} />} />
          : <Stat label="Documents" value={String(db.documents.length)} sub="On file" icon={<IconDocs size={18} />} />}
        <Stat label="Missed dates" value={String(missed)} sub="Always" tone={missed === 0 ? "success" : "danger"} icon={<IconCheck size={18} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttentionPanel items={attention} />
        </div>

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
          {canSeeFees(user) && (
            <div className="mt-4 rounded-md border p-3 text-xs" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="font-bold" style={{ color: "var(--color-text-primary)" }}>Fee collection</div>
              <div className="mt-1 flex items-center justify-between" style={{ color: "var(--color-text-secondary)" }}>
                <span>{rupees(fa.received)} of {rupees(fa.agreed)}</span>
                <span className="font-bold" style={{ color: fa.collectionRate >= 70 ? "var(--color-success)" : "var(--color-warning)" }}>{fa.collectionRate}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: "var(--color-muted-bg)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${fa.collectionRate}%`, background: "var(--color-success)" }} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><IconDiary size={18} /> Tomorrow&apos;s Cause List</h2>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{tomorrowHearings.length} hearings</span>
          </div>
          {tomorrowHearings.length === 0 && <Empty>No hearings tomorrow.</Empty>}
          <div className="grid gap-2 md:grid-cols-2">
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
      </div>
    </div>
  );
}
