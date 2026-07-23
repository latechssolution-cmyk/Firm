import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { caseDeadlines, caseBalance, nextHearing } from "@/lib/insights";

/**
 * AI case summary. Builds a factual brief of the case from its records; when
 * ANTHROPIC_API_KEY is set, Claude turns it into a concise plain-English summary
 * with suggested next steps. Falls back to a deterministic brief otherwise.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { caseId } = (await req.json()) as { caseId: string };
  const db = await getDB();
  const kase = db.cases.find((c) => c.id === caseId);
  if (!kase) return NextResponse.json({ error: "not found" }, { status: 404 });

  const court = db.courts.find((c) => c.id === kase.courtId);
  const client = db.clients.find((c) => c.id === kase.clientId);
  const hearings = db.hearings.filter((h) => h.caseId === caseId).sort((a, b) => a.date.localeCompare(b.date));
  const held = hearings.filter((h) => h.outcomeNote);
  const next = nextHearing(db, caseId);
  const bal = caseBalance(db, caseId);
  const deadlines = caseDeadlines(db, kase);

  const facts = [
    `Case: ${kase.title} (${kase.number})`,
    `Type: ${kase.type}; Court: ${court?.name ?? "?"}${court?.bench ? ` ${court.bench}` : ""}`,
    `Parties: ${kase.parties.plaintiff} vs ${kase.parties.defendant}; Client: ${client?.name ?? "?"}`,
    `Current stage: ${kase.stage}; Status: ${kase.status}; Filed: ${kase.filedOn}`,
    kase.firNo ? `FIR ${kase.firNo}${kase.sections?.length ? `, u/s ${kase.sections.join(", ")}` : ""}` : "",
    `Balance due: Rs ${bal.balance.toLocaleString("en-PK")}`,
    next ? `Next hearing: ${next.date}${next.time ? ` ${next.time}` : ""} (${next.purpose})` : "No hearing scheduled.",
    deadlines.length ? `Deadlines: ${deadlines.map((d) => `${d.label} on ${d.date} (${d.daysLeft}d)`).join("; ")}` : "",
    `Hearing history (${held.length}): ${held.map((h) => `${h.date} — ${h.outcomeNote}`).join(" | ") || "none recorded"}`,
  ].filter(Boolean).join("\n");

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5", max_tokens: 500,
          system: "You are a legal associate at a Pakistani law firm. Given case facts, write a crisp 3-4 sentence status summary followed by 2-3 concrete next steps as a bullet list. Be practical and specific to Pakistani court practice. Do not invent facts not present.",
          messages: [{ role: "user", content: facts }],
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const text = data?.content?.[0]?.text;
        if (typeof text === "string" && text.trim()) return NextResponse.json({ summary: text.trim(), ai: true });
      }
    } catch { /* fall through */ }
  }

  // Deterministic fallback brief.
  const nextSteps: string[] = [];
  if (next) nextSteps.push(`Prepare for the hearing on ${next.date} (${next.purpose}).`);
  else nextSteps.push("No hearing is scheduled — obtain the next date from the court.");
  if (bal.balance > 0) nextSteps.push(`Follow up on the pending balance of Rs ${bal.balance.toLocaleString("en-PK")}.`);
  for (const d of deadlines) if (d.daysLeft >= 0 && d.daysLeft <= 30) nextSteps.push(`${d.label} due in ${d.daysLeft} days (${d.date}).`);
  const summary = `${kase.title} is a ${kase.type} matter at ${court?.name ?? "court"}, currently at "${kase.stage}". ` +
    `${held.length} hearing(s) held; ${next ? `next on ${next.date}.` : "no date fixed."} ` +
    `Balance due: Rs ${bal.balance.toLocaleString("en-PK")}.\n\nNext steps:\n${nextSteps.map((s) => `• ${s}`).join("\n")}`;
  return NextResponse.json({ summary, ai: false });
}
