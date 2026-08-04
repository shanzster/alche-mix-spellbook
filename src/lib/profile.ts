import { useEffect, useState } from "react";
import { arrayUnion, doc, increment, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
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
  /** Compound formulas the student has forged by mixing cards. */
  compounds?: string[];
  /** Guided-lesson-path progress, keyed by topic id (see lib/learning.ts). */
  pathProgress?: Record<string, PathProgress>;
  /** Spaced-repetition schedule, keyed by concept id (see lib/learning.ts). */
  reviews?: Record<string, ReviewState>;
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

/** Add a scanned element card to the student's Grimoire (deduped). */
export async function scanCard(uid: string | null, symbol: string): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), {
      grimoire: arrayUnion(symbol),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch (err) {
    console.error("scanCard failed:", err);
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
