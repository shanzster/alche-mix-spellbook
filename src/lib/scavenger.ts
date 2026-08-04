/**
 * AI Scavenger Hunt — data + Firestore layer.
 *
 * The student picks an element, photographs something in their home that
 * contains it, and the AI (or, while keyless, their teacher) verifies it.
 * Submissions are stored under `users/{uid}/evidence/{autoId}` per
 * Free-Ai-Implementation-Tutorial.MD §5.
 */
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AISource } from "./ai";

// ── The findable elements ─────────────────────────────────────────────────────
export interface ScavengerElement {
  symbol: string;
  name: string;
  number: number;
  color: string;
  nucleus: string;
  /** One-line nudge shown under the mission. */
  hint: string;
  /** Concrete household sources — grounds both the student and the AI. */
  examples: string[];
}

/** Elements a student can realistically find at home, with real-world sources. */
export const SCAVENGER_ELEMENTS: ScavengerElement[] = [
  { symbol: "Fe", name: "Iron", number: 26, color: "#a78bfa", nucleus: "#c4b5fd",
    hint: "Look for metal that can rust.",
    examples: ["cutlery", "nails or screws", "a cast-iron pan", "anything rusty"] },
  { symbol: "Al", name: "Aluminium", number: 13, color: "#60a5fa", nucleus: "#93c5fd",
    hint: "Light, shiny, non-magnetic metal.",
    examples: ["kitchen foil", "a drink can", "a window frame"] },
  { symbol: "Cu", name: "Copper", number: 29, color: "#fb923c", nucleus: "#fdba74",
    hint: "Reddish-brown metal.",
    examples: ["electrical wire", "a coin", "water pipes"] },
  { symbol: "C", name: "Carbon", number: 6, color: "#a3a3a3", nucleus: "#d4d4d4",
    hint: "Found in everything living — and in graphite.",
    examples: ["a pencil tip (graphite)", "charcoal", "bread or pasta", "a plastic item"] },
  { symbol: "Na", name: "Sodium", number: 11, color: "#f87171", nucleus: "#fca5a5",
    hint: "Half of table salt.",
    examples: ["table salt (NaCl)", "a salty snack label"] },
  { symbol: "Cl", name: "Chlorine", number: 17, color: "#34d399", nucleus: "#86efac",
    hint: "The other half of salt — or in bleach.",
    examples: ["table salt (NaCl)", "a bleach bottle label", "pool cleaner"] },
  { symbol: "Ca", name: "Calcium", number: 20, color: "#fb923c", nucleus: "#fdba74",
    hint: "Builds bones, shells and chalk.",
    examples: ["a glass of milk", "cheese", "an eggshell", "chalk"] },
  { symbol: "O", name: "Oxygen", number: 8, color: "#f87171", nucleus: "#fca5a5",
    hint: "In the air, in water, and in rust.",
    examples: ["a glass of water", "a rusty object", "a plant"] },
  { symbol: "H", name: "Hydrogen", number: 1, color: "#60a5fa", nucleus: "#93c5fd",
    hint: "Bonded into water and most foods.",
    examples: ["a glass of water", "soap", "cooking oil"] },
  { symbol: "K", name: "Potassium", number: 19, color: "#c084fc", nucleus: "#d8b4fe",
    hint: "Rich in certain fruits.",
    examples: ["a banana", "a potato", "a salt-substitute label"] },
  { symbol: "N", name: "Nitrogen", number: 7, color: "#93c5fd", nucleus: "#bfdbfe",
    hint: "Most of the air, and in protein & fertiliser.",
    examples: ["a plant fertiliser label", "beans or eggs (protein)", "the open air"] },
  { symbol: "Mg", name: "Magnesium", number: 12, color: "#34d399", nucleus: "#6ee7b7",
    hint: "In leafy greens and supplements.",
    examples: ["spinach or kale", "a supplement label", "Epsom salt"] },
  { symbol: "S", name: "Sulfur", number: 16, color: "#facc15", nucleus: "#fde68a",
    hint: "Smelly stuff — eggs, onions, matches.",
    examples: ["an egg", "an onion or garlic", "a matchbox"] },
  { symbol: "Zn", name: "Zinc", number: 30, color: "#94a3b8", nucleus: "#cbd5e1",
    hint: "In batteries, sunscreen and galvanised metal.",
    examples: ["a battery", "sunscreen", "a galvanised nail"] },
  { symbol: "Sn", name: "Tin", number: 50, color: "#a8b3c4", nucleus: "#cbd5e1",
    hint: "Coats 'tin' cans and solder.",
    examples: ["a food can", "solder on electronics"] },
  { symbol: "Au", name: "Gold", number: 79, color: "#fbbf24", nucleus: "#fde68a",
    hint: "Precious metal — check for jewellery.",
    examples: ["a gold ring or chain", "gold-coloured jewellery"] },
];

export function scavengerElement(symbol: string): ScavengerElement | undefined {
  return SCAVENGER_ELEMENTS.find((e) => e.symbol === symbol);
}

/** The mission prompt sent to the AI (and shown to the student). */
export function buildMissionQuestion(el: ScavengerElement): string {
  return (
    `Find and photograph an object in your home that contains the element ` +
    `${el.name} (${el.symbol}). Common sources include: ${el.examples.join(", ")}. ` +
    `Does the photo plausibly show something containing ${el.name}?`
  );
}

// ── Image helper: downscale a captured frame so it fits a Firestore doc ────────
/**
 * Draws an image (from a data URL or File) onto a canvas, shrinks it to
 * `maxDim`, and returns both a displayable data URL and the raw base64 Gemini
 * wants (no `data:` prefix). Keeps evidence docs well under the 1 MB limit.
 */
export async function downscaleImage(
  source: string | File,
  maxDim = 720,
  quality = 0.6,
): Promise<{ dataUrl: string; base64: string }> {
  const src = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "" };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(src);
  }
}

// ── Firestore: evidence entries ───────────────────────────────────────────────
export interface EvidenceEntry {
  id: string;
  element: string;
  elementName: string;
  answer: string;
  question: string;
  image?: string; // displayable data URL
  correct: boolean;
  confidence: number;
  feedback: string;
  needsManualReview: boolean;
  source: AISource;
  /** Set by a teacher who manually reviews a fallback submission. */
  teacherApproved?: boolean;
  createdAt?: Timestamp | null;
}

export interface SubmitEvidenceInput {
  element: string;
  elementName: string;
  answer: string;
  question: string;
  image?: string;
  correct: boolean;
  confidence: number;
  feedback: string;
  needsManualReview: boolean;
  source: AISource;
}

/** Persist one scavenger-hunt submission and bump the student's counters. */
export async function submitEvidence(
  uid: string,
  entry: SubmitEvidenceInput,
): Promise<void> {
  await addDoc(collection(db, "users", uid, "evidence"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
  // Best-effort progress counters — never a grade (mirrors logPractice).
  try {
    await updateDoc(doc(db, "users", uid), {
      "practice.scavenger": increment(1),
      ...(entry.correct ? { "practice.scavengerVerified": increment(1) } : {}),
      "practice.lastActiveAt": serverTimestamp(),
    });
  } catch {
    /* counter is non-critical */
  }
}

// ── Teacher side: review inbox ────────────────────────────────────────────────
export interface TeacherEvidenceEntry extends EvidenceEntry {
  studentUid: string;
  studentName: string | null;
}

/** True when a submission is still waiting on a human decision. */
export function isPendingReview(e: EvidenceEntry): boolean {
  return e.needsManualReview && e.teacherApproved == null;
}

/**
 * Live class-wide evidence feed for a teacher: one snapshot per rostered student,
 * merged and sorted newest-first. (Small classes → a handful of listeners.)
 */
export function useClassEvidence(
  roster: { uid: string; name: string | null; email: string | null }[],
) {
  const [entries, setEntries] = useState<TeacherEvidenceEntry[]>([]);
  const rosterKey = roster.map((r) => r.uid).join(",");

  useEffect(() => {
    if (roster.length === 0) {
      setEntries([]);
      return;
    }
    const byUid: Record<string, TeacherEvidenceEntry[]> = {};
    const flatten = () =>
      setEntries(
        Object.values(byUid)
          .flat()
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
          ),
      );

    const unsubs = roster.map((s) => {
      const q = query(
        collection(db, "users", s.uid, "evidence"),
        orderBy("createdAt", "desc"),
        limit(30),
      );
      return onSnapshot(
        q,
        (snap) => {
          byUid[s.uid] = snap.docs.map(
            (d) =>
              ({
                id: d.id,
                studentUid: s.uid,
                studentName: s.name ?? s.email,
                ...(d.data() as Omit<EvidenceEntry, "id">),
              }) as TeacherEvidenceEntry,
          );
          flatten();
        },
        (err) => console.error("useClassEvidence snapshot error:", err),
      );
    });
    return () => unsubs.forEach((u) => u());
    // Re-subscribe only when the set of students changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  return entries;
}

/** Teacher approves or rejects a pending (or any) evidence submission. */
export async function reviewEvidence(
  studentUid: string,
  evidenceId: string,
  approved: boolean,
): Promise<void> {
  await updateDoc(doc(db, "users", studentUid, "evidence", evidenceId), {
    teacherApproved: approved,
    reviewedAt: serverTimestamp(),
  });
}

/** Live subscription to a student's most recent evidence submissions. */
export function useEvidence(uid: string | null, max = 12) {
  const [entries, setEntries] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "users", uid, "evidence"),
      orderBy("createdAt", "desc"),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EvidenceEntry));
        setLoading(false);
      },
      (err) => {
        console.error("useEvidence snapshot error:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, max]);

  return { entries, loading };
}
