import { useState } from "react";
import { Box, Orbit } from "lucide-react";
import { BohrModel3D } from "./BohrModel3D";

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
export function ElementViewer({ shells, color, symbol, name, className = "" }: {
  shells: string; color: string; symbol: string; name: string; className?: string;
}) {
  const [view, setView] = useState<"3d" | "bohr">("3d");
  return (
    <div className={className}>
      <div className="mb-3 inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
        {([["3d", "3D View", Box], ["bohr", "Bohr Model", Orbit]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setView(key)}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition"
            style={view === key ? { background: `color-mix(in oklab, ${color} 20%, transparent)`, color } : { color: "var(--color-parchment)" }}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="relative h-[340px] overflow-hidden rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 50% 40%, color-mix(in oklab, ${color} 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
        {view === "3d" ? (
          <BohrModel3D key={symbol} interactive electrons={shells} color={color} nucleusColor="#fbbf24" label={symbol} />
        ) : (
          <div className="flex h-full items-center justify-center p-6"><BohrSVG shells={shells} color={color} symbol={symbol} name={name} /></div>
        )}
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-parchment/50">
          {view === "3d" ? "drag to spin ⟳" : `Shells: ${shells}`}
        </span>
      </div>
    </div>
  );
}
