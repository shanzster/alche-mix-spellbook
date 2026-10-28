import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { fetchRole, signInWithEmail, signOut } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The school-admin sign-in at /school/signin — a polished, branded educator
 * portal (amber/gold voice) rather than the plain shared TechLogin. Same
 * role-lock as every other door: sign in, read the role, and if it isn't
 * `school_admin` sign straight back out so no other role can slip through.
 */
const ACCENT = "var(--color-amber-scry)";

export function SchoolLogin() {
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
      if (role !== "school_admin") {
        await signOut();
        setError("This account isn't a school admin. Use the correct door.");
        return;
      }
      navigate({ to: "/school" });
    } catch (err: any) {
      setError(friendlyError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-lg px-3 py-2.5 text-sm text-spectral outline-none transition " +
    "border border-[color-mix(in_oklab,var(--color-parchment)_22%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--color-mist)_75%,transparent)] " +
    "placeholder:text-parchment/35 " +
    "focus:border-[color-mix(in_oklab,var(--color-amber-scry)_60%,transparent)] " +
    "focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-amber-scry)_24%,transparent)]";

  return (
    <div className="grimoire-display relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-spectral">
      {/* Theme-aware backdrop, veiled for depth. */}
      <div aria-hidden className="auth-backdrop fixed inset-0 z-0" />
      <div aria-hidden className="fixed inset-0 z-0" style={{ background: "color-mix(in oklab, var(--color-mist) 74%, transparent)" }} />

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
          border: `1px solid color-mix(in oklab, ${ACCENT} 34%, transparent)`,
          boxShadow: "0 40px 100px -35px rgb(0 0 0 / 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Inner hairline frame */}
        <div aria-hidden className="pointer-events-none absolute inset-[6px] rounded-xl"
          style={{ border: `1px solid color-mix(in oklab, ${ACCENT} 14%, transparent)` }} />

        <div className="relative flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 32%, transparent)` }}>
            <img src="/images/logo-outline.png" alt="AlcheMix" className="h-9 w-9 object-contain"
              style={{ filter: `drop-shadow(0 0 8px color-mix(in oklab, ${ACCENT} 55%, transparent))` }} />
          </span>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>School portal</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight text-spectral">School Admin</h1>
          <p className="mt-1.5 font-serif text-sm italic text-parchment/70">Manage your school, teachers and classes.</p>
        </div>

        <form onSubmit={submit} className="relative mt-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-parchment/70">Email</label>
            <input type="email" autoComplete="username" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.edu" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-parchment/70">Password</label>
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
                aria-label={show ? "Hide password" : "Show password"}
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
            className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-mist transition hover:brightness-110 disabled:opacity-50"
            style={{ background: ACCENT }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="relative mt-5 text-[11px] leading-relaxed text-parchment/50">
          <span style={{ color: ACCENT }}>🔑</span> Role-locked door — only a school-admin account opens it. No verification code needed here.
        </p>

        <div className="relative mt-5 flex items-center justify-between border-t pt-4 text-[11px] text-parchment/45"
          style={{ borderColor: "color-mix(in oklab, var(--color-gold) 16%, transparent)" }}>
          <span className="uppercase tracking-[0.2em] text-parchment/35">Other doors</span>
          <span className="flex items-center gap-3">
            <Link to="/admin/login" className="hover:text-spectral">Admin</Link>
            <Link to="/teacher/login" className="hover:text-spectral">Teacher</Link>
            <Link to="/login" className="hover:text-spectral">Student</Link>
          </span>
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
