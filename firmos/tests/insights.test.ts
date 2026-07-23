import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeed } from "../src/lib/db/seed";
import {
  attentionItems, findConflicts, suggestNextStage, caseDeadlines, feeAnalytics, caseBalance, isStale,
} from "../src/lib/insights";

const db = buildSeed();

test("attention engine surfaces the urgent inquiry", () => {
  const items = attentionItems(db);
  assert.ok(items.some((i) => i.kind === "inquiry" && /Waqar/.test(i.title)), "urgent inquiry missing");
});

test("attention engine surfaces tomorrow's unprepared hearing (Khan — PREPARE)", () => {
  const items = attentionItems(db);
  assert.ok(items.some((i) => i.kind === "prep"), "no prep item for unready hearing");
});

test("attention engine surfaces Sana's approaching limitation deadline", () => {
  const items = attentionItems(db);
  assert.ok(items.some((i) => i.kind === "deadline" && /Sana/.test(i.title)), "limitation deadline not surfaced");
});

test("attention items are sorted high → low priority", () => {
  const items = attentionItems(db);
  const rank = { high: 0, medium: 1, low: 2 } as const;
  for (let i = 1; i < items.length; i++) {
    assert.ok(rank[items[i - 1].priority] <= rank[items[i].priority], "priority order broken");
  }
});

test("deadline computed for Sana from its limitation date", () => {
  const sana = db.cases.find((c) => c.id === "k-sana")!;
  const dls = caseDeadlines(db, sana);
  assert.ok(dls.some((d) => d.label === "Limitation date" && d.daysLeft > 0), "Sana deadline missing");
});

test("conflict detection flags a shared opposing party", () => {
  // City Builders appears in two linked matters — a new matter against them should flag.
  const conflicts = findConflicts(db, "New Client", "City Builders");
  assert.ok(conflicts.length >= 1, "conflict not detected for City Builders");
});

test("no false-positive conflict for a fresh party", () => {
  const conflicts = findConflicts(db, "Zzxq Unique Person", "Qwrt Nonexistent Entity");
  assert.equal(conflicts.length, 0);
});

test("next-stage suggestion advances within the lifecycle", () => {
  assert.equal(suggestNextStage("civil", "Written statement"), "Issues framed");
  assert.equal(suggestNextStage("family", "Evidence"), "Arguments");
  // Regression: "Evidence (plaintiff)" must not match "Plaint filed" via the "plaint" substring.
  assert.equal(suggestNextStage("civil", "Evidence (plaintiff)"), "Evidence (defendant)");
  assert.equal(suggestNextStage("civil", "Arguments"), "Judgment/Decree");
});

test("fee analytics computes a sane collection rate", () => {
  const fa = feeAnalytics(db);
  assert.ok(fa.pending === 940000, `pending should be 940000, got ${fa.pending}`);
  assert.ok(fa.collectionRate >= 0 && fa.collectionRate <= 100);
  assert.ok(fa.casesWithBalance > 0);
});

test("Malik's balance is Rs 40,000", () => {
  assert.equal(caseBalance(db, "k-malik").balance, 40000);
});

test("isStale ignores cases with upcoming hearings", () => {
  // Malik has a hearing tomorrow — never stale.
  const malik = db.cases.find((c) => c.id === "k-malik")!;
  assert.equal(isStale(db, malik), false);
});
