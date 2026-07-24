"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { Badge } from "@/components/ui";

export function DesignDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const focusedInput = useRef<HTMLInputElement>(null);

  useEffect(() => { focusedInput.current?.focus(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex min-h-screen">
      {/* Nav */}
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r p-4 sm:flex"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}>
        <div className="mb-3 font-bold">Design System</div>
        <span className="nav-link themed active">Demo screen</span>
        <span className="nav-link themed">Tokens</span>
        <span className="nav-link themed">States</span>
        <div className="mt-auto"><ThemeToggle /></div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold">§9.7.10 demo — every surface reads from tokens</h1>
          <span className="sm:hidden"><ThemeToggle /></span>
        </div>
        <p className="mb-5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Toggle the theme and tab through — focus rings, borders, badges, and states all resolve through tokens.css.
        </p>

        {/* Table */}
        <div className="themed mb-5 overflow-x-auto rounded-lg border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}>
          <table>
            <thead><tr><th>Case</th><th>Stage</th><th>Readiness</th><th>Balance</th></tr></thead>
            <tbody>
              <tr><td className="font-semibold">Malik vs. State</td><td>Bail — order reserved</td><td><Badge tone="success">ready</Badge></td><td>Rs 40,000</td></tr>
              <tr><td className="font-semibold">Khan Family — Guardianship</td><td>Arguments</td><td><Badge tone="warning">prepare</Badge></td><td>Rs 50,000</td></tr>
              <tr><td className="font-semibold">Sana Traders v. Metro</td><td>Evidence</td><td><Badge tone="danger">overdue reply</Badge></td><td>Rs 400,000</td></tr>
              <tr><td className="font-semibold">W.P. No. 4412/2026</td><td>Comments awaited</td><td><Badge tone="info">watching</Badge></td><td>—</td></tr>
            </tbody>
          </table>
        </div>

        {/* Form with a focused input + all four interactive states */}
        <div className="themed mb-5 rounded-lg border p-4"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}>
          <h2 className="mb-3 font-bold">Form — border-interactive on inputs, focus ring visible</h2>
          <form onSubmit={(e) => { e.preventDefault(); setToast("Hearing saved — client notification queued ✓"); }}
            className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Outcome (focused on load)
              <input ref={focusedInput} placeholder="e.g. Arguments heard; order reserved" className="mt-1" />
            </label>
            <label className="text-sm">Next date
              <input type="date" className="mt-1" />
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <button type="submit" className="themed rounded-md px-4 py-2 text-sm font-semibold btn-primary">Save (fires toast)</button>
              <button type="button" onClick={() => setModalOpen(true)} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">Open modal</button>
              <button type="button" disabled className="themed rounded-md px-4 py-2 text-sm font-semibold btn-primary">Disabled primary</button>
              <button type="button" disabled className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">Disabled secondary</button>
              <a href="/login" className="text-sm">A link in --color-link</a>
            </div>
          </form>
        </div>

        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Restraint check: exactly one accent moment per view, no gradients, no glow, one elevation step.
        </p>
      </main>

      {/* Modal — surface-elev, border-interactive boundary, focus trap entry */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Confirm filing"
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, var(--color-bg) 60%, transparent)" }}
          onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="themed modal-in w-full max-w-md rounded-lg border p-5"
            style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-border-interactive)", boxShadow: "var(--shadow-lg)" }}>
            <h3 className="mb-2 font-bold">File this document?</h3>
            <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Marking as filed shares the final version with the client and locks this draft. This action is recorded in the audit log.
            </p>
            <div className="flex justify-end gap-2">
              <button autoFocus onClick={() => setModalOpen(false)} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">Cancel</button>
              <button onClick={() => { setModalOpen(false); setToast("Document marked as filed ✓"); }} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-primary">Mark filed</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite"
          className="themed fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm font-semibold"
          style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-success)", color: "var(--color-text-primary)" }}>
          <span style={{ color: "var(--color-success)" }}>✓</span> {toast}
        </div>
      )}
    </div>
  );
}
