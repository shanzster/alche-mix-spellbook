/**
 * Gemini server helper — SERVER-ONLY.
 * ────────────────────────────────────────────────────────────────────────────
 * This file must never be imported by a client component. It is only ever
 * reached from inside a `createServerFn` handler (see `src/lib/ai.ts`), so the
 * API key stays on the server. This follows Free-Ai-Implementation-Tutorial.MD
 * §2 ("never put the API key in the browser") and §3 (the server proxy).
 *
 * ⚠️  BLANK-FOR-NOW: the real network call is written and ready, but it only
 * fires once a real GEMINI_API_KEY is set. Until then `askGemini` throws
 * `AINotConfiguredError`, and every caller in `ai.ts` catches that and returns a
 * rule-based fallback. To go live: put a real key in `.env` (local) /
 * `wrangler secret put GEMINI_API_KEY` (prod) — no other code changes needed.
 */

const PLACEHOLDER_KEY = "__PLACEHOLDER_ADD_YOUR_GEMINI_KEY__";
// "-latest" alias tracks the current stable Flash model, so retired-model 404s
// (which killed gemini-2.0-flash) can't recur. Pin via GEMINI_MODEL if needed.
const DEFAULT_MODEL = "gemini-flash-latest";
// When the primary Flash pool is overloaded (HTTP 503 "high demand" / 429),
// one retry plus a hop to the Lite pool usually still gets a real answer
// before the rule-based fallback has to take over.
const OVERLOAD_FALLBACK_MODEL = "gemini-flash-lite-latest";

const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Thrown when no usable key is present. Callers treat this as "use fallback". */
export class AINotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set (or is still the placeholder) on the server");
    this.name = "AINotConfiguredError";
  }
}

/** The resolved server key, or null if it's missing / still the placeholder. */
function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === PLACEHOLDER_KEY || key.trim() === "") return null;
  return key;
}

/** True once a real key is configured — features can flag "AI is live". */
export function isAIConfigured(): boolean {
  return getApiKey() !== null;
}

/** The model askGemini will actually call (env override or default). */
export function resolvedModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export type GeminiPart =
  | { text: string }
  // `data` is raw base64 with NO `data:` prefix (tutorial §5 step 4).
  | { inlineData: { mimeType: string; data: string } };

export interface AskGeminiOptions {
  parts: GeminiPart[];
  /** Ask Gemini for strict JSON matching this shape — drops straight into the app. */
  jsonSchema?: Record<string, unknown>;
  system?: string;
  temperature?: number;
}

/**
 * Calls Gemini and returns the model's reply (parsed object if `jsonSchema` was
 * given, else the raw string). Throws `AINotConfiguredError` when keyless.
 */
export async function askGemini<T = unknown>({
  parts,
  jsonSchema,
  system,
  temperature = 0.4,
}: AskGeminiOptions): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[AI] ✗ GEMINI_API_KEY not set — using rule-based fallback");
    throw new AINotConfiguredError();
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      ...(jsonSchema
        ? { responseMimeType: "application/json", responseSchema: jsonSchema }
        : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const attempt = (m: string) =>
    fetch(`${endpoint(m)}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const overloaded = (r: Response) => r.status === 503 || r.status === 429;

  let model = resolvedModel();
  let res = await attempt(model);
  if (overloaded(res)) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await attempt(model);
  }
  if (overloaded(res) && model !== OVERLOAD_FALLBACK_MODEL) {
    console.warn(`[AI] ⚠ ${model} overloaded (HTTP ${res.status}) — retrying on ${OVERLOAD_FALLBACK_MODEL}`);
    model = OVERLOAD_FALLBACK_MODEL;
    res = await attempt(model);
  }

  if (!res.ok) {
    // Surface the status so callers can back off on 429 (tutorial §6).
    const errText = await res.text();
    console.error(`[AI] ✗ Gemini call FAILED (HTTP ${res.status}, model ${model}): ${errText.slice(0, 300)}`);
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }
  console.log(`[AI] ✓ Gemini responded (model ${model})`);

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return (jsonSchema ? JSON.parse(text) : text) as T;
}
