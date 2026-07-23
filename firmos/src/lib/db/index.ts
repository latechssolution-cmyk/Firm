import fs from "fs";
import path from "path";
import { buildSeed } from "./seed";
import { sendWhatsApp, sendSms } from "../notify-adapters";
import type { DB, AuditEvent, NotificationRec } from "./types";

/**
 * Data layer. Local JSON store by default (zero-config demo tenant, PRD §13.4);
 * when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, swap this module's
 * read/write for the Supabase client (schema in /supabase/migrations).
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;

export function getDB(): DB {
  if (cache) return cache;
  if (fs.existsSync(DATA_FILE)) {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DB;
  } else {
    cache = buildSeed();
    persist();
  }
  return cache!;
}

export function persist() {
  if (!cache) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 1), "utf-8");
}

export function resetDemo() {
  cache = buildSeed();
  persist();
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function audit(e: Omit<AuditEvent, "id" | "at">) {
  const db = getDB();
  db.audit.unshift({ ...e, id: uid("a"), at: new Date().toISOString() });
  if (db.audit.length > 2000) db.audit.pop();
  persist();
}

/** Notification dispatch: real adapters (WhatsApp Cloud API / SMS aggregator)
 *  fire when gateway creds exist; otherwise the record stays honestly 'queued'
 *  with a visible reason. Delivery status is updated from the provider response. */
export function enqueueNotification(n: Omit<NotificationRec, "id" | "status" | "createdAt" | "note">) {
  const db = getDB();
  const id = uid("n");
  const rec: NotificationRec = {
    ...n,
    id,
    status: "queued",
    note: undefined,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(rec);

  const phone = n.recipient.match(/\(([^)]+)\)/)?.[1] ?? "";
  const dispatch =
    n.channel === "whatsapp" ? sendWhatsApp(phone, n.payload)
    : n.channel === "sms" ? sendSms(phone, n.payload)
    : Promise.resolve({ ok: true } as const); // in-app: delivered by definition

  void Promise.resolve(dispatch).then((result) => {
    const row = getDB().notifications.find((x) => x.id === id);
    if (!row) return;
    if (result === null) {
      row.note = "No gateway configured — see Settings → Integrations"; // stays queued
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
