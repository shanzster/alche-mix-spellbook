/**
 * Database backup / restore — the super admin's "Data & Backups" surface.
 *
 * What it does (all from the client, as the seeded super admin):
 *  - EXPORT: read the readable top-level collections into a Timestamp-safe JSON
 *    payload the admin can download and keep off-site.
 *  - VERSION MACHINE: store each backup's metadata (+ the payload inline when it
 *    fits under the 1 MB Firestore doc cap) in `backups/{id}`, newest-first, so
 *    there is a restorable history.
 *  - IMPORT / ROLLBACK: write a payload back, doc by doc, where the rules allow.
 *
 * Honest limits (client SDK + Firestore rules — documented in the UI too):
 *  - `schools` round-trips fully (admin may create/update/delete).
 *  - `users` / `classes` / `verifications` restore as MERGE updates to docs that
 *    still exist. The rules forbid the client from *recreating* a deleted user
 *    or class doc (that needs a server with the Admin SDK), so those are skipped
 *    and counted, never silently dropped.
 *  - `auditLog` is backup-only (append-only, tamper-evident — never restored).
 */
import { useEffect, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit as fbLimit,
  onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { logAudit } from "./audit";

export const BACKUP_VERSION = 1;
/** Firestore docs cap at 1 MB; keep inline payloads comfortably under it. */
export const SNAPSHOT_INLINE_LIMIT = 700_000;

export interface BackupCollectionMeta {
  name: string;
  label: string;
  /** Can a restore write this collection back from the client? */
  restorable: boolean;
  note?: string;
}

/** The collections the super admin can read — the backup surface. */
export const BACKUP_COLLECTIONS: BackupCollectionMeta[] = [
  { name: "schools", label: "Schools", restorable: true },
  { name: "users", label: "Users (profiles)", restorable: true, note: "deleted profiles can't be recreated from the client" },
  { name: "classes", label: "Classes", restorable: true, note: "deleted classes can't be recreated from the client" },
  { name: "verifications", label: "Verifications", restorable: true, note: "image-heavy — grows the backup" },
  { name: "auditLog", label: "Audit log", restorable: false, note: "append-only — backup only, never restored" },
];

/** Default export selection — the core identity/tenancy data, no heavy images. */
export const DEFAULT_BACKUP = ["schools", "users", "classes"];
/** Collections a restore is allowed to write back. */
export const RESTORABLE_COLLECTIONS = BACKUP_COLLECTIONS.filter((c) => c.restorable).map((c) => c.name);

export interface BackupDoc { id: string; data: Record<string, unknown>; }
export interface BackupPayload {
  version: number;
  app: "alchemix";
  createdAt: string; // ISO
  collections: Record<string, BackupDoc[]>;
}

// ── Timestamp-safe (de)serialisation ────────────────────────────────────────
// Firestore Timestamps don't JSON round-trip cleanly, so we encode them to a
// sentinel ({__ts__:[seconds,nanoseconds]}) on the way out and revive them to
// real Timestamps on the way back in — no fidelity loss, plain JSON on disk.
const TS = "__ts__";

function encode(v: unknown): unknown {
  if (v instanceof Timestamp) return { [TS]: [v.seconds, v.nanoseconds] };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) o[k] = encode((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}

function decode(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (Array.isArray(obj[TS])) {
      const [s, n] = obj[TS] as [number, number];
      return new Timestamp(s, n);
    }
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) o[k] = decode(obj[k]);
    return o;
  }
  return v;
}

export function serializeBackup(p: BackupPayload): string {
  return JSON.stringify(p, null, 2);
}

export function parseBackup(text: string): BackupPayload {
  const raw = JSON.parse(text) as Partial<BackupPayload>;
  if (!raw || raw.app !== "alchemix" || typeof raw.collections !== "object" || raw.collections == null) {
    throw new Error("That doesn't look like an AlcheMix backup file.");
  }
  return raw as BackupPayload;
}

// ── Export ──────────────────────────────────────────────────────────────────
async function readDocs(name: string): Promise<BackupDoc[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, data: encode(d.data()) as Record<string, unknown> }));
}

/** Read the chosen collections into a backup payload (Timestamps encoded). */
export async function exportDatabase(names: string[]): Promise<BackupPayload> {
  const collections: Record<string, BackupDoc[]> = {};
  for (const name of names) collections[name] = await readDocs(name);
  return { version: BACKUP_VERSION, app: "alchemix", createdAt: new Date().toISOString(), collections };
}

export function countDocs(p: BackupPayload): number {
  return Object.values(p.collections).reduce((n, arr) => n + arr.length, 0);
}

/** Trigger a browser download of a JSON string. */
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Version Machine (snapshots in `backups/{id}`) ───────────────────────────
export interface SnapshotMeta {
  id: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  createdByEmail: string | null;
  note: string;
  counts: Record<string, number>;
  totalDocs: number;
  sizeBytes: number;
  /** True when the full payload is stored inline (small enough to restore here). */
  hasPayload: boolean;
}

export async function createSnapshot(note: string, payload: BackupPayload): Promise<void> {
  const text = serializeBackup(payload);
  const sizeBytes = new Blob([text]).size;
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(payload.collections)) counts[k] = v.length;
  const hasPayload = sizeBytes <= SNAPSHOT_INLINE_LIMIT;
  const ref = await addDoc(collection(db, "backups"), {
    createdAt: serverTimestamp(),
    createdByEmail: auth.currentUser?.email ?? null,
    note: note.trim(),
    counts,
    totalDocs: countDocs(payload),
    sizeBytes,
    hasPayload,
    ...(hasPayload ? { payload: text } : {}),
  });
  await logAudit("backup.snapshot", { type: "item", id: ref.id, label: note.trim() || "snapshot" }, { totalDocs: countDocs(payload), sizeBytes });
}

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "backups"), orderBy("createdAt", "desc"), fbLimit(50));
    return onSnapshot(q, (snap) => {
      setSnapshots(snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          createdAt: (x.createdAt as SnapshotMeta["createdAt"]) ?? null,
          createdByEmail: (x.createdByEmail as string | null) ?? null,
          note: (x.note as string) ?? "",
          counts: (x.counts as Record<string, number>) ?? {},
          totalDocs: (x.totalDocs as number) ?? 0,
          sizeBytes: (x.sizeBytes as number) ?? 0,
          hasPayload: !!x.hasPayload,
        };
      }));
      setLoading(false);
    }, (err) => { console.error("useSnapshots:", err); setLoading(false); });
  }, []);
  return { snapshots, loading };
}

export async function getSnapshotPayload(id: string): Promise<BackupPayload> {
  const snap = await getDoc(doc(db, "backups", id));
  const text = snap.data()?.payload as string | undefined;
  if (!text) throw new Error("This snapshot was too large to keep a restorable copy. Use a downloaded backup file instead.");
  return parseBackup(text);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await deleteDoc(doc(db, "backups", id));
  await logAudit("backup.delete", { type: "item", id });
}

// ── Restore / Rollback ──────────────────────────────────────────────────────
export interface RestoreReport {
  restored: number;
  skipped: number;
  byCollection: Record<string, { restored: number; skipped: number }>;
  firstError?: string;
}

/**
 * Write a payload back, doc by doc (not batched — so a single rules-blocked
 * write skips that one doc instead of failing the whole run). MERGE by default
 * so partial docs don't clobber server-written fields. Only restorable
 * collections are touched; everything else in the payload is ignored.
 */
export async function restoreBackup(payload: BackupPayload, merge = true): Promise<RestoreReport> {
  const report: RestoreReport = { restored: 0, skipped: 0, byCollection: {} };
  for (const name of Object.keys(payload.collections)) {
    if (!RESTORABLE_COLLECTIONS.includes(name)) continue;
    const docs = payload.collections[name] ?? [];
    const cc = (report.byCollection[name] = { restored: 0, skipped: 0 });
    for (const d of docs) {
      try {
        await setDoc(doc(db, name, d.id), decode(d.data) as Record<string, unknown>, { merge });
        cc.restored++; report.restored++;
      } catch (e) {
        cc.skipped++; report.skipped++;
        if (!report.firstError) report.firstError = e instanceof Error ? e.message : String(e);
      }
    }
  }
  await logAudit("backup.restore", { type: "item", id: "restore" }, { restored: report.restored, skipped: report.skipped });
  return report;
}
