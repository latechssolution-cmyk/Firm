import Link from "next/link";
import { requireUser, canSeeFees } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { logout } from "@/lib/actions";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { MobileNav } from "@/components/MobileNav";
import { IconCases } from "@/components/icons";

export default async function FirmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  // Flat list for the mobile menu; sectioned list for the desktop sidebar.
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cases", label: "Cases" },
    { href: "/diary", label: "Court Diary" },
    { href: "/clients", label: "Clients" },
    { href: "/documents", label: "Documents" },
    ...(canSeeFees(user) ? [{ href: "/fees", label: "Fees & Billing" }] : []),
    { href: "/inquiries", label: "Inquiries" },
    ...(user.role === "admin" ? [{ href: "/audit", label: "Audit Log" }, { href: "/settings", label: "Settings" }] : []),
  ];
  const items = navItems;
  const sectioned = [
    { section: "Practice" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cases", label: "Cases" },
    { href: "/diary", label: "Court Diary" },
    { href: "/clients", label: "Clients" },
    { section: "Workspace" },
    { href: "/documents", label: "Documents" },
    ...(canSeeFees(user) ? [{ href: "/fees", label: "Fees & Billing" }] : []),
    { href: "/inquiries", label: "Inquiries" },
    ...(user.role === "admin" ? [{ section: "Admin" }, { href: "/audit", label: "Audit Log" }, { href: "/settings", label: "Settings" }] : []),
  ];
  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-60 shrink-0 flex-col gap-1 border-r p-4 md:flex"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border-subtle)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", boxShadow: "var(--shadow-sm)" }}>
            <IconCases size={18} />
          </span>
          <div className="min-w-0">
            <div className="font-display truncate font-bold leading-tight">{db.firm.name}</div>
            <div className="truncate text-xs" style={{ color: "var(--color-text-secondary)" }}>{db.firm.nameUrdu}</div>
          </div>
        </div>
        <NavLinks items={sectioned} />
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
        <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav
              items={items}
              userName={user.name}
              userRole={user.role}
              onSignOut={
                <form action={logout}>
                  <button type="submit" className="themed w-full rounded-md px-3 py-1.5 text-sm btn-secondary">Sign out</button>
                </form>
              }
            />
            <Link href="/dashboard" className="font-bold" style={{ color: "var(--color-text-primary)" }}>{db.firm.name}</Link>
          </div>
          <ThemeToggle />
        </div>
        <div className="animate-in">{children}</div>
      </main>
    </div>
  );
}
