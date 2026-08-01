import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const EVENT = "alchemix-theme-change";

/** Read the theme currently applied to <html> (set by the no-flash script). */
export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Apply a theme: toggle the <html> class, persist it, and notify listeners. */
export function setTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage may be unavailable (private mode) — theme still applies for the session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

/**
 * React hook — returns the active theme and a toggle.
 * Stays in sync across every mounted toggle (and other tabs) via events.
 */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getTheme());
    const onChange = () => setThemeState(getTheme());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return { theme, toggle: toggleTheme, setTheme };
}

/**
 * Inline script string injected into <head> so the correct theme is applied
 * before first paint (no flash of the wrong theme). Precedence:
 * saved choice → system preference → dark (the app's default mood).
 */
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();`;
