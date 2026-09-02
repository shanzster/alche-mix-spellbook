import { useRef, useState } from "react";
import { Check, Sparkles, X as XIcon } from "lucide-react";
import { logPractice, awardBadge } from "../lib/profile";

/**
 * The per-element "quick check" — the in-depth half of a discovery.
 * The mobile/PWA side only shows a glimpse after an AR scan; this check lives
 * on the WEBSITE, on the card's Grimoire page, so the deep knowledge (and the
 * AR Alchemist badge) is earned there.
 */

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
}

// Answers come from the element's card facts and from how the AR scanner works,
// so it doubles as the "explain it" test.
export const ELEMENT_QUIZZES: Record<string, QuizItem[]> = {
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

export function QuickCheck({
  uid,
  elementKey,
  accent = "var(--color-gold)",
}: {
  uid: string | null;
  elementKey: string;
  accent?: string;
}) {
  const quiz = ELEMENT_QUIZZES[elementKey] ?? [];
  const [picked, setPicked] = useState<(number | null)[]>(quiz.map(() => null));
  const loggedQuiz = useRef(false);

  if (quiz.length === 0) return null;

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
    <div className="space-y-3">
      <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: accent }}>
        Quick check — seal your knowledge
      </p>
      {quiz.map((item, qi) => (
        <div key={qi} className="rounded-xl border border-parchment/10 bg-slate-sunken/50 p-4">
          <p className="mb-3 text-sm font-medium text-parchment">
            {qi + 1}. {item.q}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.options.map((opt, oi) => {
              const chosen = picked[qi] === oi;
              const isAnswer = oi === item.answer;
              const revealed = picked[qi] !== null;
              const color =
                revealed && isAnswer
                  ? "var(--color-emerald-elixir)"
                  : chosen
                    ? "var(--color-crimson)"
                    : "var(--color-parchment)";
              return (
                <button
                  key={oi}
                  onClick={() => pick(qi, oi)}
                  disabled={revealed}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition disabled:cursor-default"
                  style={{
                    color,
                    border: `1px solid color-mix(in oklab, ${color} ${revealed && (isAnswer || chosen) ? "55%" : "25%"}, transparent)`,
                    background:
                      revealed && isAnswer
                        ? "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)"
                        : chosen
                          ? "color-mix(in oklab, var(--color-crimson) 12%, transparent)"
                          : "transparent",
                  }}
                >
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
        <p
          className="flex items-center gap-2 text-sm"
          style={{
            color: correct === quiz.length ? "var(--color-emerald-elixir)" : "var(--color-gold)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          {correct === quiz.length
            ? "Perfect — 3/3. Badge earned: AR Alchemist — see it on your Home page!"
            : `${correct}/${quiz.length} — reread the facts above, then reopen this card to retry.`}
        </p>
      )}
    </div>
  );
}
