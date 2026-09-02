// Class Duels — correspondence-chess-style async battles between classmates.
// The pure engine (lib/duel.ts) plays exactly as in Duel the Alchemist; the
// Firestore layer (lib/duel-net.ts) carries the authoritative state between
// benches. Duels resolve whenever each alchemist next visits their bench.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Clock,
  Coins,
  FlaskConical,
  Hourglass,
  Info,
  Mail,
  ScrollText,
  Send,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { db } from "../lib/firebase";
import { useUserProfile } from "../lib/profile";
import { cardBySymbol } from "../lib/cards";
import {
  ABILITIES,
  DUEL_STATS,
  MAX_ROUNDS,
  activeOf,
  forgeOptions,
  legalMoves,
  type DuelState,
  type Fighter,
  type LogEvent,
  type Move,
  type SideId,
} from "../lib/duel";
import {
  acceptChallenge,
  createChallenge,
  declineOrDelete,
  opponentOf,
  readSeenLogCount,
  settleDuelReward,
  sideOf,
  submitMove,
  useDuel,
  useMyDuels,
  writeSeenLogCount,
  type DuelDoc,
} from "../lib/duel-net";

export const Route = createFileRoute("/duels")({
  component: () => (
    <RequireRole role="student">
      <ClassDuelsPage />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-crimson)";
const GOLD = "var(--color-gold)";
const EMERALD = "var(--color-emerald-elixir)";
const AMBER = "var(--color-amber-scry)";

/** Aurum the winner takes home — the flat PvP payout tier ("medium"). */
const PVP_AURUM = 20;

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

// ── Narration perspective ────────────────────────────────────────────────────
// The engine narrates from side 0's (the challenger's) point of view: "Your
// Sodium…", "The rival's cauldron…". When I am side 1, flip the pronouns so
// both alchemists read the same scroll from their own bench.
const PERSPECTIVE_SWAPS: [string, string][] = [
  [
    "The rival's cauldron falls silent. Victory is yours, alchemist!",
    "Your last reagent is spent. The rival claims the duel.",
  ],
  ["Yours holds more essence: victory!", "The rival's holds more essence."],
  [
    "is a swifter reagent — you strike first.",
    "is the swifter reagent — the rival strikes first.",
  ],
  ["Your ", "The rival's "],
];

function narrate(text: string, mySide: SideId | -1): string {
  if (mySide !== 1) return text;
  for (const [a, b] of PERSPECTIVE_SWAPS) {
    if (text.includes(a)) return text.split(a).join(b);
    if (text.includes(b)) return text.split(b).join(a);
  }
  return text;
}

/** Freshest non-round narration line of a duel, from my perspective. */
function lastNarration(duel: DuelDoc, mySide: SideId | -1): string {
  for (let i = duel.state.log.length - 1; i >= 0; i--) {
    const e = duel.state.log[i];
    if (e.kind !== "round") return narrate(e.text, mySide);
  }
  return "The circle is drawn; the first move awaits.";
}

function fmtWhen(ts?: Timestamp | null): string {
  if (!ts) return "just now";
  const mins = Math.floor((Date.now() - ts.toMillis()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return ts.toDate().toLocaleDateString();
}

// ── Class roster (classmates readable per Firestore rules) ───────────────────
interface Classmate {
  uid: string;
  displayName: string;
  stars: number;
}

function useClassmates(classId: string | null): { classmates: Classmate[]; loading: boolean } {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!classId) {
      setClassmates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      collection(db, "classes", classId, "roster"),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const name =
            typeof data.displayName === "string" && data.displayName.trim()
              ? data.displayName
              : "Apprentice";
          const stars =
            typeof data.stars === "number" && Number.isFinite(data.stars) ? data.stars : 0;
          return { uid: d.id, displayName: name, stars };
        });
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setClassmates(list);
        setLoading(false);
      },
      (err) => {
        console.error("Class Duels roster subscription failed:", err);
        setLoading(false);
      },
    );
  }, [classId]);
  return { classmates, loading };
}

// ── Local animations (scoped: all class names are cduel-prefixed) ────────────
function CduelStyles() {
  return (
    <style>{`
      @keyframes cduel-hit {
        0% { transform: translateX(0); filter: none; }
        20% { transform: translateX(-5px); filter: brightness(1.6) saturate(1.5); }
        45% { transform: translateX(5px); }
        70% { transform: translateX(-3px); }
        100% { transform: translateX(0); filter: none; }
      }
      .cduel-hit { animation: cduel-hit 0.55s ease-out; }
      @keyframes cduel-forge-flash {
        0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-gold) 70%, transparent); }
        100% { box-shadow: 0 0 0 26px color-mix(in oklab, var(--color-gold) 0%, transparent); }
      }
      .cduel-forge { animation: cduel-forge-flash 0.9s ease-out; }
      @keyframes cduel-log-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .cduel-log-in { animation: cduel-log-in 0.25s ease-out; }
    `}</style>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Page — the duel board, or an opened duel's play view
// ════════════════════════════════════════════════════════════════════════════
function ClassDuelsPage() {
  const { uid, profile, loading: profileLoading } = useUserProfile();
  const classId = profile?.classId ?? null;
  const { duels, loading: duelsLoading } = useMyDuels(uid);
  const { classmates } = useClassmates(classId);
  const [openId, setOpenId] = useState<string | null>(null);

  const myName =
    profile?.displayName?.trim() || profile?.email?.split("@")[0] || "Apprentice";

  // Settle any finished duel exactly once per player (localStorage-guarded).
  useEffect(() => {
    if (!uid) return;
    for (const d of duels) {
      if (d.status === "done") settleDuelReward(uid, d);
    }
  }, [uid, duels]);

  return (
    <StudentShell title="Class Duels">
      <CduelStyles />
      <PageHeader
        eyebrow="The Correspondence Circle"
        title="Class Duels"
        subtitle="Challenge a fellow apprentice to the duelling circle. Moves cross the aether one at a time — duels resolve whenever each alchemist next visits their bench."
        icon={Swords}
        accent={ACCENT}
      />

      {openId ? (
        <PlayView duelId={openId} uid={uid} onBack={() => setOpenId(null)} />
      ) : profileLoading || duelsLoading ? (
        <LoadingRows />
      ) : !classId ? (
        <NoClassState />
      ) : (
        <DuelBoard
          uid={uid}
          myName={myName}
          classId={classId}
          duels={duels}
          classmates={classmates}
          onOpen={setOpenId}
        />
      )}
    </StudentShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  The duel board — challenges in flight, turns owed, history
// ════════════════════════════════════════════════════════════════════════════
function DuelBoard({
  uid,
  myName,
  classId,
  duels,
  classmates,
  onOpen,
}: {
  uid: string | null;
  myName: string;
  classId: string;
  duels: DuelDoc[];
  classmates: Classmate[];
  onOpen: (id: string) => void;
}) {
  const incoming = duels.filter((d) => d.status === "pending" && sideOf(d, uid) === 1);
  const outgoing = duels.filter((d) => d.status === "pending" && sideOf(d, uid) === 0);
  const yourTurn = duels.filter(
    (d) => d.status === "active" && d.state.winner === null && d.state.turn === sideOf(d, uid),
  );
  const theirTurn = duels.filter(
    (d) => d.status === "active" && d.state.winner === null && d.state.turn !== sideOf(d, uid),
  );
  const finished = duels.filter((d) => d.status === "done");
  const rivals = classmates.filter((c) => c.uid !== uid);

  return (
    <div>
      {duels.length === 0 && (
        <div
          className="mb-8 rounded-2xl px-5 py-8 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
            border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
          }}
        >
          <Swords className="mx-auto mb-3 h-8 w-8 opacity-40" style={{ color: ACCENT }} />
          <p className="font-display text-spectral">No duels on your bench yet.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-parchment/70">
            Send the first challenge below. Each of you plays one move whenever you next visit —
            no need to be online together.
          </p>
        </div>
      )}

      {incoming.length > 0 && (
        <section className="mb-8">
          <SectionHeading icon={Mail} color={GOLD} label="Challenges awaiting your answer" />
          <div className="flex flex-col gap-2.5">
            {incoming.map((d) => (
              <DuelRow key={d.id} duel={d} uid={uid} accent={GOLD} onOpen={onOpen}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void acceptChallenge(d.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-display transition hover:-translate-y-0.5"
                  style={{
                    color: EMERALD,
                    background: `color-mix(in oklab, ${EMERALD} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${EMERALD} 45%, transparent)`,
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void declineOrDelete(d.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-display transition hover:-translate-y-0.5"
                  style={{
                    color: ACCENT,
                    background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${ACCENT} 40%, transparent)`,
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </DuelRow>
            ))}
          </div>
        </section>
      )}

      {yourTurn.length > 0 && (
        <section className="mb-8">
          <SectionHeading icon={Swords} color={ACCENT} label="Your move" />
          <div className="flex flex-col gap-2.5">
            {yourTurn.map((d) => (
              <DuelRow key={d.id} duel={d} uid={uid} accent={ACCENT} onOpen={onOpen} yourMove />
            ))}
          </div>
        </section>
      )}

      {(theirTurn.length > 0 || outgoing.length > 0) && (
        <section className="mb-8">
          <SectionHeading icon={Hourglass} color={AMBER} label="Awaiting your rival" />
          <div className="flex flex-col gap-2.5">
            {theirTurn.map((d) => (
              <DuelRow key={d.id} duel={d} uid={uid} accent={AMBER} onOpen={onOpen} />
            ))}
            {outgoing.map((d) => (
              <DuelRow key={d.id} duel={d} uid={uid} accent={AMBER} onOpen={onOpen} pendingSent>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void declineOrDelete(d.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-display transition hover:-translate-y-0.5"
                  style={{
                    color: "var(--color-parchment)",
                    background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Withdraw
                </button>
              </DuelRow>
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mb-8">
          <SectionHeading icon={Trophy} color={GOLD} label="Concluded duels" />
          <div className="flex flex-col gap-2.5">
            {finished.map((d) => (
              <DuelRow key={d.id} duel={d} uid={uid} accent={GOLD} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}

      <ChallengeBench uid={uid} myName={myName} classId={classId} rivals={rivals} onSent={onOpen} />
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  color,
  label,
}: {
  icon: typeof Swords;
  color: string;
  label: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
      <Icon className="h-4 w-4" style={{ color }} /> {label}
    </h2>
  );
}

// ── One duel on the board ────────────────────────────────────────────────────
function DuelRow({
  duel,
  uid,
  accent,
  onOpen,
  yourMove,
  pendingSent,
  children,
}: {
  duel: DuelDoc;
  uid: string | null;
  accent: string;
  onOpen: (id: string) => void;
  yourMove?: boolean;
  pendingSent?: boolean;
  children?: React.ReactNode;
}) {
  const mySide = sideOf(duel, uid);
  const opp = opponentOf(duel, uid);
  const won = duel.status === "done" && duel.winnerUid === uid;
  const statusChip =
    duel.status === "done"
      ? { label: won ? "victory" : "defeat", color: won ? GOLD : ACCENT }
      : duel.status === "pending"
        ? { label: pendingSent ? "challenge sent" : "challenge", color: AMBER }
        : yourMove
          ? { label: "your move", color: ACCENT }
          : { label: "their move", color: AMBER };

  return (
    <button
      onClick={() => onOpen(duel.id)}
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3.5 py-3 text-left transition hover:-translate-y-0.5 sm:px-4"
      style={{
        background: `linear-gradient(120deg, color-mix(in oklab, ${accent} 8%, transparent), color-mix(in oklab, var(--color-slate-sunken) 78%, transparent))`,
        border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
      }}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          color: accent,
          background: `color-mix(in oklab, ${accent} 14%, transparent)`,
          border: `1px solid color-mix(in oklab, ${accent} 40%, transparent)`,
        }}
      >
        {duel.status === "done" ? (
          <Trophy className="h-4 w-4" />
        ) : duel.status === "pending" ? (
          <Mail className="h-4 w-4" />
        ) : (
          <Swords className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-display text-sm text-spectral">vs {opp.name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[8px] tracking-[0.18em] uppercase"
            style={{
              color: statusChip.color,
              background: `color-mix(in oklab, ${statusChip.color} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${statusChip.color} 40%, transparent)`,
            }}
          >
            {statusChip.label}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-parchment/60">
          {lastNarration(duel, mySide)}
        </span>
      </span>

      <span className="flex flex-shrink-0 items-center gap-3 text-[10px] text-parchment/55">
        <span className="inline-flex items-center gap-1">
          <ScrollText className="h-3 w-3" /> Round {duel.state.round}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {fmtWhen(duel.updatedAt ?? duel.createdAt)}
        </span>
      </span>

      {children && <span className="flex flex-shrink-0 items-center gap-2">{children}</span>}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Challenge flow — pick a classmate, optionally draft a hand, send
// ════════════════════════════════════════════════════════════════════════════
function ChallengeBench({
  uid,
  myName,
  classId,
  rivals,
  onSent,
}: {
  uid: string | null;
  myName: string;
  classId: string;
  rivals: Classmate[];
  onSent: (duelId: string) => void;
}) {
  const [opponentUid, setOpponentUid] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const opponent = rivals.find((r) => r.uid === opponentUid) ?? null;

  const toggleDraft = (symbol: string) => {
    if (draft.includes(symbol)) setDraft(draft.filter((s) => s !== symbol));
    else if (draft.length < 4) setDraft([...draft, symbol]);
  };

  const send = async () => {
    if (!uid || !opponent || sending) return;
    if (draft.length !== 0 && draft.length !== 4) return;
    setSending(true);
    try {
      const id = await createChallenge(
        uid,
        myName,
        opponent.uid,
        opponent.displayName,
        classId,
        draft.length === 4 ? draft : undefined,
      );
      setOpponentUid(null);
      setDraft([]);
      onSent(id);
    } catch (err) {
      console.error("createChallenge failed:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mb-4">
      <SectionHeading icon={Send} color={EMERALD} label="Send a challenge" />
      {rivals.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-8 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
            border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
          }}
        >
          <Users className="mx-auto mb-3 h-8 w-8 opacity-40" style={{ color: EMERALD }} />
          <p className="font-display text-spectral">No fellow apprentices on the roster yet.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-parchment/70">
            You are the first of your class to reach the circle. Once classmates join and earn
            their first records, their names will appear here to be challenged.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-parchment/50">
            1 · Choose your rival
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {rivals.map((r) => {
              const picked = r.uid === opponentUid;
              return (
                <button
                  key={r.uid}
                  onClick={() => setOpponentUid(picked ? null : r.uid)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition hover:-translate-y-0.5"
                  style={
                    picked
                      ? {
                          color: EMERALD,
                          background: `color-mix(in oklab, ${EMERALD} 16%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${EMERALD} 50%, transparent)`,
                          boxShadow: `0 0 18px -8px ${EMERALD}`,
                        }
                      : {
                          color: "var(--color-parchment)",
                          background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  {r.displayName}
                  <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: GOLD }}>
                    <Star className="h-3 w-3" /> {r.stars}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-parchment/50">
            2 · Draft your hand (optional)
          </p>
          <p className="mb-2 text-xs text-parchment/60">
            Pick exactly 4 of the 12 element cards — or pick none and let fate deal for you. Your
            rival draws from what remains: one card set, no duplicates on the table.
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {Object.keys(DUEL_STATS).map((symbol) => {
              const c = cardBySymbol(symbol);
              const s = DUEL_STATS[symbol];
              const color = c?.color ?? GOLD;
              const picked = draft.includes(symbol);
              return (
                <button
                  key={symbol}
                  onClick={() => toggleDraft(symbol)}
                  className="flex flex-col items-center rounded-xl px-3 py-2 transition-all duration-150 hover:-translate-y-0.5"
                  style={
                    picked
                      ? {
                          background: `color-mix(in oklab, ${color} 22%, transparent)`,
                          border: `1.5px solid color-mix(in oklab, ${color} 60%, transparent)`,
                          boxShadow: `0 0 18px -8px ${color}`,
                        }
                      : {
                          background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  <span className="font-sans text-lg font-semibold" style={{ color }}>
                    {symbol}
                  </span>
                  <span className="text-[9px] text-parchment/70">
                    {s.hp} HP · {s.atk} ATK
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mb-4 text-xs text-parchment/55">
            {draft.length === 0
              ? "Fate will deal your four."
              : draft.length === 4
                ? `Your hand is drafted: ${draft.join(", ")}.`
                : `${draft.length} of 4 chosen — pick ${4 - draft.length} more or clear the bench.`}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void send()}
              disabled={!opponent || sending || (draft.length !== 0 && draft.length !== 4)}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm tracking-wide transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                color: "var(--color-slate-sunken)",
                background: `linear-gradient(135deg, ${EMERALD}, color-mix(in oklab, ${EMERALD} 70%, ${GOLD}))`,
              }}
            >
              <Send className="h-4 w-4" />
              {sending
                ? "Sending across the aether…"
                : opponent
                  ? `Challenge ${opponent.displayName}`
                  : "Choose a rival first"}
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-parchment/55">
              <Coins className="h-3.5 w-3.5" style={{ color: GOLD }} /> Winner takes {PVP_AURUM}{" "}
              aurum.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Play view — the opened duel, in the same visual language as /duel
// ════════════════════════════════════════════════════════════════════════════
function PlayView({
  duelId,
  uid,
  onBack,
}: {
  duelId: string;
  uid: string | null;
  onBack: () => void;
}) {
  const { duel, loading } = useDuel(duelId);

  // Bookmark where the scroll stood when this bench was last visited, so the
  // lines written since then get a subtle highlight. Read once per opened duel.
  const seenRef = useRef<number | null>(null);
  if (duel && seenRef.current === null) seenRef.current = readSeenLogCount(duelId);
  const logLen = duel?.state.log.length ?? 0;
  useEffect(() => {
    if (duel) writeSeenLogCount(duelId, logLen);
  }, [duel, duelId, logLen]);

  // Settle the pot once the duel concludes (localStorage-guarded, my side only).
  useEffect(() => {
    if (uid && duel && duel.status === "done") settleDuelReward(uid, duel);
  }, [uid, duel]);

  if (loading) return <LoadingRows />;
  if (!duel || sideOf(duel, uid) === -1) {
    return (
      <div
        className="mx-auto max-w-lg rounded-2xl px-6 py-10 text-center"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
        }}
      >
        <Sparkles className="mx-auto mb-4 h-10 w-10 opacity-40" style={{ color: ACCENT }} />
        <p className="font-display text-lg text-spectral">This duel has dissolved.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-parchment/75">
          The challenge was withdrawn or declined — its circle is no longer drawn.
        </p>
        <BackButton onBack={onBack} className="mt-5" />
      </div>
    );
  }
  return <DuelTable duel={duel} uid={uid} seenCount={seenRef.current ?? 0} onBack={onBack} />;
}

function DuelTable({
  duel,
  uid,
  seenCount,
  onBack,
}: {
  duel: DuelDoc;
  uid: string | null;
  seenCount: number;
  onBack: () => void;
}) {
  const mySide = sideOf(duel, uid) as SideId;
  const oppSide: SideId = mySide === 0 ? 1 : 0;
  const opp = opponentOf(duel, uid);
  const st = duel.state;

  const [panel, setPanel] = useState<"none" | "swap" | "forge">("none");
  const [busy, setBusy] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [forgedIds, setForgedIds] = useState<Set<string>>(new Set());
  const prevLogLen = useRef(st.log.length);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const myTurn = duel.status === "active" && st.winner === null && st.turn === mySide;
  const moves = useMemo(() => legalMoves(st, mySide), [st, mySide]);
  const forges = useMemo(() => forgeOptions(st, mySide), [st, mySide]);
  const me = activeOf(st, mySide);
  const rival = activeOf(st, oppSide);
  const canAbility = myTurn && moves.some((m) => m.type === "ability");
  const myAbility = me.ability ? ABILITIES[me.ability] : null;

  // Animate newly appended log events (hit flashes, forge glow) — new entries
  // arrive via the Firestore snapshot whether I moved or my rival did.
  useEffect(() => {
    const fresh = st.log.slice(prevLogLen.current);
    prevLogLen.current = st.log.length;
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
  }, [st.log]);

  // Keep the scroll pinned to the freshest line.
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [st.log.length]);

  const play = async (move: Move) => {
    if (!myTurn || busy) return;
    setPanel("none");
    setBusy(true);
    await submitMove(duel.id, duel, move);
    setBusy(false);
  };

  const won = duel.winnerUid === uid;

  return (
    <div>
      {/* ── Table header: back, opponent, round ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BackButton onBack={onBack} />
        <span className="font-display text-sm text-spectral">
          vs <span style={{ color: GOLD }}>{opp.name}</span>
        </span>
        <span
          className="ml-auto rounded-xl px-3 py-1.5 text-center font-display text-sm"
          style={{
            color: GOLD,
            background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
            border: `1px solid color-mix(in oklab, ${GOLD} 35%, transparent)`,
          }}
        >
          Round {st.round}
          <span className="text-parchment/50"> / {MAX_ROUNDS}</span>
        </span>
      </div>

      {/* ── Status banners ── */}
      {duel.status === "pending" && (
        <PendingBanner duel={duel} mySide={mySide} oppName={opp.name} onBack={onBack} />
      )}
      {duel.status === "done" && (
        <div
          className="mb-4 rounded-2xl p-4 text-center"
          style={{
            background: `linear-gradient(150deg, color-mix(in oklab, ${won ? GOLD : ACCENT} 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 88%, transparent))`,
            border: `1px solid color-mix(in oklab, ${won ? GOLD : ACCENT} 45%, transparent)`,
          }}
        >
          {won ? (
            <Trophy className="mx-auto h-8 w-8" style={{ color: GOLD }} />
          ) : (
            <Sparkles className="mx-auto h-8 w-8" style={{ color: ACCENT }} />
          )}
          <h2 className="mt-2 font-display text-xl text-spectral">
            {won ? "Victory in the circle!" : `${opp.name} prevails`}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-parchment/80">
            {won
              ? `${opp.name} concedes after ${st.round} rounds.`
              : `${opp.name} outlasted you after ${st.round} rounds — study the scroll below. Every defeat teaches a reaction.`}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 font-display text-sm" style={{ color: GOLD }}>
            <Coins className="h-4 w-4" />
            {won
              ? `${PVP_AURUM} aurum added to your purse.`
              : "No aurum this time — challenge them to a rematch."}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── The circle ── */}
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <FieldRow
            label={`${opp.name}'s field`}
            side={st.sides[oppSide]}
            flashIds={flashIds}
            forgedIds={forgedIds}
            mirrored
          />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
            <Swords className="h-4 w-4 text-parchment/40" />
            <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
          </div>

          <FieldRow
            label="Your field"
            side={st.sides[mySide]}
            flashIds={flashIds}
            forgedIds={forgedIds}
          />

          {/* ── Actions / waiting state ── */}
          <div className="mt-5">
            {duel.status === "done" ? (
              <p className="text-center font-display text-sm text-parchment/70">
                The duel is decided — the scroll keeps its record.
              </p>
            ) : duel.status === "pending" ? (
              <p className="text-center font-display text-sm text-parchment/60">
                {mySide === 0
                  ? `Awaiting ${opp.name}'s acceptance — the circle is drawn but not yet sealed.`
                  : "Accept the challenge above to seal the circle."}
              </p>
            ) : !myTurn ? (
              <p className="inline-flex w-full items-center justify-center gap-2 text-center font-display text-sm text-parchment/60">
                <Hourglass className="h-4 w-4" style={{ color: AMBER }} />
                Waiting for {opp.name} — check back later. Duels resolve whenever each alchemist
                next visits their bench.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  <ActionButton
                    color={ACCENT}
                    icon={Swords}
                    label={`Attack (${me.atk}${me.ability === "bonds" ? "+" : ""})`}
                    disabled={busy}
                    onClick={() => void play({ type: "attack" })}
                  />
                  <ActionButton
                    color="var(--color-wraith)"
                    icon={Zap}
                    label={
                      myAbility && myAbility.kind === "active"
                        ? `${myAbility.name} (${me.abilityUsesLeft})`
                        : myAbility
                          ? `${myAbility.name} — passive`
                          : "No ability"
                    }
                    disabled={!canAbility || busy}
                    onClick={() => void play({ type: "ability" })}
                  />
                  <ActionButton
                    color={EMERALD}
                    icon={ArrowLeftRight}
                    label="Swap"
                    disabled={busy || !moves.some((m) => m.type === "swap")}
                    onClick={() => setPanel(panel === "swap" ? "none" : "swap")}
                  />
                  <ActionButton
                    color={GOLD}
                    icon={FlaskConical}
                    label={`Forge (${forges.length})`}
                    disabled={busy || forges.length === 0}
                    onClick={() => setPanel(panel === "forge" ? "none" : "forge")}
                  />
                </div>
                {myAbility && (
                  <p className="mt-2.5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-parchment/55">
                    <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>
                      <span className="text-parchment/80">{myAbility.name}:</span>{" "}
                      {myAbility.effect} {myAbility.chemistry}
                    </span>
                  </p>
                )}
                {me.isCompound && (
                  <p className="mt-2.5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-parchment/55">
                    <Shield className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>
                      {me.stable
                        ? "A stable compound — burns and dazzles cannot cling to it."
                        : "An unstable compound — power without protection."}
                    </span>
                  </p>
                )}

                {panel === "swap" && (
                  <SubPanel title="Send a benched reagent into the circle">
                    {moves
                      .filter((m): m is Extract<Move, { type: "swap" }> => m.type === "swap")
                      .map((m) => {
                        const c = st.sides[mySide].cards[m.index];
                        return (
                          <button
                            key={c.id}
                            onClick={() => void play(m)}
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

                {panel === "forge" && (
                  <SubPanel title="Fuse two living cards into their real compound (spends the turn)">
                    {forges.map((f) => {
                      const a = st.sides[mySide].cards[f.a];
                      const b = st.sides[mySide].cards[f.b];
                      return (
                        <button
                          key={f.formula}
                          onClick={() => void play({ type: "forge", a: f.a, b: f.b })}
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

        {/* ── The duel scroll ── */}
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
            {st.log.map((e, i) => (
              <LogLine
                key={i}
                e={e}
                mySide={mySide}
                fresh={i >= st.log.length - 3}
                unseen={i >= seenCount}
              />
            ))}
          </div>
          {seenCount > 0 && seenCount < st.log.length && (
            <p className="mt-2 text-[10px] text-parchment/45">
              Lines with a golden tint were written since your last visit.
            </p>
          )}
        </div>
      </div>

      {/* quiet reminder of who holds the circle right now */}
      {duel.status === "active" && st.winner === null && (
        <p className="mt-4 flex items-start gap-2 px-1 text-[11px] leading-relaxed text-parchment/50">
          <Hourglass className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            {myTurn
              ? "The circle awaits your move. Take your time — correspondence duels never expire."
              : `${opp.name} holds the circle. Their move will appear here the moment it is made — or on your next visit.`}
          </span>
        </p>
      )}
    </div>
  );
}

function PendingBanner({
  duel,
  mySide,
  oppName,
  onBack,
}: {
  duel: DuelDoc;
  mySide: SideId;
  oppName: string;
  onBack: () => void;
}) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-4"
      style={{
        background: `linear-gradient(120deg, color-mix(in oklab, ${AMBER} 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))`,
        border: `1px solid color-mix(in oklab, ${AMBER} 35%, transparent)`,
      }}
    >
      <Mail className="h-5 w-5 flex-shrink-0" style={{ color: AMBER }} />
      {mySide === 1 ? (
        <>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-parchment/80">
            <span className="font-display text-spectral">{oppName}</span> has challenged you to
            the circle. Accept to seal the duel — or decline and let the aether reclaim it.
          </p>
          <span className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => void acceptChallenge(duel.id)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-display transition hover:-translate-y-0.5"
              style={{
                color: EMERALD,
                background: `color-mix(in oklab, ${EMERALD} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${EMERALD} 45%, transparent)`,
              }}
            >
              <Check className="h-3.5 w-3.5" /> Accept the duel
            </button>
            <button
              onClick={() => {
                void declineOrDelete(duel.id);
                onBack();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-display transition hover:-translate-y-0.5"
              style={{
                color: ACCENT,
                background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${ACCENT} 40%, transparent)`,
              }}
            >
              <X className="h-3.5 w-3.5" /> Decline
            </button>
          </span>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-parchment/80">
            Your challenge is winging its way to{" "}
            <span className="font-display text-spectral">{oppName}</span>. The duel begins once
            they accept — check back later.
          </p>
          <button
            onClick={() => {
              void declineOrDelete(duel.id);
              onBack();
            }}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-display transition hover:-translate-y-0.5"
            style={{
              color: "var(--color-parchment)",
              background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <X className="h-3.5 w-3.5" /> Withdraw
          </button>
        </>
      )}
    </div>
  );
}

function BackButton({ onBack, className }: { onBack: () => void; className?: string }) {
  return (
    <button
      onClick={onBack}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wide transition hover:-translate-y-0.5 ${className ?? ""}`}
      style={{
        color: "var(--color-parchment)",
        background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
        border: "1px solid var(--color-border)",
      }}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> All duels
    </button>
  );
}

// ── Log lines (perspective-flipped; unseen lines get a golden tint) ──────────
function LogLine({
  e,
  mySide,
  fresh,
  unseen,
}: {
  e: LogEvent;
  mySide: SideId;
  fresh: boolean;
  unseen: boolean;
}) {
  const dotColor =
    e.kind === "win" || e.kind === "forge"
      ? GOLD
      : e.kind === "round"
        ? "var(--color-parchment)"
        : e.side === mySide
          ? EMERALD
          : ACCENT;
  return (
    <p
      className={`rounded-md text-[11px] leading-snug ${fresh ? "cduel-log-in" : ""} ${
        e.kind === "round" ? "pt-1 text-center uppercase tracking-[0.2em] opacity-50" : ""
      }`}
      style={{
        color: "color-mix(in oklab, var(--color-parchment) 85%, transparent)",
        ...(unseen && e.kind !== "round"
          ? {
              background: `color-mix(in oklab, ${GOLD} 8%, transparent)`,
              boxShadow: `inset 2px 0 0 color-mix(in oklab, ${GOLD} 55%, transparent)`,
              paddingLeft: "6px",
            }
          : {}),
      }}
    >
      {e.kind !== "round" && (
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
          style={{ background: dotColor }}
        />
      )}
      {narrate(e.text, mySide)}
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

// ── Card faces (mirrors the /duel visual language) ───────────────────────────
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
  const hpColor = pct > 50 ? EMERALD : pct > 25 ? AMBER : ACCENT;
  const ab = card.ability ? ABILITIES[card.ability] : null;
  return (
    <div
      className={`relative flex flex-col rounded-2xl transition-all duration-200 ${
        big ? "w-40 p-3.5 sm:w-44" : "w-24 p-2"
      } ${hit ? "cduel-hit" : ""} ${forged ? "cduel-forge" : ""} ${dead ? "opacity-35 grayscale" : ""}`}
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
          {card.dazzled && <StatusChip color={AMBER} label="dazzled" />}
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

// ── Empty & loading states ───────────────────────────────────────────────────
function NoClassState() {
  return (
    <div
      className="mx-auto max-w-lg rounded-2xl px-6 py-10 text-center"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
        border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
      }}
    >
      <Users className="mx-auto mb-4 h-10 w-10 opacity-40" style={{ color: ACCENT }} />
      <p className="font-display text-lg text-spectral">The circle needs a class around it.</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-parchment/75">
        Class Duels are fought between classmates. Ask your teacher for a class code, then enter
        it in the join banner on your Home page — your rivals will appear here.
      </p>
      <Link
        to="/app"
        className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm tracking-wide transition hover:-translate-y-0.5 hover:brightness-110"
        style={{
          color: GOLD,
          background: `color-mix(in oklab, ${GOLD} 14%, transparent)`,
          border: `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`,
        }}
      >
        <Swords className="h-4 w-4" /> Go to Home and join a class
      </Link>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading Class Duels">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[64px] animate-pulse rounded-2xl"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 50%, transparent)",
            border: "1px solid var(--color-border)",
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}
