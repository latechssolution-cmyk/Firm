/**
 * Real notification channel adapters (PRD §5.5 / §7.2).
 * Dormant until credentials exist; callers get an honest queued/sent/failed status.
 */

export interface SendResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

/** WhatsApp Business Cloud API (Meta Graph). Credentials are passed in (resolved
 *  from Settings-over-env) so the channel can be enabled live from the UI. */
export async function sendWhatsApp(toPhone: string, text: string, cfg: { token?: string; phoneId?: string } = {}): Promise<SendResult | null> {
  const token = cfg.token ?? process.env.WHATSAPP_TOKEN;
  const phoneId = cfg.phoneId ?? process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null; // not configured
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone.replace(/[^0-9+]/g, ""),
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, providerRef: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

/** Generic Pakistani SMS aggregator (HTTP POST). Endpoint + key passed in
 *  (resolved from Settings-over-env) so the channel can be enabled live. */
export async function sendSms(toPhone: string, text: string, cfg: { url?: string; key?: string; sender?: string } = {}): Promise<SendResult | null> {
  const url = cfg.url ?? process.env.SMS_GATEWAY_URL;
  const key = cfg.key ?? process.env.SMS_GATEWAY_KEY;
  if (!url || !key) return null; // not configured
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: toPhone.replace(/[^0-9+]/g, ""), message: text, sender: cfg.sender ?? process.env.SMS_SENDER_ID ?? "FIRMOS" }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => ({}));
    return { ok: true, providerRef: data?.id ?? data?.message_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}
