import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FlaskConical, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import { signUpWithEmail, signInWithGoogle } from "../lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

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

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [role, setRole]         = useState<"student" | "teacher">("student");

  const destination = role === "teacher" ? "/teacher" : "/app";

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, role);
      navigate({ to: destination });
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithGoogle(role);
      navigate({ to: destination });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

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
              background: i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)",
              boxShadow: `0 0 10px ${i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)"}`,
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
                boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-wraith) 55%, transparent), 0 0 28px -4px color-mix(in oklab, var(--color-wraith) 70%, transparent)",
              }}>
              <img src="/images/logo-outline.png" alt="AlcheMix" className="h-9 w-9 object-contain"
                style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-wraith) 80%, transparent))" }} />
            </div>
            <span className="font-display text-xl tracking-[0.2em] text-spectral">AlcheMix AR</span>
          </Link>
          <p className="text-parchment/60 text-sm mt-1 tracking-wide">Create your alchemist account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-parchment) 20%, transparent)",
            boxShadow: "0 0 60px -20px color-mix(in oklab, var(--color-wraith) 35%, transparent)",
          }}>

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-parchment/60 mb-2 text-center">I am signing up as a</p>
            <div className="flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              {(["student", "teacher"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="flex-1 rounded-full py-2 text-xs tracking-[0.12em] uppercase transition font-display"
                  style={role === r ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 20%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)" }}>
                  {r}
                </button>
              ))}
            </div>
            {role === "teacher" && (
              <p className="text-[11px] text-gold/80 mt-2 text-center">Educator accounts require admin approval before access.</p>
            )}
          </div>

          {/* Google button */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 mb-6 font-display text-sm tracking-[0.1em] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            style={{
              background: "color-mix(in oklab, var(--color-mist) 60%, white 8%)",
              border: "1px solid color-mix(in oklab, var(--color-parchment) 30%, transparent)",
            }}>
            <GoogleIcon />
            Sign up with Google
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
                  style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-wraith) 60%, transparent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-parchment) 22%, transparent)")} />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
                <input type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
                  style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-wraith) 60%, transparent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-parchment) 22%, transparent)")} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment transition">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

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
                  onFocus={e => (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-wraith) 60%, transparent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = confirm && confirm !== password ? "color-mix(in oklab, var(--color-crimson) 60%, transparent)" : "color-mix(in oklab, var(--color-parchment) 22%, transparent)")} />
              </div>
              {confirm && confirm !== password && (
                <p className="text-[10px] text-crimson mt-1 ml-1">Passwords don't match</p>
              )}
            </div>

            {error && (
              <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="btn-arcane btn-arcane-hover w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <><FlaskConical className="h-4 w-4 animate-spin" /> Creating account…</>
                : <><UserPlus className="h-4 w-4" /> Create Account</>}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <p className="text-center text-sm text-parchment/50 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-wraith hover:text-spectral transition font-display tracking-wide">
            Sign in
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
    "auth/invalid-email":         "That doesn't look like a valid email.",
    "auth/weak-password":         "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests":     "Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/popup-blocked":         "Popup was blocked. Allow popups for this site.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}
