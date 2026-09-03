import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Atom,
  Grid3x3,
  BookMarked,
  Scale,
  Gauge,
  ClipboardList,
  LogOut,
  MoreHorizontal,
  ScanSearch,
  Brain,
  Shapes,
  ShieldAlert,
  Beaker,
  Radiation,
  ScanLine,
  Flame,
  FlaskConical,
  Thermometer,
  Crosshair,
  Swords,
  Store,
  ListChecks,
  Trophy,
  Activity,
  RefreshCw,
  Zap,
  Magnet,
  Droplets,
  Coffee,
  Compass,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { signOut } from "../lib/auth";
import { aiPing } from "../lib/ai";
import { AskAlchemist } from "./AskAlchemist";
import { ThemeToggle } from "./ThemeToggle";

// Log the AI self-test verdict to the browser console once per page load.
// (The server caches the underlying Gemini call for 10 min — no quota burn.)
let aiVerdictLogged = false;
function useAIVerdictLog() {
  useEffect(() => {
    if (aiVerdictLogged) return;
    aiVerdictLogged = true;
    aiPing()
      .then((r) => {
        if (r.ok) {
          console.log(
            `%c[AlcheMix AI] ✓ Gemini is LIVE (model ${r.model}) — ${r.detail}`,
            "color:#34d399;font-weight:bold",
          );
        } else {
          console.warn(
            `[AlcheMix AI] ✗ Gemini NOT working — app is running in rule-based fallback mode.\n` +
              `Reason: ${r.detail}`,
          );
        }
      })
      .catch((err) => console.warn("[AlcheMix AI] self-test could not run:", err));
  }, []);
}

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Chapter heading this page sits under in the Table of Contents. */
  chapter: string;
  primary?: boolean; // shown in the mobile bottom bar
  disabled?: boolean; // e.g. gated on AI setup
}

const CH_BENCH = "The Bench";
const CH_1 = "I · Foundations";
const CH_2 = "II · The Study";
const CH_3 = "III · Molecules & Reactions";
const CH_4 = "IV · Advanced Labs";
const CH_5 = "V · Prove Your Craft";
const CH_ARCADE = "The Arcade";
const CH_FIELD = "Field Work";

// Every page of the book, in reading order. The order doubles as the pager's
// page sequence; `chapter` groups them in the Table of Contents.
const NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, chapter: CH_BENCH, primary: true },
  { to: "/cards", label: "Grimoire", icon: BookMarked, chapter: CH_BENCH, primary: true },
  { to: "/guide", label: "The Guide", icon: Compass, chapter: CH_BENCH },
  { to: "/starters", label: "Starters for Ten", icon: Flame, chapter: CH_BENCH },
  { to: "/assignments", label: "Assignments", icon: ListChecks, chapter: CH_BENCH },
  { to: "/lab-safety", label: "Lab Safety", icon: ShieldAlert, chapter: CH_1 },
  { to: "/atomic-builder", label: "Atomic Builder", icon: Atom, chapter: CH_1 },
  { to: "/periodic-table", label: "Periodic Table", icon: Grid3x3, chapter: CH_1 },
  { to: "/states", label: "States of Matter", icon: Thermometer, chapter: CH_1 },
  { to: "/study", label: "The Study", icon: Brain, chapter: CH_2 },
  { to: "/molecules", label: "Molecule Shapes", icon: Shapes, chapter: CH_3 },
  { to: "/forces", label: "Invisible Bonds", icon: Magnet, chapter: CH_3 },
  { to: "/reactions", label: "Reaction Theatre", icon: Atom, chapter: CH_3 },
  { to: "/equation-balancer", label: "Equation Balancer", icon: Scale, chapter: CH_3 },
  { to: "/codex", label: "Compound Codex", icon: FlaskConical, chapter: CH_3 },
  { to: "/gas-laws", label: "Gas Laws", icon: Gauge, chapter: CH_4 },
  { to: "/solutions", label: "Elixir Bench", icon: Droplets, chapter: CH_4 },
  { to: "/thermo", label: "Cauldron of Heat", icon: Coffee, chapter: CH_4 },
  { to: "/rates", label: "Reaction Rates", icon: Activity, chapter: CH_4 },
  { to: "/equilibrium", label: "Equilibrium", icon: RefreshCw, chapter: CH_4 },
  { to: "/electro", label: "Voltaic Forge", icon: Zap, chapter: CH_4 },
  { to: "/titration", label: "Titration Lab", icon: Beaker, chapter: CH_4 },
  { to: "/decay", label: "Radioactive Decay", icon: Radiation, chapter: CH_4 },
  { to: "/quiz", label: "3D Quiz", icon: ClipboardList, chapter: CH_5 },
  { to: "/duel", label: "Duel", icon: Swords, chapter: CH_ARCADE },
  { to: "/duels", label: "Class Duels", icon: Swords, chapter: CH_ARCADE },
  { to: "/table-game", label: "Placement Trials", icon: Crosshair, chapter: CH_ARCADE },
  { to: "/leaderboard", label: "Hall of Records", icon: Trophy, chapter: CH_ARCADE },
  { to: "/shop", label: "The Emporium", icon: Store, chapter: CH_ARCADE },
  { to: "/scanner", label: "AR Scanner", icon: ScanLine, chapter: CH_FIELD, primary: true },
  { to: "/scavenger", label: "Scavenger Hunt", icon: ScanSearch, chapter: CH_FIELD, primary: true },
];

const CHAPTERS = [CH_BENCH, CH_1, CH_2, CH_3, CH_4, CH_5, CH_ARCADE, CH_FIELD];

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) =>
    to === "/app" ? pathname === "/app" : pathname === to || pathname.startsWith(to + "/");
}

/** Index of the current route in the book's page order (-1 when off-book). */
function pageIndexOf(pathname: string): number {
  return NAV.findIndex((n) =>
    n.to === "/app" ? pathname === "/app" : pathname === n.to || pathname.startsWith(n.to + "/"),
  );
}

/**
 * Direction-aware page-turn: compares this route's position in the book with
 * the previous one and returns the animation class for the entering page.
 */
function usePageTurn(pathname: string): string {
  const prevIndexRef = useRef<number>(pageIndexOf(pathname));
  const index = pageIndexOf(pathname);
  const prev = prevIndexRef.current;
  useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);
  if (index === -1 || prev === -1 || index === prev) return "page-turn-fwd";
  return index >= prev ? "page-turn-fwd" : "page-turn-back";
}

/**
 * The Table of Contents — the book's full map, opened from the top bar or ⌘K.
 * Chapters as columns of quiet links; replaces the old always-there sidebar.
 */
function TableOfContents({ onClose }: { onClose: () => void }) {
  const isActive = useActive();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="glass-strong relative z-10 w-full max-w-4xl rounded-2xl p-5 md:p-7">
        <div className="mb-5 flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-parchment/60" />
          <h2 className="text-base font-semibold">Table of Contents</h2>
          <button
            onClick={onClose}
            aria-label="Close contents"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-parchment/70 transition-colors hover:bg-teal/10 hover:text-spectral"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((chapter) => (
            <div key={chapter}>
              <p className="mb-1.5 px-1 text-[11px] uppercase tracking-[0.14em] text-parchment/50">
                {chapter}
              </p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.chapter === chapter).map((item) => {
                  const active = isActive(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to as any}
                        onClick={onClose}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-teal/8"
                        style={{
                          color: active ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
                          background: active
                            ? "color-mix(in oklab, var(--color-emerald-elixir) 8%, transparent)"
                            : undefined,
                        }}
                      >
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[10px] text-parchment/40">
          Press <kbd className="rounded border border-current/30 px-1">⌘K</kbd> anywhere to open
          the contents · <kbd className="rounded border border-current/30 px-1">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

/**
 * App shell for the student area — the app as a book.
 * Desktop: floating glass top bar (cover → home, Contents overlay) + a
 * bottom pager that flips pages in order. Mobile: top bar + bottom tab nav.
 */
export function StudentShell({ title, children }: { title?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const isActive = useActive();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const turnClass = usePageTurn(pathname);
  const pageIndex = pageIndexOf(pathname);
  const prevPage = pageIndex > 0 ? NAV[pageIndex - 1] : null;
  const nextPage = pageIndex >= 0 && pageIndex < NAV.length - 1 ? NAV[pageIndex + 1] : null;
  useAIVerdictLog();

  // ⌘K / Ctrl+K toggles the Table of Contents.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTocOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };
  const primary = NAV.filter((n) => n.primary);
  const moreItems = NAV.filter((n) => !n.primary);
  const moreActive = moreItems.some((n) => !n.disabled && isActive(n.to));

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      {/* Ambient colour under the glass */}
      <div className="bg-aurora pointer-events-none fixed inset-0 z-0" />

      {/* ── Desktop top bar — the book's cover strip ── */}
      <header className="glass-strong hidden md:flex fixed top-3 inset-x-3 z-40 h-14 items-center gap-4 rounded-2xl px-4">
        <Link to="/app" className="flex items-center gap-2.5">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-base tracking-[0.15em]">AlcheMix</span>
        </Link>

        {pageIndex !== -1 && (
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-parchment/30">/</span>
            <span className="truncate text-sm text-parchment/70">{NAV[pageIndex].label}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTocOpen(true)}
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-parchment transition-colors hover:bg-teal/10 hover:text-emerald-elixir"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Contents</span>
            <kbd className="text-[9px] text-parchment/45">⌘K</kbd>
          </button>
          <ThemeToggle className="!h-8 !w-8" />
          <button
            onClick={handleSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Mobile top bar — floating glass ── */}
      <header className="glass-strong md:hidden fixed top-2 inset-x-2 z-40 flex items-center justify-between h-14 px-4 rounded-2xl">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-ui font-medium text-sm tracking-[0.12em] truncate max-w-[46vw]">
            {title ?? "AlcheMix"}
          </span>
        </Link>
        <ThemeToggle className="!h-8 !w-8" />
      </header>

      {/* ── Content — each route enters like a turning page ── */}
      <main className="relative z-10">
        <div
          key={pathname}
          className={`w-full px-5 pt-20 pb-28 md:px-8 md:pt-24 md:pb-24 ${turnClass}`}
        >
          {children}
        </div>
      </main>

      {/* ── The Grimoire pager — flip to the previous/next page of the book ── */}
      {pageIndex !== -1 && (
        <div className="glass-strong hidden md:flex fixed bottom-3 left-1/2 z-40 -translate-x-1/2 items-center gap-1 rounded-full px-1.5 py-1.5">
          {prevPage ? (
            <Link
              to={prevPage.to as any}
              aria-label={`Previous page: ${prevPage.label}`}
              title={prevPage.label}
              className="flex h-8 w-8 items-center justify-center rounded-full text-parchment transition-colors hover:bg-teal/10 hover:text-emerald-elixir"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/25">
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
          <button
            onClick={() => setTocOpen(true)}
            className="flex items-center gap-2 rounded-full px-2.5 py-1 text-parchment/80 transition-colors hover:bg-teal/10"
            title="Open the Table of Contents"
          >
            <BookOpen className="h-3.5 w-3.5 text-parchment/60" />
            <span className="text-xs whitespace-nowrap">{NAV[pageIndex].label}</span>
            <span className="text-xs text-parchment/45 whitespace-nowrap">
              {pageIndex + 1}/{NAV.length}
            </span>
          </button>
          {nextPage ? (
            <Link
              to={nextPage.to as any}
              aria-label={`Next page: ${nextPage.label}`}
              title={nextPage.label}
              className="flex h-8 w-8 items-center justify-center rounded-full text-parchment transition-colors hover:bg-teal/10 hover:text-emerald-elixir"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/25">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}

      {/* ── Table of Contents overlay ── */}
      {tocOpen && <TableOfContents onClose={() => setTocOpen(false)} />}

      {/* ── Ask the Alchemist — the mentor, on every student page ── */}
      <AskAlchemist context={title} />

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && moreItems.length > 0 && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="glass-strong scroll-slim fixed bottom-[5rem] inset-x-3 z-50 max-h-[65vh] overflow-y-auto rounded-2xl p-2">
            <p className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-parchment/50">
              More modules
            </p>
            {moreItems.map((item) => {
              const active = !item.disabled && isActive(item.to);
              const inner = (
                <span
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm"
                  style={{
                    color: item.disabled
                      ? "color-mix(in oklab, var(--color-parchment) 55%, transparent)"
                      : active
                        ? "var(--color-emerald-elixir)"
                        : "var(--color-parchment)",
                    background: active
                      ? "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)"
                      : "transparent",
                  }}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.disabled && (
                    <span className="ml-auto text-[8px] tracking-[0.15em] uppercase text-gold">
                      AI
                    </span>
                  )}
                </span>
              );
              return item.disabled ? (
                <div key={item.label} className="opacity-70" title="Needs AI setup">
                  {inner}
                </div>
              ) : (
                <Link key={item.label} to={item.to as any} onClick={() => setMoreOpen(false)}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav — floating glass ── */}
      <nav className="glass-strong md:hidden fixed bottom-2 inset-x-2 z-50 flex items-stretch justify-around h-16 rounded-2xl overflow-hidden">
        {primary.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.label}
              to={item.to as any}
              onClick={() => setMoreOpen(false)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}
            >
              {active && (
                <span
                  className="absolute top-0 h-0.5 w-8 rounded-full"
                  style={{ background: "var(--color-emerald-elixir)" }}
                />
              )}
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
        {/* More — opens the overflow sheet (only when something overflows) */}
        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
            style={{
              color:
                moreOpen || moreActive ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
            }}
            aria-label="More modules"
            aria-expanded={moreOpen}
          >
            {moreActive && (
              <span
                className="absolute top-0 h-0.5 w-8 rounded-full"
                style={{ background: "var(--color-emerald-elixir)" }}
              />
            )}
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
