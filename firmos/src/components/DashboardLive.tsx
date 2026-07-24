"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Stat, Badge, toneForReadiness, rupees, Empty } from "@/components/ui";
import { AttentionPanel } from "@/components/AttentionPanel";
import { GlobalSearch } from "@/components/GlobalSearch";
import { CountUp } from "@/components/CountUp";
import { Donut } from "@/components/Donut";
import { IconCases, IconDiary, IconFees, IconCheck, IconDocs } from "@/components/icons";
import type { DashboardData } from "@/lib/dashboard";

const REFRESH_MS = 15000;

function relTime(iso: string): string {
  const sec = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export function DashboardLive({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initial);
  const [range, setRange] = useState<"today" | "tomorrow" | "week">("tomorrow");
  const [, setTick] = useState(0); // re-render for the "updated Xs ago" label
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch { /* keep last good data */ }
    finally { setRefreshing(false); }
  }

  useEffect(() => {
    const poll = setInterval(refresh, REFRESH_MS);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(poll); clearInterval(clock); window.removeEventListener("focus", onFocus); };
  }, []);

  const s = data.stats;
  const cause = range === "today" ? data.causeToday : range === "week" ? data.causeWeek : data.causeTomorrow;
  const total = data.byCourt.reduce((a, b) => a + b.count, 0);
  const firstName = data.userName.split(" ").slice(-1)[0];
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();

  const rangeLabel: Record<typeof range, string> = { today: "Today", tomorrow: "Tomorrow", week: "This week" };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Practice Overview</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span className="flex items-center gap-1.5">
              <span className={refreshing ? "h-2 w-2 rounded-full" : "live-dot h-2 w-2 rounded-full"} style={{ background: "var(--color-success)" }} />
              Live · updated {relTime(data.at)}
            </span>
            <span aria-hidden>·</span>
            <span>{greeting}, {firstName}</span>
          </div>
        </div>
        <GlobalSearch />
      </div>

      {/* Stats */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat featured label="Active cases" value={<CountUp value={s.activeCases} />} sub="Across all courts" icon={<IconCases size={18} />} />
        <Stat label="Hearings tomorrow" value={<CountUp value={s.hearingsTomorrow} />} sub="Cause list ready" tone="info" icon={<IconDiary size={18} />} />
        {data.canSeeFees
          ? <Stat label="Fees pending" value={<CountUp value={s.feesPending} format={(n) => rupees(n)} />} sub={`${s.collectionRate}% collected`} tone="warning" icon={<IconFees size={18} />} />
          : <Stat label="Documents" value={<CountUp value={s.documents} />} sub="On file" icon={<IconDocs size={18} />} />}
        <Stat label="Missed dates" value={<CountUp value={s.missedDates} />} sub="Always" tone={s.missedDates === 0 ? "success" : "danger"} icon={<IconCheck size={18} />} />
      </div>

      {/* Attention + court donut */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><AttentionPanel items={data.attention} /></div>
        <Card>
          <h2 className="mb-3 font-bold">Cases by Court</h2>
          {total === 0 ? <Empty>No active cases.</Empty> : <Donut slices={data.byCourt} total={total} />}
          {data.canSeeFees && (
            <div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="font-bold" style={{ color: "var(--color-text-primary)" }}>Fee collection</div>
              <div className="mt-1 flex items-center justify-between" style={{ color: "var(--color-text-secondary)" }}>
                <span>{rupees(data.fee.received)} of {rupees(data.fee.agreed)}</span>
                <span className="font-bold" style={{ color: data.fee.rate >= 70 ? "var(--color-success)" : "var(--color-warning)" }}>{data.fee.rate}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: "var(--color-muted-bg)" }}>
                <div className="bar-grow h-1.5 rounded-full" style={{ width: `${data.fee.rate}%`, background: "var(--color-success)" }} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Cause list with a live range toggle */}
      <div className="mt-4">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold"><IconDiary size={18} /> Cause List</h2>
            <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: "var(--color-muted-bg)" }}>
              {(["today", "tomorrow", "week"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRange(r)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                  style={range === r
                    ? { background: "var(--color-surface)", color: "var(--color-text-primary)", boxShadow: "var(--shadow-sm)" }
                    : { color: "var(--color-text-secondary)" }}>
                  {rangeLabel[r]}
                </button>
              ))}
            </div>
          </div>
          {cause.length === 0 && <Empty>No hearings {range === "week" ? "this week" : range}.</Empty>}
          <div className="grid gap-2 md:grid-cols-2">
            {cause.map((h) => (
              <Link key={h.id} href={`/cases/${h.caseId}`}
                className="themed card-hover flex items-center justify-between gap-3 rounded-lg border p-3 no-underline"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{h.title} <span className="font-normal" style={{ color: "var(--color-text-secondary)" }}>· {h.number}</span></div>
                  <div className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {range === "week" ? `${h.date} · ` : ""}{h.court}{h.room ? ` · ${h.room}` : ""}{h.time ? ` · ${h.time}` : ""} · {h.purpose}
                  </div>
                </div>
                <Badge tone={toneForReadiness(h.readiness)}>{h.readiness === "ready" ? "Ready" : h.readiness === "pending" ? "Prepare" : "—"}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
