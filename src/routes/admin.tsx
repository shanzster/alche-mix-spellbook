import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ComponentType } from "react";
import {
  ShieldCheck, Check, X, LogOut, IdCard, Camera, Inbox, ScanFace,
  LayoutDashboard, Users, GraduationCap, BookOpen, Search, UserCog,
  School, Plus, ArrowUpRight, Pencil, Trash2, UserPlus, ScrollText,
  Database, Download, Upload, Save, RotateCcw, AlertTriangle, Archive, FileJson,
} from "lucide-react";
import { RequireRole } from "../components/RequireRole";
import { ArcaneField } from "../components/ArcaneField";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut, auth } from "../lib/auth";
import type { Role, StudentProfile } from "../lib/profile";
import {
  usePendingVerifications, useAllUsers, useAllClasses,
  approveTeacher, rejectTeacher, setTeacherStatus,
  updateUserAdmin, deleteUserProfile, createUserAdmin,
  updateClassAdmin, deleteClassAdmin, type AdminClass,
  type Verification,
} from "../lib/admin";
import {
  BACKUP_COLLECTIONS, DEFAULT_BACKUP, exportDatabase, serializeBackup, parseBackup,
  downloadJson, countDocs, createSnapshot, useSnapshots, getSnapshotPayload,
  deleteSnapshot, restoreBackup, type BackupPayload, type SnapshotMeta, type RestoreReport,
} from "../lib/backup";
import {
  useSchools, createSchoolWithAdmin, createSchoolAdminAccount,
  regenerateSchoolCode, backfillIntoDefaultSchool, updateSchool, deleteSchool,
  type School as SchoolRec,
} from "../lib/schools";
import { useAuditLog, type AuditEntry } from "../lib/audit";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole role="admin">
      <AdminConsole />
    </RequireRole>
  ),
});

type TabKey = "overview" | "schools" | "verifications" | "teachers" | "users" | "classes" | "data" | "audit";

const ACCENT = "var(--color-wraith)";

// ── Small building blocks ───────────────────────────────────────────────────

/** An accent-tinted icon chip — one colour per icon, so the ring and glyph
 *  always agree (unlike the shared gold-ringed orb-rune). */
function Orb({ icon: Icon, accent = ACCENT, active = false, size = "h-10 w-10" }: {
  icon: ComponentType<{ className?: string }>; accent?: string; active?: boolean; size?: string;
}) {
  return (
    <span
      className={`flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${size}`}
      style={{
        color: accent,
        background: `color-mix(in oklab, ${accent} ${active ? 18 : 11}%, transparent)`,
        border: `1px solid color-mix(in oklab, ${accent} ${active ? 48 : 26}%, transparent)`,
      }}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function StatCard({ label, value, accent, icon }: {
  label: string; value: number | string; accent: string; icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <Orb icon={icon} accent={accent} />
      <div>
        <div className="font-ui text-3xl font-bold leading-none" style={{ color: accent }}>{value}</div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-parchment/60 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub, right }: {
  eyebrow: string; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-ui text-[11px] font-medium tracking-[0.18em] uppercase opacity-70" style={{ color: ACCENT }}>{eyebrow}</p>
        <h2 className="font-display text-2xl md:text-3xl leading-tight mt-0.5">{title}</h2>
        {sub && <p className="font-serif text-parchment/75 text-[14px] mt-1.5 max-w-xl leading-relaxed">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "var(--color-gold)" },
    approved: { label: "Approved", color: "var(--color-emerald-elixir)" },
    rejected: { label: "Rejected", color: "var(--color-crimson)" },
  };
  const m = map[status ?? "pending"] ?? map.pending;
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[9px] tracking-[0.14em] uppercase font-semibold"
      style={{ color: m.color, background: `color-mix(in oklab, ${m.color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${m.color} 30%, transparent)` }}>
      {m.label}
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = { student: "var(--color-emerald-elixir)", teacher: "var(--color-gold)", school_admin: "var(--color-amber-scry)", admin: "var(--color-wraith)" };
  const color = map[role ?? "student"] ?? "var(--color-parchment)";
  return <span className="rounded-full px-2.5 py-0.5 text-[9px] tracking-[0.15em] uppercase font-semibold" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>{(role ?? "student").replace("_", " ")}</span>;
}

function EmptyState({ icon: Icon, title, sub }: { icon: ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-14 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ color: ACCENT, background: `color-mix(in oklab, ${ACCENT} 11%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 26%, transparent)` }}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-display text-lg mb-1">{title}</h3>
      <p className="font-serif text-sm text-parchment/65 max-w-sm mx-auto">{sub}</p>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg px-3 py-2.5 text-sm text-spectral placeholder:text-parchment/35 outline-none transition " +
  "bg-[color-mix(in_oklab,var(--color-mist)_70%,transparent)] " +
  "border border-[color-mix(in_oklab,var(--color-spectral)_16%,transparent)] " +
  "focus:border-[color-mix(in_oklab,var(--color-wraith)_55%,transparent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-parchment/60">{label}</span>
      {children}
    </label>
  );
}

/** Minimal glass modal. Click backdrop or ✕ to dismiss. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5 max-h-[88vh] overflow-y-auto scroll-slim">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-parchment/70 transition hover:bg-wraith/10 hover:text-spectral"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const PRIMARY_BTN = "rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50";

// ── Verification review card ────────────────────────────────────────────────
function VerificationCard({ v }: { v: Verification }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: (uid: string) => Promise<void>) => { setBusy(true); await fn(v.uid); };
  const matched = v.faceMatched;
  const mColor = matched ? "var(--color-emerald-elixir)" : "var(--color-gold)";
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <Orb icon={IdCard} />
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight truncate">{v.name ?? "Unnamed"}</h3>
          <p className="text-xs text-parchment/60 truncate">{v.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 flex items-center gap-1"><IdCard className="h-3 w-3" /> ID</figcaption>
          <img src={v.idImage} alt="ID document" className="w-full h-32 object-contain rounded-xl bg-black/40" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 flex items-center gap-1"><Camera className="h-3 w-3" /> Selfie</figcaption>
          <img src={v.selfie} alt="Selfie" className="w-full h-32 object-cover rounded-xl" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
      </div>
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
        style={{ background: `color-mix(in oklab, ${mColor} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${mColor} 35%, transparent)`, color: mColor }}>
        <ScanFace className="h-3.5 w-3.5" />
        {matched ? `AI face check: match${typeof v.faceMatch === "number" ? ` (${v.faceMatch}%)` : ""}` : "AI face check: needs manual review"}
      </div>
      <div className="flex gap-3">
        <button onClick={() => act(approveTeacher)} disabled={busy} className="btn-arcane btn-arcane-hover flex-1 justify-center text-xs disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
        <button onClick={() => act(rejectTeacher)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs tracking-[0.12em] uppercase font-semibold transition disabled:opacity-50 hover:-translate-y-px" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 40%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)" }}><X className="h-4 w-4" /> Reject</button>
      </div>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────
function Overview({ users, classesCount, pendingVerifs, onGo }: {
  users: StudentProfile[]; classesCount: number; pendingVerifs: number; onGo: (t: TabKey) => void;
}) {
  const students = users.filter((u) => (u.role ?? "student") === "student").length;
  const teachers = users.filter((u) => u.role === "teacher");
  const approved = teachers.filter((t) => t.status === "approved").length;
  const pending = teachers.filter((t) => (t.status ?? "pending") === "pending").length;

  return (
    <div>
      <SectionHead eyebrow="Administration" title="Control Room"
        sub="Oversee users, review educator verifications, and manage schools and classes across the platform." />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total users" value={users.length} accent="var(--color-emerald-elixir)" icon={Users} />
        <StatCard label="Students" value={students} accent="var(--color-emerald-elixir)" icon={GraduationCap} />
        <StatCard label="Approved teachers" value={approved} accent="var(--color-gold)" icon={UserCog} />
        <StatCard label="Pending teachers" value={pending} accent="var(--color-gold)" icon={UserCog} />
        <StatCard label="Classes" value={classesCount} accent="var(--color-wraith)" icon={BookOpen} />
        <StatCard label="To verify" value={pendingVerifs} accent="var(--color-wraith)" icon={ShieldCheck} />
      </div>

      {/* Quick actions — jump into the work */}
      <p className="font-ui text-[11px] font-medium tracking-[0.18em] uppercase opacity-70 mt-9 mb-3" style={{ color: ACCENT }}>Jump to</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {([
          { t: "verifications" as TabKey, icon: ShieldCheck, title: "Review verifications", sub: pendingVerifs ? `${pendingVerifs} waiting for review` : "All caught up", accent: "var(--color-wraith)" },
          { t: "schools" as TabKey, icon: School, title: "Manage schools", sub: "Create schools, designate admins", accent: "var(--color-gold)" },
          { t: "teachers" as TabKey, icon: UserCog, title: "Approve teachers", sub: pending ? `${pending} pending` : "No pending teachers", accent: "var(--color-emerald-elixir)" },
        ]).map((a) => (
          <button key={a.t} onClick={() => onGo(a.t)}
            className="glass rounded-2xl p-5 text-left transition hover:-translate-y-0.5 group">
            <div className="flex items-start justify-between">
              <Orb icon={a.icon} accent={a.accent} />
              <ArrowUpRight className="h-4 w-4 text-parchment/40 transition group-hover:text-spectral group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <h3 className="font-display text-lg mt-3">{a.title}</h3>
            <p className="font-serif text-sm text-parchment/65 mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeachersTab({ users }: { users: StudentProfile[] }) {
  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (uid: string, status: "approved" | "rejected") => { setBusy(uid); await setTeacherStatus(uid, status); setBusy(null); };

  return (
    <div>
      <SectionHead eyebrow="Educators" title="Teachers" sub="Approve or revoke educator access across all schools." />
      {teachers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No teachers yet" sub="Teachers appear here after a school admin provisions them and they sign in." />
      ) : (
        <div className="space-y-2.5">
          {teachers.map((t) => (
            <div key={t.uid} className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{t.displayName ?? t.email}</div>
                <div className="text-xs text-parchment/50 truncate">{t.email}{t.className ? ` · ${t.className}` : ""}</div>
              </div>
              <StatusBadge status={t.status} />
              {t.status !== "approved" ? (
                <button onClick={() => set(t.uid, "approved")} disabled={busy === t.uid} className="rounded-lg px-3 py-1.5 text-xs tracking-[0.1em] uppercase font-semibold disabled:opacity-50 transition hover:-translate-y-px" style={{ color: "var(--color-emerald-elixir)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)", background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)" }}>Approve</button>
              ) : (
                <button onClick={() => set(t.uid, "rejected")} disabled={busy === t.uid} className="rounded-lg px-3 py-1.5 text-xs tracking-[0.1em] uppercase font-semibold disabled:opacity-50 transition hover:-translate-y-px" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)" }}>Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserEditModal({ user, schools, onClose }: { user: StudentProfile; schools: SchoolRec[]; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [role, setRole] = useState<Role>(user.role ?? "student");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">((user.status as any) ?? "pending");
  const [schoolId, setSchoolId] = useState(user.schoolId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr(""); setBusy(true);
    try {
      await updateUserAdmin(user.uid, {
        displayName: displayName.trim() || undefined,
        role,
        status: role === "teacher" ? status : undefined,
        schoolId: schoolId || null,
      });
      onClose();
    } catch (e: any) { setErr(e?.message ?? "Couldn't save."); } finally { setBusy(false); }
  };

  return (
    <Modal title="Edit user" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Email"><input value={user.email ?? ""} disabled className={`${INPUT} opacity-60`} /></Field>
        <Field label="Display name"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={INPUT} /></Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={INPUT}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="school_admin">school admin</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        {role === "teacher" && (
          <Field label="Teacher status">
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={INPUT}>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </Field>
        )}
        <Field label="School">
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={INPUT}>
            <option value="">— none —</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        {role === "admin" && <p className="text-[11px] text-gold/80">Note: platform-admin powers come from the email allowlist in code, not this field.</p>}
        {err && <p className="text-xs text-crimson">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs text-parchment/70 hover:text-spectral transition">Cancel</button>
          <button onClick={save} disabled={busy} className={PRIMARY_BTN} style={{ background: "var(--color-wraith)" }}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </Modal>
  );
}

function UserCreateModal({ schools, onClose }: { schools: SchoolRec[]; onClose: () => void }) {
  const [role, setRole] = useState<"student" | "teacher" | "school_admin">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needsSchool = role !== "student";

  const submit = async () => {
    setErr("");
    if (!email.trim()) { setErr("Email is required."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (needsSchool && !schoolId) { setErr("Pick a school for this role."); return; }
    setBusy(true);
    try {
      await createUserAdmin({ role, name: name.trim(), email: email.trim(), password: pw, schoolId: schoolId || null });
      onClose();
    } catch (e: any) { setErr(friendlyAuthError(e?.code) ?? (e?.message ?? "Couldn't create the user.")); } finally { setBusy(false); }
  };

  return (
    <Modal title="New user" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className={INPUT}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="school_admin">school admin</option>
          </select>
        </Field>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={INPUT} /></Field>
        <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className={INPUT} /></Field>
        <Field label="Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 6 characters" className={INPUT} /></Field>
        {needsSchool && (
          <Field label="School">
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={INPUT}>
              <option value="">— pick a school —</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <p className="text-[11px] text-parchment/50">Creates a real login account. The person signs in at {role === "student" ? "/login" : role === "teacher" ? "/teacher/login" : "/school/signin"}.</p>
        {err && <p className="text-xs text-crimson">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs text-parchment/70 hover:text-spectral transition">Cancel</button>
          <button onClick={submit} disabled={busy} className={PRIMARY_BTN} style={{ background: "var(--color-emerald-elixir)" }}>{busy ? "Creating…" : "Create user"}</button>
        </div>
      </div>
    </Modal>
  );
}

function UsersTab({ users }: { users: StudentProfile[] }) {
  const { schools } = useSchools();
  const schoolName = (id?: string) => (id ? schools.find((s) => s.id === id)?.name : undefined);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const filtered = users.filter((u) =>
    (u.displayName ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (u.role ?? "student").includes(q.toLowerCase()));

  const removeUser = async (u: StudentProfile) => {
    if (!confirm(`Delete ${u.displayName ?? u.email}'s profile?\n\nTheir login credential will remain (it can't be removed from the client), but they'll have no profile.`)) return;
    await deleteUserProfile(u.uid, u.displayName ?? u.email ?? undefined);
  };

  return (
    <div>
      <SectionHead eyebrow="Directory" title="Users" sub="Everyone on the platform — students, teachers, and admins."
        right={
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${INPUT} pl-9`} />
            </div>
            <button onClick={() => setCreating(true)} className="btn-arcane btn-arcane-hover text-xs whitespace-nowrap"><UserPlus className="h-4 w-4" /> New user</button>
          </div>
        } />
      <div className="space-y-1.5">
        {filtered.map((u) => (
          <div key={u.uid} className="glass flex items-center gap-3 rounded-xl px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{u.displayName ?? u.email}</div>
              <div className="text-xs text-parchment/50 truncate">{u.email}{schoolName(u.schoolId) ? ` · ${schoolName(u.schoolId)}` : ""}{u.className ? ` · ${u.className}` : ""}</div>
            </div>
            {u.role === "teacher" && <StatusBadge status={u.status} />}
            <RoleBadge role={u.role} />
            <button onClick={() => setEditing(u)} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/60 transition hover:bg-wraith/10 hover:text-wraith"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => removeUser(u)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/60 transition hover:bg-crimson/10 hover:text-crimson"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-parchment/50 px-1 py-4">No users match.</p>}
      </div>

      {editing && <UserEditModal user={editing} schools={schools} onClose={() => setEditing(null)} />}
      {creating && <UserCreateModal schools={schools} onClose={() => setCreating(false)} />}
    </div>
  );
}

function ClassEditModal({ cls, onClose }: { cls: AdminClass; onClose: () => void }) {
  const [name, setName] = useState(cls.name);
  const [archived, setArchived] = useState(!!cls.archived);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await updateClassAdmin(cls.id, { name: name.trim(), archived }); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Edit class" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Class name"><input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} /></Field>
        <label className="flex items-center gap-2 text-sm text-parchment/80">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} style={{ accentColor: "var(--color-wraith)" }} />
          Archived (hidden from the teacher's working tabs, refuses new joins)
        </label>
        <p className="text-[11px] text-parchment/45">Join code <span className="font-ui font-bold tracking-[0.2em] text-teal">{cls.id}</span> · teacher {cls.teacherName ?? cls.teacherId}</p>
        <button onClick={save} disabled={busy || !name.trim()} className={PRIMARY_BTN} style={{ background: "var(--color-emerald-elixir)" }}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function ClassesTab({ classes }: { classes: AdminClass[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminClass | null>(null);
  const filtered = classes.filter((c) =>
    !q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase()) || (c.teacherName ?? "").toLowerCase().includes(q.toLowerCase()));

  const del = async (c: AdminClass) => {
    if (!window.confirm(`Delete “${c.name}”? The class document is removed (its roster/requests subdocs are not cascaded from here). This cannot be undone.`)) return;
    await deleteClassAdmin(c.id, c.name);
  };

  return (
    <div>
      <SectionHead eyebrow="Rosters" title="Classes" sub="Every class created by a teacher. Rename, archive, or delete — the owning teacher keeps managing rosters, grades and assignments." />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classes…" className={INPUT + " pl-9"} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes" sub="Classes teachers create will be listed here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold leading-tight">
                  <span className="truncate">{c.name}</span>
                  {c.archived && <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-parchment/60" style={{ border: "1px solid var(--color-border)" }}>Archived</span>}
                </div>
                <div className="text-xs text-parchment/50 truncate">{c.teacherName ?? "—"} · <span className="font-ui font-bold tracking-[0.2em] text-teal">{c.id}</span></div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button onClick={() => setEditing(c)} aria-label="Edit class" className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/70 transition hover:bg-wraith/10 hover:text-spectral" style={{ border: "1px solid var(--color-border)" }}><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(c)} aria-label="Delete class" className="flex h-8 w-8 items-center justify-center rounded-lg text-crimson/80 transition hover:bg-crimson/10 hover:text-crimson" style={{ border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ClassEditModal cls={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── Data & Backups (export · version machine · import/rollback) ─────────────
function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtSnapTime(at?: SnapshotMeta["createdAt"]): string {
  if (!at?.seconds) return "just now";
  try { return new Date(at.seconds * 1000).toLocaleString(); } catch { return ""; }
}

function RestoreConfirm({ payload, label, busy, onCancel, onConfirm }: {
  payload: BackupPayload; label: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  return (
    <Modal title="Confirm rollback" onClose={busy ? () => {} : onCancel}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: "color-mix(in oklab, var(--color-crimson) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-crimson" />
          <span className="text-parchment/85">
            This writes <span className="font-semibold">{label}</span> back over the live database (merge). Existing documents are overwritten.
            Deleted <span className="font-mono">users</span>/<span className="font-mono">classes</span> can't be recreated from here — those are skipped and counted.
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(payload.collections).map(([k, arr]) => (
            <span key={k} className="rounded-full px-2.5 py-1 text-[11px] text-parchment/75" style={{ border: "1px solid var(--color-border)" }}>
              {k} <span className="font-ui font-bold text-spectral">{arr.length}</span>
            </span>
          ))}
        </div>
        <Field label='Type RESTORE to confirm'>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="RESTORE" className={INPUT} autoFocus />
        </Field>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-lg px-4 py-2 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-50" style={{ border: "1px solid var(--color-border)" }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy || typed !== "RESTORE"} className={PRIMARY_BTN} style={{ background: "var(--color-crimson)" }}>
            {busy ? "Restoring…" : "Roll back now"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DataTab() {
  const { snapshots, loading } = useSnapshots();
  const [sel, setSel] = useState<string[]>(DEFAULT_BACKUP);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<{ payload: BackupPayload; label: string } | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (name: string) => setSel((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  const doExport = async (alsoSnapshot: boolean) => {
    if (sel.length === 0) { setMsg("Pick at least one collection to back up."); return; }
    setBusy(alsoSnapshot ? "snapshot" : "export"); setMsg(null); setReport(null);
    try {
      const payload = await exportDatabase(sel);
      downloadJson(`alchemix-backup-${stamp()}.json`, serializeBackup(payload));
      if (alsoSnapshot) await createSnapshot(note || `Backup ${stamp()}`, payload);
      setMsg(`Backed up ${countDocs(payload)} documents${alsoSnapshot ? " and saved a snapshot" : ""}.`);
      setNote("");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Export failed."); }
    finally { setBusy(null); }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy("import"); setMsg(null); setReport(null);
    try { setPending({ payload: parseBackup(await f.text()), label: f.name }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't read that file."); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; }
  };

  const loadSnapshot = async (s: SnapshotMeta) => {
    setBusy(s.id); setMsg(null); setReport(null);
    try { setPending({ payload: await getSnapshotPayload(s.id), label: s.note || "snapshot" }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't load snapshot."); }
    finally { setBusy(null); }
  };

  const runRestore = async () => {
    if (!pending) return;
    setBusy("restore");
    try {
      const rep = await restoreBackup(pending.payload);
      setReport(rep);
      setMsg(`Rollback complete — ${rep.restored} restored, ${rep.skipped} skipped.`);
      setPending(null);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Restore failed."); }
    finally { setBusy(null); }
  };

  const removeSnap = async (s: SnapshotMeta) => {
    if (!window.confirm("Delete this snapshot from the Version Machine? The downloaded file (if any) is unaffected.")) return;
    await deleteSnapshot(s.id);
  };

  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Operations" title="Data & Backups"
        sub="Export the database, keep restorable snapshots (the Version Machine), and roll back from a snapshot or file. Every action is written to the audit log." />

      {msg && (
        <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
          {msg}
        </div>
      )}
      {report && (report.skipped > 0 || report.restored > 0) && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
          <p className="mb-1 font-semibold text-spectral">Restore report</p>
          {Object.entries(report.byCollection).map(([k, v]) => (
            <p key={k} className="text-parchment/70">{k}: <span className="text-teal">{v.restored} restored</span>{v.skipped > 0 && <span className="text-amber-scry"> · {v.skipped} skipped</span>}</p>
          ))}
          {report.firstError && <p className="mt-1 text-parchment/50">First skip reason: {report.firstError}</p>}
        </div>
      )}

      {/* Export / Backup */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-lg"><Download className="h-4 w-4 text-wraith" /> Export a backup</h3>
        <p className="mb-4 text-xs text-parchment/55">Reads the selected collections into a Timestamp-safe JSON file. Download it, and optionally keep a snapshot in the Version Machine.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {BACKUP_COLLECTIONS.map((c) => {
            const on = sel.includes(c.name);
            return (
              <button key={c.name} onClick={() => toggle(c.name)} title={c.note}
                className="rounded-full px-3 py-1.5 text-xs transition"
                style={on
                  ? { background: "color-mix(in oklab, var(--color-wraith) 16%, transparent)", color: "var(--color-wraith)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }
                  : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
                {on ? <Check className="mr-1 inline h-3 w-3 -mt-px" /> : <Plus className="mr-1 inline h-3 w-3 -mt-px" />}{c.label}
              </button>
            );
          })}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Snapshot note (optional) — e.g. “before term reset”" className={INPUT + " mb-3"} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => doExport(false)} disabled={!!busy} className={PRIMARY_BTN} style={{ background: "var(--color-wraith)" }}>
            <Download className="mr-1 inline h-3.5 w-3.5 -mt-px" /> {busy === "export" ? "Exporting…" : "Download backup"}
          </button>
          <button onClick={() => doExport(true)} disabled={!!busy}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-teal transition hover:-translate-y-0.5 disabled:opacity-50"
            style={{ border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)" }}>
            <Save className="mr-1 inline h-3.5 w-3.5 -mt-px" /> {busy === "snapshot" ? "Saving…" : "Download + save snapshot"}
          </button>
        </div>
      </div>

      {/* Version Machine */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-lg"><Database className="h-4 w-4 text-wraith" /> Version Machine</h3>
        <p className="mb-4 text-xs text-parchment/55">Saved snapshots, newest first. Small snapshots keep a restorable copy inline; larger ones are metadata-only — restore those from a downloaded file.</p>
        {loading ? (
          <p className="text-sm text-parchment/60">Loading snapshots…</p>
        ) : snapshots.length === 0 ? (
          <EmptyState icon={Archive} title="No snapshots yet" sub="Use “Download + save snapshot” above to capture a restorable version." />
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-spectral">{s.note || "Untitled snapshot"}</p>
                  <p className="text-[11px] text-parchment/55">
                    {fmtSnapTime(s.createdAt)} · {s.totalDocs} docs · {prettyBytes(s.sizeBytes)}
                    {!s.hasPayload && <span className="text-amber-scry"> · metadata only</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(s.counts).map(([k, n]) => (
                      <span key={k} className="rounded-full px-2 py-0.5 text-[10px] text-parchment/60" style={{ border: "1px solid var(--color-border)" }}>{k} {n}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {s.hasPayload && (
                    <button onClick={() => void (async () => { try { const p = await getSnapshotPayload(s.id); downloadJson(`alchemix-snapshot-${s.id}.json`, serializeBackup(p)); } catch (e) { setMsg(e instanceof Error ? e.message : "Download failed."); } })()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/70 transition hover:bg-wraith/10 hover:text-spectral" style={{ border: "1px solid var(--color-border)" }} aria-label="Download snapshot"><FileJson className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => loadSnapshot(s)} disabled={!s.hasPayload || !!busy} title={s.hasPayload ? "Roll back to this snapshot" : "No inline payload — restore from a file"}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition hover:-translate-y-0.5 disabled:opacity-40"
                    style={{ color: "var(--color-wraith)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }}>
                    <RotateCcw className="h-3 w-3" /> {busy === s.id ? "…" : "Roll back"}
                  </button>
                  <button onClick={() => removeSnap(s)} aria-label="Delete snapshot" className="flex h-8 w-8 items-center justify-center rounded-lg text-crimson/80 transition hover:bg-crimson/10 hover:text-crimson" style={{ border: "1px solid color-mix(in oklab, var(--color-crimson) 30%, transparent)" }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import / Rollback */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-lg"><Upload className="h-4 w-4 text-wraith" /> Import / rollback from a file</h3>
        <p className="mb-4 text-xs text-parchment/55">Upload a backup <span className="font-mono">.json</span> exported here. You'll see what it contains and confirm before anything is written.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={!!busy} className={PRIMARY_BTN} style={{ background: "var(--color-wraith)" }}>
          <Upload className="mr-1 inline h-3.5 w-3.5 -mt-px" /> {busy === "import" ? "Reading…" : "Choose backup file"}
        </button>
      </div>

      {pending && (
        <RestoreConfirm payload={pending.payload} label={pending.label} busy={busy === "restore"}
          onCancel={() => setPending(null)} onConfirm={runRestore} />
      )}
    </div>
  );
}

// ── Schools (super-admin multi-tenant management) ───────────────────────────
function friendlyAuthError(code?: string): string | null {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/invalid-email": "That doesn't look like a valid email.",
    "auth/weak-password": "Password is too weak (use at least 6 characters).",
  };
  return code ? (map[code] ?? null) : null;
}

/** Inline form that CREATES a school-admin account (name + email + password). */
function AddAdminForm({ schoolId, onDone }: { schoolId: string; onDone?: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!name.trim() || !email.trim()) { setErr("Name and email are required."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await createSchoolAdminAccount(schoolId, { name: name.trim(), email: email.trim(), password: pw });
      setName(""); setEmail(""); setPw(""); onDone?.();
    } catch (e: any) {
      setErr(friendlyAuthError(e?.code) ?? (e?.message ?? "Couldn't create the account."));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin name" className={INPUT} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.edu" className={INPUT} />
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password (min 6)" className={INPUT} />
      </div>
      {err && <p className="text-[11px] text-crimson">{err}</p>}
      <button onClick={submit} disabled={busy} className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: "var(--color-emerald-elixir)" }}>
        {busy ? "Creating account…" : "Create admin account"}
      </button>
    </div>
  );
}

function SchoolEditModal({ school, onClose }: { school: SchoolRec; onClose: () => void }) {
  const [name, setName] = useState(school.name);
  const [active, setActive] = useState(school.active !== false);
  const [brandColor, setBrandColor] = useState(school.brandColor ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    setBusy(true);
    try { await updateSchool(school.id, { name: name.trim(), active, brandColor: brandColor.trim() || null }); onClose(); }
    catch (e: any) { setErr(e?.message ?? "Couldn't save."); } finally { setBusy(false); }
  };
  return (
    <Modal title="Edit school" onClose={onClose}>
      <div className="space-y-3">
        <Field label="School name"><input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} /></Field>
        <Field label="Brand colour (hex, optional)"><input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#0d9488" className={INPUT} /></Field>
        <label className="flex items-center gap-2 text-sm text-parchment/80">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        {err && <p className="text-xs text-crimson">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs text-parchment/70 hover:text-spectral transition">Cancel</button>
          <button onClick={save} disabled={busy} className={PRIMARY_BTN} style={{ background: "var(--color-wraith)" }}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </Modal>
  );
}

function SchoolCard({ school }: { school: SchoolRec }) {
  const [code, setCode] = useState(school.code);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const inactive = school.active === false;

  const regen = async () => {
    setBusy(true);
    try { setCode(await regenerateSchoolCode(school.id)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(`Delete “${school.name}”?\n\nThis removes the school only — its teachers/classes keep a dangling schoolId. This cannot be undone.`)) return;
    await deleteSchool(school.id, school.name);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Orb icon={School} accent="var(--color-gold)" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg leading-tight truncate">{school.name}</h3>
              {inactive && <span className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--color-crimson)", background: "color-mix(in oklab, var(--color-crimson) 12%, transparent)" }}>inactive</span>}
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/45 mt-0.5">School code</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-ui font-bold text-lg tracking-[0.2em] text-gold">{code}</span>
          <button onClick={() => setEditing(true)} aria-label="Edit school" className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/60 transition hover:bg-wraith/10 hover:text-wraith"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={remove} aria-label="Delete school" className="flex h-8 w-8 items-center justify-center rounded-lg text-parchment/60 transition hover:bg-crimson/10 hover:text-crimson"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <button onClick={regen} disabled={busy} className="mt-1.5 text-[11px] text-parchment/50 transition hover:text-spectral disabled:opacity-50">↻ Regenerate code</button>
      {editing && <SchoolEditModal school={school} onClose={() => setEditing(false)} />}

      <div className="mt-4">
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-parchment/60">School admins</p>
        {school.adminEmails?.length ? (
          <ul className="space-y-1">
            {school.adminEmails.map((e) => <li key={e} className="text-[12px] text-parchment/75 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gold/70" /> {e}</li>)}
          </ul>
        ) : (
          <p className="text-[11px] text-parchment/45">No admins yet.</p>
        )}

        {adding ? (
          <div className="mt-3">
            <AddAdminForm schoolId={school.id} onDone={() => setAdding(false)} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal transition hover:brightness-110">
            <Plus className="h-3.5 w-3.5" /> Add an admin account
          </button>
        )}
      </div>
    </div>
  );
}

function SchoolsTab() {
  const { schools } = useSchools();
  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState<{ school: string; code: string; email: string } | null>(null);

  const create = async () => {
    setErr(""); setOk(null);
    if (!schoolName.trim()) { setErr("Enter a school name."); return; }
    if (!adminName.trim() || !adminEmail.trim()) { setErr("Enter the admin's name and email."); return; }
    if (adminPw.length < 6) { setErr("Admin password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const { school } = await createSchoolWithAdmin({
        schoolName: schoolName.trim(), adminName: adminName.trim(),
        adminEmail: adminEmail.trim(), adminPassword: adminPw,
        createdBy: auth.currentUser?.uid ?? "",
      });
      setOk({ school: school.name, code: school.code, email: adminEmail.trim().toLowerCase() });
      setSchoolName(""); setAdminName(""); setAdminEmail(""); setAdminPw("");
    } catch (e: any) {
      setErr(friendlyAuthError(e?.code) ?? (e?.message ?? "Couldn't create the school."));
    } finally { setBusy(false); }
  };

  return (
    <div>
      <SectionHead eyebrow="Multi-tenant" title="Schools" sub="Create a school and its admin account in one step. Each school gets a generated code that onboards its teachers." />

      {/* Create school + its admin account */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Orb icon={School} accent="var(--color-gold)" />
          <h3 className="font-display text-lg">New school</h3>
        </div>

        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-parchment/60">School name</label>
        <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Olongapo City National High School" className={`${INPUT} mb-4`} />

        <p className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: ACCENT }}>School admin account</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin name" className={INPUT} />
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.edu" className={INPUT} />
          <input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} placeholder="Password (min 6)" className={INPUT} />
        </div>

        {err && <p className="mt-3 text-xs text-crimson bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2">{err}</p>}
        {ok && (
          <div className="mt-3 rounded-lg px-3 py-2.5 text-xs" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
            <span className="text-emerald-elixir font-semibold">Created “{ok.school}.”</span>{" "}
            <span className="text-parchment/80">School code <span className="font-bold tracking-[0.15em] text-gold">{ok.code}</span>. The admin <span className="text-spectral">{ok.email}</span> can sign in at <span className="font-mono">/school/signin</span>.</span>
          </div>
        )}

        <button onClick={create} disabled={busy} className="btn-arcane btn-arcane-hover justify-center text-xs mt-4 disabled:opacity-50">
          {busy ? <>Creating…</> : <><Plus className="h-4 w-4" /> Create school &amp; admin</>}
        </button>
      </div>

      {schools.length === 0
        ? <EmptyState icon={School} title="No schools yet" sub="Create a school above; it gets a code that onboards teachers, and its admin account signs in at /school/signin." />
        : <div className="grid gap-4 md:grid-cols-2">{schools.map((s) => <SchoolCard key={s.id} school={s} />)}</div>}

      <div className="mt-6"><MigrationCard /></div>
    </div>
  );
}

function MigrationCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    if (!confirm("Create/reuse a 'Default School' and stamp every school-less teacher and class into it? Safe to run more than once.")) return;
    setBusy(true);
    try {
      const r = await backfillIntoDefaultSchool(auth.currentUser?.uid ?? "");
      setResult(`Done — "${r.school.name}" (code ${r.school.code}): stamped ${r.teachers} teacher(s) and ${r.classes} class(es).`);
    } catch (e) {
      setResult(`Failed — ${(e as Error)?.message ?? "unknown error"}. (Deploy firestore.rules first.)`);
    } finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-2xl p-5" style={{ borderColor: "color-mix(in oklab, var(--color-wraith) 30%, transparent)" }}>
      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-wraith/80">Migration</p>
      <p className="mb-3 font-serif text-sm text-parchment/70">
        Move pre-multi-tenant teachers and classes into a single <span className="font-semibold text-spectral">Default School</span> so nothing is orphaned.
      </p>
      <button onClick={run} disabled={busy} className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50" style={{ background: "var(--color-wraith)" }}>
        {busy ? "Backfilling…" : "Backfill existing teachers & classes"}
      </button>
      {result && <p className="mt-3 text-xs text-parchment/80">{result}</p>}
    </div>
  );
}

// ── Audit log (read-only) ───────────────────────────────────────────────────
function fmtAuditTime(at?: AuditEntry["at"]): string {
  if (!at?.seconds) return "just now";
  try { return new Date(at.seconds * 1000).toLocaleString(); } catch { return ""; }
}

function AuditTab() {
  const { entries, loading } = useAuditLog(150);
  return (
    <div>
      <SectionHead eyebrow="Accountability" title="Audit log" sub="Every privileged change, newest first. Read-only and append-only — written automatically by school, user and verification actions." />
      {loading ? (
        <p className="text-sm text-parchment/60">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" sub="School, user and verification actions will be recorded here as they happen." />
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div key={e.id} className="glass flex items-start gap-3 rounded-xl px-4 py-2.5">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--color-wraith)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-mono text-[13px] text-wraith">{e.action}</span>
                  {e.targetLabel ? <span className="text-parchment/75"> · {e.targetLabel}</span>
                    : e.targetId ? <span className="text-parchment/45"> · {e.targetId.slice(0, 8)}…</span> : null}
                </div>
                <div className="text-xs text-parchment/50 truncate">{e.actorEmail ?? e.actorUid} · {fmtAuditTime(e.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Console shell ───────────────────────────────────────────────────────────
function AdminConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const { items: pendingVerifs, loading: vLoading } = usePendingVerifications();
  const { users } = useAllUsers();
  const classes = useAllClasses();

  const NAV = [
    { key: "overview" as TabKey, label: "Overview", icon: LayoutDashboard },
    { key: "schools" as TabKey, label: "Schools", icon: School },
    { key: "verifications" as TabKey, label: "Verifications", icon: ShieldCheck, badge: pendingVerifs.length },
    { key: "teachers" as TabKey, label: "Teachers", icon: UserCog },
    { key: "users" as TabKey, label: "Users", icon: Users },
    { key: "classes" as TabKey, label: "Classes", icon: BookOpen },
    { key: "data" as TabKey, label: "Data & Backups", icon: Database },
    { key: "audit" as TabKey, label: "Audit log", icon: ScrollText },
  ];

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <div className="grimoire-display bg-arcane min-h-screen text-spectral">
      <ArcaneField />

      {/* ── Desktop sidebar — a floating glass column ── */}
      <aside className="glass-strong hidden md:flex fixed left-3 top-3 bottom-3 z-40 w-60 flex-col rounded-2xl p-3">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--color-wraith) 60%, transparent))" }} />
          <span className="font-display text-lg leading-none tracking-[0.1em]">AlcheMix <span className="text-wraith">Admin</span></span>
        </Link>

        <div className="my-3 h-px w-full" style={{ background: "var(--color-border)" }} />

        <nav className="flex-1 space-y-1 overflow-y-auto scroll-slim">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                className="group relative flex w-full items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-wraith/8"
                style={{ color: active ? "var(--color-wraith)" : "var(--color-spectral)", background: active ? "color-mix(in oklab, var(--color-wraith) 10%, transparent)" : undefined }}>
                {active && <span className="absolute left-0 h-6 w-0.5 rounded-full" style={{ background: "linear-gradient(180deg, var(--color-wraith), var(--color-emerald-elixir))" }} />}
                <Orb icon={n.icon} active={active} size="h-9 w-9" />
                <span className="text-[13px] font-medium flex-1 text-left">{n.label}</span>
                {"badge" in n && !!n.badge && n.badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: "var(--color-crimson)" }}>{n.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="my-3 h-px w-full" style={{ background: "var(--color-border)" }} />
        <div className="flex items-center justify-between px-1">
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-parchment/70 transition hover:text-crimson"><LogOut className="h-4 w-4" /> Sign out</button>
          <ThemeToggle className="!h-9 !w-9" />
        </div>
      </aside>

      {/* ── Mobile top bar + section strip ── */}
      <header className="glass-strong md:hidden fixed top-2 inset-x-2 z-40 flex items-center justify-between h-14 px-4 rounded-2xl">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-outline.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-base tracking-[0.1em]">AlcheMix <span className="text-wraith">Admin</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="!h-8 !w-8" />
          <button onClick={handleSignOut} aria-label="Sign out" className="text-parchment/70 hover:text-crimson transition"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="glass-strong md:hidden fixed top-[4.25rem] inset-x-2 z-40 flex gap-1 overflow-x-auto scroll-slim rounded-2xl p-1.5">
        {NAV.map((n) => {
          const active = tab === n.key;
          return (
            <button key={n.key} onClick={() => setTab(n.key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition"
              style={active ? { background: "color-mix(in oklab, var(--color-wraith) 18%, transparent)", color: "var(--color-wraith)" } : { color: "var(--color-parchment)" }}>
              <n.icon className="h-3.5 w-3.5" /> {n.label}
              {"badge" in n && !!n.badge && n.badge > 0 && <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: "var(--color-crimson)" }}>{n.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <main className="relative z-10">
        <div className="w-full px-5 pt-32 pb-16 md:pl-[16.5rem] md:pr-8 md:pt-10 md:pb-16 mx-auto max-w-5xl">
          {tab === "overview" && <Overview users={users} classesCount={classes.length} pendingVerifs={pendingVerifs.length} onGo={setTab} />}
          {tab === "schools" && <SchoolsTab />}
          {tab === "verifications" && (
            <div>
              <SectionHead eyebrow="Trust & safety" title="Verifications" sub="Educator identity submissions — compare the ID to the selfie, then approve or reject." />
              {vLoading ? <p className="text-sm text-parchment/60">Loading…</p>
                : pendingVerifs.length === 0 ? <EmptyState icon={Inbox} title="No pending verifications" sub="Educator ID + selfie submissions will appear here for review." />
                : <div className="grid gap-4 md:grid-cols-2">{pendingVerifs.map((v) => <VerificationCard key={v.uid} v={v} />)}</div>}
            </div>
          )}
          {tab === "teachers" && <TeachersTab users={users} />}
          {tab === "users" && <UsersTab users={users} />}
          {tab === "classes" && <ClassesTab classes={classes} />}
          {tab === "data" && <DataTab />}
          {tab === "audit" && <AuditTab />}
        </div>
      </main>
    </div>
  );
}
