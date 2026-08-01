import { useEffect, useState } from "react";
import {
  collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Mastery, TopicGrade } from "./profile";

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
