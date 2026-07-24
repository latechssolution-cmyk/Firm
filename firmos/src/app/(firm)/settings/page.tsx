import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resetDemoData, updateFirmProfile, updateIntegrations } from "@/lib/actions";
import { integrationStatuses } from "@/lib/settings";
import { PageTitle, Card, Badge, Button } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SettingsPage() {
  await requireUser(["admin"]);
  const db = await getDB();
  const statuses = integrationStatuses(db);
  const saved = (db.firm.integrations ?? {}) as Record<string, string | undefined>;

  return (
    <div className="max-w-3xl">
      <PageTitle>Settings</PageTitle>

      {/* Firm profile — editable */}
      <Card className="mb-4">
        <h2 className="mb-1 font-bold">Firm profile</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Shown across the app — the sidebar, login, client portal, and generated documents.
        </p>
        <form action={updateFirmProfile} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Firm name
            <input name="name" defaultValue={db.firm.name} required className="mt-1" />
          </label>
          <label className="text-sm">Name (Urdu)
            <input name="nameUrdu" defaultValue={db.firm.nameUrdu} dir="rtl" className="mt-1" />
          </label>
          <label className="text-sm sm:col-span-2">Tagline
            <input name="tagline" defaultValue={db.firm.tagline} className="mt-1" />
          </label>
          <div className="sm:col-span-2"><SubmitButton>Save profile</SubmitButton></div>
        </form>
      </Card>

      {/* Integrations — editable, DB-backed, live status */}
      <Card className="mb-4">
        <h2 className="mb-1 font-bold">Integrations</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Saved here and applied live — no redeploy. A saved value overrides the matching environment variable.
          Secrets are stored on your tenant and never shown again; leave a secret blank to keep it.
        </p>
        <form action={updateIntegrations} className="flex flex-col gap-3">
          {statuses.map((s) => (
            <div key={s.key} className="rounded-xl border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{s.name}</span>
                <Badge tone={s.on ? "success" : "warning"}>{s.on ? "on" : "off"}</Badge>
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.detail}</div>
              {s.fields.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {s.fields.map((f) => (
                    <div key={f.name} className="text-xs">
                      <label className="block">
                        {f.label}
                        <input
                          name={f.name}
                          type={f.secret ? "password" : "text"}
                          autoComplete="off"
                          defaultValue={f.secret ? "" : (saved[f.name] ?? "")}
                          placeholder={f.secret ? (f.set ? "•••• saved — leave blank to keep" : "not set") : ""}
                          className="mt-1"
                        />
                      </label>
                      {f.secret && f.set && (
                        <label className="mt-1 flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                          <input type="checkbox" name={`clear_${f.name}`} className="!w-auto" /> remove saved key
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div><SubmitButton>Save integrations</SubmitButton></div>
        </form>
      </Card>

      {/* Notification queue */}
      <Card className="mb-4">
        <h2 className="mb-3 font-bold">Notification queue</h2>
        <div className="flex flex-col gap-2">
          {db.notifications.slice(0, 20).map((n) => (
            <div key={n.id} className="rounded-md border p-2 text-sm" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{n.recipient}</span>
                <Badge tone={n.status === "sent" || n.status === "delivered" ? "success" : n.status === "failed" ? "danger" : "warning"}>{n.channel} · {n.status}</Badge>
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{n.payload}</div>
              {n.note && <div className="text-xs" style={{ color: "var(--color-warning)" }}>{n.note}</div>}
            </div>
          ))}
          {db.notifications.length === 0 && <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Empty.</span>}
        </div>
      </Card>

      {/* Demo tenant */}
      <Card>
        <h2 className="mb-2 font-bold">Demo tenant</h2>
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Reset restores the seeded dataset (86 active cases, 7 hearings tomorrow, Rs 940K pending). In production this runs nightly via pg_cron.
        </p>
        <form action={resetDemoData}><Button kind="danger-outline">Reset demo data</Button></form>
      </Card>
    </div>
  );
}
