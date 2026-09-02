/**
 * Platform detection — tells the app which "side" it is running on:
 *
 *  - **Mobile / PWA side** (phone, tablet, or the installed app): the capture
 *    companion. Camera experiences (AR Scanner, Scavenger) live here, and
 *    knowledge is shown as a *glimpse* that hands off to the website.
 *  - **Website side** (desktop browser): the full learning system — deep
 *    element pages, the Grimoire Guide, quizzes and simulations.
 *
 * Detection is client-only (SSR renders nothing platform-specific until
 * `ready` is true):
 *  - PWA:    `(display-mode: standalone)` media query, or iOS `navigator.standalone`.
 *  - Mobile: user-agent (Android/iPhone/iPad, incl. iPadOS masquerading as Mac
 *    with touch) or a coarse pointer with touch support.
 */
import { useEffect, useState } from "react";

export interface Platform {
  /** False during SSR / first paint, true once detection has run. */
  ready: boolean;
  /** Running as an installed PWA (standalone display mode). */
  isStandalone: boolean;
  /** Phone or tablet browser. */
  isMobile: boolean;
  /** AR & camera experiences unlock here: mobile browser OR installed PWA. */
  arCapable: boolean;
}

const NOT_READY: Platform = {
  ready: false,
  isStandalone: false,
  isMobile: false,
  arCapable: false,
};

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return NOT_READY;

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const ua = navigator.userAgent;
  const uaMobile =
    /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua) ||
    // iPadOS 13+ reports itself as a Mac but is the only "Mac" with multi-touch.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const coarseTouch =
    window.matchMedia?.("(pointer: coarse)").matches && navigator.maxTouchPoints > 0;

  const isMobile = uaMobile || coarseTouch;
  return { ready: true, isStandalone, isMobile, arCapable: isMobile || isStandalone };
}

/** Live platform state; re-detects if the app is launched into standalone mode. */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(NOT_READY);

  useEffect(() => {
    setPlatform(detectPlatform());
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setPlatform(detectPlatform());
    mql?.addEventListener?.("change", onChange);
    return () => mql?.removeEventListener?.("change", onChange);
  }, []);

  return platform;
}

/** The website origin to hand mobile users off to (uses the current deploy's origin). */
export function siteUrl(path = "/"): string {
  if (typeof window === "undefined") return path;
  return window.location.origin + path;
}
