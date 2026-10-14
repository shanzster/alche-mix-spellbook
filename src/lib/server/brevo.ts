/**
 * Brevo transactional email — SERVER-ONLY.
 * ────────────────────────────────────────────────────────────────────────────
 * This file must never be imported by a client component. It is only ever
 * reached from inside a `createServerFn` handler (see `src/lib/email-verify.ts`),
 * so the API key stays on the server — the same golden rule as the Gemini key.
 *
 * It does two things:
 *   1. Signs / verifies a 6-digit sign-up code as a STATELESS HMAC token, so no
 *      Firestore store is needed (works on the Cloudflare edge). The code lives
 *      only in the email; the token carries only (expiry · signature).
 *   2. Sends the code via Brevo's transactional email API with an on-theme
 *      grimoire HTML email.
 *
 * KEYLESS FALLBACK: with no BREVO_API_KEY set, the code is logged to the server
 * console instead of emailed, so sign-up still works in local dev.
 */

const PLACEHOLDER_KEY = "__PLACEHOLDER_ADD_YOUR_BREVO_KEY__";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
/** How long a code is valid, in milliseconds. */
export const CODE_TTL_MS = 10 * 60 * 1000;

function getApiKey(): string | null {
  const key = process.env.BREVO_API_KEY;
  if (!key || key === PLACEHOLDER_KEY || key.trim() === "") return null;
  return key;
}

/** True once a real Brevo key is configured. */
export function isEmailConfigured(): boolean {
  return getApiKey() !== null;
}

// ── Stateless HMAC token (no storage) ────────────────────────────────────────

/** Secret for signing tokens. Dedicated var, else derived from the Brevo key. */
function signingSecret(): string {
  return (
    process.env.EMAIL_CODE_SECRET ||
    process.env.BREVO_API_KEY ||
    "alchemix-dev-email-secret"
  );
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64url(sig);
}

/** Normalise an email for signing so casing/whitespace can't break a match. */
function norm(email: string): string {
  return email.trim().toLowerCase();
}

/** A fresh cryptographically-random 6-digit code, e.g. "042317". */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

/**
 * Builds the opaque token a client holds between "request" and "verify".
 * Shape: `${expiry}.${hmac(email|code|expiry)}` — base64url signature.
 * The code itself is never in the token (only in the email), so a client can
 * never read it back out of the token.
 */
export async function makeToken(email: string, code: string, expiry: number): Promise<string> {
  const sig = await hmac(`${norm(email)}|${code}|${expiry}`);
  return `${expiry}.${sig}`;
}

/** Constant-time string compare (equal length) to avoid timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type VerifyCodeResult = "ok" | "expired" | "mismatch" | "malformed";

/** Verifies a submitted code against the token. No storage read required. */
export async function verifyToken(email: string, code: string, token: string): Promise<VerifyCodeResult> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return "malformed";
  const expiry = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || !sig) return "malformed";
  if (Date.now() > expiry) return "expired";
  const expected = await hmac(`${norm(email)}|${code}|${expiry}`);
  return timingSafeEqual(sig, expected) ? "ok" : "mismatch";
}

// ── The email ─────────────────────────────────────────────────────────────

/**
 * Sends the verification code. Returns true if Brevo accepted it, false if it
 * fell back to console logging (keyless) — callers treat both as "proceed",
 * since the token is already minted regardless.
 */
export async function sendVerificationEmail(email: string, name: string, code: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      `[Email] ✗ BREVO_API_KEY not set — code for ${email} is: ${code} (keyless dev fallback)`,
    );
    return false;
  }

  const sender = {
    email: process.env.BREVO_SENDER_EMAIL || "no-reply@alchemix.app",
    name: process.env.BREVO_SENDER_NAME || "AlcheMix",
  };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email, ...(name ? { name } : {}) }],
        subject: `Your AlcheMix sigil: ${code}`,
        htmlContent: verificationEmailHtml(name, code),
        textContent:
          `Your AlcheMix verification code is ${code}. ` +
          `It expires in ${Math.round(CODE_TTL_MS / 60000)} minutes. ` +
          `If you didn't request this, you can ignore this message.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[Email] ✗ Brevo rejected the send (HTTP ${res.status}): ${body.slice(0, 300)}`);
      return false;
    }
    console.log(`[Email] ✓ verification code sent to ${email}`);
    return true;
  } catch (err) {
    console.error("[Email] ✗ Brevo unreachable:", err);
    return false;
  }
}

/**
 * The on-theme grimoire email. Table-based, fully inline-styled, email-client
 * safe (no external CSS, no web fonts that must load — serif stack degrades
 * gracefully). Palette mirrors the app tokens: ink navy, antique gold, teal.
 */
function verificationEmailHtml(name: string, code: string): string {
  const greetName = (name || "").trim().split(/\s+/)[0] || "apprentice";
  const minutes = Math.round(CODE_TTL_MS / 60000);
  // Colours as literals (email clients can't read CSS custom properties).
  const INK = "#0b1220";       // --mist dark
  const INK_SOFT = "#131c2e";  // panel
  const PARCH = "#e8e2d2";     // parchment text
  const MUTED = "#9aa3b2";     // muted
  const GOLD = "#d8b259";      // --gold
  const GOLD_SOFT = "#8a6d2f";
  const TEAL = "#4fd1c5";      // --emerald-elixir glow
  const serif = "'Georgia','Times New Roman',serif";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>Your AlcheMix sigil</title>
</head>
<body style="margin:0;padding:0;background:${INK};">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your AlcheMix verification sigil is ${code} — it fades in ${minutes} minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:520px;background:${INK_SOFT};border:1px solid ${GOLD_SOFT};border-radius:16px;overflow:hidden;">

        <!-- gold rule header -->
        <tr><td style="height:4px;background:linear-gradient(90deg,transparent,${GOLD},transparent);"></td></tr>

        <tr><td style="padding:36px 40px 8px;text-align:center;">
          <div style="font-family:${serif};font-size:13px;letter-spacing:4px;text-transform:uppercase;color:${GOLD};">
            &#10022; &nbsp; AlcheMix &nbsp; &#10022;
          </div>
          <h1 style="margin:14px 0 0;font-family:${serif};font-size:26px;font-weight:600;color:${PARCH};">
            Seal your sign-up
          </h1>
        </td></tr>

        <tr><td style="padding:16px 40px 0;text-align:center;">
          <p style="margin:0;font-family:${serif};font-size:15px;line-height:1.6;color:${MUTED};">
            Welcome, <span style="color:${PARCH};">${escapeHtml(greetName)}</span>. Inscribe the sigil below
            to prove the address is yours and open your Grimoire.
          </p>
        </td></tr>

        <!-- the code -->
        <tr><td style="padding:28px 40px 8px;text-align:center;">
          <div style="display:inline-block;padding:18px 28px;border:1px solid ${GOLD_SOFT};border-radius:12px;
            background:#0e1626;box-shadow:inset 0 0 24px rgba(79,209,197,0.08);">
            <div style="font-family:${serif};font-size:42px;font-weight:700;letter-spacing:12px;
              color:${GOLD};text-indent:12px;">
              ${code.split("").join(" ")}
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:14px 40px 0;text-align:center;">
          <p style="margin:0;font-family:${serif};font-size:12px;letter-spacing:1px;color:${MUTED};">
            This sigil fades in <span style="color:${TEAL};">${minutes} minutes</span>.
          </p>
        </td></tr>

        <!-- hairline -->
        <tr><td style="padding:28px 40px 0;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,${GOLD_SOFT},transparent);"></div>
        </td></tr>

        <tr><td style="padding:18px 40px 36px;text-align:center;">
          <p style="margin:0;font-family:${serif};font-size:12px;line-height:1.6;color:${MUTED};">
            If you never sought entry to AlcheMix, let this scroll turn to dust —
            no account is created until the sigil is inscribed.
          </p>
        </td></tr>

        <tr><td style="height:4px;background:linear-gradient(90deg,transparent,${GOLD_SOFT},transparent);"></td></tr>
      </table>

      <p style="margin:18px 0 0;font-family:${serif};font-size:11px;color:#5b6472;">
        AlcheMix &middot; real chemistry, wrapped in a grimoire
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
