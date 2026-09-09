import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { CHAPTERS, NAV } from "../components/StudentShell";
import { MANUAL_HIDDEN_ROUTES, setModuleHidden, useHiddenModules } from "../lib/moduleVisibility";

/**
 * The Curator — a public switchboard for module visibility.
 *
 * Every module of the book, as a chaptered checklist. Checked = visible in
 * the apprentice navigation (rail, contents, pager, mobile). State lives in
 * Firestore `config/modules` and every open student shell updates live.
 * Anyone can view; only the seeded admin's writes are accepted by the rules.
 */
export const Route = createFileRoute("/modules")({
  component: Curator,
});

// Home is the anchor of the whole shell — never hideable.
const LOCKED = new Set(["/app"]);

function Curator() {
  const { hidden, loading } = useHiddenModules();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (to: string, hide: boolean) => {
    setError("");
    setBusy(to);
    const ok = await setModuleHidden(to, hide);
    if (!ok) {
      setError(
        "Couldn't save — visibility can only be changed by the admin account. Sign in as the admin in this browser, then try again.",
      );
    }
    setBusy(null);
  };

  const visibleCount = NAV.length - hidden.size;

  return (
    <div className="bg-arcane min-h-screen px-4 py-10 text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="orb-rune orb-rune-active mx-auto flex h-14 w-14 text-emerald-elixir">
            <BookOpen className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl">The Curator</h1>
          <p className="mx-auto mt-2 max-w-md font-serif text-[15px] leading-relaxed text-parchment/80">
            Tick a module to show it in the apprentices' navigation; untick to hide it.
            Changes save to the server and update every open session live.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-parchment/60">
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-elixir" />
                Live · {visibleCount}/{NAV.length} modules visible
              </>
            )}
          </p>
        </div>

        {error && (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
          </p>
        )}

        <div className="space-y-4">
          {CHAPTERS.map((chapter) => {
            const pages = NAV.filter((n) => n.chapter === chapter);
            if (pages.length === 0) return null;
            const shown = pages.filter((p) => !hidden.has(p.to)).length;
            return (
              <div key={chapter} className="glass rounded-2xl p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-parchment/55">
                    {chapter}
                  </p>
                  <span className="text-[11px] tabular-nums text-parchment/45">
                    {shown}/{pages.length} shown
                  </span>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {pages.map((item) => {
                    const isHidden = hidden.has(item.to);
                    const codeHidden = MANUAL_HIDDEN_ROUTES.has(item.to);
                    const locked = LOCKED.has(item.to) || codeHidden;
                    return (
                      <li key={item.to}>
                        <label
                          className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                            locked ? "opacity-60" : "cursor-pointer hover:bg-teal/8"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!isHidden}
                            disabled={locked || busy === item.to}
                            onChange={(e) => toggle(item.to, !e.target.checked)}
                            className="h-4 w-4 flex-shrink-0 rounded accent-[var(--color-emerald-elixir)]"
                            aria-label={`Show ${item.label} in navigation`}
                          />
                          <span className={`orb-rune h-8 w-8 ${isHidden ? "" : "orb-rune-active"}`}>
                            <item.icon className="h-3.5 w-3.5" />
                          </span>
                          <span
                            className="min-w-0 flex-1 truncate text-sm font-medium"
                            style={{
                              color: isHidden
                                ? "color-mix(in oklab, var(--color-parchment) 60%, transparent)"
                                : "var(--color-spectral)",
                            }}
                          >
                            {item.label}
                          </span>
                          {busy === item.to ? (
                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-parchment/50" />
                          ) : isHidden ? (
                            <EyeOff className="h-3.5 w-3.5 flex-shrink-0 text-parchment/40" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 flex-shrink-0 text-emerald-elixir/70" />
                          )}
                          {locked && (
                            <span className="flex-shrink-0 text-[9px] uppercase tracking-[0.15em] text-parchment/45">
                              {codeHidden ? "hidden in code" : "always on"}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center">
          <Link
            to="/app"
            className="text-xs uppercase tracking-[0.15em] text-parchment/40 transition hover:text-parchment/70"
          >
            ← Back to the bench
          </Link>
        </p>
      </div>
    </div>
  );
}
