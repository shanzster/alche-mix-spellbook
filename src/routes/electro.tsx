import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Flame, Sparkles, Swords, X as XIcon, Zap } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ChallengeBanner, ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/electro")({
  component: () => (
    <RequireAuth>
      <Electro />
    </RequireAuth>
  ),
});

// ── Metals & standard reduction potentials ──────────────────────────────────
// E° at 25 °C, 1 M, 1 atm, vs the standard hydrogen electrode.
// Source: CRC Handbook of Chemistry & Physics (standard reduction potential
// table) — the same seven metals the AACT "build a galvanic cell" activity uses.
interface Metal {
  id: string;
  symbol: string;
  name: string;
  ion: string; // aqueous cation, e.g. "Zn²⁺"
  charge: number; // electrons transferred per atom
  E: number; // standard reduction potential, volts
  metalColor: string; // electrode tint (illustrative)
  solutionColor: string; // solution tint (Cu²⁺ blue & Fe²⁺ pale green are real; the rest are colourless — faint tints keep the beakers readable)
}

const METALS: Metal[] = [
  { id: "Mg", symbol: "Mg", name: "Magnesium", ion: "Mg²⁺", charge: 2, E: -2.37, metalColor: "#cdd5dd", solutionColor: "#9fb2c4" },
  { id: "Al", symbol: "Al", name: "Aluminium", ion: "Al³⁺", charge: 3, E: -1.66, metalColor: "#aeb8c2", solutionColor: "#a8b6c2" },
  { id: "Zn", symbol: "Zn", name: "Zinc", ion: "Zn²⁺", charge: 2, E: -0.76, metalColor: "#98a4b0", solutionColor: "#a2b0bd" },
  { id: "Fe", symbol: "Fe", name: "Iron", ion: "Fe²⁺", charge: 2, E: -0.44, metalColor: "#a98e77", solutionColor: "#9fc49a" },
  { id: "Pb", symbol: "Pb", name: "Lead", ion: "Pb²⁺", charge: 2, E: -0.13, metalColor: "#7d8590", solutionColor: "#9aa5b3" },
  { id: "Cu", symbol: "Cu", name: "Copper", ion: "Cu²⁺", charge: 2, E: 0.34, metalColor: "#d97f4a", solutionColor: "#5aa7e8" },
  { id: "Ag", symbol: "Ag", name: "Silver", ion: "Ag⁺", charge: 1, E: 0.8, metalColor: "#dde3ea", solutionColor: "#b9c3ce" },
];

const metalById = (id: string) => METALS.find((m) => m.id === id) ?? METALS[0];
const fmtE = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
const fmtV = (v: number) => `${Math.abs(v).toFixed(2)} V`;

// ── Cell chemistry ──────────────────────────────────────────────────────────
interface Cell {
  same: boolean;
  anode: Metal;
  cathode: Metal;
  voltage: number;
}

/** Higher reduction potential wins the electrons → it is the cathode. */
function cellOf(a: Metal, b: Metal): Cell {
  if (a.id === b.id) return { same: true, anode: a, cathode: b, voltage: 0 };
  const anode = a.E < b.E ? a : b;
  const cathode = a.E < b.E ? b : a;
  return { same: false, anode, cathode, voltage: cathode.E - anode.E };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const co = (n: number) => (n === 1 ? "" : `${n}`);

/** Electron-balanced overall redox equation, e.g. 2Al(s) + 3Cu²⁺(aq) → 2Al³⁺(aq) + 3Cu(s). */
function overallEquation(anode: Metal, cathode: Metal): string {
  const n = lcm(anode.charge, cathode.charge);
  const ca = n / anode.charge;
  const cc = n / cathode.charge;
  return `${co(ca)}${anode.symbol}(s) + ${co(cc)}${cathode.ion}(aq) → ${co(ca)}${anode.ion}(aq) + ${co(cc)}${cathode.symbol}(s)`;
}

const oxidationHalf = (m: Metal) => `${m.symbol}(s) → ${m.ion}(aq) + ${m.charge}e⁻`;
const reductionHalf = (m: Metal) => `${m.ion}(aq) + ${m.charge}e⁻ → ${m.symbol}(s)`;

// ── SVG apparatus — beakers, electrodes, salt bridge, voltmeter ─────────────
function Beaker({ x, metal, role }: { x: number; metal: Metal | null; role: "anode" | "cathode" | null }) {
  const solnTop = 205;
  const solnBot = 332;
  const roleColor = role === "anode" ? "var(--color-crimson)" : role === "cathode" ? "var(--color-emerald-elixir)" : "var(--color-parchment)";
  return (
    <g>
      {/* solution */}
      {metal && (
        <rect x={x + 6} y={solnTop} width={178} height={solnBot - solnTop} rx={4}
          fill={metal.solutionColor} opacity={0.28} />
      )}
      {/* beaker walls (open top) */}
      <path d={`M ${x} 172 L ${x} ${solnBot + 4} Q ${x} ${solnBot + 10} ${x + 6} ${solnBot + 10} L ${x + 184} ${solnBot + 10} Q ${x + 190} ${solnBot + 10} ${x + 190} ${solnBot + 4} L ${x + 190} 172`}
        fill="none" stroke="color-mix(in oklab, var(--color-parchment) 45%, transparent)" strokeWidth={2.5} strokeLinecap="round" />
      {/* solution surface line */}
      {metal && (
        <line x1={x + 6} y1={solnTop} x2={x + 184} y2={solnTop}
          stroke={metal.solutionColor} strokeWidth={1.5} opacity={0.6} />
      )}
      {/* solution label */}
      <text x={x + 95} y={solnBot - 10} textAnchor="middle" fontSize={11} fill="var(--color-parchment)" opacity={0.75}>
        {metal ? `${metal.ion}(aq) · 1 M` : "choose a metal"}
      </text>
      {/* role caption under the beaker */}
      {metal && role && (
        <text x={x + 95} y={solnBot + 28} textAnchor="middle" fontSize={11.5} fill={roleColor} style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {role === "anode" ? "Anode (−) · oxidation" : "Cathode (+) · reduction"}
        </text>
      )}
    </g>
  );
}

function Electrode({ x, metal, role, live }: { x: number; metal: Metal | null; role: "anode" | "cathode" | null; live: boolean }) {
  if (!metal) return null;
  const anim = live && role === "anode"
    ? "electroCorrode 5s ease-in-out infinite alternate"
    : live && role === "cathode"
      ? "electroPlate 5s ease-in-out infinite alternate"
      : "none";
  return (
    <g>
      <g style={{ animation: anim, transformBox: "fill-box", transformOrigin: "center" }}>
        <rect x={x - 11} y={148} width={22} height={150} rx={3}
          fill={metal.metalColor} stroke="color-mix(in oklab, var(--color-background) 55%, transparent)" strokeWidth={1} />
      </g>
      <text x={x} y={178} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-background)">
        {metal.symbol}
      </text>
      {live && role && (
        <text x={x} y={138} textAnchor="middle" fontSize={9.5} fill={role === "anode" ? "var(--color-crimson)" : "var(--color-emerald-elixir)"}>
          {role === "anode" ? "eaten thinner…" : "plating thicker…"}
        </text>
      )}
    </g>
  );
}

function CellApparatus({ left, right, connected }: { left: Metal | null; right: Metal | null; connected: boolean }) {
  const LX = 150; // left electrode centre
  const RX = 490; // right electrode centre
  const cell = left && right ? cellOf(left, right) : null;
  const live = !!cell && connected && !cell.same && cell.voltage > 0;
  const anodeOnLeft = !!cell && !!left && cell.anode.id === left.id;
  const roleOf = (side: "L" | "R"): "anode" | "cathode" | null => {
    if (!cell || !connected || cell.same) return null;
    return (side === "L") === anodeOnLeft ? "anode" : "cathode";
  };
  // Electron path runs anode → voltmeter → cathode so the moving dots show direction.
  const [ax, cx] = anodeOnLeft ? [LX, RX] : [RX, LX];
  const electronPath = `M ${ax} 150 L ${ax} 62 L ${cx} 62 L ${cx} 150`;

  return (
    <svg viewBox="0 0 640 384" className="w-full h-auto" role="img"
      aria-label="Galvanic cell: two beakers with metal electrodes, a salt bridge, and wires to a voltmeter">
      <style>{`
        @keyframes electroFlow { to { stroke-dashoffset: -16.5; } }
        @keyframes electroIons { to { stroke-dashoffset: -13; } }
        @keyframes electroCorrode { from { transform: scaleX(1); } to { transform: scaleX(0.7); } }
        @keyframes electroPlate { from { transform: scaleX(1); } to { transform: scaleX(1.25); } }
      `}</style>

      {/* static wire */}
      <path d={`M ${LX} 150 L ${LX} 62 L ${RX} 62 L ${RX} 150`} fill="none"
        stroke="color-mix(in oklab, var(--color-parchment) 35%, transparent)" strokeWidth={3} strokeLinecap="round" />

      {/* electron flow — moving gold dots along the wire, anode → cathode */}
      {live && (
        <>
          <path d={electronPath} fill="none" stroke="var(--color-gold)" strokeWidth={5}
            strokeLinecap="round" strokeDasharray="0.5 16" style={{ animation: "electroFlow 1.1s linear infinite" }} />
          <text x={anodeOnLeft ? 226 : 414} y={50} textAnchor="middle" fontSize={11} fill="var(--color-gold)">
            e⁻ {anodeOnLeft ? "→" : "←"}
          </text>
        </>
      )}

      {/* voltmeter */}
      <circle cx={320} cy={62} r={36} fill="color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)"
        stroke={live ? "var(--color-gold)" : "var(--color-border)"} strokeWidth={2} />
      <text x={320} y={58} textAnchor="middle" fontSize={15} fontWeight={700}
        fill={live ? "var(--color-gold)" : "var(--color-parchment)"}>
        {cell && connected ? cell.voltage.toFixed(2) : "0.00"}
      </text>
      <text x={320} y={76} textAnchor="middle" fontSize={10} fill="var(--color-parchment)" opacity={0.7}>
        volts
      </text>

      {/* salt bridge — inverted U tube joining the two solutions */}
      <path d="M 235 230 L 235 152 Q 235 120 267 120 L 373 120 Q 405 120 405 152 L 405 230"
        fill="none" stroke="color-mix(in oklab, var(--color-parchment) 40%, transparent)" strokeWidth={26} strokeLinecap="round" />
      <path d="M 235 230 L 235 152 Q 235 120 267 120 L 373 120 Q 405 120 405 152 L 405 230"
        fill="none" stroke="color-mix(in oklab, var(--color-teal) 26%, transparent)" strokeWidth={18} strokeLinecap="round" />
      <text x={320} y={106} textAnchor="middle" fontSize={10} fill="var(--color-parchment)" opacity={0.7}>
        salt bridge (KNO₃)
      </text>

      {/* ion drift in the bridge: cations → cathode, anions → anode */}
      {live && (
        <>
          <path d={anodeOnLeft ? "M 262 132 L 378 132" : "M 378 132 L 262 132"} fill="none"
            stroke="var(--color-teal)" strokeWidth={3.5} strokeLinecap="round" strokeDasharray="0.5 12.5"
            style={{ animation: "electroIons 1.6s linear infinite" }} />
          <path d={anodeOnLeft ? "M 378 146 L 262 146" : "M 262 146 L 378 146"} fill="none"
            stroke="var(--color-crimson)" strokeWidth={3.5} strokeLinecap="round" strokeDasharray="0.5 12.5"
            style={{ animation: "electroIons 1.9s linear infinite" }} />
          <text x={anodeOnLeft ? 435 : 205} y={136} textAnchor={anodeOnLeft ? "start" : "end"} fontSize={9.5} fill="var(--color-teal)">K⁺ → cathode</text>
          <text x={anodeOnLeft ? 205 : 435} y={150} textAnchor={anodeOnLeft ? "end" : "start"} fontSize={9.5} fill="var(--color-crimson)">NO₃⁻ → anode</text>
        </>
      )}

      {/* beakers + electrodes (drawn after the bridge so the glass reads in front) */}
      <Beaker x={55} metal={left} role={roleOf("L")} />
      <Beaker x={395} metal={right} role={roleOf("R")} />
      <Electrode x={LX} metal={left} role={roleOf("L")} live={live} />
      <Electrode x={RX} metal={right} role={roleOf("R")} live={live} />
    </svg>
  );
}

// ── Metal pickers ───────────────────────────────────────────────────────────
function MetalPicker({ label, value, onPick }: { label: string; value: string | null; onPick: (id: string) => void }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/70 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {METALS.map((m) => {
          const active = value === m.id;
          return (
            <button key={m.id} onClick={() => onPick(m.id)}
              className="rounded-full px-3 py-1.5 text-xs transition"
              style={active
                ? { background: `color-mix(in oklab, ${m.metalColor} 26%, transparent)`, border: `1px solid color-mix(in oklab, ${m.metalColor} 70%, transparent)`, color: "var(--color-parchment)", fontWeight: 700 }
                : { border: "1px solid var(--color-border)", color: "var(--color-parchment)", opacity: 0.85 }}>
              {m.symbol} <span className="opacity-60">{fmtE(m.E)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity series panel ───────────────────────────────────────────────────
function ActivitySeries({ cell, connected }: { cell: Cell | null; connected: boolean }) {
  // Sorted by "push": the most negative E° is the strongest electron-pusher.
  const ranked = [...METALS].sort((a, b) => a.E - b.E);
  const span = ranked[ranked.length - 1].E - ranked[0].E; // Ag − Mg
  const live = cell && connected && !cell.same;
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="text-[10px] tracking-[0.2em] uppercase text-gold">Activity series — who pushes hardest?</p>
      <p className="text-xs text-parchment/70 leading-relaxed">
        The lower a metal's reduction potential, the harder it <em>pushes electrons away</em> — the better an anode it
        makes. Pair a strong pusher with a strong receiver for the biggest voltage.
      </p>
      <div className="space-y-1 pt-1">
        {ranked.map((m) => {
          const push = (ranked[ranked.length - 1].E - m.E) / span; // 1 = Mg, 0 = Ag
          const role = live && cell ? (cell.anode.id === m.id ? "anode" : cell.cathode.id === m.id ? "cathode" : null) : null;
          const ring = role === "anode" ? "var(--color-crimson)" : role === "cathode" ? "var(--color-emerald-elixir)" : "transparent";
          return (
            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1"
              style={{ border: `1px solid ${role ? `color-mix(in oklab, ${ring} 55%, transparent)` : "transparent"}`, background: role ? `color-mix(in oklab, ${ring} 8%, transparent)` : "transparent" }}>
              <span className="w-7 text-sm font-ui font-medium text-parchment">{m.symbol}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-parchment) 10%, transparent)" }}>
                <div className="h-full rounded-full" style={{ width: `${8 + push * 92}%`, background: `color-mix(in oklab, var(--color-gold) ${30 + push * 60}%, var(--color-teal))` }} />
              </div>
              <span className="w-14 text-right text-[11px] text-parchment/70">{fmtE(m.E)} V</span>
              {role && (
                <span className="text-[9px] tracking-[0.1em] uppercase" style={{ color: ring }}>{role}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-parchment/70 pt-1">
        {live && cell
          ? <>In your cell, <span className="text-crimson">{cell.anode.name}</span> gives the bigger push — it shoves electrons through the wire to <span style={{ color: "var(--color-emerald-elixir)" }}>{cell.cathode.name}</span> with a {fmtV(cell.voltage)} shove.</>
          : "Magnesium is the mightiest pusher of the seven; silver holds its electrons tightest, so it makes the best cathode."}
      </p>
    </div>
  );
}

// ── License of the Forge — 5-round trial ────────────────────────────────────
interface TrialRound {
  a: Metal;
  b: Metal;
  options: number[]; // 4 voltage choices, one correct
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 4 computed voltage options ≥ 0.06 V apart, built from common student mistakes. */
function voltageOptions(anode: Metal, cathode: Metal): number[] {
  const correct = round2(cathode.E - anode.E);
  const picked = [correct];
  const mistakes = [
    round2(cathode.E + anode.E), // added instead of subtracted
    round2(Math.abs(anode.E)), // used the anode potential alone
    round2(Math.abs(cathode.E)), // used the cathode potential alone
    round2((cathode.E - anode.E) / 2),
    round2(cathode.E - anode.E + 0.4),
    round2(cathode.E - anode.E - 0.35),
    round2(cathode.E - anode.E + 0.75),
  ];
  for (const m of mistakes) {
    if (picked.length >= 4) break;
    if (m >= 0 && picked.every((p) => Math.abs(p - m) > 0.055)) picked.push(m);
  }
  let k = 1;
  while (picked.length < 4) {
    const filler = round2(correct + 0.2 * k * (k % 2 ? 1 : -1));
    if (filler >= 0 && picked.every((p) => Math.abs(p - filler) > 0.055)) picked.push(filler);
    k++;
  }
  return shuffle(picked);
}

function makeRounds(): TrialRound[] {
  const pairs: [Metal, Metal][] = [];
  for (let i = 0; i < METALS.length; i++)
    for (let j = i + 1; j < METALS.length; j++) pairs.push([METALS[i], METALS[j]]);
  return shuffle(pairs).slice(0, 5).map(([a, b]) => {
    const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
    const c = cellOf(x, y);
    return { a: x, b: y, options: voltageOptions(c.anode, c.cathode) };
  });
}

const starsFor = (score: number) => (score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0);

function ForgeTrial({ uid, best }: { uid: string | null; best?: { best: number; outOf: number; stars: number } }) {
  const [mode, setMode] = useState<"intro" | "run" | "done">("intro");
  const [rounds, setRounds] = useState<TrialRound[]>([]);
  const [idx, setIdx] = useState(0);
  const [anodePick, setAnodePick] = useState<string | null>(null);
  const [voltPick, setVoltPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const recorded = useRef(false);

  const start = () => {
    setRounds(makeRounds());
    setIdx(0);
    setScore(0);
    setAnodePick(null);
    setVoltPick(null);
    recorded.current = false;
    setMode("run");
  };

  if (mode === "intro" || mode === "done") {
    const stars = starsFor(score);
    return (
      <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold flex items-center justify-center gap-2">
          <Swords className="h-3.5 w-3.5" /> License of the Forge
        </p>
        {mode === "done" ? (
          <>
            <p className="font-display text-3xl" style={{ color: stars >= 2 ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
              {score}/10 {"★".repeat(stars)}{"☆".repeat(3 - stars)}
            </p>
            <p className="text-sm text-parchment/80 max-w-md mx-auto">
              {stars === 3
                ? "The Forge recognises a master. Every anode named, every voltage true."
                : stars >= 1
                  ? "The Forge glows warm — study the activity series above and return for full mastery."
                  : "The fire dims but never dies. Remember: the more negative potential is always the anode, and E° = E°cathode − E°anode."}
            </p>
          </>
        ) : (
          <p className="text-sm text-parchment/80 max-w-md mx-auto">
            Five random metal pairings. For each: name the <span className="text-crimson">anode</span>, then predict the
            cell voltage to within ±0.05 V. Two points a round — ten to a perfect license.
          </p>
        )}
        {best && (
          <p className="text-xs text-parchment/70">
            Best: <span className="text-gold font-ui font-medium">{best.best}/{best.outOf}</span> {"★".repeat(Math.max(0, Math.min(3, best.stars)))}
          </p>
        )}
        <button onClick={start} className="rounded-full px-6 py-2 text-xs tracking-[0.15em] uppercase transition"
          style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 50%, transparent)", color: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 8%, transparent)" }}>
          {mode === "done" ? "Forge again" : "Enter the Forge"}
        </button>
      </div>
    );
  }

  const r = rounds[idx];
  const cell = cellOf(r.a, r.b);
  const correctV = round2(cell.voltage);
  const anodeDone = anodePick !== null;
  const voltDone = voltPick !== null;
  const anodeRight = anodePick === cell.anode.id;
  const voltRight = voltPick !== null && Math.abs(voltPick - correctV) <= 0.05;

  const pickAnode = (id: string) => {
    if (anodeDone) return;
    setAnodePick(id);
    if (id === cell.anode.id) setScore((s) => s + 1);
  };
  const pickVolt = (v: number) => {
    if (!anodeDone || voltDone) return;
    setVoltPick(v);
    if (Math.abs(v - correctV) <= 0.05) setScore((s) => s + 1);
  };
  const next = () => {
    if (idx + 1 >= rounds.length) {
      if (!recorded.current) {
        recorded.current = true;
        void recordTrial(uid, "electro", { score, outOf: 10, stars: starsFor(score) });
      }
      setMode("done");
    } else {
      setIdx((i) => i + 1);
      setAnodePick(null);
      setVoltPick(null);
    }
  };

  const choiceStyle = (state: "idle" | "right" | "wrong" | "reveal") => {
    const color = state === "right" || state === "reveal" ? "var(--color-emerald-elixir)" : state === "wrong" ? "var(--color-crimson)" : "var(--color-parchment)";
    return {
      color,
      border: `1px solid color-mix(in oklab, ${color} ${state === "idle" ? "25%" : "55%"}, transparent)`,
      background: state === "idle" ? "transparent" : `color-mix(in oklab, ${color} 12%, transparent)`,
    };
  };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold flex items-center gap-2">
          <Swords className="h-3.5 w-3.5" /> License of the Forge · round {idx + 1}/5
        </p>
        <span className="text-xs text-parchment/70">Score: <span className="text-gold font-ui font-medium">{score}</span>/10</span>
      </div>

      <p className="text-sm text-parchment">
        The Forge presents: <span className="font-ui font-medium text-gold">{r.a.name} ({r.a.symbol}, {fmtE(r.a.E)} V)</span>
        {" "}paired with <span className="font-ui font-medium text-gold">{r.b.name} ({r.b.symbol}, {fmtE(r.b.E)} V)</span>.
      </p>

      {/* (a) which is the anode? */}
      <div>
        <p className="text-xs text-parchment/70 mb-2">a) Which metal corrodes away as the anode?</p>
        <div className="flex flex-wrap gap-2">
          {[r.a, r.b].map((m) => {
            const state = !anodeDone ? "idle" : m.id === cell.anode.id ? (anodePick === m.id ? "right" : "reveal") : anodePick === m.id ? "wrong" : "idle";
            return (
              <button key={m.id} onClick={() => pickAnode(m.id)} disabled={anodeDone}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition disabled:cursor-default"
                style={choiceStyle(state)}>
                {anodeDone && m.id === cell.anode.id && <Check className="h-3.5 w-3.5" />}
                {anodeDone && anodePick === m.id && m.id !== cell.anode.id && <XIcon className="h-3.5 w-3.5" />}
                {m.name}
              </button>
            );
          })}
        </div>
        {anodeDone && (
          <p className="text-xs mt-2" style={{ color: anodeRight ? "var(--color-emerald-elixir)" : "var(--color-crimson)" }}>
            {anodeRight ? "Yes — " : "Not quite — "}{cell.anode.symbol} has the more negative potential ({fmtE(cell.anode.E)} V), so it gives up electrons and oxidises.
          </p>
        )}
      </div>

      {/* (b) predict the voltage */}
      {anodeDone && (
        <div>
          <p className="text-xs text-parchment/70 mb-2">b) Predict E°cell (±0.05 V):</p>
          <div className="flex flex-wrap gap-2">
            {r.options.map((v) => {
              const isCorrect = Math.abs(v - correctV) <= 0.05;
              const state = !voltDone ? "idle" : isCorrect ? (voltPick === v ? "right" : "reveal") : voltPick === v ? "wrong" : "idle";
              return (
                <button key={v} onClick={() => pickVolt(v)} disabled={voltDone}
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition disabled:cursor-default"
                  style={choiceStyle(state)}>
                  {voltDone && isCorrect && <Check className="h-3.5 w-3.5" />}
                  {voltDone && voltPick === v && !isCorrect && <XIcon className="h-3.5 w-3.5" />}
                  {v.toFixed(2)} V
                </button>
              );
            })}
          </div>
          {voltDone && (
            <div className="mt-3 space-y-2">
              <p className="text-xs" style={{ color: voltRight ? "var(--color-emerald-elixir)" : "var(--color-crimson)" }}>
                E°cell = E°cathode − E°anode = {fmtE(cell.cathode.E)} − ({fmtE(cell.anode.E)}) = <span className="font-ui font-medium">{correctV.toFixed(2)} V</span>
              </p>
              <p className="text-xs text-parchment/70 font-mono">{overallEquation(cell.anode, cell.cathode)}</p>
              <button onClick={next} className="rounded-full px-5 py-1.5 text-xs tracking-[0.15em] uppercase transition"
                style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)", color: "var(--color-gold)" }}>
                {idx + 1 >= rounds.length ? "Claim your license" : "Next pairing"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
const TARGET_V = 1.1; // the Daniell cell's classic 1.10 V

function Electro() {
  const { uid, profile } = useUserProfile();
  const [leftId, setLeftId] = useState<string | null>("Zn");
  const [rightId, setRightId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => { if (uid) logPractice(uid, "electro"); }, [uid]);

  const left = leftId ? metalById(leftId) : null;
  const right = rightId ? metalById(rightId) : null;
  const cell = left && right ? cellOf(left, right) : null;
  const live = !!cell && connected && !cell.same;
  const targetHit = live && !!cell && Math.abs(cell.voltage - TARGET_V) <= 0.005;

  return (
    <ModuleShell
      title="The Voltaic Forge"
      eyebrow="Electrochemistry"
      icon={Zap}
      accent="var(--color-gold)"
      subtitle="Forge a galvanic cell from two half-cells: pick your metals, bridge the beakers, and watch electrons flow from the eager pusher to the greedy receiver — with a real, measurable voltage."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Builder column */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl overflow-hidden p-2 sm:p-4"
            style={{ background: "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--color-violet-deep) 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
            <CellApparatus left={left} right={right} connected={connected} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetalPicker label="Left half-cell" value={leftId} onPick={setLeftId} />
            <MetalPicker label="Right half-cell" value={rightId} onPick={setRightId} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setConnected((c) => !c)}
              disabled={!left || !right}
              className="rounded-full px-5 py-2 text-xs tracking-[0.15em] uppercase transition disabled:opacity-40"
              style={{
                border: `1px solid color-mix(in oklab, var(--color-gold) ${connected ? 60 : 40}%, transparent)`,
                color: "var(--color-gold)",
                background: connected ? "color-mix(in oklab, var(--color-gold) 12%, transparent)" : "transparent",
              }}>
              <Flame className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
              {connected ? "Break the circuit" : "Connect the wires"}
            </button>
            {!right && <span className="text-xs text-parchment/60">Choose a metal for each beaker, then connect.</span>}
          </div>

          {/* Readout: same-metal note, or the full redox story */}
          {cell && connected && (cell.same ? (
            <div className="rounded-xl p-4 text-sm text-parchment leading-relaxed"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
              <span className="text-crimson font-ui font-medium">0.00 V — no push at all.</span>{" "}
              Two identical {cell.anode.name.toLowerCase()} electrodes want electrons <em>equally</em>, so neither can
              shove electrons at the other. A voltaic cell needs two <em>different</em> metals — a difference in
              reduction potential is the whole engine.
            </div>
          ) : (
            <div className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold">The redox story</p>
              <p className="font-mono text-xs sm:text-sm text-crimson">
                Anode (oxidation): {oxidationHalf(cell.anode)} <span className="text-parchment/50">· E° = {fmtE(cell.anode.E)} V</span>
              </p>
              <p className="font-mono text-xs sm:text-sm" style={{ color: "var(--color-emerald-elixir)" }}>
                Cathode (reduction): {reductionHalf(cell.cathode)} <span className="text-parchment/50">· E° = {fmtE(cell.cathode.E)} V</span>
              </p>
              <p className="font-mono text-xs sm:text-sm text-parchment border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                Overall: {overallEquation(cell.anode, cell.cathode)}
              </p>
              <p className="text-xs text-parchment/70">
                E°cell = E°cathode − E°anode = {fmtE(cell.cathode.E)} − ({fmtE(cell.anode.E)}) ={" "}
                <span className="text-gold font-ui font-medium">{cell.voltage.toFixed(2)} V</span>
              </p>
            </div>
          ))}
        </div>

        {/* Series + challenge column */}
        <div className="space-y-4 min-w-0">
          <ActivitySeries cell={cell} connected={connected} />
          <ChallengeBanner
            prompt={<>Forge a cell as close to <span className="text-gold">1.10 V</span> as you can — the alchemists of old called it the Daniell cell.</>}
            solved={targetHit}
            hint={live && cell
              ? <>Your cell reads {cell.voltage.toFixed(2)} V — {Math.abs(cell.voltage - TARGET_V) < 0.3 ? "so close. " : ""}off by {Math.abs(cell.voltage - TARGET_V).toFixed(2)} V. Try a different pairing.</>
              : "Build and connect a cell first. One classic pairing lands on 1.10 V exactly."}
          />
        </div>
      </div>

      {/* Trial */}
      <div className="mt-8">
        <ForgeTrial uid={uid} best={profile?.trials?.["electro"]} />
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="An ox and a red cat">
          Remember it as the alchemists do: <span className="text-crimson">an ox</span> — <em>an</em>ode is{" "}
          <em>ox</em>idation, the metal dissolving as it gives electrons away — and{" "}
          <span style={{ color: "var(--color-emerald-elixir)" }}>red cat</span> — <em>red</em>uction at the{" "}
          <em>cat</em>hode, where ions grab those electrons and plate on as fresh metal. Electrons always march
          through the wire from anode to cathode; the metal with the more negative E° is always the anode.
        </ConceptCard>
        <ConceptCard title="Why the salt bridge matters">
          As the anode dissolves, its beaker fills with extra <span className="text-crimson">positive ions</span>; the
          cathode's beaker runs short of them. Charge would pile up and stop the flow within a heartbeat. The salt
          bridge lets spectator ions drift — cations toward the cathode, anions toward the anode — keeping both
          beakers neutral so the current can keep flowing. Pull the bridge and the voltmeter drops to zero.
        </ConceptCard>
        <DidYouKnow>
          The zinc–copper pairing you can build here is the <em>Daniell cell</em> of 1836 — its steady 1.10 V powered
          the world's first telegraph networks. The "volt" itself honours Alessandro Volta, whose 1800 pile of zinc
          and silver discs was the first true battery.
        </DidYouKnow>
        <DidYouKnow>
          Every battery in your life is a voltaic cell in disguise: an alkaline AA is zinc versus manganese dioxide
          (~1.5 V), and a phone's lithium-ion cell stacks up ~3.7 V per cell because lithium is an even mightier
          electron-pusher than magnesium. Cells in series simply add their pushes — a 12 V car battery is six 2 V
          lead–acid cells forged together.
        </DidYouKnow>
      </div>

      <p className="mt-6 text-xs text-parchment/50 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        Potentials are standard values (25 °C, 1 M). Real cells sag a little under load — but the ranking never lies.
      </p>
    </ModuleShell>
  );
}
