#!/usr/bin/env node
/**
 * FirmOS heavy-compute worker (PRD §4.3 Oracle free-tier variant).
 * Runs on an OCI Always-Free ARM VM. Pulls jobs from the Supabase app_jobs
 * queue (claim_job RPC, atomic FOR UPDATE SKIP LOCKED), runs OCR (tesseract)
 * and PDF rendering (libreoffice), writes results back. Stateless & disposable:
 * if this VM is down, the app falls back to its inline paths — nothing depends
 * on the worker being up.
 *
 * Env (see worker/.env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_ID, POLL_MS, JOB_KINDS
 */
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const exec = promisify(execFile);
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_ID = process.env.WORKER_ID || `oci-${os.hostname()}`;
const POLL_MS = Number(process.env.POLL_MS || 4000);
const KINDS = (process.env.JOB_KINDS || "ping,ocr,pdf").split(",").map((s) => s.trim());

if (!URL || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

async function has(bin, args = ["--version"]) {
  try { await exec(bin, args); return true; } catch { return false; }
}

async function runOcr(payload) {
  // payload: { bucket, filePath }  → downloads from Supabase Storage, OCRs, returns text
  const { bucket, filePath } = payload;
  const dl = await sb.storage.from(bucket).download(filePath);
  if (dl.error) throw new Error(`download: ${dl.error.message}`);
  const tmp = path.join(os.tmpdir(), `ocr-${Date.now()}`);
  const inFile = `${tmp}${path.extname(filePath) || ".png"}`;
  await fs.writeFile(inFile, Buffer.from(await dl.data.arrayBuffer()));
  // eng+urd; tesseract writes <out>.txt
  await exec("tesseract", [inFile, tmp, "-l", "eng+urd"]);
  const text = await fs.readFile(`${tmp}.txt`, "utf-8");
  await fs.rm(inFile, { force: true }); await fs.rm(`${tmp}.txt`, { force: true });
  return { text: text.trim(), chars: text.trim().length };
}

async function runPdf(payload) {
  // payload: { html } or { docxBucket, docxPath } → returns { pdfBase64 } (small docs)
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
  const { data, error } = await sb.rpc("claim_job", { worker_id: WORKER_ID, kinds: KINDS });
  if (error) { console.error("claim error:", error.message); return false; }
  const job = Array.isArray(data) ? data[0] : data;
  if (!job) return false;
  console.log(`[${new Date().toISOString()}] claimed ${job.id} (${job.kind})`);
  try {
    const result = await handle(job);
    await sb.from("app_jobs").update({ status: "done", result, finished_at: new Date().toISOString() }).eq("id", job.id);
    console.log(`  done ${job.id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("app_jobs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", job.id);
    console.error(`  failed ${job.id}: ${msg}`);
  }
  return true;
}

async function main() {
  console.log(`FirmOS worker ${WORKER_ID} · kinds=[${KINDS}] · poll=${POLL_MS}ms`);
  console.log(`  tesseract: ${(await has("tesseract")) ? "yes" : "MISSING"} · libreoffice: ${(await has("libreoffice")) ? "yes" : "MISSING"}`);
  // Drain loop: if a job ran, immediately look for the next; else wait POLL_MS.
  for (;;) {
    let worked = false;
    try { worked = await tick(); } catch (e) { console.error("tick error:", e?.message ?? e); }
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
main();
