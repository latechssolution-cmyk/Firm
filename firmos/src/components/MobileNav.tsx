"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Mobile navigation drawer (advocates work from phones — PRD §4.4). */
export function MobileNav({
  items, userName, userRole, onSignOut,
}: {
  items: { href: string; label: string }[];
  userName: string;
  userRole: string;
  onSignOut: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="themed rounded-md px-3 py-1.5 text-sm font-semibold btn-secondary"
      >
        ☰ Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}
          style={{ background: "color-mix(in srgb, var(--color-bg) 55%, transparent)" }}>
          <nav
            onClick={(e) => e.stopPropagation()}
            className="themed absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col gap-1 border-r p-4"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                {userName} · {userRole}
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="px-2 text-lg" style={{ color: "var(--color-text-secondary)" }}>×</button>
            </div>
            {items.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                className={`nav-link themed ${path.startsWith(it.href) ? "active" : ""}`}>
                {it.label}
              </Link>
            ))}
            <div className="mt-auto pt-4">{onSignOut}</div>
          </nav>
        </div>
      )}
    </>
  );
}
