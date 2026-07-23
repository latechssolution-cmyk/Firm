/**
 * Live API tests — run against a running server:  BASE=http://localhost:3001 npm run test:e2e
 * Covers: RBAC on the search API, the receptionist golden path (PRD §10 E2E),
 * and the public/protected route split.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";

test("search API rejects unauthenticated callers (SEC-1)", async () => {
  const res = await fetch(`${BASE}/api/search?q=malik`);
  assert.equal(res.status, 401);
});

test("firm routes redirect anonymous users to /login", async () => {
  for (const route of ["/dashboard", "/cases", "/fees", "/audit"]) {
    const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
    assert.ok([302, 307].includes(res.status), `${route} returned ${res.status}, expected redirect`);
    assert.match(res.headers.get("location") ?? "", /\/login/);
  }
});

test("reception is public and completes the urgent intake golden path", async () => {
  let state = null;
  let messages = [];
  const step = async (callerText) => {
    if (callerText !== null) messages = [...messages, { from: "caller", text: callerText }];
    const res = await fetch(`${BASE}/api/reception`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, state }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    messages = [...messages, { from: "assistant", text: data.reply }];
    state = data.state;
    return data;
  };

  const greet = await step(null);
  assert.match(greet.reply, /name/i);

  await step("Test Caller E2E");
  await step("0300-0000000");
  const classify = await step("Police arrested my cousin tonight, urgent bail needed");
  assert.equal(classify.urgentFlag, true, "urgency not detected");
  assert.match(classify.reply, /urgent/i);

  const done = await step("yes");
  assert.match(done.reply, /booked/i);
});

test("theme init script is inlined in <head> (no-flash, §9.7.4)", async () => {
  const html = await (await fetch(`${BASE}/login`)).text();
  assert.ok(html.includes("firmos-theme"), "theme init script missing");
  assert.ok(html.includes("prefers-color-scheme"), "OS fallback missing");
});
