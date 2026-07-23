import type { DB, Case, Hearing } from "./db/types";

/**
 * Smart engine — turns raw records into prioritized actions, deadlines, and
 * conflict checks. Pure functions over the in-memory DB (no I/O), so they run
 * anywhere and are easy to test.
 */

const today = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

export type Priority = "high" | "medium" | "low";
export type AttentionItem = {
  priority: Priority;
  kind: string;
  title: string;
  detail: string;
  href: string;
};

// ---- Case health ---------------------------------------------------------

export function caseHearings(db: DB, caseId: string): Hearing[] {
  return db.hearings.filter((h) => h.caseId === caseId);
}
export function lastHeldHearing(db: DB, caseId: string): Hearing | undefined {
  return caseHearings(db, caseId)
    .filter((h) => h.outcomeNote)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
export function nextHearing(db: DB, caseId: string): Hearing | undefined {
  const t = today();
  return caseHearings(db, caseId)
    .filter((h) => !h.outcomeNote && h.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}
export function caseAgeDays(kase: Case): number {
  return daysBetween(kase.filedOn, today());
}
/** Active case with no held hearing recently and nothing upcoming = at risk of going stale. */
export function isStale(db: DB, kase: Case, thresholdDays = 45): boolean {
  if (kase.status !== "active") return false;
  if (nextHearing(db, kase.id)) return false;
  const last = lastHeldHearing(db, kase.id);
  const ref = last?.date ?? kase.filedOn;
  return daysBetween(ref, today()) > thresholdDays;
}

// ---- Fees ---------------------------------------------------------------

export function caseBalance(db: DB, caseId: string) {
  const fees = db.fees.filter((f) => f.caseId === caseId);
  const agreed = fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const received = fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  return { agreed, received, balance: agreed - received };
}
export function feeAnalytics(db: DB) {
  const agreed = db.fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const received = db.fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  const pending = agreed - received;
  const rate = agreed > 0 ? Math.round((received / agreed) * 100) : 0;
  const casesWithBalance = db.cases.filter((c) => caseBalance(db, c.id).balance > 0).length;
  return { agreed, received, pending, collectionRate: rate, casesWithBalance };
}

// ---- Limitation deadlines (Limitation Act 1908 — common periods) ---------

type DeadlineRule = { label: string; days: number; from: "decided" | "filed" };
// Simplified, practice-common limitation periods. Real filings should be
// confirmed against the statute — these are prompts, not legal advice.
const LIMITATION: Record<string, DeadlineRule[]> = {
  civil: [{ label: "Appeal to District Court", days: 30, from: "decided" }],
  criminal: [{ label: "Appeal against conviction/acquittal", days: 30, from: "decided" }],
  family: [{ label: "Appeal (Family Court)", days: 30, from: "decided" }],
  appeal: [{ label: "Revision / further appeal", days: 90, from: "decided" }],
  writ: [],
};

export type Deadline = { label: string; date: string; daysLeft: number };
export function caseDeadlines(db: DB, kase: Case): Deadline[] {
  const out: Deadline[] = [];
  // Manual override always wins.
  if (kase.limitationDate) {
    out.push({ label: "Limitation date", date: kase.limitationDate, daysLeft: daysBetween(today(), kase.limitationDate) });
  }
  // Derived from a decided/order date.
  const rules = LIMITATION[kase.type] ?? [];
  const decidedOn = kase.decidedOn ?? (kase.status === "decided" ? lastHeldHearing(db, kase.id)?.date : undefined);
  for (const r of rules) {
    const base = r.from === "decided" ? decidedOn : kase.filedOn;
    if (!base) continue;
    const date = addDaysIso(base, r.days);
    out.push({ label: r.label, date, daysLeft: daysBetween(today(), date) });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ---- Conflict of interest (CM-8) ----------------------------------------

export type Conflict = { caseId: string; caseNumber: string; caseTitle: string; matchedName: string; reason: string };
const norm = (s: string) => s.toLowerCase().replace(/\b(pvt|ltd|the|state|and|sons|&)\b/g, "").replace(/[^a-z0-9]/g, "").trim();
/** Warn if a new matter's opposing party appears elsewhere as our client or party. */
export function findConflicts(db: DB, plaintiff: string, defendant: string, excludeCaseId?: string): Conflict[] {
  const parties = [plaintiff, defendant].map(norm).filter((s) => s.length >= 3);
  const out: Conflict[] = [];
  for (const c of db.cases) {
    if (c.id === excludeCaseId) continue;
    const existing = [c.parties.plaintiff, c.parties.defendant];
    for (const name of existing) {
      const n = norm(name);
      if (n.length >= 3 && parties.includes(n)) {
        out.push({ caseId: c.id, caseNumber: c.number, caseTitle: c.title, matchedName: name, reason: `"${name}" also appears in this matter` });
        break;
      }
    }
  }
  return out;
}

// ---- Next-stage suggestion ----------------------------------------------

const STAGE_FLOW: Record<string, string[]> = {
  civil: ["Plaint filed", "Summons", "Written statement", "Issues framed", "Evidence (plaintiff)", "Evidence (defendant)", "Arguments", "Judgment/Decree", "Execution"],
  criminal: ["FIR/Complaint", "Bail (pre-arrest)", "Bail (post-arrest)", "Challan submitted", "Charge framed", "Prosecution evidence", "Statement u/s 342", "Defense evidence", "Arguments", "Judgment"],
  family: ["Plaint", "Written reply", "Pre-trial reconciliation", "Evidence", "Arguments", "Post-trial reconciliation", "Decree"],
  writ: ["Institution", "Notice issued", "Comments awaited", "Arguments", "Order/Judgment"],
  appeal: ["Institution", "Notice issued", "Record requisitioned", "Arguments", "Order awaited", "Order/Judgment"],
};
/** Best-effort next stage given the case type and current stage text. */
export function suggestNextStage(caseType: string, currentStage: string): string | null {
  const flow = STAGE_FLOW[caseType];
  if (!flow) return null;
  const cur = currentStage.trim().toLowerCase();
  // Exact match first (avoids "plaint" matching "plaintiff"), then prefix match.
  let idx = flow.findIndex((s) => s.toLowerCase() === cur);
  if (idx < 0) idx = flow.findIndex((s) => cur.startsWith(s.toLowerCase()) || s.toLowerCase().startsWith(cur));
  if (idx >= 0 && idx < flow.length - 1) return flow[idx + 1];
  return null;
}
export const stageFlow = (caseType: string) => STAGE_FLOW[caseType] ?? [];

// ---- Attention engine (the smart dashboard) -----------------------------

export function attentionItems(db: DB): AttentionItem[] {
  const items: AttentionItem[] = [];
  const t = today();
  const tomorrow = addDaysIso(t, 1);

  // 1. Urgent inquiries not yet contacted.
  for (const q of db.inquiries.filter((i) => i.urgency === "urgent" && i.status === "new")) {
    items.push({ priority: "high", kind: "inquiry", title: `Urgent inquiry: ${q.callerName}`, detail: `${q.matterType} — ${q.summary.slice(0, 70)}`, href: "/inquiries" });
  }

  // 2. Hearings tomorrow that aren't file-ready.
  for (const h of db.hearings.filter((h) => h.date === tomorrow && h.readiness !== "ready" && !h.outcomeNote)) {
    const c = db.cases.find((c) => c.id === h.caseId);
    if (c) items.push({ priority: "high", kind: "prep", title: `Prepare: ${c.title}`, detail: `Hearing tomorrow${h.time ? ` at ${h.time}` : ""} — ${h.purpose} — not marked ready`, href: `/cases/${c.id}` });
  }

  // 3. Approaching limitation deadlines (≤ 14 days, not past).
  for (const c of db.cases.filter((c) => c.status !== "dormant")) {
    for (const d of caseDeadlines(db, c)) {
      if (d.daysLeft >= 0 && d.daysLeft <= 14) {
        items.push({ priority: d.daysLeft <= 5 ? "high" : "medium", kind: "deadline", title: `${d.label} in ${d.daysLeft}d: ${c.title}`, detail: `Deadline ${d.date} — ${c.number}`, href: `/cases/${c.id}` });
      }
    }
  }

  // 4. Overdue fee balances on active cases older than 60 days.
  for (const c of db.cases.filter((c) => c.status === "active" && caseAgeDays(c) > 60)) {
    const { balance } = caseBalance(db, c.id);
    if (balance > 0) items.push({ priority: "medium", kind: "fee", title: `Fee pending: ${c.title}`, detail: `Rs ${balance.toLocaleString("en-PK")} outstanding · case ${caseAgeDays(c)}d old`, href: "/fees" });
  }

  // 5. Stale cases (no activity, nothing upcoming).
  for (const c of db.cases.filter((c) => isStale(db, c))) {
    const last = lastHeldHearing(db, c.id);
    const since = daysBetween(last?.date ?? c.filedOn, t);
    items.push({ priority: "low", kind: "stale", title: `Stale: ${c.title}`, detail: `No hearing in ${since}d and none scheduled — needs a date`, href: `/cases/${c.id}` });
  }

  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
