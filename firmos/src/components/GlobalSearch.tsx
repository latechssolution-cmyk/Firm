"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Hit = { href: string; title: string; sub: string; kind: string };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) { setHits([]); setMs(null); return; }
    const t = setTimeout(async () => {
      const started = performance.now();
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as Hit[];
      setMs(Math.round(performance.now() - started));
      setHits(data);
      setOpen(true);
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setActive(0); }, [hits]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Cmd/Ctrl+K focuses search from anywhere; "/" when not typing.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT") {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const h = hits[active]; if (h) window.location.href = h.href; }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }

  return (
    <div ref={boxRef} className="relative w-64 max-w-full">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search…  (⌘K or /)"
        aria-label="Global search"
      />
      {open && (
        <div
          className="themed absolute right-0 z-20 mt-1 max-h-80 w-80 overflow-auto rounded-md border shadow-none"
          style={{ background: "var(--color-surface-elev)", borderColor: "var(--color-border-interactive)" }}
        >
          {ms !== null && (
            <div className="border-b px-3 py-1.5 text-[11px]" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
              {hits.length} results in {ms} ms
            </div>
          )}
          {hits.length === 0 && <div className="px-3 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>No matches.</div>}
          {hits.map((h, i) => (
            <Link key={i} href={h.href} onClick={() => setOpen(false)} onMouseEnter={() => setActive(i)}
              className="block border-b px-3 py-2 text-sm no-underline last:border-b-0"
              style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)", background: i === active ? "var(--color-muted-bg)" : "transparent" }}>
              <span className="font-semibold">{h.title}</span>
              <span className="ml-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>{h.kind} · {h.sub}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
