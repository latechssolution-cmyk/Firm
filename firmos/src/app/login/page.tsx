import { getDB } from "@/lib/db";
import { login } from "@/lib/actions";
import { Card, Button } from "@/components/ui";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";

export default async function LoginPage() {
  const db = await getDB();
  const roleLabel: Record<string, string> = {
    admin: "Partner / Admin", associate: "Associate", clerk: "Munshi / Clerk", client: "Client (portal)",
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{db.firm.name}</div>
          <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {db.firm.nameUrdu} · FirmOS
          </div>
        </div>
        <ThemeToggle />
      </div>
      <Card>
        <h1 className="mb-1 text-lg font-bold">Sign in</h1>
        <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Demo tenant — pick a role. Production uses Supabase Auth with MFA (PRD SEC-3).
        </p>
        <div className="flex flex-col gap-2">
          {db.users.map((u) => (
            <form key={u.id} action={login}>
              <input type="hidden" name="userId" value={u.id} />
              <button
                type="submit"
                className="themed w-full rounded-md px-4 py-3 text-left text-sm btn-secondary"
              >
                <span className="font-semibold">{u.name}</span>
                <span className="ml-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {roleLabel[u.role]}
                </span>
              </button>
            </form>
          ))}
        </div>
      </Card>
      <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Client callers: try the <a href="/reception">AI receptionist</a> without signing in.
      </p>
    </main>
  );
}
