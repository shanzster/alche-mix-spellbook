/**
 * Audit log — an append-only record of every privileged mutation a super admin
 * (or school admin) performs: school/user/verification/class/catalogue changes.
 * Read-only in the UI; written by the mutation helpers in admin.ts / schools.ts.
 *
 * Writes are BEST-EFFORT: a failed audit write (e.g. a permissions hiccup) must
 * never break the action that triggered it, so `logAudit` swallows its errors.
 *
 * Firestore (deploy rules): `auditLog/{autoId}` — create by admin/school-admin,
 * read by super admin only, never updated or deleted (tamper-evident).
 */
import { useEffect, useState } from "react";
import {
  addDoc, collection, limit as fbLimit, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface AuditTarget {
  type: "school" | "user" | "verification" | "class" | "card" | "item";
  id: string;
  label?: string;
}

export interface AuditEntry {
  id: string;
  at?: { seconds: number; nanoseconds: number } | null;
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, unknown>;
}

/**
 * Record one privileged action. `action` is a dotted verb like "school.create"
 * or "user.delete". Never throws — callers can `await` it without a try/catch.
 */
export async function logAudit(
  action: string,
  target?: AuditTarget,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const u = auth.currentUser;
    await addDoc(collection(db, "auditLog"), {
      at: serverTimestamp(),
      actorUid: u?.uid ?? "unknown",
      actorEmail: u?.email ?? null,
      action,
      ...(target ? { targetType: target.type, targetId: target.id, targetLabel: target.label ?? null } : {}),
      ...(details ? { details } : {}),
    });
  } catch (err) {
    console.warn("[audit] write failed (non-fatal):", action, err);
  }
}

/** Live, newest-first slice of the audit log. */
export function useAuditLog(max = 100) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "auditLog"), orderBy("at", "desc"), fbLimit(max));
    return onSnapshot(
      q,
      (snap) => { setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, "id">) }))); setLoading(false); },
      (err) => { console.error("useAuditLog:", err); setLoading(false); },
    );
  }, [max]);
  return { entries, loading };
}
