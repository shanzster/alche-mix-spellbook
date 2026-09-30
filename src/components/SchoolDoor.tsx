import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  FlaskConical, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, School,
  CheckCircle2, XCircle, GraduationCap,
} from "lucide-react";
import {
  fetchRole, homeForRole, signInWithEmail, signInWithGoogle, signUpWithEmail, type User,
} from "../lib/auth";
import { findClassByCode, joinClass, type ClassInfo } from "../lib/teacher";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/**
 * The School Door — the entrance for school-affiliated students, split off
 * from the general /signup and /login pages (consultation feedback: the
 * school code gets its own page, reached via a "Have a School Code ready?"
 * link). The code is looked up live so the student sees WHICH class they are
 * joining before an account is touched; after auth the enrolment itself is
 * still best-effort — a race (class deleted mid-signup) never strands the
 * account, it just lands on the Bench where the join card remains.
 */
export function SchoolDoor({ mode }: { mode: "signup" | "login" }) {
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [code, setCode]         = useState("");
  const [cls, setCls]           = useState<ClassInfo | null>(null);
  // "unverified" = the pre-auth lookup was blocked (e.g. security rules not
  // yet deployed) — let the student proceed; joinClass re-checks after auth.
  const [codeState, setCodeState] = useState<"idle" | "checking" | "found" | "missing" | "unverified">("idle");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const accent = "var(--color-emerald-elixir)";

  // Look the code up as soon as 6 characters are in — the student should see
  // the class they're about to join before typing anything else.
  const checkCode = async (value: string) => {
    if (value.length < 6) { setCodeState("idle"); setCls(null); return; }
    setCodeState("checking");
    try {
      const found = await findClassByCode(value);
      setCls(found);
      setCodeState(found ? "found" : "missing");
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

  // Enrol + route. Sign-in may belong to a teacher who wandered in — route
  // them by role and skip enrolment rather than erroring.
  const settle = async (user: User) => {
    const role = await fetchRole(user.uid);
    if (role === "student" || role == null) {
      await joinClass(
        { uid: user.uid, name: user.displayName ?? null, email: user.email ?? null },
        code,
      );
    }
    navigate({ to: homeForRole(role) });
  };

  const requireCode = (): boolean => {
    if (codeState === "found" || codeState === "unverified") return true;
    setError(codeState === "missing"
      ? "That school code doesn't match any class. Double-check it with your teacher."
      : "Enter your 6-character school code first.");
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

  const handleGoogle = async () => {
    setError("");
    if (!requireCode()) return;
    setLoading(true);
    try {
      const user = isSignup ? await signInWithGoogle("student") : await signInWithGoogle();
      await settle(user);
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      if (err.code !== "auth/popup-closed-by-user") setError(friendlyError(err.code));
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
    <div className="bg-arcane min-h-screen flex items-center justify-center overflow-hidden text-spectral px-4">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="animate-drift absolute h-1 w-1 rounded-full"
            style={{
              top: `${(i * 43) % 100}%`,
              animationDelay: `${i * 1.3}s`,
              animationDuration: `${18 + (i % 5) * 3}s`,
              background: i % 2 === 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)",
              boxShadow: `0 0 10px ${i % 2 === 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)"}`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="flex h-16 w-16 items-center justify-center rounded-full animate-breathing"
              style={{
                background: "#1D1D1B",
                border: "3px solid color-mix(in oklab, var(--color-slate-sunken) 100%, transparent)",
                boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 55%, transparent), 0 0 28px -4px color-mix(in oklab, ${accent} 70%, transparent)`,
              }}>
              <img src="/images/logo-outline.png" alt="AlcheMix" className="h-9 w-9 object-contain"
                style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${accent} 80%, transparent))` }} />
            </div>
            <span className="font-display text-xl tracking-[0.2em] text-spectral">
              AlcheMix AR<span className="text-teal"> · School</span>
            </span>
          </Link>
          <p className="text-parchment/60 text-sm mt-1 tracking-wide inline-flex items-center gap-1.5">
            <School className="h-4 w-4 text-teal" />
            {isSignup ? "Join your class as you sign up" : "Sign in and join your class"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-parchment) 20%, transparent)",
            boxShadow: `0 0 60px -20px color-mix(in oklab, ${accent} 35%, transparent)`,
          }}>

          {/* School code — the point of this page, so it comes first. */}
          <div className="mb-6">
            <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">
              School code
            </label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
              <input
                value={code}
                onChange={e => onCodeChange(e.target.value)}
                placeholder="ABC123"
                maxLength={6}
                required
                aria-label="School code"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm font-semibold tracking-[0.3em] uppercase text-spectral placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-parchment/30 outline-none transition-all"
                style={{
                  ...inputStyle,
                  ...(codeState === "found"   ? { borderColor: "color-mix(in oklab, var(--color-emerald-elixir) 60%, transparent)" } : {}),
                  ...(codeState === "missing" ? { borderColor: "color-mix(in oklab, var(--color-crimson) 60%, transparent)" } : {}),
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
              <p className="text-[11px] text-crimson/90 mt-1.5">
                No class matches that code. Double-check it with your teacher.
              </p>
            )}
            {codeState === "unverified" && (
              <p className="text-[11px] text-parchment/60 mt-1.5">
                We'll match this code to your class right after you {isSignup ? "sign up" : "sign in"}.
              </p>
            )}
            {(codeState === "idle" || codeState === "checking") && (
              <p className="text-[11px] text-parchment/50 mt-1.5">
                The 6-character code your teacher gave your class.
              </p>
            )}
          </div>

          {/* Google button */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 mb-6 font-ui text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            style={{
              background: "color-mix(in oklab, var(--color-mist) 60%, white 8%)",
              border: "1px solid color-mix(in oklab, var(--color-parchment) 30%, transparent)",
            }}>
            <GoogleIcon />
            {isSignup ? "Sign up with Google" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "color-mix(in oklab, var(--color-parchment) 18%, transparent)" }} />
            <span className="text-xs text-parchment/40 tracking-[0.2em] uppercase">or</span>
            <div className="flex-1 h-px" style={{ background: "color-mix(in oklab, var(--color-parchment) 18%, transparent)" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
                  style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
                <input type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignup ? "Min. 6 characters" : "••••••••"}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
                  style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment transition">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
                  <input type={showPw ? "text" : "password"} required value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
                    style={{
                      background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
                      border: `1px solid ${confirm && confirm !== password ? "color-mix(in oklab, var(--color-crimson) 60%, transparent)" : "color-mix(in oklab, var(--color-parchment) 22%, transparent)"}`,
                    }}
                    onFocus={focusOn}
                    onBlur={e => (e.currentTarget.style.borderColor = confirm && confirm !== password ? "color-mix(in oklab, var(--color-crimson) 60%, transparent)" : "color-mix(in oklab, var(--color-parchment) 22%, transparent)")} />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[10px] text-crimson mt-1 ml-1">Passwords don't match</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="btn-arcane btn-arcane-hover w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <><FlaskConical className="h-4 w-4 animate-spin" /> {isSignup ? "Creating account…" : "Transmuting…"}</>
                : isSignup
                  ? <><UserPlus className="h-4 w-4" /> Create Account &amp; Join Class</>
                  : <><LogIn className="h-4 w-4" /> Sign In &amp; Join Class</>}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <p className="text-center text-sm text-parchment/50 mt-6">
          {isSignup ? (
            <>Already have an account?{" "}
              <Link to="/school-login" className="text-teal hover:text-spectral transition font-display tracking-wide">
                Sign in with your code
              </Link>
            </>
          ) : (
            <>No account yet?{" "}
              <Link to="/school-signup" className="text-teal hover:text-spectral transition font-display tracking-wide">
                Sign up with your code
              </Link>
            </>
          )}
        </p>
        <p className="text-center text-sm text-parchment/50 mt-2">
          <Link to={isSignup ? "/signup" : "/login"} className="text-parchment/60 hover:text-spectral transition">
            No school code? Use the general {isSignup ? "sign-up" : "sign-in"} →
          </Link>
        </p>
        <p className="text-center text-sm text-parchment/50 mt-2">
          <Link to="/educator" className="inline-flex items-center gap-1.5 text-parchment/60 hover:text-gold transition">
            <GraduationCap className="h-3.5 w-3.5" /> Are you an educator? Enter here
          </Link>
        </p>
        <p className="text-center mt-2">
          <Link to="/" className="text-xs text-parchment/40 hover:text-parchment/70 transition tracking-[0.15em] uppercase">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
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
