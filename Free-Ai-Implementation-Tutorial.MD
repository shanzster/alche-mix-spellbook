# Free AI Implementation Tutorial — AlcheMix

This guide shows you how to set up a **completely free** AI backend for the
AlcheMix student features, using your current stack (TanStack Start + Nitro +
Firebase, deployed on Cloudflare).

It maps directly to the AI-dependent items in `Student-Requirements.MD`:

| Requirement | AI capability needed | Type |
|---|---|---|
| §1 Multimodal AR Scavenger Hunt — mission submission | Look at a webcam photo + a handwritten/typed answer and verify the concept | **Vision + text** |
| §4 AI-Generated Problem Sets | Generate unique word problems with variables | Text |
| §4 Automated Grading & Feedback | Grade an answer and explain step-by-step | Text (structured) |

So we need **one model that can do both images and text**. That points to one
clear free winner.

---

## 1. Which free AI to use

**Recommended: Google Gemini API (Google AI Studio free tier).**

Why:
- **Multimodal** — accepts images (base64) *and* text in the same request. This
  is exactly what the scavenger hunt needs. Most other free options are
  text-only.
- **Genuinely free tier** — no credit card required to start. You get a real API
  key from [aistudio.google.com](https://aistudio.google.com/apikey).
- **Structured JSON output** — it can return strict JSON, so grading results
  drop straight into your app with no fragile string parsing.
- Fast "Flash" models are plenty smart for chemistry Q&A and image checks.

**Model to use:** `gemini-2.0-flash` (multimodal, free-tier eligible, fast).
`gemini-2.5-flash` is a fine upgrade if available to you.

> ⚠️ Free-tier limits change over time. At the time of writing the Flash free
> tier is generous (roughly ~15 requests/minute and ~1,500 requests/day). Always
> confirm current numbers at **https://ai.google.dev/pricing** before you rely on
> them for a class of students.

### Alternatives (if you outgrow or dislike Gemini)

| Provider | Free? | Multimodal? | Best for |
|---|---|---|---|
| **Google Gemini** (AI Studio) | ✅ Free tier | ✅ Yes | **Everything here — recommended** |
| **Groq** (groq.com) | ✅ Free tier | ⚠️ Some vision models (Llama 3.2 Vision) | Blazing-fast *text* (grading, problem sets) |
| **OpenRouter** (openrouter.ai) | ✅ Some `:free` models | ⚠️ A few | One key, many models; good fallback |
| **Hugging Face** Inference | ✅ Limited free | ⚠️ Varies | Experimentation |
| **Ollama** (ollama.com) | ✅ 100% free, local | ✅ (llava, llama3.2-vision) | Offline dev / no rate limits, but needs a capable machine |

A common production-friendly split: **Gemini for vision**, **Groq for fast text**.
This tutorial focuses on Gemini because it covers 100% of the requirements alone.

---

## 2. The golden rule: never put the API key in the browser

Your React app runs in the user's browser. **Any key shipped to the client can
be stolen and abused** (someone opens DevTools, copies your key, and burns your
quota — or racks up a bill if you ever enable billing).

So we use a **server proxy**:

```
Browser (React)  ──►  Your server route  ──►  Gemini API
   (no key)            (holds the key)         (does the work)
```

- The browser calls **your** endpoint (e.g. `POST /api/ai/verify`).
- Your server, which alone knows the key, calls Gemini and returns the result.
- **Do NOT** name the variable `VITE_GEMINI_KEY` — anything prefixed `VITE_` is
  inlined into the client bundle by Vite. Use a plain name like `GEMINI_API_KEY`.

---

## 3. Step-by-step setup

### Step 1 — Get a free Gemini API key

1. Go to **https://aistudio.google.com/apikey** and sign in with a Google account.
2. Click **"Create API key"** (you can reuse your existing `alchemix-grimoire`
   Google Cloud project or let it create one).
3. Copy the key. Treat it like a password.

### Step 2 — Store the key as a secret (never commit it)

**Local development** — create a `.env` file in the project root:

```bash
# .env  (root of the project)
GEMINI_API_KEY=paste-your-key-here
```

Then make sure it's ignored by git — confirm `.gitignore` contains:

```
.env
.env.*
```

**Production (Cloudflare)** — your build deploys as a Cloudflare Worker
(`wrangler.json` is generated on build). Set the secret with Wrangler:

```bash
npx wrangler secret put GEMINI_API_KEY
# paste the key when prompted
```

> If you deploy somewhere else instead (Vercel, Netlify, Firebase Hosting +
> Functions), set `GEMINI_API_KEY` in that platform's environment/secrets UI.

### Step 3 — Create the server proxy

The core logic is environment-agnostic. Here is one reusable helper, then a thin
route adapter for Nitro (which is what TanStack Start builds on).

**`src/lib/server/gemini.ts`** — the shared helper (server-only; never imported
by a component):

```ts
// Runs on the SERVER only. Do not import this into client components.
const MODEL = "gemini-2.0-flash";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }; // data = base64 (no data: prefix)

interface AskOptions {
  parts: Part[];
  /** Ask Gemini to return strict JSON matching this shape (optional). */
  jsonSchema?: Record<string, unknown>;
  system?: string;
}

export async function askGemini({ parts, jsonSchema, system }: AskOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.4,
      ...(jsonSchema
        ? { responseMimeType: "application/json", responseSchema: jsonSchema }
        : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const res = await fetch(`${ENDPOINT(MODEL)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return jsonSchema ? JSON.parse(text) : text;
}
```

**The route** — expose it to the browser. Pick whichever fits your deployment:

*Option A — Nitro server route (matches your current build).* Create
`server/routes/api/ai/verify.post.ts`:

```ts
import { defineEventHandler, readBody } from "h3";
import { askGemini } from "~/lib/server/gemini";

export default defineEventHandler(async (event) => {
  const { imageBase64, question, answer } = await readBody(event);

  const verdict = await askGemini({
    system:
      "You are a chemistry teacher grading an AR scavenger-hunt submission. " +
      "Be encouraging but accurate.",
    jsonSchema: {
      type: "object",
      properties: {
        correct: { type: "boolean" },
        confidence: { type: "number" },
        feedback: { type: "string" },
      },
      required: ["correct", "feedback"],
    },
    parts: [
      { text: `Mission question: ${question}\nStudent's answer: ${answer}\n\nLook at the attached photo. Does it satisfy the mission? Reply as JSON.` },
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
    ],
  });

  return verdict; // { correct, confidence, feedback }
});
```

*Option B — TanStack Start server function.* If you prefer `createServerFn`, the
body is identical; just call `askGemini(...)` inside the server function and
invoke it from the client. Either way, **`askGemini` only ever runs on the
server**, so the key stays secret.

*Option C — Firebase Cloud Function.* Works too, but outbound network calls
require the **Blaze** (pay-as-you-go) plan. It has a free monthly quota, but a
card is required — which is why Cloudflare/Nitro is the more truly-free route here.

### Step 4 — Call it from the browser

```ts
// Client-side (safe — no key here)
async function verifyMission(imageBase64: string, question: string, answer: string) {
  const res = await fetch("/api/ai/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, question, answer }),
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json(); // { correct, confidence, feedback }
}
```

To get `imageBase64` from a webcam frame, draw the video onto a `<canvas>` and
use `canvas.toDataURL("image/jpeg")`, then **strip the `data:image/jpeg;base64,`
prefix** before sending (Gemini wants raw base64):

```ts
const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
const imageBase64 = dataUrl.split(",")[1];
```

### Step 5 — Test it

Before wiring the UI, confirm your key works with a plain `curl`:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Balance: H2 + O2 -> H2O. One line."}]}]}'
```

A JSON response with balanced coefficients means you're live.

---

## 4. Prompt recipes for each feature

Reuse the same `askGemini` helper; only the `parts`/`jsonSchema` change.

### A) Scavenger-hunt image verification (§1) — vision
Covered above. Send the frame + question + answer, get `{ correct, confidence, feedback }`.

### B) AI-generated problem sets (§4) — unique variables per student
```ts
const problem = await askGemini({
  system: "You generate high-school chemistry problems. Keep numbers realistic.",
  jsonSchema: {
    type: "object",
    properties: {
      question: { type: "string" },
      variables: { type: "object" },
      answer: { type: "number" },
      unit: { type: "string" },
      workingSteps: { type: "array", items: { type: "string" } },
    },
    required: ["question", "answer", "workingSteps"],
  },
  parts: [{ text: "Create ONE Gas Laws (PV=nRT) word problem with fresh random values. Include the numeric answer and step-by-step working." }],
});
```
Seed randomness by adding a nonce to the prompt (e.g. a random id or the
student's uid + timestamp) so each student gets different numbers.

### C) Automated grading & feedback (§4) — structured
```ts
const result = await askGemini({
  system: "You are a strict but supportive chemistry grader.",
  jsonSchema: {
    type: "object",
    properties: {
      isCorrect: { type: "boolean" },
      score: { type: "number" },
      correctAnswer: { type: "string" },
      explanation: { type: "array", items: { type: "string" } },
    },
    required: ["isCorrect", "explanation"],
  },
  parts: [{ text: `Question: ${q}\nStudent answer: ${a}\nGrade it and give step-by-step reasoning for any mistake.` }],
});
```

---

## 5. Storing AI results in Firestore

Signup already creates `users/{uid}` (see `src/lib/auth.ts`). Store activity as
**subcollections** so the analytics dashboard (§5) and educators can read history:

```
users/{uid}
  ├─ evidence/{autoId}      # scavenger-hunt submissions + AI verdict
  ├─ quizResults/{autoId}   # graded answers, score, feedback
  └─ (top-level fields)     # xp, level, badges, progress, stats
```

After a successful AI call, write the result and bump gamification counters
(e.g. `xp`, `progress.scavengerHuntsCompleted`). Do these writes **client-side
after** the server returns, or from the server route for extra trust.

> The current `firestore.rules` lets a user read/write only their own `users/{uid}`
> tree. When you add educator dashboards, extend the rules (or read via the
> Firebase Admin SDK on a trusted server) — don't loosen them to "any signed-in
> user can read all students."

---

## 6. Safety, limits & cost control

- **Rate limits:** free tier is per-minute + per-day. For a whole class hitting
  it at once, add a simple queue/retry with backoff on `429` responses, and show
  a friendly "the lab is busy, try again in a moment" message.
- **Content safety:** Gemini applies safety filters by default. If a legitimate
  chemistry prompt gets blocked, tune `safetySettings` in the request body.
- **Cost:** the free tier does not bill. If you later add billing, set a **budget
  alert** in Google Cloud and keep `gemini-*-flash` (cheapest) for grading.
- **Validate on the server:** never trust the score the *client* claims — always
  compute/grade on the server route before awarding XP.
- **Don't log the key.** Keep it only in env/secrets.

---

## 7. Setup checklist

- [ ] Created a free Gemini API key at aistudio.google.com/apikey
- [ ] Added `GEMINI_API_KEY` to `.env` (and it's git-ignored)
- [ ] Set the production secret: `npx wrangler secret put GEMINI_API_KEY`
- [ ] Added `src/lib/server/gemini.ts` (server-only helper)
- [ ] Added a server route (`/api/ai/verify`, etc.) that calls `askGemini`
- [ ] Verified with the `curl` smoke test
- [ ] Confirmed the browser calls **your route**, not Gemini directly
- [ ] Enabled Firestore in the console + deployed `firestore.rules`
- [ ] Storing AI results under `users/{uid}/…` subcollections

Once these are green, all four AI-dependent student features have a working,
free backend.
