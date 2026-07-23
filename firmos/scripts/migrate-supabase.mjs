#!/usr/bin/env node
/** Applies supabase/migrations/*.sql to the DATABASE_URL Postgres (Supabase). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Load .env.local manually (no dotenv dependency).
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const only = process.argv[2]; // optional: run a single migration file by name
const dir = path.join(root, "supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && (!only || f === only)).sort();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  console.log("Connected to", new URL(url).hostname);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), "utf-8");
    process.stdout.write(`Applying ${f} … `);
    try {
      await client.query(sql);
      console.log("ok");
    } catch (e) {
      if (/already exists/i.test(e.message)) console.log(`skipped (${e.message.split("\n")[0]})`);
      else throw e;
    }
  }
  const r = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by 1");
  console.log("Public tables:", r.rows.map((x) => x.table_name).join(", "));
} finally {
  await client.end();
}
