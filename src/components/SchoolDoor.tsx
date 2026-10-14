import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FlaskConical, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, School,
  CheckCircle2, XCircle, GraduationCap,
} from "lucide-react";
import {
  fetchRole, homeForRole, signInWithEmail, signUpWithEmail, type User,
} from "../lib/auth";
import { resolveClassByCode, requestToJoinClass, type ClassInfo } from "../lib/teacher";
import { AuthLayout } from "./AuthLayout";
import { PasswordStrength } from "./PasswordStrength";

/**
 * The School Door — the entrance for school-affiliated students, split off
 * from /signup and /login (the class code gets its own page). The code is
 * looked up live so the student sees WHICH class they're joining before an
 * account is touched. Split-panel chrome from AuthLayout.
 */
export function SchoolDoor({ mode, initialCode }: { mode: "signup" | "login"; initialCode?: string }) {
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [code, setCode]         = useState((initialCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
  const [cls, setCls]           = useState<ClassInfo | null>(null);
  const [codeState, setCodeState] = useState<"idle" | "checking" | "found" | "missing" | "expired" | "unverified">("idle");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const accent = "var(--color-emerald-elixir)";

  const checkCode = async (value: string) => {
    if (value.length < 6) { setCodeState("idle"); setCls(null); return; }
    setCodeState("checking");
    try {
      const res = await resolveClassByCode(value);
      if (res.status === "ok") { setCls(res.cls); setCodeState("found"); }
      else if (res.status === "expired") { setCls(null); setCodeState("expired"); }
      else { setCls(null); setCodeState("missing"); }
    } catch {
      setCodeState("unverified");
      setCls(null);
    }
  };

  const onCodeChange = (raw: string) => {
    const value = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCode(value);
    void checkCode(value);
  };

  // Prefill from a ?code= link lookup (teachers share /school-signup?code=ABC123).
  useEffect(() => {
    if (code.length === 6) void checkCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = async (user: User) => {
    const role = await fetchRole(user.uid);
    if (role === "student" || role == null) {
      // Request to join — the teacher accepts before enrolment (Phase 4).
      await requestToJoinClass(
        { uid: user.uid, name: user.displayName ?? null, email: user.email ?? null },
        code,
      );
    }
    navigate({ to: homeForRole(role) });
  };

  const requireCode = (): boolean => {
    if (codeState === "found" || codeState === "unverified") return true;
    setError(codeState === "missing"
      ? "That class code doesn't match any class. Double-check it with your teacher."
      : codeState === "expired"
        ? "That class code has expired. Ask your teacher for a fresh one."
        : "Enter your 6-character class code first.");
    return false;
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!requireCode()) return;
    if (isSignup) {
      if (password !== confirm) { setError("Passwords don't match."); return; }
      if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    }
    setLoading(true);
    try {
      const user = isSignup
        ? await signUpWithEmail(email, password, "student")
        : await signInWithEmail(email, password);
      await settle(user);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const inputStyle = {
    background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
    border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
  };
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = `color-mix(in oklab, ${accent} 60%, transparent)`);
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-parchment) 22%, transparent)");

  return (
    <AuthLayout
      sideTitle={isSignup ? "Join your class." : "Back to class."}
      sideText="Enter the class code your teacher gave you."
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="AlcheMix home" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 92%, black 6%)", border: `2px solid color-mix(in oklab, ${accent} 55%, transparent)`, boxShadow: `0 0 20px -6px color-mix(in oklab, ${accent} 70%, transparent)` }}>
          <img src="/images/logo-outline.png" alt="AlcheMix" className="h-6 w-6 object-contain" />
        </Link>
        <div>
          <h1 className="font-display text-2xl leading-none inline-flex items-center gap-2">
            School Door
          </h1>
          <p className="mt-1 text-xs tracking-[0.1em] text-parchment/60 inline-flex items-center gap-1.5">
            <School className="h-3.5 w-3.5 text-teal" />
            {isSignup ? "Join your class as you sign up" : "Sign in and join your class"}
          </p>
        </div>
      </div>

      {/* Class code — the point of this page, so it comes first. */}
      <div className="mb-5">
        <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Class code</label>
        <div className="relative">
          <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
          <input
            value={code}
            onChange={e => onCodeChange(e.target.value)}
            placeholder="ABC123"
            maxLength={6}
            required
            aria-label="Class code"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm font-semibold tracking-[0.3em] uppercase text-spectral placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-parchment/30 outline-none transition-all"
            style={{
              ...inputStyle,
              ...(codeState === "found"   ? { borderColor: "color-mix(in oklab, var(--color-emerald-elixir) 60%, transparent)" } : {}),
              ...(codeState === "missing" || codeState === "expired" ? { borderColor: "color-mix(in oklab, var(--color-crimson) 60%, transparent)" } : {}),
            }}
            onFocus={focusOn}
            onBlur={e => { if (codeState === "idle") focusOff(e); }} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {codeState === "checking" && <FlaskConical className="h-4 w-4 animate-spin text-parchment/40" />}
            {codeState === "found"    && <CheckCircle2 className="h-4 w-4 text-teal" />}
            {codeState === "missing"  && <XCircle className="h-4 w-4 text-crimson" />}
          </span>
        </div>
        {codeState === "found" && cls && (
          <p className="text-[11px] text-teal mt-1.5">
            ✓ You're joining <span className="font-semibold">{cls.name}</span>
            {cls.teacherName ? <> with {cls.teacherName}</> : null}.
          </p>
        )}
        {codeState === "missing" && (
          <p className="text-[11px] text-crimson/90 mt-1.5">No class matches that code. Double-check it with your teacher.</p>
        )}
        {codeState === "expired" && (
          <p className="text-[11px] text-amber-scry mt-1.5">That code has expired. Ask your teacher to issue a fresh one.</p>
        )}
        {codeState === "unverified" && (
          <p className="text-[11px] text-parchment/60 mt-1.5">We'll match this code to your class right after you {isSignup ? "sign up" : "sign in"}.</p>
        )}
        {(codeState === "idle" || codeState === "checking") && (
          <p className="text-[11px] text-parchment/50 mt-1.5">The 6-character code your teacher gave your class.</p>
        )}
      </div>

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
          <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isSignup ? "Min. 6 characters" : "••••••••"}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment transition">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isSignup && <PasswordStrength password={password} />}
        </div>

        {isSignup && (
          <div>
            <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
              <input type={showPw ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
                style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: `1px solid ${confirm && confirm !== password ? "color-mix(in oklab, var(--color-crimson) 60%, transparent)" : "color-mix(in oklab, var(--color-parchment) 22%, transparent)"}` }}
                onFocus={focusOn}
                onBlur={e => (e.currentTarget.style.borderColor = confirm && confirm !== password ? "color-mix(in oklab, var(--color-crimson) 60%, transparent)" : "color-mix(in oklab, var(--color-parchment) 22%, transparent)")} />
            </div>
            {confirm && confirm !== password && (
              <p className="text-[10px] text-crimson mt-1 ml-1">Passwords don't match</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="btn-arcane btn-arcane-hover w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <><FlaskConical className="h-4 w-4 animate-spin" /> {isSignup ? "Creating account…" : "Transmuting…"}</>
            : isSignup
              ? <><UserPlus className="h-4 w-4" /> Create Account &amp; Request to Join</>
              : <><LogIn className="h-4 w-4" /> Sign In &amp; Request to Join</>}
        </button>
      </form>

      {/* Footer links */}
      <p className="text-center text-sm text-parchment/60 mt-6">
        {isSignup ? (
          <>Already have an account?{" "}
            <Link to="/school-login" className="text-teal hover:text-spectral transition font-display tracking-wide">Sign in with your code</Link>
          </>
        ) : (
          <>No account yet?{" "}
            <Link to="/school-signup" className="text-teal hover:text-spectral transition font-display tracking-wide">Sign up with your code</Link>
          </>
        )}
      </p>
      <p className="text-center text-sm text-parchment/60 mt-2">
        <Link to={isSignup ? "/signup" : "/login"} className="text-parchment/60 hover:text-spectral transition">
          No class code? Use the general {isSignup ? "sign-up" : "sign-in"} →
        </Link>
      </p>
      <p className="text-center text-sm text-parchment/60 mt-2">
        <Link to="/teacher/login" className="inline-flex items-center gap-1.5 text-parchment/60 hover:text-gold transition">
          <GraduationCap className="h-3.5 w-3.5" /> Are you an educator? Enter here
        </Link>
      </p>
    </AuthLayout>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use":  "An account with that email already exists.",
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password. Try again.",
    "auth/invalid-credential":    "Email or password is incorrect.",
    "auth/invalid-email":         "That doesn't look like a valid email.",
    "auth/weak-password":         "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests":     "Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/popup-blocked":         "Popup was blocked. Allow popups for this site.",
    "auth/unauthorized-domain":   "This site's domain isn't authorized for sign-in yet. Contact the site admin.",
    "auth/operation-not-allowed": "Google sign-in isn't enabled for this app yet. Contact the site admin.",
  };
  return map[code] ?? `Something went wrong. Please try again. (${code ?? "unknown error"})`;
}
