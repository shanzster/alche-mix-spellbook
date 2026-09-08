import { useEffect, useState } from "react";
import { arrayUnion, doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc, type Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { onAuthChange } from "./auth";

// ── Types ──────────────────────────────────────────────────────────────────
/** A score a teacher has entered for a topic (educator side, later). */
export interface TopicGrade {
  score: number;
  outOf: number;
  feedback?: string;
}

export type Mastery = "not-started" | "developing" | "proficient" | "mastered";

export type Role = "student" | "teacher" | "admin";
/** Teachers start as "pending" and must be approved by an admin. */
export type TeacherStatus = "pending" | "approved" | "rejected";

export interface StudentProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: Role;
  /** Only meaningful for teachers. */
  status?: TeacherStatus;
  /** For students who have joined a class (the class join code). */
  classId?: string;
  className?: string;
  /** Scores entered by the teacher, keyed by topic id. */
  grades?: Record<string, TopicGrade>;
  /** Mastery level per topic, set by the teacher. */
  mastery?: Record<string, Mastery>;
  /** App-recorded practice engagement (counts only — never a grade). */
  practice?: Record<string, number>;
  /** Element-card symbols the student has scanned into their Grimoire. */
  grimoire?: string[];
  /** When each card was FIRST obtained, keyed by symbol. */
  grimoireScans?: Record<string, Timestamp>;
  /** Compound formulas the student has forged by mixing cards. */
  compounds?: string[];
  /** Forged-card ids the student has unlocked via Alche-mix (see lib/forged.ts). */
  forged?: string[];
  /** When each forged card was first obtained, keyed by forged-card id. */
  forgedAt?: Record<string, Timestamp>;
  /** Achievement badges the app has awarded (e.g. "ar-alchemist"). */
  badges?: string[];
  /** Guided-lesson-path progress, keyed by topic id (see lib/learning.ts). */
  pathProgress?: Record<string, PathProgress>;
  /** Spaced-repetition schedule, keyed by concept id (see lib/learning.ts). */
  reviews?: Record<string, ReviewState>;
  /** Best results on module Trials (game screens), keyed by trial id. */
  trials?: Record<string, TrialResult>;
  /** Aurum — the reward currency earned from Trials and daily Starters. */
  aurum?: number;
  /** Daily "Starters for Ten" streak. `lastDay` is a YYYY-MM-DD key. */
  starterStreak?: { count: number; lastDay: string };
  /** Shop item ids the student owns (bought with aurum). */
  inventory?: string[];
  /** Equipped cosmetics, keyed by slot (e.g. { frame: "frame-gilded" }). */
  equipped?: Record<string, string>;
  /** Duel the Alchemist record, keyed by difficulty ("easy"|"medium"|"hard"). */
  duelRecord?: Record<string, { wins: number; losses: number }>;
  /** Results on teacher-assigned quizzes, keyed by assignment id. */
  assignmentResults?: Record<string, { score: number; outOf: number }>;
  /** True once the first-login walkthrough has been offered (taken OR declined). */
  walkthroughDone?: boolean;
  /** Derived mastery ladder — synced by `lib/craft.ts` (see CRAFTS/TIERS). */
  craft?: { mastered: string[]; count: number; tier: number };
}

/** A student's best recorded run on a module Trial (a PhET-style game screen). */
export interface TrialResult {
  /** Best score achieved (same scale as `outOf`). */
  best: number;
  outOf: number;
  /** Stars earned on the best run (0–3). */
  stars: number;
  /** Fastest completion, if the trial is timed. */
  timeSec?: number;
  /** Total attempts, all runs. */
  plays: number;
}

/** Furthest stage a student has reached on a topic's guided path. */
export type PathStage = "learn" | "practise" | "assess" | "done";
export interface PathProgress {
  stage: PathStage;
  /** Best assessment score (0..1) the student has achieved on this topic. */
  best?: number;
}

/** Per-concept spaced-repetition state (a lightweight SM-2). */
export interface ReviewState {
  /** Ease factor — grows with success, shrinks on a lapse. */
  ease: number;
  /** Current interval in days. */
  intervalDays: number;
  /** When this concept next becomes due, in epoch ms. */
  dueAt: number;
  /** Successful reviews in a row. */
  reps: number;
  /** Times the student has forgotten it. */
  lapses: number;
}

// ── Live profile subscription ───────────────────────────────────────────────
/**
 * Subscribes to the signed-in student's `users/{uid}` document in real time.
 * Returns `{ uid, profile, loading }`. `profile` is null when signed out or the
 * doc doesn't exist yet.
 */
export function useUserProfile() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthChange((u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid, ...snap.data() } as StudentProfile) : null);
        setLoading(false);
      },
      (err) => {
        console.error("useUserProfile snapshot error:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  return { uid, profile, loading };
}

/**
 * Records lightweight practice engagement (a per-module counter + a timestamp).
 * This is NOT a grade — it only exists so a teacher's dashboard can later see
 * that a student practised a module. Best-effort; never thrown.
 */
export async function logPractice(uid: string | null, moduleId: string, inc = 1): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), {
      [`practice.${moduleId}`]: increment(inc),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch (err) {
    console.error("logPractice failed:", err);
  }
}

/**
 * Records a Trial run (a module's game screen). Keeps the BEST result — higher
 * score wins; on an equal score a faster time wins. Every run increments
 * `plays` and earns aurum (stars × 5, +5 bonus for a perfect score).
 * Best-effort; never thrown.
 */
export async function recordTrial(
  uid: string | null,
  trialId: string,
  run: { score: number; outOf: number; stars: number; timeSec?: number },
): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const prev = (snap.data() as StudentProfile | undefined)?.trials?.[trialId];
    const improved =
      !prev ||
      run.score > prev.best ||
      (run.score === prev.best &&
        run.timeSec !== undefined &&
        (prev.timeSec === undefined || run.timeSec < prev.timeSec));
    const next: TrialResult = improved
      ? {
          best: run.score,
          outOf: run.outOf,
          stars: run.stars,
          ...(run.timeSec !== undefined ? { timeSec: run.timeSec } : {}),
          plays: (prev?.plays ?? 0) + 1,
        }
      : { ...prev, plays: prev.plays + 1 };
    const earned = run.stars * 5 + (run.score >= run.outOf ? 5 : 0);
    await updateDoc(ref, {
      [`trials.${trialId}`]: next,
      aurum: increment(earned),
      [`practice.${trialId}-trial`]: increment(1),
      "practice.lastActiveAt": serverTimestamp(),
    });
    // Mirror the new star total onto the class leaderboard (if enrolled).
    const after = await getDoc(ref);
    await syncRosterStats(uid, after.data() as StudentProfile | undefined);
  } catch (err) {
    console.error("recordTrial failed:", err);
  }
}

/**
 * Mirrors a student's leaderboard stats onto their own class-roster entry
 * (classes/{classId}/roster/{uid}), which classmates are allowed to read.
 * Never mirrors anything sensitive — name + game stats only.
 * Best-effort; never thrown.
 */
async function syncRosterStats(
  uid: string,
  data: StudentProfile | undefined,
  overrides: { stars?: number; aurum?: number } = {},
): Promise<void> {
  const classId = data?.classId;
  if (!classId) return;
  try {
    const trialStars = Object.values(data?.trials ?? {}).reduce((s, t) => s + (t.stars ?? 0), 0);
    const duels = Object.values(data?.duelRecord ?? {}).reduce((s, d) => s + (d.wins ?? 0), 0);
    await setDoc(
      doc(db, "classes", classId, "roster", uid),
      {
        displayName: data?.displayName ?? data?.email?.split("@")[0] ?? "Apprentice",
        stars: overrides.stars ?? trialStars,
        aurum: overrides.aurum ?? data?.aurum ?? 0,
        duelWins: duels,
        compounds: data?.compounds?.length ?? 0,
        streak: data?.starterStreak?.count ?? 0,
        statsAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("syncRosterStats failed:", err);
  }
}

/**
 * Spend aurum on a shop item. Refuses (returns false) when the student can't
 * afford it or already owns a non-consumable. Best-effort beyond that.
 */
export async function spendAurum(
  uid: string | null,
  cost: number,
  itemId: string,
): Promise<boolean> {
  if (!uid) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const data = snap.data() as StudentProfile | undefined;
    if ((data?.aurum ?? 0) < cost) return false;
    if (data?.inventory?.includes(itemId)) return false;
    await updateDoc(ref, {
      aurum: increment(-cost),
      inventory: arrayUnion(itemId),
      "practice.lastActiveAt": serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("spendAurum failed:", err);
    return false;
  }
}

/** Equip an owned cosmetic into a slot (e.g. equipItem(uid, "frame", id)). */
export async function equipItem(uid: string | null, slot: string, itemId: string): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), { [`equipped.${slot}`]: itemId });
  } catch (err) {
    console.error("equipItem failed:", err);
  }
}

/**
 * Records a finished Duel the Alchemist match: win/loss tally per difficulty,
 * aurum payout on a win (easy 10 / medium 20 / hard 40), and a leaderboard
 * sync. Best-effort; never thrown.
 */
export async function recordDuel(
  uid: string | null,
  difficulty: "easy" | "medium" | "hard",
  won: boolean,
): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const payout = won ? { easy: 10, medium: 20, hard: 40 }[difficulty] : 0;
    await updateDoc(ref, {
      [`duelRecord.${difficulty}.${won ? "wins" : "losses"}`]: increment(1),
      ...(payout ? { aurum: increment(payout) } : {}),
      "practice.duel": increment(1),
      "practice.lastActiveAt": serverTimestamp(),
    });
    const snap = await getDoc(ref);
    await syncRosterStats(uid, snap.data() as StudentProfile | undefined);
  } catch (err) {
    console.error("recordDuel failed:", err);
  }
}

/** Save a score on a teacher-assigned quiz (keeps the latest). */
export async function recordAssignmentResult(
  uid: string | null,
  assignmentId: string,
  score: number,
  outOf: number,
): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), {
      [`assignmentResults.${assignmentId}`]: { score, outOf },
      "practice.assignments": increment(1),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch (err) {
    console.error("recordAssignmentResult failed:", err);
  }
}

/**
 * Marks the first-login walkthrough as offered (taken or declined), so the
 * invitation modal never reappears on any device. Best-effort; never thrown.
 */
export async function markWalkthroughDone(uid: string | null): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(doc(db, "users", uid), { walkthroughDone: true }, { merge: true });
  } catch (err) {
    console.error("markWalkthroughDone failed:", err);
  }
}

/** Grant aurum directly (e.g. daily Starters). Best-effort; never thrown. */
export async function earnAurum(uid: string | null, amount: number): Promise<void> {
  if (!uid || amount <= 0) return;
  try {
    await updateDoc(doc(db, "users", uid), { aurum: increment(amount) });
  } catch (err) {
    console.error("earnAurum failed:", err);
  }
}

/**
 * Records a completed daily "Starters for Ten" run and advances the streak:
 * same day → unchanged; consecutive day → +1; otherwise reset to 1.
 * `dayKey` is local YYYY-MM-DD. Best-effort; never thrown.
 */
export async function recordStarterRun(
  uid: string | null,
  dayKey: string,
  score: number,
): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const prev = (snap.data() as StudentProfile | undefined)?.starterStreak;
    let count = 1;
    if (prev?.lastDay === dayKey) {
      count = prev.count; // already played today — streak unchanged
    } else if (prev) {
      const ms = Date.parse(dayKey) - Date.parse(prev.lastDay);
      if (ms > 0 && ms <= 36 * 3600 * 1000) count = prev.count + 1;
    }
    await updateDoc(ref, {
      starterStreak: { count, lastDay: dayKey },
      aurum: increment(Math.max(1, score)),
      "practice.starters": increment(1),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch (err) {
    console.error("recordStarterRun failed:", err);
  }
}

/** Add a scanned element card to the student's Grimoire (deduped). */
export async function scanCard(uid: string | null, symbol: string): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const updates: Record<string, unknown> = {
      grimoire: arrayUnion(symbol),
      "practice.lastActiveAt": serverTimestamp(),
    };
    // Stamp when the card was FIRST obtained — never overwritten by rescans.
    // (Also backfills cards collected before timestamps existed.)
    const snap = await getDoc(ref);
    const scans = (snap.data() as { grimoireScans?: Record<string, unknown> } | undefined)?.grimoireScans;
    if (!scans?.[symbol]) updates[`grimoireScans.${symbol}`] = serverTimestamp();
    await updateDoc(ref, updates);
  } catch (err) {
    console.error("scanCard failed:", err);
  }
}

/** Award an achievement badge (deduped). Best-effort; never thrown. */
export async function awardBadge(uid: string | null, badgeId: string): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), {
      badges: arrayUnion(badgeId),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch (err) {
    console.error("awardBadge failed:", err);
  }
}

/** Record a compound the student forged by mixing cards (deduped). */
export async function recordCompound(uid: string | null, formula: string): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), { compounds: arrayUnion(formula) });
  } catch (err) {
    console.error("recordCompound failed:", err);
  }
}

/**
 * Register a forged card (a new element unlocked via Alche-mix) to the student's
 * Grimoire (deduped). Stamps the first-obtained time, never overwriting it on a
 * re-forge. Best-effort; never thrown.
 */
export async function registerForged(uid: string | null, forgedId: string): Promise<void> {
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    const updates: Record<string, unknown> = {
      forged: arrayUnion(forgedId),
      "practice.lastActiveAt": serverTimestamp(),
    };
    const snap = await getDoc(ref);
    const at = (snap.data() as { forgedAt?: Record<string, unknown> } | undefined)?.forgedAt;
    if (!at?.[forgedId]) updates[`forgedAt.${forgedId}`] = serverTimestamp();
    await updateDoc(ref, updates);
  } catch (err) {
    console.error("registerForged failed:", err);
  }
}
