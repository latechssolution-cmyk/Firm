import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeed } from "../src/lib/db/seed";

const db = buildSeed();
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

test("demo tenant has exactly 86 active cases (PRD §13.4)", () => {
  assert.equal(db.cases.filter((c) => c.status === "active").length, 86);
});

test("exactly 7 hearings tomorrow", () => {
  assert.equal(db.hearings.filter((h) => h.date === tomorrow).length, 7);
});

test("fees pending total exactly Rs 940,000", () => {
  const agreed = db.fees.filter((f) => f.kind === "agreed").reduce((s, f) => s + f.amount, 0);
  const received = db.fees.filter((f) => f.kind === "received").reduce((s, f) => s + f.amount, 0);
  assert.equal(agreed - received, 940_000);
});

test("case numbers follow authentic Pakistani formats (PRD §2.3)", () => {
  const patterns: Record<string, RegExp> = {
    civil: /^C\.S\. No\. \d+\/\d{4}$/,
    criminal: /^Crl\. Misc\. No\. \d+(-B)?\/\d{4}$/,
    family: /^Family Suit No\. \d+\/\d{4}$/,
    writ: /^W\.P\. No\. \d+\/\d{4}$/,
    appeal: /^R\.F\.A\. No\. \d+\/\d{4}$/,
  };
  for (const c of db.cases) {
    const re = patterns[c.type];
    assert.ok(re, `unknown type ${c.type}`);
    assert.match(c.number, re, `bad number for ${c.type}: ${c.number}`);
  }
});

test("portal client (Malik) owns only the hero case — filler stays off the portal demo", () => {
  const malikCases = db.cases.filter((c) => c.clientId === "cl-malik");
  assert.equal(malikCases.length, 1);
  assert.equal(malikCases[0].id, "k-malik");
});

test("matter thread links the City Builders appeal to its trial case (CM-7)", () => {
  const appeal = db.cases.find((c) => c.id === "k-city")!;
  const trial = db.cases.find((c) => c.id === "k-city-trial")!;
  assert.equal(appeal.matterThreadId, trial.matterThreadId);
  assert.equal(trial.status, "decided");
});

test("every case references a valid court and client", () => {
  const courtIds = new Set(db.courts.map((c) => c.id));
  const clientIds = new Set(db.clients.map((c) => c.id));
  for (const c of db.cases) {
    assert.ok(courtIds.has(c.courtId), `case ${c.number} has unknown court ${c.courtId}`);
    assert.ok(clientIds.has(c.clientId), `case ${c.number} has unknown client ${c.clientId}`);
  }
});

test("seed is deterministic (same output on rebuild)", () => {
  const again = buildSeed();
  assert.equal(again.cases.length, db.cases.length);
  assert.deepEqual(again.cases.map((c) => c.number), db.cases.map((c) => c.number));
});

test("urgent seeded inquiry exists and is flagged", () => {
  const q = db.inquiries.find((i) => i.urgency === "urgent");
  assert.ok(q, "no urgent inquiry in seed");
  assert.equal(q!.status, "new");
});
