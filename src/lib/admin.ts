import { useEffect, useState } from "react";
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Role, StudentProfile, TeacherStatus } from "./profile";
import { logAudit } from "./audit";
import { createAuthUserWithProfile, createSchoolAdminAccount, createTeacherInvite } from "./schools";

// ─────────────────────────────────────────────────────────────────────────────
// SEED: the single admin account.
// I can't create a Firebase Auth user from here, so the "seed" is this
// allowlist — sign up / sign in with this email and the app grants admin.
// Change this to your real admin address (must match firestore.rules too).
// ─────────────────────────────────────────────────────────────────────────────
export const ADMIN_EMAILS = ["ramalusubov@gmail.com", "superadmin@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export type VerificationStatus = "submitted" | "approved" | "rejected";

export interface Verification {
  uid: string;
  name: string | null;
  email: string | null;
  idImage: string;   // downscaled JPEG data URL of the teacher's ID
  selfie: string;    // downscaled JPEG data URL of the live selfie
  status: VerificationStatus;
  /** Client-side face-match result (0–100 similarity). */
  faceMatch?: number;
  /** Whether the automated face check considered the two the same person. */
  faceMatched?: boolean;
}

// ── Image helpers — downscale to keep the Firestore doc small ───────────────
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Load an image data URL and re-encode it as a smaller JPEG. */
export function downscale(src: string, max = 720, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Teacher submits their verification ──────────────────────────────────────
export async function submitVerification(v: Omit<Verification, "status">): Promise<void> {
  await setDoc(doc(db, "verifications", v.uid), {
    ...v, status: "submitted", submittedAt: serverTimestamp(),
  });
}

export async function getVerification(uid: string): Promise<Verification | null> {
  const snap = await getDoc(doc(db, "verifications", uid));
  return snap.exists() ? (snap.data() as Verification) : null;
}

// ── Admin review ────────────────────────────────────────────────────────────
/** Live list of teacher verifications still awaiting review. */
export function usePendingVerifications() {
  const [items, setItems] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "verifications"), where("status", "==", "submitted"));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as Verification));
      setLoading(false);
    }, (err) => { console.error("usePendingVerifications:", err); setLoading(false); });
  }, []);
  return { items, loading };
}

export async function approveTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status: "approved" });
  await setDoc(doc(db, "verifications", uid), { status: "approved", reviewedAt: serverTimestamp() }, { merge: true });
  await logAudit("verification.approve", { type: "verification", id: uid });
}

export async function rejectTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status: "rejected" });
  await setDoc(doc(db, "verifications", uid), { status: "rejected", reviewedAt: serverTimestamp() }, { merge: true });
  await logAudit("verification.reject", { type: "verification", id: uid });
}

/** Set a teacher's status directly (used by the Teachers management view). */
export async function setTeacherStatus(uid: string, status: TeacherStatus): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status });
  await logAudit("teacher.setStatus", { type: "user", id: uid }, { status });
}

// ── User management (super-admin CRUD) ───────────────────────────────────────
// NOTE: grades / mastery / practice are deliberately NOT editable here — those
// are teacher-entered or system-written. A super admin may change identity,
// role, status and school assignment only.
export type AdminUserPatch = {
  role?: Role;
  status?: TeacherStatus | null;
  schoolId?: string | null;
  displayName?: string;
};

export async function updateUserAdmin(uid: string, patch: AdminUserPatch): Promise<void> {
  // Guard: never let forbidden keys through, even if a caller passes extras.
  const clean: Record<string, unknown> = {};
  if (patch.role !== undefined) clean.role = patch.role;
  if (patch.status !== undefined) clean.status = patch.status;
  if (patch.schoolId !== undefined) clean.schoolId = patch.schoolId;
  if (patch.displayName !== undefined) clean.displayName = patch.displayName;
  if (Object.keys(clean).length === 0) return;
  await updateDoc(doc(db, "users", uid), clean);
  await logAudit("user.update", { type: "user", id: uid, label: patch.displayName }, clean);
}

/**
 * Delete a user's PROFILE document (and audit it). Note: the Firebase Auth
 * credential itself cannot be removed from the client SDK — that needs the
 * Admin SDK server-side — so the account can still authenticate but will have
 * no profile. Sub-collections (e.g. evidence) are not cascaded here.
 */
export async function deleteUserProfile(uid: string, label?: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
  await logAudit("user.delete", { type: "user", id: uid, label });
}

/**
 * Create a new user account (+ profile) as the super admin. Roles:
 *  - student: created directly.
 *  - teacher: needs a school; a teacherInvite is written first (auto-approved).
 *  - school_admin: needs a school; reuses createSchoolAdminAccount.
 * (admin accounts are allowlist-seeded, not created here.)
 */
export async function createUserAdmin(input: {
  role: "student" | "teacher" | "school_admin";
  name: string;
  email: string;
  password: string;
  schoolId?: string | null;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (input.role === "school_admin") {
    if (!input.schoolId) throw new Error("A school is required for a school admin.");
    const { uid } = await createSchoolAdminAccount(input.schoolId, { name, email, password: input.password });
    return uid; // createSchoolAdminAccount already audits
  }

  if (input.role === "teacher") {
    if (!input.schoolId) throw new Error("A school is required for a teacher.");
    await createTeacherInvite(email, input.schoolId);
    const uid = await createAuthUserWithProfile(email, input.password, {
      displayName: name || email, ...(name ? { firstName: name } : {}),
      role: "teacher", status: "approved", schoolId: input.schoolId,
    });
    await logAudit("user.create", { type: "user", id: uid, label: email }, { role: "teacher", schoolId: input.schoolId });
    return uid;
  }

  // student
  const uid = await createAuthUserWithProfile(email, input.password, {
    displayName: name || email, ...(name ? { firstName: name } : {}), role: "student",
  });
  await logAudit("user.create", { type: "user", id: uid, label: email }, { role: "student" });
  return uid;
}

// ── Admin-wide data ─────────────────────────────────────────────────────────
export function useAllUsers() {
  const [users, setUsers] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => onSnapshot(collection(db, "users"), (snap) => {
    setUsers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<StudentProfile, "uid">) })));
    setLoading(false);
  }, (err) => { console.error("useAllUsers:", err); setLoading(false); }), []);
  return { users, loading };
}

export interface AdminClass { id: string; name: string; teacherId: string; teacherName?: string | null }

export function useAllClasses() {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  useEffect(() => onSnapshot(collection(db, "classes"), (snap) => {
    setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminClass, "id">) })));
  }, (err) => console.error("useAllClasses:", err)), []);
  return classes;
}
