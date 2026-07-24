"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcon } from "@/components/icons";

type Item = { href: string; label: string } | { section: string };

export function NavLinks({ items }: { items: Item[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((it, i) =>
        "section" in it ? (
          <div key={`s${i}`} className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-text-secondary)" }}>
            {it.section}
          </div>
        ) : (
          (() => {
            const Icon = navIcon[it.href];
            const active = path.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href} className={`nav-link themed flex items-center gap-2.5 ${active ? "active" : ""}`}>
                {Icon && <Icon size={17} />}
                {it.label}
              </Link>
            );
          })()
        )
      )}
    </nav>
  );
}
