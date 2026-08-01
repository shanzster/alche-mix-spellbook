import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/**
 * Sun / Moon theme toggle.
 * ☀️ = switch to light (daylight alchemy) · 🌙 = switch to dark (night-sky magic).
 * Shows the icon of the theme you'd switch TO.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`group flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl transition-all duration-200 hover:scale-105 ${className}`}
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
        border: "1px solid var(--color-border)",
        color: isDark ? "var(--color-gold)" : "var(--color-emerald-elixir)",
      }}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
