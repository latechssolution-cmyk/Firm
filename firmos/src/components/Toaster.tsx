"use client";

import { useEffect, useState } from "react";

/** Reads a ?toast=<message> URL param, shows a toast, and cleans the URL. */
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("toast");
    if (t) {
      setMsg(t);
      url.searchParams.delete("toast");
      window.history.replaceState({}, "", url.toString());
      const timer = setTimeout(() => setMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite"
      className="themed fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm font-semibold shadow-none"
      style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-success)", color: "var(--color-text-primary)" }}>
      <span style={{ color: "var(--color-success)" }}>✓</span> {msg}
    </div>
  );
}
