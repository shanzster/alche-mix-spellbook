import { useEffect, useState } from "react";
import {
  collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────────────────────────────────────
// SEED: the single admin account.
// I can't create a Firebase Auth user from here, so the "seed" is this
// allowlist — sign up / sign in with this email and the app grants admin.
// Change this to your real admin address (must match firestore.rules too).
// ─────────────────────────────────────────────────────────────────────────────
export const ADMIN_EMAILS = ["ramalusubov@gmail.com"];

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
  await updateDoc(doc(db, "verifications", uid), { status: "approved", reviewedAt: serverTimestamp() });
}

export async function rejectTeacher(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { status: "rejected" });
  await updateDoc(doc(db, "verifications", uid), { status: "rejected", reviewedAt: serverTimestamp() });
}
