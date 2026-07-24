/** Force Supabase back to the pristine demo seed, bypassing the app's per-instance
 *  cache. Run: node --import tsx scripts/reseed-supabase.ts */
import { buildSeed } from "../src/lib/db/seed";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !KEY) { console.error("Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = (p: string) => `${URL}/rest/v1/${p}`;

const TABLES: [string, keyof ReturnType<typeof buildSeed>][] = [
  ["app_logins", "users"], ["app_courts", "courts"], ["app_clients", "clients"],
  ["app_cases", "cases"], ["app_hearings", "hearings"], ["app_documents", "documents"],
  ["app_fees", "fees"], ["app_inquiries", "inquiries"], ["app_notifications", "notifications"],
  ["app_audit", "audit"],
];

async function wipe(t: string) {
  const r = await fetch(rest(`${t}?id=neq.${encodeURIComponent(" ")}`), { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
  if (!r.ok) console.error(`wipe ${t}: ${r.status} ${await r.text()}`);
}
async function insert(t: string, rows: unknown[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const r = await fetch(rest(t), { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + 200)) });
    if (!r.ok) console.error(`insert ${t}: ${r.status} ${await r.text()}`);
  }
}

async function main() {
  const db = buildSeed();
  const now = new Date().toISOString();
  await wipe("app_firm");
  await insert("app_firm", [{ id: "firm", data: db.firm, updated_at: now }]);
  for (const [table, key] of TABLES) {
    await wipe(table);
    const arr = db[key] as unknown as { id: string }[];
    await insert(table, arr.map((item) => ({ id: item.id, data: item, updated_at: now })));
    console.log(`${table}: ${arr.length}`);
  }
  console.log("Supabase reseeded to pristine demo data.");
}
main();
