import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { fetchRole, signInWithEmail, signOut } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The Warden's Door — the dedicated super-admin sign-in at /admin/login.
 * Unlike the plain TechLogin shared by the school/teacher doors, the admin door
 * wears the grimoire voice (gold-ruled sealed plate, Cinzel title, astrolabe
 * seal) AND surfaces honest security affordances: role-lock notice, show/hide
 * password, and a caps-lock warning. The auth flow is identical to TechLogin —
 * sign in, read the role, and if it isn't `admin` sign straight back out so no
 * other role can slip through this door.
 */
export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signInWithEmail(email.trim(), password);
      const role = await fetchRole(user.uid);
      if (role !== "admin") {
        await signOut();
        setError("This account isn't a super admin. Use the correct door.");
        return;
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(friendlyError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-md px-3 py-2.5 text-sm text-spectral outline-none transition " +
    "border border-[color-mix(in_oklab,var(--color-gold)_26%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--color-mist)_72%,transparent)] " +
    "placeholder:text-parchment/35 " +
    "focus:border-[color-mix(in_oklab,var(--color-emerald-elixir)_62%,transparent)] " +
    "focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-emerald-elixir)_28%,transparent)]";

  return (
    <div className="grimoire-skin relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-spectral">
      {/* Theme-aware page backdrop, veiled for depth (same recipe as AuthLayout). */}
      <div aria-hidden className="auth-backdrop fixed inset-0 z-0" />
      <div aria-hidden className="fixed inset-0 z-0"
        style={{ background: "color-mix(in oklab, var(--color-mist) 74%, transparent)" }} />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle className="!h-9 !w-9" />
        <Link to="/" aria-label="Back to home"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-parchment/60 transition hover:text-spectral"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)", border: "1px solid var(--color-border)" }}>
          ×
        </Link>
      </div>

      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-7 sm:p-9"
        style={{
          background: "color-mix(in oklab, var(--color-card) 84%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-gold) 34%, transparent)",
          boxShadow: "0 40px 100px -35px rgb(0 0 0 / 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Inner gold hairline — the double-ruled engraving plate (DESIGN §4). */}
        <div aria-hidden className="pointer-events-none absolute inset-[6px] rounded-xl"
          style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 16%, transparent)" }} />

        {/* Official seal watermark, large and faint behind the plate. */}
        <img src="/dark-alchemy-vibe/seal-astrolabe.webp" alt="" aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 object-contain opacity-[0.08]" />

        <div className="relative">
          {/* Seal emblem + warded badge */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
                background: "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--color-gold) 16%, transparent), transparent 70%)",
              }}>
              <img src="/dark-alchemy-vibe/seal-astrolabe.webp" alt="" aria-hidden
                className="h-11 w-11 object-contain opacity-90" />
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold"
              style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
              <span aria-hidden>✦</span> Warded entry
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-spectral">The Warden's Door</h1>
            <p className="mt-1.5 font-serif text-sm italic text-parchment/70">
              The single master key to the AlcheMix console.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium tracking-wide text-parchment/70">Keeper's email</label>
              <input type="email" autoComplete="username" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium tracking-wide text-parchment/70">Master key</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
                  placeholder="••••••••"
                  className={field + " pr-16"}
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide master key" : "Show master key"}
                  className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-[11px] font-semibold uppercase tracking-wide text-parchment/55 transition hover:text-spectral">
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              {capsOn && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-scry">
                  <span aria-hidden>⚠</span> Caps Lock is on.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-md border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-md bg-[var(--color-emerald-elixir)] px-3 py-2.5 text-sm font-semibold text-mist transition hover:opacity-90 disabled:opacity-50">
              {loading ? "Unsealing…" : "Unseal the console"}
            </button>
          </form>

          {/* Honest security note — the door really is role-locked. */}
          <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-parchment/50">
            <span aria-hidden className="mt-px text-gold">🔑</span>
            Role-locked door. Only the super-admin key opens it — every other role
            is turned away the instant it signs in.
          </p>

          <div className="mt-5 flex items-center justify-between border-t pt-4 text-[11px] text-parchment/45"
            style={{ borderColor: "color-mix(in oklab, var(--color-gold) 16%, transparent)" }}>
            <span className="uppercase tracking-[0.2em] text-parchment/35">Other doors</span>
            <span className="flex items-center gap-3">
              <Link to="/school/signin" className="hover:text-spectral">School</Link>
              <Link to="/teacher/login" className="hover:text-spectral">Teacher</Link>
              <Link to="/login" className="hover:text-spectral">Student</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code?: string): string {
  const map: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That doesn't look like a valid email.",
    "auth/user-not-found": "No account with that email.",
    "auth/wrong-password": "Wrong password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return (code && map[code]) || "Sign-in failed. Check your credentials and try again.";
}
