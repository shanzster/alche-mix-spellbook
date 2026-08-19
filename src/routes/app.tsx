import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Atom, BookMarked, Scale, Gauge, ClipboardList, Grid3x3,
  ChevronRight, GraduationCap, ClipboardCheck, Users, ScanSearch, Brain, Award,
  Shapes, ShieldAlert, Beaker, Radiation, ScanLine,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile, type Mastery } from "../lib/profile";
import { joinClass } from "../lib/teacher";

export const Route = createFileRoute("/app")({
  component: () => (
    <RequireRole role="student">
      <StudentHub />
    </RequireRole>
  ),
});

type ModuleStatus = "live" | "soon" | "ai";
interface ModuleRow { icon: typeof Atom; title: string; desc: string; color: string; to: string; status: ModuleStatus; hidden?: boolean }

const MODULES_ALL: ModuleRow[] = [
  { icon: Brain, title: "The Study", desc: "Guided learn → practise → assess paths, with spaced review.", color: "var(--color-wraith)", to: "/study", status: "live", hidden: true },
  { icon: BookMarked, title: "Grimoire", desc: "Your collection book — every card you've scanned, and when you got it.", color: "var(--color-gold)", to: "/cards", status: "live" },
  { icon: Atom, title: "Atomic Builder", desc: "Forge atoms from protons, neutrons & electrons.", color: "var(--color-emerald-elixir)", to: "/atomic-builder", status: "live" },
  { icon: Grid3x3, title: "Periodic Table", desc: "Study each element — uses, examples & 3D.", color: "var(--color-wraith)", to: "/periodic-table", status: "live" },
  { icon: ScanLine, title: "AR Scanner", desc: "Scan the element card and summon its 3D crystal in AR.", color: "var(--color-emerald-elixir)", to: "/scanner", status: "live" },
  { icon: Scale, title: "Equation Balancer", desc: "Balance equations & learn conservation of mass.", color: "var(--color-emerald-elixir)", to: "/equation-balancer", status: "live", hidden: true },
  { icon: Gauge, title: "Gas Laws Simulator", desc: "Explore PV = nRT with live particles.", color: "var(--color-wraith)", to: "/gas-laws", status: "live", hidden: true },
  { icon: ClipboardList, title: "3D Visual Quiz", desc: "Identify elements from rotating atoms.", color: "var(--color-emerald-elixir)", to: "/quiz", status: "live", hidden: true },
  { icon: ScanSearch, title: "AI Scavenger Hunt", desc: "Live camera scan — green trackers lock onto your element.", color: "var(--color-gold)", to: "/scavenger", status: "live" },
  { icon: Shapes, title: "Molecule Shapes", desc: "Real 3D VSEPR geometry — bent, tetrahedral & more.", color: "var(--color-emerald-elixir)", to: "/molecules", status: "live", hidden: true },
  { icon: Atom, title: "Reaction Theatre", desc: "Watch bonds break and reform in a balanced equation.", color: "var(--color-gold)", to: "/reactions", status: "live" },
  { icon: Beaker, title: "Titration Lab", desc: "Titrate acid with base and read the pH curve.", color: "var(--color-wraith)", to: "/titration", status: "live", hidden: true },
  { icon: Radiation, title: "Radioactive Decay", desc: "Isotopes, half-life & decay, one nucleus at a time.", color: "var(--color-emerald-elixir)", to: "/decay", status: "live", hidden: true },
  { icon: ShieldAlert, title: "Lab Safety", desc: "Hazard symbols & apparatus — know before you touch.", color: "var(--color-crimson)", to: "/lab-safety", status: "live", hidden: true },
];

// Only element-focused modules are shown for now; flip `hidden` above to bring one back.
const MODULES = MODULES_ALL.filter((m) => !m.hidden);

const STATUS_LABEL: Record<ModuleStatus, string> = { live: "Open", soon: "Soon", ai: "AI setup" };

/** Badges the app can award, keyed by badge id (see awardBadge in lib/profile). */
const BADGE_META: Record<string, { label: string; desc: string }> = {
  "ar-alchemist": { label: "AR Alchemist", desc: "Summoned the crystal in AR and aced the quick check" },
};

const MASTERY_META: Record<Mastery, { label: string; color: string }> = {
  "not-started": { label: "Not started", color: "var(--color-parchment)" },
  "developing":  { label: "Developing",  color: "var(--color-gold)" },
  "proficient":  { label: "Proficient",  color: "var(--color-emerald-elixir)" },
  "mastered":    { label: "Mastered",    color: "var(--color-wraith)" },
};

function ClassBanner({ uid, profile }: { uid: string | null; profile: ReturnType<typeof useUserProfile>["profile"] }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  if (profile?.classId) {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)" }}>
        <Users className="h-4 w-4 text-teal flex-shrink-0" />
        <span className="text-sm text-parchment">Enrolled in <span className="font-display text-spectral">{profile.className}</span></span>
      </div>
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setJoining(true);
    const cls = await joinClass({ uid: uid ?? "", name: profile?.displayName ?? null, email: profile?.email ?? null }, code);
    if (!cls) setError("That code doesn't match any class.");
    else setCode("");
    setJoining(false);
  };

  return (
    <div className="mb-8 rounded-xl px-4 py-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
      <p className="text-sm text-parchment mb-2">Have a class code from your teacher?</p>
      <form onSubmit={join} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter 6-char code" maxLength={6}
          className="w-40 rounded-lg px-3 py-2 text-sm tracking-[0.2em] uppercase text-spectral placeholder:text-parchment/40 placeholder:tracking-normal outline-none"
          style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)", border: "1px solid var(--color-border)" }} />
        <button type="submit" disabled={joining || code.length < 4} className="btn-arcane btn-arcane-hover text-xs disabled:opacity-60">Join class</button>
      </form>
      {error && <p className="text-xs text-crimson mt-2">{error}</p>}
    </div>
  );
}

function StudentHub() {
  const { uid, profile } = useUserProfile();
  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Apprentice";
  const grades = profile?.grades ?? {};
  const mastery = profile?.mastery ?? {};
  const gradeEntries = Object.entries(grades);
  const masteryEntries = Object.entries(mastery);
  const hasProgress = gradeEntries.length > 0 || masteryEntries.length > 0;
  const badges = (profile?.badges ?? []).filter((b) => BADGE_META[b]);

  return (
    <StudentShell title="Home">
      {/* Themed greeting header */}
      <PageHeader
        eyebrow="Apprentice's Bench"
        title={`Welcome back, ${name}.`}
        subtitle="Practise a module, then check back here for the scores and feedback your teacher posts."
        icon={GraduationCap}
      />

      {/* Class enrolment */}
      <ClassBanner uid={uid} profile={profile} />

      {/* My Progress — populated by the teacher */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3 px-1">
          <GraduationCap className="h-4 w-4 text-teal" />
          <h2 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70">My Progress</h2>
        </div>

        {/* Badges earned in the app (e.g. from the AR Scanner's quick check). */}
        {badges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} title={BADGE_META[b].desc}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-xs tracking-[0.08em]"
                style={{
                  color: "var(--color-gold)",
                  background: "color-mix(in oklab, var(--color-gold) 12%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)",
                  boxShadow: "0 0 18px -8px var(--color-gold)",
                }}>
                <Award className="h-3.5 w-3.5" /> {BADGE_META[b].label}
              </span>
            ))}
          </div>
        )}

        {!hasProgress ? (
          <div className="relative overflow-hidden rounded-2xl px-5 py-9 text-center"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--color-wraith) 8%, transparent), color-mix(in oklab, var(--color-slate-sunken) 55%, transparent))", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
            <div className="pointer-events-none absolute -right-10 -bottom-14 h-40 w-40 rounded-full blur-3xl" style={{ background: "color-mix(in oklab, var(--color-wraith) 14%, transparent)" }} />
            <span className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--color-teal) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-teal) 30%, transparent)", boxShadow: "0 0 24px -8px var(--color-teal)" }}>
              <ClipboardCheck className="h-6 w-6 text-teal" />
            </span>
            <p className="relative font-display text-base mb-1">No scores yet</p>
            <p className="relative text-sm text-parchment/60 max-w-sm mx-auto">Your teacher hasn't posted results yet. Grades, feedback and mastery for each topic will appear here once they do.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gradeEntries.map(([topic, g]) => {
              const pct = g.outOf > 0 ? Math.round((g.score / g.outOf) * 100) : 0;
              return (
                <div key={topic} className="flex items-center gap-4 py-3 px-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm capitalize">{topic}</div>
                    {g.feedback && <div className="text-xs text-parchment/60 truncate">{g.feedback}</div>}
                  </div>
                  {mastery[topic] && (
                    <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MASTERY_META[mastery[topic]].color }}>
                      {MASTERY_META[mastery[topic]].label}
                    </span>
                  )}
                  <span className="font-display text-teal text-sm flex-shrink-0">{g.score}/{g.outOf} <span className="text-parchment/50">({pct}%)</span></span>
                </div>
              );
            })}
            {/* topics with mastery but no numeric grade */}
            {masteryEntries.filter(([t]) => !grades[t]).map(([topic, m]) => (
              <div key={topic} className="flex items-center gap-4 py-3 px-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                <div className="font-display text-sm capitalize flex-1">{topic}</div>
                <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MASTERY_META[m].color }}>{MASTERY_META[m].label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Module list */}
      <section>
        <div className="flex items-center gap-2 mb-1 px-1">
          <Atom className="h-4 w-4 text-gold" />
          <h2 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70">Learning Modules</h2>
        </div>
        <ul>
          {MODULES.map((m) => {
            const live = m.status === "live";
            const Row = (
              <div className="group flex items-center gap-4 py-4 px-3 border-t transition-colors" style={{ borderColor: "var(--color-border)" }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${m.color} 24%, transparent), color-mix(in oklab, ${m.color} 8%, transparent))`, border: `1px solid color-mix(in oklab, ${m.color} 30%, transparent)`, color: m.color, boxShadow: `0 0 18px -9px ${m.color}` }}>
                  <m.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base">{m.title}</div>
                  <div className="text-xs text-parchment/60 truncate">{m.desc}</div>
                </div>
                <span className="text-[10px] tracking-[0.15em] uppercase flex-shrink-0" style={{ color: live ? m.color : "var(--color-parchment)" }}>{STATUS_LABEL[m.status]}</span>
                {live ? <ChevronRight className="h-4 w-4 text-parchment/40 group-hover:text-teal group-hover:translate-x-0.5 transition-all flex-shrink-0" /> : <span className="w-4 flex-shrink-0" />}
              </div>
            );
            return live ? (
              <li key={m.title}><Link to={m.to as any} className="block rounded-lg hover:bg-teal/5">{Row}</Link></li>
            ) : (
              <li key={m.title} className="opacity-55 cursor-not-allowed" title="Needs AI setup">{Row}</li>
            );
          })}
        </ul>
      </section>
    </StudentShell>
  );
}
