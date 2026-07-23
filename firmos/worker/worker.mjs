#!/usr/bin/env node
/**
 * FirmOS heavy-compute worker (PRD §4.3 Oracle free-tier variant).
 * Dependency-free: uses global fetch against Supabase's REST API (no
 * @supabase/supabase-js), so it runs on any Node 18+ with a tiny footprint —
 * ideal for an Always-Free micro VM. Pulls jobs from app_jobs (claim_job RPC,
 * atomic FOR UPDATE SKIP LOCKED), runs OCR (tesseract) and PDF (libreoffice),
 * writes results back. Stateless & disposable: if this VM is down, the app
 * falls back to its inline paths — nothing depends on the worker being up.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const exec = promisify(execFile);
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_ID = process.env.WORKER_ID || `oci-${os.hostname()}`;
const POLL_MS = Number(process.env.POLL_MS || 4000);
const KINDS = (process.env.JOB_KINDS || "ping,ocr,pdf").split(",").map((s) => s.trim());
if (!URL_ || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = (p) => `${URL_}/rest/v1/${p}`;

async function rpcClaim() {
  const r = await fetch(rest("rpc/claim_job"), {
    method: "POST", headers: H,
    body: JSON.stringify({ worker_id: WORKER_ID, kinds: KINDS }),
  });
  if (!r.ok) throw new Error(`claim_job ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : rows;
}
async function finish(id, patch) {
  const r = await fetch(rest(`app_jobs?id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(patch),
  });
  if (!r.ok) console.error(`update ${id} ${r.status}: ${await r.text()}`);
}
async function storageDownload(bucket, filePath) {
  const r = await fetch(`${URL_}/storage/v1/object/${bucket}/${filePath}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function has(bin, args = ["--version"]) { try { await exec(bin, args); return true; } catch { return false; } }

async function runOcr(payload) {
  const { bucket, filePath } = payload;
  const buf = await storageDownload(bucket, filePath);
  const tmp = path.join(os.tmpdir(), `ocr-${Date.now()}`);
  const inFile = `${tmp}${path.extname(filePath) || ".png"}`;
  await fs.writeFile(inFile, buf);
  await exec("tesseract", [inFile, tmp, "-l", "eng+urd"]);
  const text = (await fs.readFile(`${tmp}.txt`, "utf-8")).trim();
  await fs.rm(inFile, { force: true }); await fs.rm(`${tmp}.txt`, { force: true });
  return { text, chars: text.length };
}
async function runPdf(payload) {
  const tmp = path.join(os.tmpdir(), `pdf-${Date.now()}`);
  const srcHtml = `${tmp}.html`;
  await fs.writeFile(srcHtml, payload.html ?? "<html><body>empty</body></html>");
  await exec("libreoffice", ["--headless", "--convert-to", "pdf", "--outdir", os.tmpdir(), srcHtml]);
  const pdf = await fs.readFile(`${tmp}.pdf`);
  await fs.rm(srcHtml, { force: true }); await fs.rm(`${tmp}.pdf`, { force: true });
  return { pdfBase64: pdf.toString("base64"), bytes: pdf.length };
}
async function handle(job) {
  if (job.kind === "ping") return { pong: true, worker: WORKER_ID, at: new Date().toISOString() };
  if (job.kind === "ocr") return runOcr(job.payload);
  if (job.kind === "pdf") return runPdf(job.payload);
  throw new Error(`unknown kind ${job.kind}`);
}

async function tick() {
  const job = await rpcClaim();
  if (!job) return false;
  console.log(`[${new Date().toISOString()}] claimed ${job.id} (${job.kind})`);
  try {
    const result = await handle(job);
    await finish(job.id, { status: "done", result, finished_at: new Date().toISOString() });
    console.log(`  done ${job.id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish(job.id, { status: "failed", error: msg, finished_at: new Date().toISOString() });
    console.error(`  failed ${job.id}: ${msg}`);
  }
  return true;
}

async function main() {
  console.log(`FirmOS worker ${WORKER_ID} · kinds=[${KINDS}] · poll=${POLL_MS}ms`);
  console.log(`  tesseract: ${(await has("tesseract")) ? "yes" : "MISSING"} · libreoffice: ${(await has("libreoffice")) ? "yes" : "MISSING"}`);
  for (;;) {
    let worked = false;
    try { worked = await tick(); } catch (e) { console.error("tick error:", e?.message ?? e); }
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
main();
