"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`nav-link themed ${path.startsWith(it.href) ? "active" : ""}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
