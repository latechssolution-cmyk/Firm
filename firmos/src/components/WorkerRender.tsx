"use client";

import { useEffect, useRef, useState } from "react";

/** Enqueues a PDF render on the OCI worker and polls until ready (PRD §4.3). */
export function WorkerRender({ docId, workerConfigured }: { docId: string; workerConfigured: boolean }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    setErr(null); setReady(false); setBytes(null); setStatus("queued");
    const res = await fetch("/api/jobs/render", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId }),
    });
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? "failed to queue"); setStatus(""); return; }
    setJobId((await res.json()).jobId);
  }

  useEffect(() => {
    if (!jobId) return;
    timer.current = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const d = await res.json();
      setStatus(d.status);
      if (d.ready) { setReady(true); setBytes(d.bytes); if (timer.current) clearInterval(timer.current); }
      if (d.status === "failed" && timer.current) { clearInterval(timer.current); setErr("render failed on worker"); }
    }, 2500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [jobId]);

  if (!workerConfigured) {
    return (
      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        High-fidelity PDF render runs on the OCI worker (needs Supabase + worker online).
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={start} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">
        Render PDF on OCI worker
      </button>
      {status && !ready && !err && (
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>worker: {status}…</span>
      )}
      {ready && jobId && (
        <a href={`/api/jobs/${jobId}/download`} className="text-sm font-semibold" style={{ color: "var(--color-link)" }}>
          ↓ Download worker PDF{bytes ? ` (${(bytes / 1024).toFixed(1)} KB)` : ""}
        </a>
      )}
      {err && <span className="text-xs" style={{ color: "var(--color-danger)" }}>{err}</span>}
    </div>
  );
}
