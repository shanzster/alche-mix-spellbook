import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ScanLine, Camera, Box, Sparkles, Award, Check, X as XIcon,
  Grid3x3, Atom, ChevronRight, BookMarked,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { CrystalAR, AR_ELEMENTS } from "../components/CrystalAR";
import { useUserProfile, scanCard, logPractice, awardBadge } from "../lib/profile";

export const Route = createFileRoute("/scanner")({
  component: () => (
    <RequireAuth>
      <Scanner />
    </RequireAuth>
  ),
});

interface QuizItem { q: string; options: string[]; answer: number }

// Per-element quick check unlocked by the scan — answers come from the model's
// info card and from how the scanner itself works, so it doubles as the
// "explain it" test.
const QUIZZES: Record<string, QuizItem[]> = {
  alchemix: [
    {
      q: "What is the symbol of the element you summoned?",
      options: ["Au", "Ax", "Cr"],
      answer: 1,
    },
    {
      q: "What state of matter is the Alchemix crystal?",
      options: ["Crystalline solid", "Liquid", "Gas"],
      answer: 0,
    },
    {
      q: "The model stays locked onto the card because the camera tracks…",
      options: ["A QR code", "Your location", "The card artwork's detail points"],
      answer: 2,
    },
  ],
  helium: [
    {
      q: "What is helium's symbol?",
      options: ["He", "H", "Hm"],
      answer: 0,
    },
    {
      q: "Helium belongs to which family of elements?",
      options: ["Alkali metals", "Halogens", "Noble gases"],
      answer: 2,
    },
    {
      q: "Why do helium balloons float?",
      options: ["Helium is lighter than air", "Helium is magnetic", "Helium is warm"],
      answer: 0,
    },
  ],
};

function Step({ icon: Icon, title, body }: { icon: typeof Camera; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-parchment/10 bg-slate-sunken/40 p-4">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-elixir/15">
        <Icon className="h-4.5 w-4.5 text-emerald-elixir" />
      </div>
      <div>
        <p className="font-medium text-parchment">{title}</p>
        <p className="mt-0.5 text-sm text-parchment/60">{body}</p>
      </div>
    </div>
  );
}

/** Post-scan reward for one element: recap + quick check + where to go next. */
function DiscoveryPanel({ uid, elementKey }: { uid: string | null; elementKey: string }) {
  const el = AR_ELEMENTS.find((e) => e.key === elementKey);
  const quiz = QUIZZES[elementKey] ?? [];
  const [picked, setPicked] = useState<(number | null)[]>(quiz.map(() => null));
  const loggedQuiz = useRef(false);

  if (!el || quiz.length === 0) return null;

  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === quiz[i].answer).length;
  const done = answered === quiz.length;

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return; // one attempt per question
    const next = [...picked];
    next[qi] = oi;
    setPicked(next);
    if (next.every((p) => p !== null) && !loggedQuiz.current) {
      loggedQuiz.current = true;
      void logPractice(uid, "scanner-quiz"); // teacher sees the check was taken
      const score = next.filter((p, i) => p === quiz[i].answer).length;
      if (score === quiz.length) void awardBadge(uid, "ar-alchemist"); // perfect run → badge on Home
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, color-mix(in oklab, var(--color-gold) 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))",
        border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)",
        boxShadow: "0 0 50px -18px color-mix(in oklab, var(--color-gold) 45%, transparent)",
      }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl" style={{ background: "color-mix(in oklab, var(--color-gold) 16%, transparent)" }} />

      {/* Header */}
      <div className="relative mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-gold) 18%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)" }}>
          <Award className="h-5 w-5 text-gold" />
        </span>
        <div>
          <p className="font-display text-lg text-spectral">Discovery unlocked — {el.name} ({el.symbol})</p>
          <p className="text-sm text-parchment/60">Recorded to your progress. Now seal it: answer the quick check below.</p>
        </div>
      </div>

      {/* Quick check */}
      <div className="relative space-y-4">
        {quiz.map((item, qi) => (
          <div key={qi} className="rounded-xl border border-parchment/10 bg-slate-sunken/50 p-4">
            <p className="mb-3 text-sm font-medium text-parchment">{qi + 1}. {item.q}</p>
            <div className="flex flex-wrap gap-2">
              {item.options.map((opt, oi) => {
                const chosen = picked[qi] === oi;
                const isAnswer = oi === item.answer;
                const revealed = picked[qi] !== null;
                const color = revealed && isAnswer ? "var(--color-emerald-elixir)"
                  : chosen ? "var(--color-crimson)" : "var(--color-parchment)";
                return (
                  <button key={oi} onClick={() => pick(qi, oi)} disabled={revealed}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition disabled:cursor-default"
                    style={{
                      color,
                      border: `1px solid color-mix(in oklab, ${color} ${revealed && (isAnswer || chosen) ? "55%" : "25%"}, transparent)`,
                      background: revealed && isAnswer ? "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)"
                        : chosen ? "color-mix(in oklab, var(--color-crimson) 12%, transparent)" : "transparent",
                    }}>
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
          <p className="flex items-center gap-2 text-sm" style={{ color: correct === quiz.length ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
            <Sparkles className="h-4 w-4" />
            {correct === quiz.length
              ? "Perfect — 3/3. Badge earned: AR Alchemist — see it on your Home page!"
              : `${correct}/${quiz.length} — tap the model in AR to reread its info card, then rescan to retry.`}
          </p>
        )}
      </div>

      {/* Where to go next */}
      <div className="relative mt-6 grid gap-2 sm:grid-cols-2">
        <Link to="/cards" className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40 sm:col-span-2">
          <BookMarked className="h-4.5 w-4.5 text-gold flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">The {el.name} card is now yours — see it in your <span className="font-display text-spectral">Grimoire</span></span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
        <Link to="/periodic-table" className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40">
          <Grid3x3 className="h-4.5 w-4.5 text-emerald-elixir flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">Study real elements in the <span className="font-display text-spectral">Periodic Table</span></span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
        <Link to="/atomic-builder" className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40">
          <Atom className="h-4.5 w-4.5 text-gold flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">Forge an atom yourself in the <span className="font-display text-spectral">Atomic Builder</span></span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
      </div>
    </div>
  );
}

function Scanner() {
  const { uid } = useUserProfile();
  const [discovered, setDiscovered] = useState<string[]>([]);

  // onFound fires from inside the AR session (possibly long after render), so
  // read the uid through a ref to avoid capturing a stale null.
  const uidRef = useRef<string | null>(uid);
  uidRef.current = uid;

  const handleFound = (elementKey: string) => {
    setDiscovered((prev) => (prev.includes(elementKey) ? prev : [...prev, elementKey]));
    const el = AR_ELEMENTS.find((e) => e.key === elementKey);
    if (el) void scanCard(uidRef.current, el.symbol); // element joins the student's collection
    void logPractice(uidRef.current, "scanner");      // engagement shows on the teacher dashboard
  };

  return (
    <ModuleShell
      title="AR Scanner"
      eyebrow="Augmented Reality"
      subtitle="Scan an AlcheMix element card to summon its 3D model — then claim the discovery."
      icon={ScanLine}
      accent="var(--color-emerald-elixir)"
    >
      <div className="space-y-6">
        {/* The camera / AR viewport — full width. */}
        <div className="mx-auto w-full max-w-4xl">
          <CrystalAR onFound={handleFound} />
        </div>

        {/* The outcome: one discovery panel per element scanned. */}
        {discovered.length > 0 ? (
          discovered.map((key) => <DiscoveryPanel key={key} uid={uid} elementKey={key} />)
        ) : (
          <>
            {/* How-to steps, below the viewport. */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Step
                icon={Camera}
                title="1 · Allow the camera"
                body="Click Start scanning and grant camera access. Needs HTTPS (or localhost)."
              />
              <Step
                icon={ScanLine}
                title="2 · Aim at a card"
                body="Fill the frame with an AlcheMix element trigger card, well lit and roughly flat."
              />
              <Step
                icon={Box}
                title="3 · Claim the discovery"
                body="The model rises out of the card. Tap it to inspect the element — then close the camera to claim your discovery."
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm text-parchment/70">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
              <span>
                Tracking works best on a printed or on-screen copy of a trigger card with plenty of
                detail and even lighting. Glare and motion blur are its enemies.
              </span>
            </div>
          </>
        )}
      </div>
    </ModuleShell>
  );
}
