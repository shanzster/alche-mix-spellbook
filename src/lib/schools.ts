import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp,
  query, where, limit, onSnapshot, arrayUnion, getFirestore, Timestamp,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";
import { db, firebaseConfig } from "./firebase";
import { logAudit } from "./audit";

/**
 * Schools — the multi-tenant layer (see docs/SCHOOL_MULTITENANCY.md).
 * A super admin creates schools and designates their school admins; the school
 * code onboards teachers. Students still join a specific class (not here).
 */

export interface School {
  id: string;
  name: string;
  /** 6-char shareable SCHOOL code — onboards teachers into this school. */
  code: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  /** Emails designated as this school's admins (set by the super admin). */
  adminEmails?: string[];
  /** Emails provisioned as this school's teachers (set by the school admin). */
  teacherEmails?: string[];
  createdBy?: string;
  active?: boolean;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — unambiguous
function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

async function uniqueSchoolCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const snap = await getDocs(query(collection(db, "schools"), where("code", "==", code), limit(1)));
    if (snap.empty) return code;
  }
  return randomCode(8);
}

export async function createSchool(input: {
  name: string; logoUrl?: string | null; brandColor?: string | null; createdBy: string;
}): Promise<School> {
  const code = await uniqueSchoolCode();
  const ref = doc(collection(db, "schools"));
  const school: School = {
    id: ref.id, name: input.name, code,
    logoUrl: input.logoUrl ?? null, brandColor: input.brandColor ?? null,
    adminEmails: [], createdBy: input.createdBy, active: true,
  };
  await setDoc(ref, { ...school, createdAt: serverTimestamp() });
  return school;
}

export function useSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "schools"),
      (snap) => { setSchools(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<School, "id">) }))); setLoading(false); },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { schools, loading };
}

export async function getSchool(id: string): Promise<School | null> {
  const snap = await getDoc(doc(db, "schools", id));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<School, "id">) } : null;
}

export async function updateSchool(
  id: string,
  patch: Partial<Pick<School, "name" | "logoUrl" | "brandColor" | "active">>,
): Promise<void> {
  await updateDoc(doc(db, "schools", id), patch);
  await logAudit("school.update", { type: "school", id, label: patch.name }, patch);
}

/** Permanently delete a school doc. Does NOT cascade — teachers/classes keep
 *  their now-dangling schoolId; reassign them first if that matters. */
export async function deleteSchool(id: string, name?: string): Promise<void> {
  await deleteDoc(doc(db, "schools", id));
  await logAudit("school.delete", { type: "school", id, label: name });
}

export async function regenerateSchoolCode(id: string): Promise<string> {
  const code = await uniqueSchoolCode();
  await updateDoc(doc(db, "schools", id), { code });
  await logAudit("school.regenerateCode", { type: "school", id }, { code });
  return code;
}

/** Resolve a school by its shareable code (teacher onboarding, Phase 3). */
export async function resolveSchoolByCode(code: string): Promise<School | null> {
  const snap = await getDocs(query(collection(db, "schools"), where("code", "==", code.toUpperCase()), limit(1)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<School, "id">) };
}

// ── Migration / backfill (Phase 5) ──────────────────────────────────────────
// Stamps pre-multi-tenant teachers and classes into a single "Default School"
// so nothing is orphaned when isolation turns on. Super-admin only (rules).
export async function backfillIntoDefaultSchool(superUid: string): Promise<{ school: School; teachers: number; classes: number }> {
  const existing = await getDocs(query(collection(db, "schools"), where("name", "==", "Default School"), limit(1)));
  const school: School = existing.empty
    ? await createSchool({ name: "Default School", createdBy: superUid })
    : { id: existing.docs[0].id, ...(existing.docs[0].data() as Omit<School, "id">) };

  let teachers = 0;
  const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
  for (const d of usersSnap.docs) {
    if (!(d.data() as { schoolId?: string }).schoolId) { await updateDoc(d.ref, { schoolId: school.id }); teachers++; }
  }

  let classes = 0;
  const classesSnap = await getDocs(collection(db, "classes"));
  for (const d of classesSnap.docs) {
    if (!(d.data() as { schoolId?: string }).schoolId) { await updateDoc(d.ref, { schoolId: school.id }); classes++; }
  }

  return { school, teachers, classes };
}

// ── School-admin designation ────────────────────────────────────────────────
// The super admin designates an email as a school's admin. When that email
// signs in, `ensureUserProfile` promotes them (see auth.ts). No secondary-auth
// hack needed — the person creates their own credentials.

function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export async function createSchoolAdmin(email: string, schoolId: string): Promise<void> {
  const key = emailKey(email);
  await setDoc(doc(db, "schoolAdminInvites", key), { email: key, schoolId, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "schools", schoolId), { adminEmails: arrayUnion(key) });
}

/**
 * Create the school admin's ACTUAL account (email + password + name) from the
 * super admin's console — not merely an email invite. Because the web SDK's
 * `createUserWithEmailAndPassword` would hijack the caller's own session, the
 * new account is created on a SECONDARY Firebase app (its own auth state), then
 * signed out and torn down. The super admin stays signed in throughout.
 *
 * Flow: (1) write the designation (invite doc + school.adminEmails) as the super
 * admin so the Firestore rules will allow the new user to self-write a
 * school_admin profile; (2) on the secondary app, create the auth user and,
 * AS that user, write their `users/{uid}` profile.
 */
/**
 * Create a Firebase Auth account on a THROWAWAY secondary app (so the caller's
 * own session is untouched) and write its `users/{uid}` profile AS that new
 * user. The caller must have already written whatever invite doc the create
 * rule needs (teacherInvites / schoolAdminInvites) for non-student roles.
 * Returns the new uid.
 */
export async function createAuthUserWithProfile(
  email: string,
  password: string,
  profile: Record<string, unknown> & { displayName?: string },
): Promise<string> {
  const key = emailKey(email);
  const secondary = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
  try {
    const secAuth = getAuth(secondary);
    const secDb = getFirestore(secondary);
    const cred = await createUserWithEmailAndPassword(secAuth, key, password);
    if (profile.displayName) {
      try { await updateProfile(cred.user, { displayName: String(profile.displayName) }); } catch { /* non-fatal */ }
    }
    await setDoc(doc(secDb, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: key,
      photoURL: null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      grades: {},
      mastery: {},
      practice: {},
      ...profile,
    });
    await fbSignOut(secAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}

export async function createSchoolAdminAccount(
  schoolId: string,
  input: { name: string; email: string; password: string },
): Promise<{ uid: string; email: string }> {
  const key = emailKey(input.email);
  const name = input.name.trim();

  // 1 ── Designate (super-admin-privileged writes) so the create rule allows it.
  await createSchoolAdmin(key, schoolId);
  // 2 ── Create the real account + profile on a throwaway secondary app.
  const uid = await createAuthUserWithProfile(key, input.password, {
    displayName: name || key,
    ...(name ? { firstName: name } : {}),
    role: "school_admin",
    schoolId,
  });
  await logAudit("schoolAdmin.create", { type: "user", id: uid, label: key }, { schoolId });
  return { uid, email: key };
}

/**
 * Create a school AND its first admin account in one step (the super admin's
 * "New school" flow). The school's shareable code is generated by `createSchool`.
 */
export async function createSchoolWithAdmin(input: {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  createdBy: string;
}): Promise<{ school: School; adminUid: string }> {
  const school = await createSchool({
    name: input.schoolName, logoUrl: input.logoUrl, brandColor: input.brandColor, createdBy: input.createdBy,
  });
  await logAudit("school.create", { type: "school", id: school.id, label: school.name }, { code: school.code });
  const { uid } = await createSchoolAdminAccount(school.id, {
    name: input.adminName, email: input.adminEmail, password: input.adminPassword,
  });
  return { school, adminUid: uid };
}

/**
 * Create a TEACHER's account (name + email + password) from the school-admin
 * console — the full account, not an email invite. The teacher is bound to the
 * school (schoolId + schoolCode embedded) and auto-approved, and a class is
 * auto-created so they have a shareable join code from day one. Students who
 * enter that code are grouped with this teacher. Runs on a throwaway secondary
 * app so the school admin's own session is untouched.
 */
export async function createTeacherAccount(
  schoolId: string,
  input: { name: string; email: string; password: string },
  schoolCode?: string,
): Promise<{ uid: string; email: string; classCode: string }> {
  const key = emailKey(input.email);
  const name = input.name.trim();

  // Designate so the create rule lets the new user self-write a teacher profile.
  await createTeacherInvite(key, schoolId);

  const secondary = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
  try {
    const secAuth = getAuth(secondary);
    const secDb = getFirestore(secondary);
    const cred = await createUserWithEmailAndPassword(secAuth, key, input.password);
    const uid = cred.user.uid;
    if (name) { try { await updateProfile(cred.user, { displayName: name }); } catch { /* non-fatal */ } }

    await setDoc(doc(secDb, "users", uid), {
      uid, email: key,
      displayName: name || key,
      ...(name ? { firstName: name } : {}),
      role: "teacher",
      status: "approved",
      schoolId,
      ...(schoolCode ? { schoolCode } : {}),
      photoURL: null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      grades: {}, mastery: {}, practice: {},
    });

    // Auto-create the teacher's class (as the teacher) so the join code is
    // "embedded" from day one — the class is stamped with the school.
    let classCode = randomCode();
    for (let i = 0; i < 5; i++) {
      const existing = await getDoc(doc(secDb, "classes", classCode));
      if (!existing.exists()) break;
      classCode = randomCode();
    }
    await setDoc(doc(secDb, "classes", classCode), {
      name: name ? `${name}'s Class` : "Class",
      teacherId: uid,
      teacherName: name || null,
      createdAt: serverTimestamp(),
      joinCode: classCode,
      joinCodeExpiresAt: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
      archived: false,
      schoolId,
    });

    await fbSignOut(secAuth);
    await logAudit("teacher.create", { type: "user", id: uid, label: key }, { schoolId, classCode });
    return { uid, email: key, classCode };
  } finally {
    await deleteApp(secondary);
  }
}

// ── Classes in a school (for the school-admin console: show each teacher's code) ──
export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  joinCodeExpiresAt?: Timestamp | null;
  archived?: boolean;
}

export function useSchoolClasses(schoolId: string | undefined) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  useEffect(() => {
    if (!schoolId) { setClasses([]); return; }
    const q = query(collection(db, "classes"), where("schoolId", "==", schoolId));
    return onSnapshot(
      q,
      (snap) => setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolClass, "id">) }))),
      (err) => console.error("useSchoolClasses:", err),
    );
  }, [schoolId]);
  return classes;
}

// ── Teacher roster for a school (populated once teachers carry schoolId, Phase 3) ──
export interface SchoolTeacher {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  status?: string;
}

export function useSchoolTeachers(schoolId: string | undefined) {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!schoolId) { setTeachers([]); setLoading(false); return; }
    setLoading(true);
    const q = query(collection(db, "users"), where("schoolId", "==", schoolId), where("role", "==", "teacher"));
    const unsub = onSnapshot(
      q,
      (snap) => { setTeachers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<SchoolTeacher, "uid">) }))); setLoading(false); },
      () => setLoading(false),
    );
    return unsub;
  }, [schoolId]);
  return { teachers, loading };
}

/** Returns the schoolId this email is designated to admin, or null. */
export async function resolveSchoolAdminInvite(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, "schoolAdminInvites", emailKey(email)));
    return snap.exists() ? ((snap.data() as { schoolId?: string }).schoolId ?? null) : null;
  } catch {
    return null;
  }
}

// ── Teacher provisioning (school admin creates teacher accounts) ─────────────
// Teachers do NOT self-register — a school admin invites them by email; when
// that email signs in, `ensureUserProfile` promotes it to an approved teacher.
export async function createTeacherInvite(email: string, schoolId: string): Promise<void> {
  const key = emailKey(email);
  await setDoc(doc(db, "teacherInvites", key), { email: key, schoolId, createdAt: serverTimestamp() });
  await updateDoc(doc(db, "schools", schoolId), { teacherEmails: arrayUnion(key) });
}

/** Returns the schoolId this email is provisioned to teach at, or null. */
export async function resolveTeacherInvite(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  try {
    const snap = await getDoc(doc(db, "teacherInvites", emailKey(email)));
    return snap.exists() ? ((snap.data() as { schoolId?: string }).schoolId ?? null) : null;
  } catch {
    return null;
  }
}
