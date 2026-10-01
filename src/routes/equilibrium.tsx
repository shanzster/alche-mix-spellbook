import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Check, Factory, Flame, FlaskConical, Gauge, Scale, ScrollText, Sparkles, Syringe, Thermometer, X as XIcon } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { ValveWheel } from "../components/ValveWheel";
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
  those rules K = k_f/k_r emerges naturally and the flask genuinely re-settles
  after every stress. The particles are the visualisation of those counts, and
  the flask's brown tint tracks [NO₂] — the colour IS the readout.

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
interface SimStats { D: number; M: number; concD: number; concM: number; q: number; k: number; strain: number }

// ── Glassware limits — push too hard and the flask gives way ────────────────
// Pressure proxy is honest ideal-gas reasoning: P ∝ n·T / V (particle count
// times absolute temperature over volume). Baseline ≈ 48 units at rest.
const pressureOf = (n: number, T: number, V: number) => (n * (T / 298)) / Math.max(0.2, V);
const DANGER_P = 300;       // overpressure: crowded + squeezed + hot
const DANGER_T = 388;       // flame nearly wide open scorches the glass
const STRAIN_RISE = 0.006;  // ≈3 s of sustained abuse shatters it
const STRAIN_FALL = 0.012;  // easing off lets the glass recover

// ── Particle stage — dimers split, pairs recombine, the tint is the story ───
function ParticleStage({ sim, cmd, stats, onShatter }: {
  sim: MutableRefObject<SimIn>;
  cmd: MutableRefObject<SimCmd>;
  stats: MutableRefObject<SimStats>;
  /** Ref'd callback so the sim effect never re-runs: fired once per shatter. */
  onShatter: MutableRefObject<() => void>;
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
    let strain = 0;          // 0..1 — how close the glass is to giving way
    let shattered = false;
    let jag: number[] = [];  // frozen randomness for the broken-glass shapes

    const spawnDimer = (x: number, y: number, vx?: number, vy?: number): P => {
      const a = Math.random() * Math.PI * 2;
      return { x, y, vx: vx ?? Math.cos(a) * 1.1, vy: vy ?? Math.sin(a) * 1.1, kind: "D" };
    };

    const draw = () => {
      const { T, V } = sim.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // ── Apparatus geometry: a sealed round-bottom flask over a burner ──
      // Bulb AREA scales with V, so compression visibly crowds the vapour.
      const baseR = Math.min(W * 0.3, H * 0.27);
      const R = Math.max(26, baseR * Math.sqrt(V));
      const cx = W / 2;
      const bulbBottom = H - 86; // room below for the stand + flame
      const cy = bulbBottom - R;
      const neckW = Math.max(24, R * 0.38);
      const neckTop = 14;
      // Where the neck walls meet the bulb's circle.
      const th = Math.asin(Math.min(0.9, neckW / 2 / R));
      const neckBottomY = cy - R * Math.cos(th);

      const randomInBulb = () => {
        const r = (R - 10) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      };
      if (!seeded && R > 26) {
        parts = Array.from({ length: SEED_DIMERS }, () => {
          const p = randomInBulb();
          return spawnDimer(p.x, p.y);
        });
        seeded = true;
      }
      if (cmd.current.reset) {
        parts = Array.from({ length: SEED_DIMERS }, () => {
          const p = randomInBulb();
          return spawnDimer(p.x, p.y);
        });
        acc = 0;
        strain = 0;
        shattered = false; // a fresh flask from the spares cupboard
        jag = [];
        cmd.current.reset = false;
      }

      // ── A shattered flask: shards, a pilot flame, and a lesson ──
      if (shattered) {
        const glass = "color-mix(in oklab, var(--color-parchment) 45%, transparent)";
        // Stand + burner, as ever.
        ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 28%, transparent)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.7, bulbBottom - R * 0.26); ctx.lineTo(cx - R * 0.95, H - 8);
        ctx.moveTo(cx + R * 0.7, bulbBottom - R * 0.26); ctx.lineTo(cx + R * 0.95, H - 8);
        ctx.stroke();
        const nozzleY = H - 16;
        ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
        ctx.beginPath();
        ctx.moveTo(cx - 5, nozzleY);
        ctx.quadraticCurveTo(cx - 5, nozzleY - 7, cx, nozzleY - 12);
        ctx.quadraticCurveTo(cx + 5, nozzleY - 7, cx + 5, nozzleY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "color-mix(in oklab, var(--color-parchment) 38%, transparent)";
        ctx.fillRect(cx - 17, nozzleY, 34, 8);
        // Escaped vapour, drifting off.
        ctx.fillStyle = "rgba(146, 64, 14, 0.10)";
        ctx.beginPath(); ctx.arc(cx, cy - R * 0.9, R * 0.55, 0, Math.PI * 2); ctx.fill();
        // The surviving lower half of the bulb, with a jagged broken rim.
        ctx.strokeStyle = glass;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI * 0.15, Math.PI * 0.85);
        const a0 = Math.PI * 0.85, a1 = Math.PI * 0.15;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        ctx.moveTo(x0, y0);
        const SEG = 9;
        for (let i = 1; i < SEG; i++) {
          const t = i / SEG;
          ctx.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - (jag[i] ?? 0.5) * 16 - 3);
        }
        ctx.lineTo(x1, y1);
        ctx.stroke();
        // Shards on the bench.
        for (let k = 0; k < 5; k++) {
          const sx = cx + ((jag[k + 9] ?? 0.5) - 0.5) * R * 2.4;
          const sy = H - 12 - (jag[k + 14] ?? 0.5) * 8;
          const s = 5 + (jag[k + 19] ?? 0.5) * 6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + s, sy - s * 0.4);
          ctx.lineTo(sx + s * 0.4, sy - s);
          ctx.closePath();
          ctx.fillStyle = "color-mix(in oklab, var(--color-parchment) 18%, transparent)";
          ctx.fill();
          ctx.strokeStyle = glass;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        stats.current = { D: 0, M: 0, concD: 0, concM: 0, q: 0, k: kForward(T) / kReverse(T), strain: 1 };
        raf = requestAnimationFrame(draw);
        return;
      }
      // Injection: the syringe squirts fresh N₂O₄ down through the neck.
      let squirt = 0;
      while (cmd.current.inject > 0 && squirt < 2) {
        parts.push(spawnDimer(
          cx + (Math.random() - 0.5) * neckW * 0.4,
          cy - R + 12,
          (Math.random() - 0.5) * 1.2,
          2.4 + Math.random(),
        ));
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

      // Motion: relax every particle toward its thermal speed and bounce off
      // the inside of the bulb (the glass is the wall now).
      const thermal = 0.9 + 1.5 * Math.sqrt(T / 298);
      const wall = R - 6;
      for (const p of parts) {
        const target = p.kind === "D" ? thermal * 0.75 : thermal;
        let mag = Math.hypot(p.vx, p.vy);
        if (mag < 0.02) { const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a); p.vy = Math.sin(a); mag = 1; }
        const f = 1 + (target / mag - 1) * 0.05;
        p.vx *= f; p.vy *= f;
        p.x += p.vx; p.y += p.vy;
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        if (d > wall) {
          const nx = dx / d, ny = dy / d;
          const dot = p.vx * nx + p.vy * ny;
          if (dot > 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; }
          p.x = cx + nx * wall;
          p.y = cy + ny * wall;
        }
      }

      // ── Glassware stress: honest ideal-gas pressure (n·T/V) + scorching ──
      const press = pressureOf(parts.length, T, V);
      const inDanger = press > DANGER_P || T >= DANGER_T;
      strain = Math.max(0, Math.min(1, strain + (inDanger ? STRAIN_RISE : -STRAIN_FALL)));
      if (strain >= 1) {
        shattered = true;
        jag = Array.from({ length: 26 }, () => Math.random());
        parts = [];
        onShatter.current();
      }

      // Publish stats for the graphs / gauge.
      const D = parts.length - M;
      const concD = D / V, concM = M / V;
      const q = (M * M) / (Math.max(0.5, D) * V);
      stats.current = { D, M, concD, concM, q, k: pf / pr, strain };

      // The glass rattles as the strain builds.
      const shake = strain > 0.02 ? (Math.random() - 0.5) * strain * 6 : 0;
      ctx.save();
      ctx.translate(shake, 0);

      // ── Render the bench: stand → burner flame → vapour → glass ──
      // Retort-stand legs behind the flask.
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 28%, transparent)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.7, bulbBottom - R * 0.26); ctx.lineTo(cx - R * 0.95, H - 8);
      ctx.moveTo(cx + R * 0.7, bulbBottom - R * 0.26); ctx.lineTo(cx + R * 0.95, H - 8);
      ctx.stroke();

      // The burner — its flame grows with the valve (temperature) and licks
      // the round bottom; even at the minimum a pilot flame survives.
      const nozzleY = H - 16;
      const heat = (T - T_MIN) / (T_MAX - T_MIN);
      const flick = 1 + Math.sin(performance.now() / 90) * 0.06 + Math.sin(performance.now() / 41) * 0.03;
      const maxH = nozzleY - bulbBottom + R * 0.18; // tall flames hug the bulb
      const flameH = (10 + heat * (maxH - 10)) * flick;
      const flame = (wMul: number, hMul: number, fill: string) => {
        const fh = flameH * hMul;
        const fw = (9 + heat * 15) * wMul;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(cx - fw, nozzleY);
        ctx.quadraticCurveTo(cx - fw, nozzleY - fh * 0.55, cx, nozzleY - fh);
        ctx.quadraticCurveTo(cx + fw, nozzleY - fh * 0.55, cx + fw, nozzleY);
        ctx.closePath();
        ctx.fill();
      };
      flame(1, 1, "rgba(217, 119, 6, 0.72)");
      flame(0.62, 0.8, "rgba(245, 158, 11, 0.85)");
      flame(0.34, 0.55, "rgba(253, 230, 138, 0.95)");
      // Burner base.
      ctx.fillStyle = "color-mix(in oklab, var(--color-parchment) 38%, transparent)";
      ctx.fillRect(cx - 17, nozzleY, 34, 8);

      // The glass interior (bulb + sealed neck) — tint and particles clip to it.
      const glassPath = () => {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.rect(cx - neckW / 2, neckTop, neckW, Math.max(0, neckBottomY - neckTop + 2));
      };

      // The colour IS the readout: brown vapour deepens with [NO₂].
      glassPath();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = `rgba(146, 64, 14, ${Math.min(0.55, concM / 90).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Particles: N₂O₄ = fused pale pair (colourless), NO₂ = single brown dot.
      glassPath();
      ctx.save();
      ctx.clip();
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
      ctx.restore();

      // The glass itself: bulb (skipping the neck notch), neck walls, stopper.
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 45%, transparent)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2 + th, -Math.PI / 2 - th + Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - neckW / 2, neckTop); ctx.lineTo(cx - neckW / 2, neckBottomY);
      ctx.moveTo(cx + neckW / 2, neckTop); ctx.lineTo(cx + neckW / 2, neckBottomY);
      ctx.stroke();
      // A soft highlight so the bulb reads as glass.
      ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 8, Math.PI * 1.1, Math.PI * 1.38);
      ctx.stroke();
      // Sealed stopper on top — this demo tube is closed.
      ctx.fillStyle = "color-mix(in oklab, var(--color-parchment) 42%, transparent)";
      ctx.beginPath();
      ctx.roundRect(cx - neckW / 2 - 5, neckTop - 9, neckW + 10, 13, 3);
      ctx.fill();

      // Stress cracks crawl across the bulb as the strain builds.
      if (strain > 0.22) {
        ctx.strokeStyle = `rgba(248, 113, 113, ${(0.35 + strain * 0.55).toFixed(2)})`;
        ctx.lineWidth = 1.8;
        const cracks: [number, number][] = [[0.35, 1], [0.78, -1], [0.58, 1]];
        cracks.forEach(([ang, dir], i) => {
          if (strain < 0.22 + i * 0.26) return;
          const len = R * (0.22 + strain * 0.4);
          let px2 = cx + Math.cos(Math.PI * ang) * R * 0.92;
          let py2 = cy + Math.sin(Math.PI * ang) * R * 0.92;
          ctx.beginPath();
          ctx.moveTo(px2, py2);
          for (let s2 = 0; s2 < 4; s2++) {
            px2 += dir * len * 0.25 * (0.6 + ((i + s2) % 3) * 0.3);
            py2 += (s2 % 2 === 0 ? -1 : 1) * len * 0.18;
            ctx.lineTo(px2, py2);
          }
          ctx.stroke();
        });
      }

      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [sim, cmd, stats, onShatter]);

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
  const [broken, setBroken] = useState(false);
  const [history, setHistory] = useState<Sample[]>([]);
  const [gauge, setGauge] = useState<SimStats>({ D: SEED_DIMERS, M: 0, concD: SEED_DIMERS, concM: 0, q: 0, k: 16, strain: 0 });

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "equilibrium"); }, [uid]);

  const sim = useRef<SimIn>({ T, V });
  useEffect(() => { sim.current = { T, V }; }, [T, V]);
  const cmd = useRef<SimCmd>({ inject: 0, reset: false });
  const stats = useRef<SimStats>({ D: SEED_DIMERS, M: 0, concD: SEED_DIMERS, concM: 0, q: 0, k: 16, strain: 0 });

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
  const reset = () => {
    cmd.current.reset = true;
    setBroken(false);
    setT(T_DEFAULT);
    setV(1.0);
    setNote(null);
    setHistory([]);
  };

  // Fired from inside the sim the moment the glass gives way.
  const onShatter = useRef<() => void>(() => {});
  onShatter.current = () => {
    setBroken(true);
    counsel(
      "CRACK — the flask gave way! Too much heat and pressure for the glass. Perfectly normal: every alchemist breaks a flask or two. Fit a fresh one and carry on.",
    );
  };

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
            <div className="relative rounded-2xl overflow-hidden"
              style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
              {broken && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center"
                  style={{ background: "rgba(11, 18, 32, 0.78)", backdropFilter: "blur(2px)" }}
                >
                  <div className="max-w-sm">
                    <p className="font-display text-3xl mb-2 text-crimson">CRACK!</p>
                    <p className="text-sm text-parchment mb-1.5">
                      The flask gave way — too much heat and pressure for the glass to hold.
                    </p>
                    <p className="text-xs text-parchment/70 mb-5">
                      Perfectly normal. Every alchemist breaks a flask or two — that's what the
                      spares cupboard is for. Nothing is lost but the glass.
                    </p>
                    <button onClick={reset} className="btn-arcane btn-arcane-hover text-sm">
                      <FlaskConical className="h-4 w-4" /> Fit a fresh flask
                    </button>
                  </div>
                </div>
              )}
              <ParticleStage sim={sim} cmd={cmd} stats={stats} onShatter={onShatter} />
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
                    {gauge.D} colourless dimers · {gauge.M} brown NO₂ — the tint of the flask is your instrument.
                  </div>
                  {!broken && gauge.strain > 0.22 && (
                    <div className="mt-0.5 text-xs text-crimson animate-pulse">
                      ⚠ The glass is straining — ease the flame or the pressure before it gives way.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stress controls — inert while the flask is in pieces */}
            <div className={broken ? "space-y-4 opacity-45 pointer-events-none" : "space-y-4"}>
              <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid color-mix(in oklab, var(--color-amber-scry) 28%, transparent)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--color-amber-scry)" }}>
                    <Flame className="h-3.5 w-3.5" /> The burner valve
                  </span>
                  <span className="font-ui font-medium text-lg" style={{ color: "var(--color-amber-scry)" }}>
                    {T} <span className="text-xs text-parchment/60">K</span>
                    <span className="text-xs text-parchment/60 ml-2">({(T - 273.15).toFixed(0)} °C)</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4">
                  <ValveWheel
                    value={T}
                    min={T_MIN}
                    max={T_MAX}
                    step={1}
                    onChange={onTemp}
                    color="var(--color-amber-scry)"
                    label="Burner valve — flask temperature in kelvin"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-parchment/70 leading-snug">
                      Turn the wheel to open the gas — the flame beneath the flask grows and
                      the glass warms. N₂O₄ + heat ⇌ 2 NO₂: the{" "}
                      <span style={{ color: "var(--color-amber-scry)" }}>forward direction is endothermic</span>{" "}
                      (ΔH = +57 kJ/mol), so a taller flame browns the vapour.
                    </p>
                    <div className="mt-2 flex justify-between text-[10px] text-parchment/50">
                      <span>closed · {T_MIN} K</span>
                      <span>wide open · {T_MAX} K</span>
                    </div>
                  </div>
                </div>
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
              <span className="text-gold">equal rates</span>, which is why the concentrations flat-line while the flask
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
