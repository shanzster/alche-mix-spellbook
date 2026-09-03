import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Minus, Plus, RotateCcw, Snowflake, Star, Thermometer, Trophy } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/thermo")({
  component: () => (
    <RequireAuth>
      <Thermo />
    </RequireAuth>
  ),
});

const ACCENT = "var(--color-amber-scry)";

// ── The calorimeter cell (stated assumptions, shown to the student) ─────────
// 100 mL of water ≈ 100 g, c = 4.18 J/g·K, starting at 21.0 °C.
// Ideal insulation: every joule the reaction releases/absorbs goes to the water.
const M_WATER = 100; // g
const C_WATER = 4.18; // J/g·K
const T0 = 21.0; // °C

// ── Real dissolution / reaction enthalpies (kJ/mol) ─────────────────────────
type SaltId = "naoh" | "nh4no3" | "cacl2" | "kno3" | "neut";
interface Salt {
  id: SaltId;
  name: string;
  formula: string;
  /** Enthalpy of dissolution (or reaction) in kJ/mol. Negative = exothermic. */
  dH: number;
  /** Molar mass (g/mol) — null for the in-solution neutralisation. */
  molarMass: number | null;
  note: string;
}

const SALTS: Salt[] = [
  { id: "naoh", name: "Sodium hydroxide", formula: "NaOH", dH: -44.5, molarMass: 40.0, note: "Dissolving lye warms the water noticeably — exothermic." },
  { id: "nh4no3", name: "Ammonium nitrate", formula: "NH₄NO₃", dH: +25.7, molarMass: 80.04, note: "The instant-cold-pack salt — dissolving it chills the water." },
  { id: "cacl2", name: "Calcium chloride", formula: "CaCl₂", dH: -82.8, molarMass: 110.98, note: "The hand-warmer and road-de-icer salt — strongly exothermic." },
  { id: "kno3", name: "Potassium nitrate", formula: "KNO₃", dH: +34.9, molarMass: 101.1, note: "Saltpetre drinks in heat as it dissolves — endothermic." },
  { id: "neut", name: "HCl + NaOH neutralisation", formula: "HCl + NaOH", dH: -57.1, molarMass: null, note: "Equal moles of strong acid and strong base — the classic heat of neutralisation." },
];

const saltById = (id: SaltId): Salt => SALTS.find((s) => s.id === id) ?? SALTS[0];

/** Temperature change of the water: q = n·ΔH released → ΔT = −n·ΔH·1000 / (m·c). */
function deltaT(n: number, dH: number): number {
  return (-n * dH * 1000) / (M_WATER * C_WATER);
}

// ── Simulation timeline ─────────────────────────────────────────────────────
const T_END = 20; // plotted seconds
const ADD_AT = 4; // salt goes in after a flat baseline
const TAU = 3; // asymptotic approach time constant
const SPEED = 2.5; // sim-seconds per real second

function tempAt(tSim: number, dT: number): number {
  if (tSim <= ADD_AT) return T0;
  return T0 + dT * (1 - Math.exp(-(tSim - ADD_AT) / TAU));
}

// ── Small colour helper: water tint from cold blue to hot red ───────────────
function mixHex(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const [r, g, bl] = [0, 1, 2].map((i) => Math.round(pa[i] + (pb[i] - pa[i]) * k));
  return `rgb(${r},${g},${bl})`;
}
function waterColor(T: number): string {
  if (T <= T0) return mixHex("#0ea5e9", "#38bdf8", (T - 0) / T0); // colder → deeper blue
  return mixHex("#38bdf8", "#ef4444", (T - T0) / 45); // warmer → red
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

function pill(active: boolean) {
  return active
    ? {
        background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`,
        color: ACCENT,
        border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)`,
      }
    : {
        color: "var(--color-parchment)",
        border: "1px solid color-mix(in oklab, var(--color-parchment) 18%, transparent)",
      };
}

// ── The calorimeter (nested coffee cups, lid, thermometer, stirrer) ─────────
function Calorimeter({ T, stirring, adding }: { T: number; stirring: boolean; adding: boolean }) {
  const wc = waterColor(T);
  // Thermometer scale 0–70 °C mapped onto the tube.
  const frac = Math.max(0, Math.min(1, T / 70));
  const colTop = 148 - frac * 118;
  return (
    <svg viewBox="0 0 260 250" className="w-full max-w-[300px]" role="img" aria-label={`Coffee-cup calorimeter at ${T.toFixed(1)} degrees Celsius`}>
      <style>{`
        @keyframes thermoStir { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes thermoDrop { 0% { transform: translateY(-46px); opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(46px); opacity: 0; } }
      `}</style>

      {/* inner cup (taller — its rim peeks above the outer styrofoam cup) */}
      <path
        d="M 62 62 L 198 62 L 185 210 Q 184 219 175 219 L 85 219 Q 76 219 75 210 Z"
        fill="color-mix(in oklab, var(--color-parchment) 14%, transparent)"
        stroke="color-mix(in oklab, var(--color-parchment) 45%, transparent)"
        strokeWidth="2"
      />
      {/* water inside the inner cup */}
      <clipPath id="thermo-inner-cup">
        <path d="M 62 62 L 198 62 L 185 210 Q 184 219 175 219 L 85 219 Q 76 219 75 210 Z" />
      </clipPath>
      <g clipPath="url(#thermo-inner-cup)">
        <rect x="55" y="108" width="150" height="120" fill={wc} opacity="0.55" />
        <rect x="55" y="108" width="150" height="4" fill="#ffffff" opacity="0.3" />
      </g>

      {/* falling salt crystals during the add */}
      {adding && (
        <g fill="var(--color-parchment)">
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={122 + i * 9}
              cy={80}
              r={2.4}
              style={{ animation: `thermoDrop 0.9s linear ${i * 0.18}s infinite` }}
            />
          ))}
        </g>
      )}

      {/* stirrer — behind the lid, wiggling while the mix runs */}
      <g style={stirring ? { animation: "thermoStir 0.8s ease-in-out infinite", transformOrigin: "100px 60px" } : undefined}>
        <line x1="100" y1="18" x2="106" y2="196" stroke="color-mix(in oklab, var(--color-parchment) 65%, transparent)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="99" cy="14" r="7" fill="none" stroke="color-mix(in oklab, var(--color-parchment) 65%, transparent)" strokeWidth="3" />
      </g>

      {/* lid */}
      <ellipse cx="130" cy="62" rx="72" ry="10" fill="color-mix(in oklab, var(--color-slate-sunken) 90%, var(--color-parchment))" stroke="color-mix(in oklab, var(--color-parchment) 40%, transparent)" strokeWidth="1.5" />

      {/* outer styrofoam cup, in front — the nested-cup insulation */}
      <path
        d="M 50 78 L 210 78 L 196 228 Q 195 237 186 237 L 74 237 Q 65 237 64 228 Z"
        fill="color-mix(in oklab, var(--color-slate-sunken) 65%, var(--color-parchment) 10%)"
        stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)"
        strokeWidth="2.5"
        opacity="0.92"
      />
      <line x1="54" y1="118" x2="206" y2="118" stroke="color-mix(in oklab, var(--color-parchment) 22%, transparent)" strokeWidth="1" />
      <text x="130" y="232" textAnchor="middle" fontSize="8.5" fill="var(--color-parchment)" opacity="0.5">
        styrofoam × 2 — the insulation
      </text>

      {/* thermometer through the lid */}
      <rect x="148" y="22" width="10" height="132" rx="5" fill="color-mix(in oklab, var(--color-slate-sunken) 40%, transparent)" stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)" strokeWidth="1.5" />
      <circle cx="153" cy="163" r="10" fill={wc} stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)" strokeWidth="1.5" />
      <rect x="150.5" y={colTop} width="5" height={158 - colTop} rx="2.5" fill={wc} />
      {[0, 20, 40, 60].map((t) => {
        const y = 148 - (t / 70) * 118;
        return (
          <g key={t}>
            <line x1="144" y1={y} x2="148" y2={y} stroke="var(--color-parchment)" strokeWidth="1" opacity="0.6" />
            <text x="141" y={y + 2.5} textAnchor="end" fontSize="7.5" fill="var(--color-parchment)" opacity="0.6">
              {t}
            </text>
          </g>
        );
      })}
      <text x="153" y="14" textAnchor="middle" fontSize="8" fill="var(--color-parchment)" opacity="0.6">
        °C
      </text>
    </svg>
  );
}

// ── Temperature vs time plot with ΔT bracket ────────────────────────────────
function TempPlot({ tSim, dT, accent }: { tSim: number; dT: number; accent: string }) {
  const VW = 340,
    VH = 200,
    padL = 42,
    padR = 46,
    padT = 14,
    padB = 28;
  const Tf = T0 + dT;
  const lo = Math.floor(Math.min(T0, Tf) - 4);
  const hi = Math.ceil(Math.max(T0, Tf) + 4);
  const x = (t: number) => padL + (t / T_END) * (VW - padL - padR);
  const y = (temp: number) => padT + (1 - (temp - lo) / (hi - lo)) * (VH - padT - padB);

  const pts: string[] = [];
  for (let t = 0; t <= tSim + 1e-9; t += T_END / 160) pts.push(`${x(t).toFixed(1)},${y(tempAt(t, dT)).toFixed(1)}`);
  const Tnow = tempAt(tSim, dT);

  // Gridline temperatures: baseline + a few round values.
  const step = hi - lo > 30 ? 10 : 5;
  const grid: number[] = [];
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) grid.push(g);

  const showBracket = tSim > ADD_AT + 1 && Math.abs(Tnow - T0) > 0.4;
  const bx = VW - padR + 12;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Temperature of the water versus time">
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
      <line x1={padL} y1={VH - padB} x2={VW - padR} y2={VH - padB} stroke="var(--color-border)" strokeWidth="1" />
      <text x={(padL + VW - padR) / 2} y={VH - 8} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6">
        time (s) →
      </text>
      <text x={12} y={(padT + VH - padB) / 2} textAnchor="middle" fontSize="9" fill="var(--color-parchment)" opacity="0.6" transform={`rotate(-90 12 ${(padT + VH - padB) / 2})`}>
        T (°C)
      </text>

      {grid.map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={VW - padR} y2={y(g)} stroke="var(--color-border)" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.6" />
          <text x={padL - 4} y={y(g) + 3} textAnchor="end" fontSize="8" fill="var(--color-parchment)" opacity="0.6">
            {g}
          </text>
        </g>
      ))}

      {/* pre-mix baseline reference */}
      <line x1={padL} y1={y(T0)} x2={VW - padR} y2={y(T0)} stroke="color-mix(in oklab, var(--color-gold) 55%, transparent)" strokeWidth="1" strokeDasharray="5 4" />
      <text x={VW - padR - 2} y={y(T0) + (dT >= 0 ? 11 : -5)} textAnchor="end" fontSize="8" fill="var(--color-gold)" opacity="0.85">
        baseline 21.0 °C
      </text>

      {/* salt-added marker */}
      <line x1={x(ADD_AT)} y1={padT} x2={x(ADD_AT)} y2={VH - padB} stroke="color-mix(in oklab, var(--color-parchment) 30%, transparent)" strokeWidth="0.75" strokeDasharray="2 3" />
      <text x={x(ADD_AT)} y={padT - 3} textAnchor="middle" fontSize="7.5" fill="var(--color-parchment)" opacity="0.6">
        added
      </text>

      {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={x(tSim)} cy={y(Tnow)} r="4.5" fill={accent} stroke="var(--color-background)" strokeWidth="1.5" />

      {/* ΔT bracket annotation */}
      {showBracket && (
        <g stroke="var(--color-gold)" strokeWidth="1.25">
          <line x1={bx} y1={y(T0)} x2={bx} y2={y(Tnow)} />
          <line x1={bx - 4} y1={y(T0)} x2={bx + 4} y2={y(T0)} />
          <line x1={bx - 4} y1={y(Tnow)} x2={bx + 4} y2={y(Tnow)} />
          <text x={bx} y={(y(T0) + y(Tnow)) / 2 - 6} textAnchor="middle" fontSize="8.5" fill="var(--color-gold)" stroke="none" transform={`rotate(-90 ${bx} ${(y(T0) + y(Tnow)) / 2 - 6})`}>
            ΔT = {Tnow - T0 >= 0 ? "+" : ""}
            {(Tnow - T0).toFixed(1)} °C
          </text>
        </g>
      )}
    </svg>
  );
}

// ── Mystery generator for the Assay ─────────────────────────────────────────
const TRIAL_MOLES = [0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16];
function randomMystery(): { saltId: SaltId; n: number } {
  const salt = SALTS[Math.floor(Math.random() * SALTS.length)];
  const n = TRIAL_MOLES[Math.floor(Math.random() * TRIAL_MOLES.length)];
  return { saltId: salt.id, n };
}

interface Verdict {
  score: number;
  stars: number;
  notes: string[];
  dhOk: boolean;
  idOk: boolean;
}

function Thermo() {
  const { uid, profile } = useUserProfile();
  useEffect(() => {
    if (uid) void logPractice(uid, "thermo");
  }, [uid]);

  const [mode, setMode] = useState<"practice" | "trial">("practice");
  const [saltId, setSaltId] = useState<SaltId>("naoh");
  const [n, setN] = useState(0.1);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [tSim, setTSim] = useState(0);

  // Assay state
  const [mystery, setMystery] = useState(randomMystery);
  const [ansDT, setAnsDT] = useState("");
  const [ansQ, setAnsQ] = useState("");
  const [ansDH, setAnsDH] = useState("");
  const [pickId, setPickId] = useState<SaltId | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const startRef = useRef(Date.now());

  const trial = mode === "trial";
  const salt = saltById(trial ? mystery.saltId : saltId);
  const moles = trial ? mystery.n : n;
  const dT = deltaT(moles, salt.dH);
  const Tnow = tempAt(tSim, dT);
  const exo = salt.dH < 0;

  // Animation loop — the temperature climbs/falls asymptotically toward T0 + ΔT.
  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTSim((t) => Math.min(T_END, t + dt * SPEED));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);
  useEffect(() => {
    if (phase === "running" && tSim >= T_END) setPhase("done");
  }, [phase, tSim]);

  const reset = () => {
    setPhase("idle");
    setTSim(0);
  };
  const addAndStir = () => {
    if (phase === "running") return;
    setTSim(0);
    setPhase("running");
  };
  const changeSalt = (id: SaltId) => {
    setSaltId(id);
    reset();
  };
  const stepMoles = (d: number) => {
    setN((v) => Math.max(0.02, Math.min(0.2, +(v + d).toFixed(2))));
    reset();
  };

  const newMystery = () => {
    setMystery(randomMystery());
    setAnsDT("");
    setAnsQ("");
    setAnsDH("");
    setPickId(null);
    setVerdict(null);
    reset();
    startRef.current = Date.now();
  };
  const switchMode = (m: "practice" | "trial") => {
    if (m === mode) return;
    setMode(m);
    reset();
    if (m === "trial") {
      setMystery(randomMystery());
      setAnsDT("");
      setAnsQ("");
      setAnsDH("");
      setPickId(null);
      setVerdict(null);
      startRef.current = Date.now();
    }
  };

  // True values for the current mystery.
  const trueDT = deltaT(mystery.n, saltById(mystery.saltId).dH);
  const trueQkJ = (M_WATER * C_WATER * trueDT) / 1000; // heat gained by the water, kJ
  const trueDH = saltById(mystery.saltId).dH;

  const grade = () => {
    const g = parseFloat(ansDH);
    if (!isFinite(g) || pickId === null) return;
    const gotWarmer = trueDT > 0;
    const dhOk = Math.abs(g - trueDH) / Math.abs(trueDH) <= 0.1;
    const idOk = pickId === mystery.saltId;
    const score = (dhOk ? 2 : 0) + (idOk ? 1 : 0);

    const notes: string[] = [];
    // ΔT / q step checks (only commented on when filled in).
    const gDT = parseFloat(ansDT);
    if (isFinite(gDT) && Math.abs(gDT - trueDT) > 0.3) {
      notes.push(
        `ΔT check: the thermometer went from 21.0 °C to ${(T0 + trueDT).toFixed(1)} °C, so ΔT = ${trueDT >= 0 ? "+" : ""}${trueDT.toFixed(1)} °C — you wrote ${gDT}.`,
      );
    }
    const gQ = parseFloat(ansQ);
    if (isFinite(gQ) && Math.abs(gQ - trueQkJ) / Math.abs(trueQkJ) > 0.1) {
      if (Math.abs(Math.abs(gQ) / Math.abs(trueQkJ) - 1000) < 150) {
        notes.push("q check: that looks like joules — the form asks for kilojoules. Divide by 1000.");
      } else {
        notes.push(
          `q check: q = m·c·ΔT = 100 g × 4.18 J/g·K × ${trueDT.toFixed(1)} K = ${(trueQkJ * 1000).toFixed(0)} J = ${trueQkJ.toFixed(2)} kJ gained by the water.`,
        );
      }
    }
    // ΔH verdict with error-specific counsel.
    if (dhOk) {
      notes.push("Your ΔH lands within 10% of the true value — sound calorimetry. (+2 pts)");
    } else if (Math.sign(g) !== Math.sign(trueDH) && Math.abs(Math.abs(g) - Math.abs(trueDH)) / Math.abs(trueDH) <= 0.1) {
      notes.push(
        gotWarmer
          ? "Sign slip: your ΔH is positive — that claims endothermic — but the cauldron got warmer. Heat flowed out of the reaction into the water, so ΔH must be negative. Remember ΔH = −q(water)/n."
          : "Sign slip: your ΔH sign says exothermic, but the cauldron got colder. The dissolving stole heat from the water, so ΔH is positive. Remember ΔH = −q(water)/n.",
      );
    } else if (Math.abs(g) > 0 && Math.abs(Math.abs(g) / Math.abs(trueDH) - 1000) < 200) {
      notes.push("Unit slip: your ΔH is about 1000× too large — you computed in J/mol. The table (and the form) use kJ/mol.");
    } else if (Math.abs(Math.abs(g) - Math.abs(trueQkJ)) / Math.abs(trueQkJ) <= 0.1) {
      notes.push(`That value is q, the heat in kJ — not ΔH. Divide by the moles added (n = ${mystery.n.toFixed(2)} mol) and flip the sign to get kJ/mol.`);
    } else {
      notes.push("ΔH off the mark: q = m·c·ΔT (in kJ), then ΔH = −q ÷ n. Watch the sign — warmer water means a negative ΔH.");
    }
    notes.push(
      idOk
        ? "Identification correct — the ΔH you measured matches that salt's fingerprint. (+1 pt)"
        : `It was ${saltById(mystery.saltId).formula} (ΔH = ${trueDH > 0 ? "+" : ""}${trueDH} kJ/mol). Match your computed ΔH against the table — each salt's value is its fingerprint.`,
    );

    setVerdict({ score, stars: score, notes, dhOk, idOk });
    void recordTrial(uid, "thermo", {
      score,
      outOf: 3,
      stars: score,
      timeSec: Math.round((Date.now() - startRef.current) / 1000),
    });
  };

  const best = profile?.trials?.thermo;
  const mixed = tSim > ADD_AT;
  const qNowKJ = useMemo(() => (M_WATER * C_WATER * (Tnow - T0)) / 1000, [Tnow]);

  const glow =
    phase !== "idle" && mixed
      ? exo
        ? "0 0 60px -12px color-mix(in oklab, var(--color-crimson) 70%, transparent)"
        : "0 0 60px -12px rgba(56,189,248,0.6)"
      : "none";

  return (
    <ModuleShell
      title="The Cauldron of Heat"
      eyebrow="Thermochemistry — Calorimetry"
      icon={Flame}
      accent={ACCENT}
      subtitle="A coffee-cup calorimeter: 100 mL of water at 21.0 °C. Add a salt, stir, and read the heat of the reaction straight off the thermometer — q = m·c·ΔT."
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
              Practice
            </button>
            <button onClick={() => switchMode("trial")} className="rounded-full px-3 py-1 text-xs transition" style={pill(trial)}>
              <Trophy className="inline h-3 w-3 mr-1 -mt-0.5" />
              Assay of the Mystery Salt
            </button>
          </div>
        </div>

        {!trial && (
          <>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Into the cauldron</div>
              <div className="flex flex-wrap gap-1.5">
                {SALTS.map((s) => (
                  <button key={s.id} onClick={() => changeSalt(s.id)} className="rounded-full px-3 py-1 text-xs transition" style={pill(saltId === s.id)} title={`${s.name} · ΔH = ${s.dH > 0 ? "+" : ""}${s.dH} kJ/mol`}>
                    {s.formula}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Amount</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => stepMoles(-0.02)} disabled={n <= 0.02} className="btn-ghost-arcane text-xs disabled:opacity-40" aria-label="Less salt">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-ui font-medium text-sm px-1 tabular-nums" style={{ color: ACCENT }}>
                  {n.toFixed(2)} mol
                </span>
                <button onClick={() => stepMoles(0.02)} disabled={n >= 0.2} className="btn-ghost-arcane text-xs disabled:opacity-40" aria-label="More salt">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] text-parchment/50 ml-1">
                  {salt.molarMass !== null ? `= ${(n * salt.molarMass).toFixed(1)} g of ${salt.formula}` : `${n.toFixed(2)} mol of each, in solution`}
                </span>
              </div>
            </div>
          </>
        )}

        {trial && (
          <div className="text-sm text-parchment leading-relaxed">
            A hooded courier delivers <span className="text-gold font-ui font-medium">{mystery.n.toFixed(2)} mol</span> of an unlabelled salt. Add it, read the thermometer, and unmask it below.
          </div>
        )}

        <div className="basis-full -mt-1 text-[11px] text-parchment/50">
          Assumptions: 100 mL water ≈ 100 g, c = 4.18 J/g·K, ideal insulation (no heat escapes the nested cups), and the salt's own heat capacity is ignored.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr] items-start">
        {/* Calorimeter stage */}
        <div
          className="rounded-2xl p-5 flex flex-col items-center transition-shadow duration-700"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--color-violet-deep) 18%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))",
            border: "1px solid var(--color-border)",
            boxShadow: glow,
          }}
        >
          <Calorimeter T={Tnow} stirring={phase === "running"} adding={phase === "running" && tSim >= ADD_AT - 0.3 && tSim <= ADD_AT + 2} />

          <div className="text-center mt-2">
            <div className="font-display text-4xl tabular-nums" style={{ color: waterColor(Tnow) }}>
              {Tnow.toFixed(1)} <span className="text-lg">°C</span>
            </div>
            <div className="text-xs text-parchment/60 mt-0.5 inline-flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5" />
              {phase === "idle" ? "baseline — nothing added yet" : mixed ? `started at ${T0.toFixed(1)} °C` : "stirring the baseline…"}
            </div>

            {/* Exo/endo badge — practice only; in the Assay the direction is the clue */}
            {!trial && mixed && (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={
                  exo
                    ? { background: "color-mix(in oklab, var(--color-crimson) 14%, transparent)", color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 45%, transparent)" }
                    : { background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.45)" }
                }
              >
                {exo ? <Flame className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                {exo ? "Exothermic — heat released into the water" : "Endothermic — heat drawn from the water"}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={addAndStir} disabled={phase === "running"} className="btn-arcane btn-arcane-hover text-sm disabled:opacity-40">
              <Flame className="h-4 w-4" /> Add & stir
            </button>
            <button onClick={reset} className="btn-ghost-arcane text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Empty the cauldron
            </button>
          </div>
        </div>

        {/* Plot + live working */}
        <div className="space-y-4">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] tracking-[0.15em] uppercase text-parchment/70">Temperature vs time</span>
              <span className="text-[10px] text-parchment/50">flat baseline → asymptotic approach to T₀ + ΔT</span>
            </div>
            <TempPlot tSim={tSim} dT={dT} accent={trial ? "var(--color-gold)" : exo ? "#ef4444" : "#38bdf8"} />
          </div>

          {/* Practice: show the whole chain of reasoning, live */}
          {!trial && (
            <div
              className="rounded-xl p-4 text-sm leading-relaxed space-y-1.5"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50">The ledger of heat</div>
              <p className="text-parchment">
                <span style={{ color: ACCENT }}>q released by the mix</span> = n·ΔH = {moles.toFixed(2)} mol × ({salt.dH > 0 ? "+" : ""}
                {salt.dH} kJ/mol) = <span className="font-ui font-medium" style={{ color: ACCENT }}>{(moles * salt.dH).toFixed(2)} kJ</span>
              </p>
              <p className="text-parchment">
                <span style={{ color: ACCENT }}>Water's gain</span> = m·c·ΔT → ΔT = {(-moles * salt.dH).toFixed(2)} kJ ÷ (100 g × 4.18 J/g·K) ={" "}
                <span className="font-ui font-medium" style={{ color: ACCENT }}>
                  {dT >= 0 ? "+" : ""}
                  {dT.toFixed(1)} °C
                </span>
                {" → final "}
                <span className="font-ui font-medium" style={{ color: ACCENT }}>{(T0 + dT).toFixed(1)} °C</span>
              </p>
              <p className="text-xs text-parchment/60">
                So far the water has {qNowKJ >= 0 ? "gained" : "lost"} {Math.abs(qNowKJ).toFixed(2)} kJ. {salt.note}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* The Assay — guided calculation + identification */}
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
            <span className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium text-gold">Assay of the Mystery Salt</span>
            {best && (
              <span className="ml-auto text-xs text-parchment/60 inline-flex items-center gap-1.5">
                Best: <Stars n={best.stars} /> ({best.plays} attempt{best.plays === 1 ? "" : "s"})
              </span>
            )}
          </div>

          {phase !== "done" && verdict === null && (
            <p className="text-sm text-parchment leading-relaxed">
              First run the experiment: press <span className="text-gold">Add &amp; stir</span> and wait for the thermometer to settle. Then work the numbers here.
            </p>
          )}

          {(phase === "done" || verdict !== null) && (
            <>
              <p className="text-sm text-parchment leading-relaxed mb-3">
                The water settled at <span className="text-gold font-ui font-medium">{(T0 + trueDT).toFixed(1)} °C</span> from a 21.0 °C baseline, with{" "}
                <span className="text-gold font-ui font-medium">n = {mystery.n.toFixed(2)} mol</span> added. Work the chain below — signs and units are where assays go wrong.
              </p>

              {verdict === null ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/60 block mb-1">1 · ΔT (°C)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={ansDT}
                        onChange={(e) => setAnsDT(e.target.value)}
                        placeholder="final − 21.0"
                        className="w-full rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none"
                        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}
                      />
                      <span className="text-[10px] text-parchment/50 block mt-1">negative if it cooled</span>
                    </label>
                    <label className="block">
                      <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/60 block mb-1">2 · q of the water (kJ)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={ansQ}
                        onChange={(e) => setAnsQ(e.target.value)}
                        placeholder="m·c·ΔT ÷ 1000"
                        className="w-full rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none"
                        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}
                      />
                      <span className="text-[10px] text-parchment/50 block mt-1">100 g × 4.18 J/g·K × ΔT gives joules — convert!</span>
                    </label>
                    <label className="block">
                      <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/60 block mb-1">3 · ΔH (kJ/mol)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={ansDH}
                        onChange={(e) => setAnsDH(e.target.value)}
                        placeholder="−q ÷ n"
                        className="w-full rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none"
                        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}
                      />
                      <span className="text-[10px] text-parchment/50 block mt-1">flip the sign — heat the water gained, the reaction lost</span>
                    </label>
                  </div>

                  <div>
                    <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/60 block mb-1.5">4 · Unmask the salt — match your ΔH to the table</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SALTS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setPickId(s.id)}
                          className="rounded-full px-3 py-1.5 text-xs transition"
                          style={pill(pickId === s.id)}
                        >
                          {s.formula}
                          <span className="opacity-70 ml-1.5">
                            {s.dH > 0 ? "+" : ""}
                            {s.dH}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={grade} disabled={!isFinite(parseFloat(ansDH)) || pickId === null} className="btn-arcane btn-arcane-hover text-sm disabled:opacity-40">
                      Seal the assay
                    </button>
                    <button onClick={newMystery} className="btn-ghost-arcane text-xs">
                      <RotateCcw className="h-3.5 w-3.5" /> New mystery
                    </button>
                    <span className="text-[11px] text-parchment/50">2 pts for ΔH within ±10% · 1 pt for the right salt</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Stars n={verdict.stars} />
                    <span className="text-sm text-spectral">
                      {verdict.score === 3
                        ? "A flawless assay — the Guild seal is yours."
                        : verdict.score === 2
                          ? "Strong work — one thread left loose."
                          : verdict.score === 1
                            ? "Partial credit — reread the counsel below."
                            : "The salt keeps its secret this time."}
                    </span>
                    <span className="text-xs text-parchment/60">
                      {verdict.score}/3 · true ΔH = {trueDH > 0 ? "+" : ""}
                      {trueDH} kJ/mol ({saltById(mystery.saltId).formula})
                    </span>
                  </div>
                  <ul className="text-xs text-parchment/70 leading-relaxed space-y-1 mb-3">
                    {verdict.notes.map((note, i) => (
                      <li key={i}>· {note}</li>
                    ))}
                  </ul>
                  <button onClick={newMystery} className="btn-arcane btn-arcane-hover text-sm">
                    <RotateCcw className="h-4 w-4" /> Assay a new mystery
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="Exothermic vs endothermic">
          The thermometer never measures the reaction — it measures the <em>water</em>. When bonds and attractions form
          more strongly in the products, the surplus energy pours into the water and it warms: <span className="text-crimson">exothermic, ΔH negative</span>.
          When dissolving must <em>borrow</em> energy to pull a lattice apart, it borrows from the water and the cauldron
          chills: <span style={{ color: "#38bdf8" }}>endothermic, ΔH positive</span>. The sign of ΔH always describes the
          reaction's ledger, which is the mirror of the water's.
        </ConceptCard>
        <ConceptCard title="Reading heat with q = mcΔT">
          Three numbers unlock every calorimetry problem: mass of water (100 g here), its specific heat capacity
          (c = 4.18 J/g·K — unusually high, which is why water makes such a good heat-bank), and the temperature change
          you observe. Multiply them: q = m·c·ΔT gives joules gained by the water. Divide by the moles you added and flip
          the sign, and you hold the reaction's molar enthalpy — the same ΔH printed in data books.
        </ConceptCard>
        <DidYouKnow>
          Squeeze an instant cold pack and you snap an inner pouch of water into solid NH₄NO₃ — exactly the salt in this
          cauldron. Its +25.7 kJ/mol of dissolution drags the pack down toward 0 °C within seconds, no freezer required.
          Sports medics have carried this piece of thermochemistry in their kit bags since the 1970s.
        </DidYouKnow>
        <DidYouKnow>
          Reusable hand warmers run the opposite ledger: supersaturated sodium acetate crystallises exothermically at the
          click of a metal disc, and single-use warmers rust iron powder for hours of gentle heat. CaCl₂ — the strongest
          exotherm in this lab at −82.8 kJ/mol — is spread on winter roads partly <em>because</em> its dissolving heat
          helps melt the ice it lands on.
        </DidYouKnow>
      </div>
    </ModuleShell>
  );
}
