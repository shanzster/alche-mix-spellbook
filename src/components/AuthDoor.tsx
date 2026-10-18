import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, School, ArrowRight, GraduationCap, FlaskConical, CheckCircle2 } from "lucide-react";
import { fetchRole, homeForRole, signInWithEmail, sendPasswordReset } from "../lib/auth";
import { AuthLayout } from "./AuthLayout";

/**
 * The sign-in page, shared by both entrances: `/login` (the student door,
 * violet) and `/teacher/login` (the Educator's Door, gold). Same auth backend —
 * after sign-in everyone is routed by their profile role (student → /app,
 * teacher → /teacher, admin → /admin), so entering through the "wrong" door
 * still lands you in the right place. Split-panel chrome from AuthLayout.
 */
export function AuthDoor({ educator = false }: { educator?: boolean }) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState("");

  const accent = educator ? "var(--color-gold)" : "var(--color-wraith)";

  const settle = async (uid: string) => {
    const role = await fetchRole(uid);
    navigate({ to: homeForRole(role) });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setResetSent(""); setLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      await settle(user.uid);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  // Forgot password — sends Firebase's reset email to whatever's in the Email
  // field (so the student fills it in first, then taps the link).
  const handleReset = async () => {
    setError(""); setResetSent("");
    if (!email.trim()) { setError("Enter your email above first, then tap “Forgot password?”."); return; }
    setResetBusy(true);
    try {
      await sendPasswordReset(email);
      setResetSent(`A reset link is on its way to ${email.trim()}. Check your inbox (and spam).`);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally { setResetBusy(false); }
  };

  const inputStyle = {
    background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
    border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
  } as const;
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = `color-mix(in oklab, ${accent} 60%, transparent)`);
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-parchment) 22%, transparent)");

  return (
    <AuthLayout
      sideTitle={educator ? "Welcome back, mentor." : "Welcome back."}
      sideText={educator ? "Sign in to your console." : "Sign in and step into the lab."}
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="AlcheMix home" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 92%, black 6%)", border: `2px solid color-mix(in oklab, ${accent} 55%, transparent)`, boxShadow: `0 0 20px -6px color-mix(in oklab, ${accent} 70%, transparent)` }}>
          <img src="/images/logo-outline.png" alt="AlcheMix" className="h-6 w-6 object-contain" />
        </Link>
        <div>
          <h1 className="font-display text-2xl leading-none">{educator ? "Educator Sign-In" : "Sign In"}</h1>
          <p className="mt-1 text-xs tracking-[0.1em] text-parchment/60">
            {educator ? "The Educator's Door" : "Enter the lab"}
          </p>
        </div>
      </div>

      {/* New school students join with a class code — but a code is only ever
          needed to REGISTER. Once they have an account they just sign in here
          and land in their class, so this points at the sign-up door. */}
      {!educator && (
        <Link to="/school-signup"
          className="group mb-5 flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
          }}>
          <School className="h-5 w-5 flex-shrink-0 text-teal" />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-teal">New, with a class code?</span>{" "}
            <span className="text-parchment/70">Join your class through the School Door when you sign up.</span>
          </span>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-teal transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Email form */}
      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60">Password</label>
            <button type="button" onClick={handleReset} disabled={resetBusy}
              className="text-[11px] font-medium text-parchment/55 transition hover:text-spectral disabled:opacity-50">
              {resetBusy ? "Sending…" : "Forgot password?"}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment transition">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{error}</p>
        )}
        {resetSent && (
          <p className="flex items-start gap-2 text-xs text-teal rounded-lg px-3 py-2"
            style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {resetSent}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="btn-arcane btn-arcane-hover w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <><FlaskConical className="h-4 w-4 animate-spin" /> Transmuting…</>
            : <><LogIn className="h-4 w-4" /> Sign In</>}
        </button>
      </form>

      {/* Footer links */}
      {educator ? (
        <p className="text-center text-sm text-parchment/60 mt-6">
          Teacher accounts are provisioned by your school admin — ask them to add your email, then sign in here.
        </p>
      ) : (
        <p className="text-center text-sm text-parchment/60 mt-6">
          No account yet?{" "}
          <Link to="/signup" className="text-wraith hover:text-spectral transition font-display tracking-wide">
            Create one
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-parchment/60 mt-2">
        {educator ? (
          <Link to="/login" className="text-parchment/60 hover:text-spectral transition">
            Not an educator? Student sign-in →
          </Link>
        ) : (
          <Link to="/teacher/login" className="inline-flex items-center gap-1.5 text-parchment/60 hover:text-gold transition">
            <GraduationCap className="h-3.5 w-3.5" /> Are you an educator? Enter here
          </Link>
        )}
      </p>
    </AuthLayout>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password. Try again.",
    "auth/invalid-email":         "That doesn't look like a valid email.",
    "auth/invalid-credential":    "Email or password is incorrect.",
    "auth/too-many-requests":     "Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/popup-blocked":         "Popup was blocked. Allow popups for this site.",
    "auth/unauthorized-domain":   "This site's domain isn't authorized for sign-in yet. Contact the site admin.",
    "auth/operation-not-allowed": "Google sign-in isn't enabled for this app yet. Contact the site admin.",
  };
  return map[code] ?? `Something went wrong. Please try again. (${code ?? "unknown error"})`;
}
