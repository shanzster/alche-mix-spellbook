import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity, Check, FlaskConical, Hammer, RotateCcw, Sparkles, Thermometer,
  Wand2, X as XIcon, Zap,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/rates")({
  component: () => (
    <RequireAuth>
      <Rates />
    </RequireAuth>
  ),
});

/*
  Reaction Rates — collision theory made visible.
  A (crimson) + B (azure) → C (gold), but only when an A–B collision carries
  more energy (relative speed) than the activation barrier. Every rate factor
  the syllabus names is a control the student can push: temperature (speeds),
  concentration (counts), catalyst (barrier drops), surface area (block vs
  powder). Illustrative engine, honest chemistry.
*/

// ── Tunables (relative-speed units — illustrative, not research physics) ────
const EA_BASE = 2.6; // activation threshold, uncatalysed
const EA_CAT = 1.5;  // with catalyst — same reaction, lower barrier
const T_MIN = 100, T_MAX = 900, T_DEFAULT = 300;
const N_MIN = 5, N_MAX = 50, NA_DEFAULT = 20, NB_DEFAULT = 20;
const RADIUS = 4;          // particle draw/collision radius (px)
const RATE_WINDOW = 2000;  // ms window for the reactions-per-second readout

const COLOR_A = "#f26d6d"; // reactant A
const COLOR_B = "#5aa9f7"; // reactant B
const COLOR_C = "#f2c14e"; // product C (gold)

/** Mean particle speed factor at temperature T (px/frame, before per-particle spread). */
const speedAt = (T: number) => 0.5 + 1.7 * Math.sqrt(T / 300);
const eaOf = (catalyst: boolean) => (catalyst ? EA_CAT : EA_BASE);

type Surface = "powder" | "block";

interface Controls {
  T: number;
  nA: number;
  nB: number;
  catalyst: boolean;
  surface: Surface;
  /** Bumped by the parent to rebuild the population (counts/surface/reset). */
  resetToken: number;
}

interface Stats {
  reacted: number;
  /** Reactions possible this run = min(nA, nB) at seed time. */
  pairs: number;
  /** Timestamps (performance.now) of recent reactions, pruned to RATE_WINDOW·2. */
  events: number[];
}

// ── Collision stage ─────────────────────────────────────────────────────────
function CollisionStage({ ctl, stats }: {
  ctl: React.MutableRefObject<Controls>;
  stats: React.MutableRefObject<Stats>;
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

    interface P {
      x: number; y: number;
      vx: number; vy: number;    // direction (normalised on use)
      m: number;                 // per-particle speed spread — a crude Maxwell–Boltzmann
      kind: "A" | "B" | "C";
      fixed?: boolean;           // block-mode B: locked in the solid lattice
      gc?: number; gr?: number;  // lattice cell (block mode)
      dead?: boolean;
    }
    interface Flash { x: number; y: number; t: number }

    let parts: P[] = [];
    const flashes: Flash[] = [];
    let lastToken = -1;
    let raf = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const spawnDir = (p: P) => { const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a); p.vy = Math.sin(a); };

    const seed = () => {
      const { nA, nB, surface } = ctl.current;
      const W = canvas.width, H = canvas.height;
      const box = { x: 16, y: 16, w: W - 32, h: H - 32 };
      parts = [];
      for (let i = 0; i < nA; i++) {
        const p: P = { x: rand(box.x + 8, box.x + box.w * 0.45), y: rand(box.y + 8, box.y + box.h - 8), vx: 0, vy: 0, m: rand(0.6, 1.45), kind: "A" };
        spawnDir(p);
        parts.push(p);
      }
      if (surface === "powder") {
        for (let i = 0; i < nB; i++) {
          const p: P = { x: rand(box.x + box.w * 0.55, box.x + box.w - 8), y: rand(box.y + 8, box.y + box.h - 8), vx: 0, vy: 0, m: rand(0.6, 1.45), kind: "B" };
          spawnDir(p);
          parts.push(p);
        }
      } else {
        // One solid lump: a compact lattice in the right half. Only its surface
        // (cells with an empty neighbour) can ever be hit hard enough to react.
        const cols = Math.ceil(Math.sqrt(nB));
        const rows = Math.ceil(nB / cols);
        const cell = RADIUS * 2 + 2;
        const bx = box.x + box.w * 0.68 - (cols * cell) / 2;
        const by = box.y + box.h / 2 - (rows * cell) / 2;
        for (let i = 0; i < nB; i++) {
          const gc = i % cols, gr = Math.floor(i / cols);
          parts.push({ x: bx + gc * cell, y: by + gr * cell, vx: 0, vy: 0, m: rand(0.6, 1.45), kind: "B", fixed: true, gc, gr });
        }
      }
      stats.current.reacted = 0;
      stats.current.pairs = Math.min(nA, nB);
      stats.current.events = [];
    };

    /** In block mode, a lattice B is exposed when any 4-neighbour cell is empty. */
    const isExposed = (b: P, occupied: Set<string>) => {
      if (!b.fixed) return true;
      const { gc = 0, gr = 0 } = b;
      return (
        !occupied.has(`${gc - 1},${gr}`) || !occupied.has(`${gc + 1},${gr}`) ||
        !occupied.has(`${gc},${gr - 1}`) || !occupied.has(`${gc},${gr + 1}`)
      );
    };

    const draw = () => {
      const { T, catalyst } = ctl.current;
      if (ctl.current.resetToken !== lastToken) { lastToken = ctl.current.resetToken; seed(); }

      const W = canvas.width, H = canvas.height;
      const box = { x: 16, y: 16, w: W - 32, h: H - 32 };
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 40%, transparent)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      const sf = speedAt(T);
      const ea = eaOf(catalyst);
      const now = performance.now();

      // Move everything that isn't locked in the solid.
      for (const p of parts) {
        if (p.dead || p.fixed) continue;
        const mag = Math.hypot(p.vx, p.vy) || 1;
        const s = sf * p.m;
        p.x += (p.vx / mag) * s;
        p.y += (p.vy / mag) * s;
        if (p.x <= box.x + RADIUS) { p.x = box.x + RADIUS; p.vx = Math.abs(p.vx); }
        if (p.x >= box.x + box.w - RADIUS) { p.x = box.x + box.w - RADIUS; p.vx = -Math.abs(p.vx); }
        if (p.y <= box.y + RADIUS) { p.y = box.y + RADIUS; p.vy = Math.abs(p.vy); }
        if (p.y >= box.y + box.h - RADIUS) { p.y = box.y + box.h - RADIUS; p.vy = -Math.abs(p.vy); }
      }

      const occupied = new Set<string>();
      for (const p of parts) if (!p.dead && p.fixed) occupied.add(`${p.gc},${p.gr}`);

      const As = parts.filter((p) => !p.dead && p.kind === "A");
      const Bs = parts.filter((p) => !p.dead && p.kind === "B");
      const Cs = parts.filter((p) => !p.dead && p.kind === "C");
      const D2 = (RADIUS * 2) ** 2;

      // A–B encounters: react past the barrier, otherwise bounce apart.
      for (const a of As) {
        if (a.dead) continue;
        for (const b of Bs) {
          if (b.dead || a.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          if (dx * dx + dy * dy > D2) continue;
          const d = Math.hypot(dx, dy) || 1;
          const nx = dx / d, ny = dy / d;

          // True velocities (direction × speed) → relative speed = collision energy.
          const am = Math.hypot(a.vx, a.vy) || 1;
          const avx = (a.vx / am) * sf * a.m, avy = (a.vy / am) * sf * a.m;
          let bvx = 0, bvy = 0;
          if (!b.fixed) {
            const bm = Math.hypot(b.vx, b.vy) || 1;
            bvx = (b.vx / bm) * sf * b.m; bvy = (b.vy / bm) * sf * b.m;
          }
          const rel = Math.hypot(avx - bvx, avy - bvy);

          if (rel >= ea && isExposed(b, occupied)) {
            // Fuse into product C — a brief golden flash marks the event.
            a.dead = true; b.dead = true;
            if (b.fixed) occupied.delete(`${b.gc},${b.gr}`);
            const c: P = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: 0, m: rand(0.6, 1.2), kind: "C" };
            spawnDir(c);
            parts.push(c);
            flashes.push({ x: c.x, y: c.y, t: 1 });
            stats.current.reacted += 1;
            stats.current.events.push(now);
          } else {
            // Not enough energy — bounce off each other. Only reflect a particle
            // still moving toward the other, so separating pairs don't re-stick.
            a.x -= nx * (RADIUS * 2 - d) * 0.6; a.y -= ny * (RADIUS * 2 - d) * 0.6;
            const dot = a.vx * nx + a.vy * ny;
            if (dot > 0) { a.vx -= 2 * dot * nx; a.vy -= 2 * dot * ny; }
            if (!b.fixed) {
              const dotB = b.vx * nx + b.vy * ny;
              if (dotB < 0) { b.vx -= 2 * dotB * nx; b.vy -= 2 * dotB * ny; }
            }
          }
        }
      }

      // Product C bounces off the remaining solid lump so it can't fly through it.
      for (const c of Cs) {
        for (const b of Bs) {
          if (b.dead || !b.fixed) continue;
          const dx = c.x - b.x, dy = c.y - b.y;
          if (dx * dx + dy * dy > D2) continue;
          const d = Math.hypot(dx, dy) || 1;
          const nx = dx / d, ny = dy / d;
          c.x += nx * (RADIUS * 2 - d); c.y += ny * (RADIUS * 2 - d);
          const dot = c.vx * nx + c.vy * ny;
          c.vx -= 2 * dot * nx; c.vy -= 2 * dot * ny;
        }
      }

      // Prune old rate events (keep a little slack beyond the readout window).
      const cutoff = now - RATE_WINDOW * 2;
      while (stats.current.events.length && stats.current.events[0] < cutoff) stats.current.events.shift();

      // Draw particles. Buried block-B are dimmed — the crowd the acid can't reach.
      for (const p of parts) {
        if (p.dead) continue;
        const buried = p.fixed && !isExposed(p, occupied);
        const color = p.kind === "A" ? COLOR_A : p.kind === "B" ? COLOR_B : COLOR_C;
        ctx.globalAlpha = buried ? 0.38 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, RADIUS - 0.8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = buried ? 0 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Reaction flashes — expanding golden rings.
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.t += 1;
        if (f.t > 16) { flashes.splice(i, 1); continue; }
        const k = f.t / 16;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4 + k * 14, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_C;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [ctl, stats]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight: 340 }} />;
}

// ── Activation-energy gauge — the bar the catalyst visibly drops ────────────
function EaGauge({ T, catalyst }: { T: number; catalyst: boolean }) {
  const MAX = 5.2; // top of the gauge in relative-speed units
  const ea = eaOf(catalyst);
  const eaPct = (ea / MAX) * 100;
  const kePct = Math.min(100, (speedAt(T) / MAX) * 100); // typical collision energy
  return (
    <div className="flex items-end gap-3">
      <div className="relative h-28 w-10 rounded-lg overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 90%, transparent)", border: "1px solid var(--color-border)" }}>
        {/* typical collision energy — rises with temperature */}
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500"
          style={{ height: `${kePct}%`, background: "linear-gradient(to top, color-mix(in oklab, var(--color-crimson) 55%, transparent), color-mix(in oklab, var(--color-gold) 55%, transparent))" }} />
        {/* the barrier line — drops when the catalyst is on */}
        <div className="absolute left-0 right-0 transition-all duration-500" style={{ bottom: `${eaPct}%` }}>
          <div className="h-0.5 w-full" style={{ background: catalyst ? "var(--color-emerald-elixir)" : "var(--color-gold)" }} />
        </div>
      </div>
      <div className="text-[10px] leading-relaxed text-parchment/70 pb-1">
        <div style={{ color: catalyst ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
          — Eₐ barrier {catalyst ? "(lowered!)" : ""}
        </div>
        <div>▮ typical collision energy</div>
        <div className="text-parchment/50">collisions above the line react</div>
      </div>
    </div>
  );
}

// ── Energy profile — the hill the catalyst shrinks ──────────────────────────
function EnergyProfile({ catalyst }: { catalyst: boolean }) {
  const VW = 340, VH = 170;
  const yReact = 96, yProd = 130, xR = 52, xP = 288, xPeak = 170;
  const yPeakBase = 30, yPeakCat = 66;
  const hill = (yPeak: number) =>
    `M ${xR} ${yReact} C ${xR + 46} ${yReact}, ${xPeak - 52} ${yPeak}, ${xPeak} ${yPeak} S ${xP - 46} ${yProd}, ${xP} ${yProd}`;
  const yPeak = catalyst ? yPeakCat : yPeakBase;
  const activeColor = catalyst ? "var(--color-emerald-elixir)" : "var(--color-gold)";
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Energy profile: activation-energy hill between reactants and products">
      {/* axes */}
      <line x1={30} y1={12} x2={30} y2={VH - 22} stroke="var(--color-border)" strokeWidth="1" />
      <line x1={30} y1={VH - 22} x2={VW - 10} y2={VH - 22} stroke="var(--color-border)" strokeWidth="1" />
      <text x={14} y={(12 + VH - 22) / 2} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6" transform={`rotate(-90 14 ${(12 + VH - 22) / 2})`}>energy</text>
      <text x={(30 + VW - 10) / 2} y={VH - 8} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6">reaction progress →</text>

      {/* uncatalysed hill stays as a ghost when the catalyst is on */}
      <path d={hill(yPeakBase)} fill="none" stroke="var(--color-parchment)" strokeWidth="1.25" strokeDasharray={catalyst ? "4 4" : "0"} opacity={catalyst ? 0.3 : 0} style={{ transition: "opacity 0.4s" }} />
      {/* active pathway */}
      <path d={hill(yPeak)} fill="none" stroke={activeColor} strokeWidth="2.25" strokeLinecap="round" style={{ transition: "d 0.4s, stroke 0.4s" }} />

      {/* Ea arrow at the peak */}
      <line x1={xPeak} y1={yReact} x2={xPeak} y2={yPeak + 3} stroke={activeColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.85" />
      <text x={xPeak + 6} y={(yReact + yPeak) / 2} fontSize="10" fill={activeColor}>Eₐ{catalyst ? " ↓" : ""}</text>

      {/* level labels */}
      <line x1={xR - 16} y1={yReact} x2={xR} y2={yReact} stroke="var(--color-parchment)" strokeWidth="1.5" opacity="0.7" />
      <text x={xR - 8} y={yReact + 12} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.8">A + B</text>
      <line x1={xP} y1={yProd} x2={xP + 16} y2={yProd} stroke={COLOR_C} strokeWidth="1.5" opacity="0.9" />
      <text x={xP + 8} y={yProd + 12} textAnchor="middle" fontSize="9" fill={COLOR_C}>C</text>
      <text x={xP + 8} y={yProd - 6} textAnchor="middle" fontSize="8" fill="var(--color-parchment)" opacity="0.55">products</text>
      <text x={xR - 8} y={yReact - 6} textAnchor="middle" fontSize="8" fill="var(--color-parchment)" opacity="0.55">reactants</text>
    </svg>
  );
}

// ── Rate sparkline — reactions/s over the last ~30 s ────────────────────────
function Sparkline({ data }: { data: number[] }) {
  const VW = 160, VH = 36;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * VW},${VH - 3 - (v / max) * (VH - 8)}`);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-9" preserveAspectRatio="none" role="img" aria-label="Reaction rate over time">
      <line x1={0} y1={VH - 3} x2={VW} y2={VH - 3} stroke="var(--color-border)" strokeWidth="1" />
      {pts.length > 1 && (
        <polyline points={pts.join(" ")} fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}

// ── Small labelled slider (states.tsx convention) ───────────────────────────
function CtlSlider({ label, icon: Icon, value, onChange, min, max, step, unit, color }: {
  label: string; icon: typeof Thermometer; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; color: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${color} 28%, transparent)` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color }}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="font-display text-lg" style={{ color }}>{value.toFixed(0)} <span className="text-xs text-parchment/60">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="w-full accent-current" style={{ accentColor: color }} />
    </div>
  );
}

// ── Quick check — 3 questions, best run saved as the "rates" trial ──────────
const QUIZ = [
  {
    q: "You push the temperature slider up and the gold flashes come faster. Why?",
    options: [
      "Hot particles are bigger, so they can't miss each other",
      "Particles collide more often AND hit harder — more collisions clear the Eₐ barrier",
      "Heat lowers the activation energy of the reaction",
    ],
    answer: 1,
  },
  {
    q: "What does flipping the catalyst toggle actually do?",
    options: [
      "It makes every particle move faster",
      "It adds extra B particles to the box",
      "It offers an easier pathway — lowering Eₐ so gentler collisions still react",
    ],
    answer: 2,
  },
  {
    q: "Why does powdered B react faster than the same amount of B as one solid block?",
    options: [
      "Powder exposes every particle to collisions — in the block, only the surface can be hit",
      "Grinding the block gives the particles extra energy",
      "Powdered particles have a lower activation energy",
    ],
    answer: 0,
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
      void recordTrial(uid, "rates", { score: s, outOf: 3, stars: s });
    }
  };

  const retry = () => { setPicked(QUIZ.map(() => null)); recorded.current = false; };

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] tracking-[0.2em] uppercase text-gold">Quick check — seal your knowledge</p>
        {best && (
          <span className="text-xs text-parchment/70">
            Best: <span className="text-gold font-display">{best.best}/{best.outOf}</span>{" "}
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
            {score === 3 ? "Perfect — 3/3. You command the four levers of reaction speed." : `${score}/3 — nudge the controls above and watch what changes, then retry.`}
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
function Rates() {
  const { uid, profile } = useUserProfile();
  const [T, setT] = useState(T_DEFAULT);
  const [nA, setNA] = useState(NA_DEFAULT);
  const [nB, setNB] = useState(NB_DEFAULT);
  const [catalyst, setCatalyst] = useState(false);
  const [surface, setSurface] = useState<Surface>("powder");
  const [resetToken, setResetToken] = useState(0);

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "rates"); }, [uid]);

  // Changing the population (concentration / surface mode) reseeds the box;
  // temperature and catalyst act live on the running particles.
  useEffect(() => { setResetToken((t) => t + 1); }, [nA, nB, surface]);

  const ctl = useRef<Controls>({ T, nA, nB, catalyst, surface, resetToken });
  useEffect(() => { ctl.current = { T, nA, nB, catalyst, surface, resetToken }; }, [T, nA, nB, catalyst, surface, resetToken]);
  const stats = useRef<Stats>({ reacted: 0, pairs: Math.min(nA, nB), events: [] });

  // Poll the sim for the live readout + sparkline.
  const [rate, setRate] = useState(0);
  const [converted, setConverted] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const recent = stats.current.events.filter((t) => t > now - RATE_WINDOW).length;
      const r = recent / (RATE_WINDOW / 1000);
      setRate(r);
      setConverted(stats.current.pairs > 0 ? stats.current.reacted / stats.current.pairs : 0);
      setHistory((h) => [...h.slice(-70), r]);
    }, 400);
    return () => clearInterval(id);
  }, []);

  const resetSim = () => setResetToken((t) => t + 1);

  return (
    <ModuleShell
      title="Reaction Rates"
      eyebrow="Collision Theory"
      icon={Zap}
      accent="var(--color-gold)"
      subtitle="Every reaction is a crowd of collisions — but only the ones that hit hard enough count. Push temperature, concentration, surface area and a catalyst, and watch the rate answer."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Simulation */}
        <div className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
          <CollisionStage ctl={ctl} stats={stats} />
          <div className="px-5 py-4 border-t space-y-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 text-xs text-parchment/80">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_A }} /> A</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_B }} /> B</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_C }} /> C (product)</span>
              </div>
              <button onClick={resetSim} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs tracking-[0.12em] uppercase transition"
                style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)", color: "var(--color-gold)" }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            {/* Live rate readout */}
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-gold">
                <Activity className="h-3.5 w-3.5" /> Rate
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-display text-lg text-gold whitespace-nowrap">{rate.toFixed(1)} <span className="text-xs text-parchment/60">rxn/s</span></span>
                <div className="flex-1 min-w-0"><Sparkline data={history} /></div>
              </div>
              <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Converted</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 90%, transparent)", border: "1px solid var(--color-border)" }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${Math.min(100, converted * 100)}%`, background: COLOR_C }} />
                </div>
                <span className="text-xs text-parchment/70 w-10 text-right">{Math.round(converted * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <CtlSlider label="Temperature" icon={Thermometer} value={T} onChange={setT} min={T_MIN} max={T_MAX} step={10} unit="K" color="#f2a65a" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CtlSlider label="Conc. of A" icon={FlaskConical} value={nA} onChange={setNA} min={N_MIN} max={N_MAX} step={1} unit="particles" color={COLOR_A} />
            <CtlSlider label="Conc. of B" icon={FlaskConical} value={nB} onChange={setNB} min={N_MIN} max={N_MAX} step={1} unit="particles" color={COLOR_B} />
          </div>

          {/* Catalyst + Ea gauge */}
          <div className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${catalyst ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 28%, transparent)` }}>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: catalyst ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
                <Wand2 className="h-3.5 w-3.5" /> Catalyst
              </span>
              <div>
                <button onClick={() => setCatalyst((c) => !c)} role="switch" aria-checked={catalyst}
                  className="rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
                  style={catalyst
                    ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 50%, transparent)" }
                    : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
                  {catalyst ? "Catalyst in — Eₐ lowered" : "Add catalyst"}
                </button>
              </div>
              <p className="text-[10px] text-parchment/55 max-w-[190px]">The catalyst isn't consumed — it lowers the barrier so weaker collisions succeed.</p>
            </div>
            <EaGauge T={T} catalyst={catalyst} />
          </div>

          {/* Surface-area mode */}
          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${COLOR_B} 28%, transparent)` }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase mb-2" style={{ color: COLOR_B }}>
              <Hammer className="h-3.5 w-3.5" /> Surface area of B
            </span>
            <div className="inline-flex rounded-full p-1 mt-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
              {(["block", "powder"] as const).map((mode) => (
                <button key={mode} onClick={() => setSurface(mode)}
                  className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
                  style={surface === mode ? { background: `color-mix(in oklab, ${COLOR_B} 18%, transparent)`, color: COLOR_B } : { color: "var(--color-parchment)" }}>
                  {mode === "block" ? "Solid block" : "Powdered"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-parchment/55 mt-2">
              {surface === "block"
                ? "Same amount of B, one lump — the dimmed particles are buried inside and can't be hit."
                : "Every B particle is free and exposed — the whole crowd can collide."}
            </p>
          </div>

          {/* Energy profile */}
          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Energy profile</span>
              <span className="text-[10px] text-parchment/50">{catalyst ? "catalysed pathway — a lower hill" : "the hill collisions must climb"}</span>
            </div>
            <EnergyProfile catalyst={catalyst} />
          </div>
        </div>
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="Collision theory">
          A reaction is nothing more than particles <em>crashing together</em> — but a crash only counts if it carries
          enough energy to clear the <span className="text-gold">activation barrier Eₐ</span>. Watch the box: most A–B
          bumps just bounce apart. Only the hard hits flash gold and fuse into C. Speed up the rate and you're doing one
          of two things — <span className="text-gold">more collisions</span>, or <span className="text-gold">more energy per collision</span>.
        </ConceptCard>
        <ConceptCard title="Temperature — harder AND more often">
          Drag the temperature slider and every particle moves faster. That doubles the effect: they meet more often,
          and each meeting hits harder, so <em>far</em> more collisions clear Eₐ. Watch the gauge — the energy fill
          climbs toward the barrier line. This is why a small temperature rise can make a rate leap, and why your
          fridge slows the reactions that spoil food.
        </ConceptCard>
        <ConceptCard title="Concentration — a more crowded box">
          Push the A and B sliders up and you've packed more particles into the same space. Nothing moves faster and
          the barrier hasn't budged — there are simply <span className="text-gold">more encounters per second</span>,
          so more of them succeed. Watch the rxn/s counter jump the moment the box gets crowded, then fall away as
          reactants are used up.
        </ConceptCard>
        <ConceptCard title="Surface area & catalyst — access and an easier road">
          Switch B to a <em>solid block</em>: the dimmed particles are buried — only the surface can be struck, so the
          rate crawls. Powder it and the whole crowd is exposed at once. The <em>catalyst</em> is different magic: it
          changes no speeds and adds no particles, it simply <span className="text-teal">lowers the Eₐ line</span> —
          watch the bar drop and gentle collisions start succeeding. It's not used up, either.
        </ConceptCard>
        <DidYouKnow>
          A wheat silo can explode. Grain barely burns as a heap — but milled into airborne flour dust, its surface
          area is enormous and every speck touches oxygen, so one spark propagates in milliseconds. Flour-dust and
          coal-dust explosions have levelled real mills, which is why silos ground their equipment against static
          sparks. Your powder toggle is that physics in miniature.
        </DidYouKnow>
        <DidYouKnow>
          Your body runs on catalysts: enzymes lower activation energies so drastically that reactions which would take
          years happen in milliseconds at a mild 37 °C. And the catalytic converter in a car exhaust uses platinum and
          rhodium surfaces to turn toxic CO and NO into CO₂ and N₂ — the metals emerge unchanged, ready for the next
          molecule, exactly like your toggle.
        </DidYouKnow>
      </div>

      <div className="mt-8">
        <QuickCheck uid={uid} best={profile?.trials?.["rates"]} />
      </div>
    </ModuleShell>
  );
}
