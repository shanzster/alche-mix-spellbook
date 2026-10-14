import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { fetchRole, signInWithEmail, signOut } from "../lib/auth";

/**
 * Minimalistic, ROLE-LOCKED sign-in — one dedicated door per role so no two
 * roles share a login (used for /admin/login, /school/signin, /teacher/login).
 * Deliberately plain/technical: no grimoire art, just a functional form. If the
 * signed-in account's role doesn't match `expectedRole`, it is signed back out
 * with an error, so e.g. a teacher can't slip in through the admin door.
 */
type Role = "admin" | "school_admin" | "teacher";

export function TechLogin({
  title,
  expectedRole,
  to,
}: {
  title: string;
  expectedRole: Role;
  to: "/admin" | "/school" | "/teacher";
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signInWithEmail(email.trim(), password);
      const role = await fetchRole(user.uid);
      if (role !== expectedRole) {
        await signOut();
        setError(`This account isn't a ${label(expectedRole)}. Use the correct door.`);
        return;
      }
      navigate({ to });
    } catch (err: any) {
      setError(friendlyError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-md border border-[color-mix(in_oklab,var(--color-spectral)_22%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--color-mist)_70%,transparent)] px-3 py-2 text-sm text-spectral " +
    "outline-none focus:border-[color-mix(in_oklab,var(--color-emerald-elixir)_60%,transparent)]";

  return (
    <div className="min-h-dvh flex items-center justify-center bg-mist px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-parchment/50">AlcheMix · internal</p>
          <h1 className="mt-1 font-ui text-xl font-semibold text-spectral">{title}</h1>
          <p className="mt-1 text-xs text-parchment/60">{label(expectedRole)} access only.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-parchment/60">Email</label>
            <input type="email" autoComplete="username" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-parchment/60">Password</label>
            <input type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={field} />
          </div>

          {error && (
            <p className="rounded-md border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-md bg-[var(--color-emerald-elixir)] px-3 py-2 text-sm font-semibold text-mist transition hover:opacity-90 disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[11px] text-parchment/45">
          <Link to="/admin/login" className="hover:text-spectral">Admin</Link>
          <Link to="/school/signin" className="hover:text-spectral">School</Link>
          <Link to="/teacher/login" className="hover:text-spectral">Teacher</Link>
          <Link to="/login" className="hover:text-spectral">Student</Link>
        </div>
      </div>
    </div>
  );
}

function label(role: Role): string {
  return role === "admin" ? "Super admin" : role === "school_admin" ? "School admin" : "Teacher";
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
