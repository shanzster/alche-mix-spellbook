import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isAdminEmail } from "./admin";
import { resolveSchoolAdminInvite, resolveTeacherInvite } from "./schools";

/**
 * Ensure a Firestore student profile exists for the given user.
 * - First time (sign-up): creates `users/{uid}` with identity + gamification /
 *   progress defaults derived from the Student Requirements.
 * - Returning user (sign-in): only refreshes `lastLoginAt`, never clobbers data.
 *
 * Writes are best-effort: a Firestore hiccup must not block authentication, so
 * failures are logged and swallowed rather than thrown.
 */
type Role = "student" | "teacher" | "school_admin" | "admin";

type NameParts = { firstName?: string; middleName?: string; lastName?: string; schoolName?: string };

export async function ensureUserProfile(user: User, opts?: { role?: Role; schoolId?: string; names?: NameParts }): Promise<void> {
  try {
    const admin = isAdminEmail(user.email);
    // Designations set by a super admin (school admin) or a school admin (teacher).
    const invitedSchoolId = admin ? null : await resolveSchoolAdminInvite(user.email);
    const invitedTeacherSchoolId = admin || invitedSchoolId ? null : await resolveTeacherInvite(user.email);
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const role: Role = admin ? "admin"
        : invitedSchoolId ? "school_admin"
        : invitedTeacherSchoolId ? "teacher"
        : (opts?.role ?? "student");
      const schoolId = invitedSchoolId ?? invitedTeacherSchoolId ?? opts?.schoolId ?? null;
      const n = opts?.names;
      const composed = n ? [n.firstName, n.lastName].map((s) => s?.trim()).filter(Boolean).join(" ") : "";
      await setDoc(ref, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: composed || user.displayName || null,
        ...(n?.firstName ? { firstName: n.firstName.trim() } : {}),
        ...(n?.middleName ? { middleName: n.middleName.trim() } : {}),
        ...(n?.lastName ? { lastName: n.lastName.trim() } : {}),
        ...(n?.schoolName ? { schoolName: n.schoolName.trim() } : {}),
        photoURL: user.photoURL ?? null,
        role,
        ...(schoolId ? { schoolId } : {}),
        // A teacher provisioned by their school admin is approved outright; any
        // legacy self-signup teacher stays pending.
        ...(role === "teacher" ? { status: invitedTeacherSchoolId ? "approved" : "pending" } : {}),
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        // ── Learning progress (§5) — grades & mastery are entered by the
        //    teacher on the educator side; students only read them. ──
        grades: {},
        mastery: {},
        // ── App-recorded practice engagement (counts only, not a grade) ──
        practice: {},
      });
    } else {
      const data = snap.data() as { role?: string; schoolId?: string };
      const promoteAdmin = admin && data.role !== "admin";
      const promoteSchoolAdmin = !admin && !!invitedSchoolId && data.role !== "admin" && data.role !== "school_admin";
      const promoteTeacher = !admin && !invitedSchoolId && !!invitedTeacherSchoolId
        && (data.role == null || data.role === "student");
      await updateDoc(ref, {
        lastLoginAt: serverTimestamp(),
        ...(promoteAdmin ? { role: "admin" } : {}),
        ...(promoteSchoolAdmin ? { role: "school_admin", schoolId: invitedSchoolId } : {}),
        ...(promoteTeacher ? { role: "teacher", schoolId: invitedTeacherSchoolId, status: "approved" } : {}),
      });
    }
  } catch (err) {
    console.error("ensureUserProfile failed:", err);
  }
}

export async function signUpWithEmail(
  email: string, password: string, role: Role = "student",
  extra?: { schoolId?: string; names?: NameParts },
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(result.user, { role, schoolId: extra?.schoolId, names: extra?.names });
  return result.user;
}

/** Send a Firebase password-reset email. Throws with an `auth/*` code on failure. */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  // Refresh lastLoginAt (and self-heal a missing profile for older accounts).
  await ensureUserProfile(result.user);
  return result.user;
}

/** Reads the signed-in user's role from their profile doc. Best-effort. */
export async function fetchRole(uid: string): Promise<Role | undefined> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as { role?: Role }).role : undefined;
  } catch {
    return undefined;
  }
}

/** Where each role lands after signing in. */
export function homeForRole(role?: Role): "/admin" | "/school" | "/teacher" | "/app" {
  return role === "admin" ? "/admin"
    : role === "school_admin" ? "/school"
    : role === "teacher" ? "/teacher"
    : "/app";
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export { auth };
export type { User };
