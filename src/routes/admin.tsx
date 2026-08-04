import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ShieldCheck, Check, X, LogOut, IdCard, Camera, Inbox, ScanFace,
  LayoutDashboard, Users, GraduationCap, BookOpen, Search, UserCog,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ThemeToggle } from "../components/ThemeToggle";
import { signOut } from "../lib/auth";
import type { StudentProfile } from "../lib/profile";
import {
  usePendingVerifications, useAllUsers, useAllClasses,
  approveTeacher, rejectTeacher, setTeacherStatus,
  type Verification,
} from "../lib/admin";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole role="admin">
      <AdminConsole />
    </RequireRole>
  ),
});

// ── Small building blocks ───────────────────────────────────────────────────
function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)", border: `1px solid color-mix(in oklab, ${color} 25%, transparent)` }}>
      <div className="font-display text-3xl" style={{ color }}>{value}</div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/60 mt-1">{label}</div>
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
  return <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: m.color }}>{m.label}</span>;
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = { student: "var(--color-emerald-elixir)", teacher: "var(--color-gold)", admin: "var(--color-wraith)" };
  const color = map[role ?? "student"] ?? "var(--color-parchment)";
  return <span className="rounded-full px-2.5 py-0.5 text-[9px] tracking-[0.15em] uppercase" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>{role ?? "student"}</span>;
}

// ── Verification review card ────────────────────────────────────────────────
function VerificationCard({ v }: { v: Verification }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: (uid: string) => Promise<void>) => { setBusy(true); await fn(v.uid); };
  return (
    <div className="rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="mb-3">
        <h3 className="font-display text-lg">{v.name ?? "Unnamed"}</h3>
        <p className="text-xs text-parchment/60">{v.email}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1 flex items-center gap-1"><IdCard className="h-3 w-3" /> ID</figcaption>
          <img src={v.idImage} alt="ID document" className="w-full h-32 object-contain rounded-lg bg-black/40" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
        <figure>
          <figcaption className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1 flex items-center gap-1"><Camera className="h-3 w-3" /> Selfie</figcaption>
          <img src={v.selfie} alt="Selfie" className="w-full h-32 object-cover rounded-lg" style={{ border: "1px solid var(--color-border)" }} />
        </figure>
      </div>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
        style={{ background: `color-mix(in oklab, ${v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 35%, transparent)`, color: v.faceMatched ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
        <ScanFace className="h-3.5 w-3.5" />
        {v.faceMatched ? `AI face check: match${typeof v.faceMatch === "number" ? ` (${v.faceMatch}%)` : ""}` : "AI face check: needs manual review"}
      </div>
      <div className="flex gap-3">
        <button onClick={() => act(approveTeacher)} disabled={busy} className="btn-arcane btn-arcane-hover flex-1 justify-center text-xs disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button>
        <button onClick={() => act(rejectTeacher)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs tracking-[0.12em] uppercase transition disabled:opacity-50" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 40%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)" }}><X className="h-4 w-4" /> Reject</button>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: typeof Inbox; title: string; sub: string }) {
  return (
    <div className="rounded-2xl px-5 py-12 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
      <Icon className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
      <p className="font-display text-base mb-1">{title}</p>
      <p className="text-sm text-parchment/60">{sub}</p>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────
function Overview({ users, classesCount, pendingVerifs }: { users: StudentProfile[]; classesCount: number; pendingVerifs: number }) {
  const students = users.filter((u) => (u.role ?? "student") === "student").length;
  const teachers = users.filter((u) => u.role === "teacher");
  const approved = teachers.filter((t) => t.status === "approved").length;
  const pending = teachers.filter((t) => (t.status ?? "pending") === "pending").length;
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      <StatTile label="Total users" value={users.length} color="var(--color-emerald-elixir)" />
      <StatTile label="Students" value={students} color="var(--color-emerald-elixir)" />
      <StatTile label="Approved teachers" value={approved} color="var(--color-gold)" />
      <StatTile label="Pending teachers" value={pending} color="var(--color-gold)" />
      <StatTile label="Classes" value={classesCount} color="var(--color-wraith)" />
      <StatTile label="Verifications to review" value={pendingVerifs} color="var(--color-wraith)" />
    </div>
  );
}

function TeachersTab({ users }: { users: StudentProfile[] }) {
  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (uid: string, status: "approved" | "rejected") => { setBusy(uid); await setTeacherStatus(uid, status); setBusy(null); };

  if (teachers.length === 0) return <EmptyState icon={GraduationCap} title="No teachers yet" sub="Teachers appear here after they sign up." />;
  return (
    <div className="space-y-2">
      {teachers.map((t) => (
        <div key={t.uid} className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm">{t.displayName ?? t.email}</div>
            <div className="text-xs text-parchment/50 truncate">{t.email}</div>
          </div>
          <StatusBadge status={t.status} />
          {t.status !== "approved" ? (
            <button onClick={() => set(t.uid, "approved")} disabled={busy === t.uid} className="rounded-lg px-3 py-1.5 text-xs tracking-[0.1em] uppercase disabled:opacity-50" style={{ color: "var(--color-emerald-elixir)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)", background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)" }}>Approve</button>
          ) : (
            <button onClick={() => set(t.uid, "rejected")} disabled={busy === t.uid} className="rounded-lg px-3 py-1.5 text-xs tracking-[0.1em] uppercase disabled:opacity-50" style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)", background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)" }}>Revoke</button>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab({ users }: { users: StudentProfile[] }) {
  const [q, setQ] = useState("");
  const filtered = users.filter((u) =>
    (u.displayName ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (u.role ?? "student").includes(q.toLowerCase()));
  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or role…" className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }} />
      </div>
      <div className="space-y-1.5">
        {filtered.map((u) => (
          <div key={u.uid} className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="min-w-0 flex-1">
              <div className="text-sm">{u.displayName ?? u.email}</div>
              <div className="text-xs text-parchment/50 truncate">{u.email}{u.className ? ` · ${u.className}` : ""}</div>
            </div>
            {u.role === "teacher" && <StatusBadge status={u.status} />}
            <RoleBadge role={u.role} />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-parchment/50 px-1 py-4">No users match.</p>}
      </div>
    </div>
  );
}

function ClassesTab({ classes }: { classes: { id: string; name: string; teacherName?: string | null }[] }) {
  if (classes.length === 0) return <EmptyState icon={BookOpen} title="No classes yet" sub="Classes teachers create will be listed here." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {classes.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
          <div>
            <div className="font-display text-sm">{c.name}</div>
            <div className="text-xs text-parchment/50">{c.teacherName ?? "—"}</div>
          </div>
          <span className="font-display tracking-[0.25em] text-teal">{c.id}</span>
        </div>
      ))}
    </div>
  );
}

// ── Console ─────────────────────────────────────────────────────────────────
function AdminConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "verifications" | "teachers" | "users" | "classes">("overview");
  const { items: pendingVerifs, loading: vLoading } = usePendingVerifications();
  const { users } = useAllUsers();
  const classes = useAllClasses();

  const TABS = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "verifications", label: "Verifications", icon: ShieldCheck, badge: pendingVerifs.length },
    { key: "teachers", label: "Teachers", icon: UserCog },
    { key: "users", label: "Users", icon: Users },
    { key: "classes", label: "Classes", icon: BookOpen },
  ] as const;

  return (
    <div className="bg-arcane min-h-screen text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />

      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 h-16 border-b backdrop-blur-xl" style={{ borderColor: "var(--color-border)", background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo-outline.png" alt="" className="h-8 w-8 object-contain" style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--color-wraith) 60%, transparent))" }} />
          <span className="font-display text-lg tracking-[0.15em]">AlcheMix <span className="text-wraith">Admin</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="!h-9 !w-9" />
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="inline-flex items-center gap-1.5 text-xs text-parchment/70 hover:text-crimson transition"><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8 py-8">
        <PageHeader eyebrow="Administration" title="Control Room" subtitle="Oversee users, review educator verifications, and manage classes across the platform." icon={ShieldCheck} accent="var(--color-wraith)" />

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 rounded-full p-1 w-fit" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs tracking-[0.1em] uppercase transition"
              style={tab === t.key ? { background: "color-mix(in oklab, var(--color-wraith) 20%, transparent)", color: "var(--color-wraith)" } : { color: "var(--color-parchment)" }}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {"badge" in t && t.badge > 0 && <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px]" style={{ background: "var(--color-crimson)", color: "#fff" }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview users={users} classesCount={classes.length} pendingVerifs={pendingVerifs.length} />}

        {tab === "verifications" && (
          vLoading ? <p className="text-sm text-parchment/60">Loading…</p>
          : pendingVerifs.length === 0 ? <EmptyState icon={Inbox} title="No pending verifications" sub="Educator ID + selfie submissions will appear here for review." />
          : <div className="grid gap-4 md:grid-cols-2">{pendingVerifs.map((v) => <VerificationCard key={v.uid} v={v} />)}</div>
        )}

        {tab === "teachers" && <TeachersTab users={users} />}
        {tab === "users" && <UsersTab users={users} />}
        {tab === "classes" && <ClassesTab classes={classes} />}
      </div>
    </div>
  );
}
