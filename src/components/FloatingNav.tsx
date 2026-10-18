import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, Atom, BookOpen, Compass, School, Layers, LogIn, LogOut, UserPlus, Menu, X } from "lucide-react";
import { onAuthChange, signOut, type User } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

// ── Nav destinations — 3 left of the logo orb, 3 right, so the pill reads
//    symmetrically around the centred home orb. ──────────────────────────────
const NAV_LINKS = [
  // left wing
  { href: "/about", label: "About", icon: Info },
  { href: "/elements", label: "Elements", icon: Atom },
  { href: "/grimoire", label: "Grimoire", icon: Layers },
  // right wing
  { href: "/learn", label: "How It Works", icon: Compass },
  { href: "/lexicon", label: "Lexicon", icon: BookOpen },
  { href: "/schools", label: "For Schools", icon: School },
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
      {/* Labels appear from lg up; below that the six items stay icon-only so the
          centred pill can't collide with the right-pinned theme/auth controls. */}
      <span className="hidden lg:inline font-ui text-xs font-semibold tracking-[0.04em] whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

// ── Auth pill ──────────────────────────────────────────────────────────────
function AuthPill({ user, bare = false }: { user: User | null; bare?: boolean }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate({ to: "/" });
  };

  // `bare` renders just the buttons (used inside the mobile nav pill);
  // otherwise the buttons get their own floating pill.
  const pillStyle = bare ? undefined : {
    background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
    border: "1px solid var(--color-border)",
    boxShadow: "0 8px 30px -12px color-mix(in oklab, var(--color-wraith) 25%, transparent)",
  };
  const wrap = bare ? "flex items-center gap-1.5" : "flex items-center gap-2 h-10 rounded-full px-2 backdrop-blur-xl";

  if (user) {
    return (
      <div className={wrap} style={pillStyle}>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden flex-shrink-0 border"
          style={{ borderColor: "color-mix(in oklab, var(--color-emerald-elixir) 55%, transparent)" }}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName ?? "User"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center font-ui text-[10px] font-bold text-teal"
              style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)" }}
            >
              {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <span className="hidden sm:inline font-ui text-xs font-medium text-foreground max-w-[80px] truncate">
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
    <div className={wrap} style={pillStyle}>
      <Link
        to="/login"
        className="flex items-center gap-1.5 h-7 rounded-full px-3 font-ui text-xs font-semibold transition-all duration-200 hover:scale-105"
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
        className="flex items-center gap-1.5 h-7 rounded-full px-3 font-ui text-xs font-semibold transition-all duration-200 hover:scale-105"
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
  // Mobile: the six content links collapse behind this menu button so the pill
  // never overflows a narrow phone (icons + logo + theme + auth alone fit).
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  // Esc closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="fixed top-3 md:top-4 left-0 right-0 z-50 pointer-events-none">
      {/* Centred nav pill — the logo orb is a real item, seated in the middle. */}
      <div className="flex justify-center px-3">
        <nav
          className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-1 h-14 rounded-full backdrop-blur-xl px-2"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 30px -12px color-mix(in oklab, var(--color-wraith) 28%, transparent)",
          }}
          aria-label="Primary"
        >
          {/* Mobile: a single menu button stands in for the six links. */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-parchment transition-colors hover:bg-teal/10 hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Left wing — three links (desktop only) */}
          <span className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.slice(0, 3).map((l) => <NavLink key={l.href} {...l} />)}
          </span>

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

          {/* Right wing — three links (desktop only) */}
          <span className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.slice(3).map((l) => <NavLink key={l.href} {...l} />)}
          </span>

          {/* Mobile: theme + auth live inside the pill so nothing overlaps. */}
          <span className="flex items-center gap-1.5 md:hidden">
            <span aria-hidden className="mx-0.5 h-6 w-px" style={{ background: "var(--color-border)" }} />
            <ThemeToggle className="!h-8 !w-8 !backdrop-blur-none" />
            {authReady && <AuthPill user={user} bare />}
          </span>
        </nav>
      </div>

      {/* Mobile menu sheet — the six links as a tidy list under the pill. */}
      {menuOpen && (
        <>
          <div
            className="pointer-events-auto fixed inset-0 md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="pointer-events-auto relative z-10 mx-auto mt-2 w-[min(20rem,calc(100vw-1.5rem))] md:hidden">
            <div
              className="flyout-in grid grid-cols-2 gap-1 rounded-2xl p-2 backdrop-blur-xl"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 94%, transparent)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 18px 40px -16px color-mix(in oklab, var(--color-wraith) 35%, transparent)",
              }}
            >
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  to={l.href as any}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-parchment transition-colors hover:bg-teal/10 hover:text-foreground"
                  activeProps={{
                    style: {
                      color: "var(--color-emerald-elixir)",
                      background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
                    },
                  }}
                >
                  <l.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="font-ui text-[13px] font-semibold tracking-[0.04em]">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Desktop: controls pinned right, vertically centred to the pill. */}
      <div className="pointer-events-auto absolute right-4 top-0 hidden h-14 items-center gap-2 md:flex">
        <ThemeToggle />
        {authReady && <AuthPill user={user} />}
      </div>
    </header>
  );
}
