import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  School, GraduationCap, Eye, FlaskConical, Atom, Sparkles,
  BookMarked, ScanLine, WifiOff, KeyRound, ShieldCheck, ClipboardList,
  LineChart, Users, ArrowRight, CheckCircle2, Camera,
} from "lucide-react";
import { FloatingNav } from "../components/FloatingNav";

/**
 * For Schools — the adoption pitch page. Public, marketing-voiced: why a
 * school should bring AlcheMix into its chemistry classrooms. Every claim
 * here must stay true to the shipped surface in SCOPE.md — no invented
 * numbers, no testimonials, no pricing.
 */
export const Route = createFileRoute("/schools")({
  component: SchoolsPage,
});

// ── Scroll-reveal (same pattern as /about) ──────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
      }}
    >
      {children}
    </div>
  );
}

// ── The case for adoption — three arguments a coordinator actually weighs ──
const PILLARS = [
  {
    color: "var(--color-wraith)",
    icon: <GraduationCap className="h-6 w-6" />,
    title: "Students who want to open it",
    body: "Chemistry wrapped in an alchemy narrative — a Grimoire of physical AR trading cards, forging, trials, and a craft ladder from Novice to Archalchemist. The theme is the hook; underneath it, every value is textbook-accurate chemistry.",
    points: ["Physical AR card set anchors the digital work", "Real Ka values, bond angles, half-lives — never simplified into wrongness", "Wrong answers get warm teaching moments, not punishment"],
  },
  {
    color: "var(--color-gold)",
    icon: <Eye className="h-6 w-6" />,
    title: "Teachers who can see everything",
    body: "A full educator console: classes with join codes, a five-topic gradebook, a quiz builder seeded from the curriculum, mission configurator, and a performance tab with per-student drill-downs and a struggling-concepts radar.",
    points: ["Practice counters are engagement signals — grades stay teacher-entered", "Live class results on every authored quiz", "Scavenger-hunt photo evidence lands in a review inbox"],
  },
  {
    color: "var(--color-emerald-elixir)",
    icon: <School className="h-6 w-6" />,
    title: "IT that barely notices",
    body: "AlcheMix is a web app and installable PWA — nothing to deploy to device carts, no native app store approvals. Desktop browsers carry deep study; students' phones become AR capture companions.",
    points: ["Runs in the browser on existing school hardware", "Offline service worker keeps study surfaces available", "Admin console verifies teacher identities before console access"],
  },
];

// ── What the school gets — the concrete surface ─────────────────────────────
const FEATURES = [
  { icon: <FlaskConical className="h-5 w-5" />, color: "var(--color-wraith)", title: "25+ learning modules", desc: "From lab safety and atomic structure to titration, equilibrium, electrochemistry, and radioactive decay — each with trials and persisted progress." },
  { icon: <Atom className="h-5 w-5" />, color: "var(--color-gold)", title: "Full periodic table", desc: "All 118 elements with four analytical lenses: families, state vs temperature, trend heat-maps, and a discovery timeline." },
  { icon: <BookMarked className="h-5 w-5" />, color: "var(--color-emerald-elixir)", title: "The Grimoire card set", desc: "12 physical base-element cards, AR-scannable. Combining them in the app runs a real compound engine — noble gases politely refuse." },
  { icon: <Camera className="h-5 w-5" />, color: "var(--color-amber-scry)", title: "AI scavenger hunts", desc: "Students photograph real-world chemistry; AI vision verifies the find and teachers review the evidence. Works with or without an AI key." },
  { icon: <ClipboardList className="h-5 w-5" />, color: "var(--color-wraith)", title: "Assignments & quizzes", desc: "Teachers author quizzes and missions from a curriculum-seeded builder; students receive them in their own assignments view." },
  { icon: <LineChart className="h-5 w-5" />, color: "var(--color-gold)", title: "Class analytics", desc: "A class performance matrix, per-student drill-downs, and a struggling-concepts radar — spot who needs help before the exam does." },
];

// ── Rollout — the honest four steps ─────────────────────────────────────────
const ROLLOUT = [
  { n: "01", color: "var(--color-wraith)", icon: <ShieldCheck className="h-5 w-5" />, title: "Verify your educators", body: "Teachers sign in through the Educator's Door; the admin console confirms teacher identity before console access." },
  { n: "02", color: "var(--color-gold)", icon: <Users className="h-5 w-5" />, title: "Create classes", body: "Each class gets a short join code — the school code students will use." },
  { n: "03", color: "var(--color-amber-scry)", icon: <GraduationCap className="h-5 w-5" />, title: "Students join at signup", body: "Students enter the code during registration and land on the class roster automatically. Card sets go out with the welcome." },
  { n: "04", color: "var(--color-emerald-elixir)", icon: <Eye className="h-5 w-5" />, title: "Teach with visibility", body: "Assign missions and quizzes, watch the performance tab, and let the Grimoire keep students coming back." },
];

// ── Practicalities — the objections, answered plainly ───────────────────────
const PRACTICAL = [
  { icon: <ScanLine className="h-5 w-5" />, title: "Works on what you have", body: "Website for desktop study, installable PWA for phones. No native apps, no MDM deployment, no minimum device spec beyond a modern browser." },
  { icon: <WifiOff className="h-5 w-5" />, title: "Survives bad Wi-Fi", body: "A conservative offline service worker keeps core study surfaces usable when the connection drops mid-lesson." },
  { icon: <KeyRound className="h-5 w-5" />, title: "No mandatory AI bill", body: "Every AI feature has a deterministic keyless fallback. AlcheMix teaches at full strength with zero API spend; an AI key enriches, never gates." },
  { icon: <CheckCircle2 className="h-5 w-5" />, title: "Engagement is not grading", body: "Game elements live in a separate Arcade, away from the learning path. Practice counters never masquerade as marks — grading stays in teacher hands." },
];

function SchoolsPage() {
  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <FloatingNav />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden pt-28 pb-16">
        <div
          className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 100% 70% at 50% 55%, color-mix(in oklab, var(--color-gold) 14%, transparent), color-mix(in oklab, var(--color-wraith) 12%, transparent) 45%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-gold">
              <School className="h-3 w-3" /> For Schools
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-display mb-6 text-5xl leading-tight md:text-7xl">
              The chemistry class<br />
              <span className="aurora-gradient animate-aurora">students ask to open.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-parchment">
              AlcheMix pairs a physical AR card set with a complete digital chemistry
              curriculum — real values, warm pedagogy, and a teacher console that shows
              you exactly where every student stands. Here is the case for bringing it
              to your school.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/educator" className="btn-arcane btn-arcane-hover">
                <Eye className="h-4 w-4" /> Enter the Educator's Door
              </Link>
              <Link to="/elements" className="btn-ghost-arcane">
                <Atom className="h-4 w-4" /> Try It — No Account Needed
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── THE CASE — three pillars ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Case For AlcheMix</p>
            <h2 className="font-display text-4xl md:text-5xl">Three people say yes to an ed-tech pilot.</h2>
            <p className="mx-auto mt-4 max-w-2xl font-serif text-parchment/80">
              The student, the teacher, and the IT coordinator. AlcheMix was built to convince all three.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ color, icon, title, body, points }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div
                  className="group flex h-full flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                    border: `1px solid color-mix(in oklab, ${color} 24%, transparent)`,
                    boxShadow: `0 0 40px -20px color-mix(in oklab, ${color} 35%, transparent)`,
                  }}
                >
                  <div
                    className="animate-breathing mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: `color-mix(in oklab, ${color} 15%, transparent)`,
                      border: `1.5px solid color-mix(in oklab, ${color} 45%, transparent)`,
                      color,
                    }}
                  >
                    {icon}
                  </div>
                  <h3 className="font-display mb-3 text-xl">{title}</h3>
                  <p className="mb-5 flex-1 text-sm leading-relaxed text-parchment">{body}</p>
                  <ul className="space-y-2.5">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-parchment/85">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOUR SCHOOL GETS ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Inventory</p>
            <h2 className="font-display text-4xl md:text-5xl">What your school gets on day one.</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon, color, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 100}>
                <div
                  className="flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span className="mb-4" style={{ color }}>{icon}</span>
                  <h3 className="font-display mb-2 text-lg">{title}</h3>
                  <p className="text-sm leading-relaxed text-parchment">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLLOUT — four steps ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="mb-16 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Rollout</p>
            <h2 className="font-display text-4xl md:text-5xl">From sign-off to first lesson.</h2>
          </Reveal>
          <div className="relative">
            <div
              className="absolute left-[10%] right-[10%] top-12 hidden h-px md:block"
              style={{ background: "linear-gradient(90deg, var(--color-wraith), var(--color-gold), var(--color-amber-scry), var(--color-emerald-elixir))" }}
            />
            <div className="grid gap-6 md:grid-cols-4">
              {ROLLOUT.map(({ n, color, icon, title, body }, i) => (
                <Reveal key={n} delay={i * 100}>
                  <div className="relative pt-2 text-center">
                    <div className="mb-4 flex justify-center">
                      <div
                        className="animate-breathing z-10 flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`,
                          boxShadow: `0 0 20px -4px color-mix(in oklab, ${color} 45%, transparent)`,
                          color,
                        }}
                      >
                        {icon}
                      </div>
                    </div>
                    <div className="font-display mb-1 text-xs uppercase tracking-[0.3em]" style={{ color }}>{n}</div>
                    <h3 className="font-display mb-2 text-base">{title}</h3>
                    <p className="text-xs leading-relaxed text-parchment">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRACTICALITIES ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Fine Print, Upfront</p>
            <h2 className="font-display text-4xl md:text-5xl">Built for real classrooms.</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {PRACTICAL.map(({ icon, title, body }, i) => (
              <Reveal key={title} delay={(i % 2) * 100}>
                <div
                  className="flex h-full items-start gap-4 rounded-2xl p-6"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-teal"
                    style={{
                      background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
                    }}
                  >
                    {icon}
                  </span>
                  <div>
                    <h3 className="font-display mb-1.5 text-base">{title}</h3>
                    <p className="text-sm leading-relaxed text-parchment">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREDIBILITY STRIP ── */}
      <section className="relative z-10 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl sm:grid-cols-2 md:grid-cols-4"
            style={{ border: "1px solid color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}
          >
            {[
              { stat: "25+", label: "Learning modules", sub: "Safety to electrochemistry" },
              { stat: "118", label: "Elements covered", sub: "Four analytical lenses" },
              { stat: "12", label: "Physical AR cards", sub: "The base-element Grimoire" },
              { stat: "0", label: "Native apps to deploy", sub: "Browser + installable PWA" },
            ].map(({ stat, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 px-6 py-10 text-center"
                style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}
              >
                <p className="font-display text-3xl text-wraith">{stat}</p>
                <p className="font-display text-sm text-spectral">{label}</p>
                <p className="text-xs text-parchment/60">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 overflow-hidden py-28">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--color-gold) 14%, transparent), transparent 60%)" }}
        />
        <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="relative mb-8 inline-block">
            <div className="animate-breathing absolute inset-0 rounded-full opacity-40 blur-xl" style={{ background: "var(--color-gold)" }} />
            <Sparkles className="animate-float-slow relative h-12 w-12 text-gold" />
          </div>
          <h2 className="font-display mb-6 text-4xl md:text-5xl">
            Bring the Grimoire<br />
            <span className="aurora-gradient animate-aurora">to your school.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl leading-relaxed text-parchment">
            Start where your teachers will: the Educator's Door. Create a class, share
            the code, and see the console for yourself — or wander the Element Explorer
            first, no account required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/educator" className="btn-arcane btn-arcane-hover">
              <Eye className="h-4 w-4" /> Educator's Door
            </Link>
            <Link to="/elements" className="btn-ghost-arcane">
              <Atom className="h-4 w-4" /> Explore the Elements
            </Link>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-parchment/50">
            Free to explore · Teacher verification protects the console
          </p>
        </Reveal>
      </section>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs uppercase tracking-[0.25em] text-parchment/60">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
