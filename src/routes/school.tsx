import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  School as SchoolIcon, Copy, Check, X, LogOut, Upload, GraduationCap, IdCard,
  Camera, KeyRound, LayoutDashboard, BookOpen, Clock, Archive, Loader2,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ArcaneField } from "../components/ArcaneField";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import { fileToDataUrl, downscale, approveTeacher, rejectTeacher, getVerification, type Verification } from "../lib/admin";
import { useUserProfile } from "../lib/profile";
import {
  getSchool, updateSchool, useSchoolTeachers, createTeacherAccount, useSchoolClasses,
  type School, type SchoolTeacher,
} from "../lib/schools";

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

type SchoolTab = "overview" | "school" | "teachers" | "classes";

/** Hover name chip for the console rail — same language as the student/teacher rails. */
function RailChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass-strong pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium text-spectral opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
      {children}
    </span>
  );
}

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
  const [copied, setCopied] = useState(false);
  const pending = teachers.filter((t) => (t.status ?? "pending") === "pending").length;
  const activeClasses = classes.filter((c) => !c.archived).length;

  const copy = async () => {
    try { await navigator.clipboard.writeText(school.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={GraduationCap} label="Teachers" value={teachers.length} tone={ACCENT}
          hint={pending > 0 ? `${pending} awaiting approval` : "all approved"} />
        <StatTile icon={BookOpen} label="Classes" value={classes.length} tone="var(--color-emerald-elixir)"
          hint={`${activeClasses} active`} />
        <StatTile icon={KeyRound} label="School code" value={<span className="tracking-[0.12em]">{school.code}</span>} tone="var(--color-gold)"
          hint="teachers join with this" />
      </div>

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

// ── Classes — read-only oversight of every class in the school ──────────────
function ClassRow({ cls, teacherName }: { cls: ReturnType<typeof useSchoolClasses>[number]; teacherName: string }) {
  const [copied, setCopied] = useState(false);
  const code = cls.joinCode ?? cls.id;
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={CARD}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-spectral">
          {cls.name}
          {cls.archived && <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-parchment/60" style={{ border: "1px solid var(--color-border)" }}>Archived</span>}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-parchment/55"><GraduationCap className="h-3.5 w-3.5" /> {teacherName}</p>
      </div>
      <button onClick={copy} title="Class join code — students enter this"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-teal transition hover:brightness-110"
        style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
        <KeyRound className="h-3 w-3" /> <span className="font-ui font-bold tracking-[0.15em]">{code}</span>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-60" />}
      </button>
    </div>
  );
}

function ClassesOversight({ school }: { school: School }) {
  const classes = useSchoolClasses(school.id);
  const { teachers } = useSchoolTeachers(school.id);
  const nameOf = (uid: string) => {
    const t = teachers.find((x) => x.uid === uid);
    return t?.displayName ?? t?.email ?? "Unknown teacher";
  };
  const active = classes.filter((c) => !c.archived);
  const archived = classes.filter((c) => c.archived);

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl px-5 py-10 text-center" style={CARD}>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, color: ACCENT }}>
          <BookOpen className="h-5 w-5" />
        </span>
        <h3 className="font-display text-base mb-1">No classes yet</h3>
        <p className="text-sm text-parchment/60">Classes appear here as your teachers create them under {school.name}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-parchment/55">
        Every class under {school.name}. Read-only — teachers manage their own rosters, grades and assignments.
        Student counts live in each teacher's console.
      </p>
      <div className="space-y-2">
        {active.map((c) => <ClassRow key={c.id} cls={c} teacherName={nameOf(c.teacherId)} />)}
      </div>
      {archived.length > 0 && (
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-parchment/50"><Archive className="h-3.5 w-3.5" /> Archived</p>
          <div className="space-y-2">
            {archived.map((c) => <ClassRow key={c.id} cls={c} teacherName={nameOf(c.teacherId)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/** School Admin console — same shell as the teacher side (see DESIGN_DIRECTION §7b). */
function SchoolDashboard() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const schoolId = profile?.schoolId;
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
    { key: "school", label: "School", icon: SchoolIcon },
    { key: "teachers", label: "Teachers", icon: GraduationCap },
    { key: "classes", label: "Classes", icon: BookOpen },
  ] as const;

  const body = loading ? (
    <div className="mt-10 flex items-center justify-center gap-2 text-sm text-parchment/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading your school…</div>
  ) : !school ? (
    <p className="mt-10 text-center text-parchment/60">No school is linked to this account yet. Ask a super admin to assign you to a school.</p>
  ) : (
    <>
      {tab === "overview" && <SchoolOverview school={school} onJump={setTab} />}
      {tab === "school" && <div className="space-y-6"><CodeCard school={school} /><BrandingCard school={school} onSaved={(s) => setSchool(s)} /></div>}
      {tab === "teachers" && <TeachersCard school={school} />}
      {tab === "classes" && <ClassesOversight school={school} />}
    </>
  );

  return (
    <div className="grimoire-display bg-arcane min-h-screen text-spectral">
      <ArcaneField />

      {/* ── Desktop rail ── */}
      <nav aria-label="Console sections" className="glass-strong hidden md:flex fixed left-3 top-1/2 z-40 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl p-1.5">
        <Link to="/" aria-label="AlcheMix home" className="group relative flex h-11 w-10 flex-shrink-0 items-center justify-center">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-110" />
          <RailChip>AlcheMix · School Admin</RailChip>
        </Link>
        <div className="my-1 h-px w-6 flex-shrink-0" style={{ background: "var(--color-border)" }} />
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} aria-label={t.label}
              className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-amber-scry/10"
              style={{ color: active ? ACCENT : "var(--color-parchment)", background: active ? `color-mix(in oklab, ${ACCENT} 10%, transparent)` : undefined }}>
              {active && <span className="absolute left-0 h-5 w-0.5 rounded-full" style={{ background: ACCENT }} />}
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
        <button onClick={handleSignOut} aria-label="Sign out"
          className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-parchment/60 transition-colors hover:bg-crimson/10 hover:text-crimson">
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          <RailChip>Sign out</RailChip>
        </button>
      </nav>

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
      <div className="relative z-10 px-5 pt-20 pb-28 md:pl-24 md:pr-8 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-5xl">
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

function TeacherRow({ t, code }: { t: SchoolTeacher; code?: string }) {
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
        ) : statusBadge(t.status)}
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

  // teacherId → their (first, active) class join code, for sharing with students.
  const codeByTeacher = new Map<string, string>();
  for (const c of classes) {
    if (c.archived) continue;
    if (!codeByTeacher.has(c.teacherId)) codeByTeacher.set(c.teacherId, c.joinCode ?? c.id);
  }

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
        <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
          {teachers.map((t) => <TeacherRow key={t.uid} t={t} code={codeByTeacher.get(t.uid)} />)}
        </ul>
      )}
    </div>
  );
}
