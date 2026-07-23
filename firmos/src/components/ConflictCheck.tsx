"use client";

import { useEffect, useState } from "react";

type Conflict = { caseId: string; caseNumber: string; caseTitle: string; reason: string };

/** Watches the plaintiff/defendant inputs and warns of conflicts of interest as you type. */
export function ConflictCheck() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  useEffect(() => {
    const form = document.querySelector("form");
    if (!form) return;
    const run = async () => {
      const p = (form.querySelector('[name="plaintiff"]') as HTMLInputElement)?.value ?? "";
      const d = (form.querySelector('[name="defendant"]') as HTMLInputElement)?.value ?? "";
      if (!p && !d) { setConflicts([]); return; }
      const res = await fetch(`/api/conflict?plaintiff=${encodeURIComponent(p)}&defendant=${encodeURIComponent(d)}`);
      if (res.ok) setConflicts((await res.json()).conflicts ?? []);
    };
    let t: ReturnType<typeof setTimeout>;
    const onInput = (e: Event) => {
      const name = (e.target as HTMLElement).getAttribute?.("name");
      if (name === "plaintiff" || name === "defendant") { clearTimeout(t); t = setTimeout(run, 350); }
    };
    form.addEventListener("input", onInput);
    return () => { form.removeEventListener("input", onInput); clearTimeout(t); };
  }, []);

  if (conflicts.length === 0) return null;
  return (
    <div className="themed rounded-md border p-3 md:col-span-2" style={{ borderColor: "var(--color-warning)", background: "var(--color-surface)" }}>
      <div className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
        ⚠ Possible conflict of interest ({conflicts.length})
      </div>
      <ul className="mt-1 space-y-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        {conflicts.map((c) => (
          <li key={c.caseId}>• {c.reason} — <span style={{ color: "var(--color-text-primary)" }}>{c.caseTitle} ({c.caseNumber})</span></li>
        ))}
      </ul>
      <div className="mt-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>Review before proceeding — a party here already appears in another matter.</div>
    </div>
  );
}
