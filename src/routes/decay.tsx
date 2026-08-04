import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Radiation, Play, Pause, RotateCcw, ArrowRight } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";

export const Route = createFileRoute("/decay")({
  component: () => (
    <RequireRole role="student">
      <DecayViewer />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-emerald-elixir)";
const PARENT = "#2dd4bf";
const DAUGHTER = "#a855f7";

type Mode = "α" | "β⁻";
interface Isotope {
  id: string; symbol: string; z: number; a: number;
  half: string; mode: Mode; particle: string;
  daughter: { symbol: string; z: number; a: number };
  use: string;
}

const ISOTOPES: Isotope[] = [
  { id: "c14", symbol: "¹⁴C", z: 6, a: 14, half: "5,730 years", mode: "β⁻", particle: "electron (β⁻)", daughter: { symbol: "¹⁴N", z: 7, a: 14 }, use: "Radiocarbon dating of once-living material." },
  { id: "u238", symbol: "²³⁸U", z: 92, a: 238, half: "4.47 billion years", mode: "α", particle: "helium nucleus (α)", daughter: { symbol: "²³⁴Th", z: 90, a: 234 }, use: "Dating rocks; the start of a long decay chain." },
  { id: "i131", symbol: "¹³¹I", z: 53, a: 131, half: "8.02 days", mode: "β⁻", particle: "electron (β⁻)", daughter: { symbol: "¹³¹Xe", z: 54, a: 131 }, use: "Diagnosing and treating thyroid conditions." },
  { id: "co60", symbol: "⁶⁰Co", z: 27, a: 60, half: "5.27 years", mode: "β⁻", particle: "electron (β⁻)", daughter: { symbol: "⁶⁰Ni", z: 28, a: 60 }, use: "Cancer radiotherapy and sterilising equipment." },
  { id: "rn222", symbol: "²²²Rn", z: 86, a: 222, half: "3.82 days", mode: "α", particle: "helium nucleus (α)", daughter: { symbol: "²¹⁸Po", z: 84, a: 218 }, use: "A natural radioactive gas — a home-safety concern." },
  { id: "h3", symbol: "³H", z: 1, a: 3, half: "12.3 years", mode: "β⁻", particle: "electron (β⁻)", daughter: { symbol: "³He", z: 2, a: 3 }, use: "Self-powered glow signs and research tracers." },
];

const N_DOTS = 100;

function DecayViewer() {
  const [id, setId] = useState(ISOTOPES[0].id);
  const [h, setH] = useState(0); // half-lives elapsed
  const [playing, setPlaying] = useState(false);
  const iso = ISOTOPES.find((i) => i.id === id)!;
  const remainingFrac = Math.pow(0.5, h);
  const remaining = Math.round(remainingFrac * N_DOTS);

  // Stable shuffle so the "decayed" dots are scattered, not the first N.
  const order = useMemo(() => {
    const arr = Array.from({ length: N_DOTS }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [id]);
  const decayed = new Set(order.slice(remaining));

  // Auto-play: advance h up to 6 half-lives.
  const raf = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000; last.current = now;
      setH((prev) => {
        const next = prev + dt * 0.6;
        if (next >= 6) { setPlaying(false); return 6; }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const reset = () => { setPlaying(false); setH(0); };

  // Decay curve points (fraction remaining vs half-lives 0..6)
  const curvePts = Array.from({ length: 61 }, (_, k) => {
    const hh = (k / 60) * 6;
    return `${(hh / 6) * 300},${(1 - Math.pow(0.5, hh)) * 160 + 10}`;
  }).join(" ");

  return (
    <StudentShell title="Radioactive Decay">
      <PageHeader
        eyebrow="Nuclear Change"
        title="Half-life, one nucleus at a time."
        subtitle="Unstable nuclei decay at random — but a huge population halves like clockwork every half-life. Pick an isotope and watch it happen."
        icon={Radiation}
        accent={ACCENT}
      />

      {/* Isotope picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ISOTOPES.map((i) => (
          <button key={i.id} onClick={() => { setId(i.id); reset(); }}
            className="rounded-xl px-3.5 py-2 text-sm font-display transition-all hover:-translate-y-0.5"
            style={i.id === id
              ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)` }
              : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {i.symbol}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[1.1fr_1fr] gap-6 items-start">
        {/* Nuclei population */}
        <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
          <div className="grid grid-cols-10 gap-1.5 mb-4">
            {Array.from({ length: N_DOTS }, (_, i) => {
              const dead = decayed.has(i);
              return <span key={i} className="aspect-square rounded-full transition-colors duration-500"
                style={{ background: dead ? DAUGHTER : PARENT, opacity: dead ? 0.7 : 1, boxShadow: dead ? "none" : `0 0 6px -1px ${PARENT}` }} />;
            })}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PARENT }} /> {remaining}% {iso.symbol}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: DAUGHTER }} /> {100 - remaining}% {iso.daughter.symbol}</span>
          </div>
        </div>

        {/* Info + curve */}
        <div>
          {/* Decay equation */}
          <div className="rounded-2xl p-4 mb-4 flex items-center justify-center gap-3 flex-wrap" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <NucleusChip label={iso.symbol} z={iso.z} a={iso.a} color={PARENT} />
            <ArrowRight className="h-4 w-4 text-parchment/50" />
            <NucleusChip label={iso.daughter.symbol} z={iso.daughter.z} a={iso.daughter.a} color={DAUGHTER} />
            <span className="text-parchment/50">+</span>
            <span className="font-display text-lg" style={{ color: "var(--color-gold)" }}>{iso.mode}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Fact label="Half-life" value={iso.half} accent={ACCENT} />
            <Fact label="Decay mode" value={`${iso.mode} — ${iso.particle}`} accent="var(--color-gold)" />
          </div>

          {/* Curve */}
          <div className="rounded-2xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <svg viewBox="0 0 300 180" className="w-full" style={{ height: 150 }}>
              <polyline points={curvePts} fill="none" stroke={ACCENT} strokeWidth="2.5" />
              <circle cx={(h / 6) * 300} cy={(1 - remainingFrac) * 160 + 10} r="5" fill={PARENT} stroke="#fff" strokeWidth="1.5" />
              {[1, 2, 3].map((n) => (
                <text key={n} x={(n / 6) * 300} y="176" fontSize="8" fill="var(--color-parchment)" textAnchor="middle">{n} t½</text>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline controls */}
      <div className="mt-5">
        <label className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 block">
          {h.toFixed(1)} half-lives elapsed · {(remainingFrac * 100).toFixed(1)}% remaining
        </label>
        <input type="range" min={0} max={6} step={0.05} value={h} onChange={(e) => { setPlaying(false); setH(Number(e.target.value)); }} className="w-full accent-teal" />
        <div className="mt-3 flex gap-3">
          <button onClick={() => setPlaying((p) => !p)} className="btn-arcane btn-arcane-hover text-sm">
            {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play decay</>}
          </button>
          <button onClick={reset} className="btn-ghost-arcane text-sm"><RotateCcw className="h-4 w-4" /> Reset</button>
        </div>
      </div>

      <p className="mt-6 text-sm text-parchment/60 max-w-2xl leading-relaxed">
        After each half-life, half of whatever remains has decayed — {iso.symbol} → {iso.daughter.symbol}.
        You can't predict which nucleus goes next, but with this many, the fraction is remarkably steady.
      </p>
    </StudentShell>
  );
}

function NucleusChip({ label, z, a, color }: { label: string; z: number; a: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full font-display text-sm" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color, border: `1px solid color-mix(in oklab, ${color} 45%, transparent)` }}>{label}</span>
      <span className="text-[9px] text-parchment/50 mt-1">Z {z} · A {a}</span>
    </div>
  );
}

function Fact({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: accent }}>{label}</div>
      <div className="font-display text-sm leading-tight">{value}</div>
    </div>
  );
}
