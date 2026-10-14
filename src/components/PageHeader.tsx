import type { ComponentType, ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";

/**
 * Quiet header for student screens — a flat, panel-free heading with a small
 * accent icon chip, a light eyebrow, title and subtitle. Whitespace, not
 * ornament, gives the page its breathing room.
 *
 * Every page wearing this header also gets Back + Home controls (adviser
 * item 7: there was no way to return to the previous screen in the demo).
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  accent = "var(--color-emerald-elixir)",
  right,
  home = "/app",
  hideNav = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
  right?: ReactNode;
  /** Where the Home control leads (defaults to the student hub). */
  home?: string;
  /** Hide the Back/Home pills — e.g. on top-level console pages that ARE home. */
  hideNav?: boolean;
}) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: home });
  };
  const navPill =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-parchment transition hover:-translate-y-px hover:text-spectral";
  const navPillStyle = {
    background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
    border: "1px solid var(--color-border)",
  } as const;

  return (
    <>
    {!hideNav && (
      <div className="mb-4 flex items-center gap-2" data-tour="page-nav">
        <button onClick={goBack} className={navPill} style={navPillStyle} aria-label="Go back">
          ← Back
        </button>
        <Link to={home} className={navPill} style={navPillStyle} aria-label="Go to the hub">
          ⌂ Home
        </Link>
      </div>
    )}
    <header
      data-tour="page-header"
      className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3.5">
        {Icon && (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: `color-mix(in oklab, ${accent} 10%, transparent)`,
              border: `1px solid color-mix(in oklab, ${accent} 25%, transparent)`,
              color: accent,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          {eyebrow && (
            <p
              className="font-ui text-[11px] font-medium tracking-[0.14em] uppercase mb-1 opacity-70"
              style={{ color: accent }}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl md:text-3xl leading-tight">{title}</h1>
          {subtitle && (
            <p className="font-serif text-parchment/80 text-[15px] mt-1.5 max-w-xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
    </>
  );
}
