/**
 * Learning engine — the logic behind Guided Lesson Paths and Spaced-Repetition
 * Review. Both read/write two fields on the student's own `users/{uid}` doc:
 *   - `pathProgress` — furthest stage reached per topic
 *   - `reviews`      — a per-concept SM-2-style review schedule
 * (Existing Firestore rules already allow the owner to write these — they aren't
 * grades/mastery/role/status — so no rules change is needed.)
 */
import { doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { PathProgress, PathStage, ReviewState } from "./profile";
import { CURRICULUM, topicById } from "./curriculum";

const DAY = 86_400_000;

// ── Spaced repetition (lightweight SM-2) ──────────────────────────────────────
const DEFAULT_EASE = 2.3;
const MIN_EASE = 1.7;
const MAX_EASE = 2.8;
/** A missed card comes back within the same session (10 minutes). */
const LAPSE_DELAY_MS = 10 * 60_000;

/**
 * Given the previous schedule for a concept (or undefined if brand-new) and
 * whether the student just answered correctly, return the next schedule.
 * Pure — pass `now` (epoch ms) so it's deterministic and testable.
 */
export function nextReview(
  prev: ReviewState | undefined,
  correct: boolean,
  now: number,
): ReviewState {
  const ease = prev?.ease ?? DEFAULT_EASE;
  const reps = prev?.reps ?? 0;
  const lapses = prev?.lapses ?? 0;

  if (!correct) {
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      intervalDays: 0,
      dueAt: now + LAPSE_DELAY_MS,
      reps: 0,
      lapses: lapses + 1,
    };
  }

  const newReps = reps + 1;
  // 1 day → 3 days → then geometric growth by the ease factor.
  const prevInterval = prev?.intervalDays ?? 0;
  const intervalDays =
    newReps === 1 ? 1 : newReps === 2 ? 3 : Math.round(prevInterval * ease);

  return {
    ease: Math.min(MAX_EASE, ease + 0.1),
    intervalDays,
    dueAt: now + intervalDays * DAY,
    reps: newReps,
    lapses,
  };
}

/** Concept ids that are due for review at `now`, soonest-due first. */
export function dueConceptIds(
  reviews: Record<string, ReviewState> | undefined,
  now: number,
): string[] {
  if (!reviews) return [];
  return Object.entries(reviews)
    .filter(([, r]) => r.dueAt <= now)
    .sort((a, b) => a[1].dueAt - b[1].dueAt)
    .map(([id]) => id);
}

/** How many concepts are scheduled but not yet due (for a "next up" hint). */
export function scheduledCount(reviews: Record<string, ReviewState> | undefined): number {
  return reviews ? Object.keys(reviews).length : 0;
}

/**
 * Record one answer: reschedule the concept and bump a practice counter.
 * Pass the student's current `reviews` map so we can read the prior schedule.
 */
export async function recordAnswer(
  uid: string,
  conceptId: string,
  correct: boolean,
  reviews: Record<string, ReviewState> | undefined,
): Promise<void> {
  const next = nextReview(reviews?.[conceptId], correct, Date.now());
  await updateDoc(doc(db, "users", uid), {
    [`reviews.${conceptId}`]: next,
    "practice.conceptsReviewed": increment(1),
    "practice.lastActiveAt": serverTimestamp(),
  });
}

// ── Guided lesson paths ───────────────────────────────────────────────────────
const STAGE_ORDER: PathStage[] = ["learn", "practise", "assess", "done"];
/** Fraction of assessment questions a student must get right to pass a topic. */
export const ASSESS_PASS = 0.7;

function stageRank(s: PathStage | undefined): number {
  return s ? STAGE_ORDER.indexOf(s) : -1;
}

/** A topic unlocks once the previous topic on the path is done (first is open). */
export function isTopicUnlocked(
  topicIndex: number,
  pathProgress: Record<string, PathProgress> | undefined,
): boolean {
  if (topicIndex <= 0) return true;
  const prev = CURRICULUM[topicIndex - 1];
  return pathProgress?.[prev.id]?.stage === "done";
}

export function topicStage(
  topicId: string,
  pathProgress: Record<string, PathProgress> | undefined,
): PathStage | null {
  return pathProgress?.[topicId]?.stage ?? null;
}

/**
 * Advance a topic to `stage`, but never move backwards. Optionally record a new
 * best assessment score. Reaching "done" is what unlocks the next topic.
 */
export async function advancePath(
  uid: string,
  topicId: string,
  stage: PathStage,
  best?: number,
  currentProgress?: Record<string, PathProgress>,
): Promise<void> {
  const existing = currentProgress?.[topicId];
  const nextStage: PathStage =
    stageRank(stage) > stageRank(existing?.stage) ? stage : existing!.stage;
  const nextBest =
    best != null ? Math.max(best, existing?.best ?? 0) : existing?.best;

  const value: PathProgress = { stage: nextStage };
  if (nextBest != null) value.best = nextBest;

  await updateDoc(doc(db, "users", uid), {
    [`pathProgress.${topicId}`]: value,
    "practice.lastActiveAt": serverTimestamp(),
  });
}

/** Overall path completion (0..1) across the whole curriculum. */
export function pathCompletion(
  pathProgress: Record<string, PathProgress> | undefined,
): number {
  const done = CURRICULUM.filter((t) => pathProgress?.[t.id]?.stage === "done").length;
  return CURRICULUM.length ? done / CURRICULUM.length : 0;
}

/** Convenience: the passing score (in questions) for a topic. */
export function assessThreshold(topicId: string): number {
  const t = topicById(topicId);
  return t ? Math.ceil(t.concepts.length * ASSESS_PASS) : 0;
}
