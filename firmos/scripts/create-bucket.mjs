/** Creates the private 'case-docs' Storage bucket for scan uploads (idempotent). */
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const r = await fetch(`${URL}/storage/v1/bucket`, {
  method: "POST", headers: H,
  body: JSON.stringify({ id: "case-docs", name: "case-docs", public: false, file_size_limit: 15728640 }),
});
const body = await r.json().catch(() => ({}));
if (r.ok) console.log("Created bucket 'case-docs'");
else if (/already exists/i.test(JSON.stringify(body))) console.log("Bucket 'case-docs' already exists");
else console.error("Failed:", r.status, JSON.stringify(body));

const list = await fetch(`${URL}/storage/v1/bucket`, { headers: H }).then((x) => x.json());
console.log("Buckets:", Array.isArray(list) ? list.map((b) => b.id).join(", ") : JSON.stringify(list));
