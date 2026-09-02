import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sunrise, Flame, Check, X, ArrowRight, Sparkles, Coins,
  CalendarDays, RotateCcw, Play,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile, recordStarterRun, type StudentProfile } from "../lib/profile";
import { ALL_CONCEPT_IDS, conceptById, type Concept } from "../lib/curriculum";
import { dueConceptIds, recordAnswer } from "../lib/learning";

export const Route = createFileRoute("/starters")({
  component: () => (
    <RequireRole role="student">
      <StartersPage />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-gold)";
const RUN_LENGTH = 10;

// ── Daily set building ────────────────────────────────────────────────────────
/** Local date as YYYY-MM-DD — the streak day-key. */
function localDayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Hash a string to a 32-bit seed (xmur3-style mixing). */
function seedFrom(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) so everyone's daily set is stable. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Today's ten: every concept currently due for spaced review comes first
 * (soonest-due first), then the remainder is filled from the rest of the bank
 * in a date-seeded deterministic order. No repeats.
 */
function buildDailySet(
  reviews: StudentProfile["reviews"],
  dayKey: string,
): string[] {
  const due = dueConceptIds(reviews, Date.now())
    .filter((id) => conceptById(id))
    .slice(0, RUN_LENGTH);
  const taken = new Set(due);
  const fill = seededShuffle(
    ALL_CONCEPT_IDS.filter((id) => !taken.has(id)),
    seedFrom(dayKey),
  );
  return [...due, ...fill].slice(0, RUN_LENGTH);
}

/** What the streak becomes once today's run is recorded (mirrors profile.ts). */
function streakAfterToday(
  prev: StudentProfile["starterStreak"],
  dayKey: string,
): number {
  if (!prev) return 1;
  if (prev.lastDay === dayKey) return prev.count;
  const ms = Date.parse(dayKey) - Date.parse(prev.lastDay);
  return ms > 0 && ms <= 36 * 3600 * 1000 ? prev.count + 1 : 1;
}

function prettyDate(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Phase = "intro" | "play" | "done";

function StartersPage() {
  const { uid, profile } = useUserProfile();
  const reviews = profile?.reviews;
  const streak = profile?.starterStreak;

  const [dayKey] = useState(() => localDayKey());
  const [phase, setPhase] = useState<Phase>("intro");
  /** A replay after today's run is already banked — plays, but isn't tracked. */
  const [practice, setPractice] = useState(false);
  /** Frozen at the moment the run starts, so answering can't reshuffle it. */
  const [questions, setQuestions] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  /** true/false per answered question, in order — drives dots and the score. */
  const [results, setResults] = useState<boolean[]>([]);
  const [recorded, setRecorded] = useState(false);

  const alreadyToday = streak?.lastDay === dayKey;
  const score = results.filter(Boolean).length;

  const start = (asPractice: boolean) => {
    setQuestions(buildDailySet(reviews, dayKey));
    setPractice(asPractice);
    setIdx(0);
    setResults([]);
    setRecorded(false);
    setPhase("play");
  };

  const finish = (finalResults: boolean[]) => {
    if (!practice && !recorded && uid) {
      setRecorded(true);
      recordStarterRun(uid, dayKey, finalResults.filter(Boolean).length);
    }
    setPhase("done");
  };

  return (
    <StudentShell title="Starters">
      <PageHeader
        eyebrow="Daily Ritual"
        title="Starters for Ten"
        subtitle="Ten questions at dawn keep the cauldron warm — a short daily rite that feeds your review schedule and your streak."
        icon={Sunrise}
        accent={ACCENT}
      />

      {phase === "intro" && (
        <IntroScreen
          dayKey={dayKey}
          streakCount={streak?.count ?? 0}
          alreadyToday={alreadyToday}
          onStart={() => start(alreadyToday)}
        />
      )}

      {phase === "play" && questions.length > 0 && (
        <PlayScreen
          uid={uid}
          reviews={reviews}
          questions={questions}
          idx={idx}
          results={results}
          practice={practice}
          onAnswered={(correct) => setResults((r) => [...r, correct])}
          onNext={() => {
            if (idx + 1 < questions.length) setIdx(idx + 1);
            else finish(results);
          }}
        />
      )}

      {phase === "done" && (
        <EndScreen
          dayKey={dayKey}
          score={score}
          total={questions.length}
          practice={practice}
          streakCount={practice ? (streak?.count ?? 0) : streakAfterToday(streak, dayKey)}
          onReplay={() => start(true)}
        />
      )}
    </StudentShell>
  );
}

// ── Intro ─────────────────────────────────────────────────────────────────────
function IntroScreen({
  dayKey, streakCount, alreadyToday, onStart,
}: {
  dayKey: string; streakCount: number; alreadyToday: boolean; onStart: () => void;
}) {
  return (
    <div className="max-w-md">
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: `linear-gradient(160deg, color-mix(in oklab, ${ACCENT} 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 60%, transparent))`,
          border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
          boxShadow: `0 0 50px -28px ${ACCENT}`,
        }}
      >
        <span
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: `color-mix(in oklab, ${ACCENT} 16%, transparent)`, color: ACCENT }}
        >
          <Sunrise className="h-7 w-7" />
        </span>

        <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-1">
          <CalendarDays className="h-3.5 w-3.5" /> {prettyDate(dayKey)}
        </p>
        <h2 className="font-display text-2xl mb-2">Today's Ten await</h2>
        <p className="text-sm text-parchment/70 italic mb-4">
          "Ten questions at dawn keep the cauldron warm."
        </p>

        <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs mb-5"
          style={{
            background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
            color: ACCENT,
          }}>
          <Flame className="h-3.5 w-3.5" />
          {streakCount > 0 ? `Day ${streakCount} streak` : "No streak yet — light the flame today"}
        </p>

        {alreadyToday ? (
          <>
            <p className="text-sm text-parchment/70 mb-4">
              You've already completed today's Starters — your streak is safe.
              Fancy an untracked practice run while the cauldron simmers?
            </p>
            <button onClick={onStart} className="btn-ghost-arcane text-sm">
              <RotateCcw className="h-4 w-4" /> Practice replay
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-parchment/50 mb-4">
              Anything due for spaced review comes first; the rest of the ten is
              the same for every alchemist today.
            </p>
            <button onClick={onStart} className="btn-arcane btn-arcane-hover">
              <Play className="h-4 w-4" /> Begin today's Ten
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Play ──────────────────────────────────────────────────────────────────────
function PlayScreen({
  uid, reviews, questions, idx, results, practice, onAnswered, onNext,
}: {
  uid: string | null;
  reviews: StudentProfile["reviews"];
  questions: string[];
  idx: number;
  results: boolean[];
  practice: boolean;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const entry = conceptById(questions[idx]);
  if (!entry) return null;
  const last = idx === questions.length - 1;

  const handleAnswered = async (correct: boolean) => {
    onAnswered(correct);
    // Every answer feeds the spaced-repetition schedule, just like Study.
    if (uid) await recordAnswer(uid, entry.concept.id, correct, reviews);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase inline-flex items-center gap-1.5" style={{ color: ACCENT }}>
          <Sunrise className="h-3.5 w-3.5" />
          {practice ? "Practice" : "Starters"} · {entry.topic.title}
        </span>
        <span className="text-xs text-parchment/50 flex-shrink-0">{idx + 1} / {questions.length}</span>
      </div>

      {/* Progress dots 1–10 */}
      <div className="flex items-center gap-1.5 mb-4" aria-label="Progress">
        {questions.map((_, i) => {
          const answered = i < results.length;
          const tone = answered
            ? results[i] ? "var(--color-emerald-elixir)" : "var(--color-crimson)"
            : i === idx ? ACCENT : null;
          return (
            <span
              key={i}
              className="h-2 w-2 rounded-full transition-all duration-200"
              style={{
                background: tone ?? "color-mix(in oklab, var(--color-parchment) 20%, transparent)",
                transform: i === idx ? "scale(1.35)" : undefined,
                boxShadow: i === idx ? `0 0 8px -1px ${ACCENT}` : undefined,
              }}
            />
          );
        })}
      </div>

      <StarterQuestion
        key={entry.concept.id}
        concept={entry.concept}
        accent={entry.topic.color}
        onAnswered={handleAnswered}
        onNext={onNext}
        last={last}
      />
    </div>
  );
}

/** One multiple-choice question with immediate reveal and a hint on a miss. */
function StarterQuestion({
  concept, accent, onAnswered, onNext, last,
}: {
  concept: Concept; accent: string;
  onAnswered: (correct: boolean) => void; onNext: () => void; last: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const isCorrect = picked === concept.question.answer;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    onAnswered(i === concept.question.answer);
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="font-display text-lg mb-4">{concept.question.prompt}</p>
      <div className="space-y-2.5">
        {concept.question.choices.map((choice, i) => {
          const correct = i === concept.question.answer;
          const showState = answered && (i === picked || correct);
          const tone = !showState ? null : correct ? "var(--color-emerald-elixir)" : "var(--color-crimson)";
          return (
            <button key={i} onClick={() => choose(i)} disabled={answered}
              className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-150 disabled:cursor-default enabled:hover:-translate-y-0.5"
              style={{
                background: tone ? `color-mix(in oklab, ${tone} 12%, transparent)` : "color-mix(in oklab, var(--color-mist) 55%, transparent)",
                border: `1px solid ${tone ? `color-mix(in oklab, ${tone} 45%, transparent)` : "var(--color-border)"}`,
                color: "var(--color-spectral)",
              }}>
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-display flex-shrink-0"
                style={{ background: tone ? `color-mix(in oklab, ${tone} 22%, transparent)` : "color-mix(in oklab, var(--color-parchment) 15%, transparent)", color: tone ?? "var(--color-parchment)" }}>
                {showState ? (correct ? <Check className="h-3.5 w-3.5" /> : i === picked ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
              </span>
              {choice}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4">
          <p className="text-sm mb-3" style={{ color: isCorrect ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}>
            {isCorrect
              ? "✓ Correct — the cauldron approves."
              : <>Not quite. <span className="text-parchment/70">{concept.question.hint}</span></>}
          </p>
          <button onClick={onNext} className="btn-arcane btn-arcane-hover text-sm">
            {last ? "See result" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 h-0.5 w-10 rounded-full" style={{ background: `color-mix(in oklab, ${accent} 55%, transparent)` }} />
    </div>
  );
}

// ── End ───────────────────────────────────────────────────────────────────────
function EndScreen({
  dayKey, score, total, practice, streakCount, onReplay,
}: {
  dayKey: string; score: number; total: number; practice: boolean;
  streakCount: number; onReplay: () => void;
}) {
  const strong = score >= Math.ceil(total * 0.7);
  const tone = strong ? "var(--color-emerald-elixir)" : ACCENT;
  const aurum = Math.max(1, score);

  return (
    <div className="max-w-md">
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: `color-mix(in oklab, ${tone} 10%, transparent)`,
          border: `1px solid color-mix(in oklab, ${tone} 40%, transparent)`,
          boxShadow: `0 0 50px -24px ${tone}`,
        }}
      >
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone }}>
          <Sparkles className="h-7 w-7" />
        </span>

        <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-1">
          <CalendarDays className="h-3.5 w-3.5" /> {prettyDate(dayKey)}
        </p>
        <div className="font-display text-3xl mb-1" style={{ color: tone }}>
          {score} / {total}
        </div>
        <p className="text-sm text-parchment/70 mb-4">
          {practice
            ? "A practice run — nothing tracked, everything remembered."
            : strong ? "A fine morning's alchemy." : "The cauldron warms — missed ones will come back around in review."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, color: ACCENT }}>
            <Flame className="h-3.5 w-3.5" />
            {streakCount > 0 ? `Day ${streakCount} streak` : "Streak begins tomorrow"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)", color: "var(--color-gold)" }}>
            <Coins className="h-3.5 w-3.5" />
            {practice ? "No aurum for practice runs" : `+${aurum} aurum earned`}
          </span>
        </div>

        <p className="text-xs text-parchment/50 mb-5">
          Come back tomorrow for a fresh Ten — the flame only burns if it's fed daily.
        </p>

        <button onClick={onReplay} className="btn-ghost-arcane text-sm">
          <RotateCcw className="h-4 w-4" /> Practice replay
        </button>
      </div>
    </div>
  );
}
