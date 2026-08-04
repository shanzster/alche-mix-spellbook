import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Beaker, Droplet, RotateCcw } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";

export const Route = createFileRoute("/titration")({
  component: () => (
    <RequireRole role="student">
      <Titration />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-wraith)";

// Fixed cell: 25 mL of 0.1 M HCl, titrated with 0.1 M NaOH.
const Ca = 0.1, Va = 25, Cb = 0.1, EQUIV = (Ca * Va) / Cb; // = 25 mL

function pHat(Vb: number): number {
  const molA = (Ca * Va) / 1000;
  const molB = (Cb * Vb) / 1000;
  const totalL = (Va + Vb) / 1000;
  let pH: number;
  if (Math.abs(molA - molB) < 1e-9) pH = 7;
  else if (molA > molB) pH = -Math.log10((molA - molB) / totalL);
  else pH = 14 + Math.log10((molB - molA) / totalL);
  return Math.max(0, Math.min(14, pH));
}

// Universal-indicator colour by pH (educational reference bar).
function phColor(pH: number): string {
  const stops: [number, string][] = [
    [0, "#e11d48"], [3, "#f97316"], [5, "#facc15"], [7, "#22c55e"],
    [9, "#0ea5e9"], [11, "#4f46e5"], [14, "#7c3aed"],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
    if (pH <= p1) return mix(c0, c1, (pH - p0) / (p1 - p0));
  }
  return stops[stops.length - 1][1];
}
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function Titration() {
  const [Vb, setVb] = useState(0);
  const pH = pHat(Vb);
  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let v = 0; v <= 50; v += 0.5) pts.push(`${(v / 50) * 300},${(1 - pHat(v) / 14) * 180}`);
    return pts.join(" ");
  }, []);

  // Phenolphthalein: colourless until ~8.2, then pink.
  const pinkAlpha = Math.max(0, Math.min(1, (pH - 8.2) / (10 - 8.2))) * 0.85;
  const near = Math.abs(Vb - EQUIV) < 0.6;

  return (
    <StudentShell title="Titration">
      <PageHeader
        eyebrow="Acid–Base Titration"
        title="Find the neutral point, drop by drop."
        subtitle="Add 0.1 M sodium hydroxide to 25 mL of 0.1 M hydrochloric acid. Watch the pH climb — and jump at the equivalence point."
        icon={Beaker}
        accent={ACCENT}
      />

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-6 items-start">
        {/* Beaker + readout */}
        <div className="rounded-2xl p-6 flex flex-col items-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
          <div className="relative h-52 w-40 mb-4">
            {/* beaker body */}
            <div className="absolute inset-x-0 bottom-0 top-6 rounded-b-2xl rounded-t-md overflow-hidden" style={{ border: "2px solid color-mix(in oklab, var(--color-parchment) 40%, transparent)", borderTop: "none" }}>
              <div className="absolute inset-x-0 bottom-0 transition-all duration-300" style={{
                height: `${35 + (Vb / 50) * 45}%`,
                background: `linear-gradient(180deg, rgba(236,72,153,${pinkAlpha * 0.7}), rgba(236,72,153,${pinkAlpha}))`,
                borderTop: "2px solid rgba(255,255,255,0.25)",
              }} />
              {near && <div className="absolute inset-0 animate-breathing" style={{ boxShadow: "inset 0 0 30px rgba(236,72,153,0.5)" }} />}
            </div>
            {/* burette drip */}
            <Droplet className="absolute left-1/2 -translate-x-1/2 top-0 h-5 w-5 text-wraith" />
          </div>

          <div className="text-center">
            <div className="font-display text-4xl" style={{ color: phColor(pH) }}>pH {pH.toFixed(2)}</div>
            <div className="text-xs text-parchment/60 mt-1">{Vb.toFixed(1)} mL NaOH added</div>
            <div className="text-[11px] mt-2" style={{ color: near ? "var(--color-gold)" : "var(--color-parchment)" }}>
              {near ? "≈ Equivalence point — neutral!" : pH < 7 ? "Still acidic" : "Now basic"}
            </div>
          </div>
        </div>

        {/* Curve + controls */}
        <div>
          <div className="rounded-2xl p-4 mb-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <svg viewBox="0 0 300 180" className="w-full" style={{ height: 200 }}>
              {[0, 7, 14].map((g) => (
                <g key={g}>
                  <line x1="0" x2="300" y1={(1 - g / 14) * 180} y2={(1 - g / 14) * 180} stroke="color-mix(in oklab, var(--color-parchment) 20%, transparent)" strokeDasharray="3 3" />
                  <text x="2" y={(1 - g / 14) * 180 - 2} fontSize="9" fill="var(--color-parchment)">pH {g}</text>
                </g>
              ))}
              {/* equivalence marker */}
              <line x1={(EQUIV / 50) * 300} x2={(EQUIV / 50) * 300} y1="0" y2="180" stroke="color-mix(in oklab, var(--color-gold) 45%, transparent)" strokeDasharray="4 3" />
              <polyline points={curve} fill="none" stroke="var(--color-wraith)" strokeWidth="2.5" />
              <circle cx={(Vb / 50) * 300} cy={(1 - pH / 14) * 180} r="5" fill={phColor(pH)} stroke="#fff" strokeWidth="1.5" />
            </svg>
          </div>

          {/* pH colour scale */}
          <div className="mb-4">
            <div className="h-3 rounded-full" style={{ background: "linear-gradient(90deg, #e11d48, #f97316, #facc15, #22c55e, #0ea5e9, #4f46e5, #7c3aed)" }} />
            <div className="relative h-3">
              <div className="absolute -top-0.5 h-4 w-1 rounded-full" style={{ left: `${(pH / 14) * 100}%`, background: "#fff", boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
            </div>
          </div>

          {/* slider */}
          <label className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 block">Base added — {Vb.toFixed(1)} mL</label>
          <input type="range" min={0} max={50} step={0.1} value={Vb} onChange={(e) => setVb(Number(e.target.value))} className="w-full accent-wraith" />
          <div className="mt-4 flex flex-wrap gap-2">
            {[0.1, 1, 5].map((d) => (
              <button key={d} onClick={() => setVb((v) => Math.min(50, +(v + d).toFixed(1)))} className="btn-ghost-arcane text-xs">
                <Droplet className="h-3.5 w-3.5" /> +{d} mL
              </button>
            ))}
            <button onClick={() => setVb(EQUIV)} className="btn-ghost-arcane text-xs">Jump to equivalence</button>
            <button onClick={() => setVb(0)} className="btn-ghost-arcane text-xs"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-parchment/60 max-w-2xl leading-relaxed">
        The curve is nearly flat, then leaps almost vertically near <span className="text-gold">{EQUIV} mL</span> — the equivalence point, where moles of acid exactly equal moles of base.
        A single drop there swings the pH by several units, which is why indicators change colour so sharply.
      </p>
    </StudentShell>
  );
}
