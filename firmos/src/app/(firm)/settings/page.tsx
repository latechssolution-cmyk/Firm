import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resetDemoData } from "@/lib/actions";
import { PageTitle, Card, Badge, Button } from "@/components/ui";

export default async function SettingsPage() {
  await requireUser(["admin"]);
  const db = await getDB();
  const integrations = [
    { name: "SMS gateway (branded mask)", env: "SMS_GATEWAY_KEY", configured: !!process.env.SMS_GATEWAY_KEY },
    { name: "WhatsApp Business Cloud API", env: "WHATSAPP_TOKEN", configured: !!process.env.WHATSAPP_TOKEN },
    { name: "Payment gateway (PayFast/Kuickpay)", env: "PAYMENT_GATEWAY_KEY", configured: !!process.env.PAYMENT_GATEWAY_KEY },
    { name: "Claude API (AI receptionist LLM)", env: "ANTHROPIC_API_KEY", configured: !!process.env.ANTHROPIC_API_KEY },
    { name: "Supabase (production data layer)", env: "SUPABASE_URL", configured: !!process.env.SUPABASE_URL },
  ];
  return (
    <div className="max-w-3xl">
      <PageTitle>Settings</PageTitle>

      <Card className="mb-4">
        <h2 className="mb-2 font-bold">Firm branding</h2>
        <div className="text-sm">{db.firm.name} · {db.firm.nameUrdu}</div>
        <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{db.firm.tagline}</div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-bold">Integrations</h2>
        <div className="flex flex-col gap-2">
          {integrations.map((i) => (
            <div key={i.env} className="flex items-center justify-between gap-2 text-sm">
              <span>{i.name} <code className="text-xs" style={{ color: "var(--color-text-secondary)" }}>({i.env})</code></span>
              <Badge tone={i.configured ? "success" : "warning"}>{i.configured ? "configured" : "not configured"}</Badge>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Set the environment variable and restart. Until a channel is configured, its notifications stay honestly &quot;queued&quot; — nothing is faked as sent.
        </p>
      </Card>

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
