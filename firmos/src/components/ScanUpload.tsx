"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "uploading" | "ocr" | "done" | "failed";

/** Upload a scanned document; images are OCR'd on the worker and made searchable. */
export function ScanUpload({ caseId, configured }: { caseId: string; configured: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("uploading"); setMsg(file.name);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("caseId", caseId);
    fd.append("title", file.name);
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    if (!res.ok) { setPhase("failed"); setMsg((await res.json().catch(() => ({}))).error ?? "upload failed"); return; }
    const { docId, ocr } = await res.json();

    if (!ocr) { setPhase("done"); setMsg("Uploaded & filed"); router.refresh(); resetInput(); return; }

    // Poll the OCR job until the worker finishes and the text is stored.
    setPhase("ocr"); setMsg("Reading text (OCR)…");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const s = await fetch("/api/documents/ocr-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId }) });
      if (!s.ok) continue;
      const d = await s.json();
      if (d.status === "done") { setPhase("done"); setMsg(`Text extracted (${d.chars} chars) — now searchable`); router.refresh(); resetInput(); return; }
      if (d.status === "failed") { setPhase("failed"); setMsg("OCR failed — file is stored, but not searchable"); router.refresh(); resetInput(); return; }
      if (d.status === "running") setMsg("Reading text on the worker…");
    }
    setPhase("failed"); setMsg("OCR is taking longer than expected — the worker may be offline.");
    router.refresh(); resetInput();
  }

  function resetInput() { if (inputRef.current) inputRef.current.value = ""; }

  if (!configured) {
    return <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Scan upload needs Supabase configured.</span>;
  }

  const busy = phase === "uploading" || phase === "ocr";
  const tone = phase === "done" ? "var(--color-success)" : phase === "failed" ? "var(--color-danger)" : "var(--color-text-secondary)";

  return (
    <div className="flex flex-col gap-1.5">
      <label className={`themed btn-secondary inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${busy ? "opacity-60" : ""}`}>
        {busy && <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
        ↑ Upload scan
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={busy} />
      </label>
      {phase !== "idle" && <span className="text-xs" style={{ color: tone }}>{msg}</span>}
      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>Images &amp; PDFs are read with OCR (English + Urdu) and made searchable.</span>
    </div>
  );
}
