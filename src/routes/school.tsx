import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  School as SchoolIcon, Copy, Check, X, LogOut, Upload, GraduationCap, IdCard,
  Camera, KeyRound, LayoutDashboard, BookOpen, Clock, Archive, Loader2,
  Users, Sparkles, TrendingUp, Search, ChevronDown, Download, Lightbulb,
  AlertTriangle, UserX,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ArcaneField } from "../components/ArcaneField";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import { fileToDataUrl, downscale, approveTeacher, rejectTeacher, setTeacherStatus, getVerification, type Verification } from "../lib/admin";
import { useUserProfile, type StudentProfile } from "../lib/profile";
import {
  getSchool, updateSchool, useSchoolTeachers, createTeacherAccount, useSchoolClasses,
  useSchoolStudents, type School, type SchoolTeacher, type SchoolClass,
} from "../lib/schools";
import {
  normalizeConfig, computeAllQuarters, PASS, QUARTERS, COMPONENTS, scoresFor,
  type GradingConfig,
} from "../lib/grading";
import { StudentReport } from "../components/WeightedGradebook";
import { useAI } from "../lib/useAI";
import type { ClassInsightsInput, ClassInsightsResult } from "../lib/ai";

export const Route = createFileRoute("/school")({
  component: () => (
    <RequireRole role="school_admin">
      <SchoolDashboard />
    </RequireRole>
  ),
});

const CARD = {
  background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
  border: "1px solid var(--color-border)",
} as const;
const INPUT = {
  background: "color-mix(in oklab, var(--color-mist) 80%, transparent)",
  border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
} as const;

// School-admin accent — amber, the console's signature (matches the branding
// accent default and the PageHeader). Gold stays the ornament colour.
const ACCENT = "var(--color-amber-scry)";

type SchoolTab = "overview" | "teachers" | "classes" | "students" | "analytics" | "school";

function StatTile({ icon: Icon, label, value, tone = ACCENT, hint }: {
  icon: ComponentType<{ className?: string }>; label: string; value: React.ReactNode; tone?: string; hint?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${tone} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} 25%, transparent)` }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-parchment/60">{label}</span>
      </div>
      <p className="font-display text-3xl leading-none" style={{ color: tone }}>{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-parchment/55">{hint}</p>}
    </div>
  );
}

// ── Overview — the school at a glance ───────────────────────────────────────
function SchoolOverview({ school, onJump }: { school: School; onJump: (t: SchoolTab) => void }) {
  const { teachers } = useSchoolTeachers(school.id);
  const classes = useSchoolClasses(school.id);
  const { students } = useSchoolStudents(school.id);
  const cfgByClass = useMemo(() => configByClass(classes), [classes]);
  const [copied, setCopied] = useState(false);
  const pending = teachers.filter((t) => (t.status ?? "pending") === "pending").length;
  const activeClasses = classes.filter((c) => !c.archived).length;

  const finals = students.map((s) => studentFinal(s, cfgByClass)).filter((g): g is number => g !== null);
  const schoolAvg = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
  const atRisk = finals.filter((g) => g < PASS).length;
  const passing = finals.filter((g) => g >= PASS).length;

  const copy = async () => {
    try { await navigator.clipboard.writeText(school.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={() => onJump("teachers")} className="text-left transition hover:-translate-y-0.5">
          <StatTile icon={GraduationCap} label="Teachers" value={teachers.length} tone={ACCENT} hint={pending > 0 ? `${pending} awaiting approval` : "all approved"} />
        </button>
        <button onClick={() => onJump("classes")} className="text-left transition hover:-translate-y-0.5">
          <StatTile icon={BookOpen} label="Classes" value={classes.length} tone="var(--color-emerald-elixir)" hint={`${activeClasses} active`} />
        </button>
        <button onClick={() => onJump("students")} className="text-left transition hover:-translate-y-0.5">
          <StatTile icon={Users} label="Students" value={students.length} tone="var(--color-wraith)" hint={`${finals.length} graded`} />
        </button>
        <button onClick={() => onJump("analytics")} className="text-left transition hover:-translate-y-0.5">
          <StatTile icon={TrendingUp} label="At risk" value={atRisk} tone={atRisk ? "var(--color-crimson)" : "var(--color-gold)"} hint={atRisk ? "below 75 — review" : "none failing"} />
        </button>
      </div>

      {/* School grade snapshot */}
      {finals.length > 0 && (
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.3em] text-parchment/60">School grade snapshot</p>
            <button onClick={() => onJump("analytics")} className="inline-flex items-center gap-1 text-[11px] font-semibold transition hover:brightness-110" style={{ color: ACCENT }}>Full analytics →</button>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div><div className="font-ui text-4xl font-bold leading-none tabular-nums" style={{ color: sGradeColor(schoolAvg) }}>{schoolAvg ?? "—"}</div><div className="mt-1 text-[10px] uppercase tracking-wide text-parchment/50">School average</div></div>
            <div><div className="font-ui text-4xl font-bold leading-none text-teal tabular-nums">{passing}</div><div className="mt-1 text-[10px] uppercase tracking-wide text-parchment/50">Passing</div></div>
            <div><div className="font-ui text-4xl font-bold leading-none tabular-nums" style={{ color: atRisk ? "var(--color-crimson)" : "var(--color-parchment)" }}>{atRisk}</div><div className="mt-1 text-[10px] uppercase tracking-wide text-parchment/50">At risk</div></div>
            <div className="ml-auto h-12 min-w-[120px] flex-1">
              <div className="flex h-full items-end gap-1">
                {QUARTERS.map((qk) => {
                  const vals = students.map((s) => s.classId ? computeAllQuarters(cfgByClass.get(s.classId) ?? normalizeConfig(null), s, s.classId).quarters[qk].grade : null).filter((g): g is number => g !== null);
                  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                  return <div key={qk} className="flex flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t" style={{ height: `${Math.max(4, avg)}%`, background: sGradeColor(avg || null), opacity: avg ? 1 : 0.2 }} title={`${qk}: ${avg || "—"}`} /><span className="text-[9px] text-parchment/40">{qk}</span></div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {pending > 0 && (
        <button onClick={() => onJump("teachers")}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5"
          style={{ background: "color-mix(in oklab, var(--color-gold) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
          <Clock className="h-5 w-5 flex-shrink-0 text-gold" />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-gold">{pending} teacher{pending === 1 ? "" : "s"} waiting for approval.</span>{" "}
            <span className="text-parchment/70">Review their ID and approve in the Teachers tab.</span>
          </span>
        </button>
      )}

      <div className="rounded-2xl p-7" style={{ ...CARD, borderColor: "color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold/80">Share your school code</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-ui text-4xl font-bold tracking-[0.2em] text-spectral">{school.code}</span>
          <button onClick={copy} aria-label="Copy code" className="flex h-9 w-9 items-center justify-center rounded-full text-parchment/70 transition hover:text-spectral"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)", border: "1px solid var(--color-border)" }}>
            {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 text-sm text-parchment/70">
          Teachers enter this code when they sign up to join <span className="font-semibold text-spectral">{school.name}</span>.
          Each teacher then gets their own class code to share with students.
        </p>
      </div>
    </div>
  );
}

// ── Classes — oversight of every class in the school (counts + grade avg) ────
function ClassRow({ cls, teacherName, students, grade }: { cls: SchoolClass; teacherName: string; students: number; grade: number | null }) {
  const [copied, setCopied] = useState(false);
  const code = cls.joinCode ?? cls.id;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={CARD}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-spectral">
          {cls.name}
          {cls.archived && <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-parchment/60" style={{ border: "1px solid var(--color-border)" }}>Archived</span>}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-parchment/55"><GraduationCap className="h-3.5 w-3.5" /> {teacherName}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-parchment/70" style={{ border: "1px solid var(--color-border)" }} title="Students in this class"><Users className="h-3 w-3" /> {students}</span>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums" style={{ color: sGradeColor(grade), border: `1px solid color-mix(in oklab, ${sGradeColor(grade)} 30%, transparent)` }} title="Class average grade">avg {grade ?? "—"}</span>
        <button onClick={copy} title="Class join code — students enter this"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-teal transition hover:brightness-110"
          style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
          <KeyRound className="h-3 w-3" /> <span className="font-ui font-bold tracking-[0.15em]">{code}</span>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-60" />}
        </button>
      </div>
    </div>
  );
}

const CLASSES_PAGE = 12;
function ClassesOversight({ school }: { school: School }) {
  const classes = useSchoolClasses(school.id);
  const { teachers } = useSchoolTeachers(school.id);
  const { students } = useSchoolStudents(school.id);
  const cfgByClass = useMemo(() => configByClass(classes), [classes]);
  const nameOf = (uid: string) => { const t = teachers.find((x) => x.uid === uid); return t?.displayName ?? t?.email ?? "Unknown teacher"; };
  const countByClass = useMemo(() => { const m = new Map<string, number>(); for (const s of students) if (s.classId) m.set(s.classId, (m.get(s.classId) ?? 0) + 1); return m; }, [students]);
  const avgByClass = (c: SchoolClass): number | null => {
    const cfg = cfgByClass.get(c.id);
    const vals = students.filter((s) => s.classId === c.id).map((s) => (cfg ? computeAllQuarters(cfg, s, c.id).final : null)).filter((g): g is number => g !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "active" | "archived">("all");
  const [page, setPage] = useState(1);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return classes.filter((c) => {
      if (state === "active" && c.archived) return false;
      if (state === "archived" && !c.archived) return false;
      if (!needle) return true;
      return `${c.name} ${nameOf(c.teacherId)} ${c.joinCode ?? c.id}`.toLowerCase().includes(needle);
    }).sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, q, state, teachers]);
  const shown = paginate(filtered, page, CLASSES_PAGE);

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl px-5 py-10 text-center" style={CARD}>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, color: ACCENT }}><BookOpen className="h-5 w-5" /></span>
        <h3 className="font-display text-base mb-1">No classes yet</h3>
        <p className="text-sm text-parchment/60">Classes appear here as your teachers create them under {school.name}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search class, teacher or code…" className={`${SINPUT} pl-9`} />
        </div>
        <SFilterSelect value={state} onChange={(v) => reset(setState)(v as any)}>
          <option value="all">All classes</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </SFilterSelect>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-parchment/50">No classes match.</p>
      ) : (
        <>
          <div className="space-y-2">
            {shown.map((c) => <ClassRow key={c.id} cls={c} teacherName={nameOf(c.teacherId)} students={countByClass.get(c.id) ?? 0} grade={avgByClass(c)} />)}
          </div>
          <SPager total={filtered.length} page={page} pageSize={CLASSES_PAGE} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/** School Admin console — same shell as the teacher side (see DESIGN_DIRECTION §7b). */
// ── Shared helpers for the data-rich tabs ────────────────────────────────────
const SINPUT =
  "w-full rounded-lg px-3 py-2.5 text-sm text-spectral placeholder:text-parchment/35 outline-none transition " +
  "bg-[color-mix(in_oklab,var(--color-mist)_75%,transparent)] " +
  "border border-[color-mix(in_oklab,var(--color-parchment)_20%,transparent)] " +
  "focus:border-[color-mix(in_oklab,var(--color-amber-scry)_55%,transparent)]";

function sGradeColor(g: number | null): string {
  if (g === null) return "var(--color-parchment)";
  return g >= PASS ? "var(--color-emerald-elixir)" : "var(--color-crimson)";
}
function studentName(s: StudentProfile): string { return s.displayName ?? s.email ?? "Student"; }
function configByClass(classes: SchoolClass[]): Map<string, GradingConfig> {
  const m = new Map<string, GradingConfig>();
  for (const c of classes) m.set(c.id, normalizeConfig((c.grading as Partial<GradingConfig>) ?? null));
  return m;
}
function studentFinal(s: StudentProfile, cfgByClass: Map<string, GradingConfig>): number | null {
  if (!s.classId) return null;
  const cfg = cfgByClass.get(s.classId);
  if (!cfg) return null;
  return computeAllQuarters(cfg, s, s.classId).final;
}

function SFilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${SINPUT} appearance-none py-2.5 pr-8`}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
    </div>
  );
}
function SPager({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * pageSize;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-parchment/55">Showing <span className="text-spectral">{start + 1}–{Math.min(start + pageSize, total)}</span> of <span className="text-spectral">{total}</span></p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(cur - 1)} disabled={cur <= 1} className="rounded-lg px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>Prev</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => onPage(i + 1)} className="h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition"
              style={i + 1 === cur ? { background: `color-mix(in oklab, ${ACCENT} 16%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 35%, transparent)` } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>{i + 1}</button>
          ))}
          <button onClick={() => onPage(cur + 1)} disabled={cur >= totalPages} className="rounded-lg px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>Next</button>
        </div>
      )}
    </div>
  );
}
function paginate<T>(list: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const cur = Math.min(page, totalPages);
  return list.slice((cur - 1) * pageSize, (cur - 1) * pageSize + pageSize);
}
function SBar({ label, value, suffix = "%" }: { label: string; value: number | null; suffix?: string }) {
  const v = value ?? 0;
  const color = value === null ? "var(--color-parchment)" : v >= 75 ? "var(--color-emerald-elixir)" : v >= 50 ? "var(--color-gold)" : "var(--color-crimson)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs"><span className="truncate text-parchment/70">{label}</span><span className="font-ui font-semibold tabular-nums" style={{ color }}>{value === null ? "—" : `${v}${suffix}`}</span></div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--color-spectral) 10%, transparent)" }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, v)}%`, background: color }} /></div>
    </div>
  );
}
function csvCell(s: unknown) { const v = s == null ? "" : String(s); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
function downloadCsv(name: string, rows: string[]) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

// ── Students directory ───────────────────────────────────────────────────────
const STUDENTS_PAGE = 20;
function StudentsTab({ school }: { school: School }) {
  const { students, loading } = useSchoolStudents(school.id);
  const classes = useSchoolClasses(school.id);
  const cfgByClass = useMemo(() => configByClass(classes), [classes]);
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<StudentProfile | null>(null);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students
      .map((s) => ({ s, final: studentFinal(s, cfgByClass) }))
      .filter(({ s }) => {
        if (classFilter === "unassigned" && s.classId) return false;
        if (classFilter !== "all" && classFilter !== "unassigned" && s.classId !== classFilter) return false;
        if (!needle) return true;
        return `${studentName(s)} ${s.email ?? ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => studentName(a.s).localeCompare(studentName(b.s)));
  }, [students, q, classFilter, cfgByClass]);

  const finals = rows.map((r) => r.final).filter((g): g is number => g !== null);
  const atRisk = finals.filter((g) => g < PASS).length;
  const shown = paginate(rows, page, STUDENTS_PAGE);

  const exportCsv = () => {
    const header = ["Student", "Email", "Class", "Final grade", "Remarks"];
    const lines = [header.join(",")].concat(rows.map(({ s, final }) =>
      [studentName(s), s.email ?? "", s.classId ? (classNameById.get(s.classId) ?? s.className ?? "") : "", final ?? "", final === null ? "" : final >= PASS ? "Passed" : "Failed"].map(csvCell).join(",")));
    downloadCsv(`${school.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-students.csv`, lines);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Students", value: students.length, color: ACCENT },
          { label: "Graded", value: finals.length, color: "var(--color-emerald-elixir)" },
          { label: "At risk", value: atRisk, color: atRisk ? "var(--color-crimson)" : "var(--color-parchment)" },
          { label: "Classes", value: classes.length, color: "var(--color-gold)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={CARD}>
            <div className="font-ui text-2xl font-bold leading-none tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-parchment/55">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search students…" className={`${SINPUT} pl-9`} />
        </div>
        <SFilterSelect value={classFilter} onChange={reset(setClassFilter)}>
          <option value="all">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="unassigned">No class</option>
        </SFilterSelect>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-mist transition hover:brightness-110" style={{ background: ACCENT }}>
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-parchment/60">Loading students…</p>
      ) : students.length === 0 ? (
        <div className="rounded-2xl px-5 py-12 text-center" style={CARD}>
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, color: ACCENT }}><Users className="h-5 w-5" /></span>
          <h3 className="font-display text-base">No students yet</h3>
          <p className="text-sm text-parchment/60">Students appear here once they join a class in your school. (Already-joined students appear after their next sign-in.)</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-parchment/50">No students match.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl p-2 sm:p-3" style={CARD}>
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-parchment/50">
                  <th className="px-3 pb-2 font-medium">Student</th>
                  <th className="px-3 pb-2 font-medium">Class</th>
                  <th className="px-3 pb-2 text-center font-medium">Final</th>
                  <th className="px-3 pb-2 text-center font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ s, final }) => (
                  <tr key={s.uid} className="border-t" style={{ borderColor: "color-mix(in oklab, var(--color-spectral) 8%, transparent)" }}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setPreview(s)} className="text-left">
                        <div className="text-sm font-medium text-spectral transition hover:text-amber-scry">{studentName(s)}</div>
                        <div className="text-xs text-parchment/50">{s.email}</div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-parchment/70">{s.classId ? (classNameById.get(s.classId) ?? s.className ?? "—") : <span className="text-parchment/30">No class</span>}</td>
                    <td className="px-3 py-2.5 text-center font-ui text-base font-bold tabular-nums" style={{ color: sGradeColor(final) }}>{final ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {final === null ? <span className="text-parchment/30">—</span> : (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: sGradeColor(final), background: `color-mix(in oklab, ${sGradeColor(final)} 12%, transparent)` }}>{final >= PASS ? "Passed" : "Failed"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SPager total={rows.length} page={page} pageSize={STUDENTS_PAGE} onPage={setPage} />
        </>
      )}

      {preview && (
        <StudentReport
          student={{ uid: preview.uid, name: studentName(preview), data: preview }}
          classId={preview.classId ?? "—"}
          config={preview.classId ? (cfgByClass.get(preview.classId) ?? normalizeConfig(null)) : normalizeConfig(null)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

// ── School-wide analytics (+ AI) ─────────────────────────────────────────────
function buildSchoolInsights(schoolName: string, students: StudentProfile[], classes: SchoolClass[], cfgByClass: Map<string, GradingConfig>): ClassInsightsInput {
  const rows = students.map((s) => ({ s, final: studentFinal(s, cfgByClass) }));
  const finals = rows.map((r) => r.final).filter((g): g is number => g !== null);
  const classAverage = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
  const passing = finals.filter((g) => g >= PASS).length;

  // Quarter averages across the whole school (each student under their class cfg).
  const quarterAverages = QUARTERS.map((qk) => {
    const vals: number[] = [];
    for (const { s } of rows) {
      if (!s.classId) continue; const cfg = cfgByClass.get(s.classId); if (!cfg) continue;
      const g = computeAllQuarters(cfg, s, s.classId).quarters[qk].grade;
      if (g !== null) vals.push(g);
    }
    return { quarter: qk, average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });

  // Component + topic health from entered raw scores across every class.
  const comp: Record<string, { raw: number; high: number }> = { ww: { raw: 0, high: 0 }, pt: { raw: 0, high: 0 }, qa: { raw: 0, high: 0 } };
  const topicAcc: Record<string, { raw: number; high: number }> = {};
  const perStudentComp: Record<string, Record<string, { raw: number; high: number }>> = {};
  for (const { s } of rows) {
    if (!s.classId) continue; const cfg = cfgByClass.get(s.classId); if (!cfg) continue;
    const sc = perStudentComp[s.uid] = { ww: { raw: 0, high: 0 }, pt: { raw: 0, high: 0 }, qa: { raw: 0, high: 0 } };
    for (const qk of QUARTERS) for (const c of COMPONENTS) for (const it of cfg.items[qk][c.key]) {
      const v = scoresFor(s, s.classId, qk)[it.id];
      if (typeof v !== "number") continue;
      comp[c.key].raw += v; comp[c.key].high += it.total;
      sc[c.key].raw += v; sc[c.key].high += it.total;
      if (it.topic) { const t = topicAcc[it.topic] ?? { raw: 0, high: 0 }; t.raw += v; t.high += it.total; topicAcc[it.topic] = t; }
    }
  }
  const pct = (a: { raw: number; high: number }) => (a.high > 0 ? Math.round((a.raw / a.high) * 100) : null);
  const componentAverages = COMPONENTS.map((c) => ({ component: c.label, average: pct(comp[c.key]) }));
  const topicAverages = Object.entries(topicAcc).filter(([, a]) => a.high > 0).map(([topic, a]) => ({ topic, average: Math.round((a.raw / a.high) * 100) }));

  const studentsOut = rows.map(({ s, final }) => {
    const acc = perStudentComp[s.uid];
    let weakest: string | null = null, worst = Infinity;
    if (acc) for (const c of COMPONENTS) { const p = pct(acc[c.key]); if (p !== null && p < worst) { worst = p; weakest = c.label; } }
    return { name: studentName(s), final, weakestComponent: weakest };
  });

  return { className: schoolName, passMark: PASS, classAverage, passing, total: rows.length, quarterAverages, componentAverages, topicAverages, students: studentsOut };
}

function AnalyticsTab({ school }: { school: School }) {
  const { students, loading } = useSchoolStudents(school.id);
  const classes = useSchoolClasses(school.id);
  const cfgByClass = useMemo(() => configByClass(classes), [classes]);
  const ai = useAI();
  const [result, setResult] = useState<ClassInsightsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const input = useMemo(() => buildSchoolInsights(school.name, students, classes, cfgByClass), [school.name, students, classes, cfgByClass]);
  const hasData = input.students.some((s) => s.final !== null) || input.componentAverages.some((c) => c.average !== null);

  // Per-class average comparison.
  const perClass = useMemo(() => classes.map((c) => {
    const cfg = cfgByClass.get(c.id);
    const vals = students.filter((s) => s.classId === c.id).map((s) => (cfg ? computeAllQuarters(cfg, s, c.id).final : null)).filter((g): g is number => g !== null);
    return { name: c.name, average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, n: vals.length };
  }).sort((a, b) => (a.average ?? 999) - (b.average ?? 999)), [classes, students, cfgByClass]);

  const atRiskCount = input.students.filter((s) => s.final !== null && s.final < PASS).length;

  const generate = async () => {
    setBusy(true); setErr("");
    try { setResult(await ai.classInsights(input)); }
    catch { setErr("Couldn't generate insights. Please try again."); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="py-8 text-center text-sm text-parchment/60">Loading…</p>;
  if (!hasData) {
    return (
      <div className="rounded-2xl px-5 py-12 text-center" style={CARD}>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, color: ACCENT }}><TrendingUp className="h-5 w-5" /></span>
        <h3 className="font-display text-base">No grades to analyse yet</h3>
        <p className="text-sm text-parchment/60">Once teachers record grades, school-wide analytics appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "School average", value: input.classAverage, color: sGradeColor(input.classAverage) },
          { label: "Passing", value: `${input.passing}/${input.total}`, color: "var(--color-emerald-elixir)" },
          { label: "At risk", value: atRiskCount, color: atRiskCount ? "var(--color-crimson)" : "var(--color-parchment)" },
          { label: "Classes", value: classes.length, color: "var(--color-gold)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={CARD}>
            <div className="font-ui text-2xl font-bold leading-none tabular-nums" style={{ color: s.color }}>{s.value ?? "—"}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-parchment/55">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="mb-4 font-display text-lg">Class comparison</h3>
          {perClass.length === 0 ? <p className="text-sm text-parchment/50">No classes.</p> : (
            <div className="space-y-3">{perClass.map((c) => <SBar key={c.name} label={`${c.name} (${c.n})`} value={c.average} suffix="" />)}</div>
          )}
        </div>
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="mb-4 font-display text-lg">Component health</h3>
          <div className="space-y-3">{input.componentAverages.map((c) => <SBar key={c.component} label={c.component} value={c.average} />)}</div>
          {input.topicAverages.length > 0 && (
            <>
              <h3 className="mb-3 mt-5 font-display text-base">Weak spots by topic</h3>
              <div className="space-y-3">{[...input.topicAverages].sort((a, b) => a.average - b.average).map((t) => <SBar key={t.topic} label={t.topic} value={t.average} />)}</div>
            </>
          )}
        </div>
      </div>

      {/* AI narrative */}
      <div className="rounded-2xl p-5" style={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-display text-lg"><Lightbulb className="h-4 w-4 text-gold" /> School analysis &amp; recommendations</h3>
          <button onClick={generate} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-mist transition hover:brightness-110 disabled:opacity-50" style={{ background: ACCENT }}>
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…</> : <><Sparkles className="h-3.5 w-3.5" /> {result ? "Regenerate" : "Generate insights"}</>}
          </button>
        </div>
        {err && <p className="mt-3 text-xs text-crimson">{err}</p>}
        {!result && !busy && <p className="mt-3 text-sm text-parchment/60">Generate a written analysis across every class — weakest areas, who's at risk of failing, and what to do next. {ai.configured === false && "(No AI key — you'll get a rule-based summary from the same numbers.)"}</p>}
        {result && (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={result.source === "gemini" ? { color: "var(--color-amber-scry)", background: "color-mix(in oklab, var(--color-amber-scry) 14%, transparent)" } : { color: "var(--color-parchment)", background: "color-mix(in oklab, var(--color-parchment) 12%, transparent)" }}>{result.source === "gemini" ? "✦ AI" : "rule-based"}</span>
              <p className="flex-1 font-serif text-sm leading-relaxed text-parchment/85">{result.summary}</p>
            </div>
            {result.weakAreas.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">Weakest areas</p>
                <div className="space-y-2">{result.weakAreas.map((w, i) => (
                  <div key={i} className="rounded-xl px-3.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-gold) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 25%, transparent)" }}><p className="text-sm font-semibold text-gold">{w.area}</p><p className="text-xs text-parchment/70">{w.detail}</p></div>
                ))}</div>
              </div>
            )}
            {result.atRisk.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">At risk of failing ({result.atRisk.length})</p>
                <div className="space-y-1.5">{result.atRisk.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 22%, transparent)" }}><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-crimson" /><div><p className="text-sm font-semibold text-spectral">{a.name}</p><p className="text-xs text-parchment/70">{a.reason}</p></div></div>
                ))}</div>
              </div>
            )}
            {result.recommendations.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-parchment/50">Recommendations</p>
                <ul className="space-y-1.5">{result.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-parchment/80"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: ACCENT }} /> {r}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolDashboard() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const schoolId = profile?.schoolId;
  const adminEmail = profile?.email ?? profile?.displayName ?? "";
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SchoolTab>("overview");

  useEffect(() => {
    let alive = true;
    if (!schoolId) { setLoading(false); return; }
    getSchool(schoolId).then((s) => { if (alive) { setSchool(s); setLoading(false); } });
    return () => { alive = false; };
  }, [schoolId]);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  const TABS = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "teachers", label: "Teachers", icon: GraduationCap },
    { key: "classes", label: "Classes", icon: BookOpen },
    { key: "students", label: "Students", icon: Users },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "school", label: "School", icon: SchoolIcon },
  ] as const;

  const body = loading ? (
    <div className="mt-10 flex items-center justify-center gap-2 text-sm text-parchment/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading your school…</div>
  ) : !school ? (
    <p className="mt-10 text-center text-parchment/60">No school is linked to this account yet. Ask a super admin to assign you to a school.</p>
  ) : (
    <>
      {tab === "overview" && <SchoolOverview school={school} onJump={setTab} />}
      {tab === "teachers" && <TeachersCard school={school} />}
      {tab === "classes" && <ClassesOversight school={school} />}
      {tab === "students" && <StudentsTab school={school} />}
      {tab === "analytics" && <AnalyticsTab school={school} />}
      {tab === "school" && <div className="space-y-6"><CodeCard school={school} /><BrandingCard school={school} onSaved={(s) => setSchool(s)} /></div>}
    </>
  );

  return (
    <div className="grimoire-display bg-arcane min-h-screen text-spectral">
      <ArcaneField />

      {/* ── Desktop sidebar ── */}
      <aside className="glass-strong hidden md:flex fixed left-3 top-3 bottom-3 z-40 w-64 flex-col rounded-3xl p-3.5">
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-amber-scry/5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)` }}>
            <img src="/images/logo-outline.png" alt="" className="h-6 w-6 object-contain" style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${ACCENT} 55%, transparent))` }} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base tracking-[0.12em]">AlcheMix</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>School</span>
          </span>
        </Link>

        <div className="mt-3 flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, var(--color-gold))` }}>
            {(adminEmail[0] ?? "S").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-parchment/45">School admin</p>
            <p className="truncate text-xs font-medium text-spectral">{school?.name ?? (adminEmail || "signed in")}</p>
          </div>
        </div>

        <p className="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-parchment/40">Menu</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-slim">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--color-spectral)_6%,transparent)]"
                style={{ background: active ? `color-mix(in oklab, ${ACCENT} 14%, transparent)` : undefined, color: active ? "var(--color-spectral)" : "color-mix(in oklab, var(--color-parchment) 90%, transparent)" }}>
                {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full" style={{ background: `linear-gradient(180deg, var(--color-gold), ${ACCENT})` }} />}
                <t.icon className="h-[18px] w-[18px] flex-shrink-0" style={{ color: active ? ACCENT : "currentColor" }} />
                <span className="flex-1 text-[13.5px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5">
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-parchment/65 transition hover:text-crimson"><LogOut className="h-4 w-4" /> Sign out</button>
          <ThemeToggle className="!h-9 !w-9" />
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="glass-strong md:hidden fixed top-2 inset-x-2 z-40 flex h-14 items-center justify-between rounded-2xl px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-ui text-sm font-medium tracking-[0.12em]">AlcheMix <span style={{ color: ACCENT }}>School</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="!h-8 !w-8" />
          <button onClick={handleSignOut} aria-label="Sign out" className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="relative z-10 px-5 pt-20 pb-28 md:pl-[17.75rem] md:pr-7 md:pt-9 md:pb-12">
        <div>
          <PageHeader home="/school" hideNav eyebrow="School Admin" title={school?.name ?? "Your School"}
            subtitle="Your school's code and branding, your teacher roster, and every class under your school."
            icon={SchoolIcon} accent={ACCENT} />
          {body}
        </div>
      </div>

      {/* ── Mobile section bar (four tabs) ── */}
      <nav aria-label="Console sections" className="glass-strong md:hidden fixed bottom-2 inset-x-2 z-50 flex h-16 items-stretch justify-around overflow-hidden rounded-2xl">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} aria-label={t.label} aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? ACCENT : "var(--color-parchment)" }}>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: ACCENT }} />}
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function CodeCard({ school }: { school: School }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(school.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl p-7" style={{ ...CARD, borderColor: "color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
      <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold/80">School code</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-ui font-bold text-4xl tracking-[0.2em] text-spectral">{school.code}</span>
        <button onClick={copy} aria-label="Copy code" className="flex h-9 w-9 items-center justify-center rounded-full text-parchment/70 transition hover:text-spectral"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)", border: "1px solid var(--color-border)" }}>
          {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-3 text-sm text-parchment/70">
        Your school's permanent identifier. It is fixed — only a super admin can change it. Teachers you add below are bound to <span className="font-semibold text-spectral">{school.name}</span>, and each gets their own class code to share with students.
      </p>
    </div>
  );
}

function BrandingCard({ school, onSaved }: { school: School; onSaved: (s: School) => void }) {
  const [name, setName] = useState(school.name);
  const [logo, setLogo] = useState<string | null>(school.logoUrl ?? null);
  const [color, setColor] = useState(school.brandColor ?? "#9a6207");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== school.name || logo !== (school.logoUrl ?? null) || color !== (school.brandColor ?? "#9a6207");

  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    const raw = await fileToDataUrl(f);
    setLogo(await downscale(raw, 256, 0.7));
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateSchool(school.id, { name: name.trim(), logoUrl: logo, brandColor: color });
      onSaved({ ...school, name: name.trim(), logoUrl: logo, brandColor: color });
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl p-7" style={CARD}>
      <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-parchment/60">School details & branding</p>
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)", border: `2px solid color-mix(in oklab, ${color} 45%, transparent)` }}>
            {logo ? <img src={logo} alt="School logo" className="h-full w-full object-cover" /> : <SchoolIcon className="h-8 w-8 text-parchment/40" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-[11px] text-parchment/70 transition hover:text-spectral">
            <Upload className="h-3.5 w-3.5" /> {logo ? "Replace" : "Upload"} logo
          </button>
          {logo && <button onClick={() => setLogo(null)} className="text-[10px] text-parchment/40 hover:text-crimson transition">remove</button>}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-parchment/60">School name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm text-spectral outline-none" style={INPUT} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-parchment/60">Brand color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label="Brand color" />
              <span className="font-mono text-xs text-parchment/70">{color}</span>
            </div>
          </div>
          <button onClick={save} disabled={busy || !dirty || !name.trim()} className="btn-arcane btn-arcane-hover justify-center text-xs disabled:opacity-50">
            {saved ? <><Check className="h-4 w-4" /> Saved</> : busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function statusBadge(s?: string) {
  const m: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "var(--color-gold)" },
    approved: { label: "Approved", color: "var(--color-emerald-elixir)" },
    rejected: { label: "Rejected", color: "var(--color-crimson)" },
  };
  const v = m[s ?? "pending"] ?? m.pending;
  return <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: v.color }}>{v.label}</span>;
}

function TeacherRow({ t, code, classCount, studentCount }: { t: SchoolTeacher; code?: string; classCount: number; studentCount: number }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [verif, setVerif] = useState<Verification | null>(null);
  const [loadedVerif, setLoadedVerif] = useState(false);
  const [copied, setCopied] = useState(false);
  const pending = (t.status ?? "pending") === "pending";

  const act = async (fn: (uid: string) => Promise<void>) => { setBusy(true); try { await fn(t.uid); } finally { setBusy(false); } };
  const review = async () => {
    setOpen((o) => !o);
    if (!loadedVerif) { setVerif(await getVerification(t.uid)); setLoadedVerif(true); }
  };
  const copyCode = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-spectral">{t.displayName ?? t.email ?? "Unnamed"}</p>
          {t.email && <p className="text-xs text-parchment/55">{t.email}</p>}
          {code && (
            <button onClick={copyCode} className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] text-teal transition hover:brightness-110"
              style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }} title="Class code — students enter this to join">
              <KeyRound className="h-3 w-3" /> <span className="font-ui font-bold tracking-[0.15em]">{code}</span>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-60" />}
            </button>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-parchment/65" style={{ border: "1px solid var(--color-border)" }}><BookOpen className="h-3 w-3" /> {classCount} class{classCount === 1 ? "" : "es"}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-parchment/65" style={{ border: "1px solid var(--color-border)" }}><Users className="h-3 w-3" /> {studentCount} student{studentCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        {pending ? (
          <div className="flex items-center gap-2">
            <button onClick={review} className="rounded-lg px-2.5 py-1.5 text-[11px] text-parchment/70 transition hover:text-spectral" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)", border: "1px solid var(--color-border)" }}>
              {open ? "Hide" : "Review ID"}
            </button>
            <button onClick={() => act(approveTeacher)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: "var(--color-emerald-elixir)" }}>
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button onClick={() => act(rejectTeacher)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition disabled:opacity-50" style={{ color: "var(--color-crimson)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {statusBadge(t.status)}
            {(t.status ?? "approved") === "approved" ? (
              <button onClick={() => { if (confirm(`Revoke ${t.displayName ?? t.email}'s access? They won't be able to use the teacher console until reinstated.`)) void act((uid) => setTeacherStatus(uid, "rejected")); }} disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition disabled:opacity-50 hover:-translate-y-px" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}><UserX className="h-3.5 w-3.5" /> Revoke</button>
            ) : (
              <button onClick={() => void act(approveTeacher)} disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 hover:-translate-y-px" style={{ color: "var(--color-emerald-elixir)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}><Check className="h-3.5 w-3.5" /> Reinstate</button>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {verif ? (
            <>
              <figure>
                <figcaption className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-parchment/50"><IdCard className="h-3 w-3" /> ID</figcaption>
                <img src={verif.idImage} alt="Teacher ID" className="h-28 w-full rounded-lg bg-black/40 object-contain" style={{ border: "1px solid var(--color-border)" }} />
              </figure>
              <figure>
                <figcaption className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-parchment/50"><Camera className="h-3 w-3" /> Selfie</figcaption>
                <img src={verif.selfie} alt="Teacher selfie" className="h-28 w-full rounded-lg object-cover" style={{ border: "1px solid var(--color-border)" }} />
              </figure>
            </>
          ) : (
            <p className="col-span-2 text-xs text-parchment/50">No ID/selfie submitted yet — this teacher hasn't completed verification.</p>
          )}
        </div>
      )}
    </li>
  );
}

function TeachersCard({ school }: { school: School }) {
  const { teachers, loading } = useSchoolTeachers(school.id);
  const classes = useSchoolClasses(school.id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<{ email: string; code: string } | null>(null);

  const { students } = useSchoolStudents(school.id);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  // teacherId → their (first, active) class join code, for sharing with students.
  const codeByTeacher = new Map<string, string>();
  for (const c of classes) {
    if (c.archived) continue;
    if (!codeByTeacher.has(c.teacherId)) codeByTeacher.set(c.teacherId, c.joinCode ?? c.id);
  }
  const classCountByTeacher = useMemo(() => { const m = new Map<string, number>(); for (const c of classes) m.set(c.teacherId, (m.get(c.teacherId) ?? 0) + 1); return m; }, [classes]);
  const teacherByClass = useMemo(() => new Map(classes.map((c) => [c.id, c.teacherId])), [classes]);
  const studentCountByTeacher = useMemo(() => { const m = new Map<string, number>(); for (const s of students) { const tid = s.classId ? teacherByClass.get(s.classId) : undefined; if (tid) m.set(tid, (m.get(tid) ?? 0) + 1); } return m; }, [students, teacherByClass]);
  const pendingCount = teachers.filter((t) => (t.status ?? "pending") === "pending").length;
  const filtered = useMemo(() => teachers.filter((t) => {
    if (status !== "all" && (t.status ?? "pending") !== status) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${t.displayName ?? ""} ${t.email ?? ""}`.toLowerCase().includes(needle);
  }).sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? "")), [teachers, q, status]);
  const shown = paginate(filtered, page, 15);

  const INPUT_CLS = "w-full rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/30 outline-none";
  const inputStyle = { background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)" };

  const create = async () => {
    setErr(""); setCreated(null);
    if (!name.trim() || !email.trim()) { setErr("Name and email are required."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const res = await createTeacherAccount(school.id, { name: name.trim(), email: email.trim(), password: pw }, school.code);
      setCreated({ email: res.email, code: res.classCode });
      setName(""); setEmail(""); setPw("");
    } catch (e: any) {
      const map: Record<string, string> = {
        "auth/email-already-in-use": "An account with that email already exists.",
        "auth/invalid-email": "That doesn't look like a valid email.",
        "auth/weak-password": "Password is too weak (use at least 6 characters).",
      };
      setErr(map[e?.code] ?? (e?.message ?? "Couldn't create the teacher."));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl p-7" style={CARD}>
      <p className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-parchment/60">
        <GraduationCap className="h-4 w-4" /> Teachers · {teachers.length}
        {pendingCount > 0 && <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.1em] text-gold" style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)" }}>{pendingCount} pending</span>}
      </p>

      {/* Create the teacher's full account — bound to this school, with a class
          code embedded from day one for grouping students. */}
      <div className="mb-5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-parchment/60">Add a teacher</label>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Teacher name" className={INPUT_CLS} style={inputStyle} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.edu" className={INPUT_CLS} style={inputStyle} />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password (min 6)" className={INPUT_CLS} style={inputStyle} />
        </div>
        {err && <p className="mt-2 text-xs text-crimson">{err}</p>}
        {created && (
          <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
            <span className="font-semibold text-teal">{created.email} created.</span>{" "}
            <span className="text-parchment/80">They sign in at <span className="font-mono">/teacher/login</span>. Share class code <span className="font-ui font-bold tracking-[0.15em] text-teal">{created.code}</span> with their students.</span>
          </div>
        )}
        <button onClick={create} disabled={busy} className="btn-arcane btn-arcane-hover justify-center text-xs mt-3 disabled:opacity-50">
          {busy ? "Creating…" : "Create teacher account"}
        </button>
        <p className="mt-1.5 text-[10px] text-parchment/45">Creates a real login bound to this school, with a class code to group their students.</p>
      </div>

      {loading ? (
        <p className="text-sm text-parchment/60">Loading…</p>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-parchment/60">No teachers yet. Add one above.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
              <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search teachers…" className={`${SINPUT} pl-9`} />
            </div>
            <SFilterSelect value={status} onChange={(v) => reset(setStatus)(v as any)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SFilterSelect>
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-parchment/50">No teachers match.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {shown.map((t) => <TeacherRow key={t.uid} t={t} code={codeByTeacher.get(t.uid)} classCount={classCountByTeacher.get(t.uid) ?? 0} studentCount={studentCountByTeacher.get(t.uid) ?? 0} />)}
            </ul>
          )}
          <SPager total={filtered.length} page={page} pageSize={15} onPage={setPage} />
        </>
      )}
    </div>
  );
}
