import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, Atom, BookOpen, Zap, ArrowRight } from "lucide-react";
import { FloatingNav } from "../components/FloatingNav";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="animate-drift absolute h-1 w-1 rounded-full"
            style={{
              top: `${(i * 41) % 100}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${18 + (i % 6) * 3}s`,
              background: i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)",
              boxShadow: `0 0 14px ${i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)"}`,
            }} />
        ))}
      </div>

      <FloatingNav />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Animated flask */}
        <div className="relative mb-10">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-breathing"
            style={{ background: "var(--color-wraith)", transform: "scale(1.8)" }} />
          <FlaskConical className="relative h-16 w-16 text-wraith animate-float-slow" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-wraith/30 bg-wraith/10 px-4 py-1.5 text-xs tracking-[0.3em] text-wraith uppercase mb-6">
          <Zap className="h-3 w-3" /> AlcheMix Platform
        </div>

        <h1 className="font-display text-5xl md:text-6xl mb-6">
          The Lab is<br />
          <span className="aurora-gradient animate-aurora">Being Built.</span>
        </h1>

        <p className="text-parchment max-w-lg leading-relaxed mb-4 text-lg">
          The full AlcheMix AR platform — Reaction Sandbox, Educator Astrolabe,
          and AI Evidence Journal — is currently in development.
        </p>
        <p className="text-parchment/60 max-w-md leading-relaxed mb-12 text-sm">
          In the meantime, explore the element library, read about the Grimoire cards,
          and learn how the platform works.
        </p>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-5 w-full max-w-2xl mb-12">
          {[
            {
              icon: <Atom className="h-6 w-6" />,
              label: "Element Explorer",
              desc: "Browse all 118 elements with Bohr model diagrams.",
              color: "var(--color-wraith)",
              to: "/elements",
            },
            {
              icon: <BookOpen className="h-6 w-6" />,
              label: "Grimoire Cards",
              desc: "Learn about the physical card collection.",
              color: "var(--color-gold)",
              to: "/grimoire",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              label: "How It Works",
              desc: "Understand the AlcheMix methodology.",
              color: "var(--color-emerald-elixir)",
              to: "/learn",
            },
          ].map(({ icon, label, desc, color, to }) => (
            <Link key={label} to={to as any}
              className="group flex flex-col rounded-xl p-5 text-left hover:-translate-y-1 transition-all duration-300"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                border: `1px solid color-mix(in oklab, ${color} 22%, transparent)`,
                boxShadow: `0 0 30px -16px color-mix(in oklab, ${color} 35%, transparent)`,
              }}>
              <span className="mb-3" style={{ color }}>{icon}</span>
              <span className="font-display text-base mb-1">{label}</span>
              <span className="text-parchment text-xs leading-relaxed flex-1">{desc}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs tracking-[0.15em] uppercase transition-all duration-200 group-hover:gap-2"
                style={{ color }}>
                Go <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        <Link to="/" className="btn-ghost-arcane text-sm">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
