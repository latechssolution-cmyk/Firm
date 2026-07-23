"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcon } from "@/components/icons";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = navIcon[it.href];
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`nav-link themed flex items-center gap-2.5 ${path.startsWith(it.href) ? "active" : ""}`}
          >
            {Icon && <Icon size={17} />}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
