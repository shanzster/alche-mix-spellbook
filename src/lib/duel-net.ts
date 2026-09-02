// Class Duels — the Firestore network layer over the pure duel engine.
//
// Correspondence-chess-style async battles between classmates. The serialized
// `DuelState` in `duels/{duelId}` is AUTHORITATIVE: whichever client acts next
// applies the move locally with the pure `applyMove` and writes the whole new
// state back. Firestore rules trust any uid listed in the doc's `players`
// array — it's a game, not a gradebook.
//
// Side conventions (mirror the engine): side 0 = the challenger (the student
// who sent the challenge), side 1 = the opponent. A client learns its own side
// with `sideOf(duel, uid)`.

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { recordDuel } from "./profile";
import {
  applyMove,
  createDuel,
  seededRng,
  type DuelState,
  type Move,
  type SideId,
} from "./duel";

// ── Document shape ──────────────────────────────────────────────────────────
export type DuelStatus = "pending" | "active" | "done";

export interface DuelDoc {
  /** Firestore document id (attached client-side on read). */
  id: string;
  /** [challengerUid, opponentUid] — index matches the engine's SideId. */
  players: [string, string];
  /** Display names, same order as `players`. */
  names: [string, string];
  classId: string;
  /** Seed the challenger dealt the match with (kept for provenance/replay). */
  seed: number;
  /** The challenger's 4-symbol draft, when they drafted by hand. */
  draft0?: string[];
  /** Reserved: opponents currently take fate's draw from the remainder. */
  draft1?: null;
  /** The authoritative serialized engine state. */
  state: DuelState;
  status: DuelStatus;
  /** Set when status becomes "done". */
  winnerUid?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/** Your side in a duel: 0 (challenger), 1 (opponent), or -1 if not a player. */
export function sideOf(duel: DuelDoc, uid: string | null): SideId | -1 {
  if (!uid) return -1;
  const i = duel.players.indexOf(uid);
  return i === 0 || i === 1 ? (i as SideId) : -1;
}

/** The other player's uid + display name, from my point of view. */
export function opponentOf(duel: DuelDoc, uid: string | null): { uid: string; name: string } {
  const mine = sideOf(duel, uid);
  const theirs = mine === 0 ? 1 : 0;
  return { uid: duel.players[theirs], name: duel.names[theirs] };
}

// ── Challenge lifecycle ─────────────────────────────────────────────────────
/**
 * Send a challenge to a classmate. Deals the match immediately (the engine is
 * deterministic, so the whole duel lives in the doc from move one) and writes
 * it with status "pending" until the opponent accepts. Returns the duel id.
 */
export async function createChallenge(
  myUid: string,
  myName: string,
  opponentUid: string,
  opponentName: string,
  classId: string,
  draft?: string[],
): Promise<string> {
  const seed = Math.floor(Date.now() % 2147483647) || 1;
  const drafted = draft && draft.length === 4 ? draft : undefined;
  const state = createDuel(seededRng(seed), drafted);
  const ref = await addDoc(collection(db, "duels"), {
    players: [myUid, opponentUid],
    names: [myName, opponentName],
    classId,
    seed,
    ...(drafted ? { draft0: drafted } : {}),
    draft1: null,
    state,
    status: "pending" as DuelStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Opponent accepts — the duel becomes playable. */
export async function acceptChallenge(duelId: string): Promise<void> {
  await updateDoc(doc(db, "duels", duelId), {
    status: "active" as DuelStatus,
    updatedAt: serverTimestamp(),
  });
}

/** Decline an incoming challenge, or withdraw one you sent. */
export async function declineOrDelete(duelId: string): Promise<void> {
  await deleteDoc(doc(db, "duels", duelId));
}

// ── Live subscriptions ──────────────────────────────────────────────────────
/**
 * Every duel the student is a player in, freshest first (ordered client-side
 * by updatedAt — no composite index needed for array-contains + orderBy).
 */
export function useMyDuels(uid: string | null): { duels: DuelDoc[]; loading: boolean } {
  const [duels, setDuels] = useState<DuelDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDuels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "duels"), where("players", "array-contains", uid));
    return onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DuelDoc);
        docs.sort(
          (a, b) =>
            (b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0) -
            (a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0),
        );
        setDuels(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useMyDuels snapshot error:", err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { duels, loading };
}

/** Live subscription to a single duel document. `duel` is null if it's gone. */
export function useDuel(duelId: string | null): { duel: DuelDoc | null; loading: boolean } {
  const [duel, setDuel] = useState<DuelDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!duelId) {
      setDuel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, "duels", duelId),
      (snap) => {
        setDuel(snap.exists() ? ({ id: snap.id, ...snap.data() } as DuelDoc) : null);
        setLoading(false);
      },
      (err) => {
        console.error("useDuel snapshot error:", err);
        setLoading(false);
      },
    );
  }, [duelId]);

  return { duel, loading };
}

// ── Playing a move ──────────────────────────────────────────────────────────
/**
 * Apply my move to the authoritative state and write it back. Client-side
 * guards: the duel must be active, unfinished, and it must be MY side's turn.
 * When the engine declares a winner the doc is closed with status "done" and
 * `winnerUid`. Returns true when the move was written.
 */
export async function submitMove(
  duelId: string,
  currentDoc: DuelDoc,
  move: Move,
): Promise<boolean> {
  const myUid = auth.currentUser?.uid ?? null;
  const mySide = sideOf(currentDoc, myUid);
  if (mySide === -1) return false;
  if (currentDoc.status !== "active") return false;
  if (currentDoc.state.winner !== null) return false;
  if (currentDoc.state.turn !== mySide) return false;

  const next = applyMove(currentDoc.state, move);
  try {
    await updateDoc(doc(db, "duels", duelId), {
      state: next,
      updatedAt: serverTimestamp(),
      ...(next.winner !== null
        ? {
            status: "done" as DuelStatus,
            winnerUid: currentDoc.players[next.winner],
          }
        : {}),
    });
    return true;
  } catch (err) {
    console.error("submitMove failed:", err);
    return false;
  }
}

// ── Settling the pot ────────────────────────────────────────────────────────
/**
 * Record a finished class duel on MY profile exactly once (win/loss tally +
 * aurum on a win), reusing the vs-AI `recordDuel` helper at the flat "medium"
 * PvP payout tier. Each player's own client settles their own side; a
 * localStorage flag keyed by duel id + uid keeps it to one payout even across
 * revisits. Safe to call repeatedly.
 */
export function settleDuelReward(uid: string | null, duel: DuelDoc): void {
  if (!uid || typeof window === "undefined") return;
  if (duel.status !== "done" || !duel.winnerUid) return;
  if (!duel.players.includes(uid)) return;
  const key = `alchemix-duel-settled:${duel.id}:${uid}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    return; // storage unavailable — skip rather than risk double-paying
  }
  void recordDuel(uid, "medium", duel.winnerUid === uid);
}

// ── "New since last visit" bookmark ─────────────────────────────────────────
/** How many log entries of this duel the student had seen on their last visit. */
export function readSeenLogCount(duelId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`alchemix-duel-seen:${duelId}`);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Bookmark the log position so the next visit can highlight what's new. */
export function writeSeenLogCount(duelId: string, count: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`alchemix-duel-seen:${duelId}`, String(count));
  } catch {
    // best-effort
  }
}
