import { Link } from "@tanstack/react-router";
import { useRef, type ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The shared chrome for every auth door (login, signup, educator, school).
 * A two-panel card: the hero character stands over the theme-aware backdrop on
 * the left with a tagline; the form (passed as `children`) fills the right.
 * Collapses to a stacked layout — art banner on top, form below — on mobile.
 */
export function AuthLayout({
  sideTitle,
  sideText,
  children,
}: {
  sideTitle: string;
  sideText: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Light mouse-parallax: the figure drifts WITH the cursor, the backdrop leans
  // the other way for depth. Disabled under prefers-reduced-motion.
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (figureRef.current) figureRef.current.style.transform = `translate3d(${px * 22}px, ${py * 14}px, 0)`;
    if (backdropRef.current) backdropRef.current.style.transform = `scale(1.08) translate3d(${px * -12}px, ${py * -8}px, 0)`;
  };
  const onLeave = () => {
    if (figureRef.current) figureRef.current.style.transform = "";
    if (backdropRef.current) backdropRef.current.style.transform = "scale(1.08)";
  };

  return (
    <div className="grimoire-skin relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-spectral">
      {/* Page backdrop behind the card (theme-aware), veiled for depth. */}
      <div aria-hidden className="auth-backdrop fixed inset-0 z-0" />
      <div aria-hidden className="fixed inset-0 z-0"
        style={{ background: "color-mix(in oklab, var(--color-mist) 68%, transparent)" }} />

      <div
        className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl md:max-h-[92vh] md:grid-cols-2"
        style={{
          background: "color-mix(in oklab, var(--color-card) 82%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)",
          boxShadow: "0 40px 100px -35px rgb(0 0 0 / 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* ── LEFT — character over the backdrop (mouse-parallax) ── */}
        <div ref={panelRef} onPointerMove={onMove} onPointerLeave={onLeave}
          className="relative h-44 overflow-hidden md:h-auto md:min-h-[600px]">
          {/* backdrop (theme-aware) — leans away from the cursor */}
          <div ref={backdropRef} className="absolute inset-0 will-change-transform transition-transform duration-300 ease-out" style={{ transform: "scale(1.08)" }}>
            <img src="/real-app-hero-page/hero-backdrop-light.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover dark:hidden" />
            <img src="/real-app-hero-page/hero-backdrop-dark.webp" alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover dark:block" />
          </div>
          {/* Character cutout (theme-aware): whole figure, bottom-anchored with
              headroom; drifts WITH the cursor. */}
          <div ref={figureRef} className="absolute inset-0 will-change-transform transition-transform duration-300 ease-out">
            <img src="/real-app-hero-page/cut-figure-apprentice-light.webp" alt="The apprentice" className="absolute inset-0 h-full w-full object-contain object-bottom pt-6 dark:hidden" />
            <img src="/real-app-hero-page/cut-figure-conjurer-dark.webp" alt="The Alchemist" className="absolute inset-0 hidden h-full w-full object-contain object-bottom pt-6 dark:block" />
          </div>
          {/* legibility overlay for the tagline */}
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to top, rgb(0 0 0 / 0.78), rgb(0 0 0 / 0.1) 55%, transparent)" }} />
          {/* tagline */}
          <div className="absolute inset-x-5 bottom-5">
            <h2 className="font-display text-2xl leading-tight text-white drop-shadow-lg md:text-4xl">{sideTitle}</h2>
            <p className="mt-1 font-serif text-sm italic text-white/85">{sideText}</p>
          </div>
        </div>

        {/* ── RIGHT — the form ── */}
        <div className="no-scrollbar relative overflow-y-auto p-6 sm:p-8 md:max-h-[92vh] md:p-10">
          {/* Compass seal watermark behind the form (DESIGN_DIRECTION §4). */}
          <img src="/dark-alchemy-vibe/seal-compass.webp" alt="" aria-hidden
            className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 object-contain opacity-[0.07]" />
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            <ThemeToggle className="!h-9 !w-9" />
            <Link to="/" aria-label="Back to home"
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-parchment/60 transition hover:text-spectral"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)", border: "1px solid var(--color-border)" }}>
              ×
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
