import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  FlaskConical,
  Sparkles,
  Eye,
  BookOpen,
  Feather,
  ArrowRight,
  Moon,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

function Landing() {
  const y = useScrollY();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="animate-drift absolute h-1 w-1 rounded-full bg-wraith/60"
            style={{
              top: `${(i * 37) % 100}%`,
              animationDelay: `${i * 1.4}s`,
              animationDuration: `${18 + (i % 6) * 3}s`,
              boxShadow: "0 0 12px var(--color-wraith)",
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--color-mist) 78%, transparent), transparent)",
            borderBottom: "1px solid color-mix(in oklab, var(--color-parchment) 25%, transparent)",
          }}
        >
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-wraith animate-breathing" />
            <span className="font-display text-lg tracking-[0.25em] text-spectral">
              ALCHEMIX <span className="text-wraith">AR</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#sandbox" className="text-sm text-gold hover:text-spectral transition">The Sandbox</a>
            <a href="#astrolabe" className="text-sm text-gold hover:text-spectral transition">The Astrolabe</a>
            <a href="#grimoire" className="text-sm text-gold hover:text-spectral transition">The Grimoire</a>
          </nav>
          <Link to="/app" className="btn-arcane btn-arcane-hover">
            Enter the Study
          </Link>
        </div>
      </header>

      {/* HERO — parallax */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24"
      >
        {/* Moon */}
        <div
          className="absolute left-1/2 top-[18%] -translate-x-1/2"
          style={{ transform: `translate(-50%, ${y * -0.15}px)` }}
        >
          <div className="relative">
            <div
              className="h-72 w-72 rounded-full animate-breathing"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, color-mix(in oklab, var(--color-wraith) 55%, transparent), transparent 65%)",
              }}
            />
            <Moon className="absolute inset-0 m-auto h-24 w-24 text-wraith/40" />
          </div>
        </div>

        {/* Distant runes layer (slowest) */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-20"
          style={{ transform: `translateY(${y * 0.05}px)` }}
        >
          <div className="font-display text-[22vw] tracking-[0.3em] text-parchment/20 select-none">
            ✦ ⚗ ✦
          </div>
        </div>

        {/* Middle ring */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translateY(${y * -0.25}px)` }}
        >
          <div
            className="h-[42rem] w-[42rem] rounded-full border border-parchment/20"
            style={{
              boxShadow:
                "inset 0 0 120px color-mix(in oklab, var(--color-wraith) 12%, transparent)",
            }}
          />
        </div>

        {/* Foreground copy */}
        <div
          className="relative z-10 mx-auto max-w-4xl px-6 text-center"
          style={{ transform: `translateY(${y * -0.4}px)`, opacity: Math.max(0, 1 - y / 600) }}
        >
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-parchment/40 bg-slate-sunken/60 px-4 py-1.5 text-xs tracking-[0.3em] text-gold uppercase">
            <Sparkles className="h-3 w-3 text-wraith" /> An Ethereal Chemistry Sandbox
          </p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            Where <span className="text-wraith text-glow">Elements</span>
            <br /> Whisper Their Secrets.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-parchment">
            Step into a study of glowing phials and aged parchment. Transmute reagents,
            summon reactions in three dimensions, and let the arcane vision of AI guide
            your apprentices through the world.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-arcane btn-arcane-hover">
              <FlaskConical className="h-4 w-4" /> Begin Transmutation
            </Link>
            <a href="#sandbox" className="btn-ghost-arcane">
              <ScrollText className="h-4 w-4" /> Read the Tome
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] text-gold/70 uppercase animate-breathing">
          Descend ▾
        </div>
      </section>

      {/* SECTION — Sandbox (side-scrolling reveal) */}
      <FeatureBand
        id="sandbox"
        eyebrow="Module II"
        title="The Alchemist's Sandbox"
        subtitle="A cauldron of possibility."
        body="Drag core reagents onto a spectral canvas. Watch bonds form as glowing filaments. Every transmutation is a small, satisfying spell — bouncy, luminous, alive."
        icon={<FlaskConical className="h-6 w-6" />}
        side="left"
        y={y}
      />

      {/* SECTION — Astrolabe */}
      <FeatureBand
        id="astrolabe"
        eyebrow="Module I"
        title="The Educator's Astrolabe"
        subtitle="A ledger from a wizard's study."
        body="Chart the progress of every apprentice. Transmutation counts, active souls, success rates — all etched into a living, breathing dashboard of arcane analytics."
        icon={<Eye className="h-6 w-6" />}
        side="right"
        y={y}
      />

      {/* SECTION — Grimoire */}
      <FeatureBand
        id="grimoire"
        eyebrow="Module III"
        title="The Scavenger Grimoire"
        subtitle="An ocular lens upon the world."
        body="Apprentices upload real-world evidence. An AI oracle scries, judges, and inscribes the result into their personal grimoire — success, uncertainty, or volatility."
        icon={<BookOpen className="h-6 w-6" />}
        side="left"
        y={y}
      />

      {/* CTA */}
      <section className="relative overflow-hidden py-32">
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${(y - 2400) * 0.1}px)`,
            background:
              "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--color-wraith) 20%, transparent), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <Feather className="mx-auto mb-6 h-10 w-10 text-wraith animate-float-slow" />
          <h2 className="font-display text-4xl md:text-6xl">
            The Cauldron <span className="text-wraith text-glow">Awaits.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-parchment">
            Cross the threshold of the study. Your first reagents are already prepared.
          </p>
          <div className="mt-10">
            <Link to="/app" className="btn-arcane btn-arcane-hover">
              Enter the Study <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase">
        ✦ AlcheMix AR — Bound in aged parchment ✦
      </footer>
    </div>
  );
}

function FeatureBand({
  id,
  eyebrow,
  title,
  subtitle,
  body,
  icon,
  side,
  y,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  icon: React.ReactNode;
  side: "left" | "right";
  y: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const center = rect.top + rect.height / 2 - window.innerHeight / 2;
    setOffset(center);
  }, [y]);

  const slide = Math.max(-80, Math.min(80, offset * -0.15));
  const isLeft = side === "left";

  return (
    <section
      id={id}
      ref={ref}
      className="relative flex min-h-[85vh] items-center overflow-hidden py-24"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        {/* Copy */}
        <div
          className={isLeft ? "md:order-1" : "md:order-2"}
          style={{ transform: `translateX(${isLeft ? slide : -slide}px)` }}
        >
          <div className="mb-4 flex items-center gap-3 text-gold">
            <span className="text-wraith">{icon}</span>
            <span className="text-xs tracking-[0.4em] uppercase">{eyebrow}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
          <p className="mt-3 font-display italic text-gold">{subtitle}</p>
          <p className="mt-6 max-w-md text-parchment leading-relaxed">{body}</p>
          <div className="mt-8">
            <Link to="/app" className="btn-ghost-arcane">
              Open Module <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Visual */}
        <div
          className={isLeft ? "md:order-2" : "md:order-1"}
          style={{ transform: `translateY(${offset * -0.08}px)` }}
        >
          <div className="relative aspect-square w-full max-w-md mx-auto">
            <div
              className="absolute inset-0 rounded-full parchment-border glow-wraith-soft animate-breathing"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-wraith) 22%, transparent), transparent 70%)",
              }}
            />
            <div className="absolute inset-6 rounded-full border border-parchment/30" />
            <div className="absolute inset-12 rounded-full border border-wraith/20 animate-float-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-wraith [&>svg]:h-24 [&>svg]:w-24 animate-breathing">
                {icon}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
