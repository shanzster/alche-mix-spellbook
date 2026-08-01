import type { ComponentType, ReactNode } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Themed header banner for student screens — a gradient/glow panel with an
 * accent icon, eyebrow, title and subtitle, plus a subtle sun (light) / moon
 * (dark) motif. Gives every page identity without adding clutter.
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
    <header
      className="relative overflow-hidden rounded-2xl mb-8 px-5 py-5 md:px-7 md:py-6"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 16%, transparent), color-mix(in oklab, var(--color-slate-sunken) 72%, transparent))`,
        border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
        boxShadow: `0 10px 44px -26px color-mix(in oklab, ${accent} 75%, transparent)`,
      }}
    >
      {/* soft glow blob */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full blur-3xl" style={{ background: `color-mix(in oklab, ${accent} 20%, transparent)` }} />
      {/* theme motif — sun by day, moon by night */}
      <Sun className="pointer-events-none absolute right-5 top-4 h-16 w-16 opacity-[0.12] block dark:hidden" style={{ color: accent }} />
      <Moon className="pointer-events-none absolute right-5 top-4 h-16 w-16 opacity-[0.16] hidden dark:block" style={{ color: accent }} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, border: `1px solid color-mix(in oklab, ${accent} 45%, transparent)`, color: accent, boxShadow: `0 0 22px -6px ${accent}` }}
            >
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div>
            {eyebrow && <p className="text-[10px] tracking-[0.3em] uppercase mb-1 font-display" style={{ color: accent }}>{eyebrow}</p>}
            <h1 className="font-display text-2xl md:text-3xl leading-tight" style={{ textShadow: `0 0 26px color-mix(in oklab, ${accent} 40%, transparent)` }}>{title}</h1>
            {subtitle && <p className="text-parchment text-sm mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="relative flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}
