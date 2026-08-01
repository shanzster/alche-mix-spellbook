import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, Atom, BookMarked, Compass, LogIn, LogOut, UserPlus } from "lucide-react";
import { onAuthChange, signOut, type User } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

// ── Nav destinations — each with its OWN icon + a visible label ────────────
const NAV_LINKS = [
  { href: "/about", label: "About", icon: Info },
  { href: "/elements", label: "Elements", icon: Atom },
  { href: "/grimoire", label: "Grimoire", icon: BookMarked },
  { href: "/learn", label: "How It Works", icon: Compass },
] as const;

function NavLink({ href, label, icon: Icon }: (typeof NAV_LINKS)[number]) {
  return (
    <Link
      to={href as any}
      className="group flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-parchment transition-colors duration-200 hover:text-foreground"
      activeProps={{
        style: {
          color: "var(--color-emerald-elixir)",
          background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
        },
      }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {/* Label is visible from sm up; icon-only on the smallest screens. */}
      <span className="hidden sm:inline font-display text-[11px] tracking-[0.12em] uppercase whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

// ── Auth pill ──────────────────────────────────────────────────────────────
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
    border: "1px solid var(--color-border)",
    boxShadow: "0 8px 30px -12px color-mix(in oklab, var(--color-wraith) 25%, transparent)",
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 h-10 rounded-full px-2 backdrop-blur-xl" style={pillStyle}>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden flex-shrink-0 border"
          style={{ borderColor: "color-mix(in oklab, var(--color-emerald-elixir) 55%, transparent)" }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName ?? "User"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center font-display text-[10px] text-teal"
              style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)" }}
            >
              {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <span className="hidden sm:inline font-display text-[11px] tracking-[0.1em] text-foreground max-w-[80px] truncate">
          {user.displayName?.split(" ")[0] ?? user.email?.split("@")[0]}
        </span>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 flex-shrink-0"
          style={{ background: "color-mix(in oklab, var(--color-crimson) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-3 w-3 text-crimson" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 h-10 rounded-full px-2 backdrop-blur-xl" style={pillStyle}>
      <Link
        to="/login"
        className="flex items-center gap-1.5 h-7 rounded-full px-3 font-display text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:scale-105"
        style={{
          background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
          color: "var(--color-emerald-elixir)",
        }}
      >
        <LogIn className="h-3 w-3" /> <span className="hidden sm:inline">Login</span>
      </Link>
      <Link
        to="/signup"
        className="flex items-center gap-1.5 h-7 rounded-full px-3 font-display text-[11px] tracking-[0.1em] uppercase transition-all duration-200 hover:scale-105"
        style={{
          background: "color-mix(in oklab, var(--color-wraith) 14%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)",
          color: "var(--color-wraith)",
        }}
      >
        <UserPlus className="h-3 w-3" /> <span className="hidden sm:inline">Sign Up</span>
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
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      {/* Centred nav pill — the logo orb is a real item, seated in the middle. */}
      <div className="flex justify-center">
        <nav
          className="pointer-events-auto flex items-center gap-1 h-14 rounded-full backdrop-blur-xl px-2"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 30px -12px color-mix(in oklab, var(--color-wraith) 28%, transparent)",
          }}
          aria-label="Primary"
        >
          <NavLink {...NAV_LINKS[0]} />
          <NavLink {...NAV_LINKS[1]} />

          {/* Logo orb — seated inside the pill, vertically centred (no overlap) */}
          <Link
            to="/"
            aria-label="AlcheMix home"
            className="mx-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full animate-breathing"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 96%, black 8%)",
              border: "2px solid color-mix(in oklab, var(--color-emerald-elixir) 45%, transparent)",
              boxShadow: "0 0 18px -6px color-mix(in oklab, var(--color-emerald-elixir) 55%, transparent)",
            }}
          >
            <img
              src="/images/logo-outline.png"
              alt="AlcheMix"
              style={{ width: "26px", height: "26px", objectFit: "contain" }}
            />
          </Link>

          <NavLink {...NAV_LINKS[2]} />
          <NavLink {...NAV_LINKS[3]} />
        </nav>
      </div>

      {/* Right-side controls — pinned right, vertically centred to the pill. */}
      <div className="pointer-events-auto absolute right-4 top-0 flex h-14 items-center gap-2">
        <ThemeToggle />
        {authReady && <AuthPill user={user} />}
      </div>
    </header>
  );
}
