import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isAdminEmail } from "./admin";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Ensure a Firestore student profile exists for the given user.
 * - First time (sign-up): creates `users/{uid}` with identity + gamification /
 *   progress defaults derived from the Student Requirements.
 * - Returning user (sign-in): only refreshes `lastLoginAt`, never clobbers data.
 *
 * Writes are best-effort: a Firestore hiccup must not block authentication, so
 * failures are logged and swallowed rather than thrown.
 */
type Role = "student" | "teacher" | "admin";

export async function ensureUserProfile(user: User, opts?: { role?: Role }): Promise<void> {
  try {
    const admin = isAdminEmail(user.email);
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const role: Role = admin ? "admin" : (opts?.role ?? "student");
      await setDoc(ref, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        role,
        // Teachers must be approved by an admin before they can teach.
        ...(role === "teacher" ? { status: "pending" } : {}),
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
      // Promote the seeded admin email if it isn't marked admin yet.
      const isAdminRole = (snap.data() as { role?: string }).role === "admin";
      await updateDoc(ref, {
        lastLoginAt: serverTimestamp(),
        ...(admin && !isAdminRole ? { role: "admin" } : {}),
      });
    }
  } catch (err) {
    console.error("ensureUserProfile failed:", err);
  }
}

export async function signInWithGoogle(role?: Role) {
  const result = await signInWithPopup(auth, googleProvider);
  // Google sign-in doubles as sign-up, so ensure the profile either way.
  await ensureUserProfile(result.user, role ? { role } : undefined);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string, role: Role = "student") {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(result.user, { role });
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  // Refresh lastLoginAt (and self-heal a missing profile for older accounts).
  await ensureUserProfile(result.user);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export { auth };
export type { User };
