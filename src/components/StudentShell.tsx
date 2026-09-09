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
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { signOut } from "../lib/auth";
import { aiPing } from "../lib/ai";
import { AskAlchemist } from "./AskAlchemist";
import { ThemeToggle } from "./ThemeToggle";
import { Walkthrough } from "./Walkthrough";
import { useHiddenModules } from "../lib/moduleVisibility";

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
// Exported for the /modules curator page; at render time the shell filters
// this list through config/modules (see lib/moduleVisibility).
export const NAV: NavItem[] = [
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

export const CHAPTERS = [CH_BENCH, CH_1, CH_2, CH_3, CH_4, CH_5, CH_ARCADE, CH_FIELD];

/** Rail icon + short name for each chapter of the book. */
const CHAPTER_META: Record<string, { icon: ComponentType<{ className?: string }>; short: string }> = {
  [CH_BENCH]: { icon: Home, short: "The Bench" },
  [CH_1]: { icon: Atom, short: "Foundations" },
  [CH_2]: { icon: Brain, short: "The Study" },
  [CH_3]: { icon: Shapes, short: "Molecules & Reactions" },
  [CH_4]: { icon: Beaker, short: "Advanced Labs" },
  [CH_5]: { icon: ClipboardList, short: "Prove Your Craft" },
  [CH_ARCADE]: { icon: Swords, short: "The Arcade" },
  [CH_FIELD]: { icon: ScanLine, short: "Field Work" },
};

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) =>
    to === "/app" ? pathname === "/app" : pathname === to || pathname.startsWith(to + "/");
}

/** Index of the current route in the book's page order (-1 when off-book). */
function pageIndexOf(pathname: string, nav: NavItem[]): number {
  return nav.findIndex((n) =>
    n.to === "/app" ? pathname === "/app" : pathname === n.to || pathname.startsWith(n.to + "/"),
  );
}

/**
 * The Table of Contents — the book's full map, opened from the top bar or ⌘K.
 * Chapters as columns of quiet links; replaces the old always-there sidebar.
 */
function TableOfContents({ nav, onClose }: { nav: NavItem[]; onClose: () => void }) {
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
          {CHAPTERS.filter((chapter) => nav.some((n) => n.chapter === chapter)).map((chapter) => (
            <div key={chapter}>
              <p className="mb-1.5 px-1 text-[11px] uppercase tracking-[0.14em] text-parchment/50">
                {chapter}
              </p>
              <ul className="space-y-0.5">
                {nav.filter((n) => n.chapter === chapter).map((item) => {
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
 * The chapter rail — a slim floating column of rune icons, one per chapter
 * of the book. Hovering (with intent) or clicking a chapter opens its pages
 * as a flyout of alchemical orbs beside the rail. The layout stays a
 * scannable column; only the pixels are magical.
 */
function CategoryRail({
  nav,
  onOpenToc,
  onSignOut,
}: {
  nav: NavItem[];
  onOpenToc: () => void;
  onSignOut: () => void;
}) {
  const isActive = useActive();
  const [open, setOpen] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(0);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  const cancelTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };
  // Hover-intent: a small delay before the first open (so skimming the rail
  // doesn't flicker panels), instant switching once a panel is already out.
  const scheduleOpen = (chapter: string) => {
    cancelTimers();
    openTimer.current = window.setTimeout(() => setOpen(chapter), open ? 0 : 130);
  };
  // Grace period before closing, so the pointer can travel rail → panel.
  const scheduleClose = () => {
    cancelTimers();
    closeTimer.current = window.setTimeout(() => setOpen(null), 240);
  };
  useEffect(() => cancelTimers, []);

  // Centre the flyout on its chapter rune, clamped inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const btn = btnRefs.current[open];
    const panel = panelRef.current;
    if (!btn || !panel) return;
    const r = btn.getBoundingClientRect();
    const ideal = r.top + r.height / 2 - panel.offsetHeight / 2;
    setPanelTop(Math.max(12, Math.min(ideal, window.innerHeight - panel.offsetHeight - 12)));
  }, [open]);

  // Esc closes; so does clicking anywhere outside the rail + panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!railRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const pages = open ? nav.filter((n) => n.chapter === open) : [];
  const visibleChapters = CHAPTERS.filter((ch) => nav.some((n) => n.chapter === ch));

  return (
    <>
      <nav
        ref={railRef}
        data-tour="rail"
        aria-label="Chapters"
        className="glass-strong scroll-slim hidden md:flex fixed left-3 top-1/2 z-40 max-h-[calc(100vh-7rem)] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto rounded-2xl p-1.5"
        onMouseLeave={scheduleClose}
      >
        {/* Crest — home to The Bench */}
        <Link
          to="/app"
          aria-label="AlcheMix — home"
          className="group relative flex h-11 w-10 flex-shrink-0 items-center justify-center"
        >
          <img
            src="/images/logo-outline.png"
            alt=""
            className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-110"
          />
          {!open && (
            <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
              AlcheMix · Home
            </span>
          )}
        </Link>

        <div className="my-1 h-px w-6 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {visibleChapters.map((chapter) => {
          const meta = CHAPTER_META[chapter];
          const chapterActive = nav.some((n) => n.chapter === chapter && isActive(n.to));
          const isOpen = open === chapter;
          return (
            <button
              key={chapter}
              ref={(el) => {
                btnRefs.current[chapter] = el;
              }}
              onMouseEnter={() => scheduleOpen(chapter)}
              onClick={() => {
                cancelTimers();
                setOpen(isOpen ? null : chapter);
              }}
              aria-label={chapter}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-teal/10"
              style={{
                color:
                  chapterActive || isOpen
                    ? "var(--color-emerald-elixir)"
                    : "var(--color-parchment)",
                background: isOpen
                  ? "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)"
                  : undefined,
              }}
            >
              {/* Current-chapter marker on the rail's spine */}
              {chapterActive && (
                <span
                  className="absolute left-0 h-5 w-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--color-emerald-elixir), var(--color-wraith))",
                  }}
                />
              )}
              <meta.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
              {/* Name chip — slides in on hover while no flyout is out */}
              {!open && (
                <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                  {chapter}
                </span>
              )}
            </button>
          );
        })}

        <div className="my-1 h-px w-6 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {/* Foot of the rail — the whole map, for power readers */}
        <button
          onClick={() => {
            setOpen(null);
            onOpenToc();
          }}
          aria-label="Open the Table of Contents"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-parchment/70 transition-colors hover:bg-teal/10 hover:text-emerald-elixir"
        >
          <BookOpen className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
          {!open && (
            <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
              Contents · ⌘K
            </span>
          )}
        </button>

        {/* Day / night */}
        <div className="group relative flex-shrink-0">
          <ThemeToggle className="!h-10 !w-10 !rounded-xl !border-0 !bg-transparent" />
          {!open && (
            <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
              Theme
            </span>
          )}
        </div>

        {/* Leave the workshop */}
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson"
        >
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          {!open && (
            <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
              Sign out
            </span>
          )}
        </button>
      </nav>

      {/* ── Chapter flyout — the pages as a column of orbs ── */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={open}
          className="glass-strong flyout-in fixed left-[4.4rem] z-40 hidden w-60 rounded-2xl p-2 md:block"
          style={{ top: panelTop }}
          onMouseEnter={cancelTimers}
          onMouseLeave={scheduleClose}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.16em] text-parchment/55">
            {open}
          </p>
          {/* Key on the chapter so switching re-runs the materialise stagger */}
          <ul key={open} className="space-y-0.5">
            {pages.map((item, i) => {
              const active = isActive(item.to);
              return (
                <li key={item.to} className="orb-in" style={{ animationDelay: `${i * 24}ms` }}>
                  <Link
                    to={item.to as any}
                    role="menuitem"
                    onClick={() => setOpen(null)}
                    className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-teal/8"
                    style={{
                      color: active ? "var(--color-emerald-elixir)" : "var(--color-spectral)",
                      background: active
                        ? "color-mix(in oklab, var(--color-emerald-elixir) 8%, transparent)"
                        : undefined,
                    }}
                  >
                    <span className={`orb-rune h-9 w-9 ${active ? "orb-rune-active" : ""}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * App shell for the student area — the app as a book.
 * Desktop: the floating chapter rail (crest, chapter orbs, contents, theme,
 * sign-out) + a bottom pager that flips pages in order — no top bar.
 * Mobile: top bar + bottom tab nav with the chapter sheet.
 */
export function StudentShell({ title, children }: { title?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const isActive = useActive();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  // Live module visibility — the curator's config/modules doc filters every
  // nav surface (rail, contents, pager, mobile sheet) in real time.
  const { hidden } = useHiddenModules();
  // Home stays no matter what the config doc says — the shell needs an anchor.
  const nav = NAV.filter((n) => n.to === "/app" || !hidden.has(n.to));
  const pageIndex = pageIndexOf(pathname, nav);
  const prevPage = pageIndex > 0 ? nav[pageIndex - 1] : null;
  const nextPage = pageIndex >= 0 && pageIndex < nav.length - 1 ? nav[pageIndex + 1] : null;
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
  const primary = nav.filter((n) => n.primary);
  const moreItems = nav.filter((n) => !n.primary);
  const moreActive = moreItems.some((n) => !n.disabled && isActive(n.to));

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      {/* Ambient colour under the glass */}
      <div className="bg-aurora pointer-events-none fixed inset-0 z-0" />

      {/* ── Desktop chrome — the chapter rail carries everything ── */}
      <CategoryRail nav={nav} onOpenToc={() => setTocOpen(true)} onSignOut={handleSignOut} />

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

      {/* ── Content ── */}
      <main className="relative z-10">
        <div className="w-full px-5 pt-20 pb-28 md:pl-24 md:pr-8 md:pt-10 md:pb-24">
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
            <span className="text-xs whitespace-nowrap">{nav[pageIndex].label}</span>
            <span className="text-xs text-parchment/45 whitespace-nowrap">
              {pageIndex + 1}/{nav.length}
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
      {tocOpen && <TableOfContents nav={nav} onClose={() => setTocOpen(false)} />}

      {/* ── First-login walkthrough — offer modal + page-to-page tour card ── */}
      <Walkthrough />

      {/* ── Ask the Alchemist — the mentor, on every student page ── */}
      <AskAlchemist context={title} />

      {/* ── Mobile chapter sheet — the whole book, chapters of orbs ── */}
      {moreOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="glass-strong scroll-slim sheet-up fixed bottom-[5rem] inset-x-3 z-50 max-h-[70vh] overflow-y-auto rounded-2xl p-2.5 pb-3">
            {CHAPTERS.map((chapter) => {
              const pages = nav.filter((n) => n.chapter === chapter);
              if (pages.length === 0) return null;
              return (
                <div key={chapter} className="mb-1.5">
                  <p className="px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-parchment/55">
                    {chapter}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                    {pages.map((item, i) => {
                      const active = !item.disabled && isActive(item.to);
                      const inner = (
                        <span
                          className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                          style={{
                            color: item.disabled
                              ? "color-mix(in oklab, var(--color-parchment) 55%, transparent)"
                              : active
                                ? "var(--color-emerald-elixir)"
                                : "var(--color-spectral)",
                            background: active
                              ? "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)"
                              : undefined,
                          }}
                        >
                          <span className={`orb-rune h-8 w-8 ${active ? "orb-rune-active" : ""}`}>
                            <item.icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 truncate text-[12px] font-medium">
                            {item.label}
                          </span>
                        </span>
                      );
                      return (
                        <li
                          key={item.to}
                          className="orb-in"
                          style={{ animationDelay: `${i * 18}ms` }}
                        >
                          {item.disabled ? (
                            <div className="opacity-70" title="Needs AI setup">
                              {inner}
                            </div>
                          ) : (
                            <Link to={item.to as any} onClick={() => setMoreOpen(false)}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav — floating glass ── */}
      <nav
        data-tour="tabs"
        className="glass-strong md:hidden fixed bottom-2 inset-x-2 z-50 flex items-stretch justify-around h-16 rounded-2xl overflow-hidden"
      >
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
