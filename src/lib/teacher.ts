import { useEffect, useState } from "react";
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Mastery, StudentProfile, TopicGrade } from "./profile";

// A class doc lives at classes/{ID}. Historically the join code WAS the
// document id; since the adviser review (regenerable + expiring codes) the
// ACTIVE code lives in `joinCode` + `joinCodeExpiresAt`, and the doc id is
// just the permanent class id (which doubles as the original code).
export interface ClassInfo {
  id: string;          // permanent class id (also the original join code)
  name: string;
  teacherId: string;
  teacherName?: string | null;
  /** Active join code; falls back to the doc id for pre-review classes. */
  joinCode?: string;
  /** When the active code stops admitting students (null = never, legacy). */
  joinCodeExpiresAt?: Timestamp | null;
  archived?: boolean;
}

/** How long a freshly issued join code admits students. */
export const CODE_VALID_DAYS = 30;

/** The code students should currently be given for this class. */
export function activeJoinCode(cls: ClassInfo): string {
  return cls.joinCode ?? cls.id;
}

/** True once the class's active code has lapsed. */
export function joinCodeExpired(cls: Pick<ClassInfo, "joinCodeExpiresAt">): boolean {
  const t = cls.joinCodeExpiresAt;
  return !!t && t.toMillis() < Date.now();
}

/** Millis until expiry (negative = already expired; null = never expires). */
export function joinCodeMillisLeft(cls: Pick<ClassInfo, "joinCodeExpiresAt">): number | null {
  const t = cls.joinCodeExpiresAt;
  return t ? t.toMillis() - Date.now() : null;
}

function codeExpiry(): Timestamp {
  return Timestamp.fromMillis(Date.now() + CODE_VALID_DAYS * 86_400_000);
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
export async function createClass(teacherId: string, teacherName: string | null, name: string, schoolId?: string | null): Promise<ClassInfo> {
  // Find an unused code (retry on the rare collision).
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await getDoc(doc(db, "classes", code));
    if (!existing.exists()) break;
    code = randomCode();
  }
  const expires = codeExpiry();
  const info: ClassInfo = { id: code, name, teacherId, teacherName, joinCode: code, joinCodeExpiresAt: expires };
  await setDoc(doc(db, "classes", code), {
    name, teacherId, teacherName, createdAt: serverTimestamp(),
    joinCode: code, joinCodeExpiresAt: expires, archived: false,
    // Which school this class belongs to (multi-tenant). Omitted for pre-school classes.
    ...(schoolId ? { schoolId } : {}),
  });
  return info;
}

/** Issue a fresh join code (invalidates the old one) valid CODE_VALID_DAYS. */
export async function regenerateJoinCode(classId: string): Promise<string> {
  let code = randomCode();
  for (let i = 0; i < 6; i++) {
    const clashDoc = await getDoc(doc(db, "classes", code));
    if (!clashDoc.exists()) {
      const clashField = await getDocs(query(collection(db, "classes"), where("joinCode", "==", code), limit(1)));
      if (clashField.empty) break;
    }
    code = randomCode();
  }
  await updateDoc(doc(db, "classes", classId), { joinCode: code, joinCodeExpiresAt: codeExpiry() });
  return code;
}

/** Archive / restore a class (hidden from the active list, nothing deleted). */
export async function setClassArchived(classId: string, archived: boolean): Promise<void> {
  await updateDoc(doc(db, "classes", classId), { archived });
}

/**
 * Remove a student who is not part of the class (adviser item 6). Deletes the
 * roster entry (teachers are allowed by rules); clearing the student's own
 * profile stamp is best-effort — it may be denied until the rules deploy.
 */
export async function removeStudentFromClass(classId: string, studentUid: string): Promise<void> {
  await deleteDoc(doc(db, "classes", classId, "roster", studentUid));
  try {
    const snap = await getDoc(doc(db, "users", studentUid));
    if (snap.exists() && snap.data()?.classId === classId) {
      await updateDoc(doc(db, "users", studentUid), { classId: null, className: null });
    }
  } catch {
    // Firestore rules may not allow the profile stamp yet — the roster
    // removal above is what controls access, so this is cosmetic.
  }
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

/** Outcome of presenting a join code — expired is its own state so the UI
 * can say "ask your teacher for a new code" instead of "wrong code". */
export type CodeLookup =
  | { status: "ok"; cls: ClassInfo }
  | { status: "expired"; cls: ClassInfo }
  | { status: "invalid" };

/** Resolve a join code to its class, honouring regeneration and expiry. */
export async function resolveClassByCode(code: string): Promise<CodeLookup> {
  const id = code.trim().toUpperCase();
  if (!id) return { status: "invalid" };

  // 1 · Original codes are document ids (also the pre-auth School Door path).
  const snap = await getDoc(doc(db, "classes", id));
  if (snap.exists()) {
    const cls = { id: snap.id, ...(snap.data() as Omit<ClassInfo, "id">) };
    if (activeJoinCode(cls) !== id) return { status: "invalid" }; // code was regenerated — old one is dead
    if (cls.archived) return { status: "invalid" };
    if (joinCodeExpired(cls)) return { status: "expired", cls };
    return { status: "ok", cls };
  }

  // 2 · Regenerated codes live in the joinCode field (signed-in query).
  try {
    const qs = await getDocs(query(collection(db, "classes"), where("joinCode", "==", id), limit(1)));
    if (qs.empty) return { status: "invalid" };
    const d = qs.docs[0];
    const cls = { id: d.id, ...(d.data() as Omit<ClassInfo, "id">) };
    if (cls.archived) return { status: "invalid" };
    if (joinCodeExpired(cls)) return { status: "expired", cls };
    return { status: "ok", cls };
  } catch {
    return { status: "invalid" }; // signed-out: the field query is not permitted
  }
}

/** Look up a class by its join code (null if invalid/expired). */
export async function findClassByCode(code: string): Promise<ClassInfo | null> {
  const res = await resolveClassByCode(code);
  return res.status === "ok" ? res.cls : null;
}

/** A student joins a class: writes a roster entry + stamps their profile. */
export async function joinClass(student: { uid: string; name: string | null; email: string | null }, code: string): Promise<CodeLookup> {
  const res = await resolveClassByCode(code);
  if (res.status !== "ok") return res;
  const cls = res.cls;
  await setDoc(doc(db, "classes", cls.id, "roster", student.uid), {
    uid: student.uid, name: student.name, email: student.email, joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", student.uid), { classId: cls.id, className: cls.name });
  return res;
}

// ── Request-based enrolment (Phase 4) ───────────────────────────────────────
// A student with a valid code REQUESTS to join; the teacher accepts before the
// student is on the roster. The pending state is mirrored on the user doc
// (`pendingClassId`/`pendingClassName`) so the student's dashboard can show it.

export interface JoinRequest {
  uid: string;
  name: string | null;
  email: string | null;
}

/** A student requests to join a class by code. Returns the code lookup result. */
export async function requestToJoinClass(
  student: { uid: string; name: string | null; email: string | null },
  code: string,
): Promise<CodeLookup> {
  const res = await resolveClassByCode(code);
  if (res.status !== "ok") return res;
  const cls = res.cls;
  await setDoc(doc(db, "classes", cls.id, "requests", student.uid), {
    uid: student.uid, name: student.name, email: student.email, requestedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", student.uid), { pendingClassId: cls.id, pendingClassName: cls.name });
  return res;
}

/** A student cancels their own pending request. */
export async function cancelJoinRequest(studentUid: string, classId: string): Promise<void> {
  await deleteDoc(doc(db, "classes", classId, "requests", studentUid));
  try { await updateDoc(doc(db, "users", studentUid), { pendingClassId: null, pendingClassName: null }); } catch { /* best-effort */ }
}

/** Live pending join requests for a class (teacher view). */
export function useJoinRequests(classId: string | null) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  useEffect(() => {
    if (!classId) { setRequests([]); return; }
    return onSnapshot(collection(db, "classes", classId, "requests"), (snap) => {
      setRequests(snap.docs.map((d) => d.data() as JoinRequest));
    }, (err) => console.error("useJoinRequests:", err));
  }, [classId]);
  return requests;
}

/** Teacher accepts a request: roster entry + stamp student + clear pending + drop request. */
export async function acceptJoinRequest(classId: string, className: string, req: JoinRequest): Promise<void> {
  await setDoc(doc(db, "classes", classId, "roster", req.uid), {
    uid: req.uid, name: req.name, email: req.email, joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", req.uid), {
    classId, className, pendingClassId: null, pendingClassName: null,
  });
  await deleteDoc(doc(db, "classes", classId, "requests", req.uid));
}

/** Teacher rejects a request: clear the student's pending stamp + drop request. */
export async function rejectJoinRequest(classId: string, uid: string): Promise<void> {
  try { await updateDoc(doc(db, "users", uid), { pendingClassId: null, pendingClassName: null }); } catch { /* best-effort */ }
  await deleteDoc(doc(db, "classes", classId, "requests", uid));
}

// ── Grade export (formatted CSV, client-side) ───────────────────────────────
function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a gradebook CSV for a class: one row per student, with each grading
 * topic's score/outOf, %, and mastery, plus an average. Fetches each student's
 * teacher-entered grades (`getStudentGrades`) — the only real grades.
 */
export async function buildClassGradesCsv(className: string, roster: RosterEntry[]): Promise<string> {
  const rows = await Promise.all(roster.map(async (s) => ({ s, ...(await getStudentGrades(s.uid)) })));

  const header = ["Student", "Email", ...GRADE_TOPICS.flatMap((t) => [t, `${t} %`, `${t} Mastery`]), "Average %"];
  const lines: (string | number)[][] = [header];

  for (const { s, grades, mastery } of rows) {
    const cells: (string | number)[] = [s.name ?? "", s.email ?? ""];
    const pcts: number[] = [];
    for (const t of GRADE_TOPICS) {
      const g = grades[t];
      if (g && g.outOf) {
        const pct = Math.round((g.score / g.outOf) * 100);
        pcts.push(pct);
        cells.push(`${g.score}/${g.outOf}`, pct, mastery[t] ?? "");
      } else {
        cells.push("", "", mastery[t] ?? "");
      }
    }
    cells.push(pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : "");
    lines.push(cells);
  }

  // Title row + header so the file reads well when opened directly.
  const title = `AlcheMix gradebook — ${className}`;
  return [[title], [], ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Trigger a client-side CSV download (BOM so Excel reads UTF-8 correctly). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

/**
 * A class notice. Lives on the class doc exactly like quizzes/missions, so the
 * same Firestore rules apply (owning teacher writes; `allow get` lets the
 * enrolled student read). Pinned notices sort to the top on the student side.
 */
export interface AnnouncementDef {
  id: string;
  /** The notice body (plain text). */
  body: string;
  /** Pinned notices show first on the student's Assignments page. */
  pinned?: boolean;
  /** Epoch millis (serverTimestamp can't live inside array elements). */
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
  { id: "solutions", label: "The Elixir Bench", route: "/solutions", practiceKey: "solutions" },
  { id: "thermo", label: "Cauldron of Heat", route: "/thermo", practiceKey: "thermo" },
  { id: "rates", label: "Reaction Rates", route: "/rates", practiceKey: "rates" },
  { id: "equilibrium", label: "Equilibrium", route: "/equilibrium", practiceKey: "equilibrium" },
  { id: "electro", label: "The Voltaic Forge", route: "/electro", practiceKey: "electro" },
  { id: "forces", label: "Invisible Bonds", route: "/forces", practiceKey: "forces" },
  { id: "grimoire", label: "The Grimoire (cards)", route: "/cards", practiceKey: "grimoire" },
  { id: "identifier", label: "Element Identifier (mobile)", route: "/identifier", practiceKey: "identifier" },
  { id: "scanner", label: "AR Scanner (mobile)", route: "/scanner", practiceKey: "scanner" },
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
  const [announcements, setAnnouncements] = useState<AnnouncementDef[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!classId) { setQuizzes([]); setMissions([]); setAnnouncements([]); setClassName(null); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(doc(db, "classes", classId), (snap) => {
      const data = snap.data();
      setQuizzes(((data?.quizzes as QuizDef[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt));
      setMissions(((data?.missions as MissionDef[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt));
      // Pinned first, then newest — the order both the teacher and student see.
      setAnnouncements(
        ((data?.announcements as AnnouncementDef[]) ?? [])
          .slice()
          .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt),
      );
      setClassName((data?.name as string) ?? null);
      setLoading(false);
    }, (err) => { console.error("useClassAssignments:", err); setLoading(false); });
  }, [classId]);
  return { quizzes, missions, announcements, className, loading };
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

/** Create or update a class notice. Pinned flag omitted (not stored) when false. */
export async function saveAnnouncement(classId: string, a: AnnouncementDef): Promise<void> {
  const clean: AnnouncementDef = {
    id: a.id,
    body: a.body.trim(),
    createdAt: a.createdAt,
    ...(a.pinned ? { pinned: true } : {}),
  };
  await upsertClassArrayItem(classId, "announcements", clean);
}

export async function deleteAnnouncement(classId: string, id: string): Promise<void> {
  await removeClassArrayItem(classId, "announcements", id);
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

// ── Engagement aggregates (Overview / Daily Starters / Collections) ──────────

/** Local YYYY-MM-DD key — matches the format starters write to `lastDay`. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whether a student's Starters streak is live today, lapsed, or never begun. */
export type StreakState = "today" | "yesterday" | "lapsed" | "none";
export function starterStreakState(
  streak: StudentProfile["starterStreak"],
  today = todayKey(),
): StreakState {
  if (!streak || streak.count <= 0 || !streak.lastDay) return "none";
  if (streak.lastDay === today) return "today";
  const yesterday = todayKey(new Date(Date.parse(`${today}T12:00:00`) - 86_400_000));
  if (streak.lastDay === yesterday) return "yesterday";
  return "lapsed";
}

/** Count of rostered students active today (by their last-activity timestamp). */
export function activeTodayCount(profiles: (StudentProfile | null)[], today = todayKey()): number {
  return profiles.filter((p) => {
    const ms = lastActiveMillis(p?.practice);
    return ms != null && todayKey(new Date(ms)) === today;
  }).length;
}

/** Students with no recorded activity in the last `days` days (idle watch). */
export function idleStudents(
  profiles: StudentSnapshot[],
  days = 7,
  now = Date.now(),
): StudentSnapshot[] {
  const cutoff = now - days * 86_400_000;
  return profiles.filter((s) => {
    const ms = lastActiveMillis(s.data?.practice);
    return ms == null || ms < cutoff;
  });
}

/** Roster-wide tally of each mastery level across every graded topic. */
export function masteryTally(profiles: (StudentProfile | null)[]): Record<Mastery, number> {
  const tally: Record<Mastery, number> = { "not-started": 0, developing: 0, proficient: 0, mastered: 0 };
  for (const p of profiles) {
    for (const level of Object.values(p?.mastery ?? {})) {
      if (level in tally) tally[level as Mastery] += 1;
    }
  }
  return tally;
}

/** Class collection totals — cards scanned, compounds forged, forged variants. */
export interface CollectionTotals { cards: number; compounds: number; forged: number }
export function classCollectionTotals(profiles: (StudentProfile | null)[]): CollectionTotals {
  return profiles.reduce<CollectionTotals>(
    (acc, p) => ({
      cards: acc.cards + (p?.grimoire?.length ?? 0),
      compounds: acc.compounds + (p?.compounds?.length ?? 0),
      forged: acc.forged + (p?.forged?.length ?? 0),
    }),
    { cards: 0, compounds: 0, forged: 0 },
  );
}

/** Most-forged compound formulas across the roster, commonest first. */
export function topForgedCompounds(
  profiles: (StudentProfile | null)[],
  n = 8,
): { formula: string; count: number }[] {
  const byFormula: Record<string, number> = {};
  for (const p of profiles) {
    for (const f of p?.compounds ?? []) byFormula[f] = (byFormula[f] ?? 0) + 1;
  }
  return Object.entries(byFormula)
    .map(([formula, count]) => ({ formula, count }))
    .sort((a, b) => b.count - a.count || a.formula.localeCompare(b.formula))
    .slice(0, n);
}
