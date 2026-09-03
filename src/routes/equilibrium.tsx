import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Check, Factory, FlaskConical, Gauge, Scale, ScrollText, Sparkles, Syringe, Thermometer, X as XIcon } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/equilibrium")({
  component: () => (
    <RequireAuth>
      <Equilibrium />
    </RequireAuth>
  ),
});

/*
  Equilibrium — Le Chatelier you can poke.

  Scenario 1: N₂O₄ ⇌ 2 NO₂ (colourless ⇌ brown), the classic sealed-tube demo.
  The engine is a well-mixed stochastic model: every dimer may split each frame
  (probability rises with T — the forward direction is endothermic, real
  ΔH ≈ +57 kJ/mol) and monomer pairs recombine at a rate ∝ [NO₂]²/V. With
  those rules K = k_f/k_r emerges naturally and the box genuinely re-settles
  after every stress. The particles are the visualisation of those counts, and
  the box's brown tint tracks [NO₂] — the colour IS the readout.

  Scenario 2: the Haber process in bar-chart form, using the curated
  Larson–Dodge equilibrium %NH₃ table (real data, interpolated).
*/

// ── Kinetics (illustrative engine, real qualitative behaviour) ──────────────
const PF0 = 0.006; // per-dimer split probability per frame at 298 K
const PR0 = PF0 / 16; // K(298 K) = PF0/PR0 = 16 in sim units
const kForward = (T: number) => PF0 * Math.exp((T - 298) / 22); // endothermic → grows with T
const kReverse = (T: number) => PR0 * Math.exp(-(T - 298) / 60); // exothermic → shrinks with T

// Chart series colours (validated for CVD + contrast on both themes).
const COLOR_NO2 = "#d97706"; // brown-amber — NO₂ genuinely is brown
const COLOR_N2O4 = "#5b8def"; // cool blue for the colourless dimer's line
const COLOR_NH3 = "#0ea371";

const T_MIN = 250, T_MAX = 400, T_DEFAULT = 298;
const V_MIN = 0.4, V_MAX = 1.0;
const SEED_DIMERS = 48;
const INJECT_DIMERS = 12;
const MAX_UNITS = 110; // cap on total N₂O₄ units (D + M/2) so the flask stays readable

interface SimIn { T: number; V: number }
interface SimCmd { inject: number; reset: boolean }
interface SimStats { D: number; M: number; concD: number; concM: number; q: number; k: number }

// ── Particle stage — dimers split, pairs recombine, the tint is the story ───
function ParticleStage({ sim, cmd, stats }: {
  sim: MutableRefObject<SimIn>;
  cmd: MutableRefObject<SimCmd>;
  stats: MutableRefObject<SimStats>;
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

    interface P { x: number; y: number; vx: number; vy: number; kind: "D" | "M" }
    let parts: P[] = [];
    let seeded = false;
    let acc = 0; // fractional recombination events carried between frames
    let raf = 0;

    const spawnDimer = (x: number, y: number, vx?: number, vy?: number): P => {
      const a = Math.random() * Math.PI * 2;
      return { x, y, vx: vx ?? Math.cos(a) * 1.1, vy: vy ?? Math.sin(a) * 1.1, kind: "D" };
    };

    const draw = () => {
      const { T, V } = sim.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const full = { x: 16, y: 16, w: W - 32, h: H - 32 };
      const box = { ...full, w: Math.max(60, full.w * V) };

      if (!seeded && box.w > 60) {
        parts = Array.from({ length: SEED_DIMERS }, () =>
          spawnDimer(box.x + 8 + Math.random() * (box.w - 16), box.y + 8 + Math.random() * (box.h - 16)));
        seeded = true;
      }
      if (cmd.current.reset) {
        parts = Array.from({ length: SEED_DIMERS }, () =>
          spawnDimer(box.x + 8 + Math.random() * (box.w - 16), box.y + 8 + Math.random() * (box.h - 16)));
        acc = 0;
        cmd.current.reset = false;
      }
      // Injection port squirts fresh N₂O₄ in from the left wall.
      let squirt = 0;
      while (cmd.current.inject > 0 && squirt < 2) {
        parts.push(spawnDimer(box.x + 10, box.y + box.h * (0.25 + Math.random() * 0.5), 2.6 + Math.random(), (Math.random() - 0.5) * 1.2));
        cmd.current.inject -= 1;
        squirt += 1;
      }

      const pf = kForward(T), pr = kReverse(T);

      // Forward: each dimer may split into two brown monomers.
      const next: P[] = [];
      for (const p of parts) {
        if (p.kind === "D" && Math.random() < pf) {
          const a = Math.random() * Math.PI * 2;
          const s = 0.9 + Math.sqrt(T / 298);
          next.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: "M" });
          next.push({ x: p.x, y: p.y, vx: -Math.cos(a) * s, vy: -Math.sin(a) * s, kind: "M" });
        } else next.push(p);
      }
      parts = next;

      // Reverse: recombination rate ∝ [NO₂]² / V (mass action) — nearest pairs fuse.
      let M = parts.reduce((n, p) => n + (p.kind === "M" ? 1 : 0), 0);
      acc += pr * M * M / Math.max(0.2, V);
      while (acc >= 1 && M >= 2) {
        acc -= 1;
        const monos = parts.filter((p) => p.kind === "M");
        const a = monos[Math.floor(Math.random() * monos.length)];
        let b: P | null = null, bd = Infinity;
        for (const m of monos) {
          if (m === a) continue;
          const d = (m.x - a.x) ** 2 + (m.y - a.y) ** 2;
          if (d < bd) { bd = d; b = m; }
        }
        if (!b) break;
        const fused: P = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2, kind: "D" };
        parts = parts.filter((p) => p !== a && p !== b);
        parts.push(fused);
        M -= 2;
      }

      // Motion: relax every particle toward its thermal speed, bounce off walls
      // (the right wall is the piston — compressing visibly herds the crowd).
      const thermal = 0.9 + 1.5 * Math.sqrt(T / 298);
      const px = box.x + box.w;
      for (const p of parts) {
        const target = p.kind === "D" ? thermal * 0.75 : thermal;
        let mag = Math.hypot(p.vx, p.vy);
        if (mag < 0.02) { const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a); p.vy = Math.sin(a); mag = 1; }
        const f = 1 + (target / mag - 1) * 0.05;
        p.vx *= f; p.vy *= f;
        p.x += p.vx; p.y += p.vy;
        if (p.x <= box.x + 4) { p.x = box.x + 4; p.vx = Math.abs(p.vx); }
        if (p.x >= px - 4) { p.x = px - 4; p.vx = -Math.abs(p.vx); }
        if (p.y <= box.y + 4) { p.y = box.y + 4; p.vy = Math.abs(p.vy); }
        if (p.y >= box.y + box.h - 4) { p.y = box.y + box.h - 4; p.vy = -Math.abs(p.vy); }
      }

      // Publish stats for the graphs / gauge.
      const D = parts.length - M;
      const concD = D / V, concM = M / V;
      const q = (M * M) / (Math.max(0.5, D) * V);
      stats.current = { D, M, concD, concM, q, k: pf / pr };

      // The colour IS the readout: brown tint deepens with [NO₂].
      ctx.fillStyle = `rgba(146, 64, 14, ${Math.min(0.55, concM / 90).toFixed(3)})`;
      ctx.fillRect(box.x, box.y, box.w, box.h);

      // Dead space behind the piston.
      if (box.w < full.w - 4) {
        ctx.fillStyle = "color-mix(in oklab, var(--color-parchment) 7%, transparent)";
        ctx.fillRect(px, full.y, full.x + full.w - px, full.h);
      }

      // Walls + piston face.
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 40%, transparent)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 70%, transparent)";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke();
      // Piston handle
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px, box.y + box.h / 2); ctx.lineTo(full.x + full.w + 6, box.y + box.h / 2); ctx.stroke();

      // Particles: N₂O₄ = fused pale pair (colourless), NO₂ = single brown dot.
      for (const p of parts) {
        if (p.kind === "D") {
          ctx.fillStyle = "rgba(154, 167, 189, 0.9)";
          ctx.beginPath(); ctx.arc(p.x - 2.6, p.y, 3.1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x + 2.6, p.y, 3.1, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#c2610b";
          ctx.shadowColor = "#c2610b";
          ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.3, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [sim, cmd, stats]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight: 340 }} />;
}

// ── Live concentration graph — two lines, rolling 45 s window ───────────────
interface Sample { cD: number; cM: number; q: number; k: number }

function ConcChart({ history }: { history: Sample[] }) {
  const VW = 340, VH = 150, padL = 30, padR = 10, padT = 10, padB = 20;
  const N = Math.max(2, history.length);
  const ymax = Math.max(40, ...history.map((s) => Math.max(s.cD, s.cM))) * 1.12;
  const x = (i: number) => padL + (i / (N - 1)) * (VW - padL - padR);
  const y = (c: number) => padT + (1 - c / ymax) * (VH - padT - padB);
  const line = (get: (s: Sample) => number) => history.map((s, i) => `${x(i).toFixed(1)},${y(get(s)).toFixed(1)}`).join(" ");
  const last = history[history.length - 1];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1 text-xs text-parchment/80">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_N2O4 }} />
          [N₂O₄] {last ? last.cD.toFixed(0) : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_NO2 }} />
          [NO₂] {last ? last.cM.toFixed(0) : "—"}
        </span>
      </div>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Concentrations of dinitrogen tetroxide and nitrogen dioxide versus time">
        <line x1={padL} y1={padT} x2={padL} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
        <line x1={padL} y1={VH - padB} x2={VW - padR} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
        <text x={(padL + VW - padR) / 2} y={VH - 6} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6">time →</text>
        <text x={10} y={(padT + VH - padB) / 2} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6" transform={`rotate(-90 10 ${(padT + VH - padB) / 2})`}>conc</text>
        {history.length >= 2 && (
          <>
            <polyline points={line((s) => s.cD)} fill="none" stroke={COLOR_N2O4} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={line((s) => s.cM)} fill="none" stroke={COLOR_NO2} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {last && (
              <>
                <circle cx={x(N - 1)} cy={y(last.cD)} r="3" fill={COLOR_N2O4} stroke="var(--color-background)" strokeWidth="1" />
                <circle cx={x(N - 1)} cy={y(last.cM)} r="3" fill={COLOR_NO2} stroke="var(--color-background)" strokeWidth="1" />
              </>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

// ── Q vs K needle — is the system at equilibrium? ───────────────────────────
function QKGauge({ q, k }: { q: number; k: number }) {
  const r = Math.max(-1, Math.min(1, Math.log10(Math.max(q, 0.001) / Math.max(k, 0.001))));
  const atEq = Math.abs(r) < 0.06;
  const VW = 340, VH = 58, cx = VW / 2, span = VW / 2 - 26, ty = 36;
  const nx = cx + r * span;
  const color = atEq ? "var(--color-emerald-elixir)" : "var(--color-gold)";

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Reaction quotient Q compared with the equilibrium constant K">
        <line x1={cx - span} y1={ty} x2={cx + span} y2={ty} stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" />
        <line x1={cx} y1={ty - 7} x2={cx} y2={ty + 7} stroke="var(--color-parchment)" strokeWidth="1.5" opacity="0.7" />
        <text x={cx} y={ty + 18} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.75">Q = K</text>
        <text x={cx - span} y={ty + 18} textAnchor="start" fontSize="8.5" fill="var(--color-parchment)" opacity="0.6">Q &lt; K · net →</text>
        <text x={cx + span} y={ty + 18} textAnchor="end" fontSize="8.5" fill="var(--color-parchment)" opacity="0.6">← net · Q &gt; K</text>
        <polygon points={`${nx},${ty - 4} ${nx - 6},${ty - 15} ${nx + 6},${ty - 15}`} fill={color} />
        {atEq && <circle cx={nx} cy={ty - 10} r="11" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />}
      </svg>
      <p className="text-xs leading-snug" style={{ color }}>
        {atEq
          ? "At equilibrium — forward and reverse reactions run at equal rates. Nothing has stopped; the exchange is just balanced."
          : r < 0
            ? "Q is below K — the forward reaction outpaces the reverse, forging NO₂ until Q climbs back to K."
            : "Q is above K — the reverse reaction outpaces the forward, re-forming N₂O₄ until Q falls back to K."}
      </p>
    </div>
  );
}

// ── Le Chatelier's counsel — a transient teaching banner per stress ─────────
function Counsel({ note }: { note: { msg: string; n: number } | null }) {
  if (!note) return null;
  return (
    <div key={note.n} className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{ background: "color-mix(in oklab, var(--color-gold) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)" }}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: "color-mix(in oklab, var(--color-gold) 18%, transparent)", color: "var(--color-gold)" }}>
        <ScrollText className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium mb-0.5 text-gold">Le Chatelier's counsel</div>
        <div className="text-sm text-parchment leading-snug">{note.msg}</div>
      </div>
    </div>
  );
}

// ── Haber process — curated equilibrium data (Larson & Dodge, % NH₃) ────────
const HABER_T = [200, 300, 400, 500, 600]; // °C
const HABER_P = [10, 100, 300, 600]; // atm
const HABER_PCT: number[][] = [
  // %NH₃ at equilibrium from a 1 : 3 N₂ : H₂ mix
  [50.7, 81.5, 89.9, 95.4], // 200 °C
  [14.7, 52.0, 71.0, 84.2], // 300 °C
  [3.9, 25.1, 47.0, 65.2],  // 400 °C
  [1.2, 10.6, 26.4, 42.2],  // 500 °C
  [0.5, 4.5, 13.8, 23.1],   // 600 °C
];

function bracket(arr: number[], v: number): [number, number] {
  for (let i = 0; i < arr.length - 1; i++) {
    if (v <= arr[i + 1]) return [i, (v - arr[i]) / (arr[i + 1] - arr[i])];
  }
  return [arr.length - 2, 1];
}

/** Bilinear interpolation over the real table — linear in T, linear in ln P. */
function haberYield(Tc: number, P: number): number {
  const [ti, tf] = bracket(HABER_T, Tc);
  const lnPs = HABER_P.map((p) => Math.log(p));
  const [pi, pfr] = bracket(lnPs, Math.log(P));
  const lo = HABER_PCT[ti][pi] + pfr * (HABER_PCT[ti][pi + 1] - HABER_PCT[ti][pi]);
  const hi = HABER_PCT[ti + 1][pi] + pfr * (HABER_PCT[ti + 1][pi + 1] - HABER_PCT[ti + 1][pi]);
  return lo + tf * (hi - lo);
}

function YieldBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 flex-shrink-0 text-sm text-parchment text-right">{label}</span>
      <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(1.5, pct)}%`, background: color }} />
      </div>
      <span className="w-12 flex-shrink-0 text-xs text-parchment/80 tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  );
}

function HaberTab() {
  const [Tc, setTc] = useState(450);
  const [P, setP] = useState(200);
  const y = haberYield(Tc, P);
  const rest = 100 - y;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stress controls */}
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-gold">
                <Thermometer className="h-3.5 w-3.5" /> Temperature
              </span>
              <span className="font-ui font-medium text-lg text-gold">{Tc} <span className="text-xs text-parchment/60">°C</span></span>
            </div>
            <input type="range" min={200} max={600} step={5} value={Tc} onChange={(e) => setTc(parseInt(e.target.value, 10))}
              aria-label="Reactor temperature in degrees Celsius" className="w-full" style={{ accentColor: "var(--color-gold)" }} />
            <p className="text-xs text-parchment/70 mt-2 leading-snug">
              Forward is <span className="text-gold">exothermic</span> (ΔH = −92 kJ/mol) — heating drives the endothermic
              reverse direction, so yield falls… but cold reactions crawl.
            </p>
          </div>

          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: COLOR_NH3 }}>
                <Gauge className="h-3.5 w-3.5" /> Pressure
              </span>
              <span className="font-ui font-medium text-lg" style={{ color: COLOR_NH3 }}>{P} <span className="text-xs text-parchment/60">atm</span></span>
            </div>
            <input type="range" min={10} max={600} step={5} value={P} onChange={(e) => setP(parseInt(e.target.value, 10))}
              aria-label="Reactor pressure in atmospheres" className="w-full" style={{ accentColor: COLOR_NH3 }} />
            <p className="text-xs text-parchment/70 mt-2 leading-snug">
              4 moles of gas squeeze into 2 (N₂ + 3 H₂ → 2 NH₃) — pressure shifts the balance toward
              ammonia… but every extra atmosphere costs steel and energy.
            </p>
          </div>

          <button onClick={() => { setTc(450); setP(200); }}
            className="w-full rounded-xl px-4 py-2.5 text-sm tracking-[0.1em] uppercase transition inline-flex items-center justify-center gap-2"
            style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)", color: "var(--color-gold)" }}>
            <Factory className="h-4 w-4" /> Set the industrial compromise — 450 °C, 200 atm
          </button>
        </div>

        {/* Yield readout */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-1">Equilibrium yield of ammonia</p>
            <p className="font-display text-5xl" style={{ color: COLOR_NH3 }}>
              {y.toFixed(1)}<span className="text-2xl">%</span>
            </p>
          </div>
          <div className="space-y-2.5">
            <YieldBar label="NH₃" pct={y} color={COLOR_NH3} />
            <YieldBar label="N₂" pct={rest / 4} color={COLOR_N2O4} />
            <YieldBar label="H₂" pct={(rest * 3) / 4} color={COLOR_NO2} />
          </div>
          <p className="text-xs text-parchment/70 leading-snug">
            Mole % of the mixture once N₂ + 3 H₂ ⇌ 2 NH₃ settles — real measured data
            (Larson &amp; Dodge), interpolated. Cold + squeezed = rich in ammonia; hot + loose = barely any.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ConceptCard title="The industrial compromise">
          Le Chatelier says run it <em>cold and crushed</em> — but at 200 °C the reaction is uselessly slow, and beyond
          ~200 atm the plant becomes a bomb-proof money pit. So industry settles on{" "}
          <span className="text-gold">≈ 450 °C, ≈ 200 atm, with an iron catalyst</span>: only ~30% converts per pass,
          but the catalyst makes that 30% arrive <em>fast</em>, the ammonia is condensed out as liquid, and the unreacted
          N₂ and H₂ loop back for another pass. A deliberately "bad" equilibrium, run brilliantly.
        </ConceptCard>
        <DidYouKnow>
          The catalyst never moves the equilibrium — it speeds forward and reverse reactions equally, so the same
          balance simply arrives sooner. Fritz Haber found the chemistry in 1909 and Carl Bosch tamed the pressures;
          today Haber–Bosch ammonia feeds roughly <em>half the people on Earth</em> through fertiliser, consuming
          about 1–2% of the world's energy to do it.
        </DidYouKnow>
      </div>
    </div>
  );
}

// ── Quick check — 3 questions, best saved as the "equilibrium" trial ────────
const QUIZ = [
  {
    q: "You compress the N₂O₄ ⇌ 2 NO₂ flask to half its volume. Once the system re-settles, which way has the equilibrium shifted?",
    options: [
      "Toward NO₂ — more particles push back harder",
      "Toward N₂O₄ — fewer gas moles relieve the squeeze",
      "No shift — pressure never moves an equilibrium",
    ],
    answer: 1,
  },
  {
    q: "The Haber reaction N₂ + 3 H₂ ⇌ 2 NH₃ releases heat. What does raising the temperature do to the ammonia yield?",
    options: [
      "Raises it — hot particles always react further",
      "Lowers it — added heat drives the endothermic reverse direction",
      "Nothing — temperature only changes the rate",
    ],
    answer: 1,
  },
  {
    q: "Why does the iron catalyst in the Haber process NOT shift the equilibrium toward more ammonia?",
    options: [
      "It speeds forward and reverse reactions equally — the same equilibrium just arrives sooner",
      "It only accelerates the reverse reaction",
      "It does shift it, but the effect is too small to measure",
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
      void recordTrial(uid, "equilibrium", { score: s, outOf: 3, stars: s });
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
            {score === 3 ? "Perfect — 3/3. Push a system and it pushes back; you saw it coming every time." : `${score}/3 — poke the flask above once more, then try again.`}
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
function shade(concM: number): string {
  if (concM < 8) return "colourless";
  if (concM < 20) return "pale straw";
  if (concM < 35) return "amber";
  if (concM < 55) return "brown";
  return "deep brown";
}

function Equilibrium() {
  const { uid, profile } = useUserProfile();
  const [tab, setTab] = useState<"flask" | "haber">("flask");
  const [T, setT] = useState(T_DEFAULT);
  const [V, setV] = useState(1.0);
  const [note, setNote] = useState<{ msg: string; n: number } | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [gauge, setGauge] = useState<SimStats>({ D: SEED_DIMERS, M: 0, concD: SEED_DIMERS, concM: 0, q: 0, k: 16 });

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "equilibrium"); }, [uid]);

  const sim = useRef<SimIn>({ T, V });
  useEffect(() => { sim.current = { T, V }; }, [T, V]);
  const cmd = useRef<SimCmd>({ inject: 0, reset: false });
  const stats = useRef<SimStats>({ D: SEED_DIMERS, M: 0, concD: SEED_DIMERS, concM: 0, q: 0, k: 16 });

  // Sample the running sim for the graphs (rolling ~45 s window).
  useEffect(() => {
    if (tab !== "flask") return;
    const id = window.setInterval(() => {
      const s = stats.current;
      setGauge({ ...s });
      setHistory((prev) => [...prev.slice(-149), { cD: s.concD, cM: s.concM, q: s.q, k: s.k }]);
    }, 300);
    return () => window.clearInterval(id);
  }, [tab]);

  const noteTimer = useRef(0);
  const counsel = (msg: string) => {
    setNote({ msg, n: Date.now() });
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 8000);
  };
  useEffect(() => () => window.clearTimeout(noteTimer.current), []);

  const onTemp = (v: number) => {
    counsel(v > T
      ? "You fed the flame — the mixture absorbs the extra heat by running the endothermic direction, N₂O₄ → 2 NO₂, so the vapour turns browner."
      : "You chilled the flask — the mixture replaces the lost heat by running the exothermic direction, 2 NO₂ → N₂O₄, so the brown drains away.");
    setT(v);
  };
  const onVolume = (v: number) => {
    counsel(v < V
      ? "You drove the piston in — the colour darkens for an instant (same NO₂, less room), then the system relieves the crowding by favouring the side with fewer gas moles: 2 NO₂ → 1 N₂O₄. It settles paler than that first flash."
      : "You pulled the piston out — the system fills the new space by favouring the side with more gas moles, splitting N₂O₄ into extra NO₂.");
    setV(v);
  };
  const canInject = gauge.D + gauge.M / 2 < MAX_UNITS;
  const inject = () => {
    if (!canInject) return;
    cmd.current.inject += INJECT_DIMERS;
    counsel("You flooded the flask with N₂O₄ — Q dropped below K, so the system devours part of the excess, forging more NO₂ until Q climbs back to K.");
  };
  const reset = () => { cmd.current.reset = true; setT(T_DEFAULT); setV(1.0); setNote(null); setHistory([]); };

  const TabToggle = (
    <div className="inline-flex flex-wrap rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {([["flask", "N₂O₄ ⇌ 2 NO₂"], ["haber", "Haber process"]] as const).map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)}
          className="rounded-full px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition"
          style={tab === id ? { background: "color-mix(in oklab, var(--color-amber-scry) 18%, transparent)", color: "var(--color-amber-scry)" } : { color: "var(--color-parchment)" }}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Equilibrium"
      eyebrow="Le Chatelier's Principle"
      icon={Scale}
      accent="var(--color-amber-scry)"
      subtitle="A reversible reaction never stops — it balances. Poke the sealed brown-gas flask with heat, pressure and extra reactant, and watch the system push back exactly as Le Chatelier promised."
      right={TabToggle}
    >
      {tab === "flask" ? (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Reversible reaction stage */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
              <ParticleStage sim={sim} cmd={cmd} stats={stats} />
              <div className="px-5 py-4 border-t flex items-center justify-center gap-3" style={{ borderColor: "var(--color-border)" }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: "color-mix(in oklab, var(--color-amber-scry) 16%, transparent)", color: "var(--color-amber-scry)" }}>
                  <FlaskConical className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <div className="font-ui font-medium text-lg" style={{ color: "var(--color-amber-scry)" }}>
                    N₂O₄ <span className="text-parchment/60">⇌</span> 2 NO₂ · {shade(gauge.concM)}
                  </div>
                  <div className="text-xs text-parchment/70">
                    {gauge.D} colourless dimers · {gauge.M} brown NO₂ — the tint of the box is your instrument.
                  </div>
                </div>
              </div>
            </div>

            {/* Stress controls */}
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid color-mix(in oklab, var(--color-amber-scry) 28%, transparent)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--color-amber-scry)" }}>
                    <Thermometer className="h-3.5 w-3.5" /> Temperature
                  </span>
                  <span className="font-ui font-medium text-lg" style={{ color: "var(--color-amber-scry)" }}>
                    {T} <span className="text-xs text-parchment/60">K</span>
                    <span className="text-xs text-parchment/60 ml-2">({(T - 273.15).toFixed(0)} °C)</span>
                  </span>
                </div>
                <input type="range" min={T_MIN} max={T_MAX} step={1} value={T}
                  onChange={(e) => onTemp(parseInt(e.target.value, 10))}
                  aria-label="Flask temperature in kelvin" className="w-full" style={{ accentColor: "var(--color-amber-scry)" }} />
                <p className="text-xs text-parchment/70 mt-1.5 leading-snug">
                  N₂O₄ + heat ⇌ 2 NO₂ — the <span style={{ color: "var(--color-amber-scry)" }}>forward direction is endothermic</span>{" "}
                  (ΔH = +57 kJ/mol), so heating feeds the split and the flask browns.
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-parchment/80">
                    <Gauge className="h-3.5 w-3.5" /> Volume / pressure
                  </span>
                  <span className="font-ui font-medium text-lg text-parchment">
                    {(V * 100).toFixed(0)}<span className="text-xs text-parchment/60">% volume</span>
                  </span>
                </div>
                <input type="range" min={V_MIN} max={V_MAX} step={0.01} value={V}
                  onChange={(e) => onVolume(parseFloat(e.target.value))}
                  aria-label="Flask volume as a fraction of full size — smaller volume means higher pressure"
                  className="w-full" style={{ accentColor: "var(--color-parchment)" }} />
                <div className="flex justify-between text-[10px] text-parchment/50 mt-1">
                  <span>compressed · high P</span>
                  <span>full volume · low P</span>
                </div>
                <p className="text-xs text-parchment/70 mt-1.5 leading-snug">
                  Squeeze and the balance flees toward the side with <span className="text-gold">fewer gas moles</span> —
                  1 N₂O₄ against 2 NO₂ — so compression ultimately pales the mix.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={inject} disabled={!canInject}
                  className="flex-1 min-w-[180px] rounded-xl px-4 py-2.5 text-sm tracking-[0.1em] uppercase transition inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid color-mix(in oklab, ${COLOR_N2O4} 50%, transparent)`, color: COLOR_N2O4 }}>
                  <Syringe className="h-4 w-4" /> Inject N₂O₄
                </button>
                <button onClick={reset}
                  className="rounded-xl px-4 py-2.5 text-sm tracking-[0.1em] uppercase transition"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-parchment)" }}>
                  Reset flask
                </button>
              </div>

              <Counsel note={note} />
            </div>
          </div>

          {/* Live graphs */}
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Concentrations vs time</span>
                <span className="text-[10px] text-parchment/50">watch it re-settle after every stress</span>
              </div>
              <ConcChart history={history} />
            </div>
            <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Q vs K — the balance needle</span>
                <span className="text-[10px] text-parchment/50">Q = [NO₂]² / [N₂O₄] · K = {gauge.k.toFixed(0)}</span>
              </div>
              <QKGauge q={gauge.q} k={gauge.k} />
            </div>
          </div>

          {/* Teaching layer */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ConceptCard title="Push a system, and it pushes back">
              Le Chatelier's principle: stress a system at equilibrium and it shifts to{" "}
              <span className="text-gold">partially undo the stress</span>. Add heat → it runs the heat-eating
              (endothermic) direction. Squeeze → it makes fewer gas particles. Add reactant → it consumes some of it.
              The shift never fully cancels the stress — it only takes the edge off, at a new balance point.
            </ConceptCard>
            <ConceptCard title="Equilibrium is busy, not still">
              At Q = K nothing has stopped — dimers keep splitting and NO₂ pairs keep fusing at{" "}
              <span className="text-gold">equal rates</span>, which is why the concentrations flat-line while the box
              still seethes. Only temperature changes K itself; volume and injections change Q and let the reactions
              chase K back down.
            </ConceptCard>
            <DidYouKnow>
              This exact tube lives in real classrooms: sealed NO₂/N₂O₄ ampoules turn deep brown in hot water and
              nearly colourless in ice. And on hot summer days the same NO₂ chemistry runs in city air — it's the
              brown edge of photochemical smog.
            </DidYouKnow>
            <DidYouKnow>
              Your blood runs a life-critical equilibrium: haemoglobin + O₂ ⇌ oxyhaemoglobin. In your lungs, high [O₂]
              pushes it forward; in working muscle, low [O₂] pulls it back — Le Chatelier delivering every breath you
              take to where it's needed.
            </DidYouKnow>
          </div>
        </>
      ) : (
        <HaberTab />
      )}

      <div className="mt-8">
        <QuickCheck uid={uid} best={profile?.trials?.["equilibrium"]} />
      </div>
    </ModuleShell>
  );
}
