import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { StudentProfile } from "./profile";

/**
 * The Craft — a tiered mastery ladder over the learning modules.
 *
 * A module counts as "mastered" only on real proof of understanding: its
 * Trial passed with ≥2 stars, Study topics walked to "done", compounds
 * actually forged. Practice counters deliberately do NOT count (practice ≠
 * understanding), and Arcade games are excluded (games stay in the Arcade).
 *
 * `computeCraft` derives everything from the profile's existing signals, so
 * the ladder can never drift from the truth; `syncCraft` persists the result
 * to `users/{uid}.craft` (D2) so teacher dashboards and rosters can read it
 * without re-deriving.
 */

export interface CraftDef {
  id: string;
  label: string;
  /** Proof of mastery, from existing profile signals. */
  done: (p: StudentProfile) => boolean;
}

const starsOf = (p: StudentProfile, trialId: string) => p.trials?.[trialId]?.stars ?? 0;
const trial2 = (trialId: string) => (p: StudentProfile) => starsOf(p, trialId) >= 2;

export const CRAFTS: CraftDef[] = [
  { id: "lab-safety", label: "Lab Safety", done: trial2("lab-safety") },
  { id: "atomic-builder", label: "Atomic Builder", done: trial2("atomic-builder") },
  { id: "states", label: "States of Matter", done: trial2("states") },
  {
    id: "study",
    label: "The Study",
    // Three of the five topics walked all the way to "done".
    done: (p) =>
      Object.values(p.pathProgress ?? {}).filter((t) => t.stage === "done").length >= 3,
  },
  { id: "forces", label: "Invisible Bonds", done: trial2("forces") },
  { id: "equation-balancer", label: "Equation Balancer", done: trial2("equation-balancer") },
  {
    id: "codex",
    label: "Compound Codex",
    done: (p) => (p.compounds?.length ?? 0) >= 5,
  },
  { id: "gas-laws", label: "Gas Laws", done: trial2("gas-laws") },
  { id: "solutions", label: "The Elixir Bench", done: trial2("solutions") },
  { id: "thermo", label: "Cauldron of Heat", done: trial2("thermo") },
  { id: "rates", label: "Reaction Rates", done: trial2("rates") },
  { id: "equilibrium", label: "Equilibrium", done: trial2("equilibrium") },
  { id: "electro", label: "The Voltaic Forge", done: trial2("electro") },
  { id: "titration", label: "Titration Lab", done: trial2("titration") },
  { id: "quiz", label: "3D Visual Quiz", done: trial2("quiz") },
];

/** The ranks of the craft — `at` is the mastered-count threshold. */
export const TIERS = [
  { name: "Novice", at: 0 },
  { name: "Initiate", at: 1 },
  { name: "Apprentice", at: 3 },
  { name: "Adept", at: 6 },
  { name: "Magister", at: 10 },
  { name: "Archalchemist", at: CRAFTS.length },
] as const;

export interface CraftState {
  mastered: string[];
  count: number;
  /** Index into TIERS. */
  tier: number;
}

export function computeCraft(p: StudentProfile): CraftState {
  const mastered = CRAFTS.filter((c) => c.done(p)).map((c) => c.id);
  let tier = 0;
  for (let i = 0; i < TIERS.length; i++) if (mastered.length >= TIERS[i].at) tier = i;
  return { mastered, count: mastered.length, tier };
}

/**
 * Persists the derived craft state onto the profile doc when it has changed.
 * Idempotent and best-effort — call whenever the profile loads/updates.
 */
export async function syncCraft(uid: string | null, p: StudentProfile | null): Promise<void> {
  if (!uid || !p) return;
  const next = computeCraft(p);
  const prev = p.craft;
  const same =
    prev &&
    prev.tier === next.tier &&
    prev.count === next.count &&
    [...(prev.mastered ?? [])].sort().join() === [...next.mastered].sort().join();
  if (same) return;
  try {
    await setDoc(doc(db, "users", uid), { craft: next }, { merge: true });
  } catch (err) {
    console.error("syncCraft failed:", err);
  }
}
