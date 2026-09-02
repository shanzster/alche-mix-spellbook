import { useEffect, useState } from "react";
import {
  collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Mastery, StudentProfile, TopicGrade } from "./profile";

// A class doc lives at classes/{CODE} — the join code *is* the document id.
export interface ClassInfo {
  id: string;          // the 6-char join code
  name: string;
  teacherId: string;
  teacherName?: string | null;
}

export interface RosterEntry {
  uid: string;
  name: string | null;
  email: string | null;
}

/** Topics teachers grade against — these keys line up with the student modules. */
export const GRADE_TOPICS = [
  "Atomic Structure",
  "Equation Balancing",
  "Bonding & Cards",
  "Gas Laws",
  "Visual Quiz",
] as const;

// Unambiguous charset (no O/0/I/1) for the join code.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/** Create a class with a unique join code. Returns the new class. */
export async function createClass(teacherId: string, teacherName: string | null, name: string): Promise<ClassInfo> {
  // Find an unused code (retry on the rare collision).
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await getDoc(doc(db, "classes", code));
    if (!existing.exists()) break;
    code = randomCode();
  }
  const info = { id: code, name, teacherId, teacherName };
  await setDoc(doc(db, "classes", code), {
    name, teacherId, teacherName, createdAt: serverTimestamp(),
  });
  return info;
}

/** Live list of a teacher's classes. */
export function useTeacherClasses(teacherId: string | null) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!teacherId) { setClasses([]); setLoading(false); return; }
    const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
    return onSnapshot(q, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassInfo, "id">) })));
      setLoading(false);
    }, (err) => { console.error("useTeacherClasses:", err); setLoading(false); });
  }, [teacherId]);
  return { classes, loading };
}

/** Live roster for a class. */
export function useRoster(classId: string | null) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  useEffect(() => {
    if (!classId) { setRoster([]); return; }
    return onSnapshot(collection(db, "classes", classId, "roster"), (snap) => {
      setRoster(snap.docs.map((d) => d.data() as RosterEntry));
    }, (err) => console.error("useRoster:", err));
  }, [classId]);
  return roster;
}

/** Look up a class by its join code (returns null if the code is invalid). */
export async function findClassByCode(code: string): Promise<ClassInfo | null> {
  const id = code.trim().toUpperCase();
  if (!id) return null;
  const snap = await getDoc(doc(db, "classes", id));
  if (!snap.exists()) return null;
  return { id, ...(snap.data() as Omit<ClassInfo, "id">) };
}

/** A student joins a class: writes a roster entry + stamps their profile. */
export async function joinClass(student: { uid: string; name: string | null; email: string | null }, code: string): Promise<ClassInfo | null> {
  const cls = await findClassByCode(code);
  if (!cls) return null;
  await setDoc(doc(db, "classes", cls.id, "roster", student.uid), {
    uid: student.uid, name: student.name, email: student.email, joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", student.uid), { classId: cls.id, className: cls.name });
  return cls;
}

/** Teacher reads a student's current grades/mastery (to edit them). */
export async function getStudentGrades(studentUid: string): Promise<{ grades: Record<string, TopicGrade>; mastery: Record<string, Mastery> }> {
  const snap = await getDoc(doc(db, "users", studentUid));
  const data = snap.data() ?? {};
  return { grades: (data.grades as Record<string, TopicGrade>) ?? {}, mastery: (data.mastery as Record<string, Mastery>) ?? {} };
}

/** Teacher writes a grade + mastery for a student on a topic. */
export async function setStudentGrade(
  studentUid: string,
  topic: string,
  grade: { score?: number; outOf?: number; feedback?: string } | null,
  mastery?: Mastery,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (grade && grade.outOf) updates[`grades.${topic}`] = { score: grade.score ?? 0, outOf: grade.outOf, ...(grade.feedback ? { feedback: grade.feedback } : {}) };
  if (mastery) updates[`mastery.${topic}`] = mastery;
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db, "users", studentUid), updates);
}

/** A teacher-visible summary of how much a class has practised. */
export async function getStudentPractice(studentUid: string): Promise<Record<string, number>> {
  const snap = await getDoc(doc(db, "users", studentUid));
  return (snap.data()?.practice as Record<string, number>) ?? {};
}

// ── Teacher-authored assignments (stored ON the class doc) ──────────────────
// Firestore rules let a teacher update their own class doc and any signed-in
// user read it — so quizzes and missions live as array fields on the doc
// itself (no new collections). Students save results to their OWN user doc
// via `recordAssignmentResult` in lib/profile.ts.

export interface QuizQuestion {
  prompt: string;
  /** Exactly four choices. */
  choices: string[];
  /** Index into `choices` of the correct answer. */
  answer: number;
  /** Optional nudge shown to a student who misses the question. */
  hint?: string;
}

export interface QuizDef {
  id: string;
  title: string;
  questions: QuizQuestion[];
  /** Epoch millis (serverTimestamp can't live inside array elements). */
  createdAt: number;
}

/** One step of a mission checklist — denormalised so old missions survive catalog edits. */
export interface MissionTarget {
  moduleId: string;
  label: string;
  /** The `profile.practice` counter that proves the module was practised. */
  practiceKey: string;
}

export interface MissionDef {
  id: string;
  title: string;
  /** The teacher's note to the class. */
  note?: string;
  /** Ordered checklist. */
  targets: MissionTarget[];
  createdAt: number;
}

/** A module a mission can point at. `practiceKey` matches what the module logs via `logPractice`. */
export interface ModuleCatalogEntry {
  id: string;
  label: string;
  route: string;
  practiceKey: string;
}

/** Fixed catalog of assignable modules — routes and practice keys are real. */
export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  { id: "lab-safety", label: "Lab Safety", route: "/lab-safety", practiceKey: "lab-safety" },
  { id: "atomic-builder", label: "Atomic Builder", route: "/atomic-builder", practiceKey: "atomic-builder" },
  { id: "periodic-table", label: "Periodic Table", route: "/periodic-table", practiceKey: "periodic-table" },
  { id: "table-game", label: "Placement Trials", route: "/table-game", practiceKey: "table-game" },
  { id: "states", label: "States of Matter", route: "/states", practiceKey: "states" },
  { id: "study", label: "The Study", route: "/study", practiceKey: "conceptsReviewed" },
  { id: "molecules", label: "Molecule Shapes", route: "/molecules", practiceKey: "molecules" },
  { id: "reactions", label: "Reaction Theatre", route: "/reactions", practiceKey: "reactions" },
  { id: "equation-balancer", label: "Equation Balancer", route: "/equation-balancer", practiceKey: "equation-balancer" },
  { id: "codex", label: "Compound Codex", route: "/codex", practiceKey: "codex" },
  { id: "gas-laws", label: "Gas Laws", route: "/gas-laws", practiceKey: "gas-laws" },
  { id: "titration", label: "Titration Lab", route: "/titration", practiceKey: "titration" },
  { id: "decay", label: "Radioactive Decay", route: "/decay", practiceKey: "decay" },
  { id: "quiz", label: "3D Visual Quiz", route: "/quiz", practiceKey: "quiz" },
  { id: "starters", label: "Starters for Ten", route: "/starters", practiceKey: "starters" },
];

export const moduleById = (id: string): ModuleCatalogEntry | undefined =>
  MODULE_CATALOG.find((m) => m.id === id);

/** Collision-safe id for a quiz or mission ("qz-…" / "ms-…"). */
export function newAssignmentId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Client-side validation. Returns an error message, or null when the quiz is sound. */
export function validateQuiz(title: string, questions: QuizQuestion[]): string | null {
  if (!title.trim()) return "Give the quiz a title.";
  if (questions.length === 0) return "Add at least one question.";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt.`;
    if (q.choices.length !== 4 || q.choices.some((c) => !c.trim()))
      return `Question ${i + 1} needs all four choices filled in.`;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3)
      return `Question ${i + 1} needs exactly one correct answer marked.`;
  }
  return null;
}

export function validateMission(title: string, targets: MissionTarget[]): string | null {
  if (!title.trim()) return "Give the mission a title.";
  if (targets.length === 0) return "Pick at least one module for the checklist.";
  return null;
}

/**
 * Live quizzes + missions from one class doc. Works for the teacher console
 * AND the student assignments page (rules allow any signed-in user to read).
 */
export function useClassAssignments(classId: string | null) {
  const [quizzes, setQuizzes] = useState<QuizDef[]>([]);
  const [missions, setMissions] = useState<MissionDef[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!classId) { setQuizzes([]); setMissions([]); setClassName(null); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(doc(db, "classes", classId), (snap) => {
      const data = snap.data();
      setQuizzes(((data?.quizzes as QuizDef[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt));
      setMissions(((data?.missions as MissionDef[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt));
      setClassName((data?.name as string) ?? null);
      setLoading(false);
    }, (err) => { console.error("useClassAssignments:", err); setLoading(false); });
  }, [classId]);
  return { quizzes, missions, className, loading };
}

/** Read-modify-write one array field on the class doc (create or replace by id). */
async function upsertClassArrayItem<T extends { id: string }>(classId: string, field: string, item: T): Promise<void> {
  const ref = doc(db, "classes", classId);
  const snap = await getDoc(ref);
  const list = ((snap.data()?.[field] as T[]) ?? []).slice();
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
  await updateDoc(ref, { [field]: list });
}

async function removeClassArrayItem(classId: string, field: string, id: string): Promise<void> {
  const ref = doc(db, "classes", classId);
  const snap = await getDoc(ref);
  const list = ((snap.data()?.[field] as { id: string }[]) ?? []).filter((x) => x.id !== id);
  await updateDoc(ref, { [field]: list });
}

/** Create or update a quiz on the class doc (strips empty hints — Firestore rejects `undefined`). */
export async function saveQuiz(classId: string, quiz: QuizDef): Promise<void> {
  const clean: QuizDef = {
    ...quiz,
    title: quiz.title.trim(),
    questions: quiz.questions.map((q) => ({
      prompt: q.prompt.trim(),
      choices: q.choices.map((c) => c.trim()),
      answer: q.answer,
      ...(q.hint?.trim() ? { hint: q.hint.trim() } : {}),
    })),
  };
  await upsertClassArrayItem(classId, "quizzes", clean);
}

export async function deleteQuiz(classId: string, quizId: string): Promise<void> {
  await removeClassArrayItem(classId, "quizzes", quizId);
}

export async function saveMission(classId: string, mission: MissionDef): Promise<void> {
  const clean: MissionDef = {
    ...mission,
    title: mission.title.trim(),
    ...(mission.note?.trim() ? { note: mission.note.trim() } : { note: "" }),
  };
  await upsertClassArrayItem(classId, "missions", clean);
}

export async function deleteMission(classId: string, missionId: string): Promise<void> {
  await removeClassArrayItem(classId, "missions", missionId);
}

// ── Class analytics (Performance Matrix) ────────────────────────────────────

/** One rostered student plus their live user doc (null until/unless it exists). */
export interface StudentSnapshot {
  uid: string;
  name: string | null;
  data: StudentProfile | null;
}

/**
 * Live user docs for a whole roster — the same one-listener-per-student pattern
 * as the Evidence feed. Read-only; `loading` clears once every doc has answered.
 */
export function useClassProfiles(roster: RosterEntry[]) {
  const [students, setStudents] = useState<StudentSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const rosterKey = roster.map((r) => r.uid).join(",");

  useEffect(() => {
    if (roster.length === 0) { setStudents([]); setLoading(false); return; }
    setLoading(true);
    const byUid: Record<string, StudentSnapshot> = {};
    const answered = new Set<string>();
    const flush = () => {
      setStudents(roster.map((r) => byUid[r.uid] ?? { uid: r.uid, name: r.name ?? r.email, data: null }));
      if (answered.size >= roster.length) setLoading(false);
    };
    const unsubs = roster.map((s) =>
      onSnapshot(
        doc(db, "users", s.uid),
        (snap) => {
          answered.add(s.uid);
          byUid[s.uid] = {
            uid: s.uid,
            name: s.name ?? s.email,
            data: snap.exists() ? ({ uid: s.uid, ...snap.data() } as StudentProfile) : null,
          };
          flush();
        },
        (err) => { console.error("useClassProfiles:", err); answered.add(s.uid); flush(); },
      ),
    );
    return () => unsubs.forEach((u) => u());
    // Re-subscribe only when the set of students changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  return { students, loading };
}

/** Sum of the numeric practice counters (skips the `lastActiveAt` timestamp). */
export function practiceTotal(practice: StudentProfile["practice"]): number {
  if (!practice) return 0;
  return Object.values(practice as Record<string, unknown>)
    .reduce<number>((sum, v) => (typeof v === "number" ? sum + v : sum), 0);
}

/** Epoch ms of the student's last recorded activity, when derivable. */
export function lastActiveMillis(practice: StudentProfile["practice"]): number | null {
  const v = (practice as Record<string, unknown> | undefined)?.lastActiveAt;
  if (v && typeof v === "object" && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis(): number }).toMillis();
  }
  return null;
}

/** Roster-wide trouble signals for one curriculum concept. */
export interface ConceptTrouble {
  conceptId: string;
  /** Total lapses (forgotten reviews) across the roster. */
  lapses: number;
  /** Students whose review of this concept is currently overdue. */
  overdue: number;
  /** Students with any review state for this concept. */
  tracked: number;
}

/**
 * Misconception radar: aggregates SM-2 review states across a roster and
 * returns the concepts with trouble, worst first (most overdue, then lapses).
 */
export function aggregateConceptTrouble(
  profiles: (StudentProfile | null)[],
  now = Date.now(),
): ConceptTrouble[] {
  const byId: Record<string, ConceptTrouble> = {};
  for (const p of profiles) {
    for (const [conceptId, r] of Object.entries(p?.reviews ?? {})) {
      const t = (byId[conceptId] ??= { conceptId, lapses: 0, overdue: 0, tracked: 0 });
      t.tracked += 1;
      t.lapses += r.lapses ?? 0;
      if (r.dueAt <= now) t.overdue += 1;
    }
  }
  return Object.values(byId)
    .filter((t) => t.lapses > 0 || t.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue || b.lapses - a.lapses);
}
