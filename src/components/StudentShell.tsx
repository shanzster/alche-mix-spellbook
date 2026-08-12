import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, Atom, Grid3x3, BookMarked, Scale, Gauge, ClipboardList, LogOut, MoreHorizontal, ScanSearch, Brain,
  Shapes, ShieldAlert, Beaker, Radiation, ScanLine,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { signOut } from "../lib/auth";
import { aiPing } from "../lib/ai";
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
  primary?: boolean;   // shown in the mobile bottom bar
  disabled?: boolean;  // e.g. gated on AI setup
  hidden?: boolean;    // temporarily off the nav (routes stay reachable by URL)
}

const NAV_ALL: NavItem[] = [
  { to: "/app",               label: "Home",             icon: Home,          primary: true },
  { to: "/study",             label: "The Study",        icon: Brain,         primary: true, hidden: true },
  { to: "/cards",             label: "Grimoire",         icon: BookMarked },
  { to: "/atomic-builder",    label: "Atomic Builder",   icon: Atom,          primary: true },
  { to: "/periodic-table",    label: "Periodic Table",   icon: Grid3x3,       primary: true },
  { to: "/quiz",              label: "3D Quiz",          icon: ClipboardList, hidden: true },
  { to: "/scavenger",         label: "Scavenger Hunt",   icon: ScanSearch,    primary: true },
  { to: "/scanner",           label: "AR Scanner",       icon: ScanLine,      primary: true },
  { to: "/molecules",         label: "Molecule Shapes",  icon: Shapes,        hidden: true },
  { to: "/reactions",         label: "Reaction Theatre", icon: Atom,          hidden: true },
  { to: "/titration",         label: "Titration Lab",    icon: Beaker,        hidden: true },
  { to: "/decay",             label: "Radioactive Decay",icon: Radiation,     hidden: true },
  { to: "/lab-safety",        label: "Lab Safety",       icon: ShieldAlert,   hidden: true },
  { to: "/equation-balancer", label: "Equation Balancer",icon: Scale,         hidden: true },
  { to: "/gas-laws",          label: "Gas Laws",         icon: Gauge,         hidden: true },
];

// Only element-focused modules are shown for now; flip `hidden` above to bring one back.
const NAV = NAV_ALL.filter((n) => !n.hidden);

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) => (to === "/app" ? pathname === "/app" : pathname === to || pathname.startsWith(to + "/"));
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

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };
  const primary = NAV.filter((n) => n.primary);
  const moreItems = NAV.filter((n) => !n.primary);
  const moreActive = moreItems.some((n) => !n.disabled && isActive(n.to));

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col px-4 py-6 backdrop-blur-xl border-r overflow-hidden"
        style={{
          background: "linear-gradient(180deg, color-mix(in oklab, var(--color-slate-sunken) 92%, transparent), color-mix(in oklab, var(--color-mist) 78%, transparent))",
          borderColor: "var(--color-border)",
          boxShadow: "1px 0 40px -20px color-mix(in oklab, var(--color-wraith) 40%, transparent)",
        }}
      >
        {/* decorative glow at the top of the rail */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)" }} />

        <Link to="/" className="relative flex items-center gap-2.5 px-2 mb-8">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--color-emerald-elixir) 60%, transparent))" }} />
          <span className="font-display text-lg tracking-[0.15em]">AlcheMix</span>
        </Link>

        <nav className="relative flex-1 space-y-1">
          {NAV.map((item) => {
            const active = !item.disabled && isActive(item.to);
            const Inner = (
              <span
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200"
                style={{
                  color: item.disabled ? "color-mix(in oklab, var(--color-parchment) 55%, transparent)"
                    : active ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
                  background: active ? "linear-gradient(90deg, color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent), transparent)" : "transparent",
                  boxShadow: active ? "inset 3px 0 0 var(--color-emerald-elixir), 0 0 22px -12px var(--color-emerald-elixir)" : "none",
                }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0 transition-colors"
                  style={active ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 16%, transparent)" } : undefined}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="font-display tracking-[0.06em]">{item.label}</span>
                {item.disabled && <span className="ml-auto text-[8px] tracking-[0.15em] uppercase text-gold">AI</span>}
              </span>
            );
            return item.disabled ? (
              <div key={item.label} className="cursor-not-allowed opacity-80" title="Needs AI setup">{Inner}</div>
            ) : (
              <Link key={item.label} to={item.to as any} className={`block rounded-lg ${active ? "" : "hover:bg-teal/5 hover:translate-x-0.5 transition-transform"}`}>{Inner}</Link>
            );
          })}
        </nav>

        {/* Footer: controls */}
        <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ border: "1px solid var(--color-border)" }}>
          <ThemeToggle className="!h-8 !w-8" />
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 text-[11px] text-parchment/70 hover:text-crimson transition" aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between h-14 px-4 backdrop-blur-xl border-b"
        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)", borderColor: "var(--color-border)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-sm tracking-[0.12em] truncate max-w-[46vw]">{title ?? "AlcheMix"}</span>
        </Link>
        <ThemeToggle className="!h-8 !w-8" />
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 md:pl-60">
        <div className="mx-auto max-w-5xl px-5 pt-20 pb-28 md:pt-10 md:pb-16 md:px-8">
          {children}
        </div>
      </main>

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && moreItems.length > 0 && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-[4.5rem] inset-x-3 z-50 rounded-2xl p-2 backdrop-blur-xl"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 96%, transparent)", border: "1px solid var(--color-border)", boxShadow: "0 -10px 40px -12px color-mix(in oklab, var(--color-wraith) 45%, transparent)" }}>
            <p className="px-3 py-2 text-[10px] tracking-[0.25em] uppercase text-parchment/50">More modules</p>
            {moreItems.map((item) => {
              const active = !item.disabled && isActive(item.to);
              const inner = (
                <span className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm"
                  style={{
                    color: item.disabled ? "color-mix(in oklab, var(--color-parchment) 55%, transparent)" : active ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
                    background: active ? "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)" : "transparent",
                  }}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="font-display tracking-[0.06em]">{item.label}</span>
                  {item.disabled && <span className="ml-auto text-[8px] tracking-[0.15em] uppercase text-gold">AI</span>}
                </span>
              );
              return item.disabled ? (
                <div key={item.label} className="opacity-70" title="Needs AI setup">{inner}</div>
              ) : (
                <Link key={item.label} to={item.to as any} onClick={() => setMoreOpen(false)}>{inner}</Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch justify-around h-16 backdrop-blur-xl border-t"
        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)", borderColor: "var(--color-border)" }}
      >
        {primary.map((item) => {
          const active = isActive(item.to);
          return (
            <Link key={item.label} to={item.to as any} onClick={() => setMoreOpen(false)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: "var(--color-emerald-elixir)", boxShadow: "0 0 10px 1px var(--color-emerald-elixir)" }} />}
              <span className="transition-transform" style={active ? { filter: "drop-shadow(0 0 6px var(--color-emerald-elixir))", transform: "translateY(-1px)" } : undefined}>
                <item.icon className="h-5 w-5" />
              </span>
              <span className="text-[9px] tracking-[0.05em] font-display">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {/* More — opens the overflow sheet (only when something overflows) */}
        {moreItems.length > 0 && (
          <button onClick={() => setMoreOpen((o) => !o)}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
            style={{ color: moreOpen || moreActive ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}
            aria-label="More modules" aria-expanded={moreOpen}>
            {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: "var(--color-emerald-elixir)", boxShadow: "0 0 10px 1px var(--color-emerald-elixir)" }} />}
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[9px] tracking-[0.05em] font-display">More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
