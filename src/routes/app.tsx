import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import {
  Atom,
  BookMarked,
  Scale,
  Gauge,
  ClipboardList,
  Grid3x3,
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
      <p className="mb-2 flex items-center gap-2 text-sm text-parchment/70">
        <Users className="h-4 w-4 flex-shrink-0" />
        <span>
          Enrolled in <span className="font-ui font-medium text-spectral">{profile.className}</span>
        </span>
      </p>
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
    <form onSubmit={join} className="mb-2 flex flex-wrap items-center gap-3">
      <span className="text-sm text-parchment/70">Have a class code from your teacher?</span>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="6-char code"
        maxLength={6}
        className="w-32 rounded-lg px-3 py-1.5 text-sm tracking-[0.14em] uppercase text-spectral placeholder:text-parchment/40 placeholder:tracking-normal outline-none"
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
        Join
      </button>
      {error && <span className="text-xs text-crimson">{error}</span>}
    </form>
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
      <div className="card-arcane glass relative flex h-full flex-col items-center rounded-2xl p-4 pt-5 text-center">
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
      {/* ── Hero — the immersive scene: wordmark over the scrying orb,
          the apprentice's own cards drifting around it (ESOTERRA-style). ── */}
      <section className="relative mb-16 flex min-h-[calc(100svh-8.5rem)] flex-col items-center justify-center overflow-hidden text-center">
        {/* deep violet scene glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-wraith) 38%, transparent), transparent 65%)",
          }}
        />

        {/* the scrying orb — the cauldron scene held in a sphere behind the text */}
        <div
          className="pointer-events-none absolute left-1/2 top-[46%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full md:h-80 md:w-80"
          style={{
            boxShadow:
              "0 0 90px -8px color-mix(in oklab, var(--color-wraith) 70%, transparent), inset 0 0 50px rgb(0 0 0 / 0.45)",
          }}
        >
          <img
            src="/images/alchemix-hero-banner.png"
            alt=""
            className="h-full w-full object-cover object-[47%_48%] opacity-90"
          />
        </div>

        {/* drifting cards from the apprentice's own deck */}
        {[
          { src: "/image-trigger/image-trigger-alchemix.png", cls: "left-[7%] top-[14%] w-20 md:w-28", tilt: "-12deg", delay: "0s" },
          { src: "/image-trigger/image-trigger-helium.png", cls: "right-[8%] top-[10%] w-16 md:w-24", tilt: "10deg", delay: "1.6s" },
          { src: "/other_cards/3rd_card.png", cls: "left-[13%] bottom-[16%] w-16 md:w-24", tilt: "8deg", delay: "3.1s" },
          { src: "/image-trigger/image-trigger-helium.png", cls: "hidden md:block right-[14%] bottom-[20%] w-20", tilt: "-8deg", delay: "0.9s" },
          { src: "/image-trigger/image-trigger-alchemix.png", cls: "hidden lg:block right-[26%] top-[34%] w-14", tilt: "16deg", delay: "2.3s" },
        ].map((c, i) => (
          <img
            key={i}
            src={c.src}
            alt=""
            aria-hidden
            className={`float-drift pointer-events-none absolute rounded-lg opacity-50 ${c.cls}`}
            style={{
              "--tilt": c.tilt,
              animationDelay: c.delay,
              boxShadow: "0 12px 40px -12px rgb(0 0 0 / 0.6)",
            } as CSSProperties}
          />
        ))}

        {/* the wordmark + welcome, floating over the orb */}
        <div className="relative z-10 px-4">
          <h1 className="font-serif text-5xl font-medium uppercase tracking-[0.26em] pl-[0.26em] text-spectral md:text-7xl">
            AlcheMix
          </h1>
          <p className={`${LABEL} mt-3`}>Apprentice's Bench</p>

          <p className="mx-auto mt-28 max-w-md font-serif text-base italic leading-relaxed text-parchment/90 md:mt-40 md:text-lg">
            Welcome back, {name}. The Grimoire lies open — every page you turn explains a
            little more of the world.
          </p>

          {stats.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-parchment/90">
              {stats.map((s, i) => (
                <Fragment key={s.key}>
                  {i > 0 && <span className="text-parchment/40">·</span>}
                  {s.node}
                </Fragment>
              ))}
            </div>
          )}

          {nextStep ? (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={nextStep.to as any}
                className="btn-arcane btn-arcane-hover flex-shrink-0 text-sm"
              >
                Continue your path
              </Link>
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-parchment/90">
                <nextStep.icon className="h-4 w-4 flex-shrink-0 text-emerald-elixir" />
                <span className="truncate">
                  <span className="font-semibold text-spectral">{nextStep.title}</span>
                  <span className="text-parchment/60"> is next</span>
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-7 font-serif text-sm italic text-parchment/90">
              You've walked the whole Guide — keep the streak alight, or revisit any page below.
            </p>
          )}
        </div>

        {/* Scroll cue — the book continues below the fold */}
        <a
          href="#chapters"
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-parchment/60 transition-colors hover:text-spectral"
          aria-label="Scroll to the chapters"
        >
          <span className={LABEL}>The chapters await</span>
          <svg className="h-4 w-4 animate-bounce" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </a>
      </section>

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

      {/* Class enrolment — one slim row. */}
      <ClassRow uid={uid} profile={profile} />

      {/* Learning modules — monochrome card grid under chapter labels. */}
      <section id="chapters" className="scroll-mt-24">
        {MODULE_GROUPS.map((group) => {
          const rows = MODULES.filter((m) => m.group === group);
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
