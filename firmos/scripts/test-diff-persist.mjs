/** Integration test for diff-based persist against live Supabase.
 *  Verifies create/update/delete each touch ONLY their own rows and that
 *  the data returns to pristine (5 clients) afterwards. */
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const q = (p) => fetch(`${URL}/rest/v1/${p}`, { headers: H }).then((r) => r.json());
const clientNames = async () => (await q("app_clients?select=data")).map((r) => r.data.name).sort();

// Import the real db module (mirrors what the app runs).
const db = await import("../src/lib/db/index.ts");

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}`); } };

const before = await clientNames();
console.log("baseline clients:", before.length);

// 1) CREATE — add one client, persist, expect exactly +1 in Supabase, others untouched.
const store = await db.getDB();
const testId = "cl-difftest-xyz";
store.clients.push({ id: testId, name: "ZZ Diff Test", phone: "0300-0000000", languagePref: "en" });
await db.persist();
const afterCreate = await clientNames();
check("create adds exactly one row", afterCreate.length === before.length + 1);
check("create keeps all original clients", before.every((n) => afterCreate.includes(n)));
check("create wrote the new client", afterCreate.includes("ZZ Diff Test"));

// 2) UPDATE — rename it, persist, expect same count, new name present.
store.clients.find((c) => c.id === testId).name = "ZZ Diff Renamed";
await db.persist();
const afterUpdate = await clientNames();
check("update keeps row count", afterUpdate.length === before.length + 1);
check("update changed the name", afterUpdate.includes("ZZ Diff Renamed") && !afterUpdate.includes("ZZ Diff Test"));

// 3) DELETE — remove it, persist, expect back to pristine and nothing else deleted.
store.clients = store.clients.filter((c) => c.id !== testId);
await db.persist();
const afterDelete = await clientNames();
check("delete removes exactly the test row", afterDelete.length === before.length);
check("delete restores pristine set", JSON.stringify(afterDelete) === JSON.stringify(before));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
