/**
 * Sign-up email verification — the client-facing server functions.
 * ────────────────────────────────────────────────────────────────────────────
 * Two createServerFn handlers wrap the server-only Brevo helper. The flow is
 * VERIFY-BEFORE-CREATE: no Firebase account is created until the emailed code
 * checks out, so unverified addresses never land in Auth.
 *
 *   1. requestEmailCode({ email, name }) → generates a 6-digit code, emails it
 *      via Brevo, and returns an opaque { token } (expiry · HMAC signature).
 *      The password NEVER reaches the server — it stays in the browser and is
 *      only used to create the account after verifyEmailCode succeeds.
 *   2. verifyEmailCode({ email, code, token }) → { ok } once the code matches.
 *
 * Stateless: the token carries everything needed to verify, so there is no
 * Firestore store to read or write (edge-friendly).
 */
import { createServerFn } from "@tanstack/react-start";

export interface RequestCodeInput {
  email: string;
  name?: string;
}
export interface RequestCodeResult {
  /** Opaque token to hand back to verifyEmailCode. */
  token: string;
  /** Seconds until the code expires (for the UI countdown). */
  expiresInSec: number;
  /** True when the code was really emailed; false = keyless dev fallback. */
  emailed: boolean;
}

export interface VerifyCodeInput {
  email: string;
  code: string;
  token: string;
}
export interface VerifyCodeResult {
  ok: boolean;
  /** "expired" | "mismatch" | "malformed" when !ok, for a precise message. */
  reason?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const requestEmailCode = createServerFn({ method: "POST" })
  .validator((d: RequestCodeInput) => d)
  .handler(async ({ data }): Promise<RequestCodeResult> => {
    const email = (data.email ?? "").trim();
    if (!EMAIL_RE.test(email)) throw new Error("A valid email is required.");

    const { generateCode, makeToken, sendVerificationEmail, CODE_TTL_MS } =
      await import("./server/brevo");

    const code = generateCode();
    const expiry = Date.now() + CODE_TTL_MS;
    const token = await makeToken(email, code, expiry);
    const emailed = await sendVerificationEmail(email, (data.name ?? "").trim(), code);

    return { token, expiresInSec: Math.round(CODE_TTL_MS / 1000), emailed };
  });

export const verifyEmailCode = createServerFn({ method: "POST" })
  .validator((d: VerifyCodeInput) => d)
  .handler(async ({ data }): Promise<VerifyCodeResult> => {
    const code = (data.code ?? "").trim();
    const email = (data.email ?? "").trim();
    const token = data.token ?? "";
    if (!/^\d{6}$/.test(code)) return { ok: false, reason: "malformed" };

    const { verifyToken } = await import("./server/brevo");
    const result = await verifyToken(email, code, token);
    return result === "ok" ? { ok: true } : { ok: false, reason: result };
  });
