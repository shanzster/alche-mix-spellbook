import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText, LogIn, LogOut, UserPlus } from "lucide-react";
import { onAuthChange, signOut, type User } from "../lib/auth";

// ── Icon nav link ─────────────────────────────────────────────────────────
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

// ── Auth pill — separate from the nav pill, floats on the right ───────────
function AuthPill({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate({ to: "/" });
  };

  const pillStyle = {
    background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
    border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
    boxShadow: "0 8px 40px -8px color-mix(in oklab, var(--color-wraith) 30%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-spectral) 8%, transparent)",
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 h-10 rounded-full px-2 backdrop-blur-xl" style={pillStyle}>
        {/* Avatar */}
        <div className="group relative flex h-7 w-7 items-center justify-center rounded-full overflow-hidden flex-shrink-0 border"
          style={{ borderColor: "color-mix(in oklab, var(--color-wraith) 55%, transparent)" }}>
          {user.photoURL
            ? <img src={user.photoURL} alt={user.displayName ?? "User"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            : <div className="h-full w-full flex items-center justify-center font-display text-[10px] text-wraith"
                style={{ background: "color-mix(in oklab, var(--color-wraith) 18%, transparent)" }}>
                {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
              </div>
          }
        </div>
        {/* Name — truncated */}
        <span className="font-display text-[11px] tracking-[0.1em] text-spectral max-w-[80px] truncate">
          {user.displayName?.split(" ")[0] ?? user.email?.split("@")[0]}
        </span>
        {/* Sign out */}
        <button onClick={handleSignOut} disabled={signingOut}
          className="group relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 flex-shrink-0"
          style={{ background: "color-mix(in oklab, var(--color-crimson) 15%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}
          aria-label="Sign out">
          <LogOut className="h-3 w-3 text-crimson" />
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
            Sign out
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 h-10 rounded-full px-2 backdrop-blur-xl" style={pillStyle}>
      <Link to="/login"
        className="group relative flex items-center gap-1.5 h-7 rounded-full px-3 font-display text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:scale-105"
        style={{
          background: "color-mix(in oklab, var(--color-wraith) 15%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)",
          color: "var(--color-wraith)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px -4px color-mix(in oklab, var(--color-wraith) 55%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
        <LogIn className="h-3 w-3" /> Login
      </Link>
      <Link to="/signup"
        className="group relative flex items-center gap-1.5 h-7 rounded-full px-3 font-display text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:scale-105"
        style={{
          background: "color-mix(in oklab, var(--color-gold) 15%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)",
          color: "var(--color-gold)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px -4px color-mix(in oklab, var(--color-gold) 50%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
        <UserPlus className="h-3 w-3" /> Sign Up
      </Link>
    </div>
  );
}

// ── Main nav ─────────────────────────────────────────────────────────────
export function FloatingNav() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  return (
    <header className="fixed top-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* This row holds the pill + auth pill, centered together */}
      <div className="pointer-events-auto relative flex items-center gap-3" style={{ height: "68px" }}>

        {/* ── The original pill — unchanged, perfectly centred ── */}
        <div className="relative flex items-center justify-center" style={{ height: "68px" }}>
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
            <NavLink href="/about" label="About" />
            <NavLink href="/elements" label="Elements" />
            {/* Center gap for the orb */}
            <div style={{ width: "72px", flexShrink: 0 }} />
            <NavLink href="/grimoire" label="Grimoire" />
            <NavLink href="/learn" label="How It Works" />
          </div>

          {/* Logo orb — exactly centred on the gap, same as before */}
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

        {/* ── Auth pill — sits to the right, doesn't affect pill centering ── */}
        {authReady && <AuthPill user={user} />}
      </div>
    </header>
  );
}
