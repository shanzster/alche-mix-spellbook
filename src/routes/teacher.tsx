import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap, Users, ClipboardCheck, Plus, Copy, Check, LogOut, BookOpen,
  Camera, Layers, Sparkles, ChevronLeft,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import { useUserProfile, type Mastery } from "../lib/profile";
import {
  createClass, useTeacherClasses, useRoster, getStudentGrades, setStudentGrade,
  GRADE_TOPICS, type ClassInfo, type RosterEntry,
} from "../lib/teacher";

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
function ClassCard({ cls }: { cls: ClassInfo }) {
  const roster = useRoster(cls.id);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(cls.id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg">{cls.name}</h3>
          <p className="text-xs text-parchment/60 mt-0.5 inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {roster.length} enrolled</p>
        </div>
        <button onClick={copy} className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:-translate-y-0.5"
          style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}>
          <span className="font-display text-lg tracking-[0.3em] text-teal">{cls.id}</span>
          {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4 text-parchment/60" />}
        </button>
      </div>
      {roster.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {roster.map((s) => (
            <span key={s.uid} className="rounded-full px-3 py-1 text-xs text-parchment" style={{ background: "color-mix(in oklab, var(--color-mist) 50%, transparent)", border: "1px solid var(--color-border)" }}>
              {s.name ?? s.email ?? "Student"}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-parchment/50">Share the code <span className="text-teal font-display tracking-[0.2em]">{cls.id}</span> — students enter it on their dashboard to enrol.</p>
      )}
    </div>
  );
}

function ClassesTab({ teacherId, teacherName, classes }: { teacherId: string; teacherName: string | null; classes: ClassInfo[] }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await createClass(teacherId, teacherName, name.trim());
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
        <div className="rounded-2xl px-5 py-10 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
          <Users className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
          <p className="font-display text-base mb-1">No classes yet</p>
          <p className="text-sm text-parchment/60">Create your first class to generate a join code students can use.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => <ClassCard key={c.id} cls={c} />)}
        </div>
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
            <span className="font-display text-sm flex-1">{topic}</span>
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
  const roster = useRoster(classId);

  if (classes.length === 0) return <p className="text-sm text-parchment/60">Create a class first to grade students.</p>;
  if (student) return <StudentGradePanel student={student} onBack={() => setStudent(null)} />;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {classes.map((c) => (
          <button key={c.id} onClick={() => { setClassId(c.id); setStudent(null); }}
            className="rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
            style={classId === c.id ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {c.name}
          </button>
        ))}
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-parchment/50">No students enrolled in this class yet.</p>
      ) : (
        <div className="space-y-2">
          {roster.map((s) => (
            <button key={s.uid} onClick={() => setStudent(s)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-teal/5"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <span className="font-display text-sm">{s.name ?? s.email}</span>
              <span className="text-xs tracking-[0.15em] uppercase text-teal">Grade →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scaffolded (AI / later) tools ───────────────────────────────────────────
const SOON = [
  { icon: Layers, title: "Quiz Builder", desc: "Configure bonding targets, timed balancing & 3D identification quizzes (§2)." },
  { icon: Camera, title: "Mission Configurator", desc: "Build AR scavenger hunts and lock/unlock simulation modules (§3)." },
  { icon: Sparkles, title: "AI Evaluation Review", desc: "Review AI pre-grading of AR frames & Time-Attack, with manual override (§4)." },
];

function TeacherConsole() {
  const { uid, profile } = useUserProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"classes" | "gradebook" | "tools">("classes");
  const { classes } = useTeacherClasses(uid);
  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Educator";

  const TABS = [
    { key: "classes", label: "Classes", icon: Users },
    { key: "gradebook", label: "Gradebook", icon: ClipboardCheck },
    { key: "tools", label: "More Tools", icon: BookOpen },
  ] as const;

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 h-16 border-b backdrop-blur-xl" style={{ borderColor: "var(--color-border)", background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--color-emerald-elixir) 60%, transparent))" }} />
          <span className="font-display text-lg tracking-[0.15em]">AlcheMix <span className="text-teal">Educator</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="!h-9 !w-9" />
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="inline-flex items-center gap-1.5 text-xs text-parchment/70 hover:text-crimson transition">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8 py-8">
        <PageHeader eyebrow="Educator Console" title={`Welcome, ${name}.`} subtitle="Set up classes, enrol students with a join code, and grade their progress." icon={GraduationCap} />

        {/* Tabs */}
        <div className="inline-flex rounded-full p-1 mb-8" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
              style={tab === t.key ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)" }}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "classes" && <ClassesTab teacherId={uid ?? ""} teacherName={profile?.displayName ?? profile?.email ?? null} classes={classes} />}
        {tab === "gradebook" && <GradebookTab classes={classes} />}
        {tab === "tools" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOON.map((s) => (
              <div key={s.title} className="rounded-2xl p-5 opacity-75" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", color: "var(--color-gold)" }}><s.icon className="h-5 w-5" /></span>
                <h3 className="font-display text-base mb-1">{s.title}</h3>
                <p className="text-xs text-parchment/60 leading-relaxed mb-2">{s.desc}</p>
                <span className="text-[9px] tracking-[0.2em] uppercase text-gold">Coming soon</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
