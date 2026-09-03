import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crosshair, RefreshCw, Star, Swords, Trophy } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";
import { PERIODIC_ELEMENTS, FBLOCK_MARKERS, type TableElement } from "../lib/periodic-table-data";

export const Route = createFileRoute("/table-game")({
  component: () => (
    <RequireAuth>
      <TableGame />
    </RequireAuth>
  ),
});

// ── Game constants ──────────────────────────────────────────────────────────
const ROUNDS = 10;
const OUT_OF = ROUNDS * 2; // 2 points per round max

type Difficulty = "apprentice" | "adept" | "master";

const DIFFS: { id: Difficulty; label: string; blurb: string; pool: string }[] = [
  { id: "apprentice", label: "Apprentice", blurb: "You're given the element's name and symbol — click its home cell.", pool: "Elements 1–36" },
  { id: "adept", label: "Adept", blurb: "Only the symbol is shown. Recall the name, then place it.", pool: "Elements 1–86" },
  { id: "master", label: "Master", blurb: "Riddles only: periods, groups, proton counts and families.", pool: "All 118 elements" },
];

const starsFor = (score: number) => (score >= 18 ? 3 : score >= 14 ? 2 : score >= 10 ? 1 : 0);

// ── Round building ──────────────────────────────────────────────────────────
interface Round {
  el: TableElement;
  /** The big prompt text (name, symbol, or riddle). */
  clue: string;
  /** Small line under the prompt (e.g. the symbol on Apprentice). */
  sub?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Real period number (f-block rows 9/10 belong to periods 6/7). */
const periodOf = (el: TableElement) => (el.ypos === 9 ? 6 : el.ypos === 10 ? 7 : el.ypos);

/** A Master riddle: mixes period/group, proton-count and family clues. */
function masterClue(el: TableElement, seed: number): string {
  const kinds: ("protons" | "pg" | "cat")[] = ["protons"];
  // Period + group only makes sense for the main block (f-block has no group).
  if (el.ypos <= 7) kinds.push("pg");
  // Family clue only when it points at exactly one element.
  const p = periodOf(el);
  const sameFamily = PERIODIC_ELEMENTS.filter((e) => e.category === el.category && periodOf(e) === p);
  if (sameFamily.length === 1) kinds.push("cat");
  const kind = kinds[seed % kinds.length];
  if (kind === "pg") return `Period ${el.ypos}, Group ${el.xpos}`;
  if (kind === "cat") return `the ${el.category.toLowerCase()} in period ${p}`;
  return `the element with ${el.number} protons`;
}

function buildRounds(diff: Difficulty): Round[] {
  const pool = PERIODIC_ELEMENTS.filter((el) =>
    diff === "apprentice" ? el.number <= 36 : diff === "adept" ? el.number <= 86 : true,
  );
  const els = shuffle(pool).slice(0, ROUNDS);
  return els.map((el, i) => {
    if (diff === "apprentice") return { el, clue: el.name, sub: el.symbol };
    if (diff === "adept") return { el, clue: el.symbol, sub: "symbol only — where does it live?" };
    return { el, clue: masterClue(el, i) };
  });
}

// ── Presentational bits ─────────────────────────────────────────────────────
function StarRow({ n, className = "h-5 w-5" }: { n: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={className}
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 30%, transparent)",
            fill: i < n ? "var(--color-gold)" : "none",
          }}
        />
      ))}
    </span>
  );
}

type CellState = "idle" | "miss" | "hit" | "answer";

function GameCell({ el, state, flash, locked, onPick }: {
  el: TableElement;
  state: CellState;
  /** Pulse the most recent wrong click. */
  flash: boolean;
  locked: boolean;
  onPick: (el: TableElement) => void;
}) {
  const revealed = state !== "idle";
  const color =
    state === "hit" ? "var(--color-emerald-elixir)"
    : state === "miss" ? "var(--color-crimson)"
    : state === "answer" ? "var(--color-gold)"
    : "var(--color-parchment)";
  return (
    <button
      onClick={() => onPick(el)}
      disabled={locked || revealed}
      aria-label={revealed ? `${el.name} (${el.symbol})` : `cell at group ${Math.min(el.xpos, 18)}, row ${el.ypos}`}
      style={{
        gridColumn: el.xpos + 1, // column 1 is the period-label gutter
        gridRow: el.ypos,
        background: revealed
          ? `color-mix(in oklab, ${color} ${state === "hit" ? 26 : 16}%, transparent)`
          : "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
        border: revealed
          ? `1px solid color-mix(in oklab, ${color} 80%, transparent)`
          : "1px solid var(--color-border)",
        boxShadow: state === "hit" ? `0 0 14px -4px ${color}` : "none",
        color,
      }}
      className={`relative flex aspect-square min-w-[30px] flex-col items-center justify-center rounded-[5px] leading-none transition-all duration-150 ${
        !revealed && !locked ? "hover:z-10 hover:brightness-150 hover:border-teal/60 cursor-crosshair" : ""
      } ${flash ? "animate-pulse" : ""}`}
    >
      {revealed && (
        <>
          <span className="absolute left-[3px] top-[2px] text-[7px] font-medium text-parchment/60 sm:text-[8px]">{el.number}</span>
          <span className="font-sans text-[11px] font-semibold sm:text-sm">{el.symbol}</span>
        </>
      )}
    </button>
  );
}

const GRID_TEMPLATE = "minmax(18px, 24px) repeat(18, minmax(30px, 1fr))";

function TrialGrid({ cellState, lastMiss, locked, onPick }: {
  cellState: (el: TableElement) => CellState;
  lastMiss: number | null;
  locked: boolean;
  onPick: (el: TableElement) => void;
}) {
  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <div className="min-w-[680px]">
        {/* Group numbers along the top */}
        <div className="mb-1 grid gap-[3px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          <div />
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} className="text-center text-[9px] text-parchment/50">{i + 1}</div>
          ))}
        </div>

        <div className="grid gap-[3px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {/* Period numbers down the left */}
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ gridColumn: 1, gridRow: i + 1 }} className="flex items-center justify-center text-[9px] text-parchment/50">
              {i + 1}
            </div>
          ))}

          {PERIODIC_ELEMENTS.map((el) => (
            <GameCell
              key={el.number}
              el={el}
              state={cellState(el)}
              flash={el.number === lastMiss}
              locked={locked}
              onPick={onPick}
            />
          ))}

          {/* Group-3 markers pointing at the f-block rows below */}
          {FBLOCK_MARKERS.map((m) => (
            <div
              key={m.label}
              style={{ gridColumn: m.xpos + 1, gridRow: m.ypos, border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}
              className="flex aspect-square items-center justify-center rounded-[5px] text-[7px] text-parchment/60 sm:text-[9px]"
            >
              {m.label}
            </div>
          ))}

          {/* Spacer between the main block and the f-block rows */}
          <div style={{ gridColumn: "1 / span 19", gridRow: 8, height: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ── The game ────────────────────────────────────────────────────────────────
function TableGame() {
  const { uid, profile } = useUserProfile();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("apprentice");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState<number[]>([]);
  const [lastMiss, setLastMiss] = useState<number | null>(null);
  const [resolved, setResolved] = useState<{ points: number } | null>(null);
  const [saved, setSaved] = useState(false);

  const round = rounds[idx];

  const start = (diff: Difficulty) => {
    setDifficulty(diff);
    setRounds(buildRounds(diff));
    setIdx(0); setScore(0); setMisses([]); setLastMiss(null); setResolved(null); setSaved(false);
    setPhase("play");
  };

  const pick = (el: TableElement) => {
    if (!round || resolved) return;
    if (el.number === round.el.number) {
      const points = misses.length === 0 ? 2 : 1;
      setScore((s) => s + points);
      setResolved({ points });
      setLastMiss(null);
    } else {
      if (misses.includes(el.number)) return;
      const next = [...misses, el.number];
      setMisses(next);
      setLastMiss(el.number);
      if (next.length >= 2) {
        setResolved({ points: 0 });
        setLastMiss(null);
      }
    }
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      setPhase("done");
      if (uid && !saved) {
        setSaved(true);
        recordTrial(uid, `table-game-${difficulty}`, { score, outOf: OUT_OF, stars: starsFor(score) });
        logPractice(uid, "table-game");
      }
    } else {
      setIdx((i) => i + 1);
      setMisses([]); setLastMiss(null); setResolved(null);
    }
  };

  const cellState = (el: TableElement): CellState => {
    if (!round) return "idle";
    if (misses.includes(el.number)) return "miss";
    if (el.number === round.el.number && resolved) return resolved.points > 0 ? "hit" : "answer";
    return "idle";
  };

  const stars = starsFor(score);
  const missedEl = lastMiss !== null ? PERIODIC_ELEMENTS.find((e) => e.number === lastMiss) : undefined;

  return (
    <ModuleShell
      title="Placement Trials"
      eyebrow="Table Mastery Game"
      icon={Crosshair}
      subtitle="Battleship for the periodic table: the chart is blank — read the clue, then strike the element's home cell."
      right={phase === "play" ? (
        <span className="inline-flex items-center gap-3 text-xs tracking-[0.15em] uppercase text-parchment/70">
          <span className="inline-flex items-center gap-1.5"><Swords className="h-4 w-4 text-teal" /> {idx + 1} / {ROUNDS}</span>
          <span className="text-gold">{score} pts</span>
        </span>
      ) : undefined}
    >
      {/* ── Intro: pick a difficulty ── */}
      {phase === "intro" && (
        <div>
          <div className="rounded-2xl p-8 text-center mb-6" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid var(--color-border)" }}>
            <Crosshair className="h-12 w-12 text-teal mx-auto mb-4" />
            <h2 className="font-display text-2xl mb-2">Choose your trial</h2>
            <p className="text-parchment text-sm max-w-md mx-auto">
              {ROUNDS} rounds, 2 tries each. First try lands 2 points, second lands 1 — wrong cells reveal what they were, so every miss still teaches you the map.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {DIFFS.map((d) => {
              const best = profile?.trials?.[`table-game-${d.id}`];
              return (
                <button
                  key={d.id}
                  onClick={() => start(d.id)}
                  className="rounded-2xl p-6 text-left transition-all duration-200 hover:-translate-y-1"
                  style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)", border: "1px solid color-mix(in oklab, var(--color-teal) 30%, var(--color-border))" }}
                >
                  <h3 className="font-display text-xl text-spectral mb-1">{d.label}</h3>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-teal mb-3">{d.pool}</p>
                  <p className="text-sm text-parchment mb-4">{d.blurb}</p>
                  {best ? (
                    <span className="inline-flex items-center gap-2 text-sm text-parchment/80">
                      <StarRow n={best.stars} className="h-4 w-4" /> Best {best.best}/{best.outOf}
                    </span>
                  ) : (
                    <span className="text-sm text-parchment/50">Not yet attempted</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Play ── */}
      {phase === "play" && round && (
        <div>
          {/* The clue */}
          <div className="mb-4 rounded-2xl px-6 py-5 text-center" style={{ background: "color-mix(in oklab, var(--color-violet-deep) 18%, color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))", border: "1px solid var(--color-border)" }}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-parchment/60 mb-1">
              {difficulty === "master" ? "Find" : "Place"}
            </p>
            <p className="font-display text-2xl sm:text-3xl text-spectral">{round.clue}</p>
            {round.sub && <p className="text-sm text-teal mt-1">{round.sub}</p>}
            {/* Tries */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {[0, 1].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full" style={{
                  background: i < 2 - misses.length ? "var(--color-teal)" : "color-mix(in oklab, var(--color-crimson) 60%, transparent)",
                }} />
              ))}
              <span className="ml-1.5 text-[10px] uppercase tracking-[0.12em] text-parchment/60">{2 - misses.length} tr{2 - misses.length === 1 ? "y" : "ies"} left</span>
            </div>
          </div>

          <TrialGrid cellState={cellState} lastMiss={lastMiss} locked={!!resolved} onPick={pick} />

          {/* Feedback */}
          <div className="mt-3 min-h-[64px]">
            {!resolved && missedEl && (
              <div className="rounded-r-lg pl-4 pr-3 py-3 text-sm text-parchment"
                style={{ borderLeft: "3px solid color-mix(in oklab, var(--color-crimson) 60%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 7%, transparent)" }}>
                <span className="font-ui font-medium" style={{ color: "var(--color-crimson)" }}>Miss — </span>
                that cell was {missedEl.name} ({missedEl.symbol}). One try left.
              </div>
            )}
            {resolved && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-r-lg pl-4 pr-3 py-3 text-sm text-parchment"
                style={{
                  borderLeft: `3px solid color-mix(in oklab, ${resolved.points > 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 60%, transparent)`,
                  background: `color-mix(in oklab, ${resolved.points > 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 7%, transparent)`,
                }}>
                <span>
                  <span className="font-ui font-medium" style={{ color: resolved.points > 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
                    {resolved.points === 2 ? "Direct hit! +2 points. " : resolved.points === 1 ? "Second-try strike — +1 point. " : "Out of tries. "}
                  </span>
                  {resolved.points > 0
                    ? `That's ${round.el.name} (${round.el.symbol}), element ${round.el.number}.`
                    : `It was ${round.el.name} (${round.el.symbol}) — now glowing gold on the chart.`}
                </span>
                <button onClick={next} className="btn-arcane btn-arcane-hover shrink-0 justify-center">
                  {idx + 1 >= rounds.length ? "See results" : "Next round"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {phase === "done" && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}>
          <Trophy className="h-12 w-12 text-gold mx-auto mb-4" />
          <h2 className="font-display text-3xl mb-2">
            {score === OUT_OF ? "Flawless placement!" : `${DIFFS.find((d) => d.id === difficulty)?.label} trial complete`}
          </h2>
          <p className="font-display text-5xl text-teal my-4">{score}/{OUT_OF}</p>
          <div className="mb-4"><StarRow n={stars} className="h-7 w-7" /></div>
          <p className="text-sm text-parchment mb-6 max-w-sm mx-auto">
            {stars === 3 ? "You know this chart like the back of your hand."
              : stars === 2 ? "Strong navigation — a few more hits and it's three stars."
              : stars === 1 ? "You're finding your way around. Another run will sharpen it."
              : "The table fights back at first. Replay and watch the pattern emerge."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => start(difficulty)} className="btn-arcane btn-arcane-hover"><RefreshCw className="h-4 w-4" /> Retry {DIFFS.find((d) => d.id === difficulty)?.label}</button>
            <button onClick={() => setPhase("intro")} className="btn-arcane btn-arcane-hover">Change difficulty</button>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
