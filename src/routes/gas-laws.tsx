import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Gauge, Thermometer, Box, Atom, Swords, Star, Loader2, CheckCircle2, XCircle,
  SlidersHorizontal, RotateCcw, ScrollText,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial, type TrialResult } from "../lib/profile";
import { useAI } from "../lib/useAI";
import type { GeneratedProblem, GradeResult } from "../lib/ai";

export const Route = createFileRoute("/gas-laws")({
  component: () => (
    <RequireAuth>
      <GasLaws />
    </RequireAuth>
  ),
});

const R = 0.0821; // L·atm·mol⁻¹·K⁻¹
type Solve = "P" | "V" | "T";

const RANGES = {
  T: { min: 100, max: 1000, step: 10, unit: "K" },
  V: { min: 1, max: 50, step: 1, unit: "L" },
  P: { min: 0.1, max: 10, step: 0.1, unit: "atm" },
  n: { min: 0.1, max: 5, step: 0.1, unit: "mol" },
};

// ── Particle box — illustrates T (speed/colour), V (box size), n (count) ────
function ParticleBox({ tvn }: { tvn: React.MutableRefObject<{ T: number; V: number; n: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    interface P { x: number; y: number; vx: number; vy: number }
    let parts: P[] = [];
    let raf = 0;

    const spawn = (n: number, box: { x: number; y: number; w: number; h: number }): P => ({
      x: box.x + Math.random() * box.w,
      y: box.y + Math.random() * box.h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    });

    const draw = () => {
      const { T, V, n } = tvn.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Box scales with volume.
      const frac = (V - RANGES.V.min) / (RANGES.V.max - RANGES.V.min);
      const bw = (0.4 + frac * 0.5) * W;
      const bh = (0.45 + frac * 0.45) * H;
      const box = { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh };

      // Container walls
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 40%, transparent)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Particle count from moles.
      const target = Math.max(4, Math.min(70, Math.round(n * 12)));
      while (parts.length < target) parts.push(spawn(n, box));
      if (parts.length > target) parts = parts.slice(0, target);

      // Speed from temperature.
      const speed = 0.6 + Math.sqrt(T / 300) * 1.6;
      const hue = 240 * (1 - (T - RANGES.T.min) / (RANGES.T.max - RANGES.T.min)); // blue→red
      const color = `hsl(${hue}, 85%, 62%)`;

      for (const p of parts) {
        // keep inside current box (volume may have shrunk)
        if (p.x < box.x) p.x = box.x; if (p.x > box.x + box.w) p.x = box.x + box.w;
        if (p.y < box.y) p.y = box.y; if (p.y > box.y + box.h) p.y = box.y + box.h;

        const mag = Math.hypot(p.vx, p.vy) || 1;
        p.x += (p.vx / mag) * speed;
        p.y += (p.vy / mag) * speed;

        if (p.x <= box.x || p.x >= box.x + box.w) p.vx *= -1;
        if (p.y <= box.y || p.y >= box.y + box.h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [tvn]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight: 340 }} />;
}

function Slider({
  label, icon: Icon, value, onChange, min, max, step, unit, disabled, color,
}: {
  label: string; icon: typeof Gauge; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; disabled?: boolean; color: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`, opacity: disabled ? 0.85 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color }}>
          <Icon className="h-3.5 w-3.5" /> {label} {disabled && <span className="text-parchment/50">(computed)</span>}
        </span>
        <span className="font-ui font-medium text-lg" style={{ color }}>{value.toFixed(step < 1 ? 1 : 0)} <span className="text-xs text-parchment/60">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-current disabled:opacity-50" style={{ accentColor: color }} />
    </div>
  );
}

// ── Trial of the Alchemist — a 5-problem AI-generated run ───────────────────
const TRIAL_LEN = 5;
const starsFor = (score: number) => (score >= 5 ? 3 : score === 4 ? 2 : score === 3 ? 1 : 0);

/** Best-effort read of T/V/n values out of a generated question's text. */
function parseSimValues(question: string): { T?: number; V?: number; n?: number } | null {
  const grab = (re: RegExp) => {
    const m = question.match(re);
    const v = m ? parseFloat(m[1]) : NaN;
    return Number.isFinite(v) ? v : undefined;
  };
  const T = grab(/(\d+(?:\.\d+)?)\s*(?:K|kelvin)\b/i);
  const V = grab(/(\d+(?:\.\d+)?)\s*(?:L|litre|liter)s?\b/);
  const n = grab(/(\d+(?:\.\d+)?)\s*(?:mol|mole)s?\b/i);
  if (T === undefined && V === undefined && n === undefined) return null;
  return { T, V, n };
}

function TrialStars({ stars, size = "h-5 w-5" }: { stars: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={size}
          style={{
            color: i < stars ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 25%, transparent)",
            fill: i < stars ? "var(--color-gold)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}

function TrialOfTheAlchemist({
  uid,
  best,
  onApplyToSim,
}: {
  uid: string | null;
  best?: TrialResult;
  onApplyToSim: (vals: { T?: number; V?: number; n?: number }) => void;
}) {
  const { generateProblem, gradeAnswer, busy } = useAI();
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [runSeed, setRunSeed] = useState("");
  const [index, setIndex] = useState(0);
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [gradeError, setGradeError] = useState(false);
  const [score, setScore] = useState(0);

  const loadProblem = useCallback(
    async (i: number, seed: string) => {
      setProblem(null);
      setGrade(null);
      setGradeError(false);
      setAnswer("");
      setLoadError(false);
      try {
        const p = await generateProblem({ topic: "gas-laws", seed: `${seed}-p${i}` });
        setProblem(p);
      } catch {
        setLoadError(true);
      }
    },
    [generateProblem],
  );

  const start = () => {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setRunSeed(seed);
    setScore(0);
    setIndex(0);
    setPhase("run");
    void loadProblem(0, seed);
  };

  const submit = async () => {
    if (!problem || grade || busy || !answer.trim()) return;
    setGradeError(false);
    try {
      const res = await gradeAnswer({
        question: problem.question,
        studentAnswer: answer.trim(),
        correctAnswer: String(problem.answer),
        topic: "gas-laws",
      });
      setGrade(res);
      if (res.isCorrect) setScore((s) => s + 1);
    } catch {
      setGradeError(true); // grading failed — the attempt is not consumed
    }
  };

  const next = () => {
    if (index + 1 >= TRIAL_LEN) {
      setPhase("done");
      void recordTrial(uid, "gas-laws", { score, outOf: TRIAL_LEN, stars: starsFor(score) });
    } else {
      setIndex(index + 1);
      void loadProblem(index + 1, runSeed);
    }
  };

  const simVals = problem ? parseSimValues(problem.question) : null;
  const usedFallback = problem?.source === "fallback" || grade?.source === "fallback";
  const panel = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
    border: "1px solid var(--color-border)",
    ...extra,
  });

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
        border: "1px solid color-mix(in oklab, var(--color-gold) 25%, var(--color-border))",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-gold">
          <Swords className="h-4 w-4" /> Trial of the Alchemist
        </span>
        {phase === "run" && (
          <span className="text-xs text-parchment/70">
            Problem <span className="text-gold font-ui font-medium">{index + 1}</span> / {TRIAL_LEN}
            <span className="mx-2 opacity-40">·</span>
            Score <span className="text-emerald-elixir font-ui font-medium">{score}</span>
          </span>
        )}
      </div>

      {/* ── Intro ── */}
      {phase === "intro" && (
        <div className="space-y-4">
          <p className="text-sm text-parchment/80 leading-relaxed">
            Five conjured gas-law problems, one attempt each. Answer with a number — the Alchemist
            grades your work and reveals the full working. Score 3 or more to earn stars.
          </p>
          {best && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={panel()}>
              <TrialStars stars={best.stars} />
              <span className="text-sm text-parchment/80">
                Your best: <span className="text-gold font-ui font-medium">{best.best}</span>/{best.outOf}
                <span className="mx-2 opacity-40">·</span>
                {best.plays} {best.plays === 1 ? "attempt" : "attempts"}
              </span>
            </div>
          )}
          <button
            onClick={start}
            className="rounded-full px-6 py-2.5 text-sm tracking-[0.12em] uppercase transition hover:brightness-110"
            style={{
              background: "color-mix(in oklab, var(--color-gold) 18%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
              color: "var(--color-gold)",
            }}
          >
            Begin the trial
          </button>
        </div>
      )}

      {/* ── Run ── */}
      {phase === "run" && (
        <div className="space-y-4">
          {!problem && !loadError && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-6 text-sm text-parchment/70" style={panel()}>
              <Loader2 className="h-4 w-4 animate-spin text-gold" /> Conjuring a fresh problem…
            </div>
          )}
          {loadError && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-4 text-sm" style={panel()}>
              <span className="text-crimson">The conjuring fizzled — check your connection.</span>
              <button
                onClick={() => void loadProblem(index, runSeed)}
                className="rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase text-gold"
                style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)" }}
              >
                Try again
              </button>
            </div>
          )}

          {problem && (
            <>
              <p className="text-sm text-parchment leading-relaxed rounded-xl px-4 py-4" style={panel()}>
                {problem.question}
              </p>

              {!grade && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={panel()}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
                      placeholder="Your answer"
                      className="w-32 bg-transparent text-parchment font-ui font-medium text-lg outline-none placeholder:text-parchment/40 placeholder:font-sans placeholder:text-sm"
                    />
                    {problem.unit && <span className="text-xs text-parchment/60">{problem.unit}</span>}
                  </div>
                  <button
                    onClick={() => void submit()}
                    disabled={busy || !answer.trim()}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm tracking-[0.12em] uppercase transition disabled:opacity-50 hover:brightness-110"
                    style={{
                      background: "color-mix(in oklab, var(--color-emerald-elixir) 16%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)",
                      color: "var(--color-emerald-elixir)",
                    }}
                  >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Submit
                  </button>
                  {gradeError && (
                    <span className="text-xs text-crimson">Grading failed — submit again.</span>
                  )}
                </div>
              )}

              {grade && (
                <div className="space-y-3">
                  <p
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: grade.isCorrect ? "var(--color-emerald-elixir)" : "var(--color-crimson)" }}
                  >
                    {grade.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {grade.isCorrect ? "Correct — the elixir holds." : "Not quite."}
                    {!grade.isCorrect && (grade.correctAnswer ?? String(problem.answer)) && (
                      <span className="text-parchment/70 font-normal">
                        Expected: {grade.correctAnswer ?? String(problem.answer)}{problem.unit ? ` ${problem.unit}` : ""}
                      </span>
                    )}
                  </p>

                  {grade.explanation.length > 0 && (
                    <ul className="space-y-1 text-sm text-parchment/80 rounded-xl px-4 py-3" style={panel()}>
                      {grade.explanation.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}

                  {problem.workingSteps.length > 0 && (
                    <div className="rounded-xl px-4 py-3" style={panel()}>
                      <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-teal mb-2">
                        <ScrollText className="h-3.5 w-3.5" /> The working, step by step
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-parchment/80">
                        {problem.workingSteps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={next}
                      className="rounded-full px-5 py-2 text-sm tracking-[0.12em] uppercase transition hover:brightness-110"
                      style={{
                        background: "color-mix(in oklab, var(--color-gold) 18%, transparent)",
                        border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
                        color: "var(--color-gold)",
                      }}
                    >
                      {index + 1 >= TRIAL_LEN ? "Finish the trial" : "Next problem"}
                    </button>
                    {simVals && (
                      <button
                        onClick={() => onApplyToSim(simVals)}
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs tracking-[0.12em] uppercase text-teal transition hover:brightness-110"
                        style={{ border: "1px solid color-mix(in oklab, var(--color-teal, #2dd4bf) 40%, transparent)" }}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Set up the simulator like this
                      </button>
                    )}
                  </div>
                </div>
              )}

              {usedFallback && (
                <p className="text-[11px] text-parchment/50">
                  Running on the offline problem bank — answers are graded locally.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Done ── */}
      {phase === "done" && (
        <div className="space-y-4 text-center py-2">
          <TrialStars stars={starsFor(score)} size="h-8 w-8" />
          <p className="font-display text-3xl text-parchment">
            <span className="text-gold">{score}</span> / {TRIAL_LEN}
          </p>
          <p className="text-sm text-parchment/70">
            {score >= 5 && "Flawless — the Alchemist bows to you."}
            {score === 4 && "Nearly perfect — one more step to mastery."}
            {score === 3 && "The trial is passed. Sharpen your working and return."}
            {score < 3 && "The trial bests you this time — study the simulator and try again."}
          </p>
          {best && (
            <p className="text-xs text-parchment/60">
              Best so far: {Math.max(best.best, score)}/{TRIAL_LEN}
            </p>
          )}
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm tracking-[0.12em] uppercase transition hover:brightness-110"
            style={{
              background: "color-mix(in oklab, var(--color-gold) 18%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
              color: "var(--color-gold)",
            }}
          >
            <RotateCcw className="h-4 w-4" /> Retry with fresh problems
          </button>
        </div>
      )}
    </div>
  );
}

function GasLaws() {
  const { uid, profile } = useUserProfile();
  const [solve, setSolve] = useState<Solve>("P");
  const [T, setT] = useState(300);
  const [V, setV] = useState(22.4);
  const [P, setP] = useState(1);
  const [n, setN] = useState(1);

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "gas-laws"); }, [uid]);

  // Compute the dependent variable from the ideal gas law.
  const computed = (() => {
    if (solve === "P") return { P: (n * R * T) / V, V, T };
    if (solve === "V") return { V: (n * R * T) / P, P, T };
    return { T: (P * V) / (n * R), P, V };
  })();
  const shownP = solve === "P" ? computed.P! : P;
  const shownV = solve === "V" ? computed.V! : V;
  const shownT = solve === "T" ? computed.T! : T;

  const tvn = useRef({ T: shownT, V: shownV, n });
  useEffect(() => { tvn.current = { T: shownT, V: shownV, n }; }, [shownT, shownV, n]);

  /** Pre-fill the sliders from a trial problem's values (best-effort). */
  const applyToSim = useCallback((vals: { T?: number; V?: number; n?: number }) => {
    const clamp = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, v));
    setSolve("P"); // T and V stay editable; the sim solves for pressure
    if (vals.T !== undefined) setT(clamp(vals.T, RANGES.T));
    if (vals.V !== undefined) setV(clamp(vals.V, RANGES.V));
    if (vals.n !== undefined) setN(clamp(vals.n, RANGES.n));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const SolveToggle = (
    <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {(["P", "V", "T"] as const).map((s) => (
        <button key={s} onClick={() => setSolve(s)}
          className="rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
          style={solve === s ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)" }}>
          Solve {s}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Gas Laws Simulator"
      eyebrow="Kinetic Theory"
      icon={Gauge}
      accent="var(--color-wraith)"
      subtitle="Manipulate temperature, volume, pressure and moles under PV = nRT. Choose which variable to solve for and watch the molecules respond."
      right={SolveToggle}
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Simulation */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
          <ParticleBox tvn={tvn} />
          <div className="px-5 py-4 border-t text-center" style={{ borderColor: "var(--color-border)" }}>
            <div className="font-ui font-medium text-lg">
              <span className="text-gold">P</span>·<span className="text-teal">V</span> = <span className="text-parchment">n</span>·R·<span className="text-wraith">T</span>
            </div>
            <div className="text-xs text-parchment/70 mt-1">
              {shownP.toFixed(2)} atm · {shownV.toFixed(1)} L = {n.toFixed(1)} mol · {R} · {shownT.toFixed(0)} K
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <Slider label="Temperature" icon={Thermometer} value={shownT} onChange={setT} {...RANGES.T} disabled={solve === "T"} color="#a855f7" />
          <Slider label="Volume" icon={Box} value={shownV} onChange={setV} {...RANGES.V} disabled={solve === "V"} color="#2dd4bf" />
          <Slider label="Pressure" icon={Gauge} value={shownP} onChange={setP} {...RANGES.P} disabled={solve === "P"} color="#e0b457" />
          <Slider label="Amount" icon={Atom} value={n} onChange={setN} {...RANGES.n} color="#9aa7bd" />

          <div className="rounded-xl p-4 text-sm text-parchment leading-relaxed"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="text-teal font-ui font-medium">Observe:</span>{" "}
            {solve === "P" && "Shrinking the volume or heating the gas raises the pressure."}
            {solve === "V" && "Heating the gas or dropping the pressure expands the volume."}
            {solve === "T" && "Higher pressure or larger volume means the gas must be hotter."}
          </div>

        </div>
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="Three laws, one equation">
          <span className="text-spectral">PV = nRT</span> bundles them together:{" "}
          <span className="text-gold">Boyle's law</span> (P↑ as V↓ at fixed T),{" "}
          <span className="text-teal">Charles's law</span> (V↑ as T↑ at fixed P), and{" "}
          <span className="text-wraith">Gay-Lussac's law</span> (P↑ as T↑ at fixed V). Hold one slider still and move
          another to see each in action.
        </ConceptCard>
        <DidYouKnow>
          Car airbags use this: a chemical reaction makes a burst of gas, and PV = nRT means that gas <em>must</em> expand
          to fill the bag in ~30 milliseconds. Scuba divers watch it too — pressure rising with depth shrinks the air in their lungs.
        </DidYouKnow>
      </div>

      {/* Trial of the Alchemist — 5 AI-conjured problems, best run saved */}
      <div className="mt-8">
        <TrialOfTheAlchemist
          uid={uid}
          best={profile?.trials?.["gas-laws"]}
          onApplyToSim={applyToSim}
        />
      </div>
    </ModuleShell>
  );
}
