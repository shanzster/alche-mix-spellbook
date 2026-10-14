import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, Mail, Lock, Eye, EyeOff, UserPlus, School, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { signUpWithEmail } from "../lib/auth";
import { requestEmailCode, verifyEmailCode } from "../lib/email-verify";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordStrength } from "../components/PasswordStrength";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";

/**
 * Student sign-up — email + password only (no third-party auth), now gated by a
 * Brevo-emailed verification code (VERIFY-BEFORE-CREATE): the Firebase account
 * is only created after the 6-digit sigil checks out, so unverified addresses
 * never land in Auth. The password never leaves the browser — it is held in
 * state and only used once the code is confirmed. Teachers do NOT self-register;
 * their school admin provisions them (see docs/SCHOOL_MULTITENANCY.md).
 */
export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

type Step = "details" | "verify";

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>("details");
  const [first, setFirst]     = useState("");
  const [middle, setMiddle]   = useState("");
  const [last, setLast]       = useState("");
  const [school, setSchool]   = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Verification state.
  const [code, setCode]       = useState("");
  const [token, setToken]     = useState("");
  const [emailed, setEmailed] = useState(true);
  const [cooldown, setCooldown] = useState(0); // seconds before "Resend" re-enables

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Step 1 → request a code and advance to the verify step.
  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!first.trim() || !last.trim()) { setError("Please enter your first and last name."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await requestEmailCode({ data: { email: email.trim(), name: first.trim() } });
      setToken(res.token);
      setEmailed(res.emailed);
      setCode("");
      setCooldown(30);
      setStep("verify");
    } catch (err: any) {
      setError(err?.message ?? "Couldn't send the verification code. Please try again.");
    } finally { setLoading(false); }
  };

  // Step 2 → verify the code, THEN create the account.
  const submitCode = async (value: string) => {
    setError("");
    setLoading(true);
    try {
      const check = await verifyEmailCode({ data: { email: email.trim(), code: value, token } });
      if (!check.ok) {
        setError(
          check.reason === "expired"
            ? "That code has expired — tap Resend for a fresh one."
            : "That code doesn't match. Check your email and try again.",
        );
        setCode("");
        return;
      }
      // Verified — now create the Firebase account.
      await signUpWithEmail(email.trim(), password, "student", {
        names: { firstName: first, middleName: middle, lastName: last, schoolName: school },
      });
      navigate({ to: "/app" });
    } catch (err: any) {
      setError(err?.code ? friendlyError(err.code) : (err?.message ?? "Something went wrong. Please try again."));
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    await submitCode(code);
  };

  const resend = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await requestEmailCode({ data: { email: email.trim(), name: first.trim() } });
      setToken(res.token);
      setEmailed(res.emailed);
      setCode("");
      setCooldown(30);
    } catch (err: any) {
      setError(err?.message ?? "Couldn't resend the code. Please try again.");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
    border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
  } as const;
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-wraith) 60%, transparent)");
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "color-mix(in oklab, var(--color-parchment) 22%, transparent)");

  const nameInput = "w-full rounded-lg px-3 py-2.5 text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all";

  // ── The verification step ──────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <AuthLayout sideTitle="Seal your sign-up." sideText="Inscribe the sigil we sent to prove the address is yours.">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => { setStep("details"); setError(""); }} aria-label="Back"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition hover:-translate-y-0.5"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 92%, black 6%)", border: "2px solid color-mix(in oklab, var(--color-wraith) 55%, transparent)", boxShadow: "0 0 20px -6px color-mix(in oklab, var(--color-wraith) 70%, transparent)" }}>
            <ArrowLeft className="h-5 w-5 text-parchment/70" />
          </button>
          <div>
            <h1 className="font-display text-2xl leading-none">Verify your email</h1>
            <p className="mt-1 text-xs tracking-[0.1em] text-parchment/60">Inscribe the sigil</p>
          </div>
        </div>

        <div className="mb-5 flex items-start gap-3 rounded-lg px-4 py-3"
          style={{ background: "color-mix(in oklab, var(--color-gold) 9%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
          <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
          <p className="text-sm text-parchment/75">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-spectral">{email}</span>. It expires in 10 minutes.
            {!emailed && (
              <span className="mt-1 block text-xs text-parchment/50">
                (Email service is in keyless dev mode — the code was logged to the server console.)
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => setCode(v)}
              onComplete={(v) => submitCode(v)}
              containerClassName="gap-2"
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-11 rounded-lg border-0 text-xl font-semibold text-gold"
                    style={{
                      background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)",
                    }}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading || code.length !== 6}
            className="btn-arcane btn-arcane-hover w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <><FlaskConical className="h-4 w-4 animate-spin" /> Verifying…</>
              : <><UserPlus className="h-4 w-4" /> Verify &amp; Create Account</>}
          </button>

          <p className="text-center text-sm text-parchment/60">
            Didn't get it?{" "}
            <button type="button" onClick={resend} disabled={cooldown > 0 || loading}
              className="text-wraith hover:text-spectral transition disabled:opacity-40 disabled:cursor-not-allowed font-display tracking-wide">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  // ── The details step ────────────────────────────────────────────────────────
  return (
    <AuthLayout sideTitle="Begin your work." sideText="Create an account and join the alchemists.">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="AlcheMix home" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 92%, black 6%)", border: "2px solid color-mix(in oklab, var(--color-wraith) 55%, transparent)", boxShadow: "0 0 20px -6px color-mix(in oklab, var(--color-wraith) 70%, transparent)" }}>
          <img src="/images/logo-outline.png" alt="AlcheMix" className="h-6 w-6 object-contain" />
        </Link>
        <div>
          <h1 className="font-display text-2xl leading-none">Create Account</h1>
          <p className="mt-1 text-xs tracking-[0.1em] text-parchment/60">Your alchemist's beginning</p>
        </div>
      </div>

      {/* School-code students get their own door. */}
      <Link to="/school-signup"
        className="group mb-5 flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}>
        <School className="h-5 w-5 flex-shrink-0 text-teal" />
        <span className="flex-1 text-sm">
          <span className="font-semibold text-teal">Have a class code ready?</span>{" "}
          <span className="text-parchment/70">Sign up through the School Door and join your class.</span>
        </span>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-teal transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>

      <form onSubmit={handleDetails} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-parchment/60">First name</label>
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Juan" required className={nameInput} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-parchment/60">Last name</label>
            <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Dela Cruz" required className={nameInput} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-parchment/60">Middle <span className="normal-case tracking-normal text-parchment/35">(optional)</span></label>
            <input value={middle} onChange={(e) => setMiddle(e.target.value)} placeholder="Santos" className={nameInput} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-parchment/60">School <span className="normal-case tracking-normal text-parchment/35">(optional)</span></label>
            <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Your school" className={nameInput} style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-parchment/60 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-spectral placeholder:text-parchment/30 outline-none transition-all"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment transition">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Confirm */}
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

        {error && (
          <p className="text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="btn-arcane btn-arcane-hover w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading
            ? <><FlaskConical className="h-4 w-4 animate-spin" /> Sending code…</>
            : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      {/* Footer links */}
      <p className="text-center text-sm text-parchment/60 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-wraith hover:text-spectral transition font-display tracking-wide">Sign in</Link>
      </p>
      <p className="text-center text-xs text-parchment/45 mt-2">
        Teachers don't sign up here — your school admin provisions your account, then you{" "}
        <Link to="/teacher/login" className="text-gold hover:text-spectral transition">sign in at the Educator's Door</Link>.
      </p>
    </AuthLayout>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use":  "An account with that email already exists.",
    "auth/invalid-email":         "That doesn't look like a valid email.",
    "auth/weak-password":         "Password is too weak. Use at least 6 characters.",
    "auth/too-many-requests":     "Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection.",
  };
  return map[code] ?? `Something went wrong. Please try again. (${code ?? "unknown error"})`;
}
