import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import {
  Crown,
  FlaskConical,
  Flame,
  Hourglass,
  Medal,
  ScrollText,
  Star,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { db } from "../lib/firebase";
import { useUserProfile } from "../lib/profile";

export const Route = createFileRoute("/leaderboard")({
  component: () => (
    <RequireRole role="student">
      <HallOfRecords />
    </RequireRole>
  ),
});

const GOLD = "var(--color-gold)";
// Silver & bronze have no CSS tokens — kept local to the Hall's medal styling.
const SILVER = "#b9c2ce";
const BRONZE = "#cd8f56";
const MEDAL_COLORS = [GOLD, SILVER, BRONZE];

// ════════════════════════════════════════════════════════════════════════════
//  Data — one denormalized roster entry per classmate. Older entries were
//  written at join time and may lack every stat field: read defensively.
// ════════════════════════════════════════════════════════════════════════════
interface RosterStats {
  uid: string;
  displayName: string;
  stars: number;
  aurum: number;
  duelWins: number;
  compounds: number;
  streak: number;
  statsAt?: Timestamp;
}

function toStats(id: string, data: Record<string, unknown>): RosterStats {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return {
    uid: id,
    displayName:
      str(data.displayName) ??
      str(data.name) ??
      str(data.email)?.split("@")[0] ??
      "Apprentice",
    stars: num(data.stars),
    aurum: num(data.aurum),
    duelWins: num(data.duelWins),
    compounds: num(data.compounds),
    streak: num(data.streak),
    statsAt: data.statsAt as Timestamp | undefined,
  };
}

/** Live subscription to the class roster. */
function useClassRoster(classId: string | null) {
  const [roster, setRoster] = useState<RosterStats[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!classId) {
      setRoster([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      collection(db, "classes", classId, "roster"),
      (snap) => {
        setRoster(snap.docs.map((d) => toStats(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.error("Hall of Records roster subscription failed:", err);
        setLoading(false);
      },
    );
  }, [classId]);
  return { roster, loading };
}

// ════════════════════════════════════════════════════════════════════════════
//  The four boards
// ════════════════════════════════════════════════════════════════════════════
type BoardId = "stars" | "duelWins" | "compounds" | "streak";

interface Board {
  id: BoardId;
  label: string;
  /** Themed unit shown next to each value. */
  unit: string;
  /** One-line "how ranks are earned" note. */
  how: string;
  accent: string;
  Icon: typeof Star;
  value: (r: RosterStats) => number;
}

const BOARDS: Board[] = [
  {
    id: "stars",
    label: "Trial Stars",
    unit: "★",
    how: "Every module Trial awards up to three stars for a best run — the board counts every star you hold.",
    accent: "var(--color-gold)",
    Icon: Star,
    value: (r) => r.stars,
  },
  {
    id: "duelWins",
    label: "Duel Wins",
    unit: "victories",
    how: "Each duel won against the Alchemist adds a victory to your record, on any difficulty.",
    accent: "var(--color-crimson)",
    Icon: Swords,
    value: (r) => r.duelWins,
  },
  {
    id: "compounds",
    label: "Compounds Discovered",
    unit: "compounds",
    how: "Every true compound forged on the Codex bench or in an Alche-mix ceremony is inscribed here.",
    accent: "var(--color-emerald-elixir)",
    Icon: FlaskConical,
    value: (r) => r.compounds,
  },
  {
    id: "streak",
    label: "Starter Streak",
    unit: "days",
    how: "Complete your Starters for Ten every day — the streak counts consecutive days of the ritual.",
    accent: "var(--color-amber-scry)",
    Icon: Flame,
    value: (r) => r.streak,
  },
];

/** Competition ranking (1, 1, 3 …) — ties share a rank. */
interface RankedRow {
  entry: RosterStats;
  value: number;
  rank: number;
}

function rankBoard(roster: RosterStats[], board: Board): { ranked: RankedRow[]; unranked: RosterStats[] } {
  const scored = roster
    .map((entry) => ({ entry, value: board.value(entry) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.entry.displayName.localeCompare(b.entry.displayName));
  const ranked: RankedRow[] = scored.map((r, i) => ({
    ...r,
    rank: i > 0 && scored[i - 1].value === r.value ? 0 : i + 1, // 0 = placeholder, fixed below
  }));
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].rank === 0) ranked[i].rank = ranked[i - 1].rank;
  }
  const unranked = roster
    .filter((e) => board.value(e) <= 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ranked, unranked };
}

// ════════════════════════════════════════════════════════════════════════════
//  The page
// ════════════════════════════════════════════════════════════════════════════
function HallOfRecords() {
  const { uid, profile, loading: profileLoading } = useUserProfile();
  const classId = profile?.classId ?? null;
  const { roster, loading: rosterLoading } = useClassRoster(classId);
  const [boardId, setBoardId] = useState<BoardId>("stars");

  const board = BOARDS.find((b) => b.id === boardId) ?? BOARDS[0];
  const { ranked, unranked } = useMemo(() => rankBoard(roster, board), [roster, board]);

  return (
    <StudentShell title="Hall of Records">
      <PageHeader
        eyebrow="The Guild's Ledger of Renown"
        title="The Hall of Records"
        subtitle="Where the deeds of every apprentice in your class are inscribed. Four ledgers, four ways to earn your place among the honoured."
        icon={Trophy}
        accent={GOLD}
      />

      {profileLoading || (classId && rosterLoading) ? (
        <LoadingState />
      ) : !classId ? (
        <NoClassState />
      ) : (
        <>
          {/* ── Class header card + how-ranks-are-earned ── */}
          <div
            className="mb-6 rounded-2xl p-4 sm:p-5"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${board.accent} 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))`,
              border: `1px solid color-mix(in oklab, ${board.accent} 30%, transparent)`,
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" style={{ color: board.accent }} />
              <span className="font-display text-spectral">
                {profile?.className ?? "Your class"}
              </span>
              <span className="text-xs text-parchment/55">
                · {roster.length} apprentice{roster.length === 1 ? "" : "s"} on the roster
              </span>
            </div>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-parchment/80">
              <ScrollText
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                style={{ color: board.accent }}
              />
              <span>
                <span className="font-display text-spectral">{board.label}:</span> {board.how}
              </span>
            </p>
          </div>

          {/* ── Board pills ── */}
          <div className="mb-6 flex flex-wrap gap-2">
            {BOARDS.map((b) => {
              const active = b.id === boardId;
              return (
                <button
                  key={b.id}
                  onClick={() => setBoardId(b.id)}
                  aria-pressed={active}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-display tracking-wide transition-all duration-150 hover:-translate-y-0.5"
                  style={
                    active
                      ? {
                          color: b.accent,
                          background: `color-mix(in oklab, ${b.accent} 16%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${b.accent} 50%, transparent)`,
                          boxShadow: `0 0 18px -8px ${b.accent}`,
                        }
                      : {
                          color: "var(--color-parchment)",
                          background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  <b.Icon className="h-3.5 w-3.5" style={active ? { color: b.accent } : undefined} />
                  {b.label}
                </button>
              );
            })}
          </div>

          {/* ── The ledger ── */}
          {ranked.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
                border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
              }}
            >
              <board.Icon className="mx-auto mb-3 h-8 w-8 opacity-40" style={{ color: board.accent }} />
              <p className="font-display text-spectral">This ledger awaits its first entry.</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-parchment/70">
                No apprentice in {profile?.className ?? "your class"} has a recorded{" "}
                {board.label.toLowerCase()} tally yet. {board.how}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ranked.map((row) => (
                <RankRow
                  key={row.entry.uid}
                  row={row}
                  board={board}
                  isYou={row.entry.uid === uid}
                />
              ))}
            </div>
          )}

          {/* ── Yet to be recorded ── */}
          {unranked.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-xs tracking-[0.2em] uppercase text-parchment/55">
                <Hourglass className="h-3.5 w-3.5" /> Yet to be recorded
              </h2>
              <div className="flex flex-wrap gap-2">
                {unranked.map((e) => {
                  const isYou = e.uid === uid;
                  return (
                    <span
                      key={e.uid}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-parchment/70"
                      style={{
                        background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
                        border: isYou
                          ? `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`
                          : "1px dashed color-mix(in oklab, var(--color-parchment) 25%, transparent)",
                      }}
                    >
                      {e.displayName}
                      {isYou && (
                        <span
                          className="rounded-full px-1.5 py-px text-[8px] tracking-[0.15em] uppercase"
                          style={{
                            color: GOLD,
                            background: `color-mix(in oklab, ${GOLD} 15%, transparent)`,
                          }}
                        >
                          you
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-parchment/50">
                These apprentices have no {board.label.toLowerCase()} inscribed yet — their first
                deed will earn them a place on the ledger.
              </p>
            </div>
          )}

          {/* ── Honest freshness note ── */}
          <p className="mt-8 flex items-start gap-2 px-1 text-[11px] leading-relaxed text-parchment/50">
            <Hourglass className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>
              Records update when an apprentice completes a trial or duel — a classmate's very
              latest deeds may not appear until their next one is finished.
            </span>
          </p>
        </>
      )}
    </StudentShell>
  );
}

// ── A ranked ledger row ──────────────────────────────────────────────────────
function RankRow({ row, board, isYou }: { row: RankedRow; board: Board; isYou: boolean }) {
  const medal = row.rank >= 1 && row.rank <= 3 ? MEDAL_COLORS[row.rank - 1] : null;
  const MedalIcon = row.rank === 1 ? Crown : Medal;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 sm:px-4"
      style={
        medal
          ? {
              background: `linear-gradient(120deg, color-mix(in oklab, ${medal} 13%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))`,
              border: `1px solid color-mix(in oklab, ${medal} 45%, transparent)`,
              boxShadow: `0 0 30px -14px ${medal}`,
            }
          : {
              background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
              border: isYou
                ? `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`
                : "1px solid var(--color-border)",
              ...(isYou ? { boxShadow: `0 0 22px -14px ${GOLD}` } : {}),
            }
      }
    >
      {/* Rank */}
      <span
        className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-xl"
        style={
          medal
            ? {
                color: medal,
                background: `color-mix(in oklab, ${medal} 16%, transparent)`,
                border: `1px solid color-mix(in oklab, ${medal} 45%, transparent)`,
              }
            : {
                color: "var(--color-parchment)",
                background: "color-mix(in oklab, var(--color-mist) 40%, transparent)",
                border: "1px solid var(--color-border)",
              }
        }
      >
        {medal ? (
          <MedalIcon className="h-4 w-4" />
        ) : (
          <span className="font-display text-sm">{row.rank}</span>
        )}
      </span>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-display text-sm text-spectral">
            {row.entry.displayName}
          </span>
          {isYou && (
            <span
              className="rounded-full px-2 py-0.5 text-[8px] tracking-[0.18em] uppercase"
              style={{
                color: GOLD,
                background: `color-mix(in oklab, ${GOLD} 15%, transparent)`,
                border: `1px solid color-mix(in oklab, ${GOLD} 40%, transparent)`,
              }}
            >
              you
            </span>
          )}
        </p>
        {medal && (
          <p className="text-[9px] tracking-[0.18em] uppercase" style={{ color: medal }}>
            {row.rank === 1 ? "first of the class" : row.rank === 2 ? "second" : "third"}
          </p>
        )}
      </div>

      {/* Value + themed unit */}
      <div className="flex flex-shrink-0 items-baseline gap-1.5">
        <span
          className="font-display text-xl leading-none"
          style={{ color: medal ?? board.accent }}
        >
          {row.value}
        </span>
        <span className="text-[10px] tracking-[0.12em] uppercase text-parchment/55">
          {board.unit}
        </span>
      </div>
    </div>
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
      <Users className="mx-auto mb-4 h-10 w-10 opacity-40" style={{ color: GOLD }} />
      <p className="font-display text-lg text-spectral">The Hall stands empty for you — for now.</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-parchment/75">
        Join a class to compete with fellow apprentices. Ask your teacher for a class code, then
        enter it in the join banner on your Home page.
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
        <Trophy className="h-4 w-4" /> Go to Home and join a class
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading the Hall of Records">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[60px] animate-pulse rounded-2xl"
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
