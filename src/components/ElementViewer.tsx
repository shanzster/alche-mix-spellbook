import { useLayoutEffect, useRef, useState } from "react";
import { Box, Orbit, ScanLine } from "lucide-react";
import { BohrModel3D } from "./BohrModel3D";

/**
 * Annotated "anatomy" card — the plain reference tile with leader lines
 * labelling each part (atomic number, symbol, name, mass). Shown first so a
 * student learns to read the card before meeting the atom models.
 */
export function AnatomyCard({ number, symbol, name, mass, color }: { number: number; symbol: string; name: string; mass: string; color: string }) {
  const TILE = 180; // px — the square element tile
  const W = 340;    // px — the diagram (labels + tile)
  const wrapRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const symRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const massRef = useRef<HTMLSpanElement>(null);
  // Leader-line endpoints are measured from the real glyphs so every line
  // actually lands on the part it labels (the "H", the "1", …).
  const [pts, setPts] = useState<{ label: string; x: number; y: number }[]>([]);
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const base = wrap.getBoundingClientRect();
      const mk = (label: string, el: HTMLSpanElement | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { label, x: r.left - base.left - 4, y: r.top - base.top + r.height / 2 };
      };
      setPts([
        mk("Atomic number", numRef.current),
        mk("Element symbol", symRef.current),
        mk("Element name", nameRef.current),
        mk("Atomic mass", massRef.current),
      ].filter((p): p is { label: string; x: number; y: number } => p !== null));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [number, symbol, name, mass]);
  const dash = `repeating-linear-gradient(to right, color-mix(in oklab, ${color} 75%, transparent) 0 5px, transparent 5px 10px)`;
  return (
    <div className="flex h-full items-center justify-center p-6 font-sans">
      <div ref={wrapRef} className="relative" style={{ width: W, height: TILE }}>
        {/* The real element tile, on the right */}
        <div className="absolute right-0 top-0 rounded-xl"
          style={{ width: TILE, height: TILE, background: `color-mix(in oklab, ${color} 20%, transparent)`, border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`, boxShadow: `0 0 34px -8px ${color}` }}>
          <span ref={numRef} className="absolute left-3 top-2 text-xl font-semibold tabular-nums text-parchment">{number}</span>
          <span ref={symRef} className="absolute inset-x-0 mx-auto w-fit text-6xl font-bold leading-none" style={{ top: 44, color }}>{symbol}</span>
          <span ref={nameRef} className="absolute inset-x-0 mx-auto w-fit text-xl text-parchment" style={{ top: 118 }}>{name}</span>
          <span ref={massRef} className="absolute inset-x-0 mx-auto w-fit text-base tabular-nums text-parchment/90" style={{ top: 150 }}>{mass}</span>
        </div>
        {/* Leader lines — drawn over the tile, each ending on its glyph */}
        {pts.map((p) => (
          <div key={p.label} className="absolute left-0 flex items-center" style={{ top: p.y, width: Math.max(p.x, 130), transform: "translateY(-50%)", zIndex: 20 }}>
            <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-parchment/75">{p.label}</span>
            <span className="mx-2 h-px flex-1" style={{ background: dash }} />
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 2D Bohr diagram (SVG, self-animating). Extracted from the periodic table. */
export function BohrSVG({ shells, color, symbol, name }: { shells: string; color: string; symbol: string; name: string }) {
  const rings = shells.split(",").map(Number);
  const size = 260, cx = size / 2, cy = size / 2, nucleusR = 22;
  const maxR = size / 2 - 16;
  const step = rings.length ? (maxR - nucleusR - 6) / rings.length : 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-label={`Bohr diagram of ${name}`}>
      {rings.map((count, i) => {
        const r = nucleusR + 6 + step * (i + 1);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
            <g>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${i % 2 ? -360 : 360} ${cx} ${cy}`} dur={`${9 + i * 3}s`} repeatCount="indefinite" />
              {Array.from({ length: Math.min(count, 32) }).map((_, e) => {
                const a = (2 * Math.PI * e) / Math.min(count, 32);
                return <circle key={e} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
              })}
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={nucleusR} fill={`color-mix(in oklab, ${color} 35%, transparent)`} stroke={color} strokeWidth="2" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-sans)" fontSize="20" fontWeight="600" fill="var(--color-spectral)">{symbol}</text>
    </svg>
  );
}

/**
 * The element atom viewer — a 3D orbit model you can spin, or the flat Bohr
 * diagram, with a toggle between them. Shared by the periodic table's detail
 * page so the two never drift.
 */
export function ElementViewer({ shells, color, symbol, name, number, mass, className = "" }: {
  shells: string; color: string; symbol: string; name: string; number: number; mass: string; className?: string;
}) {
  const [view, setView] = useState<"card" | "3d" | "bohr">("card");
  return (
    <div className={className}>
      <div className="mb-3 inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
        {([["card", "Element Card", ScanLine], ["3d", "3D View", Box], ["bohr", "Bohr Model", Orbit]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setView(key)}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition"
            style={view === key ? { background: `color-mix(in oklab, ${color} 20%, transparent)`, color } : { color: "var(--color-parchment)" }}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="relative h-[340px] overflow-hidden rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 50% 40%, color-mix(in oklab, ${color} 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
        {view === "card" ? (
          <AnatomyCard number={number} symbol={symbol} name={name} mass={mass} color={color} />
        ) : view === "3d" ? (
          <BohrModel3D key={symbol} interactive electrons={shells} color={color} nucleusColor="#fbbf24" label={symbol} />
        ) : (
          <div className="flex h-full items-center justify-center p-6"><BohrSVG shells={shells} color={color} symbol={symbol} name={name} /></div>
        )}
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-parchment/50">
          {view === "card" ? "parts of the element card" : view === "3d" ? "drag to spin ⟳" : `Shells: ${shells}`}
        </span>
      </div>
    </div>
  );
}
