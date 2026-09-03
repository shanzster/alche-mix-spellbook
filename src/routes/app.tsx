import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Atom,
  BookMarked,
  Scale,
  Gauge,
  ClipboardList,
  Grid3x3,
  ChevronRight,
  GraduationCap,
  ClipboardCheck,
  Users,
  ScanSearch,
  Brain,
  Award,
  Shapes,
  ShieldAlert,
  Beaker,
  Radiation,
  ScanLine,
  Flame,
  FlaskConical,
  Thermometer,
  Crosshair,
  Swords,
  Store,
  ListChecks,
  Trophy,
  Activity,
  RefreshCw,
  Zap,
  Magnet,
  Droplets,
  Coffee,
  Compass,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile, type Mastery } from "../lib/profile";
import { joinClass } from "../lib/teacher";
import { nextGuideStep } from "../lib/guide";
import { usePlatform } from "../lib/platform";

export const Route = createFileRoute("/app")({
  component: () => (
    <RequireRole role="student">
      <StudentHub />
    </RequireRole>
  ),
});

type ModuleStatus = "live" | "soon" | "ai";
interface ModuleRow {
  icon: typeof Atom;
  title: string;
  desc: string;
  color: string;
  to: string;
  status: ModuleStatus;
  arOnly?: boolean;
}

// Every module, listed in the Grimoire Guide's recommended learning order
// (guidebook first, then foundations → theory → reactions → labs → proving it).
const MODULES: ModuleRow[] = [
  {
    icon: BookMarked,
    title: "Grimoire",
    desc: "Your card collection — every card you've scanned and forged.",
    color: "var(--color-gold)",
    to: "/cards",
    status: "live",
  },
  {
    icon: Compass,
    title: "The Guide",
    desc: "The learning path — what to study first, and where you are.",
    color: "var(--color-emerald-elixir)",
    to: "/guide",
    status: "live",
  },
  {
    icon: Flame,
    title: "Starters for Ten",
    desc: "The daily ritual — ten quick questions, keep your streak alight.",
    color: "var(--color-gold)",
    to: "/starters",
    status: "live",
  },
  {
    icon: ListChecks,
    title: "Assignments",
    desc: "Quizzes and missions set by your teacher.",
    color: "var(--color-wraith)",
    to: "/assignments",
    status: "live",
  },
  {
    icon: ShieldAlert,
    title: "Lab Safety",
    desc: "Hazard symbols & apparatus — know before you touch.",
    color: "var(--color-crimson)",
    to: "/lab-safety",
    status: "live",
  },
  {
    icon: Atom,
    title: "Atomic Builder",
    desc: "Forge atoms from protons, neutrons & electrons.",
    color: "var(--color-emerald-elixir)",
    to: "/atomic-builder",
    status: "live",
  },
  {
    icon: Grid3x3,
    title: "Periodic Table",
    desc: "Study each element — uses, examples & 3D.",
    color: "var(--color-wraith)",
    to: "/periodic-table",
    status: "live",
  },
  {
    icon: Brain,
    title: "The Study",
    desc: "Guided learn → practise → assess paths, with spaced review.",
    color: "var(--color-wraith)",
    to: "/study",
    status: "live",
  },
  {
    icon: Shapes,
    title: "Molecule Shapes",
    desc: "Real 3D VSEPR geometry — bent, tetrahedral & more.",
    color: "var(--color-emerald-elixir)",
    to: "/molecules",
    status: "live",
  },
  {
    icon: Thermometer,
    title: "States of Matter",
    desc: "Heat, cool and melt real substances — watch the particles change.",
    color: "var(--color-wraith)",
    to: "/states",
    status: "live",
  },
  {
    icon: Magnet,
    title: "Invisible Bonds",
    desc: "Intermolecular forces — watch stronger attractions boil later.",
    color: "var(--color-emerald-elixir)",
    to: "/forces",
    status: "live",
  },
  {
    icon: Atom,
    title: "Reaction Theatre",
    desc: "Watch bonds break and reform in a balanced equation.",
    color: "var(--color-gold)",
    to: "/reactions",
    status: "live",
  },
  {
    icon: Scale,
    title: "Equation Balancer",
    desc: "Balance equations & learn conservation of mass.",
    color: "var(--color-emerald-elixir)",
    to: "/equation-balancer",
    status: "live",
  },
  {
    icon: FlaskConical,
    title: "Compound Codex",
    desc: "Forge real compounds from your elements — fill the encyclopedia.",
    color: "var(--color-gold)",
    to: "/codex",
    status: "live",
  },
  {
    icon: Gauge,
    title: "Gas Laws Simulator",
    desc: "Explore PV = nRT with live particles.",
    color: "var(--color-wraith)",
    to: "/gas-laws",
    status: "live",
  },
  {
    icon: Droplets,
    title: "The Elixir Bench",
    desc: "Solutions & molarity — mix, dilute, saturate real solutes.",
    color: "var(--color-emerald-elixir)",
    to: "/solutions",
    status: "live",
  },
  {
    icon: Coffee,
    title: "Cauldron of Heat",
    desc: "Calorimetry — measure the heat reactions give and take.",
    color: "var(--color-crimson)",
    to: "/thermo",
    status: "live",
  },
  {
    icon: Activity,
    title: "Reaction Rates",
    desc: "Collision theory live — heat, crowd, crush and catalyse.",
    color: "var(--color-gold)",
    to: "/rates",
    status: "live",
  },
  {
    icon: RefreshCw,
    title: "Equilibrium",
    desc: "Le Chatelier you can poke — stress the balance, watch it shift.",
    color: "var(--color-wraith)",
    to: "/equilibrium",
    status: "live",
  },
  {
    icon: Zap,
    title: "The Voltaic Forge",
    desc: "Build galvanic cells from real metals and read the voltage.",
    color: "var(--color-gold)",
    to: "/electro",
    status: "live",
  },
  {
    icon: Beaker,
    title: "Titration Lab",
    desc: "Titrate acid with base and read the pH curve.",
    color: "var(--color-wraith)",
    to: "/titration",
    status: "live",
  },
  {
    icon: Radiation,
    title: "Radioactive Decay",
    desc: "Isotopes, half-life & decay, one nucleus at a time.",
    color: "var(--color-emerald-elixir)",
    to: "/decay",
    status: "live",
  },
  {
    icon: ClipboardList,
    title: "3D Visual Quiz",
    desc: "Identify elements from rotating atoms.",
    color: "var(--color-emerald-elixir)",
    to: "/quiz",
    status: "live",
  },
  {
    icon: ScanLine,
    title: "AR Scanner",
    desc: "Scan the element card and summon its 3D crystal in AR.",
    color: "var(--color-emerald-elixir)",
    to: "/scanner",
    status: "live",
    arOnly: true,
  },
  {
    icon: ScanSearch,
    title: "AI Scavenger Hunt",
    desc: "Live camera scan — green trackers lock onto your element.",
    color: "var(--color-gold)",
    to: "/scavenger",
    status: "live",
  },
];

// The Arcade — games & rewards, deliberately separated from the learning
// modules so the science reads as the main experience and play stays optional.
const ARCADE: ModuleRow[] = [
  {
    icon: Swords,
    title: "Duel the Alchemist",
    desc: "Card battles where the stats are real chemistry. Three rivals await.",
    color: "var(--color-crimson)",
    to: "/duel",
    status: "live",
  },
  {
    icon: Users,
    title: "Class Duels",
    desc: "Challenge a classmate — duels resolve whenever each of you visits.",
    color: "var(--color-wraith)",
    to: "/duels",
    status: "live",
  },
  {
    icon: Crosshair,
    title: "Placement Trials",
    desc: "Know the table by heart — place each element in its true cell.",
    color: "var(--color-emerald-elixir)",
    to: "/table-game",
    status: "live",
  },
  {
    icon: Trophy,
    title: "Hall of Records",
    desc: "Your class leaderboards — stars, duels, compounds, streaks.",
    color: "var(--color-gold)",
    to: "/leaderboard",
    status: "live",
  },
  {
    icon: Store,
    title: "The Emporium",
    desc: "Spend your aurum — frames, titles and charms.",
    color: "var(--color-gold)",
    to: "/shop",
    status: "live",
  },
];

const STATUS_LABEL: Record<ModuleStatus, string> = { live: "Open", soon: "Soon", ai: "AI setup" };

/** Badges the app can award, keyed by badge id (see awardBadge in lib/profile). */
const BADGE_META: Record<string, { label: string; desc: string }> = {
  "ar-alchemist": {
    label: "AR Alchemist",
    desc: "Summoned the crystal in AR and aced the quick check",
  },
};

const MASTERY_META: Record<Mastery, { label: string; color: string }> = {
  "not-started": { label: "Not started", color: "var(--color-parchment)" },
  developing: { label: "Developing", color: "var(--color-gold)" },
  proficient: { label: "Proficient", color: "var(--color-emerald-elixir)" },
  mastered: { label: "Mastered", color: "var(--color-wraith)" },
};

function ClassBanner({
  uid,
  profile,
}: {
  uid: string | null;
  profile: ReturnType<typeof useUserProfile>["profile"];
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  if (profile?.classId) {
    return (
      <div
        className="mb-8 flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "color-mix(in oklab, var(--color-emerald-elixir) 6%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 25%, transparent)",
        }}
      >
        <Users className="h-4 w-4 text-teal flex-shrink-0" />
        <span className="text-sm text-parchment">
          Enrolled in <span className="font-ui font-medium text-spectral">{profile.className}</span>
        </span>
      </div>
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setJoining(true);
    const cls = await joinClass(
      { uid: uid ?? "", name: profile?.displayName ?? null, email: profile?.email ?? null },
      code,
    );
    if (!cls) setError("That code doesn't match any class.");
    else setCode("");
    setJoining(false);
  };

  return (
    <div className="glass mb-8 rounded-2xl px-5 py-4">
      <p className="text-sm text-parchment mb-2">Have a class code from your teacher?</p>
      <form onSubmit={join} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-char code"
          maxLength={6}
          className="w-40 rounded-lg px-3 py-2 text-sm tracking-[0.2em] uppercase text-spectral placeholder:text-parchment/40 placeholder:tracking-normal outline-none"
          style={{
            background: "color-mix(in oklab, var(--color-mist) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        />
        <button
          type="submit"
          disabled={joining || code.length < 4}
          className="btn-arcane btn-arcane-hover text-xs disabled:opacity-60"
        >
          Join class
        </button>
      </form>
      {error && <p className="text-xs text-crimson mt-2">{error}</p>}
    </div>
  );
}

function StudentHub() {
  const { uid, profile } = useUserProfile();
  const platform = usePlatform();
  const nextStep = nextGuideStep(profile);
  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Apprentice";
  const grades = profile?.grades ?? {};
  const mastery = profile?.mastery ?? {};
  const gradeEntries = Object.entries(grades);
  const masteryEntries = Object.entries(mastery);
  const hasProgress = gradeEntries.length > 0 || masteryEntries.length > 0;
  const badges = (profile?.badges ?? []).filter((b) => BADGE_META[b]);

  const renderModule = (m: ModuleRow) => {
            const live = m.status === "live";
            const recommended = nextStep?.to === m.to;
            const mobileOnly = m.arOnly && platform.ready && !platform.arCapable;
            const Row = (
              <div className="flex items-center gap-3.5 rounded-xl py-3 px-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    background: "color-mix(in oklab, var(--color-parchment) 6%, transparent)",
                    border: "1px solid var(--color-border)",
                    color: m.color,
                  }}
                >
                  <m.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-ui font-medium text-base">{m.title}</span>
                    {recommended && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase flex-shrink-0"
                        style={{
                          color: "var(--color-emerald-elixir)",
                          background:
                            "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)",
                          border:
                            "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)",
                        }}
                      >
                        Up next
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-parchment/60 truncate">
                    {mobileOnly
                      ? "An AR experience — open this on your phone; here it shows the hand-off."
                      : m.desc}
                  </div>
                </div>
                {(mobileOnly || !live) && (
                  <span className="text-[10px] tracking-[0.15em] uppercase flex-shrink-0 text-parchment/70">
                    {mobileOnly ? "On mobile" : STATUS_LABEL[m.status]}
                  </span>
                )}
                {live ? (
                  <ChevronRight className="h-4 w-4 text-parchment/40 flex-shrink-0" />
                ) : (
                  <span className="w-4 flex-shrink-0" />
                )}
              </div>
            );
            return live ? (
              <li key={m.title}>
                <Link to={m.to as any} className="block rounded-xl hover:bg-teal/5">
                  {Row}
                </Link>
              </li>
            ) : (
              <li key={m.title} className="opacity-55 cursor-not-allowed" title="Needs AI setup">
                {Row}
              </li>
            );
  };

  return (
    <StudentShell title="Home">
      {/* Themed greeting header */}
      <PageHeader
        eyebrow="Apprentice's Bench"
        title={`Welcome back, ${name}.`}
        subtitle="Practise a module, then check back here for the scores and feedback your teacher posts."
        icon={GraduationCap}
      />

      {/* Which side of AlcheMix is this? Mobile = capture companion; website = deep study. */}
      {platform.ready && platform.arCapable && (
        <div
          className="mb-8 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "color-mix(in oklab, var(--color-gold) 6%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-gold) 25%, transparent)",
          }}
        >
          <ScanLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
          <span className="text-sm text-parchment">
            You're on the <span className="font-ui font-medium text-spectral">mobile companion</span> — the
            AR Scanner and Scavenger Hunt live here. For the full in-depth study, open AlcheMix on a
            computer.
          </span>
        </div>
      )}

      {/* Class enrolment */}
      <ClassBanner uid={uid} profile={profile} />

      {/* My Progress — populated by the teacher */}
      <section className="mb-12">
        <div className="flex items-center mb-3 px-1">
          <h2 className="font-ui font-medium text-xs tracking-[0.15em] uppercase text-parchment/60">
            My Progress
          </h2>
        </div>

        {/* Badges earned in the app (e.g. from the AR Scanner's quick check). */}
        {badges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                title={BADGE_META[b].desc}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-ui font-medium text-xs tracking-[0.08em]"
                style={{
                  color: "var(--color-gold)",
                  background: "color-mix(in oklab, var(--color-gold) 8%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)",
                }}
              >
                <Award className="h-3.5 w-3.5" /> {BADGE_META[b].label}
              </span>
            ))}
          </div>
        )}

        {!hasProgress ? (
          <div className="glass rounded-2xl px-5 py-9 text-center">
            <span
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in oklab, var(--color-teal) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-teal) 25%, transparent)",
              }}
            >
              <ClipboardCheck className="h-6 w-6 text-teal" />
            </span>
            <p className="font-ui font-medium text-base mb-1">No scores yet</p>
            <p className="text-sm text-parchment/60 max-w-sm mx-auto">
              Your teacher hasn't posted results yet. Grades, feedback and mastery for each topic
              will appear here once they do.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gradeEntries.map(([topic, g]) => {
              const pct = g.outOf > 0 ? Math.round((g.score / g.outOf) * 100) : 0;
              return (
                <div
                  key={topic}
                  className="flex items-center gap-4 py-3 px-1 border-t"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-ui font-medium text-sm capitalize">{topic}</div>
                    {g.feedback && (
                      <div className="text-xs text-parchment/60 truncate">{g.feedback}</div>
                    )}
                  </div>
                  {mastery[topic] && (
                    <span
                      className="text-[10px] tracking-[0.12em] uppercase"
                      style={{ color: MASTERY_META[mastery[topic]].color }}
                    >
                      {MASTERY_META[mastery[topic]].label}
                    </span>
                  )}
                  <span className="font-ui font-medium text-teal text-sm flex-shrink-0">
                    {g.score}/{g.outOf} <span className="text-parchment/50">({pct}%)</span>
                  </span>
                </div>
              );
            })}
            {/* topics with mastery but no numeric grade */}
            {masteryEntries
              .filter(([t]) => !grades[t])
              .map(([topic, m]) => (
                <div
                  key={topic}
                  className="flex items-center gap-4 py-3 px-1 border-t"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="font-ui font-medium text-sm capitalize flex-1">{topic}</div>
                  <span
                    className="text-[10px] tracking-[0.12em] uppercase"
                    style={{ color: MASTERY_META[m].color }}
                  >
                    {MASTERY_META[m].label}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Module list */}
      <section>
        <div className="flex items-center mb-2 px-1">
          <h2 className="font-ui font-medium text-xs tracking-[0.15em] uppercase text-parchment/60">
            Learning Modules
          </h2>
          <span className="ml-auto text-[10px] text-parchment/45">
            in the Guide's recommended order
          </span>
        </div>
        <ul className="glass rounded-2xl p-2 xl:grid xl:grid-cols-2 xl:gap-x-6">
          {MODULES.map(renderModule)}
        </ul>
      </section>

      {/* The Arcade — games & rewards, kept apart from the learning path */}
      <section className="mt-14">
        <div className="flex items-center mb-3 px-1">
          <h2 className="font-ui font-medium text-xs tracking-[0.15em] uppercase text-parchment/60">
            The Arcade
          </h2>
          <span className="ml-auto text-[10px] text-parchment/45">
            games & rewards — for after the studying
          </span>
        </div>
      {/* Alchemist's purse & streak — rewards earned from Trials and daily Starters. */}
      {((profile?.aurum ?? 0) > 0 || (profile?.starterStreak?.count ?? 0) > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(profile?.aurum ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-ui font-medium text-xs tracking-[0.08em]"
              style={{
                color: "var(--color-gold)",
                background: "color-mix(in oklab, var(--color-gold) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)",
              }}
              title="Aurum — earned from Trials and the daily Starters"
            >
              ⚜ {profile?.aurum} aurum
            </span>
          )}
          {(profile?.starterStreak?.count ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-ui font-medium text-xs tracking-[0.08em]"
              style={{
                color: "var(--color-crimson)",
                background: "color-mix(in oklab, var(--color-crimson) 8%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-crimson) 25%, transparent)",
              }}
              title="Consecutive days of Starters for Ten"
            >
              <Flame className="h-3.5 w-3.5" /> {profile?.starterStreak?.count}-day streak
            </span>
          )}
        </div>
      )}
        <ul className="glass rounded-2xl p-2 xl:grid xl:grid-cols-2 xl:gap-x-6">
          {ARCADE.map(renderModule)}
        </ul>
      </section>
    </StudentShell>
  );
}
