import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Coins,
  FlaskConical,
  Info,
  RotateCcw,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Wind,
  Zap,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { BASE_CARDS } from "../lib/cards";
import { useUserProfile, recordDuel } from "../lib/profile";
import {
  ABILITIES,
  DUEL_STATS,
  MAX_ROUNDS,
  activeOf,
  applyMove,
  chooseAiMove,
  createDuel,
  forgeOptions,
  legalMoves,
  seededRng,
  type Difficulty,
  type DuelState,
  type Fighter,
  type LogEvent,
  type Move,
  type Rng,
} from "../lib/duel";

export const Route = createFileRoute("/duel")({
  component: () => (
    <RequireRole role="student">
      <DuelPage />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-crimson)";
const GOLD = "var(--color-gold)";

const DIFFICULTIES: {
  id: Difficulty;
  title: string;
  blurb: string;
  aurum: number;
  color: string;
}[] = [
  {
    id: "easy",
    title: "Novice Rival",
    blurb: "An apprentice who mixes on instinct. Moves are impulsive; the cauldron forgives.",
    aurum: 10,
    color: "var(--color-emerald-elixir)",
  },
  {
    id: "medium",
    title: "Journeyman Rival",
    blurb: "A journeyman who always takes the strongest strike and retreats wounded reagents.",
    aurum: 20,
    color: "var(--color-amber-scry)",
  },
  {
    id: "hard",
    title: "The Grand Alchemist",
    blurb: "Reads a move ahead, hunts your water-formers, and forges compounds when it pays.",
    aurum: 40,
    color: "var(--color-crimson)",
  },
];

/** Render a chemical formula with real subscripts (H2O → H₂O). */
function Formula({ f, className }: { f: string; className?: string }) {
  return (
    <span className={className}>
      {f.split(/(\d+)/).map((part, i) =>
        /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : <span key={i}>{part}</span>,
      )}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Page shell + phase machine
// ════════════════════════════════════════════════════════════════════════════
type Phase = "intro" | "battle" | "end";

function DuelPage() {
  const { uid, profile } = useUserProfile();
  const [phase, setPhase] = useState<Phase>("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [draft, setDraft] = useState<string[]>([]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const rngRef = useRef<Rng>(seededRng(1));

  const startDuel = (diff: Difficulty) => {
    const rng = seededRng(Date.now() % 2147483647);
    rngRef.current = rng;
    setDifficulty(diff);
    setDuel(createDuel(rng, draft.length === 4 ? draft : undefined));
    setPhase("battle");
  };

  return (
    <StudentShell title="Duel the Alchemist">
      <DuelStyles />
      <PageHeader
        eyebrow="The Duelling Circle"
        title="Duel the Alchemist"
        subtitle="Four reagent cards against four. Every battle stat is drawn from real chemistry — know your elements and you will know your enemy."
        icon={Swords}
        accent={ACCENT}
        right={
          phase === "battle" && duel ? (
            <div
              className="rounded-xl px-4 py-2.5 text-center"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                border: `1px solid color-mix(in oklab, ${GOLD} 35%, transparent)`,
              }}
            >
              <div className="font-display text-xl" style={{ color: GOLD }}>
                Round {duel.round}
                <span className="text-parchment/50"> / {MAX_ROUNDS}</span>
              </div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-parchment/60">
                {DIFFICULTIES.find((d) => d.id === difficulty)?.title}
              </div>
            </div>
          ) : undefined
        }
      />

      {phase === "intro" && (
        <IntroScreen
          record={profile?.duelRecord}
          draft={draft}
          setDraft={setDraft}
          onStart={startDuel}
        />
      )}
      {phase === "battle" && duel && (
        <BattleScreen
          duel={duel}
          setDuel={setDuel}
          difficulty={difficulty}
          rng={rngRef.current}
          onFinished={() => setPhase("end")}
        />
      )}
      {phase === "end" && duel && (
        <EndScreen
          duel={duel}
          difficulty={difficulty}
          uid={uid}
          onRematch={() => startDuel(difficulty)}
          onChangeDifficulty={() => {
            setDuel(null);
            setPhase("intro");
          }}
        />
      )}
    </StudentShell>
  );
}

// ── Local animations (scoped: all class names are duel-prefixed) ─────────────
function DuelStyles() {
  return (
    <style>{`
      @keyframes duel-hit {
        0% { transform: translateX(0); filter: none; }
        20% { transform: translateX(-5px); filter: brightness(1.6) saturate(1.5); }
        45% { transform: translateX(5px); }
        70% { transform: translateX(-3px); }
        100% { transform: translateX(0); filter: none; }
      }
      .duel-hit { animation: duel-hit 0.55s ease-out; }
      @keyframes duel-forge-flash {
        0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-gold) 70%, transparent); }
        100% { box-shadow: 0 0 0 26px color-mix(in oklab, var(--color-gold) 0%, transparent); }
      }
      .duel-forge { animation: duel-forge-flash 0.9s ease-out; }
      @keyframes duel-log-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .duel-log-in { animation: duel-log-in 0.25s ease-out; }
    `}</style>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Intro — difficulty picker, record, draft, and the pedagogy table
// ════════════════════════════════════════════════════════════════════════════
function IntroScreen({
  record,
  draft,
  setDraft,
  onStart,
}: {
  record?: Record<string, { wins: number; losses: number }>;
  draft: string[];
  setDraft: (d: string[]) => void;
  onStart: (d: Difficulty) => void;
}) {
  const toggleDraft = (symbol: string) => {
    if (draft.includes(symbol)) setDraft(draft.filter((s) => s !== symbol));
    else if (draft.length < 4) setDraft([...draft, symbol]);
  };

  return (
    <div>
      {/* ── Choose your rival ── */}
      <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
        <Swords className="h-4 w-4" style={{ color: ACCENT }} /> Choose your rival
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {DIFFICULTIES.map((d) => {
          const rec = record?.[d.id];
          return (
            <button
              key={d.id}
              onClick={() => onStart(d.id)}
              className="flex flex-col rounded-2xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(150deg, color-mix(in oklab, ${d.color} 12%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))`,
                border: `1px solid color-mix(in oklab, ${d.color} 40%, transparent)`,
                boxShadow: `0 10px 30px -20px ${d.color}`,
              }}
            >
              <span className="font-display text-lg" style={{ color: d.color }}>
                {d.title}
              </span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-parchment/75">
                {d.blurb}
              </span>
              <span className="mt-3 flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1" style={{ color: GOLD }}>
                  <Coins className="h-3.5 w-3.5" /> {d.aurum} aurum on victory
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-parchment/60">
                  <Trophy className="h-3.5 w-3.5" />
                  {rec ? `${rec.wins}W – ${rec.losses}L` : "no duels yet"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Draft your hand ── */}
      <h2 className="mb-1 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
        <FlaskConical className="h-4 w-4" style={{ color: GOLD }} /> Draft your hand
      </h2>
      <p className="mb-3 px-1 text-xs text-parchment/60">
        Pick exactly 4 of the 12 element cards — or pick none and let fate draw for you. Your rival
        draws from what remains: one card set, no duplicates on the table.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        {BASE_CARDS.map((c) => {
          const s = DUEL_STATS[c.symbol];
          const picked = draft.includes(c.symbol);
          return (
            <button
              key={c.symbol}
              onClick={() => toggleDraft(c.symbol)}
              className="flex flex-col items-center rounded-xl px-3 py-2 transition-all duration-150 hover:-translate-y-0.5"
              style={
                picked
                  ? {
                      background: `color-mix(in oklab, ${c.color} 22%, transparent)`,
                      border: `1.5px solid color-mix(in oklab, ${c.color} 60%, transparent)`,
                      boxShadow: `0 0 18px -8px ${c.color}`,
                    }
                  : {
                      background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
                      border: "1px solid var(--color-border)",
                    }
              }
            >
              <span className="font-sans text-lg font-semibold" style={{ color: c.color }}>
                {c.symbol}
              </span>
              <span className="text-[9px] text-parchment/70">
                {s.hp} HP · {s.atk} ATK
              </span>
            </button>
          );
        })}
      </div>
      <p className="mb-8 px-1 text-xs text-parchment/55">
        {draft.length === 0
          ? "Fate will deal your four."
          : draft.length === 4
            ? `Your hand is drafted: ${draft.join(", ")}. Choose a rival above to begin.`
            : `${draft.length} of 4 chosen.`}
      </p>

      {/* ── How the stats come from real chemistry ── */}
      <h2 className="mb-1 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
        <BookOpen className="h-4 w-4" style={{ color: "var(--color-wraith)" }} /> Where the battle
        stats come from
      </h2>
      <p className="mb-3 px-1 text-xs leading-relaxed text-parchment/65">
        Nothing here is invented. <span className="text-spectral">HP</span> grows with an atom's
        electron shells and valence electrons (more substance to wear down).{" "}
        <span className="text-spectral">ATK</span> is the size of the charge the element takes in
        its everyday compounds — its oxidation state — doubled for drama.{" "}
        <span className="text-spectral">Speed</span> is its state at room temperature: gases strike
        first, solids last, lighter atoms break ties. Each ability is a real property of the
        element. And the Forge move is real: any pair of your cards that genuinely reacts can fuse
        into the true compound.
      </p>
      <div
        className="overflow-x-auto rounded-2xl"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.15em] text-parchment/50">
              <th className="px-3 py-2.5">Card</th>
              <th className="px-3 py-2.5">HP</th>
              <th className="px-3 py-2.5">ATK (|oxidation| × 2)</th>
              <th className="px-3 py-2.5">Speed (state at 20 °C)</th>
              <th className="px-3 py-2.5">Ability — the real chemistry</th>
            </tr>
          </thead>
          <tbody>
            {BASE_CARDS.map((c) => {
              const s = DUEL_STATS[c.symbol];
              const ab = ABILITIES[s.ability];
              return (
                <tr key={c.symbol} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-sans font-semibold" style={{ color: c.color }}>
                      {c.symbol}
                    </span>{" "}
                    <span className="text-parchment/70">{c.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-spectral">{s.hp}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-spectral">{s.atk}</span>{" "}
                    <span className="text-parchment/50">(state {s.oxState})</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {s.speedTier === 2 ? (
                      <span className="inline-flex items-center gap-1 text-spectral">
                        <Wind className="h-3 w-3" /> Gas — first
                      </span>
                    ) : (
                      <span className="text-parchment/70">Solid — last</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 leading-snug">
                    <span className="font-display" style={{ color: GOLD }}>
                      {ab.name}
                    </span>{" "}
                    <span className="text-parchment/60">— {ab.chemistry}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Battle screen
// ════════════════════════════════════════════════════════════════════════════
function BattleScreen({
  duel,
  setDuel,
  difficulty,
  rng,
  onFinished,
}: {
  duel: DuelState;
  setDuel: (d: DuelState) => void;
  difficulty: Difficulty;
  rng: Rng;
  onFinished: () => void;
}) {
  const [panel, setPanel] = useState<"none" | "swap" | "forge">("none");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [forgedIds, setForgedIds] = useState<Set<string>>(new Set());
  const prevLogLen = useRef(duel.log.length);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const playerTurn = duel.turn === 0 && duel.winner === null;
  const moves = useMemo(() => legalMoves(duel, 0), [duel]);
  const forges = useMemo(() => forgeOptions(duel, 0), [duel]);
  const you = activeOf(duel, 0);
  const rival = activeOf(duel, 1);
  const canAbility = playerTurn && moves.some((m) => m.type === "ability");
  const youAbility = you.ability ? ABILITIES[you.ability] : null;

  // Animate newly appended log events (hit flashes, forge glow).
  useEffect(() => {
    const fresh = duel.log.slice(prevLogLen.current);
    prevLogLen.current = duel.log.length;
    const hits = new Set<string>();
    const forgesNew = new Set<string>();
    for (const e of fresh) {
      if (e.damage && e.targetId) hits.add(e.targetId);
      if (e.kind === "forge" && e.targetId) forgesNew.add(e.targetId);
    }
    if (hits.size) {
      setFlashIds(hits);
      const t = setTimeout(() => setFlashIds(new Set()), 600);
      return () => clearTimeout(t);
    }
    if (forgesNew.size) {
      setForgedIds(forgesNew);
      const t = setTimeout(() => setForgedIds(new Set()), 950);
      return () => clearTimeout(t);
    }
  }, [duel.log]);

  // Keep the battle log scrolled to the freshest line.
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [duel.log.length]);

  // The rival takes its turn after a beat.
  useEffect(() => {
    if (duel.turn !== 1 || duel.winner !== null) return;
    const t = setTimeout(() => {
      setDuel(applyMove(duel, chooseAiMove(duel, difficulty, rng)));
    }, 950);
    return () => clearTimeout(t);
  }, [duel, difficulty, rng, setDuel]);

  // Hand over to the end screen once the outcome has sunk in.
  useEffect(() => {
    if (duel.winner === null) return;
    const t = setTimeout(onFinished, 1600);
    return () => clearTimeout(t);
  }, [duel.winner, onFinished]);

  const play = (move: Move) => {
    if (!playerTurn) return;
    setPanel("none");
    setDuel(applyMove(duel, move));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* ── The circle ── */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Rival field */}
        <FieldRow
          label="The rival's field"
          side={duel.sides[1]}
          flashIds={flashIds}
          forgedIds={forgedIds}
          mirrored
        />

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
          <Swords className="h-4 w-4 text-parchment/40" />
          <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Your field */}
        <FieldRow label="Your field" side={duel.sides[0]} flashIds={flashIds} forgedIds={forgedIds} />

        {/* ── Actions ── */}
        <div className="mt-5">
          {duel.winner !== null ? (
            <p className="text-center font-display text-sm text-parchment/70">
              The duel is decided…
            </p>
          ) : !playerTurn ? (
            <p className="text-center font-display text-sm text-parchment/60">
              The rival ponders the mixture…
            </p>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton
                  color={ACCENT}
                  icon={Swords}
                  label={`Attack (${you.atk}${you.ability === "bonds" ? "+" : ""})`}
                  onClick={() => play({ type: "attack" })}
                />
                <ActionButton
                  color="var(--color-wraith)"
                  icon={Zap}
                  label={
                    youAbility && youAbility.kind === "active"
                      ? `${youAbility.name} (${you.abilityUsesLeft})`
                      : youAbility
                        ? `${youAbility.name} — passive`
                        : "No ability"
                  }
                  disabled={!canAbility}
                  onClick={() => play({ type: "ability" })}
                />
                <ActionButton
                  color="var(--color-emerald-elixir)"
                  icon={ArrowLeftRight}
                  label="Swap"
                  disabled={!moves.some((m) => m.type === "swap")}
                  onClick={() => setPanel(panel === "swap" ? "none" : "swap")}
                />
                <ActionButton
                  color={GOLD}
                  icon={FlaskConical}
                  label={`Forge (${forges.length})`}
                  disabled={forges.length === 0}
                  onClick={() => setPanel(panel === "forge" ? "none" : "forge")}
                />
              </div>
              {youAbility && (
                <p className="mt-2.5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-parchment/55">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span>
                    <span className="text-parchment/80">{youAbility.name}:</span>{" "}
                    {youAbility.effect} {youAbility.chemistry}
                  </span>
                </p>
              )}
              {you.isCompound && (
                <p className="mt-2.5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-parchment/55">
                  <Shield className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span>
                    {you.stable
                      ? "A stable compound — burns and dazzles cannot cling to it."
                      : "An unstable compound — power without protection."}
                  </span>
                </p>
              )}

              {/* Swap panel */}
              {panel === "swap" && (
                <SubPanel title="Send a benched reagent into the circle">
                  {moves
                    .filter((m): m is Extract<Move, { type: "swap" }> => m.type === "swap")
                    .map((m) => {
                      const c = duel.sides[0].cards[m.index];
                      return (
                        <button
                          key={c.id}
                          onClick={() => play(m)}
                          className="rounded-lg px-3 py-1.5 text-xs transition hover:-translate-y-0.5"
                          style={{
                            color: c.color,
                            background: `color-mix(in oklab, ${c.color} 14%, transparent)`,
                            border: `1px solid color-mix(in oklab, ${c.color} 45%, transparent)`,
                          }}
                        >
                          {c.name} · {c.hp}/{c.maxHp} HP
                        </button>
                      );
                    })}
                </SubPanel>
              )}

              {/* Forge panel */}
              {panel === "forge" && (
                <SubPanel title="Fuse two living cards into their real compound (spends the turn)">
                  {forges.map((f) => {
                    const a = duel.sides[0].cards[f.a];
                    const b = duel.sides[0].cards[f.b];
                    return (
                      <button
                        key={f.formula}
                        onClick={() => play({ type: "forge", a: f.a, b: f.b })}
                        className="rounded-lg px-3 py-1.5 text-xs transition hover:-translate-y-0.5"
                        style={{
                          color: GOLD,
                          background: `color-mix(in oklab, ${GOLD} 12%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`,
                        }}
                      >
                        {a.symbol} + {b.symbol} → <Formula f={f.formula} />{" "}
                        <span className="text-parchment/60">
                          ({f.commonName ?? f.name}
                          {f.unstable ? " — unstable!" : ""})
                        </span>
                      </button>
                    );
                  })}
                </SubPanel>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Battle log ── */}
      <div
        className="flex max-h-[520px] flex-col rounded-2xl p-4"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h3 className="mb-2 flex items-center gap-2 font-display text-xs tracking-[0.2em] uppercase text-parchment/60">
          <ScrollText className="h-3.5 w-3.5" style={{ color: GOLD }} /> The duel scroll
        </h3>
        <div ref={logBoxRef} className="min-h-[160px] flex-1 space-y-1.5 overflow-y-auto pr-1">
          {duel.log.map((e, i) => (
            <LogLine key={i} e={e} fresh={i >= duel.log.length - 3} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogLine({ e, fresh }: { e: LogEvent; fresh: boolean }) {
  const color =
    e.kind === "win"
      ? GOLD
      : e.kind === "forge"
        ? GOLD
        : e.kind === "round"
          ? "var(--color-parchment)"
          : e.side === 0
            ? "var(--color-emerald-elixir)"
            : ACCENT;
  return (
    <p
      className={`text-[11px] leading-snug ${fresh ? "duel-log-in" : ""} ${
        e.kind === "round" ? "pt-1 text-center uppercase tracking-[0.2em] opacity-50" : ""
      }`}
      style={{
        color:
          e.kind === "round" ? "var(--color-parchment)" : "color-mix(in oklab, var(--color-parchment) 85%, transparent)",
      }}
    >
      {e.kind !== "round" && (
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
          style={{ background: color }}
        />
      )}
      {e.text}
    </p>
  );
}

function ActionButton({
  color,
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  color: string;
  icon: typeof Swords;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 font-display text-xs tracking-wide transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 13%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
      }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SubPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{
        background: "color-mix(in oklab, var(--color-mist) 40%, transparent)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-parchment/50">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ── Card faces ───────────────────────────────────────────────────────────────
function FieldRow({
  label,
  side,
  flashIds,
  forgedIds,
  mirrored,
}: {
  label: string;
  side: DuelState["sides"][0];
  flashIds: Set<string>;
  forgedIds: Set<string>;
  mirrored?: boolean;
}) {
  const bench = side.cards.filter((_, i) => i !== side.active);
  const active = side.cards[side.active];
  return (
    <div>
      <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.25em] text-parchment/45">{label}</p>
      <div className={`flex flex-wrap items-stretch gap-3 ${mirrored ? "flex-row-reverse justify-end" : ""}`}>
        <CardFace
          card={active}
          big
          hit={flashIds.has(active.id)}
          forged={forgedIds.has(active.id)}
        />
        <div className="flex flex-wrap content-start gap-2">
          {bench.map((c) => (
            <CardFace key={c.id} card={c} hit={flashIds.has(c.id)} forged={forgedIds.has(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardFace({
  card,
  big,
  hit,
  forged,
}: {
  card: Fighter;
  big?: boolean;
  hit?: boolean;
  forged?: boolean;
}) {
  const dead = card.hp <= 0;
  const pct = Math.round((card.hp / card.maxHp) * 100);
  const hpColor =
    pct > 50 ? "var(--color-emerald-elixir)" : pct > 25 ? "var(--color-amber-scry)" : ACCENT;
  const ab = card.ability ? ABILITIES[card.ability] : null;
  return (
    <div
      className={`relative flex flex-col rounded-2xl transition-all duration-200 ${
        big ? "w-40 p-3.5 sm:w-44" : "w-24 p-2"
      } ${hit ? "duel-hit" : ""} ${forged ? "duel-forge" : ""} ${dead ? "opacity-35 grayscale" : ""}`}
      style={{
        background: `radial-gradient(circle at 35% 15%, color-mix(in oklab, ${card.color} ${big ? 26 : 16}%, transparent), color-mix(in oklab, var(--color-slate-sunken) 88%, transparent))`,
        border: `1.5px solid color-mix(in oklab, ${card.color} ${big ? 60 : 40}%, transparent)`,
        boxShadow: big && !dead ? `0 0 30px -14px ${card.color}` : "none",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`font-sans font-semibold leading-none ${big ? "text-3xl" : "text-lg"}`}
          style={{ color: card.color }}
        >
          <Formula f={card.symbol} />
        </span>
        <span className={`${big ? "text-xs" : "text-[9px]"} text-parchment/70`}>
          {card.hp}/{card.maxHp}
        </span>
      </div>
      <p className={`mt-1 leading-tight text-spectral ${big ? "font-display text-sm" : "text-[9px]"}`}>
        {card.name}
      </p>

      {/* HP bar */}
      <div
        className={`${big ? "mt-2" : "mt-1.5"} h-1.5 overflow-hidden rounded-full`}
        style={{ background: "color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: hpColor }}
        />
      </div>

      <div className={`${big ? "mt-2 text-[10px]" : "mt-1 text-[8px]"} flex items-center gap-1.5 text-parchment/70`}>
        <span className="inline-flex items-center gap-0.5">
          <Swords className="h-3 w-3" style={{ color: ACCENT }} /> {card.atk}
        </span>
        {card.speedTier === 2 && (
          <span className="inline-flex items-center gap-0.5">
            <Wind className="h-3 w-3 text-spectral" /> gas
          </span>
        )}
        {card.stable && (
          <span className="inline-flex items-center gap-0.5" style={{ color: GOLD }}>
            <Shield className="h-3 w-3" /> stable
          </span>
        )}
      </div>

      {/* Status chips */}
      {(card.burn > 0 || card.guard || card.dazzled) && (
        <div className={`${big ? "mt-1.5" : "mt-1"} flex flex-wrap gap-1`}>
          {card.burn > 0 && <StatusChip color={ACCENT} label="burning" />}
          {card.guard && <StatusChip color="var(--color-spectral)" label="shielded" />}
          {card.dazzled && <StatusChip color="var(--color-amber-scry)" label="dazzled" />}
        </div>
      )}

      {/* Ability line — the chemistry justification lives ON the card */}
      {big && ab && (
        <p className="mt-2 text-[9px] leading-snug text-parchment/60">
          <span style={{ color: GOLD }}>{ab.name}</span>
          {ab.kind === "passive" ? " (passive)" : ` (${card.abilityUsesLeft} left)`} —{" "}
          {ab.chemistry}
        </p>
      )}
      {big && card.isCompound && (
        <p className="mt-2 text-[9px] leading-snug text-parchment/60">
          <span style={{ color: GOLD }}>Forged compound</span> —{" "}
          {card.stable
            ? "chemically stable: lingering effects cannot cling to it."
            : "unstable: all power, no protection."}
        </p>
      )}
    </div>
  );
}

function StatusChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[7px] uppercase tracking-[0.12em]"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  End screen
// ════════════════════════════════════════════════════════════════════════════
function EndScreen({
  duel,
  difficulty,
  uid,
  onRematch,
  onChangeDifficulty,
}: {
  duel: DuelState;
  difficulty: Difficulty;
  uid: string | null;
  onRematch: () => void;
  onChangeDifficulty: () => void;
}) {
  const won = duel.winner === 0;
  const diff = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const recorded = useRef(false);

  // Record the result exactly once (pays aurum + updates duelRecord/leaderboard).
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    void recordDuel(uid, difficulty, won);
  }, [uid, difficulty, won]);

  const survivors = duel.sides[won ? 0 : 1].cards.filter((c) => c.hp > 0);

  return (
    <div
      className="mx-auto max-w-xl rounded-2xl p-6 text-center"
      style={{
        background: `linear-gradient(150deg, color-mix(in oklab, ${won ? GOLD : ACCENT} 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 88%, transparent))`,
        border: `1px solid color-mix(in oklab, ${won ? GOLD : ACCENT} 45%, transparent)`,
        boxShadow: `0 0 60px -25px ${won ? GOLD : ACCENT}`,
      }}
    >
      {won ? (
        <Trophy className="mx-auto h-10 w-10" style={{ color: GOLD }} />
      ) : (
        <Sparkles className="mx-auto h-10 w-10" style={{ color: ACCENT }} />
      )}
      <h2 className="mt-3 font-display text-2xl text-spectral">
        {won ? "Victory in the circle!" : "The rival prevails"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-parchment/80">
        {won
          ? `${diff.title} concedes after ${duel.round} rounds. ${
              survivors.length
            } of your reagents still stand.`
          : `${diff.title} outlasted you after ${duel.round} rounds — study your rival's surviving reagents and duel again. Every defeat teaches a reaction.`}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 font-display text-sm" style={{ color: GOLD }}>
        <Coins className="h-4 w-4" />
        {won ? `${diff.aurum} aurum added to your purse.` : "No aurum this time — the purse awaits your victory."}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          onClick={onRematch}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm transition hover:-translate-y-0.5 hover:brightness-110"
          style={{
            color: "var(--color-slate-sunken)",
            background: `linear-gradient(135deg, ${GOLD}, color-mix(in oklab, ${GOLD} 70%, ${ACCENT}))`,
          }}
        >
          <RotateCcw className="h-4 w-4" /> Rematch
        </button>
        <button
          onClick={onChangeDifficulty}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm transition hover:-translate-y-0.5"
          style={{
            color: "var(--color-emerald-elixir)",
            background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)",
          }}
        >
          <Swords className="h-4 w-4" /> Change rival
        </button>
      </div>
    </div>
  );
}
