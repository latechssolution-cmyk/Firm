import Link from "next/link";
import { requireUser, canSeeFees } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logout } from "@/lib/actions";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";

export default async function FirmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cases", label: "Cases" },
    { href: "/diary", label: "Court Diary" },
    { href: "/clients", label: "Clients" },
    { href: "/documents", label: "Documents" },
    ...(canSeeFees(user) ? [{ href: "/fees", label: "Fees & Billing" }] : []),
    { href: "/inquiries", label: "Inquiries" },
    ...(user.role === "admin" ? [{ href: "/audit", label: "Audit Log" }, { href: "/settings", label: "Settings" }] : []),
  ];
  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-60 shrink-0 flex-col gap-1 border-r p-4 md:flex"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)" }}
      >
        <div className="mb-4">
          <div className="font-bold leading-tight">{db.firm.name}</div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{db.firm.nameUrdu}</div>
        </div>
        <NavLinks items={items} />
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {user.name} · {user.role}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="themed rounded-md px-3 py-1.5 text-sm btn-secondary">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between md:hidden">
          <Link href="/dashboard" className="font-bold" style={{ color: "var(--color-text-primary)" }}>{db.firm.name}</Link>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
