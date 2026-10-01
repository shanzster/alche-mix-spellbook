import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sunrise, Flame, Check, X, ArrowRight, Sparkles, Coins,
  CalendarDays, RotateCcw, Play, Loader2, ScrollText, ChevronDown,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import {
  useUserProfile, recordStarterRun,
  type StudentProfile, type StarterRunRecord,
} from "../lib/profile";
import { ALL_CONCEPT_IDS, conceptById } from "../lib/curriculum";
import { dueConceptIds, recordAnswer } from "../lib/learning";
import { useAI } from "../lib/useAI";

export const Route = createFileRoute("/starters")({
  component: () => (
    <RequireRole role="student">
      <StartersPage />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-gold)";
/** Duolingo-style: a short daily rite — exactly three questions a day. */
const RUN_LENGTH = 3;

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

/** Deterministic PRNG (mulberry32) so the day's concepts are stable. */
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
 * Today's three concepts: anything due for spaced review first (soonest-due
 * first), then date-seeded fill from the rest of the bank. The AI writes a
 * fresh question for each; keyless, the bank's own questions step in.
 */
function buildDailyConcepts(
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

/** A playable question — AI-written or bank fallback, same shape either way. */
interface PlayQuestion {
  conceptId: string;
  topicTitle: string;
  topicColor: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** The bank's own question for a concept (the keyless fallback). */
function bankQuestion(conceptId: string): PlayQuestion | null {
  const entry = conceptById(conceptId);
  if (!entry) return null;
  const q = entry.concept.question;
  return {
    conceptId,
    topicTitle: entry.topic.title,
    topicColor: entry.topic.color,
    prompt: q.prompt,
    choices: q.choices,
    answer: q.answer,
    explanation: `The correct answer is "${q.choices[q.answer]}". ${q.hint}`,
  };
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

/** The cauldron's mood: warm while the streak lives, broken once it lapses. */
type CauldronState = "warm" | "cold" | "broken";
function cauldronState(
  prev: StudentProfile["starterStreak"],
  dayKey: string,
): { state: CauldronState; lostStreak: number } {
  if (!prev || prev.count === 0) return { state: "cold", lostStreak: 0 };
  if (prev.lastDay === dayKey) return { state: "warm", lostStreak: 0 };
  const ms = Date.parse(dayKey) - Date.parse(prev.lastDay);
  if (ms <= 36 * 3600 * 1000) return { state: "warm", lostStreak: 0 };
  return { state: "broken", lostStreak: prev.count };
}

function prettyDate(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ── The cauldron ──────────────────────────────────────────────────────────────
/**
 * The streak's mascot. Warm: bubbling over a flame. Cold: unlit, waiting.
 * Broken: cracked and dim — the look of a lapsed streak, mended by brewing
 * again today.
 */
function Cauldron({ state, size = 96 }: { state: CauldronState; size?: number }) {
  const body =
    state === "broken"
      ? "color-mix(in oklab, var(--color-parchment) 28%, var(--color-slate-sunken))"
      : "color-mix(in oklab, var(--color-parchment) 18%, var(--color-slate-sunken))";
  const brew =
    state === "warm"
      ? "var(--color-emerald-elixir)"
      : "color-mix(in oklab, var(--color-parchment) 30%, transparent)";
  return (
    <div
      className={state === "warm" ? "animate-breathing" : undefined}
      style={{ width: size, height: size, opacity: state === "broken" ? 0.85 : 1 }}
      role="img"
      aria-label={
        state === "warm" ? "A warm, bubbling cauldron"
        : state === "broken" ? "A cracked, cold cauldron"
        : "An unlit cauldron"
      }
    >
      <svg viewBox="0 0 96 96" width={size} height={size}>
        {/* Flame (warm only) */}
        {state === "warm" && (
          <g>
            <path
              d="M40 86 Q48 74 44 68 Q54 72 52 80 Q58 76 56 70 Q64 78 56 86 Z"
              fill="var(--color-gold)"
              opacity="0.9"
            >
              <animate attributeName="opacity" values="0.9;0.55;0.9" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>
        )}
        {/* Bubbles (warm only) */}
        {state === "warm" &&
          [
            { cx: 38, d: "2.2s", delay: "0s" },
            { cx: 50, d: "1.8s", delay: "0.5s" },
            { cx: 60, d: "2.6s", delay: "1s" },
          ].map((b, i) => (
            <circle key={i} cx={b.cx} cy="34" r="3" fill={brew} opacity="0.8">
              <animate attributeName="cy" values="36;22" dur={b.d} begin={b.delay} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur={b.d} begin={b.delay} repeatCount="indefinite" />
            </circle>
          ))}
        {/* Brew surface */}
        <ellipse cx="48" cy="40" rx="25" ry="6" fill={brew} opacity={state === "warm" ? 0.9 : 0.5} />
        {/* Pot body */}
        <path
          d="M23 40 Q23 66 36 72 L60 72 Q73 66 73 40 Z"
          fill={body}
          stroke="color-mix(in oklab, var(--color-parchment) 45%, transparent)"
          strokeWidth="2"
        />
        {/* Rim */}
        <ellipse
          cx="48" cy="40" rx="27" ry="7.5"
          fill="none"
          stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)"
          strokeWidth="3"
        />
        {/* Legs */}
        <path d="M34 72 L30 82 M62 72 L66 82" stroke={body} strokeWidth="4" strokeLinecap="round" />
        {/* Crack + escaped drip (broken only) */}
        {state === "broken" && (
          <g stroke="var(--color-crimson)" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M44 46 L50 54 L45 60 L51 68" opacity="0.9" />
            <path d="M51 68 Q52 74 50 78" opacity="0.5" strokeDasharray="2 3" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Phase = "intro" | "loading" | "play" | "done";

/** Same-day cache so a refresh (or practice replay) reuses today's questions. */
function cacheKey(uid: string | null, dayKey: string): string {
  return `alchemix:starters:${uid ?? "anon"}:${dayKey}`;
}
interface DailySet { source: "gemini" | "fallback"; questions: PlayQuestion[] }
function readCache(uid: string | null, dayKey: string): DailySet | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid, dayKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailySet;
    return parsed.questions?.length === RUN_LENGTH ? parsed : null;
  } catch {
    return null;
  }
}
function writeCache(uid: string | null, dayKey: string, set: DailySet): void {
  try {
    localStorage.setItem(cacheKey(uid, dayKey), JSON.stringify(set));
  } catch {
    /* storage full/blocked — regeneration is fine */
  }
}

function StartersPage() {
  const { uid, profile } = useUserProfile();
  const ai = useAI();
  const reviews = profile?.reviews;
  const streak = profile?.starterStreak;

  const [dayKey] = useState(() => localDayKey());
  const [phase, setPhase] = useState<Phase>("intro");
  /** A replay after today's run is already banked — plays, but isn't tracked. */
  const [practice, setPractice] = useState(false);
  const [daily, setDaily] = useState<DailySet | null>(null);
  const [idx, setIdx] = useState(0);
  /** Chosen choice index per answered question, in order. */
  const [picks, setPicks] = useState<number[]>([]);
  const [recorded, setRecorded] = useState(false);

  const alreadyToday = streak?.lastDay === dayKey;
  const mood = cauldronState(streak, dayKey);
  const questions = daily?.questions ?? [];
  const results = picks.map((p, i) => p === questions[i]?.answer);
  const score = results.filter(Boolean).length;

  /** Build (or reuse) today's set: AI first, curated bank as the fallback. */
  const loadDaily = async (): Promise<DailySet> => {
    const cached = readCache(uid, dayKey);
    if (cached) return cached;
    const conceptIds = buildDailyConcepts(reviews, dayKey);
    const fallback: DailySet = {
      source: "fallback",
      questions: conceptIds
        .map(bankQuestion)
        .filter((q): q is PlayQuestion => q !== null),
    };
    try {
      const payload = conceptIds
        .map((id) => conceptById(id))
        .filter((e): e is NonNullable<ReturnType<typeof conceptById>> => e !== undefined)
        .map((e) => ({
          id: e.concept.id,
          topic: e.topic.title,
          title: e.concept.title,
          learn: e.concept.learn,
        }));
      const r = await ai.starterQuiz({ concepts: payload, seed: `${uid}-${dayKey}` });
      if (r.source === "gemini" && r.questions.length === conceptIds.length) {
        const set: DailySet = {
          source: "gemini",
          questions: r.questions.map((q) => {
            const entry = conceptById(q.conceptId);
            return {
              conceptId: q.conceptId,
              topicTitle: entry?.topic.title ?? "Chemistry",
              topicColor: entry?.topic.color ?? ACCENT,
              prompt: q.prompt,
              choices: q.choices,
              answer: q.answer,
              explanation: q.explanation,
            };
          }),
        };
        writeCache(uid, dayKey, set);
        return set;
      }
    } catch {
      /* fall through to the bank */
    }
    writeCache(uid, dayKey, fallback);
    return fallback;
  };

  const start = async (asPractice: boolean) => {
    setPractice(asPractice);
    setIdx(0);
    setPicks([]);
    setRecorded(false);
    setPhase("loading");
    const set = await loadDaily();
    setDaily(set);
    setPhase("play");
  };

  const finish = (finalPicks: number[]) => {
    if (!practice && !recorded && uid && daily) {
      setRecorded(true);
      const run: StarterRunRecord = {
        day: dayKey,
        score: finalPicks.filter((p, i) => p === daily.questions[i].answer).length,
        outOf: daily.questions.length,
        source: daily.source,
        questions: daily.questions.map((q, i) => ({
          prompt: q.prompt,
          correct: q.choices[q.answer],
          picked: q.choices[finalPicks[i]] ?? "—",
          wasCorrect: finalPicks[i] === q.answer,
        })),
      };
      void recordStarterRun(uid, run);
    }
    setPhase("done");
  };

  return (
    <StudentShell title="Starters">
      <PageHeader
        eyebrow="Daily Ritual"
        title="Daily Starters"
        subtitle="Three questions at dawn keep the cauldron warm — written fresh each day by the Alchemist, feeding your review schedule and your streak."
        icon={Sunrise}
        accent={ACCENT}
        right={
          ai.configured === false ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap"
              style={{
                color: ACCENT,
                background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
              }}
            >
              Curated questions
            </span>
          ) : ai.configured ? (
            <span
              className="text-[10px] tracking-[0.15em] uppercase rounded-full px-3 py-1.5 whitespace-nowrap inline-flex items-center gap-1.5"
              style={{
                color: "var(--color-emerald-elixir)",
                background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)",
              }}
            >
              <Sparkles className="h-3 w-3" /> AI-written daily
            </span>
          ) : undefined
        }
      />

      {phase === "intro" && (
        <>
          <IntroScreen
            dayKey={dayKey}
            streak={streak}
            mood={mood}
            alreadyToday={alreadyToday}
            onStart={() => void start(alreadyToday)}
          />
          <Ledger history={profile?.starterHistory ?? []} />
        </>
      )}

      {phase === "loading" && (
        <div className="max-w-md rounded-2xl p-8 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}>
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" style={{ color: ACCENT }} />
          <p className="text-sm text-parchment/70">The Alchemist pens today's three…</p>
        </div>
      )}

      {phase === "play" && questions.length > 0 && (
        <PlayScreen
          uid={uid}
          reviews={reviews}
          daily={daily!}
          idx={idx}
          picks={picks}
          practice={practice}
          onAnswered={(pick) => setPicks((p) => [...p, pick])}
          onNext={() => {
            if (idx + 1 < questions.length) setIdx(idx + 1);
            else finish(picks);
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
          bestStreak={Math.max(
            streak?.best ?? 0,
            practice ? 0 : streakAfterToday(streak, dayKey),
          )}
          onReplay={() => void start(true)}
        />
      )}
    </StudentShell>
  );
}

// ── Intro ─────────────────────────────────────────────────────────────────────
function IntroScreen({
  dayKey, streak, mood, alreadyToday, onStart,
}: {
  dayKey: string;
  streak: StudentProfile["starterStreak"];
  mood: { state: CauldronState; lostStreak: number };
  alreadyToday: boolean;
  onStart: () => void;
}) {
  const broken = mood.state === "broken";
  const streakCount = streak?.count ?? 0;
  return (
    <div className="max-w-md">
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: broken
            ? "linear-gradient(160deg, color-mix(in oklab, var(--color-crimson) 8%, transparent), color-mix(in oklab, var(--color-slate-sunken) 60%, transparent))"
            : `linear-gradient(160deg, color-mix(in oklab, ${ACCENT} 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 60%, transparent))`,
          border: `1px solid color-mix(in oklab, ${broken ? "var(--color-crimson)" : ACCENT} 30%, transparent)`,
          boxShadow: `0 0 50px -28px ${broken ? "var(--color-crimson)" : ACCENT}`,
        }}
      >
        <div className="mx-auto mb-2 flex justify-center">
          <Cauldron state={mood.state} />
        </div>

        <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-1">
          <CalendarDays className="h-3.5 w-3.5" /> {prettyDate(dayKey)}
        </p>
        <h2 className="font-display text-2xl mb-2">
          {broken ? "The cauldron cracked" : "Today's Three await"}
        </h2>
        <p className="text-sm text-parchment/70 italic mb-4">
          {broken
            ? `Your ${mood.lostStreak}-day streak went cold overnight.`
            : '"Three questions at dawn keep the cauldron warm."'}
        </p>

        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{
              background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
              color: ACCENT,
            }}>
            <Flame className="h-3.5 w-3.5" />
            {broken
              ? "Streak lost — relight it today"
              : streakCount > 0
                ? `Day ${streakCount} streak`
                : "No streak yet — light the flame today"}
          </span>
          {(streak?.best ?? 0) > 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-parchment/60"
              style={{ border: "1px solid var(--color-border)" }}>
              Best: {streak!.best} days
            </span>
          )}
        </div>

        {alreadyToday ? (
          <>
            <p className="text-sm text-parchment/70 mb-4">
              Today's Three are done — your streak is safe and the cauldron
              simmers. Fancy an untracked practice replay?
            </p>
            <button onClick={onStart} className="btn-ghost-arcane text-sm">
              <RotateCcw className="h-4 w-4" /> Practice replay
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-parchment/50 mb-4">
              {broken
                ? "Brew today's Three and the cauldron mends — a new streak begins at day 1."
                : "The Alchemist writes three fresh questions for you — anything due for spaced review comes first."}
            </p>
            <button onClick={onStart} className="btn-arcane btn-arcane-hover">
              <Play className="h-4 w-4" /> {broken ? "Mend the cauldron" : "Begin today's Three"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── The Ledger — past runs ────────────────────────────────────────────────────
function Ledger({ history }: { history: StarterRunRecord[] }) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  if (history.length === 0) return null;
  return (
    <section className="mt-8 max-w-md">
      <div className="mb-3 flex items-center gap-2 px-1">
        <ScrollText className="h-4 w-4" style={{ color: ACCENT }} />
        <h2 className="font-ui text-sm font-medium uppercase tracking-[0.2em] text-parchment/70">
          The Ledger
        </h2>
        <span className="text-[10px] text-parchment/40">{history.length} day{history.length === 1 ? "" : "s"} brewed</span>
      </div>
      <ul className="space-y-2">
        {history.map((run) => {
          const open = openDay === run.day;
          const perfect = run.score === run.outOf;
          const tone = perfect ? "var(--color-emerald-elixir)" : run.score > 0 ? ACCENT : "var(--color-crimson)";
          return (
            <li key={run.day}>
              <button
                onClick={() => setOpenDay(open ? null : run.day)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
                  border: `1px solid ${open ? `color-mix(in oklab, ${tone} 40%, transparent)` : "var(--color-border)"}`,
                }}
                aria-expanded={open}
              >
                <span className="flex-1 text-sm">{prettyDate(run.day)}</span>
                {run.source === "gemini" && (
                  <Sparkles className="h-3 w-3 flex-shrink-0 text-emerald-elixir" aria-label="AI-written day" />
                )}
                <span className="font-ui text-sm font-semibold flex-shrink-0" style={{ color: tone }}>
                  {run.score}/{run.outOf}
                </span>
                <ChevronDown
                  className="h-4 w-4 flex-shrink-0 text-parchment/40 transition-transform"
                  style={{ transform: open ? "rotate(180deg)" : undefined }}
                />
              </button>
              {open && (
                <ul className="mt-1.5 space-y-1.5 pl-2">
                  {run.questions.map((q, i) => (
                    <li
                      key={i}
                      className="rounded-xl px-4 py-2.5 text-sm"
                      style={{
                        background: "color-mix(in oklab, var(--color-slate-sunken) 45%, transparent)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <p className="mb-1 text-parchment">{q.prompt}</p>
                      {q.wasCorrect ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-elixir">
                          <Check className="h-3.5 w-3.5" /> {q.correct}
                        </p>
                      ) : (
                        <>
                          <p className="inline-flex items-center gap-1.5 text-xs text-crimson">
                            <X className="h-3.5 w-3.5" /> You said: {q.picked}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-emerald-elixir">
                            <Check className="h-3.5 w-3.5" /> Correct: {q.correct}
                          </p>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Play ──────────────────────────────────────────────────────────────────────
function PlayScreen({
  uid, reviews, daily, idx, picks, practice, onAnswered, onNext,
}: {
  uid: string | null;
  reviews: StudentProfile["reviews"];
  daily: DailySet;
  idx: number;
  picks: number[];
  practice: boolean;
  onAnswered: (pick: number) => void;
  onNext: () => void;
}) {
  const q = daily.questions[idx];
  const last = idx === daily.questions.length - 1;

  const handleAnswered = async (pick: number) => {
    onAnswered(pick);
    // Every answer feeds the spaced-repetition schedule, just like Study.
    if (uid) await recordAnswer(uid, q.conceptId, pick === q.answer, reviews);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] tracking-[0.2em] uppercase inline-flex items-center gap-1.5" style={{ color: ACCENT }}>
          <Sunrise className="h-3.5 w-3.5" />
          {practice ? "Practice" : "Starters"} · {q.topicTitle}
          {daily.source === "gemini" && <Sparkles className="h-3 w-3 text-emerald-elixir" />}
        </span>
        <span className="text-xs text-parchment/50 flex-shrink-0">{idx + 1} / {daily.questions.length}</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-4" aria-label="Progress">
        {daily.questions.map((qq, i) => {
          const answered = i < picks.length;
          const tone = answered
            ? picks[i] === qq.answer ? "var(--color-emerald-elixir)" : "var(--color-crimson)"
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
        key={`${q.conceptId}-${idx}`}
        question={q}
        onAnswered={handleAnswered}
        onNext={onNext}
        last={last}
      />
    </div>
  );
}

/** One multiple-choice question; a miss reveals the correct answer + why. */
function StarterQuestion({
  question, onAnswered, onNext, last,
}: {
  question: PlayQuestion;
  onAnswered: (pick: number) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const isCorrect = picked === question.answer;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    onAnswered(i);
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="font-ui font-medium text-lg mb-4">{question.prompt}</p>
      <div className="space-y-2.5">
        {question.choices.map((choice, i) => {
          const correct = i === question.answer;
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
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-ui font-medium flex-shrink-0"
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
          {isCorrect ? (
            <p className="text-sm mb-3 text-emerald-elixir">✓ Correct — the cauldron approves.</p>
          ) : (
            <div
              className="mb-3 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-emerald-elixir) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)",
              }}
            >
              <p className="mb-1 font-ui font-medium text-emerald-elixir">
                The correct answer: {String.fromCharCode(65 + question.answer)} — {question.choices[question.answer]}
              </p>
              <p className="text-parchment/80 leading-relaxed">{question.explanation}</p>
            </div>
          )}
          <button onClick={onNext} className="btn-arcane btn-arcane-hover text-sm">
            {last ? "See result" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 h-0.5 w-10 rounded-full" style={{ background: `color-mix(in oklab, ${question.topicColor} 55%, transparent)` }} />
    </div>
  );
}

// ── End ───────────────────────────────────────────────────────────────────────
function EndScreen({
  dayKey, score, total, practice, streakCount, bestStreak, onReplay,
}: {
  dayKey: string; score: number; total: number; practice: boolean;
  streakCount: number; bestStreak: number; onReplay: () => void;
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
        <div className="mx-auto mb-2 flex justify-center">
          <Cauldron state="warm" size={80} />
        </div>

        <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-parchment/60 mb-1">
          <CalendarDays className="h-3.5 w-3.5" /> {prettyDate(dayKey)}
        </p>
        <div className="font-display text-3xl mb-1" style={{ color: tone }}>
          {score} / {total}
        </div>
        <p className="text-sm text-parchment/70 mb-4">
          {practice
            ? "A practice run — nothing tracked, everything remembered."
            : strong ? "A fine morning's alchemy — the cauldron bubbles happily." : "The cauldron warms — missed ones will come back around in review."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, color: ACCENT }}>
            <Flame className="h-3.5 w-3.5" />
            {streakCount > 0 ? `Day ${streakCount} streak` : "Streak begins tomorrow"}
          </span>
          {bestStreak > 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-parchment/60"
              style={{ border: "1px solid var(--color-border)" }}>
              Best: {bestStreak} days
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)", color: "var(--color-gold)" }}>
            <Coins className="h-3.5 w-3.5" />
            {practice ? "No aurum for practice runs" : `+${aurum} aurum earned`}
          </span>
        </div>

        <p className="text-xs text-parchment/50 mb-5">
          Come back tomorrow for a fresh Three — the flame only burns if it's fed daily.
        </p>

        <button onClick={onReplay} className="btn-ghost-arcane text-sm">
          <RotateCcw className="h-4 w-4" /> Practice replay
        </button>
      </div>
    </div>
  );
}
