import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import {
  GraduationCap, Users, ClipboardCheck, Plus, Copy, Check, LogOut,  BookOpen,
  Layers, Sparkles, ChevronLeft, ScanSearch, Clock, X, ImageOff, Loader2,
  AlertTriangle, Award, ChevronDown, ChevronRight, Flame, FlaskConical, Star,
  ListChecks, Pencil, Trash2, ArrowUp, ArrowDown, Wand2, Download,
  LayoutDashboard, BookMarked, Megaphone, Pin, MoreHorizontal, UserX,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ArcaneField } from "../components/ArcaneField";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import { useUserProfile, type Mastery, type PathProgress, type PathStage } from "../lib/profile";
import { CURRICULUM, conceptById } from "../lib/curriculum";
import {
  createClass, useTeacherClasses, useRoster, getStudentGrades, setStudentGrade,
  buildClassGradesCsv, downloadCsv,
  activeJoinCode, joinCodeExpired, joinCodeMillisLeft, regenerateJoinCode,
  setClassArchived, removeStudentFromClass,
  useJoinRequests, acceptJoinRequest, rejectJoinRequest, type JoinRequest,
  useClassProfiles, practiceTotal, lastActiveMillis, aggregateConceptTrouble,
  useClassAssignments, saveQuiz, deleteQuiz, saveMission, deleteMission,
  validateQuiz, validateMission, newAssignmentId, MODULE_CATALOG, moduleById,
  saveAnnouncement, deleteAnnouncement,
  todayKey, starterStreakState, activeTodayCount, idleStudents, masteryTally,
  classCollectionTotals, topForgedCompounds, type StreakState,
  GRADE_TOPICS, type ClassInfo, type RosterEntry, type StudentSnapshot,
  type QuizDef, type QuizQuestion, type MissionDef, type MissionTarget,
  type AnnouncementDef,
} from "../lib/teacher";
import {
  useClassEvidence, reviewEvidence, isPendingReview, type TeacherEvidenceEntry,
} from "../lib/scavenger";
import { CRAFTS, TIERS } from "../lib/craft";

export const Route = createFileRoute("/teacher")({
  component: () => (
    <RequireRole role="teacher">
      <TeacherConsole />
    </RequireRole>
  ),
});

const MASTERY_OPTS: { value: Mastery; label: string }[] = [
  { value: "not-started", label: "Not started" },
  { value: "developing", label: "Developing" },
  { value: "proficient", label: "Proficient" },
  { value: "mastered", label: "Mastered" },
];

// ── Roster + join code for one class ────────────────────────────────────────
// Adviser items 5–6: the code is regenerable and expires; students can be
// removed from the roster; whole classes can be archived and restored.
function JoinRequestsBlock({ cls }: { cls: ClassInfo }) {
  const requests = useJoinRequests(cls.id);
  const [busy, setBusy] = useState<string | null>(null);
  if (requests.length === 0) return null;

  const accept = async (r: JoinRequest) => { setBusy(r.uid); try { await acceptJoinRequest(cls.id, cls.name, r); } finally { setBusy(null); } };
  const reject = async (r: JoinRequest) => { setBusy(r.uid); try { await rejectJoinRequest(cls.id, r.uid); } finally { setBusy(null); } };

  return (
    <div className="mt-4 rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-gold) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gold">Join requests · {requests.length}</p>
      <div className="space-y-1.5">
        {requests.map((r) => (
          <div key={r.uid} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5"
            style={{ background: "color-mix(in oklab, var(--color-mist) 50%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="truncate text-xs text-parchment">{r.name ?? r.email ?? "Student"}</span>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button onClick={() => accept(r)} disabled={busy === r.uid} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: "var(--color-emerald-elixir)" }}>
                <Check className="h-3 w-3" /> Accept
              </button>
              <button onClick={() => reject(r)} disabled={busy === r.uid} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-crimson/75 transition hover:text-crimson disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassInfo }) {
  const roster = useRoster(cls.id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const code = activeJoinCode(cls);
  const expired = joinCodeExpired(cls);
  const msLeft = joinCodeMillisLeft(cls);
  const daysLeft = msLeft !== null ? Math.max(0, Math.ceil(msLeft / 86_400_000)) : null;

  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const regen = async () => {
    if (!window.confirm("Issue a fresh join code? The current code stops working immediately — students already enrolled are unaffected.")) return;
    setBusy(true);
    try { await regenerateJoinCode(cls.id); } finally { setBusy(false); }
  };
  const toggleArchive = async () => {
    setBusy(true);
    try { await setClassArchived(cls.id, !cls.archived); } finally { setBusy(false); }
  };
  const remove = async (s: RosterEntry) => {
    if (!window.confirm(`Remove ${s.name ?? s.email ?? "this student"} from ${cls.name}? They can rejoin only with a valid code.`)) return;
    setRemoving(s.uid);
    try { await removeStudentFromClass(cls.id, s.uid); } finally { setRemoving(null); }
  };

  return (
    <div className="glass rounded-2xl p-5" style={cls.archived ? { opacity: 0.75 } : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="orb-rune h-10 w-10 flex-shrink-0 text-gold">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-lg">
              {cls.name}
              {cls.archived && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-parchment/70" style={{ border: "1px solid var(--color-border)" }}>Archived</span>}
            </h3>
            <p className="text-xs text-parchment/60 mt-0.5 inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {roster.length} enrolled</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={copy} className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:-translate-y-0.5"
            style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)", border: `1px solid color-mix(in oklab, ${expired ? "var(--color-crimson)" : "var(--color-emerald-elixir)"} 35%, transparent)` }}>
            <span className="font-sans text-lg font-bold tracking-[0.3em] text-teal">{code}</span>
            {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4 text-parchment/60" />}
          </button>
          <span className={`text-[10px] uppercase tracking-[0.12em] ${expired ? "text-crimson" : "text-parchment/55"}`}>
            {expired ? "Code expired — issue a new one" : daysLeft !== null ? `Code valid for ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : "No expiry (issue a new code to add one)"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={regen} disabled={busy}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-teal transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)" }}>
          {busy ? "Working…" : "New code"}
        </button>
        <button onClick={toggleArchive} disabled={busy}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-parchment transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ border: "1px solid var(--color-border)" }}>
          {cls.archived ? "Restore class" : "Archive class"}
        </button>
      </div>

      <JoinRequestsBlock cls={cls} />

      {roster.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {roster.map((s) => (
            <div key={s.uid} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5"
              style={{ background: "color-mix(in oklab, var(--color-mist) 50%, transparent)", border: "1px solid var(--color-border)" }}>
              <span className="truncate text-xs text-parchment">{s.name ?? s.email ?? "Student"}</span>
              <button onClick={() => remove(s)} disabled={removing === s.uid}
                className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-crimson/75 transition hover:text-crimson disabled:opacity-50">
                {removing === s.uid ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-parchment/50">Share the code <span className="text-teal font-sans font-bold tracking-[0.2em]">{code}</span> — students enter it on their dashboard to enrol.</p>
      )}
    </div>
  );
}

function ClassesTab({ teacherId, teacherName, schoolId, classes }: { teacherId: string; teacherName: string | null; schoolId?: string | null; classes: ClassInfo[] }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await createClass(teacherId, teacherName, name.trim(), schoolId);
    setName("");
    setCreating(false);
  };

  return (
    <div>
      <form onSubmit={create} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New class name (e.g. Grade 10 — Mendeleev)"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }} />
        <button type="submit" disabled={creating || !name.trim()} className="btn-arcane btn-arcane-hover justify-center disabled:opacity-60">
          <Plus className="h-4 w-4" /> Create class
        </button>
      </form>

      {classes.length === 0 ? (
        <div className="glass rounded-2xl px-5 py-10 text-center">
          <span className="orb-rune mx-auto flex h-12 w-12 text-gold">
            <Users className="h-5 w-5" />
          </span>
          <h3 className="font-display text-base mb-1 mt-3">No classes yet</h3>
          <p className="text-sm text-parchment/60">Create your first class to generate a join code students can use.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {classes.filter((c) => !c.archived).map((c) => <ClassCard key={c.id} cls={c} />)}
          </div>
          {classes.some((c) => c.archived) && (
            <div className="mt-8">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-parchment/50">Archived classes</p>
              <div className="grid gap-4 md:grid-cols-2">
                {classes.filter((c) => c.archived).map((c) => <ClassCard key={c.id} cls={c} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Gradebook ───────────────────────────────────────────────────────────────
function StudentGradePanel({ student, onBack }: { student: RosterEntry; onBack: () => void }) {
  const [grades, setGrades] = useState<Record<string, { score: number; outOf: number }>>({});
  const [mastery, setMastery] = useState<Record<string, Mastery>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getStudentGrades(student.uid).then(({ grades, mastery }) => {
      const g: Record<string, { score: number; outOf: number }> = {};
      for (const [k, v] of Object.entries(grades)) g[k] = { score: v.score, outOf: v.outOf };
      setGrades(g);
      setMastery(mastery);
    });
  }, [student.uid]);

  const save = async () => {
    for (const topic of GRADE_TOPICS) {
      const g = grades[topic];
      await setStudentGrade(student.uid, topic, g && g.outOf ? g : null, mastery[topic]);
    }
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-parchment/60 hover:text-teal transition mb-4">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to roster
      </button>
      <h3 className="font-display text-xl mb-1">{student.name ?? student.email}</h3>
      <p className="text-xs text-parchment/50 mb-5">Set a score and mastery level per topic. Students see these in their "My Progress".</p>

      <div className="space-y-3">
        {GRADE_TOPICS.map((topic) => (
          <div key={topic} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="font-ui font-semibold text-sm flex-1">{topic}</span>
            <div className="flex items-center gap-2">
              <input type="number" min={0} placeholder="score" value={grades[topic]?.score ?? ""}
                onChange={(e) => setGrades((p) => ({ ...p, [topic]: { score: Number(e.target.value), outOf: p[topic]?.outOf ?? 0 } }))}
                className="w-16 rounded-md px-2 py-1.5 text-sm text-center text-spectral outline-none" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }} />
              <span className="text-parchment/50">/</span>
              <input type="number" min={0} placeholder="out of" value={grades[topic]?.outOf || ""}
                onChange={(e) => setGrades((p) => ({ ...p, [topic]: { score: p[topic]?.score ?? 0, outOf: Number(e.target.value) } }))}
                className="w-16 rounded-md px-2 py-1.5 text-sm text-center text-spectral outline-none" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }} />
            </div>
            <select value={mastery[topic] ?? "not-started"} onChange={(e) => setMastery((p) => ({ ...p, [topic]: e.target.value as Mastery }))}
              className="rounded-md px-2 py-1.5 text-sm text-spectral outline-none" style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              {MASTERY_OPTS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saved} className="btn-arcane btn-arcane-hover mt-5 disabled:opacity-60">
        {saved ? <><Check className="h-4 w-4" /> Grades saved</> : <><ClipboardCheck className="h-4 w-4" /> Save grades</>}
      </button>
    </div>
  );
}

function GradebookTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [student, setStudent] = useState<RosterEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const roster = useRoster(classId);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to grade students.</p>;
  if (student) return <StudentGradePanel student={student} onBack={() => setStudent(null)} />;

  const selectedClass = classes.find((c) => c.id === classId);

  const exportCsv = async () => {
    if (!selectedClass || roster.length === 0) return;
    setExporting(true);
    try {
      const csv = await buildClassGradesCsv(selectedClass.name, roster);
      const safe = selectedClass.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      downloadCsv(`alchemix-grades-${safe}.csv`, csv);
    } finally { setExporting(false); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {classes.map((c) => (
          <button key={c.id} onClick={() => { setClassId(c.id); setStudent(null); }}
            className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
            style={classId === c.id ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {c.name}
          </button>
        ))}
        <button onClick={exportCsv} disabled={exporting || roster.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-teal transition hover:-translate-y-0.5 disabled:opacity-40"
          style={{ border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)" }}
          title="Download this class's gradebook as a CSV">
          <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : (
        <div className="space-y-2">
          {roster.map((s) => (
            <button key={s.uid} onClick={() => setStudent(s)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-teal/5"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <span className="font-ui font-semibold text-sm">{s.name ?? s.email}</span>
              <span className="text-xs tracking-[0.15em] uppercase text-teal">Grade →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Evidence review inbox (AI Scavenger Hunt) ───────────────────────────────
const T_ACCENT = "var(--color-emerald-elixir)";

function EvidenceReviewCard({ e }: { e: TeacherEvidenceEntry }) {
  const [busy, setBusy] = useState(false);
  const pending = isPendingReview(e);
  const good = e.correct || e.teacherApproved === true;
  const tone = pending ? "var(--color-gold)" : good ? T_ACCENT : "var(--color-crimson)";
  const StatusIcon = pending ? Clock : good ? Check : X;

  const review = async (approved: boolean) => {
    setBusy(true);
    try { await reviewEvidence(e.studentUid, e.id, approved); }
    catch (err) { console.error("reviewEvidence failed:", err); }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ border: `1px solid color-mix(in oklab, ${tone} 32%, transparent)` }}>
      <div className="relative bg-slate-sunken" style={{ aspectRatio: "4/3" }}>
        {e.image
          ? <img src={e.image} alt={`${e.elementName} find`} className="h-full w-full object-cover" />
          : <div className="h-full w-full flex items-center justify-center text-parchment/30"><ImageOff className="h-7 w-7" /></div>}
        <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-ui font-semibold backdrop-blur-sm"
          style={{ background: "color-mix(in oklab, #000 45%, transparent)", color: "#fff" }}>
          <span style={{ color: e.correct || e.teacherApproved ? T_ACCENT : "var(--color-gold)" }}>{e.element}</span> {e.elementName}
        </span>
        <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm"
          style={{ background: `color-mix(in oklab, ${tone} 55%, #000 25%)`, color: "#fff" }}>
          <StatusIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-ui font-semibold text-sm truncate">{e.studentName ?? "Student"}</span>
          <span className="text-[9px] tracking-[0.18em] uppercase flex-shrink-0"
            style={{ color: e.source === "gemini" ? T_ACCENT : "var(--color-gold)" }}>
            {e.source === "gemini" ? "AI-graded" : "Needs review"}
          </span>
        </div>
        {e.answer && <p className="text-xs text-parchment/70 mb-1">“{e.answer}”</p>}
        <p className="text-xs text-parchment/55 leading-relaxed flex-1">{e.feedback}</p>

        {pending ? (
          <div className="mt-3 flex gap-2">
            <button onClick={() => review(true)} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-ui font-semibold tracking-[0.1em] uppercase transition disabled:opacity-60"
              style={{ background: `color-mix(in oklab, ${T_ACCENT} 18%, transparent)`, color: T_ACCENT, border: `1px solid color-mix(in oklab, ${T_ACCENT} 40%, transparent)` }}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
            </button>
            <button onClick={() => review(false)} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-ui font-semibold tracking-[0.1em] uppercase transition disabled:opacity-60"
              style={{ background: "color-mix(in oklab, var(--color-crimson) 14%, transparent)", color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: tone }}>
              {good ? "Approved" : "Rejected"}
            </span>
            {e.needsManualReview && (
              <button onClick={() => review(!good)} disabled={busy}
                className="text-[10px] tracking-[0.12em] uppercase text-parchment/50 hover:text-teal transition">
                {busy ? "…" : good ? "Undo → reject" : "Undo → approve"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const roster = useRoster(classId);
  const evidence = useClassEvidence(roster);

  if (classes.length === 0)
    return <p className="text-sm text-parchment/60">Create a class first to review student evidence.</p>;

  const pendingCount = evidence.filter(isPendingReview).length;
  const shown = filter === "pending" ? evidence.filter(isPendingReview) : evidence;

  return (
    <div>
      {/* Class selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {classes.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
            style={classId === c.id ? { background: `color-mix(in oklab, ${T_ACCENT} 18%, transparent)`, color: T_ACCENT } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {(["pending", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="rounded-full px-3.5 py-1 text-[11px] tracking-[0.12em] uppercase transition"
              style={filter === f ? { background: `color-mix(in oklab, ${T_ACCENT} 18%, transparent)`, color: T_ACCENT } : { color: "var(--color-parchment)" }}>
              {f === "pending" ? "Needs review" : "All finds"}
            </button>
          ))}
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gold">
            <Clock className="h-3.5 w-3.5" /> {pendingCount} awaiting review
          </span>
        )}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl px-5 py-12 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
          <ScanSearch className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
          <h3 className="font-display text-base mb-1">{filter === "pending" ? "Nothing to review" : "No finds yet"}</h3>
          <p className="text-sm text-parchment/60">
            {filter === "pending"
              ? "Scavenger-hunt submissions that need a human decision will appear here."
              : "When students photograph elements in the Scavenger Hunt, their finds show up here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((e) => <EvidenceReviewCard key={`${e.studentUid}/${e.id}`} e={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Class Performance Matrix ────────────────────────────────────────────────
const STAGE_META: Record<PathStage | "not-started", { label: string; color: string; fill: number }> = {
  "not-started": { label: "—", color: "var(--color-parchment)", fill: 6 },
  learn: { label: "Learn", color: "var(--color-wraith)", fill: 16 },
  practise: { label: "Practise", color: "var(--color-gold)", fill: 16 },
  assess: { label: "Assess", color: "var(--color-emerald-elixir)", fill: 12 },
  done: { label: "Done", color: "var(--color-emerald-elixir)", fill: 26 },
};

/** "reaction-theatre" → "Reaction Theatre" (trial ids are kebab-cased module ids). */
const prettyId = (id: string) => id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function daysAgoLabel(ms: number | null): string | null {
  if (ms == null) return null;
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

function StageChip({ pp }: { pp?: PathProgress }) {
  const meta = STAGE_META[pp?.stage ?? "not-started"];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase whitespace-nowrap"
        style={{
          color: meta.color,
          background: `color-mix(in oklab, ${meta.color} ${meta.fill}%, transparent)`,
          border: `1px solid color-mix(in oklab, ${meta.color} ${meta.fill + 14}%, transparent)`,
        }}>
        {meta.label}
      </span>
      {pp?.best != null && <span className="text-[10px] text-parchment/60">{Math.round(pp.best * 100)}%</span>}
    </div>
  );
}

/** Expanded per-student drill-down under a matrix row. */
function StudentDetail({ s }: { s: StudentSnapshot }) {
  const d = s.data;
  if (!d) return <p className="text-xs text-parchment/50">No profile data recorded for this student yet.</p>;
  const trials = Object.entries(d.trials ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const stats: { icon: typeof Flame; label: string; value: string; color: string }[] = [
    { icon: Flame, label: "Starter streak", value: `${d.starterStreak?.count ?? 0} day${(d.starterStreak?.count ?? 0) === 1 ? "" : "s"}`, color: "var(--color-gold)" },
    { icon: Award, label: "Badges", value: String(d.badges?.length ?? 0), color: "var(--color-emerald-elixir)" },
    { icon: FlaskConical, label: "Compounds forged", value: String(d.compounds?.length ?? 0), color: "var(--color-wraith)" },
    { icon: BookOpen, label: "Grimoire cards", value: String(d.grimoire?.length ?? 0), color: "var(--color-emerald-elixir)" },
    { icon: Sparkles, label: "Aurum", value: String(d.aurum ?? 0), color: "var(--color-gold)" },
  ];

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        {stats.map((st) => (
          <span key={st.label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
            style={{ background: `color-mix(in oklab, ${st.color} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${st.color} 25%, transparent)` }}>
            <st.icon className="h-3 w-3" style={{ color: st.color }} />
            <span className="text-parchment/70">{st.label}</span>
            <span className="font-ui font-bold" style={{ color: st.color }}>{st.value}</span>
          </span>
        ))}
      </div>

      {/* Lesson-path breakdown */}
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/50 mb-2">Lesson paths</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CURRICULUM.map((t) => {
            const pp = d.pathProgress?.[t.id];
            return (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                style={{ background: "color-mix(in oklab, var(--color-mist) 40%, transparent)", border: "1px solid var(--color-border)" }}>
                <span className="text-xs truncate">{t.title}</span>
                <StageChip pp={pp} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Trial results */}
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/50 mb-2">Trials</p>
        {trials.length === 0 ? (
          <p className="text-xs text-parchment/50">No trials attempted yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {trials.map(([id, t]) => (
              <div key={id} className="rounded-lg px-3 py-2" style={{ background: "color-mix(in oklab, var(--color-mist) 40%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate">{prettyId(id)}</span>
                  <span className="flex gap-0.5 flex-shrink-0">
                    {[0, 1, 2].map((i) => (
                      <Star key={i} className="h-3 w-3" style={i < t.stars ? { color: "var(--color-gold)", fill: "var(--color-gold)" } : { color: "color-mix(in oklab, var(--color-parchment) 30%, transparent)" }} />
                    ))}
                  </span>
                </div>
                <p className="text-[10px] text-parchment/55 mt-1">
                  Best {t.best}/{t.outOf} · {t.plays} play{t.plays === 1 ? "" : "s"}{t.timeSec != null ? ` · ${t.timeSec}s` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Misconception radar — concepts the class is collectively struggling with. */
function StrugglePanel({ students, rosterSize }: { students: StudentSnapshot[]; rosterSize: number }) {
  const trouble = aggregateConceptTrouble(students.map((s) => s.data)).slice(0, 6);
  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <h3 className="font-display text-base mb-1 inline-flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> Struggling concepts
      </h3>
      <p className="text-xs text-parchment/50 mb-4">Aggregated from each student's spaced-repetition reviews — overdue cards and repeated lapses flag likely misconceptions.</p>
      {trouble.length === 0 ? (
        <p className="text-xs text-parchment/50">No trouble signals yet — no overdue reviews or lapses across this class.</p>
      ) : (
        <div className="space-y-2">
          {trouble.map((t) => {
            const hit = conceptById(t.conceptId);
            return (
              <div key={t.conceptId} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "color-mix(in oklab, var(--color-mist) 40%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{hit?.concept.title ?? prettyId(t.conceptId)}</span>
                  {hit && <span className="ml-2 text-[10px] tracking-[0.12em] uppercase text-parchment/45">{hit.topic.title}</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                  {t.overdue > 0 && (
                    <span className="inline-flex items-center gap-1" style={{ color: "var(--color-gold)" }}>
                      <Clock className="h-3 w-3" /> {t.overdue} of {rosterSize} overdue
                    </span>
                  )}
                  {t.lapses > 0 && (
                    <span className="inline-flex items-center gap-1" style={{ color: "var(--color-crimson)" }}>
                      <X className="h-3 w-3" /> {t.lapses} lapse{t.lapses === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatrixTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const roster = useRoster(classId);
  const { students, loading } = useClassProfiles(roster);

  if (classes.length === 0)
    return <p className="text-sm text-parchment/60">Create a class first to see its performance matrix.</p>;

  // The class's trial set — the union of every trial anyone has attempted.
  const trialIds = Array.from(new Set(students.flatMap((s) => Object.keys(s.data?.trials ?? {}))));
  const maxStars = trialIds.length * 3;
  const columnCount = CURRICULUM.length + 4; // name + topics + craft + trials + engagement

  return (
    <div className="space-y-6">
      {/* Class selector */}
      <div className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <button key={c.id} onClick={() => { setClassId(c.id); setExpanded(null); }}
            className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
            style={classId === c.id ? { background: `color-mix(in oklab, ${T_ACCENT} 18%, transparent)`, color: T_ACCENT } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {c.name}
          </button>
        ))}
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-parchment/60"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Gathering class data…
        </div>
      ) : (
        <>
          {/* Matrix */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: "760px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
                    <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-parchment/50 font-normal">Student</th>
                    {CURRICULUM.map((t) => (
                      <th key={t.id} className="px-2 py-3 text-center text-[10px] tracking-[0.1em] uppercase text-parchment/50 font-normal">{t.title}</th>
                    ))}
                    <th className="px-2 py-3 text-center text-[10px] tracking-[0.1em] uppercase text-parchment/50 font-normal">Craft</th>
                    <th className="px-2 py-3 text-center text-[10px] tracking-[0.1em] uppercase text-parchment/50 font-normal">Trials</th>
                    <th className="px-2 py-3 text-center text-[10px] tracking-[0.1em] uppercase text-parchment/50 font-normal">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const open = expanded === s.uid;
                    const stars = Object.values(s.data?.trials ?? {}).reduce((sum, t) => sum + t.stars, 0);
                    const total = practiceTotal(s.data?.practice);
                    const active = daysAgoLabel(lastActiveMillis(s.data?.practice));
                    const Chevron = open ? ChevronDown : ChevronRight;
                    return (
                      <Fragment key={s.uid}>
                        <tr onClick={() => setExpanded(open ? null : s.uid)}
                          className="cursor-pointer transition hover:bg-teal/5"
                          style={{ borderTop: "1px solid var(--color-border)", background: open ? "color-mix(in oklab, var(--color-emerald-elixir) 6%, transparent)" : "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 font-ui font-semibold text-sm">
                              <Chevron className="h-3.5 w-3.5 text-parchment/40 flex-shrink-0" /> {s.name ?? "Student"}
                            </span>
                          </td>
                          {CURRICULUM.map((t) => (
                            <td key={t.id} className="px-2 py-3 text-center"><StageChip pp={s.data?.pathProgress?.[t.id]} /></td>
                          ))}
                          <td className="px-2 py-3 text-center">
                            {(() => {
                              const craft = s.data?.craft;
                              const tierName = TIERS[Math.min(craft?.tier ?? 0, TIERS.length - 1)].name;
                              return (
                                <span
                                  className="text-xs whitespace-nowrap"
                                  title={`${craft?.count ?? 0}/${CRAFTS.length} crafts mastered (trial ≥2★)`}
                                  style={{ color: (craft?.count ?? 0) > 0 ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 45%, transparent)" }}
                                >
                                  {tierName}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {maxStars === 0 ? (
                              <span className="text-xs text-parchment/40">—</span>
                            ) : (
                              <span className="text-xs whitespace-nowrap" style={{ color: stars > 0 ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 45%, transparent)" }}>
                                {stars}★ / {maxStars}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs text-parchment/80 whitespace-nowrap">{total} action{total === 1 ? "" : "s"}</span>
                              {active && <span className="text-[10px] text-parchment/50 whitespace-nowrap">{active}</span>}
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                            <td colSpan={columnCount} className="px-4 py-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 40%, transparent)" }}>
                              <StudentDetail s={s} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Misconception radar */}
          <StrugglePanel students={students} rosterSize={roster.length} />
        </>
      )}
    </div>
  );
}

// ── Shared bits for the authoring tabs ──────────────────────────────────────
function ClassPills({ classes, classId, onPick }: { classes: ClassInfo[]; classId: string | null; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {classes.map((c) => (
        <button key={c.id} onClick={() => onPick(c.id)}
          className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
          style={classId === c.id ? { background: `color-mix(in oklab, ${T_ACCENT} 18%, transparent)`, color: T_ACCENT } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
          {c.name}
        </button>
      ))}
    </div>
  );
}

const fieldStyle = { background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" } as const;
const cardStyle = { background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" } as const;

function AuthorEmpty({ icon: Icon, title, desc }: { icon: typeof Layers; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-10 text-center">
      <span className="orb-rune mx-auto flex h-12 w-12 text-gold">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-display text-base mb-1 mt-3">{title}</h3>
      <p className="text-sm text-parchment/60">{desc}</p>
    </div>
  );
}

// ── Quiz Builder ────────────────────────────────────────────────────────────
const BLANK_QUESTION = (): QuizQuestion => ({ prompt: "", choices: ["", "", "", ""], answer: 0, hint: "" });

function QuizEditor({ classId, initial, onDone }: { classId: string; initial: QuizDef; onDone: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initial.questions.length ? initial.questions.map((q) => ({ ...q, choices: [...q.choices], hint: q.hint ?? "" })) : [BLANK_QUESTION()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patchQ = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const save = async () => {
    const err = validateQuiz(title, questions);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await saveQuiz(classId, { ...initial, title, questions });
      onDone();
    } catch (e) {
      console.error("saveQuiz failed:", e);
      setError("Could not save the quiz — check your connection and try again.");
    }
    setSaving(false);
  };

  return (
    <div>
      <button onClick={onDone} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-parchment/60 hover:text-teal transition mb-4">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to quizzes
      </button>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title (e.g. Atomic Structure check-in)"
        className="w-full rounded-lg px-4 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none mb-4" style={fieldStyle} />

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-2xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-parchment/50">Question {i + 1}</span>
              <button onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))} disabled={questions.length === 1}
                className="inline-flex items-center gap-1 text-[11px] text-parchment/50 hover:text-crimson transition disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <input value={q.prompt} onChange={(e) => patchQ(i, { prompt: e.target.value })} placeholder="The question prompt…"
              className="w-full rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none mb-3" style={fieldStyle} />
            <div className="grid gap-2 sm:grid-cols-2">
              {q.choices.map((c, ci) => (
                <label key={ci} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer"
                  style={{
                    background: "color-mix(in oklab, var(--color-mist) 45%, transparent)",
                    border: q.answer === ci
                      ? `1px solid color-mix(in oklab, ${T_ACCENT} 55%, transparent)`
                      : "1px solid var(--color-border)",
                  }}>
                  <input type="radio" name={`correct-${initial.id}-${i}`} checked={q.answer === ci} onChange={() => patchQ(i, { answer: ci })}
                    className="accent-current flex-shrink-0" style={{ accentColor: T_ACCENT }} title="Mark as the correct answer" />
                  <input value={c} placeholder={`Choice ${ci + 1}`}
                    onChange={(e) => patchQ(i, { choices: q.choices.map((x, xi) => (xi === ci ? e.target.value : x)) })}
                    className="flex-1 min-w-0 bg-transparent text-sm text-spectral placeholder:text-parchment/40 outline-none" />
                  {q.answer === ci && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: T_ACCENT }} />}
                </label>
              ))}
            </div>
            <input value={q.hint ?? ""} onChange={(e) => patchQ(i, { hint: e.target.value })} placeholder="Optional hint (shown after a miss)"
              className="w-full rounded-lg px-3 py-2 text-xs text-spectral placeholder:text-parchment/40 outline-none mt-2" style={fieldStyle} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button onClick={() => setQuestions((prev) => [...prev, BLANK_QUESTION()])}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition hover:-translate-y-0.5"
          style={{ color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
          <Plus className="h-3.5 w-3.5" /> Add question
        </button>
        <button onClick={save} disabled={saving} className="btn-arcane btn-arcane-hover disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save quiz
        </button>
        {error && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-crimson)" }}>
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

/** Per-quiz class results, read live from the rostered students' own docs. */
function QuizResults({ quiz, students }: { quiz: QuizDef; students: StudentSnapshot[] }) {
  const [open, setOpen] = useState(false);
  const taken = students.filter((s) => s.data?.assignmentResults?.[quiz.id]);
  const avg = taken.length
    ? Math.round((taken.reduce((sum, s) => { const r = s.data!.assignmentResults![quiz.id]; return sum + (r.outOf ? r.score / r.outOf : 0); }, 0) / taken.length) * 100)
    : null;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="inline-flex items-center gap-1.5 text-xs text-parchment/70">
          <Chevron className="h-3.5 w-3.5 text-parchment/40" />
          {students.length === 0
            ? "No students enrolled yet"
            : `${taken.length} of ${students.length} taken${avg != null ? ` · class average ${avg}%` : ""}`}
        </span>
        <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/45">Results</span>
      </button>
      {open && students.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {students.map((s) => {
            const r = s.data?.assignmentResults?.[quiz.id];
            const pct = r?.outOf ? Math.round((r.score / r.outOf) * 100) : null;
            const tone = pct == null ? "var(--color-parchment)" : pct >= 70 ? T_ACCENT : pct >= 40 ? "var(--color-gold)" : "var(--color-crimson)";
            return (
              <span key={s.uid} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                style={{ background: `color-mix(in oklab, ${tone} ${r ? 10 : 5}%, transparent)`, border: `1px solid color-mix(in oklab, ${tone} ${r ? 30 : 15}%, transparent)`, opacity: r ? 1 : 0.6 }}>
                <span className="text-parchment/80">{s.name ?? "Student"}</span>
                <span className="font-ui font-bold" style={{ color: tone }}>{r ? `${r.score}/${r.outOf}` : "—"}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizBuilderTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [editing, setEditing] = useState<QuizDef | null>(null);
  const [seedTopic, setSeedTopic] = useState(CURRICULUM[0]?.id ?? "");
  const { quizzes, loading } = useClassAssignments(classId);
  const roster = useRoster(classId);
  const { students } = useClassProfiles(roster);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to author quizzes.</p>;

  if (editing && classId) return <QuizEditor classId={classId} initial={editing} onDone={() => setEditing(null)} />;

  const startBlank = () =>
    setEditing({ id: newAssignmentId("qz"), title: "", questions: [], createdAt: Date.now() });

  const seedFromCurriculum = () => {
    const topic = CURRICULUM.find((t) => t.id === seedTopic);
    if (!topic) return;
    setEditing({
      id: newAssignmentId("qz"),
      title: `${topic.title} — concept check`,
      questions: topic.concepts.map((c) => ({
        prompt: c.question.prompt,
        choices: [...c.question.choices],
        answer: c.question.answer,
        hint: c.question.hint,
      })),
      createdAt: Date.now(),
    });
  };

  return (
    <div>
      <ClassPills classes={classes} classId={classId} onPick={(id) => { setClassId(id); setEditing(null); }} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <button onClick={startBlank} className="btn-arcane btn-arcane-hover justify-center">
          <Plus className="h-4 w-4" /> New quiz
        </button>
        <div className="flex items-center gap-2">
          <select value={seedTopic} onChange={(e) => setSeedTopic(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-spectral outline-none" style={fieldStyle}>
            {CURRICULUM.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={seedFromCurriculum}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs tracking-[0.1em] uppercase transition hover:-translate-y-0.5 whitespace-nowrap"
            style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", color: "var(--color-gold)", border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)" }}>
            <Wand2 className="h-3.5 w-3.5" /> Seed from curriculum
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-parchment/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading quizzes…</div>
      ) : quizzes.length === 0 ? (
        <AuthorEmpty icon={Layers} title="No quizzes yet"
          desc="Build one from scratch, or seed it with a curriculum topic's concept questions and edit from there. Students see it on their Assignments page." />
      ) : (
        <div className="space-y-4">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base truncate">{q.title}</h3>
                  <p className="text-xs text-parchment/55 mt-0.5">
                    {q.questions.length} question{q.questions.length === 1 ? "" : "s"} · created {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditing(q)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] tracking-[0.1em] uppercase transition hover:-translate-y-0.5"
                    style={{ color: T_ACCENT, border: `1px solid color-mix(in oklab, ${T_ACCENT} 35%, transparent)` }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => { if (classId && window.confirm(`Delete “${q.title}”? Students will no longer see it.`)) void deleteQuiz(classId, q.id); }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] tracking-[0.1em] uppercase transition hover:-translate-y-0.5"
                    style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
              <QuizResults quiz={q} students={students} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mission Configurator ────────────────────────────────────────────────────
function MissionEditor({ classId, initial, onDone }: { classId: string; initial: MissionDef; onDone: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [note, setNote] = useState(initial.note ?? "");
  const [targets, setTargets] = useState<MissionTarget[]>(initial.targets.map((t) => ({ ...t })));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const picked = new Set(targets.map((t) => t.moduleId));
  const add = (id: string) => {
    const m = moduleById(id);
    if (!m || picked.has(id)) return;
    setTargets((prev) => [...prev, { moduleId: m.id, label: m.label, practiceKey: m.practiceKey }]);
  };
  const move = (i: number, dir: -1 | 1) =>
    setTargets((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    const err = validateMission(title, targets);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await saveMission(classId, { ...initial, title, note, targets });
      onDone();
    } catch (e) {
      console.error("saveMission failed:", e);
      setError("Could not save the mission — check your connection and try again.");
    }
    setSaving(false);
  };

  return (
    <div>
      <button onClick={onDone} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-parchment/60 hover:text-teal transition mb-4">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to missions
      </button>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mission title (e.g. Week 3 — Atoms & the Table)"
        className="w-full rounded-lg px-4 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none mb-3" style={fieldStyle} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="A note to the class (optional) — what to focus on, due date, encouragement…"
        className="w-full rounded-lg px-4 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none resize-y mb-4" style={fieldStyle} />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Catalog */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/50 mb-3">Module catalog — tap to add</p>
          <div className="flex flex-wrap gap-2">
            {MODULE_CATALOG.map((m) => {
              const used = picked.has(m.id);
              return (
                <button key={m.id} onClick={() => add(m.id)} disabled={used}
                  className="rounded-full px-3 py-1.5 text-xs transition disabled:cursor-default"
                  style={used
                    ? { background: `color-mix(in oklab, ${T_ACCENT} 12%, transparent)`, color: T_ACCENT, border: `1px solid color-mix(in oklab, ${T_ACCENT} 30%, transparent)`, opacity: 0.55 }
                    : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
                  {used ? <Check className="inline h-3 w-3 mr-1 -mt-px" /> : <Plus className="inline h-3 w-3 mr-1 -mt-px" />}{m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ordered checklist */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-[10px] tracking-[0.18em] uppercase text-parchment/50 mb-3">Checklist — in order</p>
          {targets.length === 0 ? (
            <p className="text-xs text-parchment/50">Nothing picked yet. Add modules from the catalog; students complete them in this order.</p>
          ) : (
            <div className="space-y-1.5">
              {targets.map((t, i) => (
                <div key={t.moduleId} className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "color-mix(in oklab, var(--color-mist) 45%, transparent)", border: "1px solid var(--color-border)" }}>
                  <span className="font-ui font-semibold text-xs text-parchment/50 w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm flex-1 min-w-0 truncate">{t.label}</span>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-parchment/50 hover:text-teal transition disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === targets.length - 1} className="text-parchment/50 hover:text-teal transition disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setTargets((prev) => prev.filter((_, j) => j !== i))} className="text-parchment/50 hover:text-crimson transition" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button onClick={save} disabled={saving} className="btn-arcane btn-arcane-hover disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save mission
        </button>
        {error && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--color-crimson)" }}>
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

function MissionsTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const [editing, setEditing] = useState<MissionDef | null>(null);
  const { missions, loading } = useClassAssignments(classId);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to compose missions.</p>;
  if (editing && classId) return <MissionEditor classId={classId} initial={editing} onDone={() => setEditing(null)} />;

  return (
    <div>
      <ClassPills classes={classes} classId={classId} onPick={(id) => { setClassId(id); setEditing(null); }} />

      <button onClick={() => setEditing({ id: newAssignmentId("ms"), title: "", note: "", targets: [], createdAt: Date.now() })}
        className="btn-arcane btn-arcane-hover mb-6">
        <Plus className="h-4 w-4" /> New mission
      </button>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-parchment/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading missions…</div>
      ) : missions.length === 0 ? (
        <AuthorEmpty icon={ListChecks} title="No missions yet"
          desc="Compose an ordered checklist of modules with a note to the class. Students tick items off automatically as they practise." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((m) => (
            <div key={m.id} className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base truncate">{m.title}</h3>
                  {m.note ? <p className="text-xs text-parchment/60 mt-1 leading-relaxed">“{m.note}”</p> : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditing(m)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] tracking-[0.1em] uppercase transition hover:-translate-y-0.5"
                    style={{ color: T_ACCENT, border: `1px solid color-mix(in oklab, ${T_ACCENT} 35%, transparent)` }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => { if (classId && window.confirm(`Delete “${m.title}”?`)) void deleteMission(classId, m.id); }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] tracking-[0.1em] uppercase transition hover:-translate-y-0.5"
                    style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
              <ol className="mt-3 space-y-1">
                {m.targets.map((t, i) => (
                  <li key={t.moduleId} className="text-xs text-parchment/70">
                    <span className="font-ui font-semibold text-parchment/45 mr-1.5">{i + 1}.</span>{t.label}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview — the console home, the class at a glance ──────────────────────
function StatTile({ icon: Icon, label, value, tone = "var(--color-emerald-elixir)", hint }: {
  icon: typeof Users; label: string; value: React.ReactNode; tone?: string; hint?: string;
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

function OverviewTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const roster = useRoster(classId);
  const { students, loading } = useClassProfiles(roster);
  const requests = useJoinRequests(classId);
  const evidence = useClassEvidence(roster);

  if (classes.length === 0)
    return <p className="text-sm text-parchment/60">Create a class first to see its overview.</p>;

  const profiles = students.map((s) => s.data);
  const today = todayKey();
  const active = activeTodayCount(profiles, today);
  const pending = requests.length + evidence.filter(isPendingReview).length;
  const mt = masteryTally(profiles);
  const masterySum = mt["not-started"] + mt.developing + mt.proficient + mt.mastered;
  const brewedToday = profiles.filter((p) => starterStreakState(p?.starterStreak, today) === "today").length;
  const streaksLive = profiles.filter((p) => { const st = starterStreakState(p?.starterStreak, today); return st === "today" || st === "yesterday"; }).length;
  const longest = profiles.reduce((m, p) => Math.max(m, p?.starterStreak?.count ?? 0), 0);
  const col = classCollectionTotals(profiles);
  const trouble = aggregateConceptTrouble(profiles).slice(0, 3);
  const idle = idleStudents(students, 7);

  const masterySeg = [
    { k: "mastered", label: "Mastered", color: "var(--color-emerald-elixir)", n: mt.mastered },
    { k: "proficient", label: "Proficient", color: "var(--color-gold)", n: mt.proficient },
    { k: "developing", label: "Developing", color: "var(--color-wraith)", n: mt.developing },
    { k: "not-started", label: "Not started", color: "color-mix(in oklab, var(--color-parchment) 40%, transparent)", n: mt["not-started"] },
  ];

  return (
    <div className="space-y-6">
      <ClassPills classes={classes} classId={classId} onPick={setClassId} />
      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet — share the join code from the Classes tab.</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-parchment/60" style={cardStyle}><Loader2 className="h-4 w-4 animate-spin" /> Gathering class data…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Users} label="Enrolled" value={roster.length} tone="var(--color-emerald-elixir)" />
            <StatTile icon={Flame} label="Active today" value={active} tone="var(--color-gold)" hint={`${Math.round((active / roster.length) * 100)}% of the class`} />
            <StatTile icon={Clock} label="Needs review" value={pending} tone={pending > 0 ? "var(--color-gold)" : "var(--color-emerald-elixir)"} hint={pending > 0 ? "join requests + evidence" : "all clear"} />
            <StatTile icon={FlaskConical} label="Compounds forged" value={col.compounds} tone="var(--color-wraith)" hint={`${col.cards} cards scanned`} />
          </div>

          <div className="rounded-2xl p-5" style={cardStyle}>
            <h3 className="font-display text-base mb-3">Mastery pulse</h3>
            {masterySum === 0 ? (
              <p className="text-xs text-parchment/50">No mastery levels set yet — grade a topic in the Gradebook and it appears here.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ border: "1px solid var(--color-border)" }}>
                  {masterySeg.filter((s) => s.n > 0).map((s) => (
                    <span key={s.k} title={`${s.label}: ${s.n}`} style={{ width: `${(s.n / masterySum) * 100}%`, background: s.color }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {masterySeg.map((s) => (
                    <span key={s.k} className="inline-flex items-center gap-1.5 text-[11px] text-parchment/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.label} <span className="font-ui font-bold text-spectral">{s.n}</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-display text-base mb-3 inline-flex items-center gap-2"><Flame className="h-4 w-4 text-gold" /> Daily rite</h3>
              <div className="space-y-1.5 text-sm">
                <p className="flex justify-between"><span className="text-parchment/60">Brewed today</span> <span className="font-ui font-bold">{brewedToday}/{roster.length}</span></p>
                <p className="flex justify-between"><span className="text-parchment/60">Streaks live</span> <span className="font-ui font-bold text-gold">{streaksLive}</span></p>
                <p className="flex justify-between"><span className="text-parchment/60">Longest streak</span> <span className="font-ui font-bold">{longest} day{longest === 1 ? "" : "s"}</span></p>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-display text-base mb-3 inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gold" /> Needs attention</h3>
              {trouble.length === 0 && idle.length === 0 ? (
                <p className="text-xs text-parchment/50">Nothing flagged — no overdue reviews and everyone's been active this week.</p>
              ) : (
                <div className="space-y-2.5">
                  {trouble.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-parchment/50">Struggling concepts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {trouble.map((t) => { const hit = conceptById(t.conceptId); return (
                          <span key={t.conceptId} className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: "color-mix(in oklab, var(--color-crimson) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 28%, transparent)" }}>{hit?.concept.title ?? prettyId(t.conceptId)}</span>
                        ); })}
                      </div>
                    </div>
                  )}
                  {idle.length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-parchment/50">Quiet 7+ days</p>
                      <div className="flex flex-wrap gap-1.5">
                        {idle.slice(0, 8).map((s) => (
                          <span key={s.uid} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-parchment/70" style={{ border: "1px solid var(--color-border)" }}><UserX className="h-3 w-3" /> {s.name ?? "Student"}</span>
                        ))}
                        {idle.length > 8 && <span className="self-center text-[11px] text-parchment/50">+{idle.length - 8} more</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Daily Starters — streak oversight (engagement, never a grade) ───────────
function StartersTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const roster = useRoster(classId);
  const { students, loading } = useClassProfiles(roster);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to see daily-rite engagement.</p>;

  const today = todayKey();
  const rows = students
    .map((s) => ({ s, streak: s.data?.starterStreak, state: starterStreakState(s.data?.starterStreak, today), last: s.data?.starterHistory?.[0] }))
    .sort((a, b) => (b.streak?.count ?? 0) - (a.streak?.count ?? 0));
  const brewedToday = rows.filter((r) => r.state === "today").length;
  const live = rows.filter((r) => r.state === "today" || r.state === "yesterday").length;
  const longest = rows.reduce((m, r) => Math.max(m, r.streak?.count ?? 0), 0);

  const STATE_META: Record<StreakState, { label: string; color: string }> = {
    today: { label: "Brewed today", color: "var(--color-emerald-elixir)" },
    yesterday: { label: "Due today", color: "var(--color-gold)" },
    lapsed: { label: "Lapsed", color: "var(--color-crimson)" },
    none: { label: "Not started", color: "color-mix(in oklab, var(--color-parchment) 45%, transparent)" },
  };

  return (
    <div className="space-y-6">
      <ClassPills classes={classes} classId={classId} onPick={setClassId} />
      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-parchment/60" style={cardStyle}><Loader2 className="h-4 w-4 animate-spin" /> Gathering streaks…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile icon={Flame} label="Brewed today" value={`${brewedToday}/${roster.length}`} tone="var(--color-emerald-elixir)" />
            <StatTile icon={Flame} label="Streaks live" value={live} tone="var(--color-gold)" />
            <StatTile icon={Award} label="Longest streak" value={`${longest}d`} tone="var(--color-wraith)" />
          </div>
          <p className="-mb-2 text-xs text-parchment/50">Engagement only — the daily rite is never a grade.</p>
          <div className="space-y-1.5">
            {rows.map(({ s, streak, state, last }, i) => { const m = STATE_META[state]; return (
              <div key={s.uid} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={cardStyle}>
                <span className="w-5 flex-shrink-0 text-center font-ui text-xs text-parchment/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-ui text-sm font-semibold">{s.name ?? "Student"}</span>
                {last && <span className="hidden text-[11px] text-parchment/50 sm:inline">last {last.score}/{last.outOf}</span>}
                <span className="inline-flex items-center gap-1 text-sm" style={{ color: m.color }}><Flame className="h-3.5 w-3.5" /> {streak?.count ?? 0}</span>
                <span className="hidden text-[11px] text-parchment/50 sm:inline">best {streak?.best ?? streak?.count ?? 0}</span>
                <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]" style={{ color: m.color, background: `color-mix(in oklab, ${m.color} 12%, transparent)` }}>{m.label}</span>
              </div>
            ); })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Collections — Grimoire & Compound Codex oversight ───────────────────────
function CollectionsTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const roster = useRoster(classId);
  const { students, loading } = useClassProfiles(roster);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to see collections.</p>;

  const profiles = students.map((s) => s.data);
  const col = classCollectionTotals(profiles);
  const top = topForgedCompounds(profiles, 10);
  const rows = students
    .map((s) => ({ s, cards: s.data?.grimoire?.length ?? 0, compounds: s.data?.compounds?.length ?? 0, forged: s.data?.forged?.length ?? 0 }))
    .sort((a, b) => (b.compounds + b.cards) - (a.compounds + a.cards));

  return (
    <div className="space-y-6">
      <ClassPills classes={classes} classId={classId} onPick={setClassId} />
      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl py-14 text-sm text-parchment/60" style={cardStyle}><Loader2 className="h-4 w-4 animate-spin" /> Gathering collections…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile icon={BookMarked} label="Cards scanned" value={col.cards} tone="var(--color-emerald-elixir)" />
            <StatTile icon={FlaskConical} label="Compounds forged" value={col.compounds} tone="var(--color-gold)" />
            <StatTile icon={Sparkles} label="Forged variants" value={col.forged} tone="var(--color-wraith)" />
          </div>

          {top.length > 0 && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-display text-base mb-3">Most-forged compounds</h3>
              <div className="flex flex-wrap gap-2">
                {top.map((t) => (
                  <span key={t.formula} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]" style={{ background: "color-mix(in oklab, var(--color-gold) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)" }}>
                    <span className="font-ui font-bold text-spectral">{t.formula}</span>
                    <span className="text-parchment/60">×{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {rows.map(({ s, cards, compounds, forged }) => (
              <div key={s.uid} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={cardStyle}>
                <span className="min-w-0 flex-1 truncate font-ui text-sm font-semibold">{s.name ?? "Student"}</span>
                <span className="inline-flex items-center gap-1 text-xs text-parchment/70" title="Element cards scanned"><BookMarked className="h-3.5 w-3.5 text-teal" /> {cards}</span>
                <span className="inline-flex items-center gap-1 text-xs text-parchment/70" title="Compounds forged"><FlaskConical className="h-3.5 w-3.5 text-gold" /> {compounds}</span>
                <span className="inline-flex items-center gap-1 text-xs text-parchment/70" title="Forged card variants"><Sparkles className="h-3.5 w-3.5 text-wraith" /> {forged}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Bulletin — notices the class sees on their Assignments page ─────────────
function BulletinTab({ classes }: { classes: ClassInfo[] }) {
  const [classId, setClassId] = useState<string | null>(classes[0]?.id ?? null);
  const { announcements, loading } = useClassAssignments(classId);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [posting, setPosting] = useState(false);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to post notices.</p>;

  const post = async () => {
    if (!classId || !body.trim()) return;
    setPosting(true);
    try {
      await saveAnnouncement(classId, { id: newAssignmentId("an"), body: body.trim(), pinned, createdAt: Date.now() });
      setBody(""); setPinned(false);
    } catch (e) { console.error("saveAnnouncement failed:", e); }
    setPosting(false);
  };
  const togglePin = async (a: AnnouncementDef) => { if (classId) await saveAnnouncement(classId, { ...a, pinned: !a.pinned }); };
  const remove = async (a: AnnouncementDef) => { if (classId && window.confirm("Delete this notice? Students will no longer see it.")) await deleteAnnouncement(classId, a.id); };

  return (
    <div>
      <ClassPills classes={classes} classId={classId} onPick={setClassId} />
      <div className="mb-6 rounded-2xl p-4" style={cardStyle}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="Post a notice to the class — a reminder, a nudge, a word of encouragement. Students see it at the top of their Assignments page."
          className="w-full resize-y rounded-lg px-3 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none" style={fieldStyle} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-parchment/70">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ accentColor: T_ACCENT }} /> <Pin className="h-3.5 w-3.5" /> Pin to top
          </label>
          <button onClick={post} disabled={posting || !body.trim()} className="btn-arcane btn-arcane-hover ml-auto disabled:opacity-60">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Post notice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-parchment/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading notices…</div>
      ) : announcements.length === 0 ? (
        <AuthorEmpty icon={Megaphone} title="No notices yet" desc="Post a notice and the whole class sees it on their Assignments page — pinned notices stay on top." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl p-4" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {a.pinned && <span className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-gold"><Pin className="h-3 w-3" /> Pinned</span>}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-parchment">{a.body}</p>
                  <p className="mt-1.5 text-[11px] text-parchment/45">{new Date(a.createdAt).toLocaleDateString()} · {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button onClick={() => togglePin(a)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] uppercase tracking-[0.1em] transition hover:-translate-y-0.5" style={{ color: a.pinned ? "var(--color-gold)" : "var(--color-parchment)", border: `1px solid ${a.pinned ? "color-mix(in oklab, var(--color-gold) 35%, transparent)" : "var(--color-border)"}` }}>
                    <Pin className="h-3 w-3" /> {a.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => remove(a)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] uppercase tracking-[0.1em] transition hover:-translate-y-0.5" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hover name chip for the console rail — same language as the student rail. */
function RailChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
      {children}
    </span>
  );
}

type TeacherTab =
  | "overview" | "classes" | "gradebook" | "matrix"
  | "starters" | "collections" | "evidence" | "quizzes" | "missions" | "bulletin";

function TeacherConsole() {
  const { uid, profile } = useUserProfile();
  const navigate = useNavigate();
  const [tab, setTabRaw] = useState<TeacherTab>("overview");
  // The mobile "More" sheet (the tabs past the five that fit the bottom bar).
  const [moreOpen, setMoreOpen] = useState(false);
  const setTab = (t: TeacherTab) => { setTabRaw(t); setMoreOpen(false); };
  const { classes } = useTeacherClasses(uid);
  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Educator";

  // Full section list — order doubles as the desktop rail order. `primary`
  // marks the four that sit directly in the mobile bottom bar (the rest live
  // behind "More"), mirroring the student shell's bottom-nav density.
  const TABS = [
    { key: "overview", label: "Overview", short: "Overview", icon: LayoutDashboard, primary: true },
    { key: "classes", label: "Classes", short: "Classes", icon: Users, primary: true },
    { key: "gradebook", label: "Gradebook", short: "Grades", icon: ClipboardCheck, primary: true },
    { key: "matrix", label: "Performance", short: "Stats", icon: Sparkles, primary: true },
    { key: "starters", label: "Daily Starters", short: "Starters", icon: Flame, primary: false },
    { key: "collections", label: "Collections", short: "Cards", icon: BookMarked, primary: false },
    { key: "evidence", label: "Evidence", short: "Evidence", icon: ScanSearch, primary: false },
    { key: "quizzes", label: "Quiz Builder", short: "Quizzes", icon: Layers, primary: false },
    { key: "missions", label: "Missions", short: "Missions", icon: ListChecks, primary: false },
    { key: "bulletin", label: "Bulletin", short: "Bulletin", icon: Megaphone, primary: false },
  ] as const;

  const primaryTabs = TABS.filter((t) => t.primary);
  const overflowTabs = TABS.filter((t) => !t.primary);
  const inMore = overflowTabs.some((t) => t.key === tab);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="grimoire-display bg-arcane min-h-screen text-spectral">
      <ArcaneField />

      {/* ── Desktop rail — the console's only chrome, like the student side ── */}
      <nav
        aria-label="Console sections"
        className="glass-strong scroll-slim hidden md:flex fixed left-3 top-1/2 z-40 max-h-[calc(100vh-4rem)] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden rounded-2xl p-1.5"
      >
        <Link to="/" aria-label="AlcheMix home" className="group relative flex h-11 w-10 flex-shrink-0 items-center justify-center">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-110" />
          <RailChip>AlcheMix · Educator</RailChip>
        </Link>

        <div className="my-1 h-px w-6 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-label={t.label}
              className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-teal/10"
              style={{
                color: active ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
                background: active ? "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)" : undefined,
              }}
            >
              {active && (
                <span
                  className="absolute left-0 h-5 w-0.5 rounded-full"
                  style={{ background: "linear-gradient(180deg, var(--color-emerald-elixir), var(--color-wraith))" }}
                />
              )}
              <t.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
              <RailChip>{t.label}</RailChip>
            </button>
          );
        })}

        <div className="my-1 h-px w-6 flex-shrink-0" style={{ background: "var(--color-border)" }} />

        <div className="group relative flex-shrink-0">
          <ThemeToggle className="!h-10 !w-10 !rounded-xl !border-0 !bg-transparent" />
          <RailChip>Theme</RailChip>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson"
        >
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          <RailChip>Sign out</RailChip>
        </button>
      </nav>

      {/* ── Mobile top bar ── */}
      <header className="glass-strong md:hidden fixed top-2 inset-x-2 z-40 flex h-14 items-center justify-between rounded-2xl px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-ui text-sm font-medium tracking-[0.12em]">
            AlcheMix <span className="text-teal">Educator</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="!h-8 !w-8" />
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 px-5 pt-20 pb-28 md:pl-24 md:pr-8 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-6xl">
          <PageHeader home="/teacher" hideNav eyebrow="Educator Console" title={`Welcome, ${name}.`} subtitle="Set up classes, enrol students with a join code, and grade their progress." icon={GraduationCap} />

          {/* Working tabs see only active classes; the Classes tab manages
              archived ones too. */}
          {tab === "overview" && <OverviewTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "classes" && <ClassesTab teacherId={uid ?? ""} teacherName={profile?.displayName ?? profile?.email ?? null} schoolId={profile?.schoolId ?? null} classes={classes} />}
          {tab === "gradebook" && <GradebookTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "matrix" && <MatrixTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "starters" && <StartersTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "collections" && <CollectionsTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "evidence" && <EvidenceTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "quizzes" && <QuizBuilderTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "missions" && <MissionsTab classes={classes.filter((c) => !c.archived)} />}
          {tab === "bulletin" && <BulletinTab classes={classes.filter((c) => !c.archived)} />}
        </div>
      </div>

      {/* ── Mobile "More" sheet — the overflow sections, as a bottom sheet
          (mirrors the student shell's chapter sheet) ── */}
      {moreOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="glass-strong sheet-up fixed bottom-[5rem] inset-x-3 z-50 rounded-2xl p-2.5 pb-3">
            <p className="px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-parchment/55">More sections</p>
            <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {overflowTabs.map((t, i) => {
                const active = tab === t.key;
                return (
                  <li key={t.key} className="orb-in" style={{ animationDelay: `${i * 18}ms` }}>
                    <button
                      onClick={() => setTab(t.key)}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5"
                      style={{
                        color: active ? "var(--color-emerald-elixir)" : "var(--color-spectral)",
                        background: active ? "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)" : undefined,
                      }}
                    >
                      <span className={`orb-rune h-8 w-8 ${active ? "orb-rune-active" : ""}`}>
                        <t.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 truncate text-[12px] font-medium">{t.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ── Mobile section bar — the desktop rail, laid flat (mirrors the
          student shell's bottom tab nav). Five slots: four primary + More. ── */}
      <nav
        aria-label="Console sections"
        className="glass-strong md:hidden fixed bottom-2 inset-x-2 z-50 flex h-16 items-stretch justify-around overflow-hidden rounded-2xl"
      >
        {primaryTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: "var(--color-emerald-elixir)" }} />}
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.short}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          aria-label="More sections"
          aria-expanded={moreOpen}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
          style={{ color: moreOpen || inMore ? "var(--color-emerald-elixir)" : "var(--color-parchment)" }}
        >
          {inMore && <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: "var(--color-emerald-elixir)" }} />}
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
