import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Droplets, Snowflake, Sparkles, Thermometer, Wind, X as XIcon } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/states")({
  component: () => (
    <RequireAuth>
      <States />
    </RequireAuth>
  ),
});

// ── Substances (real 1 atm data) ────────────────────────────────────────────
interface Substance {
  id: string;
  name: string;
  formula: string;
  accent: string;
  tMin: number;
  tMax: number;
  tDefault: number;
  step: number;
  /** Melting point in K. For a sublimer this IS the solid→gas point. */
  melt: number;
  /** Boiling point in K. Equal to `melt` for a sublimer. */
  boil: number;
  /** True when the substance skips the liquid phase at 1 atm. */
  sublimes?: boolean;
  /** Relative heat (arbitrary units) per heating-curve segment:
   *  [warm solid, melt, warm liquid, boil, warm gas] — or
   *  [warm solid, sublime, warm gas] for a sublimer. */
  curveQ: number[];
}

const SUBSTANCES: Substance[] = [
  { id: "water", name: "Water", formula: "H₂O", accent: "#38bdf8", tMin: 100, tMax: 500, tDefault: 293, step: 1, melt: 273, boil: 373, curveQ: [1.6, 1.1, 2.0, 4.2, 1.4] },
  { id: "co2", name: "Carbon dioxide", formula: "CO₂", accent: "#9aa7bd", tMin: 100, tMax: 350, tDefault: 150, step: 1, melt: 195, boil: 195, sublimes: true, curveQ: [1.6, 3.2, 2.0] },
  { id: "iron", name: "Iron", formula: "Fe", accent: "#f2a65a", tMin: 300, tMax: 3600, tDefault: 1000, step: 5, melt: 1811, boil: 3134, curveQ: [2.0, 1.0, 2.2, 3.4, 1.2] },
  { id: "nitrogen", name: "Nitrogen", formula: "N₂", accent: "#a855f7", tMin: 20, tMax: 150, tDefault: 50, step: 1, melt: 63, boil: 77, curveQ: [1.4, 0.9, 0.7, 2.6, 1.6] },
];

type Phase = "solid" | "liquid" | "gas";

function phaseOf(T: number, sub: Substance): Phase {
  if (T < sub.melt) return "solid";
  if (sub.sublimes || T >= sub.boil) return "gas";
  return "liquid";
}

const PHASE_META: Record<Phase, { label: string; color: string; icon: typeof Snowflake; blurb: string }> = {
  solid: { label: "Solid", color: "#7cc4fa", icon: Snowflake, blurb: "Particles locked in a lattice, vibrating in place." },
  liquid: { label: "Liquid", color: "#2dd4bf", icon: Droplets, blurb: "Particles touch but slide past one another." },
  gas: { label: "Gas", color: "#f2a65a", icon: Wind, blurb: "Particles fly free, bouncing off the walls." },
};

// ── Particle stage — one substance, three arrangements ──────────────────────
const N_PARTICLES = 60;
const LAT_COLS = 10;

function ParticleStage({ sim }: { sim: React.MutableRefObject<{ T: number; sub: Substance }> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    interface P { x: number; y: number; vx: number; vy: number; jm: number; jb: number }
    // Staggered per-particle melt/boil offsets (±5 K) make phase changes look
    // gradual — near a boundary, some particles break free before others.
    const parts: P[] = Array.from({ length: N_PARTICLES }, () => ({
      x: 0, y: 0, vx: 0, vy: 0,
      jm: (Math.random() - 0.5) * 10,
      jb: (Math.random() - 0.5) * 10,
    }));
    let seeded = false;
    let raf = 0;

    const draw = () => {
      const { T, sub } = sim.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const box = { x: 16, y: 16, w: W - 32, h: H - 32 };

      // Container walls
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 40%, transparent)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Lattice home positions (recomputed each frame → resize-proof).
      const sp = Math.min(box.w / (LAT_COLS + 1), 26);
      const latW = (LAT_COLS - 1) * sp + sp / 2;
      const x0 = box.x + (box.w - latW) / 2;
      const homeOf = (i: number) => {
        const col = i % LAT_COLS, row = Math.floor(i / LAT_COLS);
        return { hx: x0 + col * sp + (row % 2) * (sp / 2), hy: box.y + box.h - 10 - row * sp * 0.88 };
      };
      if (!seeded) {
        parts.forEach((p, i) => { const { hx, hy } = homeOf(i); p.x = hx; p.y = hy; });
        seeded = true;
      }

      // Soft pairwise repulsion keeps liquid particles from stacking.
      const rr = sp * 0.72;
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        const phaseA: Phase = T < sub.melt + a.jm ? "solid" : sub.sublimes || T >= sub.boil + a.jb ? "gas" : "liquid";
        if (phaseA !== "liquid") continue;
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d > 0.01 && d < rr) {
            const push = (rr - d) * 0.045;
            a.vx -= (dx / d) * push; a.vy -= (dy / d) * push;
            b.vx += (dx / d) * push; b.vy += (dy / d) * push;
          }
        }
      }

      parts.forEach((p, i) => {
        const phase: Phase = T < sub.melt + p.jm ? "solid" : sub.sublimes || T >= sub.boil + p.jb ? "gas" : "liquid";
        const { hx, hy } = homeOf(i);

        if (phase === "solid") {
          // Spring back to the lattice site + thermal jiggle scaling with T.
          const amp = 0.4 + 3.4 * Math.min(1, T / sub.melt);
          p.vx += (hx - p.x) * 0.08 + (Math.random() - 0.5) * amp * 0.7;
          p.vy += (hy - p.y) * 0.08 + (Math.random() - 0.5) * amp * 0.7;
          p.vx *= 0.82; p.vy *= 0.82;
          p.x += p.vx; p.y += p.vy;
        } else if (phase === "liquid") {
          // Gravity + jostle: cluster at the bottom, slide past each other.
          const warm = sub.sublimes ? 0.5 : Math.min(1, Math.max(0, (T - sub.melt) / Math.max(1, sub.boil - sub.melt)));
          p.vy += 0.14;
          p.vx += (Math.random() - 0.5) * (0.25 + warm * 0.55);
          p.vy += (Math.random() - 0.5) * (0.15 + warm * 0.35);
          p.vx *= 0.94; p.vy *= 0.94;
          p.x += p.vx; p.y += p.vy;
        } else {
          // Free flight with wall bounces (gas-laws motion model).
          const speed = 1.0 + Math.sqrt(T / Math.max(60, sub.boil)) * 1.6;
          let mag = Math.hypot(p.vx, p.vy);
          if (mag < 0.05) { // just boiled off — kick it into flight
            const a = Math.random() * Math.PI * 2;
            p.vx = Math.cos(a); p.vy = Math.sin(a) - 0.6;
            mag = 1;
          }
          p.x += (p.vx / mag) * speed;
          p.y += (p.vy / mag) * speed;
        }

        // Confine to the container.
        if (p.x <= box.x) { p.x = box.x; p.vx = Math.abs(p.vx); }
        if (p.x >= box.x + box.w) { p.x = box.x + box.w; p.vx = -Math.abs(p.vx); }
        if (p.y <= box.y) { p.y = box.y; p.vy = Math.abs(p.vy); }
        if (p.y >= box.y + box.h) { p.y = box.y + box.h; p.vy = -Math.abs(p.vy) * (phase === "liquid" ? 0.3 : 1); }

        const color = PHASE_META[phase].color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [sim]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight: 340 }} />;
}

// ── Heating curve — T vs heat added, with plateaus ──────────────────────────
interface Seg { q0: number; q1: number; T0: number; T1: number; label?: string }

function buildSegments(sub: Substance): Seg[] {
  const segs: Seg[] = [];
  let q = 0;
  const warm = (dq: number, T0: number, T1: number) => { segs.push({ q0: q, q1: q + dq, T0, T1 }); q += dq; };
  const plateau = (dq: number, Tp: number, label: string) => { segs.push({ q0: q, q1: q + dq, T0: Tp, T1: Tp, label }); q += dq; };
  if (sub.sublimes) {
    warm(sub.curveQ[0], sub.tMin, sub.melt);
    plateau(sub.curveQ[1], sub.melt, "subliming");
    warm(sub.curveQ[2], sub.melt, sub.tMax);
  } else {
    warm(sub.curveQ[0], sub.tMin, sub.melt);
    plateau(sub.curveQ[1], sub.melt, "melting");
    warm(sub.curveQ[2], sub.melt, sub.boil);
    plateau(sub.curveQ[3], sub.boil, "boiling");
    warm(sub.curveQ[4], sub.boil, sub.tMax);
  }
  return segs;
}

function heatOf(T: number, segs: Seg[]): number {
  for (const s of segs) {
    if (s.T1 === s.T0) { if (T <= s.T0) return s.q0; continue; }
    if (T <= s.T1) return s.q0 + (s.q1 - s.q0) * Math.max(0, T - s.T0) / (s.T1 - s.T0);
  }
  return segs[segs.length - 1].q1;
}

function tempOfHeat(q: number, segs: Seg[]): number {
  for (const s of segs) {
    if (q <= s.q1) {
      if (s.T1 === s.T0) return s.T0;
      return s.T0 + (s.T1 - s.T0) * Math.max(0, q - s.q0) / (s.q1 - s.q0);
    }
  }
  return segs[segs.length - 1].T1;
}

function HeatingCurve({ sub, T }: { sub: Substance; T: number }) {
  const segs = buildSegments(sub);
  const qTotal = segs[segs.length - 1].q1;
  const target = heatOf(T, segs);
  const [q, setQ] = useState(target);

  // Glide the marker toward the target heat — crossing a melt/boil point makes
  // it visibly traverse the plateau at constant temperature.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setQ((prev) => {
        const d = target - prev;
        return Math.abs(d) < qTotal / 600 ? target : prev + d * 0.08;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, qTotal]);

  const VW = 340, VH = 190, padL = 40, padR = 12, padT = 16, padB = 30;
  const x = (qq: number) => padL + (qq / qTotal) * (VW - padL - padR);
  const y = (tt: number) => padT + (1 - (tt - sub.tMin) / (sub.tMax - sub.tMin)) * (VH - padT - padB);

  const fullPts = [`${x(0)},${y(sub.tMin)}`];
  for (const s of segs) fullPts.push(`${x(s.q1)},${y(s.T1)}`);
  const donePts = [`${x(0)},${y(sub.tMin)}`];
  for (const s of segs) { if (s.q1 <= q) donePts.push(`${x(s.q1)},${y(s.T1)}`); else break; }
  donePts.push(`${x(q)},${y(tempOfHeat(q, segs))}`);

  const marks = sub.sublimes
    ? [{ t: sub.melt, name: `${sub.melt} K` }]
    : [{ t: sub.melt, name: `${sub.melt} K` }, { t: sub.boil, name: `${sub.boil} K` }];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Heating curve: temperature versus heat added">
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
      <line x1={padL} y1={VH - padB} x2={VW - padR} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
      <text x={(padL + VW - padR) / 2} y={VH - 8} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6">heat added →</text>
      <text x={12} y={(padT + VH - padB) / 2} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6" transform={`rotate(-90 12 ${(padT + VH - padB) / 2})`}>T (K)</text>

      {/* melt/boil guide lines */}
      {marks.map((m) => (
        <g key={m.t}>
          <line x1={padL} y1={y(m.t)} x2={VW - padR} y2={y(m.t)} stroke="var(--color-border)" strokeWidth="0.75" strokeDasharray="3 4" />
          <text x={padL - 4} y={y(m.t) + 3} textAnchor="end" fontSize="8.5" fill="var(--color-parchment)" opacity="0.7">{m.name}</text>
        </g>
      ))}

      {/* full curve (faint) + travelled portion (accent) */}
      <polyline points={fullPts.join(" ")} fill="none" stroke="var(--color-parchment)" strokeWidth="1.25" opacity="0.25" />
      <polyline points={donePts.join(" ")} fill="none" stroke={sub.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* plateau annotations */}
      {segs.filter((s) => s.label).map((s) => (
        <text key={s.label} x={(x(s.q0) + x(s.q1)) / 2} y={y(s.T0) - 5} textAnchor="middle" fontSize="8.5" fill="var(--color-gold)">
          {s.label}
        </text>
      ))}

      {/* live marker */}
      <circle cx={x(q)} cy={y(tempOfHeat(q, segs))} r="4.5" fill={sub.accent} stroke="var(--color-background)" strokeWidth="1.5" />
    </svg>
  );
}

// ── Temperature slider with melt/boil markers on the track ──────────────────
function TempSlider({ sub, T, onChange }: { sub: Substance; T: number; onChange: (v: number) => void }) {
  const pct = (t: number) => ((t - sub.tMin) / (sub.tMax - sub.tMin)) * 100;
  const marks = sub.sublimes
    ? [{ t: sub.melt, label: `sublimes ${sub.melt} K` }]
    : [{ t: sub.melt, label: `melts ${sub.melt} K` }, { t: sub.boil, label: `boils ${sub.boil} K` }];

  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${sub.accent} 28%, transparent)` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: sub.accent }}>
          <Thermometer className="h-3.5 w-3.5" /> Temperature
        </span>
        <span className="font-ui font-medium text-lg" style={{ color: sub.accent }}>
          {T.toFixed(0)} <span className="text-xs text-parchment/60">K</span>
          <span className="text-xs text-parchment/60 ml-2">({(T - 273.15).toFixed(0)} °C)</span>
        </span>
      </div>
      {/* melt/boil markers above the track */}
      <div className="relative h-7">
        {marks.map((m) => (
          <div key={m.t} className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(m.t)}%` }}>
            <span className="text-[9px] tracking-[0.08em] uppercase whitespace-nowrap text-parchment/60">{m.label}</span>
            <span className="w-px h-2.5" style={{ background: `color-mix(in oklab, ${sub.accent} 70%, transparent)` }} />
          </div>
        ))}
      </div>
      <input
        type="range"
        min={sub.tMin} max={sub.tMax} step={sub.step} value={T}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`Temperature of ${sub.name} in kelvin`}
        className="w-full accent-current"
        style={{ accentColor: sub.accent }}
      />
      <div className="flex justify-between text-[10px] text-parchment/50 mt-1">
        <span>{sub.tMin} K · cool</span>
        <span>heat · {sub.tMax} K</span>
      </div>
    </div>
  );
}

// ── Quick check — 3 questions, best run saved as the "states" trial ─────────
const QUIZ = [
  {
    q: "You hold water at 300 K (27 °C). Which phase is it in?",
    options: ["Solid — locked lattice", "Liquid — particles sliding", "Gas — free flight"],
    answer: 1,
  },
  {
    q: "Why does the heating curve go flat at a melting or boiling point?",
    options: [
      "The particles stop moving",
      "Energy is breaking attractions between particles, not raising temperature",
      "The thermometer stops working at phase changes",
    ],
    answer: 1,
  },
  {
    q: "Which substance never becomes a liquid at 1 atm?",
    options: ["Iron", "Carbon dioxide", "Nitrogen", "Water"],
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
      void recordTrial(uid, "states", { score: s, outOf: 3, stars: s });
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
            {score === 3 ? "Perfect — 3/3. The three phases hold no secrets from you." : `${score}/3 — revisit the sim above, then try again.`}
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
function States() {
  const { uid, profile } = useUserProfile();
  const [subId, setSubId] = useState("water");
  const sub = SUBSTANCES.find((s) => s.id === subId) ?? SUBSTANCES[0];
  const [T, setT] = useState(sub.tDefault);

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "states"); }, [uid]);

  const sim = useRef({ T, sub });
  useEffect(() => { sim.current = { T, sub }; }, [T, sub]);

  const changeSubstance = (id: string) => {
    const next = SUBSTANCES.find((s) => s.id === id) ?? SUBSTANCES[0];
    setSubId(id);
    setT(next.tDefault);
  };

  const phase = phaseOf(T, sub);
  const NEAR = 6;
  const changing = Math.abs(T - sub.melt) <= NEAR
    ? (sub.sublimes ? "subliming…" : "melting…")
    : !sub.sublimes && Math.abs(T - sub.boil) <= NEAR
      ? "boiling…"
      : null;
  const meta = PHASE_META[phase];
  const PhaseIcon = meta.icon;

  const SubstanceToggle = (
    <div className="inline-flex flex-wrap rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {SUBSTANCES.map((s) => (
        <button key={s.id} onClick={() => changeSubstance(s.id)}
          className="rounded-full px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition"
          style={subId === s.id ? { background: `color-mix(in oklab, ${s.accent} 18%, transparent)`, color: s.accent } : { color: "var(--color-parchment)" }}>
          {s.formula}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="States of Matter"
      eyebrow="Particle Theory"
      icon={Snowflake}
      accent="var(--color-teal)"
      subtitle="Heat and cool real substances and watch the same particles rearrange — lattice, cluster, free flight. The heating curve reveals where the energy really goes."
      right={SubstanceToggle}
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Simulation */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
          <ParticleStage sim={sim} />
          <div className="px-5 py-4 border-t flex items-center justify-center gap-3" style={{ borderColor: "var(--color-border)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${meta.color} 16%, transparent)`, color: meta.color }}>
              <PhaseIcon className="h-5 w-5" />
            </span>
            <div className="text-left">
              <div className="font-ui font-medium text-lg" style={{ color: meta.color }}>
                {sub.name} · {changing ?? meta.label}
              </div>
              <div className="text-xs text-parchment/70">
                {T.toFixed(0)} K ({(T - 273.15).toFixed(0)} °C) — {meta.blurb}
              </div>
            </div>
          </div>
        </div>

        {/* Controls + heating curve */}
        <div className="space-y-4">
          <TempSlider sub={sub} T={T} onChange={setT} />

          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Heating curve</span>
              <span className="text-[10px] text-parchment/50">flat = energy breaks bonds, not temperature</span>
            </div>
            <HeatingCurve key={sub.id} sub={sub} T={T} />
          </div>

          <div className="rounded-xl p-4 text-sm text-parchment leading-relaxed"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="text-teal font-ui font-medium">Observe:</span>{" "}
            {sub.sublimes
              ? "Carbon dioxide skips the liquid phase entirely at 1 atm — at 195 K the lattice breaks straight into gas. That's sublimation."
              : phase === "solid"
                ? "The particles can't leave their lattice sites — but heat them and the vibrations grow until the lattice shakes apart."
                : phase === "liquid"
                  ? "The particles still touch, but now they slide past each other. That's why liquids flow yet barely compress."
                  : "The particles have broken free of each other entirely — they fly until they hit a wall."}
          </div>
        </div>
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="One substance, three dances">
          Melting ice, liquid water and steam are the <em>same</em> H₂O particles — only their{" "}
          <span className="text-teal">arrangement and energy</span> change. Solids vibrate in a fixed lattice, liquids
          slide while touching, gases fly free. That's the whole of particle theory: phase is about{" "}
          <span className="text-gold">how particles move</span>, never what they are.
        </ConceptCard>
        <ConceptCard title="Where the plateau's energy goes">
          On the heating curve, temperature measures <em>average particle speed</em>. At a melt or boil point the added
          energy is spent <span className="text-gold">prying particles away from each other's attraction</span> — so the
          curve goes flat until every bond in the crowd is broken. Only then does the temperature climb again.
        </ConceptCard>
        <DidYouKnow>
          "Dry ice" is solid CO₂ — it never melts on stage; it <em>sublimes</em> at −78 °C, and the fog you see is water
          from the air condensing in the cold gas. Meanwhile blacksmiths work iron near 1811 K, and doctors ship vaccines
          in liquid nitrogen at just 77 K — the same physics, 1700 kelvin apart.
        </DidYouKnow>
        <DidYouKnow>
          Sweating works because of the boiling plateau's cousin: evaporating water steals the "bond-breaking" energy
          from your skin. That's also why a 100 °C steam burn is far worse than 100 °C water — the steam gives all that
          latent energy back when it condenses on you.
        </DidYouKnow>
      </div>

      <div className="mt-8">
        <QuickCheck uid={uid} best={profile?.trials?.["states"]} />
      </div>
    </ModuleShell>
  );
}
