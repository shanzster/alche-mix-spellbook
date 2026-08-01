import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Trophy, Timer, RefreshCw, Brain } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { useUserProfile, logPractice } from "../lib/profile";

export const Route = createFileRoute("/quiz")({
  component: () => (
    <RequireAuth>
      <Quiz />
    </RequireAuth>
  ),
});

interface QEl { sym: string; name: string; electrons: string; color: string; nucleus: string }
const QUIZ_ELEMENTS: QEl[] = [
  { sym: "H",  name: "Hydrogen",  electrons: "1",       color: "#60a5fa", nucleus: "#93c5fd" },
  { sym: "He", name: "Helium",    electrons: "2",       color: "#38bdf8", nucleus: "#7dd3fc" },
  { sym: "Li", name: "Lithium",   electrons: "2,1",     color: "#f87171", nucleus: "#fca5a5" },
  { sym: "C",  name: "Carbon",    electrons: "2,4",     color: "#a3a3a3", nucleus: "#d4d4d4" },
  { sym: "N",  name: "Nitrogen",  electrons: "2,5",     color: "#93c5fd", nucleus: "#bfdbfe" },
  { sym: "O",  name: "Oxygen",    electrons: "2,6",     color: "#f87171", nucleus: "#fca5a5" },
  { sym: "Ne", name: "Neon",      electrons: "2,8",     color: "#38bdf8", nucleus: "#7dd3fc" },
  { sym: "Na", name: "Sodium",    electrons: "2,8,1",   color: "#fb923c", nucleus: "#fdba74" },
  { sym: "Mg", name: "Magnesium", electrons: "2,8,2",   color: "#34d399", nucleus: "#6ee7b7" },
  { sym: "Cl", name: "Chlorine",  electrons: "2,8,7",   color: "#34d399", nucleus: "#86efac" },
  { sym: "Ca", name: "Calcium",   electrons: "2,8,8,2", color: "#fb923c", nucleus: "#fdba74" },
];

type Kind = "id" | "shells" | "valence";
interface Q { kind: Kind; el: QEl; prompt: string; options: string[]; answer: string; explain: string }

const QUESTION_COUNT = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(): Q[] {
  const els = shuffle(QUIZ_ELEMENTS).slice(0, QUESTION_COUNT);
  const kinds: Kind[] = ["id", "shells", "valence"];
  return els.map((el, i) => {
    const shells = el.electrons.split(",");
    const kind = kinds[i % kinds.length];
    if (kind === "id") {
      const distractors = shuffle(QUIZ_ELEMENTS.filter((e) => e.sym !== el.sym)).slice(0, 3).map((e) => e.name);
      return {
        kind, el, prompt: "Which element is this?", options: shuffle([el.name, ...distractors]), answer: el.name,
        explain: `The electron layout ${el.electrons} adds up to ${shells.reduce((s, x) => s + parseInt(x, 10), 0)} electrons — that's ${el.name} (${el.sym}).`,
      };
    }
    if (kind === "shells") {
      const ans = shells.length;
      const opts = shuffle(Array.from(new Set([ans, ans + 1, Math.max(1, ans - 1), ans + 2]))).slice(0, 4).map(String);
      if (!opts.includes(String(ans))) opts[0] = String(ans);
      return {
        kind, el, prompt: "How many electron shells does this atom have?", options: shuffle(opts), answer: String(ans),
        explain: `Count the rings: the configuration ${el.electrons} is split into ${ans} shell${ans === 1 ? "" : "s"}.`,
      };
    }
    const ans = parseInt(shells[shells.length - 1], 10);
    const opts = shuffle(Array.from(new Set([ans, ans + 1, Math.max(0, ans - 1), (ans + 2) % 9]))).slice(0, 4).map(String);
    if (!opts.includes(String(ans))) opts[0] = String(ans);
    return {
      kind, el, prompt: "How many valence (outer-shell) electrons?", options: shuffle(opts), answer: String(ans),
      explain: `Valence electrons live in the outermost shell — the last number in ${el.electrons} is ${ans}. These decide how ${el.name} bonds.`,
    };
  });
}

function Quiz() {
  const { uid } = useUserProfile();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [quiz, setQuiz] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [saved, setSaved] = useState(false);

  const start = () => {
    setQuiz(buildQuiz());
    setIdx(0); setPicked(null); setCorrect(0); setSaved(false);
    setPhase("play");
  };

  const q = quiz[idx];

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.answer) setCorrect((c) => c + 1);
  };

  const next = async () => {
    if (idx + 1 >= quiz.length) {
      setPhase("done");
      if (uid && !saved) {
        setSaved(true);
        logPractice(uid, "quiz");
      }
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  return (
    <ModuleShell
      title="3D Visual Quiz"
      eyebrow="Visual Assessment"
      icon={Brain}
      subtitle="Read the rotating atom, not a textbook. Identify elements, count shells and valence electrons."
      right={phase === "play" ? (
        <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-parchment/70">
          <Brain className="h-4 w-4 text-teal" /> {idx + 1} / {quiz.length}
        </span>
      ) : undefined}
    >
      {phase === "intro" && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid var(--color-border)" }}>
          <Brain className="h-12 w-12 text-teal mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Ready to be tested?</h2>
          <p className="text-parchment text-sm max-w-sm mx-auto mb-6">{QUESTION_COUNT} questions, each built around a live 3D atom. Every answer comes with an explanation so you learn as you go.</p>
          <button onClick={start} className="btn-arcane btn-arcane-hover"><Timer className="h-4 w-4" /> Begin</button>
        </div>
      )}

      {phase === "play" && q && (
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* 3D model */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 26%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
            <BohrModel3D key={`${idx}-${q.el.sym}`} tumble electrons={q.el.electrons} color={q.el.color} nucleusColor={q.el.nucleus} label={q.el.sym} />
          </div>

          {/* Question */}
          <div>
            <h2 className="font-display text-2xl mb-6">{q.prompt}</h2>
            <div className="grid gap-3">
              {q.options.map((opt) => {
                const isAnswer = opt === q.answer;
                const isPicked = opt === picked;
                const reveal = picked !== null;
                const color = reveal && isAnswer ? "var(--color-emerald-elixir)" : reveal && isPicked ? "var(--color-crimson)" : "var(--color-parchment)";
                return (
                  <button key={opt} onClick={() => choose(opt)} disabled={reveal}
                    className="flex items-center justify-between rounded-xl px-5 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0"
                    style={{
                      background: reveal && (isAnswer || isPicked) ? `color-mix(in oklab, ${color} 14%, transparent)` : "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)",
                      border: `1px solid color-mix(in oklab, ${color} ${reveal && (isAnswer || isPicked) ? 55 : 25}%, transparent)`,
                      color: reveal && (isAnswer || isPicked) ? color : "var(--color-spectral)",
                    }}>
                    <span className="font-display">{opt}</span>
                    {reveal && isAnswer && <Check className="h-4 w-4" />}
                    {reveal && isPicked && !isAnswer && <X className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            {picked && (
              <>
                <div className="mt-5 rounded-r-lg pl-4 pr-3 py-3 text-sm text-parchment"
                  style={{ borderLeft: `3px solid color-mix(in oklab, ${picked === q.answer ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 60%, transparent)`, background: `color-mix(in oklab, ${picked === q.answer ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 7%, transparent)` }}>
                  <span className="font-display" style={{ color: picked === q.answer ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
                    {picked === q.answer ? "Correct — " : `The answer is ${q.answer}. `}
                  </span>
                  {q.explain}
                </div>
                <button onClick={next} className="btn-arcane btn-arcane-hover w-full justify-center mt-5">
                  {idx + 1 >= quiz.length ? "See results" : "Next question"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}>
          <Trophy className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl mb-2">{correct === quiz.length ? "Flawless!" : "Quiz complete"}</h2>
          <p className="font-display text-5xl text-teal my-4">{correct}/{quiz.length}</p>
          <p className="text-sm text-parchment mb-6">
            {correct === quiz.length ? "Every atom identified correctly. Nicely done." : "Review the ones you missed and try again to lock it in."}
          </p>
          <button onClick={start} className="btn-arcane btn-arcane-hover"><RefreshCw className="h-4 w-4" /> Try again</button>
        </div>
      )}
    </ModuleShell>
  );
}
