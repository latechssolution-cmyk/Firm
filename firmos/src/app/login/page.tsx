import { getDB } from "@/lib/db";
import { login } from "@/lib/actions";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { IconCases } from "@/components/icons";

export default async function LoginPage() {
  const db = await getDB();
  const roleLabel: Record<string, string> = {
    admin: "Partner / Admin", associate: "Associate", clerk: "Munshi / Clerk", client: "Client portal",
  };
  const roleInitial: Record<string, string> = { admin: "P", associate: "A", clerk: "M", client: "C" };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="animate-in flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", boxShadow: "var(--shadow-md)" }}>
            <IconCases size={22} />
          </span>
          <div>
            <div className="font-display text-2xl font-bold leading-tight">{db.firm.name}</div>
            <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{db.firm.nameUrdu}</div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Card className="animate-in">
        <h1 className="font-display text-lg font-bold">Sign in</h1>
        <p className="mb-4 mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Demo tenant — choose a role to explore. Production uses Supabase Auth with MFA.
        </p>
        <div className="flex flex-col gap-2">
          {db.users.map((u) => (
            <form key={u.id} action={login}>
              <input type="hidden" name="userId" value={u.id} />
              <button type="submit"
                className="themed flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left btn-secondary">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: "var(--color-muted-bg)", color: "var(--color-primary)", border: "1px solid var(--color-border-subtle)" }}>
                  {roleInitial[u.role]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{u.name}</span>
                  <span className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>{roleLabel[u.role]}</span>
                </span>
                <span aria-hidden style={{ color: "var(--color-text-secondary)" }}>→</span>
              </button>
            </form>
          ))}
        </div>
      </Card>

      <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
        FirmOS · Legal practice management ·{" "}
        <a href="/reception">Try the AI receptionist</a> without signing in.
      </p>
    </main>
  );
}
