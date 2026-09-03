import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Check, Timer, GraduationCap, RotateCcw, ArrowRight, Trophy, Scale, Star } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile, logPractice, recordTrial, type TrialResult } from "../lib/profile";
import { ConceptCard, DidYouKnow } from "../components/Learn";

export const Route = createFileRoute("/equation-balancer")({
  component: () => (
    <RequireAuth>
      <EquationBalancer />
    </RequireAuth>
  ),
});

// ── Data ────────────────────────────────────────────────────────────────────
type Difficulty = "easy" | "medium" | "hard";
interface Species { formula: string; answer: number }
interface Equation { id: string; difficulty: Difficulty; reactants: Species[]; products: Species[] }

// All formulas are parser-simple (no parentheses); every `answer` set balances.
const EQUATIONS: Equation[] = [
  // Easy — simple synthesis, two or three species.
  { id: "water",     difficulty: "easy", reactants: [{ formula: "H2", answer: 2 }, { formula: "O2", answer: 1 }], products: [{ formula: "H2O", answer: 2 }] },
  { id: "salt",      difficulty: "easy", reactants: [{ formula: "Na", answer: 2 }, { formula: "Cl2", answer: 1 }], products: [{ formula: "NaCl", answer: 2 }] },
  { id: "ammonia",   difficulty: "easy", reactants: [{ formula: "N2", answer: 1 }, { formula: "H2", answer: 3 }], products: [{ formula: "NH3", answer: 2 }] },
  { id: "hcl",       difficulty: "easy", reactants: [{ formula: "H2", answer: 1 }, { formula: "Cl2", answer: 1 }], products: [{ formula: "HCl", answer: 2 }] },
  { id: "magnesia",  difficulty: "easy", reactants: [{ formula: "Mg", answer: 2 }, { formula: "O2", answer: 1 }], products: [{ formula: "MgO", answer: 2 }] },
  { id: "quicklime", difficulty: "easy", reactants: [{ formula: "Ca", answer: 2 }, { formula: "O2", answer: 1 }], products: [{ formula: "CaO", answer: 2 }] },
  { id: "kbr",       difficulty: "easy", reactants: [{ formula: "K", answer: 2 }, { formula: "Br2", answer: 1 }], products: [{ formula: "KBr", answer: 2 }] },
  { id: "li3n",      difficulty: "easy", reactants: [{ formula: "Li", answer: 6 }, { formula: "N2", answer: 1 }], products: [{ formula: "Li3N", answer: 2 }] },
  // Medium — decomposition, displacement, metal oxides.
  { id: "peroxide",  difficulty: "medium", reactants: [{ formula: "H2O2", answer: 2 }], products: [{ formula: "H2O", answer: 2 }, { formula: "O2", answer: 1 }] },
  { id: "rust",      difficulty: "medium", reactants: [{ formula: "Fe", answer: 4 }, { formula: "O2", answer: 3 }], products: [{ formula: "Fe2O3", answer: 2 }] },
  { id: "alumina",   difficulty: "medium", reactants: [{ formula: "Al", answer: 4 }, { formula: "O2", answer: 3 }], products: [{ formula: "Al2O3", answer: 2 }] },
  { id: "chlorate",  difficulty: "medium", reactants: [{ formula: "KClO3", answer: 2 }], products: [{ formula: "KCl", answer: 2 }, { formula: "O2", answer: 3 }] },
  { id: "zinc-acid", difficulty: "medium", reactants: [{ formula: "Zn", answer: 1 }, { formula: "HCl", answer: 2 }], products: [{ formula: "ZnCl2", answer: 1 }, { formula: "H2", answer: 1 }] },
  { id: "na-water",  difficulty: "medium", reactants: [{ formula: "Na", answer: 2 }, { formula: "H2O", answer: 2 }], products: [{ formula: "NaOH", answer: 2 }, { formula: "H2", answer: 1 }] },
  { id: "fecl3",     difficulty: "medium", reactants: [{ formula: "Fe", answer: 2 }, { formula: "Cl2", answer: 3 }], products: [{ formula: "FeCl3", answer: 2 }] },
  { id: "methane",   difficulty: "medium", reactants: [{ formula: "CH4", answer: 1 }, { formula: "O2", answer: 2 }], products: [{ formula: "CO2", answer: 1 }, { formula: "H2O", answer: 2 }] },
  // Hard — combustion and redox with big coefficients.
  { id: "propane",   difficulty: "hard", reactants: [{ formula: "C3H8", answer: 1 }, { formula: "O2", answer: 5 }], products: [{ formula: "CO2", answer: 3 }, { formula: "H2O", answer: 4 }] },
  { id: "ethane",    difficulty: "hard", reactants: [{ formula: "C2H6", answer: 2 }, { formula: "O2", answer: 7 }], products: [{ formula: "CO2", answer: 4 }, { formula: "H2O", answer: 6 }] },
  { id: "acetylene", difficulty: "hard", reactants: [{ formula: "C2H2", answer: 2 }, { formula: "O2", answer: 5 }], products: [{ formula: "CO2", answer: 4 }, { formula: "H2O", answer: 2 }] },
  { id: "ethanol",   difficulty: "hard", reactants: [{ formula: "C2H6O", answer: 1 }, { formula: "O2", answer: 3 }], products: [{ formula: "CO2", answer: 2 }, { formula: "H2O", answer: 3 }] },
  { id: "methanol",  difficulty: "hard", reactants: [{ formula: "CH4O", answer: 2 }, { formula: "O2", answer: 3 }], products: [{ formula: "CO2", answer: 2 }, { formula: "H2O", answer: 4 }] },
  { id: "glucose",   difficulty: "hard", reactants: [{ formula: "C6H12O6", answer: 1 }, { formula: "O2", answer: 6 }], products: [{ formula: "CO2", answer: 6 }, { formula: "H2O", answer: 6 }] },
  { id: "nh3-burn",  difficulty: "hard", reactants: [{ formula: "NH3", answer: 4 }, { formula: "O2", answer: 3 }], products: [{ formula: "N2", answer: 2 }, { formula: "H2O", answer: 6 }] },
  { id: "ostwald",   difficulty: "hard", reactants: [{ formula: "NH3", answer: 4 }, { formula: "O2", answer: 5 }], products: [{ formula: "NO", answer: 4 }, { formula: "H2O", answer: 6 }] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Parse a simple formula (no parentheses) into an element→count map. */
function parseFormula(formula: string): Record<string, number> {
  const out: Record<string, number> = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    if (!m[1]) continue;
    out[m[1]] = (out[m[1]] ?? 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return out;
}

/** Render a formula with subscript digits. */
function Formula({ text }: { text: string }) {
  const parts = text.split(/(\d+)/);
  return (
    <span>
      {parts.map((p, i) =>
        /\d+/.test(p) ? <sub key={i} className="text-[0.7em]">{p}</sub> : <span key={i}>{p}</span>,
      )}
    </span>
  );
}

interface Tally { element: string; left: number; right: number; ok: boolean }

function useBalance(eq: Equation, reCo: number[], prCo: number[]) {
  return useMemo(() => {
    const left: Record<string, number> = {};
    const right: Record<string, number> = {};
    eq.reactants.forEach((s, i) => {
      const atoms = parseFormula(s.formula);
      for (const [el, n] of Object.entries(atoms)) left[el] = (left[el] ?? 0) + n * reCo[i];
    });
    eq.products.forEach((s, i) => {
      const atoms = parseFormula(s.formula);
      for (const [el, n] of Object.entries(atoms)) right[el] = (right[el] ?? 0) + n * prCo[i];
    });
    const elements = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
    const tallies: Tally[] = elements.map((element) => ({
      element,
      left: left[element] ?? 0,
      right: right[element] ?? 0,
      ok: (left[element] ?? 0) === (right[element] ?? 0),
    }));
    const balanced = tallies.every((t) => t.ok) && [...reCo, ...prCo].every((c) => c >= 1);
    return { tallies, balanced };
  }, [eq, reCo, prCo]);
}

function Coeff({ value, onChange, formula }: { value: number; onChange: (v: number) => void; formula: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-parchment hover:text-teal transition"
          style={{ border: "1px solid var(--color-border)" }} aria-label="Decrease coefficient">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="font-display text-xl w-6 text-center text-teal">{value}</span>
        <button onClick={() => onChange(Math.min(12, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-parchment hover:text-teal transition"
          style={{ border: "1px solid var(--color-border)" }} aria-label="Increase coefficient">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="font-ui font-medium text-lg"><Formula text={formula} /></span>
    </div>
  );
}

function EquationCard({ eq, onSolved }: { eq: Equation; onSolved: () => void }) {
  const [reCo, setReCo] = useState<number[]>(() => eq.reactants.map(() => 1));
  const [prCo, setPrCo] = useState<number[]>(() => eq.products.map(() => 1));
  const { tallies, balanced } = useBalance(eq, reCo, prCo);
  const firedRef = useRef(false);

  // Reset when the equation changes.
  useEffect(() => {
    setReCo(eq.reactants.map(() => 1));
    setPrCo(eq.products.map(() => 1));
    firedRef.current = false;
  }, [eq]);

  useEffect(() => {
    if (balanced && !firedRef.current) {
      firedRef.current = true;
      onSolved();
    }
    if (!balanced) firedRef.current = false;
  }, [balanced, onSolved]);

  const reset = () => { setReCo(eq.reactants.map(() => 1)); setPrCo(eq.products.map(() => 1)); };

  return (
    <div className="rounded-2xl p-6 md:p-8"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
        border: `1px solid color-mix(in oklab, ${balanced ? "var(--color-emerald-elixir)" : "var(--color-parchment)"} 30%, transparent)`,
        boxShadow: balanced ? "0 0 50px -20px color-mix(in oklab, var(--color-emerald-elixir) 60%, transparent)" : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}>
      {/* Equation row */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 mb-8">
        {eq.reactants.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && <span className="text-2xl text-parchment/60">+</span>}
            <Coeff value={reCo[i]} onChange={(v) => setReCo((a) => a.map((x, j) => (j === i ? v : x)))} formula={s.formula} />
          </div>
        ))}
        <ArrowRight className="h-6 w-6 text-gold mx-1" />
        {eq.products.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && <span className="text-2xl text-parchment/60">+</span>}
            <Coeff value={prCo[i]} onChange={(v) => setPrCo((a) => a.map((x, j) => (j === i ? v : x)))} formula={s.formula} />
          </div>
        ))}
      </div>

      {/* Element tally */}
      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {tallies.map((t) => (
          <div key={t.element} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{
              background: `color-mix(in oklab, ${t.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)"} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${t.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)"} 35%, transparent)`,
              color: t.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)",
            }}>
            <span className="font-ui font-medium">{t.element}</span>
            <span>{t.left} : {t.right}</span>
            {t.ok ? <Check className="h-3 w-3" /> : null}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="text-sm tracking-[0.15em] uppercase font-ui font-medium"
          style={{ color: balanced ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}>
          {balanced ? "✦ Balanced ✦" : "Not balanced yet"}
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-parchment/60 hover:text-spectral transition">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}

const ATTACK_COUNT = 5;
const attackStars = (timeSec: number) => (timeSec < 60 ? 3 : timeSec < 120 ? 2 : 1);

const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: "easy",   label: "Apprentice", blurb: "simple synthesis" },
  { key: "medium", label: "Adept",      blurb: "decomposition & displacement" },
  { key: "hard",   label: "Master",     blurb: "combustion, big coefficients" },
];

function StarRow({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star key={i} className="h-4 w-4"
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 35%, transparent)",
            fill: i < n ? "var(--color-gold)" : "transparent",
          }} />
      ))}
    </span>
  );
}

function BestTimePanel({ best }: { best?: TrialResult }) {
  if (!best?.timeSec) return null;
  return (
    <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-sm"
      style={{ background: "color-mix(in oklab, var(--color-gold) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">Fastest clear</span>
      <span className="font-ui font-medium text-gold">{best.timeSec}s</span>
      <StarRow n={best.stars} />
      <span className="text-xs text-parchment/50">{best.plays} run{best.plays === 1 ? "" : "s"}</span>
    </div>
  );
}

function EquationBalancer() {
  const { uid, profile } = useUserProfile();
  const [mode, setMode] = useState<"practice" | "attack">("practice");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  // Practice state
  const [pIdx, setPIdx] = useState(0);
  const solvedRef = useRef<Set<string>>(new Set());

  // Attack state
  const [attackList, setAttackList] = useState<Equation[]>([]);
  const [aIdx, setAIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const startAttack = () => {
    const pool = EQUATIONS.filter((eq) => eq.difficulty === difficulty);
    setAttackList(shuffle(pool).slice(0, ATTACK_COUNT));
    setAIdx(0);
    setSeconds(0);
    setFinished(false);
    setRunning(true);
  };

  const onPracticeSolved = () => {
    const eq = EQUATIONS[pIdx];
    if (solvedRef.current.has(eq.id)) return;
    solvedRef.current.add(eq.id);
    if (uid) logPractice(uid, "equation-balancer");
  };

  const onAttackSolved = () => {
    if (aIdx + 1 >= attackList.length) {
      setRunning(false);
      setFinished(true);
      if (uid) {
        logPractice(uid, "equation-balancer", attackList.length);
        recordTrial(uid, "equation-balancer", {
          score: ATTACK_COUNT,
          outOf: ATTACK_COUNT,
          stars: attackStars(seconds),
          timeSec: seconds,
        });
      }
    } else {
      setAIdx((i) => i + 1);
    }
  };

  const bestAttack = profile?.trials?.["equation-balancer"];

  const ModeToggle = (
    <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {(["practice", "attack"] as const).map((m) => (
        <button key={m} onClick={() => { setMode(m); setFinished(false); setRunning(false); }}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
          style={mode === m ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)" }}>
          {m === "practice" ? <GraduationCap className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          {m === "practice" ? "Practice" : "Time Attack"}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Equation Balancer"
      eyebrow="Balance & Conserve"
      icon={Scale}
      subtitle="Adjust the coefficients until every element balances on both sides. The tally turns green when you've got it."
      right={ModeToggle}
    >
      {mode === "practice" ? (
        <div>
          <EquationCard eq={EQUATIONS[pIdx]} onSolved={onPracticeSolved} />
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setPIdx((i) => (i - 1 + EQUATIONS.length) % EQUATIONS.length)}
              className="btn-ghost-arcane text-xs">Previous</button>
            <span className="text-xs tracking-[0.2em] uppercase text-parchment/50">{pIdx + 1} / {EQUATIONS.length}</span>
            <button onClick={() => setPIdx((i) => (i + 1) % EQUATIONS.length)}
              className="btn-ghost-arcane text-xs">Next</button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ConceptCard title="Conservation of mass">
              Atoms are never created or destroyed in a reaction — they're just rearranged. So the count of
              <span className="text-spectral"> each element</span> must be the same on both sides. You change the big
              <span className="text-teal"> coefficients</span> (never the small subscripts) to make that true.
            </ConceptCard>
            <DidYouKnow>
              Balancing isn't just homework — rocket engineers balance combustion equations to work out exactly how much
              fuel and oxygen to carry. Too much of either is wasted weight.
            </DidYouKnow>
          </div>
        </div>
      ) : finished ? (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}>
          <Trophy className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl mb-2">All balanced!</h2>
          <p className="text-parchment mb-1">You cleared {ATTACK_COUNT} equations in</p>
          <p className="font-display text-4xl text-teal mb-3">{seconds}s</p>
          <div className="mb-4 flex justify-center"><StarRow n={attackStars(seconds)} /></div>
          <p className="text-sm text-parchment mb-6">Every atom is accounted for on both sides — that's a balanced equation.</p>
          <button onClick={startAttack} className="btn-arcane btn-arcane-hover">
            <Timer className="h-4 w-4" /> Race again
          </button>
          <div><BestTimePanel best={bestAttack} /></div>
        </div>
      ) : running ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 font-display text-2xl text-teal">
              <Timer className="h-5 w-5" /> {seconds}s
            </span>
            <span className="text-xs tracking-[0.2em] uppercase text-parchment/60">Equation {aIdx + 1} / {attackList.length}</span>
          </div>
          <EquationCard eq={attackList[aIdx]} onSolved={onAttackSolved} />
        </div>
      ) : (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid var(--color-border)" }}>
          <Timer className="h-12 w-12 text-teal mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Time Attack</h2>
          <p className="text-parchment text-sm mb-2 max-w-sm mx-auto">Balance {ATTACK_COUNT} equations as fast as you can. The clock starts the moment you hit go.</p>
          <p className="text-xs text-parchment/60 mb-6">Under 60s earns 3 stars · under 120s two · any finish one.</p>
          {/* Difficulty picker */}
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {DIFFICULTIES.map((d) => (
              <button key={d.key} onClick={() => setDifficulty(d.key)}
                className="rounded-xl px-4 py-2.5 text-left transition hover:-translate-y-0.5"
                style={{
                  background: `color-mix(in oklab, ${difficulty === d.key ? "var(--color-emerald-elixir)" : "var(--color-slate-sunken)"} ${difficulty === d.key ? 14 : 62}%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${difficulty === d.key ? "var(--color-emerald-elixir)" : "var(--color-parchment)"} ${difficulty === d.key ? 45 : 20}%, transparent)`,
                }}>
                <div className="font-ui font-medium text-sm" style={{ color: difficulty === d.key ? "var(--color-emerald-elixir)" : "var(--color-spectral)" }}>{d.label}</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-parchment/55">{d.blurb}</div>
              </button>
            ))}
          </div>
          <button onClick={startAttack} className="btn-arcane btn-arcane-hover">
            <Timer className="h-4 w-4" /> Start the clock
          </button>
          <div><BestTimePanel best={bestAttack} /></div>
        </div>
      )}
    </ModuleShell>
  );
}
