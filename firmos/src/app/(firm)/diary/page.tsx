import Link from "next/link";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyTomorrowHearings } from "@/lib/actions";
import { PageTitle, Card, Badge, Button, toneForReadiness, Empty } from "@/components/ui";

export default async function DiaryPage() {
  await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const tomorrowCount = db.hearings.filter((h) => h.date === tomorrowStr && !h.outcomeNote).length;
  const today = new Date().toISOString().slice(0, 10);
  const horizon = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();

  const upcoming = db.hearings
    .filter((h) => h.date >= today && h.date <= horizon && !h.outcomeNote)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

  const byDate = new Map<string, typeof upcoming>();
  for (const h of upcoming) {
    if (!byDate.has(h.date)) byDate.set(h.date, []);
    byDate.get(h.date)!.push(h);
  }
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const label = (d: string) => (d === today ? "Today" : d === tomorrow ? "Tomorrow" : d);

  return (
    <div>
      <PageTitle right={
        tomorrowCount > 0 ? (
          <form action={notifyTomorrowHearings}>
            <Button kind="primary">Notify tomorrow&apos;s clients ({tomorrowCount})</Button>
          </form>
        ) : undefined
      }>
        Court Diary <span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>(next 30 days)</span>
      </PageTitle>
      {byDate.size === 0 && <Card><Empty>No upcoming hearings.</Empty></Card>}
      <div className="flex flex-col gap-4">
        {Array.from(byDate.entries()).map(([date, hs]) => (
          <Card key={date}>
            <h2 className="mb-3 font-bold">{label(date)} <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}>· {hs.length} {hs.length === 1 ? "hearing" : "hearings"}</span></h2>
            <div className="flex flex-col gap-2">
              {hs.map((h) => {
                const kase = db.cases.find((c) => c.id === h.caseId)!;
                const court = db.courts.find((ct) => ct.id === kase.courtId);
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="min-w-0 text-sm">
                      <Link href={`/cases/${kase.id}`} className="font-semibold">{kase.title}</Link>
                      <span style={{ color: "var(--color-text-secondary)" }}> · {kase.number} · {court?.name}{court?.room ? ` · ${court.room}` : ""}{h.time ? ` · ${h.time}` : ""} · {h.purpose}</span>
                    </div>
                    <Badge tone={toneForReadiness(h.readiness)}>{h.readiness}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
