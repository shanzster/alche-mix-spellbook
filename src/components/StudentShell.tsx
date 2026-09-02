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
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
  primary?: boolean; // shown in the mobile bottom bar
  disabled?: boolean; // e.g. gated on AI setup
}

// Every module, in the Grimoire Guide's recommended learning order.
// `primary` picks the mobile bottom-bar tabs: the phone is the capture
// companion (Grimoire + camera experiences); everything else sits under More.
const NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, primary: true },
  { to: "/cards", label: "Grimoire", icon: BookMarked, primary: true },
  { to: "/guide", label: "The Guide", icon: Compass },
  { to: "/starters", label: "Starters for Ten", icon: Flame },
  { to: "/assignments", label: "Assignments", icon: ListChecks },
  { to: "/lab-safety", label: "Lab Safety", icon: ShieldAlert },
  { to: "/atomic-builder", label: "Atomic Builder", icon: Atom },
  { to: "/periodic-table", label: "Periodic Table", icon: Grid3x3 },
  { to: "/states", label: "States of Matter", icon: Thermometer },
  { to: "/study", label: "The Study", icon: Brain },
  { to: "/molecules", label: "Molecule Shapes", icon: Shapes },
  { to: "/forces", label: "Invisible Bonds", icon: Magnet },
  { to: "/reactions", label: "Reaction Theatre", icon: Atom },
  { to: "/equation-balancer", label: "Equation Balancer", icon: Scale },
  { to: "/codex", label: "Compound Codex", icon: FlaskConical },
  { to: "/gas-laws", label: "Gas Laws", icon: Gauge },
  { to: "/solutions", label: "Elixir Bench", icon: Droplets },
  { to: "/thermo", label: "Cauldron of Heat", icon: Coffee },
  { to: "/rates", label: "Reaction Rates", icon: Activity },
  { to: "/equilibrium", label: "Equilibrium", icon: RefreshCw },
  { to: "/electro", label: "Voltaic Forge", icon: Zap },
  { to: "/titration", label: "Titration Lab", icon: Beaker },
  { to: "/decay", label: "Radioactive Decay", icon: Radiation },
  { to: "/quiz", label: "3D Quiz", icon: ClipboardList },
  // The Arcade — games & rewards, listed after the learning modules
  { to: "/duel", label: "Duel", icon: Swords },
  { to: "/duels", label: "Class Duels", icon: Swords },
  { to: "/table-game", label: "Placement Trials", icon: Crosshair },
  { to: "/leaderboard", label: "Hall of Records", icon: Trophy },
  { to: "/shop", label: "The Emporium", icon: Store },
  { to: "/scanner", label: "AR Scanner", icon: ScanLine, primary: true },
  { to: "/scavenger", label: "Scavenger Hunt", icon: ScanSearch, primary: true },
];

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) =>
    to === "/app" ? pathname === "/app" : pathname === to || pathname.startsWith(to + "/");
}

/**
 * App shell for the student area.
 * Desktop: persistent left sidebar. Mobile: top bar + bottom tab nav.
 */
export function StudentShell({ title, children }: { title?: string; children: ReactNode }) {
  const navigate = useNavigate();
  const isActive = useActive();
  const [moreOpen, setMoreOpen] = useState(false);
  useAIVerdictLog();

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

      {/* ── Desktop sidebar — floating glass rail ── */}
      <aside className="glass-strong hidden md:flex fixed inset-y-3 left-3 z-40 w-60 flex-col rounded-2xl px-4 py-5 overflow-hidden">
        <Link to="/" className="relative flex items-center gap-2.5 px-2 mb-8">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg tracking-[0.15em]">AlcheMix</span>
        </Link>

        <nav className="relative flex-1 min-h-0 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = !item.disabled && isActive(item.to);
            const Inner = (
              <span
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors"
                style={{
                  color: item.disabled
                    ? "color-mix(in oklab, var(--color-parchment) 55%, transparent)"
                    : active
                      ? "var(--color-emerald-elixir)"
                      : "var(--color-parchment)",
                  background: active
                    ? "color-mix(in oklab, var(--color-emerald-elixir) 8%, transparent)"
                    : "transparent",
                }}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-display tracking-[0.04em]">{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-[8px] tracking-[0.15em] uppercase text-gold">
                    AI
                  </span>
                )}
              </span>
            );
            return item.disabled ? (
              <div
                key={item.label}
                className="cursor-not-allowed opacity-80"
                title="Needs AI setup"
              >
                {Inner}
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.to as any}
                className={`block rounded-lg ${active ? "" : "hover:bg-teal/5"}`}
              >
                {Inner}
              </Link>
            );
          })}
        </nav>

        {/* Footer: controls */}
        <div
          className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <ThemeToggle className="!h-8 !w-8" />
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-[11px] text-parchment/70 hover:text-crimson transition"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar — floating glass ── */}
      <header className="glass-strong md:hidden fixed top-2 inset-x-2 z-40 flex items-center justify-between h-14 px-4 rounded-2xl">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-sm tracking-[0.12em] truncate max-w-[46vw]">
            {title ?? "AlcheMix"}
          </span>
        </Link>
        <ThemeToggle className="!h-8 !w-8" />
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 md:pl-[16.75rem]">
        <div className="mx-auto max-w-7xl px-5 pt-20 pb-28 md:pt-8 md:pb-16 md:px-8 lg:px-10">
          {children}
        </div>
      </main>

      {/* ── Ask the Alchemist — the mentor, on every student page ── */}
      <AskAlchemist context={title} />

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && moreItems.length > 0 && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="glass-strong fixed bottom-[5rem] inset-x-3 z-50 rounded-2xl p-2">
            <p className="px-3 py-2 text-[10px] tracking-[0.25em] uppercase text-parchment/50">
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
                  <span className="font-display tracking-[0.06em]">{item.label}</span>
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
              <span className="text-[9px] tracking-[0.05em] font-display">
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
            <span className="text-[9px] tracking-[0.05em] font-display">More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
