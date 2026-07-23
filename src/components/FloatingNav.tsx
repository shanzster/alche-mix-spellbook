import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText, LogIn, LogOut, UserPlus } from "lucide-react";
import { onAuthChange, signOut, type User } from "../lib/auth";

// ── Icon nav link (existing scroll links) ─────────────────────────────────
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href as any}
      className="group relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:scale-110"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
        border: "1px solid color-mix(in oklab, var(--color-parchment) 20%, transparent)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-wraith) 55%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow  = "0 0 14px -4px color-mix(in oklab, var(--color-wraith) 50%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-parchment) 20%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow  = "none";
      }}
    >
      <ScrollText className="h-3.5 w-3.5 text-gold group-hover:text-spectral transition-colors duration-200" />
      <span
        className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: "color-mix(in oklab, var(--color-mist) 90%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

// ── Auth section — right side of pill ─────────────────────────────────────
function AuthSection({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate({ to: "/" });
  };

  if (user) {
    return (
      <div className="flex items-center gap-1.5 ml-1">
        {/* Avatar */}
        <div className="group relative">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border-2 transition-all duration-200"
            style={{ borderColor: "color-mix(in oklab, var(--color-wraith) 55%, transparent)" }}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName ?? "User"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-display text-xs text-wraith"
                style={{ background: "color-mix(in oklab, var(--color-wraith) 18%, transparent)" }}>
                {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
              </div>
            )}
          </div>
          {/* Tooltip */}
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.1em] text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
            {user.displayName ?? user.email}
          </span>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="group relative flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50"
          style={{ background: "color-mix(in oklab, var(--color-crimson) 15%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-crimson) 60%, transparent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-crimson) 30%, transparent)"; }}
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5 text-crimson" />
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
            Sign out
          </span>
        </button>
      </div>
    );
  }

  // Not logged in — show Login + Sign Up
  return (
    <div className="flex items-center gap-1.5 ml-1">
      <Link to="/login"
        className="group relative flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:scale-110"
        style={{ background: "color-mix(in oklab, var(--color-wraith) 15%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-wraith) 65%, transparent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px -4px color-mix(in oklab, var(--color-wraith) 55%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-wraith) 35%, transparent)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        aria-label="Sign in"
      >
        <LogIn className="h-3.5 w-3.5 text-wraith" />
        <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
          Sign in
        </span>
      </Link>

      <Link to="/signup"
        className="group relative flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 hover:scale-110"
        style={{ background: "color-mix(in oklab, var(--color-gold) 15%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-gold) 65%, transparent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px -4px color-mix(in oklab, var(--color-gold) 50%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-gold) 35%, transparent)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        aria-label="Sign up"
      >
        <UserPlus className="h-3.5 w-3.5 text-gold" />
        <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
          Sign up
        </span>
      </Link>
    </div>
  );
}

// ── Main nav ──────────────────────────────────────────────────────────────
export function FloatingNav() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  return (
    <header className="fixed top-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto relative flex items-center justify-center" style={{ height: "68px" }}>
        {/* The pill */}
        <div
          className="flex items-center h-12 rounded-full backdrop-blur-xl"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
            boxShadow: "0 8px 40px -8px color-mix(in oklab, var(--color-wraith) 30%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-spectral) 8%, transparent)",
            padding: "0 12px",
            gap: "6px",
          }}
        >
          {/* Left */}
          <NavLink href="/about" label="About" />
          <NavLink href="/elements" label="Elements" />

          {/* Center gap for orb */}
          <div style={{ width: "72px", flexShrink: 0 }} />

          {/* Right */}
          <NavLink href="/grimoire" label="Grimoire" />
          <NavLink href="/learn" label="How It Works" />

          {/* Separator */}
          <div className="h-5 w-px mx-1 flex-shrink-0"
            style={{ background: "color-mix(in oklab, var(--color-parchment) 18%, transparent)" }} />

          {/* Auth — only render once Firebase has resolved */}
          {authReady && <AuthSection user={user} />}
        </div>

        {/* Logo orb */}
        <Link
          to="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full animate-breathing group"
          style={{
            width: "60px", height: "60px",
            background: "#1D1D1B",
            border: "4px solid color-mix(in oklab, var(--color-slate-sunken) 100%, transparent)",
            boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-wraith) 55%, transparent), 0 0 28px -4px color-mix(in oklab, var(--color-wraith) 70%, transparent), 0 0 50px -10px color-mix(in oklab, var(--color-wraith) 40%, transparent)",
            flexShrink: 0,
          }}
        >
          <img src="/images/logo-outline.png" alt="AlcheMix"
            style={{ width: "36px", height: "36px", objectFit: "contain", filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-wraith) 80%, transparent))" }} />
          <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[9px] tracking-[0.2em] uppercase text-spectral/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            AlcheMix
          </span>
        </Link>
      </div>
    </header>
  );
}
