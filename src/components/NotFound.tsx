import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArcaneField } from "./ArcaneField";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The Lost Transmutation — AlcheMix's custom 404. Wears the full hero language:
 * the theme-aware backdrop, orbiting arcane orbs, a faded conjurer figure, and
 * mouse-parallax crystal gems drifting around a giant gold "4 ✦ 4" where the
 * astrolabe seal stands in for the 0. Falls back to a still scene under
 * prefers-reduced-motion.
 */

// Floating crystals: the hero's flat gem art, scattered with a parallax depth.
const GEMS = [
  { src: "/hero/gem-01.webp", className: "left-[8%] top-[18%] w-24 sm:w-32", depth: 26, spin: 34 },
  { src: "/hero/gem-02.webp", className: "right-[10%] top-[14%] w-20 sm:w-28", depth: -34, spin: 42 },
  { src: "/hero/gem-03.webp", className: "left-[14%] bottom-[16%] w-16 sm:w-24", depth: 18, spin: 50 },
  { src: "/hero/gem-04.webp", className: "right-[12%] bottom-[20%] w-24 sm:w-36", depth: -22, spin: 38 },
  { src: "/hero/gem-01.webp", className: "left-[46%] top-[6%] w-12 sm:w-16", depth: 44, spin: 28 },
  { src: "/hero/gem-02.webp", className: "right-[30%] bottom-[8%] w-12 sm:w-16", depth: -44, spin: 46 },
];

export function NotFound() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || !rootRef.current) return;
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    rootRef.current.style.setProperty("--mx", nx.toFixed(3));
    rootRef.current.style.setProperty("--my", ny.toFixed(3));
  };
  const onLeave = () => {
    rootRef.current?.style.setProperty("--mx", "0");
    rootRef.current?.style.setProperty("--my", "0");
  };

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="grimoire-skin relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-spectral"
      style={{ ["--mx" as any]: 0, ["--my" as any]: 0 }}
    >
      {/* Orbiting arcane orbs + theme-aware backdrop, veiled for depth */}
      <ArcaneField />
      <div aria-hidden className="auth-backdrop fixed inset-0 z-0" />
      <div aria-hidden className="fixed inset-0 z-0" style={{ background: "color-mix(in oklab, var(--color-mist) 72%, transparent)" }} />

      {/* Faded conjurer / apprentice figure for hero-like depth */}
      <img src="/real-app-hero-page/cut-figure-apprentice-light.webp" alt="" aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/2 z-0 h-[70vh] max-w-none -translate-x-1/2 object-contain opacity-[0.08] dark:hidden" />
      <img src="/real-app-hero-page/cut-figure-conjurer-dark.webp" alt="" aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/2 z-0 hidden h-[70vh] max-w-none -translate-x-1/2 object-contain opacity-[0.12] dark:block" />

      {/* Top-right controls */}
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle className="!h-9 !w-9" />
      </div>

      {/* Floating crystals with pointer parallax */}
      {GEMS.map((g, i) => (
        <img key={i} src={g.src} alt="" aria-hidden
          className={`pointer-events-none absolute z-10 select-none ${g.className}`}
          style={{
            transform: `translate(calc(var(--mx) * ${g.depth}px), calc(var(--my) * ${g.depth}px))`,
            transition: "transform 0.25s ease-out",
            filter: "drop-shadow(0 8px 24px rgb(0 0 0 / 0.35))",
            animation: reduced ? undefined : `nf-float ${g.spin}s ease-in-out infinite`,
            animationDelay: `${i * -3}s`,
            opacity: 0.9,
          }} />
      ))}

      {/* ── The glyph: 4 · seal · 4 ── */}
      <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-5"
        style={{ transform: "translate(calc(var(--mx) * 8px), calc(var(--my) * 8px))", transition: "transform 0.3s ease-out" }}>
        {/* left 4 */}
        <span className="font-display font-bold leading-none" style={{
          fontSize: "clamp(6rem, 22vw, 15rem)",
          backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--color-gold) 92%, white), var(--color-gold))",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 0 34px color-mix(in oklab, var(--color-gold) 45%, transparent))",
        }}>4</span>
        {/* seal as the 0 */}
        <img src="/dark-alchemy-vibe/seal-astrolabe.webp" alt="0" aria-hidden
          className="object-contain"
          style={{
            height: "clamp(6rem, 22vw, 15rem)", width: "auto",
            filter: "drop-shadow(0 0 38px color-mix(in oklab, var(--color-gold) 55%, transparent))",
            animation: reduced ? undefined : "arcane-spin 56s linear infinite",
          }} />
        {/* right 4 */}
        <span className="font-display font-bold leading-none" style={{
          fontSize: "clamp(6rem, 22vw, 15rem)",
          backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--color-gold) 92%, white), var(--color-gold))",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 0 34px color-mix(in oklab, var(--color-gold) 45%, transparent))",
        }}>4</span>
      </div>

      {/* ── Copy ── */}
      <div className="relative z-10 mt-6 max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-gold/80">Error 404 · Lost transmutation</p>
        <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">This path was never forged.</h1>
        <p className="mt-3 font-serif text-base italic leading-relaxed text-parchment/75 sm:text-lg">
          The page you sought has dissolved into the aether — mistyped, moved, or never conjured at all.
          Step back to the laboratory and begin again.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-arcane btn-arcane-hover text-sm">Return to the laboratory</Link>
          <button onClick={() => (typeof window !== "undefined" ? window.history.back() : undefined)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-parchment/80 transition hover:-translate-y-0.5 hover:text-spectral"
            style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
            ← Go back
          </button>
        </div>

        {/* Quick doors */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-parchment/55">
          <span className="text-[10px] uppercase tracking-[0.24em] text-parchment/35">Try instead</span>
          <Link to="/elements" className="transition hover:text-gold">Elements</Link>
          <Link to="/lexicon" className="transition hover:text-gold">Lexicon</Link>
          <Link to="/learn" className="transition hover:text-gold">Learn</Link>
          <Link to="/login" className="transition hover:text-gold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
