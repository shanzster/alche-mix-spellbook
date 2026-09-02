import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  CircleDot,
  Droplets,
  Eye,
  FlaskConical,
  Plus,
  RotateCcw,
  Star,
  Sun,
  Trophy,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/solutions")({
  component: () => (
    <RequireAuth>
      <Solutions />
    </RequireAuth>
  ),
});

const ACCENT = "var(--color-emerald-elixir)";

// ── The bench ───────────────────────────────────────────────────────────────
const MAX_ML = 1000; // 1 L beaker
const SCOOP_MOL = 0.01; // one scoop of solute
const POUR_ML = 4; // mL per 50 ms tick while a water button is held (~80 mL/s)
const TOLERANCE = 0.02; // ± mol/L accepted on a Potion Commission

type SoluteId = "cuso4" | "kmno4" | "nicl2" | "cocl2" | "nacl";

interface Solute {
  formula: string;
  name: string;
  /** Solution colour at saturation (NaCl is colourless — near-invisible tint). */
  color: string;
  /** Dot colour for the particles view. */
  dot: string;
  colourless?: boolean;
  /**
   * Solubility at 20 °C in mol per 100 mL of water (curated textbook values):
   *  CuSO₄ ≈ 20 g / 159.6 g·mol⁻¹ → ~0.14 · KMnO₄ ≈ 6.4 g / 158 → ~0.04
   *  NiCl₂ ≈ 61 g / 129.6 → ~0.47   · CoCl₂ ≈ 45 g / 129.8 → ~0.35
   *  NaCl ≈ 36 g / 58.44 → ~0.61
   */
  solubilityPer100mL: number;
}

const SOLUTES: Record<SoluteId, Solute> = {
  cuso4: { formula: "CuSO₄", name: "copper(II) sulfate", color: "#2563eb", dot: "#3b82f6", solubilityPer100mL: 0.14 },
  kmno4: { formula: "KMnO₄", name: "potassium permanganate", color: "#7c3aed", dot: "#a855f7", solubilityPer100mL: 0.04 },
  nicl2: { formula: "NiCl₂", name: "nickel(II) chloride", color: "#16a34a", dot: "#22c55e", solubilityPer100mL: 0.47 },
  cocl2: { formula: "CoCl₂", name: "cobalt(II) chloride", color: "#ec4899", dot: "#f472b6", solubilityPer100mL: 0.35 },
  nacl: { formula: "NaCl", name: "sodium chloride", color: "#94a3b8", dot: "#e2e8f0", colourless: true, solubilityPer100mL: 0.61 },
};

const SOLUTE_IDS = Object.keys(SOLUTES) as SoluteId[];

/** Saturation concentration in mol/L (mol per 100 mL × 10). */
function satMolar(id: SoluteId): number {
  return SOLUTES[id].solubilityPer100mL * 10;
}

function mixRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = mixRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 30%, transparent)",
            fill: i < n ? "var(--color-gold)" : "none",
          }}
        />
      ))}
    </span>
  );
}

function pill(active: boolean, accent = ACCENT) {
  return active
    ? {
        background: `color-mix(in oklab, ${accent} 20%, transparent)`,
        color: accent,
        border: `1px solid color-mix(in oklab, ${accent} 45%, transparent)`,
      }
    : {
        color: "var(--color-parchment)",
        border: "1px solid color-mix(in oklab, var(--color-parchment) 18%, transparent)",
      };
}

// ── Potion Commissions (trial) ──────────────────────────────────────────────
interface Commission {
  solute: SoluteId;
  target: number; // mol/L
}

/** 4 commissions on 4 different solutes, each target comfortably below saturation. */
function drawCommissions(): Commission[] {
  const ids = [...SOLUTE_IDS];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 4).map((solute) => {
    const maxT = Math.min(1.0, satMolar(solute) * 0.8);
    const steps = Math.max(1, Math.floor((maxT - 0.1) / 0.05));
    const target = +(0.1 + Math.floor(Math.random() * (steps + 1)) * 0.05).toFixed(2);
    return { solute, target: Math.min(target, +maxT.toFixed(2)) };
  });
}

// ── Beaker SVG geometry ─────────────────────────────────────────────────────
const BX = 40, BW = 180, BBOT = 290, BIH = 240; // inner box: x 40–220, y 50–290

interface Crystal {
  id: number;
  dx: number; // horizontal scatter
  fall: number; // fall distance in SVG user units
  delay: number;
}

function BeakerStage({
  solute,
  volumeML,
  dissolved,
  sediment,
  conc,
  particles,
  crystals,
}: {
  solute: Solute;
  volumeML: number;
  dissolved: number;
  sediment: number;
  conc: number;
  particles: boolean;
  crystals: Crystal[];
}) {
  const h = (volumeML / MAX_ML) * BIH; // liquid height
  const surfaceY = BBOT - h;
  const sat = solute.solubilityPer100mL * 10;
  const sedH = Math.min(36, sediment * 70); // visual pile only — not to scale
  const saturated = sediment > 1e-9 || (volumeML > 0 && conc >= sat - 1e-9);

  // Liquid tint: saturation of colour tracks concentration ÷ solubility limit.
  const strength = volumeML > 0 ? Math.min(1, conc / sat) : 0;
  const alpha = solute.colourless ? 0.10 + strength * 0.06 : 0.08 + strength * 0.72;

  // Particles view: one dot per 0.005 mol dissolved — same dots, more water = spread out.
  const dots = useMemo(() => {
    if (!particles || volumeML <= 0) return [];
    const n = Math.min(220, Math.round(dissolved / 0.005));
    const usable = h - sedH - 10;
    if (usable <= 4) return [];
    return Array.from({ length: n }, (_, i) => {
      const fx = (i * 0.6180339887) % 1; // low-discrepancy: stable, well spread
      const fy = (i * 0.7548776662) % 1;
      return { x: BX + 8 + fx * (BW - 16), y: surfaceY + 5 + fy * usable };
    });
  }, [particles, volumeML, dissolved, h, sedH, surfaceY]);

  // Probe: tip fixed at y = 262 — it only reads once the liquid covers it.
  const probeWet = surfaceY < 258 && volumeML > 0;

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <svg viewBox="0 0 260 320" className="w-full" role="img" aria-label="Mixing beaker">
        <style>{`@keyframes solu-fall { from { transform: translateY(0); opacity: 1 } to { transform: translateY(var(--fall)); opacity: .85 } }`}</style>

        {/* liquid */}
        {volumeML > 0 && (
          <>
            <rect x={BX} y={surfaceY} width={BW} height={h} fill={rgba(solute.color, alpha)} />
            <line x1={BX} x2={BX + BW} y1={surfaceY} y2={surfaceY} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          </>
        )}

        {/* particles view dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="2.4" fill={solute.dot} opacity="0.9" />
        ))}

        {/* undissolved sediment pile */}
        {sedH > 0.5 && (
          <>
            <path
              d={`M ${BX + 4} ${BBOT} Q 130 ${BBOT - sedH * 2} ${BX + BW - 4} ${BBOT} Z`}
              fill={rgba(solute.colourless ? "#cbd5e1" : solute.color, 0.85)}
            />
            {[0.25, 0.42, 0.58, 0.74].map((f, i) => (
              <rect
                key={i}
                x={BX + f * BW}
                y={BBOT - sedH * (0.35 + 0.25 * ((i * 0.618) % 1))}
                width="4"
                height="4"
                transform={`rotate(${20 + i * 25} ${BX + f * BW} ${BBOT - 6})`}
                fill="rgba(255,255,255,0.35)"
              />
            ))}
          </>
        )}

        {/* falling crystals from the scoop */}
        {crystals.map((c) => (
          <rect
            key={c.id}
            x={118 + c.dx}
            y={26}
            width="5"
            height="5"
            fill={solute.colourless ? "#e2e8f0" : solute.dot}
            style={
              {
                "--fall": `${c.fall}px`,
                animation: "solu-fall 0.5s ease-in forwards",
                animationDelay: `${c.delay}ms`,
                opacity: 0,
              } as React.CSSProperties
            }
          />
        ))}

        {/* beaker walls (drawn over the liquid) */}
        <path
          d={`M ${BX - 6} 40 L ${BX} 46 L ${BX} ${BBOT} L ${BX + BW} ${BBOT} L ${BX + BW} 46 L ${BX + BW + 6} 40`}
          fill="none"
          stroke="color-mix(in oklab, var(--color-parchment) 45%, transparent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* graduations every 250 mL */}
        {[250, 500, 750, 1000].map((mL) => (
          <g key={mL}>
            <line
              x1={BX}
              x2={BX + 14}
              y1={BBOT - (mL / MAX_ML) * BIH}
              y2={BBOT - (mL / MAX_ML) * BIH}
              stroke="color-mix(in oklab, var(--color-parchment) 40%, transparent)"
              strokeWidth="1.5"
            />
            <text x={BX + 18} y={BBOT - (mL / MAX_ML) * BIH + 3} fontSize="8" fill="var(--color-parchment)" opacity="0.55">
              {mL}
            </text>
          </g>
        ))}

        {/* dip-in concentration probe */}
        <line x1="196" y1="34" x2="196" y2="258" stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="196" cy="260" r="5" fill={probeWet ? ACCENT : "color-mix(in oklab, var(--color-parchment) 35%, transparent)"} />
        <rect x="146" y="6" width="100" height="24" rx="6" fill="color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)" stroke="var(--color-border)" />
        <text x="196" y="22" textAnchor="middle" fontSize="11" fontWeight="600" fill={probeWet ? ACCENT : "var(--color-parchment)"}>
          {probeWet ? `${conc.toFixed(2)} mol/L` : "probe dry —"}
        </text>
      </svg>

      {saturated && (
        <span
          className="absolute left-2 bottom-10 rounded-full px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase font-display animate-breathing"
          style={{
            background: "color-mix(in oklab, var(--color-gold) 18%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-gold) 50%, transparent)",
            color: "var(--color-gold)",
          }}
        >
          Saturated
        </span>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
function Solutions() {
  const { uid, profile } = useUserProfile();
  useEffect(() => {
    if (uid) void logPractice(uid, "solutions");
  }, [uid]);

  const [mode, setMode] = useState<"practice" | "trial">("practice");
  const [soluteId, setSoluteId] = useState<SoluteId>("cuso4");
  const [particles, setParticles] = useState(false);
  // One atomic bench state: mol = all solute ever added (dissolved + sediment),
  // vol = water in mL. Held-button ticks mutate it via pure functional updates.
  const [bench, setBench] = useState({ mol: 0, vol: 500 });
  const totalMol = bench.mol;
  const volumeML = bench.vol;
  const [crystals, setCrystals] = useState<Crystal[]>([]);
  const crystalId = useRef(0);

  // Trial state.
  const [rounds, setRounds] = useState<Commission[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [roundMsg, setRoundMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const trial = mode === "trial";
  const solute = SOLUTES[soluteId];
  const sat = satMolar(soluteId);

  // The chemistry: dissolved solute is capped by solubility × volume; the rest
  // piles up as sediment. Evaporating below the cap precipitates automatically.
  const volumeL = volumeML / 1000;
  const dissolved = Math.min(totalMol, sat * volumeL);
  const sediment = Math.max(0, totalMol - dissolved);
  const conc = volumeL > 0 ? dissolved / volumeL : 0;

  // One held-button interval at a time (water in / evaporate / drain).
  const holdRef = useRef<number | null>(null);
  const stopHold = () => {
    if (holdRef.current !== null) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };
  const startHold = (fn: () => void) => {
    stopHold();
    fn();
    holdRef.current = window.setInterval(fn, 50);
  };
  useEffect(() => stopHold, []);

  const addWater = () =>
    setBench((b) => ({ ...b, vol: Math.min(MAX_ML, +(b.vol + POUR_ML).toFixed(1)) }));
  const evaporate = () =>
    setBench((b) => ({ ...b, vol: Math.max(0, +(b.vol - POUR_ML).toFixed(1)) }));
  // Draining removes solution — dissolved solute leaves with the water, in
  // proportion; sediment stays stuck to the bottom of the beaker.
  const drain = () =>
    setBench((b) => {
      const dV = Math.min(b.vol, POUR_ML);
      if (dV <= 0) return b;
      const volL = b.vol / 1000;
      const c = Math.min(b.mol, sat * volL) / volL;
      return {
        mol: Math.max(0, +(b.mol - c * (dV / 1000)).toFixed(5)),
        vol: +(b.vol - dV).toFixed(1),
      };
    });

  const scoop = (mol: number) => {
    setBench((b) => ({ ...b, mol: +(b.mol + mol).toFixed(5) }));
    // Falling-crystal flourish: a handful of grains tumble to the surface.
    const surfaceY = BBOT - (volumeML / MAX_ML) * BIH;
    const grains: Crystal[] = Array.from({ length: mol > SCOOP_MOL ? 10 : 6 }, () => ({
      id: crystalId.current++,
      dx: (Math.random() - 0.5) * 44,
      fall: Math.max(30, surfaceY - 34 + Math.random() * 10),
      delay: Math.random() * 120,
    }));
    setCrystals((cs) => [...cs, ...grains]);
    window.setTimeout(
      () => setCrystals((cs) => cs.filter((c) => !grains.some((g) => g.id === c.id))),
      750,
    );
  };

  const resetBench = (vol = 500) => {
    stopHold();
    setBench({ mol: 0, vol });
    setCrystals([]);
  };

  const startCommissions = () => {
    const r = drawCommissions();
    setRounds(r);
    setRoundIdx(0);
    setResults([]);
    setRoundMsg(null);
    setFinished(false);
    setSoluteId(r[0].solute);
    resetBench(300);
  };

  const switchMode = (m: "practice" | "trial") => {
    if (m === mode) return;
    setMode(m);
    resetBench();
    if (m === "trial") startCommissions();
  };

  const commission = trial && !finished ? rounds[roundIdx] : undefined;

  const submit = () => {
    if (!commission || roundMsg) return;
    const diff = conc - commission.target;
    const ok = volumeML > 0 && Math.abs(diff) <= TOLERANCE;
    let text: string;
    if (ok) {
      text = `Sealed and labelled — ${conc.toFixed(3)} mol/L sits within ±${TOLERANCE.toFixed(2)} of the ${commission.target.toFixed(2)} M commission.`;
    } else if (volumeML <= 0) {
      text = "An empty beaker has no concentration at all — add water, then solute, and mix again.";
    } else if (diff < 0) {
      text = `Too dilute — you delivered ${conc.toFixed(3)} mol/L against ${commission.target.toFixed(2)} M. Evaporate some water or add solute, scoop by scoop.`;
      if (sediment > 1e-9)
        text += " Note the sediment: undissolved crystals on the bottom never count toward molarity — you are at this solute's solubility ceiling.";
    } else {
      text = `Too concentrated — ${conc.toFixed(3)} mol/L against ${commission.target.toFixed(2)} M. Add water to spread the same moles through more litres.`;
    }
    setRoundMsg({ ok, text });
    setResults((r) => [...r, ok]);
  };

  const nextRound = () => {
    if (roundIdx + 1 < rounds.length) {
      const idx = roundIdx + 1;
      setRoundIdx(idx);
      setRoundMsg(null);
      setSoluteId(rounds[idx].solute);
      resetBench(300);
    } else {
      const score = results.filter(Boolean).length;
      const stars = score >= 4 ? 3 : score === 3 ? 2 : score === 2 ? 1 : 0;
      setFinished(true);
      void recordTrial(uid, "solutions", { score, outOf: 4, stars });
    }
  };

  const score = results.filter(Boolean).length;
  const stars = score >= 4 ? 3 : score === 3 ? 2 : score === 2 ? 1 : 0;
  const best = profile?.trials?.["solutions"];

  const ViewToggle = (
    <div
      className="inline-flex rounded-full p-1"
      style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}
    >
      <button
        onClick={() => setParticles(false)}
        className="rounded-full px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition inline-flex items-center gap-1.5"
        style={!particles ? { background: `color-mix(in oklab, ${ACCENT} 18%, transparent)`, color: ACCENT } : { color: "var(--color-parchment)" }}
      >
        <Eye className="h-3.5 w-3.5" /> Colour
      </button>
      <button
        onClick={() => setParticles(true)}
        className="rounded-full px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition inline-flex items-center gap-1.5"
        style={particles ? { background: `color-mix(in oklab, ${ACCENT} 18%, transparent)`, color: ACCENT } : { color: "var(--color-parchment)" }}
      >
        <CircleDot className="h-3.5 w-3.5" /> Particles
      </button>
    </div>
  );

  return (
    <ModuleShell
      title="The Elixir Bench"
      eyebrow="Solutions & Molarity"
      icon={FlaskConical}
      accent={ACCENT}
      subtitle="Shake in solute, pour and evaporate water, and watch concentration — moles per litre — deepen the colour. Every solute has a solubility ceiling; past it, crystals pile on the bottom."
      right={ViewToggle}
    >
      {/* Configuration bar */}
      <div
        className="rounded-2xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-3 items-end"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Mode</div>
          <div className="flex gap-1.5">
            <button onClick={() => switchMode("practice")} className="rounded-full px-3 py-1 text-xs transition" style={pill(!trial)}>
              Free mixing
            </button>
            <button onClick={() => switchMode("trial")} className="rounded-full px-3 py-1 text-xs transition" style={pill(trial)}>
              <Trophy className="inline h-3 w-3 mr-1 -mt-0.5" />
              Potion Commission
            </button>
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">
            Solute {trial && !finished ? "(fixed by the commission)" : ""}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOLUTE_IDS.map((id) => (
              <button
                key={id}
                disabled={trial && !finished}
                onClick={() => {
                  setSoluteId(id);
                  resetBench(volumeML || 500);
                }}
                className="rounded-full px-3 py-1 text-xs transition disabled:opacity-40"
                style={pill(soluteId === id, SOLUTES[id].colourless ? ACCENT : SOLUTES[id].color)}
                title={`${SOLUTES[id].name} — dissolves up to ~${SOLUTES[id].solubilityPer100mL.toFixed(2)} mol per 100 mL at 20 °C`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5"
                  style={{ background: SOLUTES[id].dot, border: SOLUTES[id].colourless ? "1px solid var(--color-border)" : "none" }}
                />
                {SOLUTES[id].formula}
              </button>
            ))}
          </div>
        </div>
        {solute.colourless && !particles && (
          <p className="basis-full -mt-1 text-xs leading-relaxed" style={{ color: "var(--color-gold)" }}>
            ⚠ NaCl solutions are colourless at any strength — switch to the <em>particles view</em> (top right) to see its concentration.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 items-start">
        {/* Beaker */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <BeakerStage
            solute={solute}
            volumeML={volumeML}
            dissolved={dissolved}
            sediment={sediment}
            conc={conc}
            particles={particles}
            crystals={crystals}
          />
          <div className="text-center mt-2">
            <div className="font-display text-3xl" style={{ color: volumeML > 0 ? ACCENT : "var(--color-parchment)" }}>
              {volumeML > 0 ? `${conc.toFixed(2)} M` : "— M"}
            </div>
            <div className="text-xs text-parchment/60 mt-1">
              {volumeML.toFixed(0)} mL of water · {totalMol.toFixed(2)} mol of {solute.formula} added
            </div>
            {sediment > 1e-9 && (
              <div className="text-[11px] mt-1" style={{ color: "var(--color-gold)" }}>
                {sediment.toFixed(2)} mol undissolved on the bottom — past the ~{sat.toFixed(1)} mol/L solubility limit
              </div>
            )}
          </div>
        </div>

        {/* Controls + live values */}
        <div className="space-y-4">
          {/* Solute + water controls */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-2">Add solute</div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => scoop(SCOOP_MOL)} className="btn-arcane btn-arcane-hover text-sm">
                <Plus className="h-4 w-4" /> Scoop (0.01 mol)
              </button>
              <button onClick={() => scoop(SCOOP_MOL * 10)} className="btn-ghost-arcane text-xs">
                <Plus className="h-3.5 w-3.5" /> Big scoop (0.10 mol)
              </button>
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-2">Water — hold to pour</div>
            <div className="flex flex-wrap gap-2">
              <button
                onPointerDown={() => startHold(addWater)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                className="btn-ghost-arcane text-xs select-none touch-none"
              >
                <Droplets className="h-3.5 w-3.5" /> Add water
              </button>
              <button
                onPointerDown={() => startHold(evaporate)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                className="btn-ghost-arcane text-xs select-none touch-none"
              >
                <Sun className="h-3.5 w-3.5" /> Evaporate
              </button>
              <button
                onPointerDown={() => startHold(drain)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                className="btn-ghost-arcane text-xs select-none touch-none"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" /> Drain
              </button>
              <button onClick={() => resetBench()} className="btn-ghost-arcane text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            <p className="text-[11px] text-parchment/50 mt-3 leading-relaxed">
              Evaporating removes only water — the solute stays behind, so the elixir concentrates (and past the limit, crystals fall out).
              Draining removes finished solution — water <em>and</em> its dissolved solute together.
            </p>
          </div>

          {/* Computed values — the formula with live numbers substituted */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: `color-mix(in oklab, ${ACCENT} 7%, transparent)`,
              border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
            }}
          >
            <div className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: ACCENT }}>
              The ledger — molarity, live
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <div className="font-display text-xl text-spectral">{dissolved.toFixed(3)}</div>
                <div className="text-[10px] text-parchment/60 uppercase tracking-wider">mol dissolved (n)</div>
              </div>
              <div>
                <div className="font-display text-xl text-spectral">{volumeL.toFixed(3)}</div>
                <div className="text-[10px] text-parchment/60 uppercase tracking-wider">litres (V)</div>
              </div>
              <div>
                <div className="font-display text-xl" style={{ color: ACCENT }}>
                  {volumeML > 0 ? conc.toFixed(3) : "—"}
                </div>
                <div className="text-[10px] text-parchment/60 uppercase tracking-wider">mol/L (M)</div>
              </div>
            </div>
            <div
              className="rounded-lg px-3 py-2 text-center font-display text-sm"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)" }}
            >
              {volumeML > 0 ? (
                <>
                  M = n ÷ V = <span style={{ color: ACCENT }}>{dissolved.toFixed(3)} mol</span> ÷{" "}
                  <span style={{ color: ACCENT }}>{volumeL.toFixed(3)} L</span> ={" "}
                  <span className="text-gold">{conc.toFixed(3)} mol/L</span>
                </>
              ) : (
                <span className="text-parchment/60">M = n ÷ V — but V is 0. Pour some water first.</span>
              )}
            </div>
            {sediment > 1e-9 && (
              <p className="text-[11px] text-parchment/60 mt-2 leading-relaxed">
                Only the <em>dissolved</em> {dissolved.toFixed(3)} mol counts as n — the {sediment.toFixed(2)} mol of sediment sits outside the solution.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Trial panel */}
      {trial && (
        <div
          className="mt-6 rounded-2xl p-5"
          style={{
            background: "color-mix(in oklab, var(--color-gold) 6%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-[10px] tracking-[0.2em] uppercase font-display text-gold">Potion Commission</span>
            {!finished && rounds.length > 0 && (
              <span className="text-xs text-parchment/60">
                · round {Math.min(roundIdx + 1, 4)} of {rounds.length} · {score} sealed
              </span>
            )}
            {best && (
              <span className="ml-auto text-xs text-parchment/60 inline-flex items-center gap-1.5">
                Best: <span className="text-gold font-display">{best.best}/{best.outOf}</span> <Stars n={best.stars} /> ({best.plays}{" "}
                attempt{best.plays === 1 ? "" : "s"})
              </span>
            )}
          </div>

          {finished ? (
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Stars n={stars} />
                <span className="text-sm text-spectral">
                  {score === 4
                    ? "All four elixirs sealed to specification — a master's ledger."
                    : score === 3
                      ? "Three of four sealed — one client walked away unhappy."
                      : score === 2
                        ? "Two sealed — the bench needs a steadier hand."
                        : "The commissions defeated you this time — study the ledger and return."}
                </span>
                <span className="text-xs text-parchment/60">{score}/4 commissions delivered</span>
              </div>
              <button onClick={startCommissions} className="btn-arcane btn-arcane-hover text-sm">
                <RotateCcw className="h-4 w-4" /> Take new commissions
              </button>
            </div>
          ) : commission ? (
            <div>
              <p className="text-sm text-parchment leading-relaxed mb-3">
                A client requests <span className="text-gold font-display">{commission.target.toFixed(2)} M</span> of{" "}
                <span style={{ color: SOLUTES[commission.solute].colourless ? "var(--color-spectral)" : SOLUTES[commission.solute].dot }}>
                  {SOLUTES[commission.solute].formula}
                </span>{" "}
                ({SOLUTES[commission.solute].name}), tolerance ±{TOLERANCE.toFixed(2)} M. Mix it on the bench above, watch the probe, then
                deliver.
              </p>
              {roundMsg === null ? (
                <button onClick={submit} disabled={volumeML <= 0 && totalMol <= 0} className="btn-arcane btn-arcane-hover text-sm disabled:opacity-40">
                  Deliver the elixir ({volumeML > 0 ? `${conc.toFixed(3)} M` : "empty beaker"})
                </button>
              ) : (
                <div>
                  <p
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: roundMsg.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)" }}
                  >
                    {roundMsg.ok ? "✓ " : "✗ "}
                    {roundMsg.text}
                  </p>
                  <button onClick={nextRound} className="btn-arcane btn-arcane-hover text-sm">
                    {roundIdx + 1 < rounds.length ? "Next commission" : "Close the ledger"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="Molarity is crowding, not amount">
          Concentration asks <em>how crowded</em> the particles are, not how many you own:{" "}
          <span className="text-gold">M = moles of solute ÷ litres of solution</span>. Your beaker right now holds{" "}
          <span style={{ color: ACCENT }}>{dissolved.toFixed(3)} mol</span> in{" "}
          <span style={{ color: ACCENT }}>{volumeL.toFixed(3)} L</span>
          {volumeML > 0 ? (
            <>
              {" "}— that is <span className="text-gold">{conc.toFixed(2)} mol/L</span>
            </>
          ) : null}
          . Adding water changes M without touching n; flip to the particles view and watch the same dots spread thinner.
        </ConceptCard>
        <ConceptCard title="Every solute has a ceiling">
          Water can only pry apart so many crystals at a given temperature. At 20 °C, {solute.formula} dissolves up to about{" "}
          <span className="text-gold">{solute.solubilityPer100mL.toFixed(2)} mol per 100 mL</span> (~{sat.toFixed(1)} mol/L) — that is its{" "}
          <em>solubility</em>. Past it the solution is <em>saturated</em>: extra scoops just pile up as sediment, and evaporating water
          forces dissolved solute back out as crystals. Compare KMnO₄'s low ceiling (~0.4 M) with NiCl₂'s (~4.7 M).
        </ConceptCard>
        <DidYouKnow>
          The saline drip in every hospital IV bag is 0.154 M NaCl — "normal saline", 0.9 g of salt per 100 mL. That exact molarity
          matches the solute crowding of your own blood plasma, so red blood cells neither swell nor shrivel as it flows in.
        </DidYouKnow>
        <DidYouKnow>
          Potassium permanganate is so intensely purple that water-treatment plants dose it below 0.0001 M and it still tints the tank
          pink — which is why your KMnO₄ elixir hits full colour long before its solubility ceiling.
        </DidYouKnow>
      </div>
    </ModuleShell>
  );
}
