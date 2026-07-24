import type { DB, User } from "./db/types";
import { attentionItems, feeAnalytics, type AttentionItem } from "./insights";

const canSeeFees = (u: User) => u.role === "admin" || u.role === "associate";

export type CauseItem = {
  id: string; caseId: string; title: string; number: string; court: string;
  room?: string; time?: string; purpose: string; readiness: string; date: string;
};
export type CourtSlice = { label: string; count: number; pct: number };

export type DashboardData = {
  firmName: string;
  userName: string;
  canSeeFees: boolean;
  stats: {
    activeCases: number;
    hearingsTomorrow: number;
    feesPending: number;
    collectionRate: number;
    missedDates: number;
    documents: number;
    urgentInquiries: number;
  };
  fee: { received: number; agreed: number; rate: number };
  attention: AttentionItem[];
  causeToday: CauseItem[];
  causeTomorrow: CauseItem[];
  causeWeek: CauseItem[];
  byCourt: CourtSlice[];
  at: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayOffset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const courtLabels: Record<string, string> = {
  HC: "High Court", "district-civil": "Civil", sessions: "Sessions", family: "Family", tribunal: "Tribunals", SC: "Supreme Court", FSC: "Shariat",
};

function causeFor(db: DB, dateFrom: string, dateTo: string): CauseItem[] {
  return db.hearings
    .filter((h) => h.date >= dateFrom && h.date <= dateTo && !h.outcomeNote)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .map((h) => {
      const kase = db.cases.find((c) => c.id === h.caseId);
      const court = kase && db.courts.find((ct) => ct.id === kase.courtId);
      return {
        id: h.id, caseId: h.caseId, title: kase?.title ?? "—", number: kase?.number ?? "",
        court: court?.name ?? "", room: court?.room, time: h.time, purpose: h.purpose,
        readiness: h.readiness, date: h.date,
      };
    });
}

export function buildDashboard(db: DB, user: User): DashboardData {
  const today = iso(new Date());
  const tomorrow = dayOffset(1);
  const weekEnd = dayOffset(7);

  const active = db.cases.filter((c) => c.status === "active");
  const fa = feeAnalytics(db);
  const missed = db.hearings.filter((h) => h.date < today && h.readiness === "pending" && !h.outcomeNote).length;
  const attention = attentionItems(db).filter((i) => canSeeFees(user) || i.kind !== "fee");

  const byCourtCount: Record<string, number> = {};
  for (const c of active) {
    const t = db.courts.find((x) => x.id === c.courtId)?.type ?? "other";
    byCourtCount[t] = (byCourtCount[t] ?? 0) + 1;
  }
  const total = active.length || 1;
  const byCourt = Object.entries(byCourtCount)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => ({ label: courtLabels[t] ?? t, count: n, pct: Math.round((n / total) * 100) }));

  return {
    firmName: db.firm.name,
    userName: user.name,
    canSeeFees: canSeeFees(user),
    stats: {
      activeCases: active.length,
      hearingsTomorrow: db.hearings.filter((h) => h.date === tomorrow && !h.outcomeNote).length,
      feesPending: fa.pending,
      collectionRate: fa.collectionRate,
      missedDates: missed,
      documents: db.documents.length,
      urgentInquiries: db.inquiries.filter((q) => q.urgency === "urgent" && q.status === "new").length,
    },
    fee: { received: fa.received, agreed: fa.agreed, rate: fa.collectionRate },
    attention,
    causeToday: causeFor(db, today, today),
    causeTomorrow: causeFor(db, tomorrow, tomorrow),
    causeWeek: causeFor(db, today, weekEnd),
    byCourt,
    at: new Date().toISOString(),
  };
}
