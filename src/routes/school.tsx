import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { School as SchoolIcon, Copy, Check, X, LogOut, Upload, GraduationCap, IdCard, Camera, KeyRound } from "lucide-react";
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

/** School Admin dashboard (Phase 2 — see docs/SCHOOL_MULTITENANCY.md). */
function SchoolDashboard() {
  const { profile } = useUserProfile();
  const schoolId = profile?.schoolId;
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!schoolId) { setLoading(false); return; }
    getSchool(schoolId).then((s) => { if (alive) { setSchool(s); setLoading(false); } });
    return () => { alive = false; };
  }, [schoolId]);

  return (
    <div className="grimoire-display bg-arcane min-h-screen text-spectral">
      <ArcaneField />
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-8 pb-24">
        <PageHeader
          eyebrow="School Admin"
          title={school?.name ?? "Your School"}
          subtitle="Manage your school's details and share the code with your teachers."
          icon={SchoolIcon}
          accent="var(--color-amber-scry)"
          home="/school"
          hideNav
          right={
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => signOut()} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-parchment transition hover:text-crimson"
                style={{ background: "color-mix(in oklab, var(--color-crimson) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          }
        />

        {loading ? (
          <p className="mt-10 text-center text-parchment/60">Loading your school…</p>
        ) : !school ? (
          <p className="mt-10 text-center text-parchment/60">
            No school is linked to this account yet. Ask a super admin to assign you to a school.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            <CodeCard school={school} />
            <BrandingCard school={school} onSaved={(s) => setSchool(s)} />
            <TeachersCard school={school} />
          </div>
        )}
      </div>
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
