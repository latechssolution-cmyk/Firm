#!/usr/bin/env node
/** One-off: create app_logins, reload PostgREST schema cache, clear app_firm to force reseed. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(`create table if not exists app_logins (id text primary key, data jsonb not null, updated_at timestamptz default now())`);
await client.query(`alter table app_logins enable row level security`);
await client.query(`delete from app_firm`); // forces loadDB() to reseed all app_* tables cleanly
await client.query(`notify pgrst, 'reload schema'`);
const r = await client.query(`select count(*) from app_logins`);
console.log("app_logins ready, rows:", r.rows[0].count, "— app_firm cleared for reseed");
await client.end();
