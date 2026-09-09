import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Atom,
  BookMarked,
  Scale,
  Gauge,
  ClipboardList,
  Grid3x3,
  GraduationCap,
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
import { useUserProfile, type Mastery, type StudentProfile } from "../lib/profile";
import { CRAFTS, TIERS, computeCraft, syncCraft } from "../lib/craft";
import { useHiddenModules } from "../lib/moduleVisibility";
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
  /** Legacy accent colour — kept in the data, no longer used for icons (the grid is monochrome). */
  color: string;
  to: string;
  status: ModuleStatus;
  /** Chapter label the card is grouped under in the hub grid. */
  group: string;
  arOnly?: boolean;
}

/** Chapter labels for the learning grid, in reading order. */
const MODULE_GROUPS = [
  "The Bench",
  "Foundations",
  "The Study",
  "Molecules & Reactions",
  "Advanced Labs",
  "Prove Your Craft",
  "Field Work",
];

// Every module, grouped by chapter in the Grimoire Guide's recommended order
// (bench first, then foundations → theory → reactions → labs → proving it).
const MODULES: ModuleRow[] = [
  // ── The Bench ──
  {
    icon: BookMarked,
    title: "Grimoire",
    desc: "Your card collection — every card you've scanned and forged.",
    color: "var(--color-gold)",
    to: "/cards",
    status: "live",
    group: "The Bench",
  },
  {
    icon: Compass,
    title: "The Guide",
    desc: "The learning path — what to study first, and where you are.",
    color: "var(--color-emerald-elixir)",
    to: "/guide",
    status: "live",
    group: "The Bench",
  },
  {
    icon: Flame,
    title: "Starters for Ten",
    desc: "The daily ritual — ten quick questions, keep your streak alight.",
    color: "var(--color-gold)",
    to: "/starters",
    status: "live",
    group: "The Bench",
  },
  {
    icon: ListChecks,
    title: "Assignments",
    desc: "Quizzes and missions set by your teacher.",
    color: "var(--color-wraith)",
    to: "/assignments",
    status: "live",
    group: "The Bench",
  },
  // ── Foundations ──
  {
    icon: ShieldAlert,
    title: "Lab Safety",
    desc: "Hazard symbols & apparatus — know before you touch.",
    color: "var(--color-crimson)",
    to: "/lab-safety",
    status: "live",
    group: "Foundations",
  },
  {
    icon: Atom,
    title: "Atomic Builder",
    desc: "Forge atoms from protons, neutrons & electrons.",
    color: "var(--color-emerald-elixir)",
    to: "/atomic-builder",
    status: "live",
    group: "Foundations",
  },
  {
    icon: Grid3x3,
    title: "Periodic Table",
    desc: "Study each element — uses, examples & 3D.",
    color: "var(--color-wraith)",
    to: "/periodic-table",
    status: "live",
    group: "Foundations",
  },
  {
    icon: Thermometer,
    title: "States of Matter",
    desc: "Heat, cool and melt real substances — watch the particles change.",
    color: "var(--color-wraith)",
    to: "/states",
    status: "live",
    group: "Foundations",
  },
  // ── The Study ──
  {
    icon: Brain,
    title: "The Study",
    desc: "Guided learn → practise → assess paths, with spaced review.",
    color: "var(--color-wraith)",
    to: "/study",
    status: "live",
    group: "The Study",
  },
  // ── Molecules & Reactions ──
  {
    icon: Shapes,
    title: "Molecule Shapes",
    desc: "Real 3D VSEPR geometry — bent, tetrahedral & more.",
    color: "var(--color-emerald-elixir)",
    to: "/molecules",
    status: "live",
    group: "Molecules & Reactions",
  },
  {
    icon: Magnet,
    title: "Invisible Bonds",
    desc: "Intermolecular forces — watch stronger attractions boil later.",
    color: "var(--color-emerald-elixir)",
    to: "/forces",
    status: "live",
    group: "Molecules & Reactions",
  },
  {
    icon: Atom,
    title: "Reaction Theatre",
    desc: "Watch bonds break and reform in a balanced equation.",
    color: "var(--color-gold)",
    to: "/reactions",
    status: "live",
    group: "Molecules & Reactions",
  },
  {
    icon: Scale,
    title: "Equation Balancer",
    desc: "Balance equations & learn conservation of mass.",
    color: "var(--color-emerald-elixir)",
    to: "/equation-balancer",
    status: "live",
    group: "Molecules & Reactions",
  },
  {
    icon: FlaskConical,
    title: "Compound Codex",
    desc: "Forge real compounds from your elements — fill the encyclopedia.",
    color: "var(--color-gold)",
    to: "/codex",
    status: "live",
    group: "Molecules & Reactions",
  },
  // ── Advanced Labs ──
  {
    icon: Gauge,
    title: "Gas Laws Simulator",
    desc: "Explore PV = nRT with live particles.",
    color: "var(--color-wraith)",
    to: "/gas-laws",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Droplets,
    title: "The Elixir Bench",
    desc: "Solutions & molarity — mix, dilute, saturate real solutes.",
    color: "var(--color-emerald-elixir)",
    to: "/solutions",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Coffee,
    title: "Cauldron of Heat",
    desc: "Calorimetry — measure the heat reactions give and take.",
    color: "var(--color-crimson)",
    to: "/thermo",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Activity,
    title: "Reaction Rates",
    desc: "Collision theory live — heat, crowd, crush and catalyse.",
    color: "var(--color-gold)",
    to: "/rates",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: RefreshCw,
    title: "Equilibrium",
    desc: "Le Chatelier you can poke — stress the balance, watch it shift.",
    color: "var(--color-wraith)",
    to: "/equilibrium",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Zap,
    title: "The Voltaic Forge",
    desc: "Build galvanic cells from real metals and read the voltage.",
    color: "var(--color-gold)",
    to: "/electro",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Beaker,
    title: "Titration Lab",
    desc: "Titrate acid with base and read the pH curve.",
    color: "var(--color-wraith)",
    to: "/titration",
    status: "live",
    group: "Advanced Labs",
  },
  {
    icon: Radiation,
    title: "Radioactive Decay",
    desc: "Isotopes, half-life & decay, one nucleus at a time.",
    color: "var(--color-emerald-elixir)",
    to: "/decay",
    status: "live",
    group: "Advanced Labs",
  },
  // ── Prove Your Craft ──
  {
    icon: ClipboardList,
    title: "3D Visual Quiz",
    desc: "Identify elements from rotating atoms.",
    color: "var(--color-emerald-elixir)",
    to: "/quiz",
    status: "live",
    group: "Prove Your Craft",
  },
  // ── Field Work ──
  {
    icon: ScanLine,
    title: "AR Scanner",
    desc: "Scan the element card and summon its 3D crystal in AR.",
    color: "var(--color-emerald-elixir)",
    to: "/scanner",
    status: "live",
    group: "Field Work",
    arOnly: true,
  },
  {
    icon: ScanSearch,
    title: "AI Scavenger Hunt",
    desc: "Live camera scan — green trackers lock onto your element.",
    color: "var(--color-gold)",
    to: "/scavenger",
    status: "live",
    group: "Field Work",
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
    group: "The Arcade",
  },
  {
    icon: Users,
    title: "Class Duels",
    desc: "Challenge a classmate — duels resolve whenever each of you visits.",
    color: "var(--color-wraith)",
    to: "/duels",
    status: "live",
    group: "The Arcade",
  },
  {
    icon: Crosshair,
    title: "Placement Trials",
    desc: "Know the table by heart — place each element in its true cell.",
    color: "var(--color-emerald-elixir)",
    to: "/table-game",
    status: "live",
    group: "The Arcade",
  },
  {
    icon: Trophy,
    title: "Hall of Records",
    desc: "Your class leaderboards — stars, duels, compounds, streaks.",
    color: "var(--color-gold)",
    to: "/leaderboard",
    status: "live",
    group: "The Arcade",
  },
  {
    icon: Store,
    title: "The Emporium",
    desc: "Spend your aurum — frames, titles and charms.",
    color: "var(--color-gold)",
    to: "/shop",
    status: "live",
    group: "The Arcade",
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

/** The one label recipe used on this page. */
const LABEL = "text-[11px] uppercase tracking-[0.14em] text-parchment/50";

/** Centred chapter rule — hairlines meeting a small gilded diamond, the
 *  fantasy-artifact divider that frames each section like a card heading. */
function SectionRule({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 mb-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
      <span className="text-[8px] leading-none text-gold/60">◆</span>
      <h2 className={LABEL}>{children}</h2>
      <span className="text-[8px] leading-none text-gold/60">◆</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
    </div>
  );
}

function ClassRow({
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
      <div className="glass flex items-center gap-3.5 rounded-2xl p-5 lg:w-80 lg:flex-shrink-0">
        <span className="orb-rune h-11 w-11 text-gold">
          <Users className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className={LABEL}>Your class</p>
          <p className="mt-0.5 truncate font-ui text-base font-semibold text-spectral">
            {profile.className}
          </p>
          <p className="mt-0.5 font-serif text-sm text-parchment/70">
            Your teacher sees your progress here.
          </p>
        </div>
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
    <div className="glass flex flex-col justify-center gap-3 rounded-2xl p-5 lg:w-80 lg:flex-shrink-0">
      <div className="flex items-center gap-3.5">
        <span className="orb-rune h-11 w-11 text-gold">
          <Users className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className={LABEL}>Join your class</p>
          <p className="mt-0.5 font-serif text-sm text-parchment/70">
            Got a code from your teacher?
          </p>
        </div>
      </div>
      <form onSubmit={join} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          aria-label="Class code"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-center font-ui text-sm font-semibold tracking-[0.3em] uppercase text-spectral placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-parchment/35 outline-none transition-colors focus:border-emerald-elixir"
          style={{
            background: "color-mix(in oklab, var(--color-mist) 60%, transparent)",
          }}
        />
        <button
          type="submit"
          disabled={joining || code.length < 4}
          className="btn-arcane btn-arcane-hover flex-shrink-0 text-xs disabled:opacity-60"
        >
          Join
        </button>
      </form>
      {error && <span className="text-xs text-crimson">{error}</span>}
    </div>
  );
}

/**
 * The Craft — tiered mastery ladder. Fills only on real proof (trial ≥2★,
 * Study topics done, compounds forged); gold diamonds mark each rank.
 */
function CraftBar({ profile }: { profile: StudentProfile }) {
  const { mastered, count, tier } = computeCraft(profile);
  const total = CRAFTS.length;
  const cur = TIERS[tier];
  const next = tier + 1 < TIERS.length ? TIERS[tier + 1] : null;
  const masteredLabels = CRAFTS.filter((c) => mastered.includes(c.id)).map((c) => c.label);

  return (
    <div className="glass mb-6 rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="orb-rune h-11 w-11 flex-shrink-0 text-gold">
          <FlaskConical className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={LABEL}>Your craft</p>
          <p className="mt-0.5 font-ui text-base font-semibold text-gold">{cur.name}</p>
        </div>
        <span
          className="flex-shrink-0 font-ui text-sm font-medium text-parchment/70"
          title={
            masteredLabels.length > 0
              ? `Mastered: ${masteredLabels.join(", ")}`
              : "Pass a module's trial with 2★ or more to master it"
          }
        >
          <span className="text-spectral">{count}</span>/{total} crafts mastered
        </span>
      </div>

      {/* The ladder — teal fill, a gold diamond at every rank threshold. */}
      <div className="relative mt-4 mb-1 h-2">
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklab, var(--color-parchment) 22%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(count / total) * 100}%`,
              background: "var(--color-emerald-elixir)",
            }}
          />
        </div>
        {TIERS.slice(1).map((t) => {
          const reached = count >= t.at;
          return (
            <span
              key={t.name}
              title={`${t.name} — ${t.at} craft${t.at === 1 ? "" : "s"}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] transition-colors duration-500"
              style={{
                left: `${(t.at / total) * 100}%`,
                background: reached
                  ? "var(--color-gold)"
                  : "color-mix(in oklab, var(--color-parchment) 35%, var(--color-mist))",
                boxShadow: reached
                  ? "0 0 8px color-mix(in oklab, var(--color-gold) 55%, transparent)"
                  : "none",
              }}
            />
          );
        })}
      </div>

      <p className="mt-2.5 font-serif text-sm text-parchment/70">
        {next
          ? `Master ${next.at - count} more ${next.at - count === 1 ? "craft" : "crafts"} to become ${next.name}. Crafts are earned by passing a module's trial with 2★ or better.`
          : "The highest rank — every craft in the book, mastered."}
      </p>
    </div>
  );
}

function StudentHub() {
  const { uid, profile } = useUserProfile();
  const platform = usePlatform();
  // Curated module visibility — hides the same modules the nav hides.
  const { hidden: hiddenModules } = useHiddenModules();

  // Backend: persist the derived craft ladder onto users/{uid}.craft whenever
  // the underlying proof (trials, study, compounds) changes. Idempotent.
  useEffect(() => {
    syncCraft(uid, profile);
  }, [uid, profile]);
  const nextStep = nextGuideStep(profile);
  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Apprentice";
  const grades = profile?.grades ?? {};
  const mastery = profile?.mastery ?? {};
  const gradeEntries = Object.entries(grades);
  const masteryEntries = Object.entries(mastery);
  const hasProgress = gradeEntries.length > 0 || masteryEntries.length > 0;
  const badges = (profile?.badges ?? []).filter((b) => BADGE_META[b]);

  // Quiet inline stats for the header — anything at zero stays hidden.
  const streak = profile?.starterStreak?.count ?? 0;
  const aurum = profile?.aurum ?? 0;
  const cardsCollected = profile?.grimoire?.length ?? 0;
  const stats: { key: string; node: React.ReactNode }[] = [];
  if (streak > 0)
    stats.push({
      key: "streak",
      node: (
        <span
          className="inline-flex items-center gap-1"
          title="Consecutive days of Starters for Ten"
        >
          <Flame className="h-3.5 w-3.5" />
          {streak}-day streak
        </span>
      ),
    });
  if (aurum > 0)
    stats.push({
      key: "aurum",
      node: <span title="Aurum — earned from Trials and the daily Starters">⚜ {aurum}</span>,
    });
  if (cardsCollected > 0)
    stats.push({
      key: "cards",
      node: (
        <span title="Cards claimed into your Grimoire">
          {cardsCollected} {cardsCollected === 1 ? "card" : "cards"} collected
        </span>
      ),
    });

  const renderCard = (m: ModuleRow) => {
    const live = m.status === "live";
    const recommended = nextStep?.to === m.to;
    const mobileOnly = m.arOnly && platform.ready && !platform.arCapable;
    const card = (
      <div className="glass relative flex h-full flex-col items-center rounded-2xl p-4 pt-5 text-center">
        {recommended && (
          <span
            className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-emerald-elixir"
            title="Up next on your Guide path"
          />
        )}
        {!live && <span className={`absolute left-3 top-3 ${LABEL}`}>{STATUS_LABEL[m.status]}</span>}
        <span className="emblem-arcane h-11 w-11 flex-shrink-0">
          <m.icon
            className={`relative h-4.5 w-4.5 transition-colors ${
              recommended ? "text-emerald-elixir" : "text-gold"
            }`}
          />
        </span>
        <div className="mt-3 font-serif text-[15px] font-semibold tracking-wide text-spectral">
          {m.title}
        </div>
        <p className="mt-1 font-serif text-xs italic leading-snug text-parchment/70 line-clamp-2">
          {m.desc}
        </p>
        {mobileOnly && <p className="mt-2 text-xs text-parchment/50">On mobile</p>}
      </div>
    );
    return live ? (
      <Link key={m.title} to={m.to as any} className="group block">
        {card}
      </Link>
    ) : (
      <div key={m.title} className="cursor-not-allowed opacity-55" title="Needs AI setup">
        {card}
      </div>
    );
  };

  const grid = (rows: ModuleRow[]) => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rows.map(renderCard)}
    </div>
  );

  return (
    <StudentShell title="Home">
      <PageHeader
        eyebrow="Apprentice's Bench"
        title={`Welcome back, ${name}.`}
        subtitle="Practise a module, then check back here for the scores and feedback your teacher posts."
        icon={GraduationCap}
        right={
          stats.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-parchment/70">
              {stats.map((s, i) => (
                <Fragment key={s.key}>
                  {i > 0 && <span className="text-parchment/30">·</span>}
                  {s.node}
                </Fragment>
              ))}
            </div>
          ) : undefined
        }
      />

      {/* Top band — the continue card (the page's one strong accent) beside
          the class card, one balanced row on wide screens. */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {nextStep ? (
        <Link
          to={nextStep.to as any}
          data-tour="continue"
          className="group glass relative flex flex-1 items-center gap-4 overflow-hidden rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
        >
          {/* Teal wash bleeding in from the left edge + the spine marker,
              matching the rail's current-chapter signature. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-48"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent), transparent)",
            }}
          />
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-12 w-0.5 -translate-y-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, var(--color-emerald-elixir), var(--color-wraith))",
            }}
          />
          <span className="orb-rune orb-rune-active h-12 w-12 text-emerald-elixir">
            <nextStep.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={LABEL}>Continue your path</p>
            <h2 className="mt-0.5 font-ui text-base font-semibold text-spectral">
              {nextStep.title}
            </h2>
            <p className="mt-0.5 font-serif text-sm text-parchment/70">{nextStep.why}</p>
          </div>
          <span className="flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-elixir">
            Open
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </Link>
      ) : (
        <div className="glass flex-1 rounded-2xl p-5">
          <p className={LABEL}>Path complete</p>
          <h2 className="mt-0.5 font-ui text-base font-semibold text-spectral">
            You've walked the whole Guide, {name}.
          </h2>
          <p className="mt-0.5 font-serif text-sm text-parchment/70">
            Every step is done — keep your streak alight, or revisit any module below.
          </p>
        </div>
      )}

      {/* Class enrolment card — the row's quieter right half. */}
      <ClassRow uid={uid} profile={profile} />
      </div>

      {/* The Craft — tiered mastery ladder over the learning modules. */}
      {profile && <CraftBar profile={profile} />}

      {/* Mobile companion notice — capture tools live here; deep study is on the website. */}
      {platform.ready && platform.arCapable && (
        <p className="mb-2 flex items-center gap-2 text-sm text-parchment/70">
          <ScanLine className="h-4 w-4 flex-shrink-0 text-gold" />
          <span>
            You're on the <span className="font-ui font-medium text-spectral">mobile companion</span>{" "}
            — AR Scanner and Scavenger Hunt live here; open AlcheMix on a computer for deep study.
          </span>
        </p>
      )}

      {/* Learning modules — monochrome card grid under chapter labels. */}
      <section>
        {MODULE_GROUPS.map((group) => {
          const rows = MODULES.filter((m) => m.group === group && !hiddenModules.has(m.to));
          if (rows.length === 0) return null;
          return (
            <Fragment key={group}>
              <SectionRule>{group}</SectionRule>
              {grid(rows)}
            </Fragment>
          );
        })}
      </section>

      {/* The Arcade — games & rewards, kept apart from the learning path. */}
      <section className="mt-6">
        <SectionRule>The Arcade — games & rewards</SectionRule>
        {grid(ARCADE)}
      </section>

      {/* My Progress — populated by the teacher. */}
      <section className="mt-6 mb-4">
        <SectionRule>My Progress</SectionRule>

        {/* Badges earned in the app (e.g. from the AR Scanner's quick check). */}
        {badges.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {badges.map((b) => (
              <span
                key={b}
                title={BADGE_META[b].desc}
                className="inline-flex items-center gap-1 text-xs text-gold"
              >
                <Award className="h-3.5 w-3.5" /> {BADGE_META[b].label}
              </span>
            ))}
          </div>
        )}

        {!hasProgress ? (
          <p className="text-sm text-parchment/60">
            Your teacher hasn't posted scores yet — they'll appear here.
          </p>
        ) : (
          <div className="glass rounded-2xl px-5 py-1">
            {gradeEntries.map(([topic, g], i) => {
              const pct = g.outOf > 0 ? Math.round((g.score / g.outOf) * 100) : 0;
              return (
                <div
                  key={topic}
                  className={`flex items-center gap-4 py-3 ${i > 0 ? "border-t" : ""}`}
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-ui text-sm font-medium capitalize">{topic}</div>
                    {g.feedback && (
                      <div className="truncate text-xs text-parchment/60">{g.feedback}</div>
                    )}
                  </div>
                  {mastery[topic] && (
                    <span
                      className="text-[11px] uppercase tracking-[0.14em]"
                      style={{ color: MASTERY_META[mastery[topic]].color }}
                    >
                      {MASTERY_META[mastery[topic]].label}
                    </span>
                  )}
                  <span className="flex-shrink-0 font-ui text-sm font-medium text-teal">
                    {g.score}/{g.outOf} <span className="text-parchment/50">({pct}%)</span>
                  </span>
                </div>
              );
            })}
            {/* topics with mastery but no numeric grade */}
            {masteryEntries
              .filter(([t]) => !grades[t])
              .map(([topic, m], i) => (
                <div
                  key={topic}
                  className={`flex items-center gap-4 py-3 ${
                    i > 0 || gradeEntries.length > 0 ? "border-t" : ""
                  }`}
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex-1 font-ui text-sm font-medium capitalize">{topic}</div>
                  <span
                    className="text-[11px] uppercase tracking-[0.14em]"
                    style={{ color: MASTERY_META[m].color }}
                  >
                    {MASTERY_META[m].label}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </StudentShell>
  );
}
