import type { ComponentType, ReactNode } from "react";
import { Compass } from "lucide-react";
import { StudentShell } from "./StudentShell";
import { PageHeader } from "./PageHeader";

/**
 * Header wrapper for student lab modules. Renders inside the StudentShell app
 * layout and shows a quiet PageHeader with an accent icon and eyebrow.
 *
 * `guide` — pass 2–4 short "what to do here" steps and they render as a
 * numbered strip under the header, so a student entering the page is never
 * left wondering where to start. Write each step as action → what it teaches.
 */
export function ModuleShell({
  title,
  subtitle,
  eyebrow,
  icon,
  accent = "var(--color-emerald-elixir)",
  right,
  guide,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
  right?: ReactNode;
  guide?: string[];
  children: ReactNode;
}) {
  return (
    <StudentShell title={title}>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} icon={icon} accent={accent} right={right} />
      {guide && guide.length > 0 && (
        <div className="glass -mt-4 mb-8 rounded-2xl px-5 py-4">
          <p className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-gold">
            <Compass className="h-3.5 w-3.5" /> What to do here
          </p>
          <ol className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            {guide.map((g, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-parchment">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)",
                    color: "var(--color-emerald-elixir)",
                  }}
                >
                  {i + 1}
                </span>
                <span>{g}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {children}
    </StudentShell>
  );
}
