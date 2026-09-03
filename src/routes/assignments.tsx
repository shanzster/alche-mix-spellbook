import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ClipboardList, CheckCircle2, Circle, Check, X, Lightbulb, ChevronLeft,
  ChevronRight, Layers, ListChecks, Loader2, ScrollText, Sparkles, RotateCcw,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile, recordAssignmentResult, type StudentProfile } from "../lib/profile";
import {
  useClassAssignments, moduleById, type QuizDef, type MissionDef,
} from "../lib/teacher";

export const Route = createFileRoute("/assignments")({
  component: () => (
    <RequireRole role="student">
      <AssignmentsPage />
    </RequireRole>
  ),
});

const GOLD = "var(--color-gold)";
const TEAL = "var(--color-emerald-elixir)";
const WRAITH = "var(--color-wraith)";
const CRIMSON = "var(--color-crimson)";

const cardStyle = {
  background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
  border: "1px solid var(--color-border)",
} as const;

function EmptyCard({ icon: Icon, title, desc, cta }: {
  icon: typeof ClipboardList; title: string; desc: string; cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl px-5 py-10 text-center"
      style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
      <Icon className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
      <p className="font-ui font-medium text-base mb-1">{title}</p>
      <p className="text-sm text-parchment/60 max-w-md mx-auto">{desc}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

// ── Take-quiz flow — one question at a time, immediate reveal, hint on miss ──
function TakeQuiz({ quiz, uid, onExit }: { quiz: QuizDef; uid: string | null; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const q = quiz.questions[index];
  const total = quiz.questions.length;
  const revealed = picked !== null;
  const missed = revealed && picked !== q.answer;

  const choose = (ci: number) => {
    if (revealed) return;
    setPicked(ci);
    if (ci === q.answer) setScore((s) => s + 1);
  };

  const next = async () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    // Finish — the final answer is already tallied in `score`.
    setFinished(true);
    if (!saved) {
      setSaved(true);
      await recordAssignmentResult(uid, quiz.id, score, total);
    }
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    const tone = pct >= 70 ? TEAL : pct >= 40 ? GOLD : CRIMSON;
    const counsel =
      pct === 100 ? "Flawless. The Alchemist bows — this knowledge is truly yours."
      : pct >= 70 ? "Strong work, apprentice. A little polish and it will be flawless."
      : pct >= 40 ? "A fair attempt. Revisit the hints you met along the way and try again."
      : "Every master has stumbled here. Study the modules, then return — the quiz will wait.";
    return (
      <div className="rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto" style={cardStyle}>
        <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: tone }} />
        <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1">{quiz.title}</p>
        <p className="font-display text-4xl mb-1" style={{ color: tone }}>
          {score} <span className="text-parchment/40 text-2xl">/ {total}</span>
        </p>
        <p className="text-sm text-parchment/70 mb-1">{pct}% — result sent to your teacher.</p>
        <p className="text-sm text-parchment/60 leading-relaxed max-w-md mx-auto mb-6">{counsel}</p>
        <button onClick={onExit} className="btn-arcane btn-arcane-hover mx-auto">
          <ChevronLeft className="h-4 w-4" /> Back to assignments
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-parchment/60 hover:text-teal transition">
          <ChevronLeft className="h-3.5 w-3.5" /> Leave quiz
        </button>
        <span className="text-xs text-parchment/60">Question {index + 1} of {total}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(index / total) * 100}%`, background: GOLD }} />
      </div>

      <div className="rounded-2xl p-5 sm:p-6" style={cardStyle}>
        <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-2">{quiz.title}</p>
        <h2 className="font-display text-lg sm:text-xl mb-5 leading-snug">{q.prompt}</h2>

        <div className="grid gap-2.5">
          {q.choices.map((c, ci) => {
            const isAnswer = ci === q.answer;
            const isPicked = ci === picked;
            let tone = "var(--color-border)";
            let bg = "color-mix(in oklab, var(--color-mist) 45%, transparent)";
            if (revealed && isAnswer) { tone = `color-mix(in oklab, ${TEAL} 55%, transparent)`; bg = `color-mix(in oklab, ${TEAL} 12%, transparent)`; }
            else if (revealed && isPicked) { tone = `color-mix(in oklab, ${CRIMSON} 55%, transparent)`; bg = `color-mix(in oklab, ${CRIMSON} 10%, transparent)`; }
            return (
              <button key={ci} onClick={() => choose(ci)} disabled={revealed}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-default"
                style={{ background: bg, border: `1px solid ${tone}` }}>
                <span className="flex-1">{c}</span>
                {revealed && isAnswer && <Check className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />}
                {revealed && isPicked && !isAnswer && <X className="h-4 w-4 flex-shrink-0" style={{ color: CRIMSON }} />}
              </button>
            );
          })}
        </div>

        {/* Immediate teaching moment */}
        {revealed && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{
              background: `color-mix(in oklab, ${missed ? GOLD : TEAL} 10%, transparent)`,
              border: `1px solid color-mix(in oklab, ${missed ? GOLD : TEAL} 30%, transparent)`,
            }}>
            {missed ? (
              <p className="text-parchment/80 leading-relaxed">
                <Lightbulb className="inline h-4 w-4 mr-1.5 -mt-0.5" style={{ color: GOLD }} />
                The answer was <span className="font-ui font-medium" style={{ color: TEAL }}>{q.choices[q.answer]}</span>.
                {q.hint ? <> Your teacher's hint: <em>{q.hint}</em></> : null}
              </p>
            ) : (
              <p className="text-parchment/80"><Check className="inline h-4 w-4 mr-1.5 -mt-0.5" style={{ color: TEAL }} /> Well answered, apprentice.</p>
            )}
          </div>
        )}

        {revealed && (
          <button onClick={() => void next()} className="btn-arcane btn-arcane-hover mt-5 ml-auto">
            {index + 1 < total ? <>Next question <ChevronRight className="h-4 w-4" /></> : <>See my score <Sparkles className="h-4 w-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Quiz list card ──────────────────────────────────────────────────────────
function QuizCard({ quiz, profile, onStart }: { quiz: QuizDef; profile: StudentProfile | null; onStart: () => void }) {
  const result = profile?.assignmentResults?.[quiz.id];
  const pct = result?.outOf ? Math.round((result.score / result.outOf) * 100) : null;
  const tone = pct == null ? GOLD : pct >= 70 ? TEAL : pct >= 40 ? GOLD : CRIMSON;
  return (
    <div className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-ui font-medium text-base leading-snug">{quiz.title}</h3>
        {result ? (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-ui font-medium flex-shrink-0"
            style={{ color: tone, background: `color-mix(in oklab, ${tone} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} 32%, transparent)` }}>
            {result.score}/{result.outOf}
          </span>
        ) : (
          <span className="rounded-full px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase flex-shrink-0"
            style={{ color: GOLD, background: `color-mix(in oklab, ${GOLD} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${GOLD} 30%, transparent)` }}>
            New
          </span>
        )}
      </div>
      <p className="text-xs text-parchment/55 mb-4">
        {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
        {result ? ` · best sent to your teacher` : " · not taken yet"}
      </p>
      <button onClick={onStart} className="btn-arcane btn-arcane-hover mt-auto justify-center text-sm">
        {result ? <><RotateCcw className="h-4 w-4" /> Retake quiz</> : <><Layers className="h-4 w-4" /> Take quiz</>}
      </button>
    </div>
  );
}

// ── Mission card — live done-detection from practice counters ───────────────
function MissionCard({ mission, profile }: { mission: MissionDef; profile: StudentProfile | null }) {
  const practice = profile?.practice ?? {};
  const rows = mission.targets.map((t) => {
    const entry = moduleById(t.moduleId);
    const key = entry?.practiceKey ?? t.practiceKey;
    return { ...t, route: entry?.route ?? `/${t.moduleId}`, done: (practice[key] ?? 0) > 0 };
  });
  const doneCount = rows.filter((r) => r.done).length;
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;
  const complete = rows.length > 0 && doneCount === rows.length;
  const tone = complete ? TEAL : WRAITH;

  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-ui font-medium text-base leading-snug">{mission.title}</h3>
        <span className="text-xs font-ui font-medium flex-shrink-0" style={{ color: tone }}>
          {complete ? "Complete!" : `${doneCount}/${rows.length}`}
        </span>
      </div>
      {mission.note ? (
        <p className="text-xs text-parchment/65 leading-relaxed mt-1.5">
          <ScrollText className="inline h-3.5 w-3.5 mr-1 -mt-0.5" style={{ color: GOLD }} />
          From your teacher: “{mission.note}”
        </p>
      ) : null}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full my-4 overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
      </div>

      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.moduleId}>
            <Link to={r.route as any}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-teal/5"
              style={{ background: "color-mix(in oklab, var(--color-mist) 40%, transparent)", border: "1px solid var(--color-border)", opacity: r.done ? 0.75 : 1 }}>
              {r.done
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                : <Circle className="h-4 w-4 flex-shrink-0 text-parchment/35" />}
              <span className="text-sm flex-1 min-w-0 truncate" style={r.done ? { textDecoration: "line-through", textDecorationColor: "color-mix(in oklab, var(--color-parchment) 40%, transparent)" } : undefined}>
                <span className="font-ui font-medium text-parchment/40 mr-1.5">{i + 1}.</span>{r.label}
              </span>
              {!r.done && <span className="text-[10px] tracking-[0.12em] uppercase text-teal flex-shrink-0">Go →</span>}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
function AssignmentsPage() {
  const { uid, profile, loading: profileLoading } = useUserProfile();
  const classId = profile?.classId ?? null;
  const { quizzes, missions, className, loading: classLoading } = useClassAssignments(classId);
  const [taking, setTaking] = useState<QuizDef | null>(null);

  const loading = profileLoading || (classId != null && classLoading);

  return (
    <StudentShell title="Assignments">
      {taking ? (
        <TakeQuiz quiz={taking} uid={uid} onExit={() => setTaking(null)} />
      ) : (
        <>
          <PageHeader
            eyebrow="From Your Teacher"
            title="Assignments"
            subtitle={className
              ? `Quizzes and missions set for ${className}. Quiz scores go straight to your teacher; missions tick themselves off as you practise.`
              : "Quizzes and missions your teacher sets for your class will gather here."}
            icon={ClipboardList}
            accent={GOLD}
          />

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-parchment/60" style={cardStyle}>
              <Loader2 className="h-4 w-4 animate-spin" /> Consulting the class ledger…
            </div>
          ) : !classId ? (
            <EmptyCard icon={ClipboardList} title="You haven't joined a class yet"
              desc="Ask your teacher for their 6-letter class code, then enter it on your dashboard. Their quizzes and missions will appear here."
              cta={<Link to="/app" className="btn-arcane btn-arcane-hover inline-flex">Go to my dashboard</Link>} />
          ) : (
            <div className="space-y-10">
              {/* Quizzes */}
              <section>
                <h2 className="font-ui font-medium text-lg mb-1 inline-flex items-center gap-2">
                  <Layers className="h-4 w-4" style={{ color: GOLD }} /> Quizzes from your teacher
                </h2>
                <p className="text-xs text-parchment/55 mb-4">One question at a time, answers revealed as you go. You can retake a quiz — the latest score is kept.</p>
                {quizzes.length === 0 ? (
                  <EmptyCard icon={Layers} title="No quizzes yet"
                    desc="When your teacher builds a quiz for your class, it will appear here ready to take." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((q) => (
                      <QuizCard key={q.id} quiz={q} profile={profile} onStart={() => setTaking(q)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Missions */}
              <section>
                <h2 className="font-ui font-medium text-lg mb-1 inline-flex items-center gap-2">
                  <ListChecks className="h-4 w-4" style={{ color: WRAITH }} /> Missions
                </h2>
                <p className="text-xs text-parchment/55 mb-4">Ordered checklists of modules to work through. Practising a module ticks it off automatically.</p>
                {missions.length === 0 ? (
                  <EmptyCard icon={ListChecks} title="No missions yet"
                    desc="Your teacher can compose a mission — a checklist of modules with a note — and it will show up here with live progress." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {missions.map((m) => (
                      <MissionCard key={m.id} mission={m} profile={profile} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </StudentShell>
  );
}
