import { arrayRemove, arrayUnion, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/**
 * Module visibility — the curator's live switchboard.
 *
 * `config/modules` holds `hidden: string[]` (route paths). Every student
 * shell subscribes and filters its navigation (rail, contents, mobile sheet,
 * pager) in real time; the /modules curator page toggles entries. Reads are
 * public; writes are admin-only (see firestore.rules).
 */

const ref = () => doc(db, "config", "modules");

/**
 * TEMP (owner curation, 2026-09-09): chapters hidden in code until their
 * modules are ready — The Study, Advanced Labs, Prove Your Craft, and the
 * Arcade. Remove entries here to bring them back. Applied on top of (union
 * with) the live config/modules doc.
 */
export const MANUAL_HIDDEN_ROUTES = new Set<string>([
  // II · The Study
  "/study",
  // IV · Advanced Labs
  "/gas-laws", "/solutions", "/thermo", "/rates", "/equilibrium", "/electro", "/titration", "/decay",
  // V · Prove Your Craft
  "/quiz",
  // The Arcade
  "/duel", "/duels", "/table-game", "/leaderboard", "/shop",
]);

export function useHiddenModules() {
  const [hidden, setHidden] = useState<Set<string>>(new Set(MANUAL_HIDDEN_ROUTES));
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onSnapshot(
        ref(),
        (snap) => {
          const arr = (snap.data()?.hidden as string[] | undefined) ?? [];
          setHidden(new Set([...MANUAL_HIDDEN_ROUTES, ...arr]));
          setLoading(false);
        },
        (err) => {
          // Fail open: a read error must never blank the whole navigation.
          console.warn("module visibility read failed:", err);
          setLoading(false);
        },
      ),
    [],
  );

  return { hidden, loading };
}

/** Hide or show one module. Returns false when the write was rejected. */
export async function setModuleHidden(to: string, hide: boolean): Promise<boolean> {
  try {
    await setDoc(ref(), { hidden: hide ? arrayUnion(to) : arrayRemove(to) }, { merge: true });
    return true;
  } catch (err) {
    console.error("setModuleHidden failed:", err);
    return false;
  }
}
