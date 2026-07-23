#!/usr/bin/env node
/** Finds the project's IPv4 Supabase pooler host by probing regions. */
import pg from "pg";

const REF = process.env.SUPABASE_REF ?? "";
const PASS = process.env.DB_PASS ?? "";
if (!REF || !PASS) { console.error("Set SUPABASE_REF and DB_PASS env vars"); process.exit(1); }
const regions = [
  "us-east-1","us-east-2","us-west-1","us-west-2","eu-central-1","eu-west-1","eu-west-2","eu-west-3",
  "ap-south-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","sa-east-1","ca-central-1",
];
const prefixes = ["aws-0", "aws-1"];

for (const p of prefixes) {
  for (const r of regions) {
    const host = `${p}-${r}.pooler.supabase.com`;
    const client = new pg.Client({
      host, port: 5432, database: "postgres",
      user: `postgres.${REF}`, password: PASS,
      ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000,
    });
    try {
      await client.connect();
      console.log(`FOUND ${host}`);
      const v = await client.query("select current_database(), version()");
      console.log(v.rows[0].current_database);
      await client.end();
      process.exit(0);
    } catch (e) {
      const msg = (e.message ?? "").split("\n")[0];
      if (!/Tenant or user not found|ENOTFOUND|timeout|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
        console.log(`${host}: ${msg}`); // unexpected error (e.g. bad password on the RIGHT host)
      }
      try { await client.end(); } catch {}
    }
  }
}
console.log("no pooler host matched");
process.exit(1);
