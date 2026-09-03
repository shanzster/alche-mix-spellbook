import type { ComponentType, ReactNode } from "react";

/**
 * Quiet header for student screens — a flat, panel-free heading with a small
 * accent icon chip, a light eyebrow, title and subtitle. Whitespace, not
 * ornament, gives the page its breathing room.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  accent = "var(--color-emerald-elixir)",
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-parchment/80 text-sm mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
  );
}
