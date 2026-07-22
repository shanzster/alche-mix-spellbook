import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href as any}
      className="group relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:scale-110"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
        border: "1px solid color-mix(in oklab, var(--color-parchment) 20%, transparent)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "color-mix(in oklab, var(--color-wraith) 55%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 14px -4px color-mix(in oklab, var(--color-wraith) 50%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "color-mix(in oklab, var(--color-parchment) 20%, transparent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <ScrollText className="h-3.5 w-3.5 text-gold group-hover:text-spectral transition-colors duration-200" />
      <span
        className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: "color-mix(in oklab, var(--color-mist) 90%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export function FloatingNav() {
  return (
    <header className="fixed top-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* Outer wrapper — taller than pill to let orb overflow without clipping */}
      <div
        className="pointer-events-auto relative flex items-center justify-center"
        style={{ height: "68px" }}
      >
        {/* The pill */}
        <div
          className="flex items-center h-12 rounded-full backdrop-blur-xl"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
            boxShadow:
              "0 8px 40px -8px color-mix(in oklab, var(--color-wraith) 30%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-spectral) 8%, transparent)",
            padding: "0 12px",
            gap: "6px",
          }}
        >
          {/* Left links */}
          <NavLink href="/about" label="About" />
          <NavLink href="/elements" label="Elements" />

          {/* Center gap for the orb */}
          <div style={{ width: "72px", flexShrink: 0 }} />

          {/* Right links */}
          <NavLink href="/grimoire" label="Grimoire" />
          <NavLink href="/learn" label="How It Works" />
        </div>

        {/* Logo orb — centered over the gap */}
        <Link
          to="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full animate-breathing group"
          style={{
            width: "60px",
            height: "60px",
            background: "#1D1D1B",
            border: "4px solid color-mix(in oklab, var(--color-slate-sunken) 100%, transparent)",
            boxShadow:
              "0 0 0 1px color-mix(in oklab, var(--color-wraith) 55%, transparent), 0 0 28px -4px color-mix(in oklab, var(--color-wraith) 70%, transparent), 0 0 50px -10px color-mix(in oklab, var(--color-wraith) 40%, transparent)",
            flexShrink: 0,
          }}
        >
          <img
            src="/images/logo-outline.png"
            alt="AlcheMix"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              filter:
                "drop-shadow(0 0 6px color-mix(in oklab, var(--color-wraith) 80%, transparent))",
            }}
          />
          <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[9px] tracking-[0.2em] uppercase text-spectral/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            AlcheMix
          </span>
        </Link>
      </div>
    </header>
  );
}
