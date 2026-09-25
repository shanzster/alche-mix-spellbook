import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Eye,
  Fingerprint,
  RefreshCw,
  ScrollText,
  Star,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";
import { elementByNumber, type TableElement } from "../lib/periodic-table-data";
import { ELEMENT_LORE } from "../lib/element-lore";

export const Route = createFileRoute("/identifier")({
  component: () => (
    <RequireAuth>
      <Identifier />
    </RequireAuth>
  ),
});

/**
 * Element Identifier — the Assayer's Trial.
 *
 * A mystery element is drawn from the real periodic-table data and described
 * through five progressively sharper clues (family → state & discovery →
 * measured properties → the name's origin → proton count). The apprentice
 * names it — by name or symbol — in as few clues as possible. Fully
 * deterministic: every clue comes from the curated datasets, no AI involved.
 */

// Well-known elements a middle/high-schooler can reasonably deduce.
const POOL_NUMBERS = [
  1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24,
  26, 28, 29, 30, 35, 47, 50, 53, 74, 78, 79, 80, 82, 92,
];

const ROUNDS = 5;
const CLUES_PER_ROUND = 5;
/** Points for a correct call = 6 − clues seen, so 5 down to 1. */
const MAX_SCORE = ROUNDS * CLUES_PER_ROUND;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lanthanides/actinides sit on pulled-out rows 9/10 but belong to periods 6/7. */
const periodOf = (el: TableElement) => (el.ypos === 9 ? 6 : el.ypos === 10 ? 7 : el.ypos);

const ROOM_K = 298;
function stateAtRoomTemp(el: TableElement): string | null {
  if (el.meltK === undefined) return null;
  if (el.meltK > ROOM_K) return "solid";
  if (el.boilK !== undefined && el.boilK < ROOM_K) return "gas";
  return "liquid";
}

/** Strip the element's own name out of lore text so a clue can't say it outright. */
function conceal(text: string, el: TableElement): string {
  return text.replace(new RegExp(el.name, "gi"), "this element");
}

function buildClues(el: TableElement): string[] {
  const clues: string[] = [];

  clues.push(
    `It is classified as a ${el.category.toLowerCase()}, and it sits in period ${periodOf(el)} of the table.`,
  );

  const state = stateAtRoomTemp(el);
  const discovery = el.ancient
    ? "Humans have known it since antiquity."
    : el.discoveryYear
      ? `It was discovered in ${el.discoveryYear}.`
      : "";
  clues.push(
    [state ? `At room temperature it is a ${state}.` : "", discovery]
      .filter(Boolean)
      .join(" ") || `Its electrons fill ${el.shells.split(",").length} shells.`,
  );

  const props: string[] = [];
  if (el.meltK !== undefined) props.push(`it melts at about ${Math.round(el.meltK - 273.15)} °C`);
  if (el.electronegativity !== undefined)
    props.push(`its electronegativity is ${el.electronegativity} on the Pauling scale`);
  clues.push(
    props.length > 0
      ? `Measured in the lab: ${props.join(", and ")}.`
      : `It belongs to group ${el.xpos} of the table.`,
  );

  const lore = ELEMENT_LORE[el.symbol];
  clues.push(
    lore
      ? `The origin of its name: ${conceal(lore.etymology, el)}`
      : `It belongs to group ${el.xpos}, with electrons arranged ${el.shells}.`,
  );

  clues.push(
    `It has ${el.number} protons and an atomic mass of ${el.mass}. Its electrons fill shells as ${el.shells}.`,
  );

  return clues.slice(0, CLUES_PER_ROUND);
}

const matches = (guess: string, el: TableElement) => {
  const g = guess.trim().toLowerCase();
  return g.length > 0 && (g === el.name.toLowerCase() || g === el.symbol.toLowerCase());
};

const identifierStars = (score: number) =>
  score >= 20 ? 3 : score >= 14 ? 2 : score >= 8 ? 1 : 0;

function StarRow({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className="h-4 w-4"
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 35%, transparent)",
            fill: i < n ? "var(--color-gold)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}

interface RoundState {
  el: TableElement;
  clues: string[];
  revealed: number;
  /** null = still guessing; true = named it; false = round lost. */
  solved: boolean | null;
  pointsEarned: number;
}

function Identifier() {
  const { uid, profile } = useUserProfile();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [elements, setElements] = useState<TableElement[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<RoundState | null>(null);
  const [guess, setGuess] = useState("");
  const [wrongGuess, setWrongGuess] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [saved, setSaved] = useState(false);

  const startRound = (els: TableElement[], idx: number) => {
    const el = els[idx];
    setRound({ el, clues: buildClues(el), revealed: 1, solved: null, pointsEarned: 0 });
    setGuess("");
    setWrongGuess(null);
  };

  const start = () => {
    const els = shuffle(
      POOL_NUMBERS.map(elementByNumber).filter((e): e is TableElement => e !== undefined),
    ).slice(0, ROUNDS);
    setElements(els);
    setRoundIdx(0);
    setScore(0);
    setSaved(false);
    startRound(els, 0);
    setPhase("play");
  };

  const revealNext = () => {
    if (!round || round.solved !== null) return;
    setWrongGuess(null);
    if (round.revealed < round.clues.length) {
      setRound({ ...round, revealed: round.revealed + 1 });
    }
  };

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!round || round.solved !== null || guess.trim().length === 0) return;
    if (matches(guess, round.el)) {
      const pts = CLUES_PER_ROUND + 1 - round.revealed;
      setScore((s) => s + pts);
      setRound({ ...round, solved: true, pointsEarned: pts });
      setWrongGuess(null);
    } else if (round.revealed < round.clues.length) {
      // A wrong call costs a clue — the assay narrows either way.
      setWrongGuess(guess.trim());
      setRound({ ...round, revealed: round.revealed + 1 });
      setGuess("");
    } else {
      // All clues spent and still wrong — the element reveals itself.
      setWrongGuess(guess.trim());
      setRound({ ...round, solved: false, pointsEarned: 0 });
    }
  };

  const giveUp = () => {
    if (!round || round.solved !== null) return;
    setRound({ ...round, revealed: round.clues.length, solved: false, pointsEarned: 0 });
  };

  const nextRound = async () => {
    if (roundIdx + 1 >= ROUNDS) {
      setPhase("done");
      if (uid && !saved) {
        setSaved(true);
        logPractice(uid, "identifier");
        recordTrial(uid, "identifier", {
          score,
          outOf: MAX_SCORE,
          stars: identifierStars(score),
        });
      }
    } else {
      setRoundIdx((i) => i + 1);
      startRound(elements, roundIdx + 1);
    }
  };

  const lore = round ? ELEMENT_LORE[round.el.symbol] : undefined;

  return (
    <ModuleShell
      title="Element Identifier"
      eyebrow="The Assayer's Trial"
      icon={Fingerprint}
      subtitle="Five mystery elements, five clues each — real data only. Name each one in as few clues as you can."
      right={
        phase === "play" ? (
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-parchment/70">
            <Fingerprint className="h-4 w-4 text-teal" /> Element {roundIdx + 1} / {ROUNDS} · {score} pts
          </span>
        ) : undefined
      }
    >
      {phase === "intro" && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Fingerprint className="h-12 w-12 text-teal mx-auto mb-4" />
          <h2 className="font-display text-2xl mb-2">Can you name the unknown?</h2>
          <p className="text-parchment text-sm max-w-md mx-auto mb-6">
            An assayer identifies a substance from its properties alone. Each mystery element offers
            up to {CLUES_PER_ROUND} clues — family, state, measured values, the story of its name,
            and finally its proton count. The fewer clues you need, the more points you earn. Answer
            with the element's name or its symbol.
          </p>
          <button onClick={start} className="btn-arcane btn-arcane-hover">
            <Timer className="h-4 w-4" /> Begin the assay
          </button>
          {profile?.trials?.identifier && (
            <div
              className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-gold) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
              }}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">Best run</span>
              <span className="font-ui font-medium text-gold">
                {profile.trials.identifier.best}/{profile.trials.identifier.outOf}
              </span>
              <StarRow n={profile.trials.identifier.stars} />
              <span className="text-xs text-parchment/50">
                {profile.trials.identifier.plays} play{profile.trials.identifier.plays === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      )}

      {phase === "play" && round && (
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* The clue scroll */}
          <div
            className="rounded-2xl p-6"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--color-violet-deep) 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-gold" />
              <h2 className="font-ui font-medium text-spectral">The assay notes</h2>
              <span className="ml-auto text-xs text-parchment/50">
                clue {round.revealed} / {round.clues.length}
              </span>
            </div>
            <ol className="space-y-3">
              {round.clues.slice(0, round.revealed).map((clue, i) => (
                <li
                  key={i}
                  className="rounded-r-lg py-2.5 pl-4 pr-3 font-serif text-sm text-parchment"
                  style={{
                    borderLeft: "3px solid color-mix(in oklab, var(--color-gold) 45%, transparent)",
                    background: "color-mix(in oklab, var(--color-gold) 6%, transparent)",
                  }}
                >
                  {clue}
                </li>
              ))}
            </ol>
            {round.solved === null && round.revealed < round.clues.length && (
              <button
                onClick={revealNext}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-parchment/80 transition-colors hover:text-spectral"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <Eye className="h-4 w-4" /> Reveal another clue (−1 point)
              </button>
            )}
          </div>

          {/* The guess */}
          <div>
            <h2 className="font-display text-2xl mb-4">Name the element</h2>
            {round.solved === null ? (
              <>
                <form onSubmit={submitGuess} className="flex gap-2">
                  <input
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Name or symbol — e.g. Iron or Fe"
                    aria-label="Your guess"
                    autoFocus
                    className="min-w-0 flex-1 rounded-xl px-4 py-3 font-ui text-sm text-spectral placeholder:text-parchment/35 outline-none transition-colors focus:border-emerald-elixir"
                    style={{
                      background: "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={guess.trim().length === 0}
                    className="btn-arcane btn-arcane-hover flex-shrink-0 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Call it
                  </button>
                </form>
                {wrongGuess && (
                  <div
                    className="mt-4 rounded-r-lg py-3 pl-4 pr-3 text-sm text-parchment"
                    style={{
                      borderLeft: "3px solid color-mix(in oklab, var(--color-gold) 60%, transparent)",
                      background: "color-mix(in oklab, var(--color-gold) 7%, transparent)",
                    }}
                  >
                    <span className="font-ui font-medium text-gold">Not {wrongGuess}. </span>
                    A wrong call isn't wasted — the next clue narrows the field. Read the notes again.
                  </div>
                )}
                <button
                  onClick={giveUp}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-parchment/50 transition-colors hover:text-parchment"
                >
                  <X className="h-3.5 w-3.5" /> Concede this element
                </button>
              </>
            ) : (
              <>
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: `color-mix(in oklab, ${round.solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 8%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${round.solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 35%, transparent)`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/60">
                    {round.solved ? `Named it — +${round.pointsEarned} points` : "It was"}
                  </p>
                  <p className="mt-1 font-display text-3xl text-spectral">
                    {round.el.name}{" "}
                    <span className="text-parchment/60 text-2xl">({round.el.symbol})</span>
                  </p>
                  <p className="mt-1 text-sm text-parchment/70">
                    Element {round.el.number} · {round.el.category} · mass {round.el.mass}
                  </p>
                  {lore && (
                    <p className="mt-3 font-serif text-sm text-parchment">{lore.history}</p>
                  )}
                </div>
                <button onClick={nextRound} className="btn-arcane btn-arcane-hover mt-5 w-full justify-center">
                  {roundIdx + 1 >= ROUNDS ? "See results" : "Next element"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
          }}
        >
          <Trophy className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl mb-2">
            {score === MAX_SCORE ? "A master assayer!" : "Assay complete"}
          </h2>
          <p className="font-display text-5xl text-teal my-4">
            {score}/{MAX_SCORE}
          </p>
          <div className="mb-4 flex justify-center">
            <StarRow n={identifierStars(score)} />
          </div>
          <p className="text-sm text-parchment mb-6">
            {score === MAX_SCORE
              ? "Every element named from a single clue. The bench has nothing left to teach you here."
              : "The fewer clues you need, the more points you earn — run the assay again and trust the early clues."}
          </p>
          <button onClick={start} className="btn-arcane btn-arcane-hover">
            <RefreshCw className="h-4 w-4" /> Assay again
          </button>
        </div>
      )}
    </ModuleShell>
  );
}
