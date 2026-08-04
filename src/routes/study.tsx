import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Brain, BookOpen, Lock, Check, X, ArrowRight, RotateCcw,
  ChevronLeft, Sparkles, Award, Flame, Target,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ConceptCard } from "../components/Learn";
import { useUserProfile } from "../lib/profile";
import { CURRICULUM, conceptById, type Concept, type Topic } from "../lib/curriculum";
import {
  advancePath, recordAnswer, dueConceptIds, scheduledCount, isTopicUnlocked,
  topicStage, pathCompletion, assessThreshold, ASSESS_PASS,
} from "../lib/learning";

export const Route = createFileRoute("/study")({
  component: () => (
    <RequireRole role="student">
      <StudyPage />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-wraith)";

function StudyPage() {
  const { uid, profile } = useUserProfile();
  const pathProgress = profile?.pathProgress;
  const reviews = profile?.reviews;
  const [tab, setTab] = useState<"path" | "review">("path");

  // Freeze "due" the moment the page loads so answering doesn't reshuffle it.
  const dueCount = useMemo(() => dueConceptIds(reviews, Date.now()).length, [reviews]);

  return (
    <StudentShell title="Study">
      <PageHeader
        eyebrow="The Study"
        title="Learn it. Practise it. Remember it."
        subtitle="Walk a guided path through each topic, then let spaced repetition resurface anything you're about to forget."
        icon={Brain}
        accent={ACCENT}
      />

      {/* Tabs */}
      <div className="inline-flex rounded-full p-1 mb-8" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
        {([
          { key: "path", label: "Learning Path", icon: BookOpen },
          { key: "review", label: dueCount > 0 ? `Review · ${dueCount} due` : "Review", icon: Flame },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
            style={tab === t.key ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT } : { color: "var(--color-parchment)" }}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            {t.key === "review" && dueCount > 0 && tab !== "review" && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px]" style={{ background: "var(--color-gold)", color: "#1a1206" }}>{dueCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "path" && <PathTab uid={uid} pathProgress={pathProgress} />}
      {tab === "review" && <ReviewTab uid={uid} reviews={reviews} />}
    </StudentShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Learning Path
// ════════════════════════════════════════════════════════════════════════════
function PathTab({ uid, pathProgress }: { uid: string | null; pathProgress: Parameters<typeof isTopicUnlocked>[1] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const topic = openId ? CURRICULUM.find((t) => t.id === openId) : null;
  if (topic) return <TopicFlow uid={uid} topic={topic} pathProgress={pathProgress} onExit={() => setOpenId(null)} />;

  const pct = Math.round(pathCompletion(pathProgress) * 100);

  return (
    <div>
      {/* Overall progress */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-parchment) 18%, transparent)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--color-emerald-elixir), ${ACCENT})` }} />
        </div>
        <span className="text-xs text-parchment/60 font-display flex-shrink-0">{pct}% complete</span>
      </div>

      <ol className="space-y-3">
        {CURRICULUM.map((t, i) => {
          const unlocked = isTopicUnlocked(i, pathProgress);
          const stage = topicStage(t.id, pathProgress);
          const done = stage === "done";
          return (
            <li key={t.id}>
              <button
                disabled={!unlocked}
                onClick={() => setOpenId(t.id)}
                className="group w-full text-left flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 disabled:cursor-not-allowed enabled:hover:-translate-y-0.5"
                style={{
                  background: unlocked ? `linear-gradient(150deg, color-mix(in oklab, ${t.color} 12%, transparent), color-mix(in oklab, var(--color-slate-sunken) 60%, transparent))` : "color-mix(in oklab, var(--color-slate-sunken) 45%, transparent)",
                  border: `1px solid color-mix(in oklab, ${done ? t.color : "var(--color-parchment)"} ${unlocked ? 30 : 15}%, transparent)`,
                  opacity: unlocked ? 1 : 0.55,
                }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg flex-shrink-0"
                  style={{ background: `color-mix(in oklab, ${t.color} 16%, transparent)`, color: t.color, border: `1px solid color-mix(in oklab, ${t.color} 35%, transparent)` }}>
                  {done ? <Check className="h-5 w-5" /> : unlocked ? i + 1 : <Lock className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base">{t.title}</div>
                  <div className="text-xs text-parchment/60 truncate">{t.blurb}</div>
                </div>
                <StageBadge stage={stage} color={t.color} unlocked={unlocked} />
                {unlocked && <ArrowRight className="h-4 w-4 text-parchment/40 group-hover:text-wraith group-hover:translate-x-0.5 transition-all flex-shrink-0" />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageBadge({ stage, color, unlocked }: { stage: string | null; color: string; unlocked: boolean }) {
  if (!unlocked) return <span className="text-[9px] tracking-[0.15em] uppercase text-parchment/40 flex-shrink-0">Locked</span>;
  const label = stage === "done" ? "Complete" : stage === "assess" ? "Assess" : stage === "practise" ? "Practise" : stage === "learn" ? "In progress" : "Start";
  return <span className="text-[9px] tracking-[0.15em] uppercase flex-shrink-0" style={{ color: stage ? color : "var(--color-parchment)" }}>{label}</span>;
}

// ── The learn → practise → assess flow for one topic ──────────────────────────
type FlowStage = "learn" | "practise" | "assess" | "result";

function TopicFlow({
  uid, topic, pathProgress, onExit,
}: {
  uid: string | null; topic: Topic;
  pathProgress: Parameters<typeof isTopicUnlocked>[1];
  onExit: () => void;
}) {
  const reviews = useUserProfile().profile?.reviews;
  const [stage, setStage] = useState<FlowStage>("learn");
  const [idx, setIdx] = useState(0);
  const [assessScore, setAssessScore] = useState(0);
  const concepts = topic.concepts;

  const back = (
    <button onClick={onExit} className="inline-flex items-center gap-1.5 text-xs text-parchment/60 hover:text-wraith mb-4 transition">
      <ChevronLeft className="h-3.5 w-3.5" /> Back to path
    </button>
  );

  // ── Learn ──
  if (stage === "learn") {
    return (
      <div className="max-w-2xl">
        {back}
        <h2 className="font-display text-2xl mb-1" style={{ color: topic.color }}>{topic.title}</h2>
        <p className="text-sm text-parchment/60 mb-5">Read through the ideas, then practise them.</p>
        <div className="space-y-3 mb-6">
          {concepts.map((c) => (
            <ConceptCard key={c.id} title={c.title}>{c.learn}</ConceptCard>
          ))}
        </div>
        <button onClick={() => { advancePath(uid!, topic.id, "practise", undefined, pathProgress); setIdx(0); setStage("practise"); }}
          className="btn-arcane btn-arcane-hover">
          <Target className="h-4 w-4" /> Start practice
        </button>
      </div>
    );
  }

  // ── Practise (with hints, ungraded) & Assess (no hints, graded) ──
  if (stage === "practise" || stage === "assess") {
    const grading = stage === "assess";
    const concept = concepts[idx];
    const last = idx === concepts.length - 1;
    const onAnswered = async (correct: boolean) => {
      if (uid) await recordAnswer(uid, concept.id, correct, reviews);
      if (grading && correct) setAssessScore((s) => s + 1);
    };
    const onNext = () => {
      if (!last) { setIdx((i) => i + 1); return; }
      if (grading) {
        const frac = concepts.length ? assessScore / concepts.length : 0;
        const passed = frac >= ASSESS_PASS;
        if (uid) advancePath(uid, topic.id, passed ? "done" : "assess", frac, pathProgress);
        setStage("result");
      } else {
        advancePath(uid!, topic.id, "assess", undefined, pathProgress);
        setIdx(0);
        setStage("assess");
      }
    };
    return (
      <div className="max-w-2xl">
        {back}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: grading ? "var(--color-gold)" : topic.color }}>
            {grading ? "Assessment" : "Practice"} · {topic.title}
          </span>
          <span className="text-xs text-parchment/50">{idx + 1} / {concepts.length}</span>
        </div>
        <QuestionCard key={concept.id} concept={concept} showHint={!grading} accent={topic.color} onAnswered={onAnswered} onNext={onNext} lastLabel={grading ? "See result" : "Continue"} last={last} />
      </div>
    );
  }

  // ── Result ──
  const frac = concepts.length ? assessScore / concepts.length : 0;
  const passed = frac >= ASSESS_PASS;
  const tone = passed ? "var(--color-emerald-elixir)" : "var(--color-gold)";
  return (
    <div className="max-w-md">
      {back}
      <div className="rounded-2xl p-6 text-center" style={{ background: `color-mix(in oklab, ${tone} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} 40%, transparent)`, boxShadow: `0 0 50px -24px ${tone}` }}>
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone }}>
          {passed ? <Award className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
        </span>
        <div className="font-display text-2xl mb-1" style={{ color: tone }}>{passed ? "Topic complete!" : "Almost there"}</div>
        <p className="text-sm text-parchment/70 mb-1">You scored {assessScore} / {concepts.length}</p>
        <p className="text-xs text-parchment/50 mb-5">
          {passed ? "The next topic on the path is now unlocked." : `You need ${assessThreshold(topic.id)} correct to pass. Review and try again.`}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {passed
            ? <button onClick={onExit} className="btn-arcane btn-arcane-hover text-sm"><Sparkles className="h-4 w-4" /> Back to path</button>
            : <>
                <button onClick={() => { setAssessScore(0); setIdx(0); setStage("assess"); }} className="btn-arcane btn-arcane-hover text-sm"><RotateCcw className="h-4 w-4" /> Retry assessment</button>
                <button onClick={() => { setIdx(0); setStage("learn"); }} className="btn-ghost-arcane text-sm"><BookOpen className="h-4 w-4" /> Review lesson</button>
              </>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Spaced-Repetition Review
// ════════════════════════════════════════════════════════════════════════════
function ReviewTab({ uid, reviews }: { uid: string | null; reviews: Parameters<typeof dueConceptIds>[0] }) {
  // Freeze the queue at mount so rescheduling mid-session doesn't reshuffle it.
  const [queue] = useState(() => dueConceptIds(reviews, Date.now()).filter((id) => conceptById(id)));
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const scheduled = scheduledCount(reviews);

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl px-5 py-12 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
        <Flame className="h-9 w-9 mx-auto mb-3" style={{ color: "var(--color-gold)" }} />
        <p className="font-display text-lg mb-1">Nothing due right now</p>
        <p className="text-sm text-parchment/60 max-w-sm mx-auto">
          {scheduled === 0
            ? "Work through a topic on the Learning Path — the concepts you practise will start showing up here for review."
            : `You're all caught up. ${scheduled} concept${scheduled === 1 ? "" : "s"} scheduled — check back later as they come due.`}
        </p>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="max-w-md rounded-2xl p-6 text-center" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)" }}>
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" }}>
          <Check className="h-7 w-7" />
        </span>
        <div className="font-display text-2xl mb-1 text-teal">Review complete</div>
        <p className="text-sm text-parchment/70">You recalled {correctCount} of {queue.length}. Missed ones will come back around soon.</p>
      </div>
    );
  }

  const entry = conceptById(queue[idx])!;
  const onAnswered = async (correct: boolean) => {
    if (uid) await recordAnswer(uid, entry.concept.id, correct, reviews);
    if (correct) setCorrectCount((c) => c + 1);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] tracking-[0.2em] uppercase inline-flex items-center gap-1.5" style={{ color: "var(--color-gold)" }}>
          <Flame className="h-3.5 w-3.5" /> Review · {entry.topic.title}
        </span>
        <span className="text-xs text-parchment/50">{idx + 1} / {queue.length}</span>
      </div>
      <QuestionCard key={entry.concept.id} concept={entry.concept} showHint accent={entry.topic.color}
        onAnswered={onAnswered} onNext={() => setIdx((i) => i + 1)} last={idx === queue.length - 1} lastLabel="Finish" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Shared: one multiple-choice question
// ════════════════════════════════════════════════════════════════════════════
function QuestionCard({
  concept, showHint, accent, onAnswered, onNext, last, lastLabel = "Continue",
}: {
  concept: Concept; showHint: boolean; accent: string;
  onAnswered: (correct: boolean) => void; onNext: () => void;
  last: boolean; lastLabel?: string;
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
            {isCorrect ? "✓ Correct — nicely recalled." : <>Not quite. {showHint && <span className="text-parchment/70">{concept.question.hint}</span>}</>}
          </p>
          <button onClick={onNext} className="btn-arcane btn-arcane-hover text-sm" style={!isCorrect ? { filter: "none" } : undefined}>
            {last ? lastLabel : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {!answered && showHint && (
        <p className="mt-4 text-xs text-parchment/45">Pick the answer you think is right.</p>
      )}

      {/* accent hairline */}
      <div className="mt-4 h-0.5 w-10 rounded-full" style={{ background: `color-mix(in oklab, ${accent} 55%, transparent)` }} />
    </div>
  );
}
