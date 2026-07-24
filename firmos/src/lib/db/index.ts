import fs from "fs";
import path from "path";
import { buildSeed } from "./seed";
import { sendWhatsApp, sendSms } from "../notify-adapters";
import { resolveIntegrations } from "../settings";
import type { DB, AuditEvent, NotificationRec } from "./types";

/**
 * Data layer (PRD §4.3). When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * state lives in Supabase Postgres (app_* tables, service-role only, RLS locked):
 * loaded once per server process, persisted on every write. Without credentials
 * it falls back to the local JSON demo store. Auto-seeds an empty database.
 *
 * Uses Supabase's REST API via global fetch (no @supabase/supabase-js) so it
 * runs on any Node version Vercel provides — the SDK's realtime client throws at
 * construction on Node < 22, which would crash static prerendering at build time.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

const TABLES: { table: string; key: keyof DB }[] = [
  { table: "app_logins", key: "users" },
  { table: "app_courts", key: "courts" },
  { table: "app_clients", key: "clients" },
  { table: "app_cases", key: "cases" },
  { table: "app_hearings", key: "hearings" },
  { table: "app_documents", key: "documents" },
  { table: "app_fees", key: "fees" },
  { table: "app_inquiries", key: "inquiries" },
  { table: "app_notifications", key: "notifications" },
  { table: "app_audit", key: "audit" },
];

export const supabaseConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
function restUrl(pathAndQuery: string) {
  return `${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`;
}
async function sbSelect(table: string, query = "select=*"): Promise<Record<string, unknown>[]> {
  const r = await fetch(restUrl(`${table}?${query}`), { headers: sbHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase select ${table} ${r.status}: ${await r.text()}`);
  return r.json();
}
async function sbUpsert(table: string, rows: unknown[]) {
  const r = await fetch(restUrl(table), {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) console.error(`[db] upsert ${table} ${r.status}: ${await r.text()}`);
}
async function sbDeleteAll(table: string) {
  const r = await fetch(restUrl(`${table}?id=not.is.null`), {
    method: "DELETE", headers: { ...sbHeaders(), Prefer: "return=minimal" },
  });
  if (!r.ok) console.error(`[db] wipe ${table} ${r.status}: ${await r.text()}`);
}
async function sbDeleteRow(table: string, id: string) {
  const r = await fetch(restUrl(`${table}?id=eq.${encodeURIComponent(id)}`), {
    method: "DELETE", headers: { ...sbHeaders(), Prefer: "return=minimal" },
  });
  if (!r.ok) console.error(`[db] delete ${table}/${id} ${r.status}: ${await r.text()}`);
}

// ---- Supabase Storage (uploaded scans) ---------------------------------

const STORAGE_BUCKET = "case-docs";
export const STORAGE_BUCKET_NAME = STORAGE_BUCKET;

/** Upload raw bytes to Storage; returns the stored path (or null if unconfigured). */
export async function uploadScan(path: string, bytes: ArrayBuffer, contentType: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!r.ok) { console.error(`[storage] upload ${r.status}: ${await r.text()}`); return null; }
  return path;
}

/** A short-lived signed URL to view/download a stored scan. */
export async function signedScanUrl(path: string, expiresIn = 600): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/sign/${STORAGE_BUCKET}/${path}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!r.ok) return null;
  const { signedURL } = await r.json();
  return `${process.env.SUPABASE_URL}/storage/v1${signedURL}`;
}

let cache: DB | null = null;
let loading: Promise<DB> | null = null;
let loadedAt = 0;
/** Per-table id→serialized-row snapshot from the last load/persist. Lets persist()
 *  write ONLY the rows this instance actually changed — so concurrent writes from
 *  other serverless instances are never clobbered (unlike a whole-DB rewrite). */
let snapshot: Record<string, Map<string, string>> = {};

// Re-read from Supabase if the cache is older than this, so instances converge on
// each other's writes. Reads within the window serve the in-memory cache (fast).
const CACHE_TTL_MS = 8000;

function takeSnapshot(db: DB) {
  snapshot = {};
  for (const { table, key } of TABLES) {
    const m = new Map<string, string>();
    for (const item of db[key] as unknown as { id: string }[]) m.set(item.id, JSON.stringify(item));
    snapshot[table] = m;
  }
  snapshot["app_firm"] = new Map([["firm", JSON.stringify(db.firm)]]);
}

export async function getDB(): Promise<DB> {
  const fresh = cache && Date.now() - loadedAt < CACHE_TTL_MS;
  if (fresh) return cache!;
  if (cache && !supabaseConfigured()) return cache; // local mode: cache is authoritative
  if (!loading) loading = loadDB().finally(() => { loading = null; });
  return loading;
}

// Supabase returns rows unordered — restore a sensible, stable presentation order.
const ROLE_ORDER = ["admin", "associate", "clerk", "client"];
const SORTERS: Partial<Record<keyof DB, (a: never, b: never) => number>> = {
  users: ((a: { role: string }, b: { role: string }) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) as never,
  cases: ((a: { filedOn?: string }, b: { filedOn?: string }) => (b.filedOn ?? "").localeCompare(a.filedOn ?? "")) as never,
  hearings: ((a: { date?: string; time?: string }, b: { date?: string; time?: string }) =>
    (a.date ?? "").localeCompare(b.date ?? "") || (a.time ?? "").localeCompare(b.time ?? "")) as never,
  documents: ((a: { createdAt?: string }, b: { createdAt?: string }) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")) as never,
  clients: ((a: { name?: string }, b: { name?: string }) => (a.name ?? "").localeCompare(b.name ?? "")) as never,
  inquiries: ((a: { createdAt?: string }, b: { createdAt?: string }) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")) as never,
  audit: ((a: { at?: string }, b: { at?: string }) => (b.at ?? "").localeCompare(a.at ?? "")) as never,
  notifications: ((a: { createdAt?: string }, b: { createdAt?: string }) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")) as never,
};

async function loadDB(): Promise<DB> {
  if (supabaseConfigured()) {
    const firmRows = await sbSelect("app_firm", "select=data&id=eq.firm");
    if (firmRows.length > 0) {
      const db = { firm: (firmRows[0] as { data: unknown }).data } as DB;
      // Load all tables in parallel (one round-trip instead of ten).
      const results = await Promise.all(TABLES.map(({ table }) => sbSelect(table, "select=data")));
      TABLES.forEach(({ key }, i) => {
        const arr = results[i].map((r) => (r as { data: unknown }).data);
        const sorter = SORTERS[key];
        if (sorter) (arr as never[]).sort(sorter);
        (db as unknown as Record<string, unknown>)[key] = arr;
      });
      cache = db;
      loadedAt = Date.now();
      takeSnapshot(db);
      console.log(`[db] loaded from Supabase (${db.cases.length} cases)`);
      return cache;
    }
    cache = buildSeed();
    await pushAll(cache, true);
    loadedAt = Date.now();
    takeSnapshot(cache);
    console.log("[db] Supabase was empty — seeded demo tenant");
    return cache;
  }
  if (fs.existsSync(DATA_FILE)) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DB;
  } else {
    cache = buildSeed();
    persistLocal();
  }
  loadedAt = Date.now();
  takeSnapshot(cache);
  return cache;
}

function rowsOf(db: DB, key: keyof DB): { id: string; data: unknown; updated_at: string }[] {
  const arr = db[key] as unknown as { id: string }[];
  const now = new Date().toISOString();
  return arr.map((item) => ({ id: item.id, data: item, updated_at: now }));
}

async function pushAll(db: DB, wipe = false) {
  // Push every table in parallel; batches within a large table stay sequential.
  await Promise.all([
    sbUpsert("app_firm", [{ id: "firm", data: db.firm, updated_at: new Date().toISOString() }]),
    ...TABLES.map(async ({ table, key }) => {
      if (wipe) await sbDeleteAll(table);
      const rows = rowsOf(db, key);
      for (let i = 0; i < rows.length; i += 200) await sbUpsert(table, rows.slice(i, i + 200));
    }),
  ]);
}

function persistLocal() {
  if (!cache) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 1), "utf-8");
  } catch {
    // Read-only filesystem (Vercel serverless) — Supabase is the store there.
  }
}

/** Diff-based persist: writes ONLY the rows that changed since the last load,
 *  and deletes ONLY the rows this instance removed. Rows another instance added
 *  (absent from our snapshot) are never touched — so concurrent writes don't
 *  clobber each other. Must be awaited (serverless freezes after the response). */
export async function persist() {
  if (!cache) return;
  persistLocal();
  if (!supabaseConfigured()) return;
  try {
    const now = new Date().toISOString();
    const jobs: Promise<unknown>[] = [];

    // Firm row
    const firmJson = JSON.stringify(cache.firm);
    if (snapshot["app_firm"]?.get("firm") !== firmJson) {
      jobs.push(sbUpsert("app_firm", [{ id: "firm", data: cache.firm, updated_at: now }]));
      snapshot["app_firm"] = new Map([["firm", firmJson]]);
    }

    for (const { table, key } of TABLES) {
      const snap = snapshot[table] ?? new Map<string, string>();
      const nextSnap = new Map<string, string>();
      const changed: { id: string; data: unknown; updated_at: string }[] = [];
      const arr = cache[key] as unknown as { id: string }[];
      for (const item of arr) {
        const json = JSON.stringify(item);
        nextSnap.set(item.id, json);
        if (snap.get(item.id) !== json) changed.push({ id: item.id, data: item, updated_at: now });
      }
      const removed = Array.from(snap.keys()).filter((id) => !nextSnap.has(id));
      for (let i = 0; i < changed.length; i += 200) jobs.push(sbUpsert(table, changed.slice(i, i + 200)));
      for (const id of removed) jobs.push(sbDeleteRow(table, id));
      snapshot[table] = nextSnap;
    }
    await Promise.all(jobs);
  } catch (e) {
    console.error("[db] Supabase persist failed:", (e as Error)?.message ?? e);
  }
}

export async function resetDemo() {
  cache = buildSeed();
  persistLocal();
  if (supabaseConfigured()) await pushAll(cache, true);
  loadedAt = Date.now();
  takeSnapshot(cache);
}

/** Deletes are now handled by the diff in persist(); kept as an alias for callers. */
export const resyncAll = persist;

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export type Job = {
  id: string; kind: "ping" | "ocr" | "pdf"; status: "queued" | "claimed" | "done" | "failed";
  payload: unknown; result: unknown; error: string | null; claimed_by: string | null;
};

/** Enqueue a heavy-compute job for the OCI worker (PRD §4.3). Requires Supabase
 *  (the worker polls app_jobs there); returns null in local-only mode. */
export async function enqueueJob(kind: Job["kind"], payload: unknown): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const id = uid("job");
  const r = await fetch(restUrl("app_jobs"), {
    method: "POST", headers: { ...sbHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ id, kind, payload }),
  });
  if (!r.ok) { console.error(`[jobs] enqueue ${r.status}: ${await r.text()}`); return null; }
  return id;
}

export async function getJob(id: string): Promise<Job | null> {
  if (!supabaseConfigured()) return null;
  const rows = await sbSelect("app_jobs", `select=*&id=eq.${encodeURIComponent(id)}`);
  return (rows[0] as Job) ?? null;
}

export async function audit(e: Omit<AuditEvent, "id" | "at">) {
  const db = await getDB();
  const row: AuditEvent = { ...e, id: uid("a"), at: new Date().toISOString() };
  db.audit.unshift(row);
  if (db.audit.length > 2000) db.audit.pop();
  // Targeted single-row insert — cheap enough to run on every logged view,
  // instead of pushing the entire DB.
  if (supabaseConfigured()) {
    await fetch(restUrl("app_audit"), {
      method: "POST", headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ id: row.id, data: row }),
    }).catch((err) => console.error("[db] audit insert failed:", err?.message ?? err));
  } else {
    persistLocal();
  }
}

/** Notification dispatch: real adapters (WhatsApp Cloud API / SMS aggregator)
 *  fire when gateway creds exist; otherwise the record stays honestly 'queued'
 *  with a visible reason. Delivery status is updated from the provider response. */
export async function enqueueNotification(n: Omit<NotificationRec, "id" | "status" | "createdAt" | "note">) {
  const db = await getDB();
  const id = uid("n");
  const rec: NotificationRec = { ...n, id, status: "queued", note: undefined, createdAt: new Date().toISOString() };
  db.notifications.unshift(rec);

  // Await dispatch so the final status is captured in the single persist below
  // (serverless-safe — a backgrounded update would be killed after the response).
  const phone = n.recipient.match(/\(([^)]+)\)/)?.[1] ?? "";
  const cfg = resolveIntegrations(db); // Settings-over-env, so channels can be enabled live
  const result =
    n.channel === "whatsapp" ? await sendWhatsApp(phone, n.payload, { token: cfg.whatsappToken, phoneId: cfg.whatsappPhoneId })
    : n.channel === "sms" ? await sendSms(phone, n.payload, { url: cfg.smsUrl, key: cfg.smsKey, sender: cfg.smsSender })
    : ({ ok: true } as const);

  if (result === null) rec.note = "No gateway configured — see Settings → Integrations";
  else if (result.ok) { rec.status = "sent"; rec.note = undefined; }
  else { rec.status = "failed"; rec.note = result.error; }

  await persist();
}
