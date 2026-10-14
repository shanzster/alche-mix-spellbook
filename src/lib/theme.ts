import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const EVENT = "alchemix-theme-change";

/** Read the theme currently applied to <html> (set by the no-flash script). */
export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Where the theme ripple grows from (viewport px) — usually the toggle. */
export interface ThemeOrigin {
  x: number;
  y: number;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage may be unavailable (private mode) — theme still applies for the session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

/**
 * Apply a theme: toggle the <html> class, persist it, and notify listeners.
 * When the browser supports the View Transitions API (and the user hasn't
 * asked for reduced motion), the new theme FILLS the page as a growing
 * circle from `origin` instead of switching instantly.
 */
export function setTheme(theme: Theme, origin?: ThemeOrigin) {
  if (typeof document === "undefined") return;

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished?: Promise<void> } | undefined;
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) {
    applyTheme(theme);
    return;
  }

  const root = document.documentElement;
  root.style.setProperty("--theme-fill-x", `${origin?.x ?? window.innerWidth - 40}px`);
  root.style.setProperty("--theme-fill-y", `${origin?.y ?? 40}px`);
  // Flag the ripple so per-frame animators (hero parallax) hold still —
  // live mutations during the capture make the transition stutter.
  root.setAttribute("data-theme-ripple", "");
  const clear = () => root.removeAttribute("data-theme-ripple");
  const vt = doc.startViewTransition(() => applyTheme(theme));
  if (vt?.finished) vt.finished.then(clear, clear);
  else setTimeout(clear, 700);
}

export function toggleTheme(origin?: ThemeOrigin) {
  setTheme(getTheme() === "dark" ? "light" : "dark", origin);
}

/**
 * React hook — returns the active theme and a toggle.
 * Stays in sync across every mounted toggle (and other tabs) via events.
 */
export function useTheme(): { theme: Theme; toggle: (origin?: ThemeOrigin) => void; setTheme: (t: Theme, origin?: ThemeOrigin) => void } {
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
