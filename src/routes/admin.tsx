import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ComponentType } from "react";
import {
  ShieldCheck, Check, X, LogOut, IdCard, Camera, Inbox, ScanFace,
  LayoutDashboard, Users, GraduationCap, BookOpen, Search, UserCog,
  School, Plus, ArrowUpRight, Pencil, Trash2, UserPlus, ScrollText,
  Database, Download, Upload, Save, RotateCcw, AlertTriangle, Archive, FileJson,
  TrendingUp, MoreHorizontal, ChevronDown, Building2,
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

/** A select styled to match INPUT, with a chevron affordance. */
function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} appearance-none py-2.5 pr-8`}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
    </div>
  );
}

/** Shared result-count + page controls. Hidden when there's nothing to page. */
function Pager({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
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
            <button key={i} onClick={() => onPage(i + 1)}
              className="h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition"
              style={i + 1 === cur
                ? { background: "color-mix(in oklab, var(--color-wraith) 16%, transparent)", color: "var(--color-wraith)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }
                : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => onPage(cur + 1)} disabled={cur >= totalPages} className="rounded-lg px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>Next</button>
        </div>
      )}
    </div>
  );
}

/** Slice a filtered list by page, clamping the page into range. */
function paginate<T>(list: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const cur = Math.min(page, totalPages);
  return list.slice((cur - 1) * pageSize, (cur - 1) * pageSize + pageSize);
}

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

// ── Dashboard (Overview) ─────────────────────────────────────────────────────

/** 12.3K-style compact number for the quick-stat tiles. */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return String(n);
}

/** A quick-stat tile: icon chip on top, big number, label — the reference look.
 *  Clickable to jump to its tab; `highlight` gives it the filled accent card. */
function QuickStat({ label, value, icon: Icon, accent, highlight, attention, onClick }: {
  label: string; value: number; icon: ComponentType<{ className?: string }>;
  accent: string; highlight?: boolean; attention?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="glass group relative flex flex-col items-center rounded-2xl px-3 py-5 text-center transition enabled:hover:-translate-y-0.5 enabled:cursor-pointer"
      style={highlight ? { background: `color-mix(in oklab, ${accent} 90%, black 8%)`, borderColor: accent } : undefined}>
      {attention && <span className="absolute right-3 top-3 h-2 w-2 rounded-full" style={{ background: "var(--color-crimson)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--color-crimson) 25%, transparent)" }} />}
      <span className="flex h-11 w-11 items-center justify-center rounded-full"
        style={highlight
          ? { background: "rgba(255,255,255,0.18)", color: "#fff" }
          : { color: accent, background: `color-mix(in oklab, ${accent} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${accent} 28%, transparent)` }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="mt-3 font-ui text-3xl font-bold leading-none" style={{ color: highlight ? "#fff" : "var(--color-spectral)" }}>{fmtCompact(value)}</div>
      <div className="mt-1.5 text-[10px] font-medium uppercase leading-tight tracking-[0.14em]" style={{ color: highlight ? "rgba(255,255,255,0.8)" : "var(--color-parchment)" }}>{label}</div>
      {onClick && <ArrowUpRight className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 opacity-0 transition group-enabled:group-hover:opacity-60" style={{ color: highlight ? "#fff" : accent }} />}
    </button>
  );
}

/** Grouped bar chart — students vs. educators per school. Real counts only. */
function MembersBySchool({ users, schools }: { users: StudentProfile[]; schools: SchoolRec[] }) {
  const groups = useMemo(() => {
    const rows = schools.slice(0, 8).map((s) => ({
      name: s.name,
      students: users.filter((u) => u.schoolId === s.id && (u.role ?? "student") === "student").length,
      teachers: users.filter((u) => u.schoolId === s.id && u.role === "teacher").length,
    }));
    const unStudents = users.filter((u) => !u.schoolId && (u.role ?? "student") === "student").length;
    const unTeachers = users.filter((u) => !u.schoolId && u.role === "teacher").length;
    if (unStudents + unTeachers > 0) rows.push({ name: "Unassigned", students: unStudents, teachers: unTeachers });
    return rows;
  }, [users, schools]);

  const max = Math.max(1, ...groups.flatMap((g) => [g.students, g.teachers]));
  const ticks = 4;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 font-display text-xl"><TrendingUp className="h-4 w-4 text-wraith" /> Statistics</h3>
          <p className="mt-0.5 text-xs text-parchment/55">Members per school, by role.</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-emerald-elixir)" }} /> Students</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-gold)" }} /> Educators</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-parchment/50">No members yet.</p>
      ) : (
        <div className="relative pl-8" style={{ height: 220 }}>
          {/* Y gridlines + labels */}
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const val = Math.round((max / ticks) * (ticks - i));
            return (
              <div key={i} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: `${(i / ticks) * 100}%` }}>
                <span className="w-6 text-right text-[9px] tabular-nums text-parchment/40">{val}</span>
                <span className="h-px flex-1" style={{ background: "color-mix(in oklab, var(--color-spectral) 9%, transparent)" }} />
              </div>
            );
          })}
          {/* Bars */}
          <div className="absolute inset-0 left-8 flex items-end justify-around gap-2 pb-6">
            {groups.map((g) => (
              <div key={g.name} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div title={`${g.students} students`} className="w-[22%] max-w-5 rounded-t transition-all hover:brightness-110"
                    style={{ height: `${(g.students / max) * 100}%`, minHeight: g.students ? 3 : 0, background: "var(--color-emerald-elixir)" }} />
                  <div title={`${g.teachers} educators`} className="w-[22%] max-w-5 rounded-t transition-all hover:brightness-110"
                    style={{ height: `${(g.teachers / max) * 100}%`, minHeight: g.teachers ? 3 : 0, background: "var(--color-gold)" }} />
                </div>
                <span className="mt-2 max-w-full truncate text-[10px] text-parchment/55" title={g.name}>{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pending educator verifications — approve/reject inline, or jump to review. */
function PendingApprovals({ items, loading, onReview }: {
  items: Verification[]; loading: boolean; onReview: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (uid: string, fn: (uid: string) => Promise<void>) => { setBusy(uid); try { await fn(uid); } finally { setBusy(null); } };

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl">Pending Approvals</h3>
        {items.length > 0 && (
          <button onClick={onReview} className="inline-flex items-center gap-1 text-[11px] font-semibold text-wraith transition hover:brightness-110">
            Review all <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-parchment/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: "var(--color-emerald-elixir)", background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)" }}><Check className="h-5 w-5" /></span>
          <p className="text-sm text-parchment/60">All caught up — no educators waiting.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 5).map((v) => (
            <div key={v.uid} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ color: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 12%, transparent)" }}><IdCard className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-tight">{v.name ?? "Unnamed educator"}</div>
                <div className="truncate text-[11px] text-parchment/50">{v.email}</div>
              </div>
              <button onClick={() => act(v.uid, approveTeacher)} disabled={busy === v.uid} aria-label="Approve"
                className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:-translate-y-px disabled:opacity-50"
                style={{ color: "var(--color-emerald-elixir)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)" }}><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => act(v.uid, rejectTeacher)} disabled={busy === v.uid} aria-label="Reject"
                className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:-translate-y-px disabled:opacity-50"
                style={{ color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 35%, transparent)" }}><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {items.length > 5 && <p className="pt-1 text-center text-[11px] text-parchment/45">+{items.length - 5} more — <button onClick={onReview} className="text-wraith hover:underline">review all</button></p>}
        </div>
      )}
    </div>
  );
}

function csvCell(s: unknown): string {
  const v = s == null ? "" : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Manage-users table: role filter + search + CSV export + bulk select + row actions. */
function ManageUsers({ users, schools, onEdit }: {
  users: StudentProfile[]; schools: SchoolRec[]; onEdit: (u: StudentProfile) => void;
}) {
  const [role, setRole] = useState<"all" | Role>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);
  const schoolName = (id?: string) => (id ? schools.find((s) => s.id === id)?.name : undefined);

  const rows = useMemo(() => users.filter((u) => {
    if (role !== "all" && (u.role ?? "student") !== role) return false;
    const hay = `${u.displayName ?? ""} ${u.email ?? ""} ${u.role ?? "student"}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [users, role, q]);

  const toggle = (uid: string) => setSel((s) => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.uid));
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((r) => r.uid)));

  const exportCsv = (which: StudentProfile[]) => {
    const header = ["Name", "Email", "Role", "Status", "School"];
    const lines = [header.join(",")].concat(
      which.map((u) => [u.displayName ?? "", u.email ?? "", u.role ?? "student", u.role === "teacher" ? (u.status ?? "pending") : "", schoolName(u.schoolId) ?? ""].map(csvCell).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `alchemix-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const removeUser = async (u: StudentProfile) => {
    setMenu(null);
    if (!confirm(`Delete ${u.displayName ?? u.email}'s profile?\n\nTheir login credential remains (it can't be removed from the client), but they'll have no profile.`)) return;
    await deleteUserProfile(u.uid, u.displayName ?? u.email ?? undefined);
    setSel((s) => { const n = new Set(s); n.delete(u.uid); return n; });
  };

  const bulkDelete = async () => {
    const chosen = rows.filter((r) => sel.has(r.uid));
    if (!chosen.length || !confirm(`Delete ${chosen.length} user profile(s)? This cannot be undone.`)) return;
    for (const u of chosen) await deleteUserProfile(u.uid, u.displayName ?? u.email ?? undefined);
    setSel(new Set());
  };

  const selCount = rows.filter((r) => sel.has(r.uid)).length;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl">Manage users</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${INPUT} w-44 pl-9 py-2`} />
          </div>
          <div className="relative">
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className={`${INPUT} appearance-none py-2 pr-8`}>
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="school_admin">School admins</option>
              <option value="admin">Admins</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          </div>
          <button onClick={() => exportCsv(selCount ? rows.filter((r) => sel.has(r.uid)) : rows)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: "var(--color-wraith)" }}>
            <Download className="h-3.5 w-3.5" /> Export{selCount ? ` (${selCount})` : ""}
          </button>
        </div>
      </div>

      {selCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in oklab, var(--color-wraith) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 28%, transparent)" }}>
          <span className="text-parchment/80">{selCount} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => exportCsv(rows.filter((r) => sel.has(r.uid)))} className="font-semibold text-wraith hover:brightness-110">Export selected</button>
            <button onClick={bulkDelete} className="font-semibold text-crimson hover:brightness-110">Delete selected</button>
            <button onClick={() => setSel(new Set())} className="text-parchment/60 hover:text-spectral">Clear</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-parchment/50">
              <th className="w-8 pb-2 pl-1"><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all" style={{ accentColor: "var(--color-wraith)" }} /></th>
              <th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">School</th>
              <th className="w-10 pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.uid} className="border-t" style={{ borderColor: "color-mix(in oklab, var(--color-spectral) 8%, transparent)" }}>
                <td className="py-2.5 pl-1"><input type="checkbox" checked={sel.has(u.uid)} onChange={() => toggle(u.uid)} aria-label={`Select ${u.displayName ?? u.email}`} style={{ accentColor: "var(--color-wraith)" }} /></td>
                <td className="py-2.5 pr-3 font-medium text-spectral">{u.displayName ?? "—"}</td>
                <td className="max-w-[200px] truncate py-2.5 pr-3 text-parchment/70">{u.email}</td>
                <td className="py-2.5 pr-3"><RoleBadge role={u.role} /></td>
                <td className="py-2.5 pr-3">{u.role === "teacher" ? <StatusBadge status={u.status} /> : <span className="text-parchment/30">—</span>}</td>
                <td className="max-w-[160px] truncate py-2.5 pr-3 text-parchment/70">{schoolName(u.schoolId) ?? <span className="text-parchment/30">—</span>}</td>
                <td className="relative py-2.5">
                  <button onClick={() => setMenu(menu === u.uid ? null : u.uid)} aria-label="Row actions" className="flex h-7 w-7 items-center justify-center rounded-lg text-parchment/55 transition hover:bg-wraith/10 hover:text-spectral"><MoreHorizontal className="h-4 w-4" /></button>
                  {menu === u.uid && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} aria-hidden />
                      <div className="glass-strong absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg py-1 text-xs shadow-lg">
                        <button onClick={() => { setMenu(null); onEdit(u); }} className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-wraith/10"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                        <button onClick={() => removeUser(u)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-crimson transition hover:bg-crimson/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-parchment/50">No users match.</p>}
      </div>
    </div>
  );
}

function DashboardTab({ users, classesCount, pendingVerifs, vLoading, onGo }: {
  users: StudentProfile[]; classesCount: number; pendingVerifs: Verification[]; vLoading: boolean; onGo: (t: TabKey) => void;
}) {
  const { schools } = useSchools();
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const students = users.filter((u) => (u.role ?? "student") === "student").length;
  const teachers = users.filter((u) => u.role === "teacher").length;

  return (
    <div>
      <SectionHead eyebrow="Administration" title="Dashboard"
        sub="Your platform at a glance — members, schools, classes and educator approvals." />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickStat label="Total users" value={users.length} icon={Users} accent="var(--color-wraith)" onClick={() => onGo("users")} />
        <QuickStat label="Students" value={students} icon={GraduationCap} accent="var(--color-emerald-elixir)" onClick={() => onGo("users")} />
        <QuickStat label="Teachers" value={teachers} icon={UserCog} accent="var(--color-gold)" onClick={() => onGo("teachers")} />
        <QuickStat label="Schools" value={schools.length} icon={Building2} accent="var(--color-amber-scry)" onClick={() => onGo("schools")} />
        <QuickStat label="Classes" value={classesCount} icon={BookOpen} accent="var(--color-emerald-elixir)" onClick={() => onGo("classes")} />
        <QuickStat label="To verify" value={pendingVerifs.length} icon={ShieldCheck} accent="var(--color-wraith)" highlight={pendingVerifs.length > 0} attention={pendingVerifs.length > 0} onClick={() => onGo("verifications")} />
      </div>

      {/* Chart + Pending approvals */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <MembersBySchool users={users} schools={schools} />
        <PendingApprovals items={pendingVerifs} loading={vLoading} onReview={() => onGo("verifications")} />
      </div>

      {/* Manage table */}
      <div className="mt-5">
        <ManageUsers users={users} schools={schools} onEdit={setEditing} />
      </div>

      {editing && <UserEditModal user={editing} schools={schools} onClose={() => setEditing(null)} />}
    </div>
  );
}

const TEACHERS_PAGE = 15;

function TeachersTab({ users }: { users: StudentProfile[] }) {
  const allTeachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const set = async (uid: string, status: "approved" | "rejected") => { setBusy(uid); await setTeacherStatus(uid, status); setBusy(null); };

  const pendingCount = allTeachers.filter((t) => (t.status ?? "pending") === "pending").length;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allTeachers.filter((t) => {
      if (status !== "all" && (t.status ?? "pending") !== status) return false;
      if (!needle) return true;
      return `${t.displayName ?? ""} ${t.email ?? ""} ${t.className ?? ""}`.toLowerCase().includes(needle);
    });
  }, [allTeachers, q, status]);
  const shown = paginate(filtered, page, TEACHERS_PAGE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <div>
      <SectionHead eyebrow="Educators" title="Teachers" sub="Approve or revoke educator access across all schools."
        right={<span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ color: "var(--color-gold)", background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>{pendingCount} pending</span>} />

      {allTeachers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No teachers yet" sub="Teachers appear here after a school admin provisions them and they sign in." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
              <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search name, email or class…" className={`${INPUT} pl-9`} />
            </div>
            <FilterSelect value={status} onChange={(v) => reset(setStatus)(v as any)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </FilterSelect>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No teachers match" sub="Try a different search term or status filter." />
          ) : (
            <div className="space-y-2.5">
              {shown.map((t) => (
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
          <Pager total={filtered.length} page={page} pageSize={TEACHERS_PAGE} onPage={setPage} />
        </>
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

const USERS_PAGE = 15;

function UsersTab({ users }: { users: StudentProfile[] }) {
  const { schools } = useSchools();
  const schoolName = (id?: string) => (id ? schools.find((s) => s.id === id)?.name : undefined);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "all" && (u.role ?? "student") !== role) return false;
      if (!needle) return true;
      return `${u.displayName ?? ""} ${u.email ?? ""} ${u.role ?? "student"}`.toLowerCase().includes(needle);
    });
  }, [users, q, role]);
  const shown = paginate(filtered, page, USERS_PAGE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const removeUser = async (u: StudentProfile) => {
    if (!confirm(`Delete ${u.displayName ?? u.email}'s profile?\n\nTheir login credential will remain (it can't be removed from the client), but they'll have no profile.`)) return;
    await deleteUserProfile(u.uid, u.displayName ?? u.email ?? undefined);
  };

  return (
    <div>
      <SectionHead eyebrow="Directory" title="Users" sub="Everyone on the platform — students, teachers, and admins."
        right={<button onClick={() => setCreating(true)} className="btn-arcane btn-arcane-hover text-xs whitespace-nowrap"><UserPlus className="h-4 w-4" /> New user</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search name, email or role…" className={`${INPUT} pl-9`} />
        </div>
        <FilterSelect value={role} onChange={(v) => reset(setRole)(v as any)}>
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="school_admin">School admins</option>
          <option value="admin">Admins</option>
        </FilterSelect>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No users match" sub="Try a different search term or role filter." />
      ) : (
        <div className="space-y-1.5">
          {shown.map((u) => (
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
        </div>
      )}
      <Pager total={filtered.length} page={page} pageSize={USERS_PAGE} onPage={setPage} />

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

const CLASSES_PAGE = 12;

function ClassesTab({ classes }: { classes: AdminClass[] }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "active" | "archived">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminClass | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return classes.filter((c) => {
      if (state === "active" && c.archived) return false;
      if (state === "archived" && !c.archived) return false;
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || c.id.toLowerCase().includes(needle) || (c.teacherName ?? "").toLowerCase().includes(needle);
    });
  }, [classes, q, state]);
  const shown = paginate(filtered, page, CLASSES_PAGE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const del = async (c: AdminClass) => {
    if (!window.confirm(`Delete “${c.name}”? The class document is removed (its roster/requests subdocs are not cascaded from here). This cannot be undone.`)) return;
    await deleteClassAdmin(c.id, c.name);
  };

  return (
    <div>
      <SectionHead eyebrow="Rosters" title="Classes" sub="Every class created by a teacher. Rename, archive, or delete — the owning teacher keeps managing rosters, grades and assignments." />
      {classes.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes" sub="Classes teachers create will be listed here." />
      ) : (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search name, code or teacher…" className={INPUT + " pl-9"} />
        </div>
        <FilterSelect value={state} onChange={(v) => reset(setState)(v as any)}>
          <option value="all">All classes</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </FilterSelect>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No classes match" sub="Try a different search term or filter." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
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
      <Pager total={filtered.length} page={page} pageSize={CLASSES_PAGE} onPage={setPage} />
      </>
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

type SchoolCounts = { teachers: number; students: number; classes: number };

function CountChip({ icon: Icon, n, label, color }: { icon: ComponentType<{ className?: string; style?: React.CSSProperties }>; n: number; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-parchment/70" style={{ border: "1px solid var(--color-border)" }}>
      <Icon className="h-3 w-3" style={{ color }} /> <b className="text-spectral tabular-nums">{n}</b> {label}
    </span>
  );
}

function SchoolCard({ school, counts }: { school: SchoolRec; counts: SchoolCounts }) {
  const [code, setCode] = useState(school.code);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const inactive = school.active === false;
  const adminCount = school.adminEmails?.length ?? 0;

  const regen = async () => {
    if (!confirm(`Regenerate the join code for “${school.name}”? The old code ${code} stops working immediately.`)) return;
    setBusy(true);
    try { setCode(await regenerateSchoolCode(school.id)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(`Delete “${school.name}”?\n\nThis removes the school only — its teachers/classes keep a dangling schoolId. This cannot be undone.`)) return;
    await deleteSchool(school.id, school.name);
  };

  return (
    <div className="glass flex flex-col rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Orb icon={School} accent={inactive ? "var(--color-crimson)" : "var(--color-gold)"} size="h-9 w-9" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-base leading-tight" title={school.name}>{school.name}</h3>
              {inactive && <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-crimson)", background: "color-mix(in oklab, var(--color-crimson) 12%, transparent)" }}>inactive</span>}
            </div>
            <p className="mt-0.5 font-ui text-sm font-bold tracking-[0.18em] text-gold">{code}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button onClick={() => setEditing(true)} aria-label="Edit school" className="flex h-7 w-7 items-center justify-center rounded-lg text-parchment/55 transition hover:bg-wraith/10 hover:text-wraith"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={remove} aria-label="Delete school" className="flex h-7 w-7 items-center justify-center rounded-lg text-parchment/55 transition hover:bg-crimson/10 hover:text-crimson"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Live counts — see which schools are actually populated at a glance */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <CountChip icon={UserCog} n={counts.teachers} label="teachers" color="var(--color-gold)" />
        <CountChip icon={GraduationCap} n={counts.students} label="students" color="var(--color-emerald-elixir)" />
        <CountChip icon={BookOpen} n={counts.classes} label="classes" color="var(--color-wraith)" />
      </div>

      {editing && <SchoolEditModal school={school} onClose={() => setEditing(false)} />}

      {/* Collapsible admin management — keeps cards compact at scale */}
      <button onClick={() => setOpen((o) => !o)} className="mt-3 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-parchment/70 transition hover:bg-wraith/8 hover:text-spectral" style={{ border: "1px solid var(--color-border)" }}>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> {adminCount} admin{adminCount === 1 ? "" : "s"}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          {adminCount ? (
            <ul className="space-y-1">
              {school.adminEmails!.map((e) => <li key={e} className="flex items-center gap-1.5 truncate text-[12px] text-parchment/75"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold/70" /> {e}</li>)}
            </ul>
          ) : (
            <p className="text-[11px] text-parchment/45">No admins yet.</p>
          )}

          {adding ? (
            <div className="mt-3"><AddAdminForm schoolId={school.id} onDone={() => setAdding(false)} /></div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal transition hover:brightness-110">
                <Plus className="h-3.5 w-3.5" /> Add admin
              </button>
              <button onClick={regen} disabled={busy} className="text-[11px] text-parchment/50 transition hover:text-spectral disabled:opacity-50">↻ {busy ? "…" : "New code"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SchoolCreateModal({ onClose }: { onClose: () => void }) {
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
    <Modal title="New school" onClose={onClose}>
      <div className="space-y-3">
        <Field label="School name"><input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Olongapo City National High School" className={INPUT} /></Field>
        <p className="pt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: ACCENT }}>School admin account</p>
        <Field label="Admin name"><input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Full name" className={INPUT} /></Field>
        <Field label="Admin email"><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.edu" className={INPUT} /></Field>
        <Field label="Password"><input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} placeholder="Min. 6 characters" className={INPUT} /></Field>

        {err && <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</p>}
        {ok && (
          <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
            <span className="font-semibold text-emerald-elixir">Created “{ok.school}.”</span>{" "}
            <span className="text-parchment/80">Code <span className="font-bold tracking-[0.15em] text-gold">{ok.code}</span> · admin <span className="text-spectral">{ok.email}</span> signs in at <span className="font-mono">/school/signin</span>.</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs text-parchment/70 transition hover:text-spectral">{ok ? "Done" : "Cancel"}</button>
          <button onClick={create} disabled={busy} className={PRIMARY_BTN} style={{ background: "var(--color-gold)", color: "var(--color-mist)" }}>
            {busy ? "Creating…" : ok ? "Create another" : "Create school & admin"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass flex items-center gap-2.5 rounded-xl px-3.5 py-2.5">
      <span className="h-8 w-1 rounded-full" style={{ background: color }} />
      <div>
        <div className="font-ui text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-parchment/55">{label}</div>
      </div>
    </div>
  );
}

const SCHOOLS_PAGE = 12;

function SchoolsTab({ users, classes }: { users: StudentProfile[]; classes: AdminClass[] }) {
  const { schools, loading } = useSchools();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name" | "members" | "admins">("name");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  // Live per-school counts (teachers/students via schoolId; classes via teacher→school).
  const counts = useMemo(() => {
    const uidSchool = new Map<string, string>();
    for (const u of users) if (u.schoolId) uidSchool.set(u.uid, u.schoolId);
    const m = new Map<string, SchoolCounts>();
    const bump = (id: string) => m.get(id) ?? (m.set(id, { teachers: 0, students: 0, classes: 0 }), m.get(id)!);
    for (const u of users) {
      if (!u.schoolId) continue;
      const c = bump(u.schoolId);
      if (u.role === "teacher") c.teachers++; else if ((u.role ?? "student") === "student") c.students++;
    }
    for (const cls of classes) {
      const sid = uidSchool.get(cls.teacherId);
      if (sid) bump(sid).classes++;
    }
    return m;
  }, [users, classes]);
  const getCounts = (id: string): SchoolCounts => counts.get(id) ?? { teachers: 0, students: 0, classes: 0 };

  const active = schools.filter((s) => s.active !== false).length;
  const noAdmin = schools.filter((s) => !(s.adminEmails?.length)).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = schools.filter((s) => {
      if (status === "active" && s.active === false) return false;
      if (status === "inactive" && s.active !== false) return false;
      if (!needle) return true;
      return `${s.name} ${s.code} ${(s.adminEmails ?? []).join(" ")}`.toLowerCase().includes(needle);
    });
    const members = (s: SchoolRec) => { const c = getCounts(s.id); return c.teachers + c.students; };
    return [...list].sort((a, b) =>
      sort === "members" ? members(b) - members(a)
        : sort === "admins" ? (b.adminEmails?.length ?? 0) - (a.adminEmails?.length ?? 0)
          : a.name.localeCompare(b.name));
  }, [schools, q, status, sort, counts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SCHOOLS_PAGE));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * SCHOOLS_PAGE;
  const slice = filtered.slice(start, start + SCHOOLS_PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div>
      <SectionHead eyebrow="Multi-tenant" title="Schools" sub="Every tenant on the platform. Create schools, manage their admins, and track adoption."
        right={<button onClick={() => setCreating(true)} className="btn-arcane btn-arcane-hover whitespace-nowrap text-xs"><Plus className="h-4 w-4" /> New school</button>} />

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip label="Total schools" value={schools.length} color="var(--color-gold)" />
        <SummaryChip label="Active" value={active} color="var(--color-emerald-elixir)" />
        <SummaryChip label="Inactive" value={schools.length - active} color="var(--color-crimson)" />
        <SummaryChip label="No admin yet" value={noAdmin} color="var(--color-amber-scry)" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Search name, code or admin email…" className={`${INPUT} pl-9`} />
        </div>
        <div className="relative">
          <select value={status} onChange={(e) => reset(setStatus)(e.target.value as any)} className={`${INPUT} appearance-none py-2.5 pr-8`}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
        </div>
        <div className="relative">
          <select value={sort} onChange={(e) => reset(setSort)(e.target.value as any)} className={`${INPUT} appearance-none py-2.5 pr-8`}>
            <option value="name">Sort: Name A–Z</option>
            <option value="members">Sort: Most members</option>
            <option value="admins">Sort: Most admins</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-parchment/60">Loading schools…</p>
      ) : schools.length === 0 ? (
        <EmptyState icon={School} title="No schools yet" sub="Create a school — it gets a code that onboards teachers, and its admin account signs in at /school/signin." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No schools match" sub="Try a different search term or clear the filters." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((s) => <SchoolCard key={s.id} school={s} counts={getCounts(s.id)} />)}
          </div>

          {/* Footer: result count + pagination */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-parchment/55">Showing <span className="text-spectral">{start + 1}–{Math.min(start + SCHOOLS_PAGE, filtered.length)}</span> of <span className="text-spectral">{filtered.length}</span></p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(cur - 1)} disabled={cur <= 1} className="rounded-lg px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>Prev</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className="h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition"
                    style={i + 1 === cur
                      ? { background: "color-mix(in oklab, var(--color-wraith) 16%, transparent)", color: "var(--color-wraith)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }
                      : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(cur + 1)} disabled={cur >= totalPages} className="rounded-lg px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>Next</button>
              </div>
            )}
          </div>
        </>
      )}

      <details className="mt-8 group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-parchment/50 transition hover:text-spectral"><ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /> Advanced · migration tools</summary>
        <div className="mt-3"><MigrationCard /></div>
      </details>

      {creating && <SchoolCreateModal onClose={() => setCreating(false)} />}
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
  const adminEmail = auth.currentUser?.email ?? "";

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
      <aside className="glass-strong hidden md:flex fixed left-3 top-3 bottom-3 z-40 w-64 flex-col rounded-3xl p-3.5">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-wraith/5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "color-mix(in oklab, var(--color-wraith) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 30%, transparent)" }}>
            <img src="/images/logo-outline.png" alt="" className="h-6 w-6 object-contain" style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-wraith) 60%, transparent))" }} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base tracking-[0.12em]">AlcheMix</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-wraith">Admin</span>
          </span>
        </Link>

        {/* Signed-in identity */}
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, var(--color-wraith), var(--color-emerald-elixir))" }}>
            {(adminEmail[0] ?? "A").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-parchment/45">Super admin</p>
            <p className="truncate text-xs font-medium text-spectral">{adminEmail || "signed in"}</p>
          </div>
        </div>

        <p className="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-parchment/40">Menu</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-slim">
          {NAV.map((n) => {
            const active = tab === n.key;
            const badge = "badge" in n ? n.badge : 0;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--color-spectral)_6%,transparent)]"
                style={{ background: active ? "color-mix(in oklab, var(--color-wraith) 15%, transparent)" : undefined, color: active ? "var(--color-spectral)" : "color-mix(in oklab, var(--color-parchment) 90%, transparent)" }}>
                {active && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full" style={{ background: "linear-gradient(180deg, var(--color-emerald-elixir), var(--color-wraith))" }} />}
                <n.icon className="h-[18px] w-[18px] flex-shrink-0 transition-colors" style={{ color: active ? "var(--color-wraith)" : "currentColor" }} />
                <span className="flex-1 text-[13.5px] font-medium">{n.label}</span>
                {!!badge && badge > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--color-crimson)" }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5">
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-parchment/65 transition hover:text-crimson"><LogOut className="h-4 w-4" /> Sign out</button>
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
        <div className="w-full px-5 pt-32 pb-16 md:pl-[17.75rem] md:pr-7 md:pt-9 md:pb-16">
          {tab === "overview" && <DashboardTab users={users} classesCount={classes.length} pendingVerifs={pendingVerifs} vLoading={vLoading} onGo={setTab} />}
          {tab === "schools" && <SchoolsTab users={users} classes={classes} />}
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
