import type { DB, Integrations } from "./db/types";

/**
 * Effective integration config = what's saved in Settings (DB) merged over the
 * environment variables. A value saved in the UI wins, so an admin can enable a
 * channel live (no redeploy). Everything downstream (AI helper, notify adapters,
 * the Settings status badges) reads through here, so status is always dynamic.
 */
export function resolveIntegrations(db: DB): Required<Pick<Integrations, "geminiModel">> & Integrations {
  const i = db.firm.integrations ?? {};
  return {
    geminiApiKey: i.geminiApiKey || process.env.GEMINI_API_KEY,
    geminiModel: i.geminiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    whatsappToken: i.whatsappToken || process.env.WHATSAPP_TOKEN,
    whatsappPhoneId: i.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID,
    smsKey: i.smsKey || process.env.SMS_GATEWAY_KEY,
    smsUrl: i.smsUrl || process.env.SMS_GATEWAY_URL,
    smsSender: i.smsSender || process.env.SMS_SENDER_ID,
    paymentKey: i.paymentKey || process.env.PAYMENT_GATEWAY_KEY,
  };
}

export type IntegrationStatus = {
  key: string;
  name: string;
  on: boolean;
  detail: string; // masked hint of what's set, or what's missing
  fields: { name: string; label: string; secret: boolean; set: boolean }[];
};

const mask = (v?: string) => (v ? `••••${v.slice(-4)}` : "");

/** Per-integration on/off + which fields are set — for the Settings UI. A channel
 *  is "on" only when the FULL set it needs is present (matches the adapters). */
export function integrationStatuses(db: DB): IntegrationStatus[] {
  const r = resolveIntegrations(db);
  return [
    {
      key: "gemini",
      name: "Gemini API (AI receptionist + case brief)",
      on: !!r.geminiApiKey,
      detail: r.geminiApiKey ? `key ${mask(r.geminiApiKey)} · model ${r.geminiModel}` : "Add a key to activate the AI layer",
      fields: [
        { name: "geminiApiKey", label: "API key", secret: true, set: !!r.geminiApiKey },
        { name: "geminiModel", label: "Model (default gemini-2.5-flash)", secret: false, set: !!(db.firm.integrations?.geminiModel) },
      ],
    },
    {
      key: "whatsapp",
      name: "WhatsApp Business Cloud API",
      on: !!(r.whatsappToken && r.whatsappPhoneId),
      detail: r.whatsappToken && r.whatsappPhoneId ? `token ${mask(r.whatsappToken)} · phone id set` : "Needs token + phone id",
      fields: [
        { name: "whatsappToken", label: "Access token", secret: true, set: !!r.whatsappToken },
        { name: "whatsappPhoneId", label: "Phone number id", secret: false, set: !!r.whatsappPhoneId },
      ],
    },
    {
      key: "sms",
      name: "SMS gateway (branded mask)",
      on: !!(r.smsKey && r.smsUrl),
      detail: r.smsKey && r.smsUrl ? `key ${mask(r.smsKey)} · endpoint set` : "Needs API key + endpoint URL",
      fields: [
        { name: "smsKey", label: "API key", secret: true, set: !!r.smsKey },
        { name: "smsUrl", label: "Endpoint URL", secret: false, set: !!r.smsUrl },
        { name: "smsSender", label: "Sender / mask (optional)", secret: false, set: !!r.smsSender },
      ],
    },
    {
      key: "payment",
      name: "Payment gateway (PayFast / Kuickpay)",
      on: !!r.paymentKey,
      detail: r.paymentKey ? `key ${mask(r.paymentKey)}` : "Add a gateway key to enable online payment links",
      fields: [{ name: "paymentKey", label: "Gateway key", secret: true, set: !!r.paymentKey }],
    },
    {
      key: "supabase",
      name: "Supabase (production data layer)",
      on: !!process.env.SUPABASE_URL,
      detail: process.env.SUPABASE_URL ? "connected (env-managed)" : "local demo store",
      fields: [], // infra-level, managed by env only
    },
  ];
}
