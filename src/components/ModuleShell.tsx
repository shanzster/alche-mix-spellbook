import type { ComponentType, ReactNode } from "react";
import { StudentShell } from "./StudentShell";
import { PageHeader } from "./PageHeader";

/**
 * Header wrapper for student lab modules. Renders inside the StudentShell app
 * layout and shows a themed PageHeader banner with an accent icon and eyebrow.
 */
export function ModuleShell({
  title,
  subtitle,
  eyebrow,
  icon,
  accent = "var(--color-emerald-elixir)",
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <StudentShell title={title}>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} icon={icon} accent={accent} right={right} />
      {children}
    </StudentShell>
  );
}
