/**
 * Gemini (Google Generative Language API) helper.
 *
 * When GEMINI_API_KEY is set, the AI receptionist and the case brief use Gemini
 * for natural-language polish; without it, both fall back to their deterministic
 * output — the features never go down. The API key is sent via the
 * `x-goog-api-key` header (never in the URL/query string). Thinking is disabled
 * so the token budget goes to the actual reply, not hidden reasoning.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

type Turn = { role: "user" | "model"; text: string };

/** Generate text with Gemini. Returns the trimmed reply, or null if unconfigured
 *  or on any failure (caller then uses its deterministic fallback). The API key
 *  and model are passed in (resolved from Settings-over-env), so config is dynamic;
 *  they fall back to the environment variables when omitted. */
export async function geminiGenerate(opts: {
  system: string;
  turns?: Turn[];
  user: string;
  maxTokens?: number;
  apiKey?: string;
  model?: string;
}): Promise<string | null> {
  const key = opts.apiKey ?? process.env.GEMINI_API_KEY;
  const model = opts.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!key) return null;
  const contents = [
    ...(opts.turns ?? []).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user" as const, parts: [{ text: opts.user }] },
  ];
  try {
    const r = await fetch(GEMINI_ENDPOINT(model), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents,
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 500,
          temperature: 0.6,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? "").join("") : "";
    return text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
