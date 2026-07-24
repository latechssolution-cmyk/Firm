"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Shows a transient toast from a `?toast=<message>` URL param, then strips the
 *  param. Reads it via useSearchParams so it fires on soft (client-side)
 *  navigations too — server-action redirects land as soft navigations, which a
 *  mount-only effect would miss (the layout, and this component, stay mounted). */
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const toast = searchParams.get("toast");

  // Capture the toast on every navigation that carries one, then strip the param
  // from the URL bar via the History API — NOT the router — so cleaning up never
  // triggers a navigation (which would remount this component and drop the toast).
  useEffect(() => {
    if (!toast) return;
    setMsg(toast);
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState(window.history.state, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Auto-dismiss — kept in its own effect so cleaning the URL never cancels it.
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite"
      className="themed toast-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm font-semibold"
      style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-success)", color: "var(--color-text-primary)", boxShadow: "var(--shadow-lg)" }}>
      <span style={{ color: "var(--color-success)" }}>✓</span> {msg}
    </div>
  );
}
