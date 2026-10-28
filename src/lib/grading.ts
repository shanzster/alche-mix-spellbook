/**
 * DepEd K-12 weighted grading — the "automatic grade computation" engine.
 *
 * A teacher enters raw scores per student (got X out of a "highest possible").
 * The system computes, per quarter:
 *   - each component's Percentage Score (PS) = ΣrawScores / Σhighest × 100
 *   - each component's Weighted Score (WS)    = PS × weight%
 *   - Initial Grade = Σ WS  (weights renormalised over defined components)
 *   - Quarterly Grade = transmute(Initial) via the DepEd table (floor 60)
 * and the Final Grade = average of the available quarterly grades.
 *
 * Config (component weights + the list of score items per quarter) lives on the
 * class doc at `classes/{id}.grading`. Each student's raw marks live on their
 * own user doc at `users/{uid}.weightedScores[classId][quarter][itemId]`.
 */
import { useEffect, useState } from "react";
import { deleteField, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { StudentProfile } from "./profile";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
export const QUARTER_LABEL: Record<Quarter, string> = {
  Q1: "1st Quarter", Q2: "2nd Quarter", Q3: "3rd Quarter", Q4: "4th Quarter",
};

export type ComponentKey = "ww" | "pt" | "qa";
export const COMPONENTS: { key: ComponentKey; label: string; short: string }[] = [
  { key: "ww", label: "Written Work", short: "WW" },
  { key: "pt", label: "Performance Tasks", short: "PT" },
  { key: "qa", label: "Quarterly Assessment", short: "QA" },
];

/** Passing grade and the lowest grade that can appear (DepEd). */
export const PASS = 75;
export const GRADE_FLOOR = 60;

export interface GradeItem {
  id: string;
  label: string;
  /** Highest possible score for this item. */
  total: number;
  /** Optional topic tag → powers "weak in this type of thing" analytics. */
  topic?: string;
}

export type QuarterItems = Record<ComponentKey, GradeItem[]>;
export interface Weights { ww: number; pt: number; qa: number }

export interface GradingConfig {
  weights: Weights;
  items: Record<Quarter, QuarterItems>;
}

export const DEFAULT_WEIGHTS: Weights = { ww: 40, pt: 40, qa: 20 };

function emptyQuarterItems(): QuarterItems {
  return { ww: [], pt: [], qa: [] };
}
export function defaultGradingConfig(): GradingConfig {
  return {
    weights: { ...DEFAULT_WEIGHTS },
    items: { Q1: emptyQuarterItems(), Q2: emptyQuarterItems(), Q3: emptyQuarterItems(), Q4: emptyQuarterItems() },
  };
}

/** Tolerate partial/old config docs by filling in any missing pieces. */
export function normalizeConfig(raw: Partial<GradingConfig> | undefined | null): GradingConfig {
  const base = defaultGradingConfig();
  if (!raw) return base;
  const weights = { ...base.weights, ...(raw.weights ?? {}) };
  const items = { ...base.items } as Record<Quarter, QuarterItems>;
  for (const q of QUARTERS) {
    const qi = raw.items?.[q];
    items[q] = {
      ww: qi?.ww ?? [], pt: qi?.pt ?? [], qa: qi?.qa ?? [],
    };
  }
  return { weights, items };
}

// ── Computation ──────────────────────────────────────────────────────────────

export interface ComponentResult {
  key: ComponentKey;
  label: string;
  rawTotal: number;
  highestTotal: number;
  /** Percentage Score, 0–100, or null if the component has no items. */
  ps: number | null;
  weight: number;
  /** Weighted Score contribution to the initial grade, or null. */
  ws: number | null;
}

export interface QuarterResult {
  components: ComponentResult[];
  /** Initial (pre-transmutation) grade, or null if no component has items. */
  initial: number | null;
  /** Transmuted quarterly grade (60–100), or null. */
  grade: number | null;
  /** True once every component has at least one item (a "complete" quarter). */
  complete: boolean;
}

type ScoreMap = Record<string, number>; // itemId → raw score

function componentResult(key: ComponentKey, label: string, items: GradeItem[], scores: ScoreMap, weight: number): ComponentResult {
  if (items.length === 0) return { key, label, rawTotal: 0, highestTotal: 0, ps: null, weight, ws: null };
  let raw = 0, highest = 0;
  for (const it of items) {
    highest += it.total;
    const v = scores[it.id];
    if (typeof v === "number" && !Number.isNaN(v)) raw += v;
  }
  const ps = highest > 0 ? (raw / highest) * 100 : 0;
  return { key, label, rawTotal: raw, highestTotal: highest, ps, weight, ws: null };
}

/**
 * The official DepEd Order 8 s.2015 transmutation table, as a function.
 * 60–100 initial → 75–100 (width 1.6 per grade); below 60 → 60–74 (width 4).
 */
export function transmute(initial: number): number {
  if (initial >= 100) return 100;
  if (initial >= GRADE_FLOOR) return Math.min(100, 75 + Math.floor((initial - GRADE_FLOOR) / 1.6));
  return Math.max(GRADE_FLOOR, GRADE_FLOOR + Math.floor(initial / 4));
}

/** Compute a full quarter breakdown for one student. */
export function computeQuarter(config: GradingConfig, quarter: Quarter, scores: ScoreMap): QuarterResult {
  const qi = config.items[quarter];
  const comps = COMPONENTS.map((c) => componentResult(c.key, c.label, qi[c.key], scores, config.weights[c.key]));
  const defined = comps.filter((c) => c.ps !== null);
  const complete = comps.every((c) => config.items[quarter][c.key].length > 0);

  if (defined.length === 0) {
    return { components: comps, initial: null, grade: null, complete: false };
  }
  // Renormalise weights across the components that actually have items so a
  // running grade is meaningful before all three components exist.
  const weightSum = defined.reduce((s, c) => s + c.weight, 0) || 1;
  let initial = 0;
  for (const c of comps) {
    if (c.ps === null) continue;
    c.ws = (c.ps * c.weight) / weightSum;
    initial += c.ws;
  }
  return { components: comps, initial, grade: transmute(initial), complete };
}

/** Pull one student's score map for a class+quarter from their profile. */
export function scoresFor(profile: StudentProfile | null | undefined, classId: string, quarter: Quarter): ScoreMap {
  return profile?.weightedScores?.[classId]?.[quarter] ?? {};
}

/** Every quarter's grade + the final (average of the quarters that have grades). */
export function computeAllQuarters(config: GradingConfig, profile: StudentProfile | null | undefined, classId: string) {
  const quarters: Record<Quarter, QuarterResult> = {} as Record<Quarter, QuarterResult>;
  const grades: number[] = [];
  for (const q of QUARTERS) {
    const r = computeQuarter(config, q, scoresFor(profile, classId, q));
    quarters[q] = r;
    if (r.grade !== null) grades.push(r.grade);
  }
  const final = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
  return { quarters, final };
}

// ── Firestore: config on the class doc ───────────────────────────────────────

export function useGradingConfig(classId: string | null | undefined) {
  const [config, setConfig] = useState<GradingConfig>(() => defaultGradingConfig());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!classId) { setConfig(defaultGradingConfig()); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(doc(db, "classes", classId), (snap) => {
      setConfig(normalizeConfig((snap.data()?.grading as Partial<GradingConfig>) ?? null));
      setLoading(false);
    }, (err) => { console.error("useGradingConfig:", err); setLoading(false); });
  }, [classId]);
  return { config, loading };
}

export async function saveGradingConfig(classId: string, config: GradingConfig): Promise<void> {
  await updateDoc(doc(db, "classes", classId), { grading: config });
}

export async function setWeights(classId: string, config: GradingConfig, weights: Weights): Promise<void> {
  await saveGradingConfig(classId, { ...config, weights });
}

export async function addGradeItem(classId: string, config: GradingConfig, quarter: Quarter, component: ComponentKey, item: GradeItem): Promise<void> {
  const next = normalizeConfig(config);
  next.items[quarter] = { ...next.items[quarter], [component]: [...next.items[quarter][component], item] };
  await saveGradingConfig(classId, next);
}

export async function updateGradeItem(classId: string, config: GradingConfig, quarter: Quarter, component: ComponentKey, item: GradeItem): Promise<void> {
  const next = normalizeConfig(config);
  next.items[quarter] = { ...next.items[quarter], [component]: next.items[quarter][component].map((x) => (x.id === item.id ? item : x)) };
  await saveGradingConfig(classId, next);
}

export async function removeGradeItem(classId: string, config: GradingConfig, quarter: Quarter, component: ComponentKey, itemId: string): Promise<void> {
  const next = normalizeConfig(config);
  next.items[quarter] = { ...next.items[quarter], [component]: next.items[quarter][component].filter((x) => x.id !== itemId) };
  await saveGradingConfig(classId, next);
}

export function newItemId(prefix: ComponentKey): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Firestore: per-student raw scores on the user doc ────────────────────────

/** Write (or clear, when raw is null) one student's raw mark for an item. */
export async function setStudentScore(uid: string, classId: string, quarter: Quarter, itemId: string, raw: number | null): Promise<void> {
  const path = `weightedScores.${classId}.${quarter}.${itemId}`;
  await updateDoc(doc(db, "users", uid), { [path]: raw === null ? deleteField() : raw });
}
