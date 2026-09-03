import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Droplets,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Sparkles,
  Thermometer,
  Trophy,
  Wind,
  X as XIcon,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/forces")({
  component: () => (
    <RequireAuth>
      <Forces />
    </RequireAuth>
  ),
});

// ── The three intermolecular forces, weakest → strongest ────────────────────
type IMF = "ldf" | "dipole" | "hbond";

const IMF_META: Record<IMF, { label: string; short: string; color: string }> = {
  ldf: { label: "London dispersion", short: "LDF", color: "#9aa7bd" },
  dipole: { label: "Dipole–dipole", short: "Dipole", color: "#f2a65a" },
  hbond: { label: "Hydrogen bonding", short: "H-bond", color: "#38bdf8" },
};

// ── Substances (real 1 atm boiling points) ──────────────────────────────────
interface IMFSub {
  id: string;
  name: string;
  formula: string;
  accent: string;
  imf: IMF;
  /** Boiling point in K at 1 atm — the sim's "attractions lose" threshold. */
  bp: number;
  molarMass: number;
  polar: boolean;
  /** True only for water here — draws dashed H-bond bridges. */
  hbond?: boolean;
  /** Draw as an elongated capsule (octane) instead of a sphere. */
  long?: boolean;
  /** Visual radius in px at scale 1. */
  r: number;
  /** Relative pairwise attraction strength for the engine (0..1). */
  att: number;
  blurb: string;
}

const SUBSTANCES: IMFSub[] = [
  { id: "he", name: "Helium", formula: "He", accent: "#a78bfa", imf: "ldf", bp: 4, molarMass: 4.0, polar: false, r: 3.4, att: 0.25, blurb: "Two electrons, no dipole — the feeblest London forces in nature. It lets go at 4 K." },
  { id: "ch4", name: "Methane", formula: "CH₄", accent: "#34d399", imf: "ldf", bp: 112, molarMass: 16.04, polar: false, r: 5.2, att: 0.45, blurb: "Still nonpolar, but ten electrons make a bigger, squishier cloud than helium's — stronger LDF." },
  { id: "hcl", name: "Hydrogen chloride", formula: "HCl", accent: "#f2a65a", imf: "dipole", bp: 188, molarMass: 36.46, polar: true, r: 5.6, att: 0.65, blurb: "Chlorine hogs the shared electrons — a permanent δ+/δ− dipole lines molecules up head-to-tail." },
  { id: "h2o", name: "Water", formula: "H₂O", accent: "#38bdf8", imf: "hbond", bp: 373, molarMass: 18.02, polar: true, hbond: true, r: 5.2, att: 1.0, blurb: "H bonded to O — each molecule bridges to its neighbours with hydrogen bonds, the strongest IMF." },
  { id: "oct", name: "Octane", formula: "C₈H₁₈", accent: "#f472b6", imf: "ldf", bp: 399, molarMass: 114.23, polar: false, long: true, r: 4.6, att: 0.85, blurb: "Nonpolar — yet its huge 66-electron cloud makes LDF strong enough to out-boil even water." },
];

const T_MIN = 2;
const T_MAX = 450;

/** 0 = attractions have lost (gas), 1 = attractions fully winning. */
function cohesion(T: number, bp: number, jitter = 0): number {
  return Math.max(0, Math.min(1, (bp + jitter - T) / Math.max(15, bp * 0.18)));
}

// ── Molecule box — one substance, attraction vs temperature ─────────────────
const NEG_COLOR = "#ef6a6a"; // δ− lobe
const POS_COLOR = "#5b9cf6"; // δ+ lobe

function MoleculeBox({
  sub,
  sim,
  n = 26,
  minHeight = 320,
  scale = 1,
}: {
  sub: IMFSub;
  sim: React.MutableRefObject<{ T: number }>;
  n?: number;
  minHeight?: number;
  scale?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    interface M { x: number; y: number; vx: number; vy: number; ang: number; jb: number; parity: number }
    // Per-molecule ±3% boiling-point jitter → the box "boils" gradually, not
    // as one synchronized pop.
    const mols: M[] = Array.from({ length: n }, (_, i) => ({
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      ang: Math.random() * Math.PI * 2,
      jb: (Math.random() - 0.5) * 0.06 * sub.bp,
      parity: i % 2,
    }));
    let seeded = false;
    let raf = 0;
    const r = sub.r * scale;
    const contact = r * 2.1;
    const cutoff = contact * 2.6;

    const draw = () => {
      const T = sim.current.T;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pad = 10;
      const box = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };

      if (!seeded) {
        mols.forEach((m) => {
          m.x = box.x + r + Math.random() * (box.w - r * 2);
          m.y = box.y + box.h * 0.3 + Math.random() * (box.h * 0.65 - r);
        });
        seeded = true;
      }

      // Container walls
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 35%, transparent)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Pairwise forces: short-range repulsion (molecules don't overlap) +
      // IMF attraction that fades as T approaches the boiling point.
      for (let i = 0; i < mols.length; i++) {
        const a = mols[i];
        const ca = cohesion(T, sub.bp, a.jb);
        for (let j = i + 1; j < mols.length; j++) {
          const b = mols[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < contact) {
            const push = (contact - d) * 0.08;
            a.vx -= (dx / d) * push; a.vy -= (dy / d) * push;
            b.vx += (dx / d) * push; b.vy += (dy / d) * push;
          } else if (d < cutoff) {
            const c = Math.min(ca, cohesion(T, sub.bp, b.jb));
            if (c > 0) {
              const f = c * sub.att * 0.055 * (1 - d / cutoff);
              a.vx += (dx / d) * f; a.vy += (dy / d) * f;
              b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
            }
          }
        }
      }

      // Integrate: thermal kicks fight the attraction; condensed molecules pool.
      mols.forEach((m, i) => {
        const c = cohesion(T, sub.bp, m.jb);
        const amp = 0.06 + 0.5 * Math.sqrt(T / T_MAX);
        m.vx += (Math.random() - 0.5) * amp;
        m.vy += (Math.random() - 0.5) * amp;
        m.vy += 0.045 * c;
        const damp = c > 0.04 ? 0.94 : 0.985;
        m.vx *= damp; m.vy *= damp;
        const vmax = 1.1 + 2.3 * Math.sqrt(T / T_MAX);
        const sp = Math.hypot(m.vx, m.vy);
        if (sp > vmax) { m.vx *= vmax / sp; m.vy *= vmax / sp; }
        m.x += m.vx; m.y += m.vy;

        if (m.x <= box.x + r) { m.x = box.x + r; m.vx = Math.abs(m.vx); }
        if (m.x >= box.x + box.w - r) { m.x = box.x + box.w - r; m.vx = -Math.abs(m.vx); }
        if (m.y <= box.y + r) { m.y = box.y + r; m.vy = Math.abs(m.vy); }
        if (m.y >= box.y + box.h - r) { m.y = box.y + box.h - r; m.vy = -Math.abs(m.vy) * (c > 0.04 ? 0.35 : 1); }

        // Orientation: polar molecules swing their dipole toward the nearest
        // neighbour (alternating parity → rough head-to-tail δ+…δ− chains).
        if (sub.polar) {
          let bi = -1, bd = Infinity;
          for (let k = 0; k < mols.length; k++) {
            if (k === i) continue;
            const o = mols[k];
            const d = Math.hypot(o.x - m.x, o.y - m.y);
            if (d < bd) { bd = d; bi = k; }
          }
          if (bi >= 0 && bd < cutoff * 1.4 && c > 0.05) {
            const o = mols[bi];
            const target = Math.atan2(o.y - m.y, o.x - m.x) + (m.parity ? Math.PI : 0);
            let dAng = target - m.ang;
            while (dAng > Math.PI) dAng -= Math.PI * 2;
            while (dAng < -Math.PI) dAng += Math.PI * 2;
            m.ang += dAng * 0.08 * c;
          }
          m.ang += (Math.random() - 0.5) * 0.05 * (0.3 + T / T_MAX);
        } else if (sub.long) {
          m.ang += (Math.random() - 0.5) * 0.05 + m.vx * 0.002;
        }
      });

      // Hydrogen-bond bridges: dashed lines between close, slow water molecules.
      if (sub.hbond) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(125, 211, 252, 0.55)";
        for (let i = 0; i < mols.length; i++) {
          const a = mols[i];
          if (cohesion(T, sub.bp, a.jb) < 0.3) continue;
          for (let j = i + 1; j < mols.length; j++) {
            const b = mols[j];
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            const relV = Math.hypot(b.vx - a.vx, b.vy - a.vy);
            if (d < r * 4.4 && d > contact * 0.7 && relV < 1.4 && cohesion(T, sub.bp, b.jb) >= 0.3) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Draw molecules
      const glow = scale >= 1 ? 8 : 4;
      mols.forEach((m) => {
        if (sub.long) {
          // Octane: elongated capsule — the big electron cloud made visible.
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.ang);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 2.3, r * 0.95, 0, 0, Math.PI * 2);
          ctx.fillStyle = sub.accent;
          ctx.shadowColor = sub.accent;
          ctx.shadowBlur = glow;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        } else if (sub.polar) {
          // Two-tone lobes: δ− behind, δ+ ahead along the dipole axis.
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.ang);
          ctx.shadowColor = sub.accent;
          ctx.shadowBlur = glow;
          ctx.beginPath();
          ctx.arc(-r * 0.42, 0, r * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = NEG_COLOR;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(r * 0.42, 0, r * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = POS_COLOR;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2);
          ctx.strokeStyle = `color-mix(in oklab, ${sub.accent} 55%, transparent)`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
          ctx.fillStyle = sub.accent;
          ctx.shadowColor = sub.accent;
          ctx.shadowBlur = glow;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [sub, sim, n, scale]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight }} />;
}

// ── Temperature slider with boiling-point markers on the track ──────────────
function ForceTempSlider({
  T,
  onChange,
  accent,
  marks,
}: {
  T: number;
  onChange: (v: number) => void;
  accent: string;
  marks: { t: number; label: string; row?: number }[];
}) {
  const pct = (t: number) => ((t - T_MIN) / (T_MAX - T_MIN)) * 100;
  const twoRows = marks.some((m) => m.row === 1);
  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: accent }}>
          <Thermometer className="h-3.5 w-3.5" /> Temperature
        </span>
        <span className="font-ui font-medium text-lg" style={{ color: accent }}>
          {T.toFixed(0)} <span className="text-xs text-parchment/60">K</span>
          <span className="text-xs text-parchment/60 ml-2">({(T - 273.15).toFixed(0)} °C)</span>
        </span>
      </div>
      <div className="relative" style={{ height: twoRows ? 40 : 28 }}>
        {marks.map((m) => (
          <div key={m.t} className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `min(max(${pct(m.t)}%, 14px), calc(100% - 14px))` }}>
            <span className="text-[9px] tracking-[0.08em] uppercase whitespace-nowrap text-parchment/60" style={{ marginBottom: m.row === 1 ? 12 : 0 }}>
              {m.label}
            </span>
            <span className="w-px" style={{ height: m.row === 1 ? 22 : 10, background: `color-mix(in oklab, ${accent} 70%, transparent)`, marginTop: m.row === 1 ? -12 : 0 }} />
          </div>
        ))}
      </div>
      <input
        type="range"
        min={T_MIN} max={T_MAX} step={1} value={T}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label="Temperature in kelvin"
        className="w-full accent-current"
        style={{ accentColor: accent }}
      />
      <div className="flex justify-between text-[10px] text-parchment/50 mt-1">
        <span>{T_MIN} K · attractions win</span>
        <span>thermal motion wins · {T_MAX} K</span>
      </div>
    </div>
  );
}

function IMFBadge({ imf }: { imf: IMF }) {
  const meta = IMF_META[imf];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.12em] uppercase"
      style={{ color: meta.color, border: `1px solid color-mix(in oklab, ${meta.color} 45%, transparent)`, background: `color-mix(in oklab, ${meta.color} 12%, transparent)` }}>
      <Magnet className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function PolarityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-parchment/70">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: NEG_COLOR }} /> δ− pole
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: POS_COLOR }} /> δ+ pole
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-5 border-t border-dashed" style={{ borderColor: "rgba(125,211,252,0.8)" }} /> hydrogen bond
      </span>
    </div>
  );
}

// ── Boiling-point race — five boxes, one climbing temperature ───────────────
function BoilRace() {
  const [T, setT] = useState(T_MIN);
  const [playing, setPlaying] = useState(false);
  const sim = useRef({ T: T_MIN });
  useEffect(() => { sim.current.T = T; }, [T]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setT((prev) => Math.min(T_MAX, prev + 0.55));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => { if (T >= T_MAX && playing) setPlaying(false); }, [T, playing]);

  const ranked = [...SUBSTANCES].sort((a, b) => a.bp - b.bp);
  const boiledCount = ranked.filter((s) => T >= s.bp).length;

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> The boiling-point race
          </p>
          <p className="text-sm text-parchment/70 mt-1">
            One shared heat source, five substances. The weakest grip lets go first — watch stronger forces boil later.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
            style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)", color: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 10%, transparent)" }}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : T >= T_MAX ? "Resume" : "Heat it up"}
          </button>
          <button
            onClick={() => { setPlaying(false); setT(T_MIN); }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-[0.12em] uppercase transition text-parchment/70"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <ForceTempSlider
        T={T}
        onChange={(v) => { setPlaying(false); setT(v); }}
        accent="var(--color-gold)"
        marks={[
          { t: 4, label: "He" },
          { t: 112, label: "CH₄", row: 1 },
          { t: 188, label: "HCl" },
          { t: 373, label: "H₂O", row: 1 },
          { t: 399, label: "C₈H₁₈" },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SUBSTANCES.map((s) => {
          const boiled = T >= s.bp;
          return (
            <div key={s.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid color-mix(in oklab, ${s.accent} ${boiled ? 55 : 25}%, transparent)`, background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)" }}>
              <div className="flex items-center justify-between px-2.5 pt-2">
                <span className="font-ui font-medium text-sm" style={{ color: s.accent }}>{s.formula}</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] tracking-[0.14em] uppercase"
                  style={boiled
                    ? { color: "var(--color-crimson)", background: "color-mix(in oklab, var(--color-crimson) 14%, transparent)" }
                    : { color: "var(--color-teal)", background: "color-mix(in oklab, var(--color-teal) 12%, transparent)" }}>
                  {boiled ? <Wind className="h-2.5 w-2.5" /> : <Droplets className="h-2.5 w-2.5" />}
                  {boiled ? "Gas" : "Liquid"}
                </span>
              </div>
              <MoleculeBox sub={s} sim={sim} n={10} minHeight={130} scale={0.72} />
              <div className="px-2.5 pb-2 text-[10px] text-parchment/60">bp {s.bp} K · {IMF_META[s.imf].short}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-4" style={{ border: "1px solid var(--color-border)", background: "color-mix(in oklab, var(--color-slate-sunken) 45%, transparent)" }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/60 mb-2">
          Boiling order — weakest attractions go first ({boiledCount}/5 boiled)
        </p>
        <ol className="flex flex-wrap gap-x-5 gap-y-1.5">
          {ranked.map((s, i) => {
            const boiled = T >= s.bp;
            return (
              <li key={s.id} className="flex items-center gap-1.5 text-sm" style={{ color: boiled ? s.accent : "color-mix(in oklab, var(--color-parchment) 45%, transparent)" }}>
                <span className="font-ui font-medium">{i + 1}.</span> {s.formula}
                {boiled
                  ? <span className="text-xs">— boiled at {s.bp} K</span>
                  : <span className="text-xs italic">— holding on</span>}
                {boiled && <Check className="h-3.5 w-3.5" />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ── Comparison panel — any two substances side by side ──────────────────────
const WHY: Record<string, string> = {
  "ch4|h2o": "Nearly the same molar mass (16 vs 18 g/mol) — yet water boils 261 K higher. That entire gap is hydrogen bonding.",
  "ch4|he": "Both are nonpolar with only LDF, but methane's ten-electron cloud distorts far more easily than helium's two — stronger flickering dipoles, stronger grip.",
  "ch4|hcl": "Similar-sized molecules, but HCl stacks a permanent dipole on top of its LDF — the extra attraction lifts its boiling point by 76 K.",
  "ch4|oct": "Both are nonpolar, but octane's bigger electron cloud makes stronger London forces — same force type, 287 K apart. Size matters.",
  "h2o|hcl": "Both are polar, but only water has H bonded directly to O — true hydrogen bonds, far stronger than HCl's ordinary dipole–dipole.",
  "h2o|he": "The two extremes: helium's feeble LDF let go at 4 K, while water's hydrogen-bond network holds all the way to 373 K.",
  "h2o|oct": "Octane's massive 66-electron cloud gives LDF that just edges out water's hydrogen bonds — but tiny 18 g/mol water reaching 373 K is the real marvel.",
  "hcl|he": "HCl's permanent dipole (plus many more electrons) grips its neighbours in a way helium's tiny, symmetric cloud never can.",
  "hcl|oct": "Octane has no dipole at all — yet sheer LDF from 66 electrons out-pulls polar HCl. Enough size can beat polarity.",
  "he|oct": "The same force, wildly different size: 2 electrons versus 66. London forces scale with the electron cloud — 4 K versus 399 K.",
};

function SubSelect({ value, onChange, exclude }: { value: string; onChange: (id: string) => void; exclude?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Choose a substance to compare"
      className="rounded-lg px-3 py-1.5 text-sm w-full"
      style={{ background: "var(--color-slate-sunken)", color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}
    >
      {SUBSTANCES.map((s) => (
        <option key={s.id} value={s.id} disabled={s.id === exclude}>
          {s.formula} — {s.name}
        </option>
      ))}
    </select>
  );
}

function CompareCard({ sub }: { sub: IMFSub }) {
  return (
    <div className="rounded-xl p-4 space-y-2.5" style={{ border: `1px solid color-mix(in oklab, ${sub.accent} 35%, transparent)`, background: `color-mix(in oklab, ${sub.accent} 6%, transparent)` }}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-display text-2xl" style={{ color: sub.accent }}>{sub.formula}</span>
        <span className="text-sm text-parchment/70">{sub.name}</span>
      </div>
      <IMFBadge imf={sub.imf} />
      <div className="flex items-center gap-2 text-sm text-parchment">
        <Scale className="h-3.5 w-3.5 text-parchment/50" />
        {sub.molarMass.toFixed(2)} g/mol
      </div>
      <div className="text-sm text-parchment">
        Boils at <span className="font-ui font-medium" style={{ color: sub.accent }}>{sub.bp} K</span>
        <span className="text-parchment/60"> ({(sub.bp - 273.15).toFixed(0)} °C)</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-parchment) 12%, transparent)" }}>
        <div className="h-full rounded-full" style={{ width: `${(sub.bp / T_MAX) * 100}%`, background: sub.accent }} />
      </div>
      <p className="text-xs text-parchment/70 leading-relaxed">{sub.blurb}</p>
    </div>
  );
}

function ComparePanel() {
  const [aId, setAId] = useState("ch4");
  const [bId, setBId] = useState("oct");
  const a = SUBSTANCES.find((s) => s.id === aId) ?? SUBSTANCES[0];
  const b = SUBSTANCES.find((s) => s.id === bId) ?? SUBSTANCES[1];
  const why = WHY[[aId, bId].sort().join("|")];

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="text-[10px] tracking-[0.2em] uppercase text-gold">Compare two substances — why does one boil higher?</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <SubSelect value={aId} onChange={setAId} exclude={bId} />
          <CompareCard sub={a} />
        </div>
        <div className="space-y-2">
          <SubSelect value={bId} onChange={setBId} exclude={aId} />
          <CompareCard sub={b} />
        </div>
      </div>
      {why && (
        <div className="rounded-xl px-4 py-3 text-sm text-parchment leading-relaxed" style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)", background: "color-mix(in oklab, var(--color-gold) 7%, transparent)" }}>
          <span className="text-gold font-ui font-medium">Why: </span>{why}
        </div>
      )}
    </div>
  );
}

// ── Quick check — 3 questions, best run saved as the "forces" trial ─────────
const QUIZ = [
  {
    q: "CH₄ (16 g/mol) and H₂O (18 g/mol) have almost the same molar mass. Which boils at a higher temperature?",
    options: [
      "CH₄ — lighter molecules always boil higher",
      "H₂O — its hydrogen bonds take far more energy to overcome",
      "They boil at nearly the same temperature",
    ],
    answer: 1,
  },
  {
    q: "A molecule has a permanent δ+ end and δ− end, but no H bonded to N, O or F. Its strongest intermolecular force is…",
    options: ["London dispersion only", "Dipole–dipole", "Hydrogen bonding"],
    answer: 1,
  },
  {
    q: "When water boils, what actually breaks?",
    options: [
      "The O–H covalent bonds inside each molecule",
      "The hydrogen bonds BETWEEN molecules — each H₂O stays intact",
      "Both — steam is loose H and O atoms",
    ],
    answer: 1,
  },
];

function QuickCheck({ uid, best }: { uid: string | null; best?: { best: number; outOf: number } }) {
  const [picked, setPicked] = useState<(number | null)[]>(QUIZ.map(() => null));
  const recorded = useRef(false);

  const done = picked.every((p) => p !== null);
  const score = picked.filter((p, i) => p === QUIZ[i].answer).length;

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return; // one attempt per question
    const next = [...picked];
    next[qi] = oi;
    setPicked(next);
    if (next.every((p) => p !== null) && !recorded.current) {
      recorded.current = true;
      const s = next.filter((p, i) => p === QUIZ[i].answer).length;
      void recordTrial(uid, "forces", { score: s, outOf: 3, stars: s });
    }
  };

  const retry = () => { setPicked(QUIZ.map(() => null)); recorded.current = false; };

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] tracking-[0.2em] uppercase text-gold">Quick check — seal your knowledge</p>
        {best && (
          <span className="text-xs text-parchment/70">
            Best: <span className="text-gold font-ui font-medium">{best.best}/{best.outOf}</span>{" "}
            {"★".repeat(Math.max(0, Math.min(3, best.best)))}
          </span>
        )}
      </div>
      {QUIZ.map((item, qi) => (
        <div key={qi} className="rounded-xl border border-parchment/10 bg-slate-sunken/50 p-4">
          <p className="mb-3 text-sm font-medium text-parchment">{qi + 1}. {item.q}</p>
          <div className="flex flex-wrap gap-2">
            {item.options.map((opt, oi) => {
              const chosen = picked[qi] === oi;
              const isAnswer = oi === item.answer;
              const revealed = picked[qi] !== null;
              const color = revealed && isAnswer ? "var(--color-emerald-elixir)" : chosen ? "var(--color-crimson)" : "var(--color-parchment)";
              return (
                <button
                  key={oi}
                  onClick={() => pick(qi, oi)}
                  disabled={revealed}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition disabled:cursor-default"
                  style={{
                    color,
                    border: `1px solid color-mix(in oklab, ${color} ${revealed && (isAnswer || chosen) ? "55%" : "25%"}, transparent)`,
                    background: revealed && isAnswer
                      ? "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)"
                      : chosen
                        ? "color-mix(in oklab, var(--color-crimson) 12%, transparent)"
                        : "transparent",
                  }}
                >
                  {revealed && isAnswer && <Check className="h-3.5 w-3.5" />}
                  {revealed && chosen && !isAnswer && <XIcon className="h-3.5 w-3.5" />}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {done && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="flex items-center gap-2 text-sm" style={{ color: score === 3 ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
            <Sparkles className="h-4 w-4" />
            {score === 3 ? "Perfect — 3/3. The invisible bonds are invisible to you no longer." : `${score}/3 — watch the race again, then try once more.`}
          </p>
          <button onClick={retry} className="rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
            style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)", color: "var(--color-gold)" }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
function Forces() {
  const { uid, profile } = useUserProfile();
  const [subId, setSubId] = useState("h2o");
  const sub = SUBSTANCES.find((s) => s.id === subId) ?? SUBSTANCES[3];
  const [T, setT] = useState(293);

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "forces"); }, [uid]);

  const sim = useRef({ T });
  useEffect(() => { sim.current.T = T; }, [T]);

  const boiled = T >= sub.bp;

  const SubstanceToggle = (
    <div className="inline-flex flex-wrap rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {SUBSTANCES.map((s) => (
        <button key={s.id} onClick={() => setSubId(s.id)}
          className="rounded-full px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition"
          style={subId === s.id ? { background: `color-mix(in oklab, ${s.accent} 18%, transparent)`, color: s.accent } : { color: "var(--color-parchment)" }}>
          {s.formula}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Invisible Bonds"
      eyebrow="Intermolecular Forces"
      icon={Magnet}
      accent="var(--color-wraith)"
      subtitle="Every liquid is a tug-of-war: attractions between molecules versus the heat trying to shake them apart. See the three grips — London dispersion, dipole–dipole, hydrogen bonding — and watch who boils first."
      right={SubstanceToggle}
    >
      {/* Attraction stage */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
          <MoleculeBox sub={sub} sim={sim} n={26} minHeight={340} />
          <div className="px-5 py-4 border-t flex items-center justify-center gap-3" style={{ borderColor: "var(--color-border)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${sub.accent} 16%, transparent)`, color: sub.accent }}>
              {boiled ? <Wind className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
            </span>
            <div className="text-left">
              <div className="font-ui font-medium text-lg" style={{ color: sub.accent }}>
                {sub.name} · {boiled ? "Gas — thermal motion won" : "Condensed — attractions winning"}
              </div>
              <div className="text-xs text-parchment/70">
                {IMF_META[sub.imf].label} · boils at {sub.bp} K ({(sub.bp - 273.15).toFixed(0)} °C)
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ForceTempSlider T={T} onChange={setT} accent={sub.accent} marks={[{ t: sub.bp, label: `boils ${sub.bp} K` }]} />

          <div className="rounded-xl p-4 space-y-2" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <IMFBadge imf={sub.imf} />
              <span className="text-xs text-parchment/60">{sub.molarMass.toFixed(2)} g/mol</span>
            </div>
            <p className="text-sm text-parchment leading-relaxed">{sub.blurb}</p>
            <PolarityLegend />
          </div>

          <div className="rounded-xl p-4 text-sm text-parchment leading-relaxed"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="text-wraith font-ui font-medium">Observe:</span>{" "}
            {boiled
              ? "Above the boiling point the thermal kicks overpower the attractions — the molecules scatter and fill the box. Each molecule is still whole; only the grips between them broke."
              : sub.polar
                ? "Watch the two-tone molecules swivel: δ+ ends seek δ− ends of their neighbours. That orientation IS the dipole attraction — and it's what the heat must overcome."
                : "Even with no permanent poles, the molecules cluster — flickering, instantaneous dipoles (London forces) pull them together until heat shakes them free."}
          </div>
        </div>
      </div>

      {/* Boiling-point race */}
      <div className="mt-8">
        <BoilRace />
      </div>

      {/* Comparison panel */}
      <div className="mt-8">
        <ComparePanel />
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="London dispersion — the universal whisper">
          Electrons slosh; for an instant one side of any molecule goes slightly δ−, nudging its neighbour into a
          matching dipole. These <span className="text-gold">flickering, instantaneous attractions</span> are the
          weakest IMF — but every substance has them, and they <em>grow with the size of the electron cloud</em>.
          That's why octane (66 electrons) out-boils helium (2) by almost 400 K with the very same force.
        </ConceptCard>
        <ConceptCard title="Dipole–dipole — the permanent handshake">
          When one atom hogs the shared electrons, the molecule keeps a <span className="text-gold">permanent δ+ and
          δ− end</span>. Neighbours align head-to-tail — plus attracts minus — adding a steady grip on top of the LDF
          everyone already has. HCl boils 76 K above similar-sized methane for exactly this reason.
        </ConceptCard>
        <ConceptCard title="Hydrogen bonding — the strongest grip">
          H bonded to N, O or F is stripped nearly bare of electrons — a tiny, intense δ+ that plugs straight into a
          lone pair on a neighbour. This is the <span className="text-gold">strongest of the three IMFs</span> (though
          still ~10× weaker than a covalent bond). It's why little water out-boils much heavier molecules.
        </ConceptCard>
        <ConceptCard title="BETWEEN molecules, not WITHIN them">
          The classic trap: <em>intermolecular forces are attractions BETWEEN whole molecules; covalent bonds are
          WITHIN a molecule.</em> Boiling water breaks <span className="text-gold">hydrogen bonds between
          H₂O molecules</span> — never the O–H bonds inside them. Steam is still H₂O, molecule for molecule.
          Melting and boiling are IMF stories; chemical reactions are bond stories.
        </ConceptCard>
        <DidYouKnow>
          Geckos climb glass using nothing but London dispersion forces. Millions of microscopic hair tips (spatulae)
          get so close to the surface that their feeble LDF, summed, can hold the gecko's whole body — no glue, no
          suction. Researchers copied the trick to make reusable "gecko tape".
        </DidYouKnow>
        <DidYouKnow>
          Water's hydrogen bonds are why life works: they keep water liquid across Earth's temperatures, make ice float
          so lakes don't freeze solid, pull water up tree trunks against gravity — and hold the two strands of your DNA
          together gently enough to be unzipped when a cell needs to read them.
        </DidYouKnow>
      </div>

      <div className="mt-8">
        <QuickCheck uid={uid} best={profile?.trials?.["forces"]} />
      </div>
    </ModuleShell>
  );
}
