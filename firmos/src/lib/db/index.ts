import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { buildSeed } from "./seed";
import { sendWhatsApp, sendSms } from "../notify-adapters";
import type { DB, AuditEvent, NotificationRec } from "./types";

/**
 * Data layer (PRD §4.3). When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * state lives in Supabase Postgres (app_* tables, service-role only, RLS locked):
 * loaded once per server process, persisted on every write. Without credentials
 * it falls back to the local JSON demo store. Auto-seeds an empty database.
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

let supabase: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}
export const supabaseConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let cache: DB | null = null;
let loading: Promise<DB> | null = null;

export async function getDB(): Promise<DB> {
  if (cache) return cache;
  if (!loading) loading = loadDB().finally(() => { loading = null; });
  return loading;
}

async function loadDB(): Promise<DB> {
  const client = sb();
  if (client) {
    const firmRow = await client.from("app_firm").select("data").eq("id", "firm").maybeSingle();
    if (firmRow.error) throw new Error(`Supabase load failed: ${firmRow.error.message}`);
    if (firmRow.data) {
      const db = { firm: firmRow.data.data } as DB;
      for (const { table, key } of TABLES) {
        const res = await client.from(table).select("data");
        if (res.error) throw new Error(`Supabase load ${table}: ${res.error.message}`);
        (db as unknown as Record<string, unknown>)[key] = (res.data ?? []).map((r: { data: unknown }) => r.data);
      }
      // Stable ordering (rows come back unordered)
      db.audit.sort((a, b) => b.at.localeCompare(a.at));
      db.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      cache = db;
      console.log(`[db] loaded from Supabase (${db.cases.length} cases)`);
      return cache;
    }
    // Empty database → seed it (PRD §13.4 demo tenant)
    cache = buildSeed();
    await pushAll(client, cache, true);
    console.log("[db] Supabase was empty — seeded demo tenant");
    return cache;
  }
  if (fs.existsSync(DATA_FILE)) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DB;
  } else {
    cache = buildSeed();
    persistLocal();
  }
  return cache;
}

function rowsOf(db: DB, key: keyof DB): { id: string; data: unknown }[] {
  const arr = db[key] as unknown as { id: string }[];
  return arr.map((item) => ({ id: item.id, data: item }));
}

async function pushAll(client: SupabaseClient, db: DB, wipe = false) {
  await client.from("app_firm").upsert({ id: "firm", data: db.firm, updated_at: new Date().toISOString() });
  for (const { table, key } of TABLES) {
    if (wipe) await client.from(table).delete().neq("id", "");
    const rows = rowsOf(db, key).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    for (let i = 0; i < rows.length; i += 200) {
      const res = await client.from(table).upsert(rows.slice(i, i + 200));
      if (res.error) console.error(`[db] upsert ${table} failed: ${res.error.message}`);
    }
  }
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

/** Persist: local snapshot synchronously; Supabase push in the background. */
export function persist() {
  if (!cache) return;
  persistLocal();
  const client = sb();
  if (client) {
    const snapshot = cache;
    void pushAll(client, snapshot).catch((e) => console.error("[db] Supabase persist failed:", e?.message ?? e));
  }
}

export async function resetDemo() {
  cache = buildSeed();
  persistLocal();
  const client = sb();
  if (client) await pushAll(client, cache, true);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export async function audit(e: Omit<AuditEvent, "id" | "at">) {
  const db = await getDB();
  db.audit.unshift({ ...e, id: uid("a"), at: new Date().toISOString() });
  if (db.audit.length > 2000) db.audit.pop();
  persist();
}

/** Notification dispatch: real adapters (WhatsApp Cloud API / SMS aggregator)
 *  fire when gateway creds exist; otherwise the record stays honestly 'queued'
 *  with a visible reason. Delivery status is updated from the provider response. */
export async function enqueueNotification(n: Omit<NotificationRec, "id" | "status" | "createdAt" | "note">) {
  const db = await getDB();
  const id = uid("n");
  const rec: NotificationRec = { ...n, id, status: "queued", note: undefined, createdAt: new Date().toISOString() };
  db.notifications.unshift(rec);

  const phone = n.recipient.match(/\(([^)]+)\)/)?.[1] ?? "";
  const dispatch =
    n.channel === "whatsapp" ? sendWhatsApp(phone, n.payload)
    : n.channel === "sms" ? sendSms(phone, n.payload)
    : Promise.resolve({ ok: true } as const);

  void Promise.resolve(dispatch).then((result) => {
    const row = cache?.notifications.find((x) => x.id === id);
    if (!row) return;
    if (result === null) {
      row.note = "No gateway configured — see Settings → Integrations";
    } else if (result.ok) {
      row.status = "sent";
      row.note = undefined;
    } else {
      row.status = "failed";
      row.note = result.error;
    }
    persist();
  });

  persist();
}
