import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, Settings2, Plus, Trash2, X, Download, SlidersHorizontal,
  TableProperties, GraduationCap, AlertTriangle, Sparkles, Loader2, Lightbulb,
} from "lucide-react";
import { useRoster, useClassProfiles, GRADE_TOPICS, type ClassInfo, type StudentSnapshot } from "../lib/teacher";
import { useAI } from "../lib/useAI";
import type { ClassInsightsInput, ClassInsightsResult } from "../lib/ai";
import {
  QUARTERS, QUARTER_LABEL, COMPONENTS, PASS, DEFAULT_WEIGHTS,
  useGradingConfig, computeQuarter, computeAllQuarters, scoresFor,
  setStudentScore, addGradeItem, removeGradeItem, setWeights, newItemId,
  type Quarter, type ComponentKey, type GradingConfig, type GradeItem,
} from "../lib/grading";

const ACCENT = "var(--color-emerald-elixir)";
const INPUT =
  "w-full rounded-lg px-2.5 py-2 text-sm text-spectral placeholder:text-parchment/30 outline-none " +
  "bg-[color-mix(in_oklab,var(--color-mist)_78%,transparent)] " +
  "border border-[color-mix(in_oklab,var(--color-parchment)_20%,transparent)] " +
  "focus:border-[color-mix(in_oklab,var(--color-emerald-elixir)_55%,transparent)]";

/** Grade → colour: pass (≥75) teal, fail crimson, none muted. */
function gradeColor(g: number | null): string {
  if (g === null) return "var(--color-parchment)";
  return g >= PASS ? "var(--color-emerald-elixir)" : "var(--color-crimson)";
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
      style={active
        ? { background: `color-mix(in oklab, ${ACCENT} 16%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 38%, transparent)` }
        : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
      {children}
    </button>
  );
}

export function WeightedGradebook({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  useEffect(() => {
    if (!classId || !classes.some((c) => c.id === classId)) setClassId(classes[0]?.id ?? null);
  }, [classes, classId]);

  const roster = useRoster(classId);
  const { students, loading } = useClassProfiles(roster);
  const { config } = useGradingConfig(classId);
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const [view, setView] = useState<"enter" | "record" | "insights" | "setup">("enter");
  const [preview, setPreview] = useState<StudentSnapshot | null>(null);

  const sorted = useMemo(() => [...students].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")), [students]);

  if (classes.length === 0) {
    return (
      <div className="glass rounded-2xl px-5 py-14 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ color: ACCENT, background: `color-mix(in oklab, ${ACCENT} 12%, transparent)` }}><ClipboardCheck className="h-5 w-5" /></span>
        <h3 className="font-display text-lg">No classes yet</h3>
        <p className="font-serif text-sm text-parchment/65">Create a class first, then come back to record grades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Class + quarter + view controls */}
      <div className="flex flex-wrap items-center gap-2">
        {classes.map((c) => <Pill key={c.id} active={c.id === classId} onClick={() => setClassId(c.id)}>{c.name}</Pill>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {QUARTERS.map((q) => <Pill key={q} active={q === quarter} onClick={() => setQuarter(q)}>{q}</Pill>)}
        </div>
        <div className="flex items-center gap-1.5">
          <ViewTab icon={ClipboardCheck} label="Enter grades" active={view === "enter"} onClick={() => setView("enter")} />
          <ViewTab icon={TableProperties} label="Class record" active={view === "record"} onClick={() => setView("record")} />
          <ViewTab icon={Sparkles} label="Insights" active={view === "insights"} onClick={() => setView("insights")} />
          <ViewTab icon={Settings2} label="Setup" active={view === "setup"} onClick={() => setView("setup")} />
        </div>
      </div>

      {view === "setup" && classId && <SetupPanel classId={classId} config={config} quarter={quarter} />}
      {view === "insights" && classId && (
        <Insights className={classes.find((c) => c.id === classId)?.name ?? "Class"} classId={classId} config={config} students={sorted} loading={loading} />
      )}
      {view === "enter" && classId && (
        <EnterGrid classId={classId} config={config} quarter={quarter} students={sorted} loading={loading} onPreview={setPreview} />
      )}
      {view === "record" && classId && (
        <ClassRecord classId={classId} config={config} students={sorted} loading={loading} onPreview={setPreview} />
      )}

      {preview && classId && (
        <StudentReport student={preview} classId={classId} config={config} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function ViewTab({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
      style={active ? { background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`, color: ACCENT } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
      <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Grade entry grid ─────────────────────────────────────────────────────────
function ScoreCell({ uid, classId, quarter, item, stored }: { uid: string; classId: string; quarter: Quarter; item: GradeItem; stored: number | undefined }) {
  // When unfocused, the input DISPLAYS the stored value directly (the source of
  // truth) — no effect copies it into local state, so a cleared/edited cell can't
  // flash the old value back before the write round-trips, and a failed write
  // honestly reflects the unchanged stored value. Local `val` is only the live
  // keystroke buffer while the cell is focused.
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused ? val : (stored?.toString() ?? "");

  const commit = async () => {
    const t = val.trim();
    if (t === "") { if (stored !== undefined) await setStudentScore(uid, classId, quarter, item.id, null); return; }
    let n = Number(t);
    if (Number.isNaN(n)) return; // revert handled by display falling back to stored
    n = Math.max(0, Math.min(item.total, Math.round(n * 100) / 100));
    if (n !== stored) await setStudentScore(uid, classId, quarter, item.id, n);
  };

  const over = focused && val !== "" && Number(val) > item.total;
  return (
    <input
      inputMode="decimal"
      value={display}
      onFocus={() => { setVal(stored?.toString() ?? ""); setFocused(true); }}
      onBlur={() => { setFocused(false); void commit(); }}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="h-9 w-14 rounded-md text-center text-sm text-spectral outline-none transition"
      style={{
        background: "color-mix(in oklab, var(--color-mist) 70%, transparent)",
        border: `1px solid ${over ? "var(--color-crimson)" : "color-mix(in oklab, var(--color-parchment) 18%, transparent)"}`,
      }}
      aria-label={`${item.label} score out of ${item.total}`}
    />
  );
}

function EnterGrid({ classId, config, quarter, students, loading, onPreview }: {
  classId: string; config: GradingConfig; quarter: Quarter; students: StudentSnapshot[]; loading: boolean; onPreview: (s: StudentSnapshot) => void;
}) {
  const qi = config.items[quarter];
  const anyItems = COMPONENTS.some((c) => qi[c.key].length > 0);

  if (!anyItems) {
    return (
      <div className="glass rounded-2xl px-5 py-12 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ color: ACCENT, background: `color-mix(in oklab, ${ACCENT} 12%, transparent)` }}><SlidersHorizontal className="h-5 w-5" /></span>
        <h3 className="font-display text-lg">No score columns for {QUARTER_LABEL[quarter]} yet</h3>
        <p className="font-serif text-sm text-parchment/65">Open <span className="font-semibold text-spectral">Setup</span> and add Written Work / Performance Task / Quarterly Assessment items. Grades compute automatically as you enter scores.</p>
      </div>
    );
  }
  if (loading) return <p className="py-8 text-center text-sm text-parchment/60">Loading roster…</p>;
  if (students.length === 0) return <p className="py-8 text-center text-sm text-parchment/60">No students enrolled in this class yet.</p>;

  return (
    <div className="glass overflow-x-auto rounded-2xl p-2 sm:p-3">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          {/* component group header */}
          <tr>
            <th className="sticky left-0 z-10 bg-[color-mix(in_oklab,var(--color-card)_92%,transparent)] px-3 pb-1 pt-2 text-left" />
            {COMPONENTS.map((c) => qi[c.key].length > 0 && (
              <th key={c.key} colSpan={qi[c.key].length} className="px-2 pb-1 pt-2 text-center text-[10px] uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
                {c.short} · {config.weights[c.key]}%
              </th>
            ))}
            <th className="px-2 pb-1 pt-2" />
          </tr>
          <tr className="text-[10px] uppercase tracking-[0.1em] text-parchment/50">
            <th className="sticky left-0 z-10 bg-[color-mix(in_oklab,var(--color-card)_92%,transparent)] px-3 pb-2 text-left font-medium">Student</th>
            {COMPONENTS.flatMap((c) => qi[c.key].map((it) => (
              <th key={it.id} className="px-1 pb-2 text-center font-medium" title={it.label}>
                <div className="truncate max-w-[56px] mx-auto">{it.label}</div>
                <div className="text-parchment/35">/{it.total}</div>
              </th>
            )))}
            <th className="px-2 pb-2 text-center font-medium">Grade</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const scores = scoresFor(s.data, classId, quarter);
            const res = computeQuarter(config, quarter, scores);
            return (
              <tr key={s.uid} className="border-t" style={{ borderColor: "color-mix(in oklab, var(--color-spectral) 8%, transparent)" }}>
                <td className="sticky left-0 z-10 bg-[color-mix(in_oklab,var(--color-card)_92%,transparent)] px-3 py-1.5">
                  <button onClick={() => onPreview(s)} className="truncate text-left text-sm font-medium text-spectral transition hover:text-teal">{s.name ?? "—"}</button>
                </td>
                {COMPONENTS.flatMap((c) => qi[c.key].map((it) => (
                  <td key={it.id} className="px-1 py-1.5 text-center">
                    <ScoreCell uid={s.uid} classId={classId} quarter={quarter} item={it} stored={scores[it.id]} />
                  </td>
                )))}
                <td className="px-2 py-1.5 text-center">
                  <span className="font-ui text-base font-bold tabular-nums" style={{ color: gradeColor(res.grade) }}>{res.grade ?? "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Class record (all quarters + final) ──────────────────────────────────────
function csvCell(s: unknown) { const v = s == null ? "" : String(s); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

function ClassRecord({ classId, config, students, loading, onPreview }: {
  classId: string; config: GradingConfig; students: StudentSnapshot[]; loading: boolean; onPreview: (s: StudentSnapshot) => void;
}) {
  const rows = useMemo(() => students.map((s) => ({ s, ...computeAllQuarters(config, s.data, classId) })), [students, config, classId]);
  const quarterAvg = (q: Quarter) => {
    const vals = rows.map((r) => r.quarters[q].grade).filter((g): g is number => g !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const finals = rows.map((r) => r.final).filter((g): g is number => g !== null);
  const classAvg = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
  const passing = finals.filter((g) => g >= PASS).length;

  const exportCsv = () => {
    const header = ["Student", ...QUARTERS, "Final", "Remarks"];
    const lines = [header.join(",")].concat(rows.map((r) =>
      [r.s.name ?? "", ...QUARTERS.map((q) => r.quarters[q].grade ?? ""), r.final ?? "", r.final === null ? "" : r.final >= PASS ? "Passed" : "Failed"].map(csvCell).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `alchemix-grades-${classId}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <p className="py-8 text-center text-sm text-parchment/60">Loading grades…</p>;
  if (students.length === 0) return <p className="py-8 text-center text-sm text-parchment/60">No students enrolled yet.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>Class avg <b className="tabular-nums" style={{ color: gradeColor(classAvg) }}>{classAvg ?? "—"}</b></span>
          <span className="rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>Passing <b className="text-teal tabular-nums">{passing}</b>/{rows.length}</span>
          <span className="rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>At risk <b className="tabular-nums" style={{ color: "var(--color-crimson)" }}>{finals.filter((g) => g < PASS).length}</b></span>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: ACCENT }}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="glass overflow-x-auto rounded-2xl p-2 sm:p-3">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-parchment/50">
              <th className="px-3 pb-2 text-left font-medium">Student</th>
              {QUARTERS.map((q) => <th key={q} className="px-2 pb-2 text-center font-medium">{q}</th>)}
              <th className="px-2 pb-2 text-center font-medium">Final</th>
              <th className="px-2 pb-2 text-center font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.uid} className="border-t" style={{ borderColor: "color-mix(in oklab, var(--color-spectral) 8%, transparent)" }}>
                <td className="px-3 py-2">
                  <button onClick={() => onPreview(r.s)} className="text-left text-sm font-medium text-spectral transition hover:text-teal">{r.s.name ?? "—"}</button>
                </td>
                {QUARTERS.map((q) => (
                  <td key={q} className="px-2 py-2 text-center font-ui font-semibold tabular-nums" style={{ color: gradeColor(r.quarters[q].grade) }}>{r.quarters[q].grade ?? "—"}</td>
                ))}
                <td className="px-2 py-2 text-center font-ui text-base font-bold tabular-nums" style={{ color: gradeColor(r.final) }}>{r.final ?? "—"}</td>
                <td className="px-2 py-2 text-center">
                  {r.final === null ? <span className="text-parchment/30">—</span> : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: gradeColor(r.final), background: `color-mix(in oklab, ${gradeColor(r.final)} 12%, transparent)` }}>
                      {r.final >= PASS ? "Passed" : "Failed"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t-2" style={{ borderColor: "color-mix(in oklab, var(--color-spectral) 14%, transparent)" }}>
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-parchment/55">Class average</td>
              {QUARTERS.map((q) => <td key={q} className="px-2 py-2 text-center font-ui font-bold tabular-nums" style={{ color: gradeColor(quarterAvg(q)) }}>{quarterAvg(q) ?? "—"}</td>)}
              <td className="px-2 py-2 text-center font-ui font-bold tabular-nums" style={{ color: gradeColor(classAvg) }}>{classAvg ?? "—"}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Per-student report card (preview) ────────────────────────────────────────
export function StudentReport({ student, classId, config, onClose }: { student: StudentSnapshot; classId: string; config: GradingConfig; onClose: () => void }) {
  const { quarters, final } = computeAllQuarters(config, student.data, classId);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="glass-strong relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 scroll-slim">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, var(--color-gold))` }}>{(student.name?.[0] ?? "?").toUpperCase()}</span>
            <div>
              <h3 className="font-display text-xl leading-tight">{student.name ?? "Student"}</h3>
              <p className="text-xs text-parchment/55">Report card · all quarters</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-ui text-3xl font-bold leading-none tabular-nums" style={{ color: gradeColor(final) }}>{final ?? "—"}</div>
              <div className="text-[10px] uppercase tracking-wide text-parchment/50">Final grade</div>
            </div>
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/70 transition hover:bg-wraith/10 hover:text-spectral"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-3">
          {QUARTERS.map((q) => {
            const r = quarters[q];
            return (
              <div key={q} className="rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-parchment/60">{QUARTER_LABEL[q]}</p>
                  <span className="font-ui text-lg font-bold tabular-nums" style={{ color: gradeColor(r.grade) }}>{r.grade ?? "—"}</span>
                </div>
                {r.initial === null ? (
                  <p className="text-xs text-parchment/45">No scores entered yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {r.components.map((c) => (
                      <div key={c.key} className="rounded-lg px-2.5 py-2 text-center" style={{ border: "1px solid var(--color-border)" }}>
                        <p className="text-[10px] uppercase tracking-wide text-parchment/50">{COMPONENTS.find((x) => x.key === c.key)?.short} · {c.weight}%</p>
                        {c.ps === null ? <p className="mt-1 text-sm text-parchment/35">—</p> : (
                          <>
                            <p className="mt-1 font-ui text-sm font-bold tabular-nums text-spectral">{c.ps.toFixed(1)}%</p>
                            <p className="text-[10px] text-parchment/45 tabular-nums">{c.rawTotal}/{c.highestTotal} · WS {c.ws?.toFixed(1)}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {r.initial !== null && (
                  <p className="mt-2 text-[11px] text-parchment/50">Initial grade <span className="tabular-nums text-parchment/75">{r.initial.toFixed(2)}</span> → transmuted <span className="tabular-nums font-semibold" style={{ color: gradeColor(r.grade) }}>{r.grade}</span></p>
                )}
              </div>
            );
          })}
        </div>

        {final !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: `color-mix(in oklab, ${gradeColor(final)} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${gradeColor(final)} 30%, transparent)` }}>
            {final >= PASS ? <GraduationCap className="h-5 w-5" style={{ color: gradeColor(final) }} /> : <AlertTriangle className="h-5 w-5" style={{ color: gradeColor(final) }} />}
            <span className="text-sm">
              <span className="font-semibold" style={{ color: gradeColor(final) }}>{final >= PASS ? "Passing" : "At risk — below 75"}</span>
              <span className="text-parchment/70"> · final grade {final}, averaged over {QUARTERS.filter((q) => quarters[q].grade !== null).length} quarter(s).</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Setup: weights + score items ─────────────────────────────────────────────
function SetupPanel({ classId, config, quarter }: { classId: string; config: GradingConfig; quarter: Quarter }) {
  const weightSum = config.weights.ww + config.weights.pt + config.weights.qa;
  return (
    <div className="space-y-5">
      {/* Weights */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-lg"><SlidersHorizontal className="h-4 w-4 text-teal" /> Component weights</h3>
        <p className="mb-4 text-xs text-parchment/55">DepEd default is 40 / 40 / 20. These apply to every quarter in this class and must total 100%.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPONENTS.map((c) => (
            <label key={c.key} className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-parchment/60">{c.label}</span>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={config.weights[c.key]}
                  onChange={(e) => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)); void setWeights(classId, config, { ...config.weights, [c.key]: v }); }}
                  className={INPUT} />
                <span className="text-sm text-parchment/50">%</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className={weightSum === 100 ? "text-teal" : "text-crimson"}>Total: {weightSum}%{weightSum !== 100 ? " — should be 100%" : " ✓"}</span>
          {weightSum !== 100 && (
            <button onClick={() => void setWeights(classId, config, { ...DEFAULT_WEIGHTS })} className="text-parchment/60 underline transition hover:text-spectral">reset to 40/40/20</button>
          )}
        </div>
      </div>

      {/* Items for the selected quarter */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-lg"><TableProperties className="h-4 w-4 text-teal" /> Score items · {QUARTER_LABEL[quarter]}</h3>
        <p className="mb-4 text-xs text-parchment/55">Add the assessments you'll grade this quarter. Each has a highest-possible score; the grade computes automatically from the raw marks you enter.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {COMPONENTS.map((c) => <ItemColumn key={c.key} classId={classId} config={config} quarter={quarter} component={c.key} />)}
        </div>
      </div>
    </div>
  );
}

// ── Insights (analytics + AI narrative) ─────────────────────────────────────
type CompAcc = Record<ComponentKey, { raw: number; high: number }>;
function newCompAcc(): CompAcc { return { ww: { raw: 0, high: 0 }, pt: { raw: 0, high: 0 }, qa: { raw: 0, high: 0 } }; }

/** Build the ClassInsightsInput from live gradebook data (entered scores only). */
function buildInsights(className: string, classId: string, config: GradingConfig, students: StudentSnapshot[]): ClassInsightsInput {
  const rows = students.map((s) => ({ name: s.name ?? "Student", ...computeAllQuarters(config, s.data, classId), snap: s }));
  const finals = rows.map((r) => r.final).filter((g): g is number => g !== null);
  const classAverage = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
  const passing = finals.filter((g) => g >= PASS).length;

  const quarterAverages = QUARTERS.map((q) => {
    const vals = rows.map((r) => r.quarters[q].grade).filter((g): g is number => g !== null);
    return { quarter: q, average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });

  // Component + topic health from ENTERED raw scores only (fair while a quarter
  // is still being filled in).
  const classComp = newCompAcc();
  const topicAcc: Record<string, { raw: number; high: number }> = {};
  const perStudentComp: Record<string, CompAcc> = {};
  for (const r of rows) {
    const sc = perStudentComp[r.snap.uid] = newCompAcc();
    for (const q of QUARTERS) {
      for (const comp of COMPONENTS) {
        for (const it of config.items[q][comp.key]) {
          const v = scoresFor(r.snap.data, classId, q)[it.id];
          if (typeof v !== "number") continue;
          classComp[comp.key].raw += v; classComp[comp.key].high += it.total;
          sc[comp.key].raw += v; sc[comp.key].high += it.total;
          if (it.topic) { const t = topicAcc[it.topic] ?? { raw: 0, high: 0 }; t.raw += v; t.high += it.total; topicAcc[it.topic] = t; }
        }
      }
    }
  }
  const pct = (a: { raw: number; high: number }) => (a.high > 0 ? Math.round((a.raw / a.high) * 100) : null);
  const componentAverages = COMPONENTS.map((c) => ({ component: c.label, average: pct(classComp[c.key]) }));
  const topicAverages = Object.entries(topicAcc).filter(([, a]) => a.high > 0).map(([topic, a]) => ({ topic, average: Math.round((a.raw / a.high) * 100) }));

  const studentsOut = rows.map((r) => {
    const acc = perStudentComp[r.snap.uid];
    let weakest: string | null = null, worst = Infinity;
    for (const c of COMPONENTS) { const p = pct(acc[c.key]); if (p !== null && p < worst) { worst = p; weakest = c.label; } }
    return { name: r.name, final: r.final, weakestComponent: weakest };
  });

  return { className, passMark: PASS, classAverage, passing, total: rows.length, quarterAverages, componentAverages, topicAverages, students: studentsOut };
}

function Bar({ label, value, suffix = "%" }: { label: string; value: number | null; suffix?: string }) {
  const v = value ?? 0;
  const color = value === null ? "var(--color-parchment)" : v >= 75 ? "var(--color-emerald-elixir)" : v >= 50 ? "var(--color-gold)" : "var(--color-crimson)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-parchment/70">{label}</span>
        <span className="font-ui font-semibold tabular-nums" style={{ color }}>{value === null ? "—" : `${v}${suffix}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--color-spectral) 10%, transparent)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, v)}%`, background: color }} />
      </div>
    </div>
  );
}

function Insights({ className, classId, config, students, loading }: {
  className: string; classId: string; config: GradingConfig; students: StudentSnapshot[]; loading: boolean;
}) {
  const ai = useAI();
  const [result, setResult] = useState<ClassInsightsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const input = useMemo(() => buildInsights(className, classId, config, students), [className, classId, config, students]);
  const hasData = input.students.some((s) => s.final !== null) || input.componentAverages.some((c) => c.average !== null);

  const generate = async () => {
    setBusy(true); setErr("");
    try { setResult(await ai.classInsights(input)); }
    catch { setErr("Couldn't generate insights. Please try again."); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="py-8 text-center text-sm text-parchment/60">Loading…</p>;
  if (!hasData) {
    return (
      <div className="glass rounded-2xl px-5 py-12 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ color: ACCENT, background: `color-mix(in oklab, ${ACCENT} 12%, transparent)` }}><Sparkles className="h-5 w-5" /></span>
        <h3 className="font-display text-lg">Nothing to analyse yet</h3>
        <p className="font-serif text-sm text-parchment/65">Enter some grades first — insights appear once there are scores to read.</p>
      </div>
    );
  }

  const atRiskCount = input.students.filter((s) => s.final !== null && s.final < PASS).length;

  return (
    <div className="space-y-5">
      {/* Computed stat cards (always available, no AI needed) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Class average", value: input.classAverage, color: gradeColor(input.classAverage) },
          { label: "Passing", value: `${input.passing}/${input.total}`, color: "var(--color-emerald-elixir)" },
          { label: "At risk", value: atRiskCount, color: atRiskCount ? "var(--color-crimson)" : "var(--color-parchment)" },
          { label: "Students", value: input.total, color: "var(--color-wraith)" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="font-ui text-2xl font-bold leading-none tabular-nums" style={{ color: s.color }}>{s.value ?? "—"}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-parchment/55">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-display text-lg">Component health</h3>
          <div className="space-y-3">
            {input.componentAverages.map((c) => <Bar key={c.component} label={c.component} value={c.average} />)}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-1 font-display text-lg">Quarter trend</h3>
          <p className="mb-4 text-xs text-parchment/55">Average transmuted grade per quarter.</p>
          <div className="space-y-3">
            {input.quarterAverages.map((q) => <Bar key={q.quarter} label={q.quarter} value={q.average} suffix="" />)}
          </div>
        </div>
      </div>

      {input.topicAverages.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-display text-lg">Weak spots by topic</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...input.topicAverages].sort((a, b) => a.average - b.average).map((t) => <Bar key={t.topic} label={t.topic} value={t.average} />)}
          </div>
          <p className="mt-3 text-[11px] text-parchment/45">Tag score items with a topic in Setup to grow this breakdown.</p>
        </div>
      )}

      {/* AI narrative */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-display text-lg"><Lightbulb className="h-4 w-4 text-gold" /> Analysis &amp; recommendations</h3>
          <button onClick={generate} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: ACCENT }}>
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…</> : <><Sparkles className="h-3.5 w-3.5" /> {result ? "Regenerate" : "Generate insights"}</>}
          </button>
        </div>
        {err && <p className="mt-3 text-xs text-crimson">{err}</p>}

        {!result && !busy && (
          <p className="mt-3 text-sm text-parchment/60">Generate a written analysis of this class — weakest areas, who's at risk of failing, and what to do next. {ai.configured === false && "(AI key not set — you'll get a rule-based summary from the same numbers.)"}</p>
        )}

        {result && (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={result.source === "gemini"
                  ? { color: "var(--color-wraith)", background: "color-mix(in oklab, var(--color-wraith) 14%, transparent)" }
                  : { color: "var(--color-parchment)", background: "color-mix(in oklab, var(--color-parchment) 12%, transparent)" }}>
                {result.source === "gemini" ? "✦ AI" : "rule-based"}
              </span>
              <p className="flex-1 font-serif text-sm leading-relaxed text-parchment/85">{result.summary}</p>
            </div>

            {result.weakAreas.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">Weakest areas</p>
                <div className="space-y-2">
                  {result.weakAreas.map((w, i) => (
                    <div key={i} className="rounded-xl px-3.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-gold) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 25%, transparent)" }}>
                      <p className="text-sm font-semibold text-gold">{w.area}</p>
                      <p className="text-xs text-parchment/70">{w.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.atRisk.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">At risk of failing ({result.atRisk.length})</p>
                <div className="space-y-1.5">
                  {result.atRisk.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 22%, transparent)" }}>
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-crimson" />
                      <div><p className="text-sm font-semibold text-spectral">{a.name}</p><p className="text-xs text-parchment/70">{a.reason}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">Recommendations</p>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-parchment/80"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: ACCENT }} /> {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemColumn({ classId, config, quarter, component }: { classId: string; config: GradingConfig; quarter: Quarter; component: ComponentKey }) {
  const meta = COMPONENTS.find((c) => c.key === component)!;
  const items = config.items[quarter][component];
  const [label, setLabel] = useState("");
  const [total, setTotal] = useState("");
  const [topic, setTopic] = useState("");
  const listId = `topics-${component}`;

  const add = async () => {
    const t = Number(total);
    if (!label.trim() || !t || t <= 0) return;
    await addGradeItem(classId, config, quarter, component, { id: newItemId(component), label: label.trim(), total: t, topic: topic.trim() || undefined });
    setLabel(""); setTotal(""); setTopic("");
  };

  return (
    <div className="rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 50%, transparent)", border: "1px solid var(--color-border)" }}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>{meta.label}</p>
      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-[11px] text-parchment/40">No items yet.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)" }}>
            <span className="min-w-0 truncate">{it.label} <span className="text-parchment/45">/{it.total}</span>{it.topic && <span className="ml-1 rounded px-1 py-0.5 text-[9px] text-parchment/60" style={{ border: "1px solid var(--color-border)" }}>{it.topic}</span>}</span>
            <button onClick={() => void removeGradeItem(classId, config, quarter, component, it.id)} aria-label="Remove item" className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-parchment/50 transition hover:bg-crimson/10 hover:text-crimson"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (e.g. Quiz 1)" className={INPUT + " flex-1 !py-1.5 text-xs"} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
          <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" placeholder="/pts" className={INPUT + " w-16 !py-1.5 text-xs"} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
          <button onClick={add} aria-label="Add item" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white transition hover:brightness-110" style={{ background: ACCENT }}><Plus className="h-4 w-4" /></button>
        </div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} list={listId} placeholder="Topic (optional — powers weak-spot analytics)" className={INPUT + " !py-1.5 text-xs"} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
        <datalist id={listId}>{GRADE_TOPICS.map((t) => <option key={t} value={t} />)}</datalist>
      </div>
    </div>
  );
}
