import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LazyMolecule3D } from "../components/LazyMolecule3D";
import { MiniForge } from "../components/MiniForge";
import { moleculeById } from "../lib/molecules";

const WATER = moleculeById("h2o");

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
    img: "/ui/grimoire-book.png",
    title: "Students who want to open it",
    body: "Chemistry wrapped in an alchemy narrative — a Grimoire of physical AR trading cards, forging, trials, and a craft ladder from Novice to Archalchemist. The theme is the hook; underneath it, every value is textbook-accurate chemistry.",
    points: ["Physical AR card set anchors the digital work", "Real Ka values, bond angles, half-lives — never simplified into wrongness", "Wrong answers get warm teaching moments, not punishment"],
  },
  {
    color: "var(--color-gold)",
    img: "/ui/medal-crystal-ball.png",
    title: "Teachers who can see everything",
    body: "A full educator console: classes with join codes, a five-topic gradebook, a quiz builder seeded from the curriculum, mission configurator, and a performance tab with per-student drill-downs and a struggling-concepts radar.",
    points: ["Practice counters are engagement signals — grades stay teacher-entered", "Live class results on every authored quiz", "Scavenger-hunt photo evidence lands in a review inbox"],
  },
  {
    color: "var(--color-emerald-elixir)",
    img: "/ui/icon-cube.png",
    title: "IT that barely notices",
    body: "AlcheMix is a web app and installable PWA — nothing to deploy to device carts, no native app store approvals. Desktop browsers carry deep study; students' phones become AR capture companions.",
    points: ["Runs in the browser on existing school hardware", "Offline service worker keeps study surfaces available", "Admin console verifies teacher identities before console access"],
  },
];

// ── What the school gets — the concrete surface ─────────────────────────────
const FEATURES = [
  { color: "var(--color-wraith)", img: "/ui/bunsen-burner.png", title: "25+ learning modules", desc: "From lab safety and atomic structure to titration, equilibrium, electrochemistry, and radioactive decay — each with trials and persisted progress." },
  { color: "var(--color-gold)", img: "/ui/icon-periodic.png", title: "Full periodic table", desc: "All 118 elements with four analytical lenses: families, state vs temperature, trend heat-maps, and a discovery timeline." },
  { color: "var(--color-emerald-elixir)", img: "/ui/test-tube-rack.png", title: "The Grimoire card set", desc: "12 physical base-element cards, AR-scannable. Combining them in the app runs a real compound engine — noble gases politely refuse." },
  { color: "var(--color-amber-scry)", img: "/ui/icon-droplet.png", title: "AI scavenger hunts", desc: "Students photograph real-world chemistry; AI vision verifies the find and teachers review the evidence. Works with or without an AI key." },
  { color: "var(--color-wraith)", img: "/ui/scroll-diploma.png", title: "Assignments & quizzes", desc: "Teachers author quizzes and missions from a curriculum-seeded builder; students receive them in their own assignments view." },
  { color: "var(--color-gold)", img: "/ui/mortar-pestle.png", title: "Class analytics", desc: "A class performance matrix, per-student drill-downs, and a struggling-concepts radar — spot who needs help before the exam does." },
];

// ── Rollout — the honest four steps ─────────────────────────────────────────
const ROLLOUT = [
  { n: "01", img: "/ui/check-button.png", color: "var(--color-wraith)", title: "Verify your educators", body: "Teachers are provisioned by the school admin, then sign in through the Educator's Door." },
  { n: "02", img: "/ui/scepter-wand.png", color: "var(--color-gold)", title: "Create classes", body: "Each class gets its own short join code you share with students — a sign-up link autofills it." },
  { n: "03", img: "/ui/arrow-button.png", color: "var(--color-amber-scry)", title: "Students request, you accept", body: "Students enter the code at sign-up (or tap your link); you approve their join request and they're on the roster. Card sets go out with the welcome." },
  { n: "04", img: "/ui/frame-target.png", color: "var(--color-emerald-elixir)", title: "Teach with visibility", body: "Assign missions and quizzes, watch the performance tab, and let the Grimoire keep students coming back." },
];

// ── Practicalities — the objections, answered plainly ───────────────────────
const PRACTICAL = [
  { img: "/ui/beaker-purple.png", title: "Works on what you have", body: "Website for desktop study, installable PWA for phones. No native apps, no MDM deployment, no minimum device spec beyond a modern browser." },
  { img: "/ui/potion-orange.png", title: "Survives bad Wi-Fi", body: "A conservative offline service worker keeps core study surfaces usable when the connection drops mid-lesson." },
  { img: "/ui/flask-teal.png", title: "No mandatory AI bill", body: "Every AI feature has a deterministic keyless fallback. AlcheMix teaches at full strength with zero API spend; an AI key enriches, never gates." },
  { img: "/ui/badge-ingots.png", title: "Engagement is not grading", body: "Game elements live in a separate Arcade, away from the learning path. Practice counters never masquerade as marks — grading stays in teacher hands." },
];

function SchoolsPage() {
  return (
    <div className="grimoire-skin bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <FloatingNav />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden pt-28 pb-16">
        <div
          className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 100% 70% at 50% 55%, color-mix(in oklab, var(--color-gold) 14%, transparent), color-mix(in oklab, var(--color-wraith) 12%, transparent) 45%, transparent 70%)" }}
        />
        {/* Faint alchemy ornaments drifting behind the hero. */}
        <img src="/ui/icon-smoke.png" alt="" aria-hidden className="pointer-events-none absolute left-[6%] top-[14%] z-0 h-56 object-contain opacity-[0.12]" />
        <img src="/ui/frame-parchment.png" alt="" aria-hidden className="pointer-events-none absolute right-[5%] top-[18%] z-0 h-40 object-contain opacity-[0.1]" />
        <img src="/ui/frame-purple-floral.png" alt="" aria-hidden className="pointer-events-none absolute left-[8%] bottom-[10%] z-0 h-36 object-contain opacity-[0.1]" />
        <img src="/ui/frame-ornate.png" alt="" aria-hidden className="pointer-events-none absolute right-[8%] bottom-[14%] z-0 h-32 object-contain opacity-[0.12]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            {/* Nameplate title (public/ui) with the eyebrow set into its plate. */}
            <div className="relative mx-auto mb-8 w-56">
              <img src="/ui/nameplate-gold.png" alt="" aria-hidden className="w-full" />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-[0.3em]" style={{ color: "#3a2a0e" }}>For Schools</span>
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
                Enter the Educator's Door
              </Link>
              <Link to="/elements" className="btn-ghost-arcane">
                Try It — No Account Needed
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SEE THE REAL PRODUCT ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mb-12 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">Not a mockup</p>
            <h2 className="font-display text-4xl md:text-5xl">See the actual product.</h2>
            <p className="mx-auto mt-4 max-w-2xl font-serif text-parchment/80">
              The cards below are the real printed set. The 3D is live, and the forge runs the same
              chemistry engine your students will use — try it right here.
            </p>
          </Reveal>

          {/* Real grimoire cards (theme-paired art from the printed set) */}
          <Reveal className="mb-12 flex flex-wrap items-end justify-center gap-5">
            {[
              { light: "/chronicle/card-hydrogen.webp", dark: "/chronicle/card-hydrogen-dark.webp", alt: "The Hydrogen card", rot: "-6deg" },
              { light: "/chronicle/card-box-open.webp", dark: "/chronicle/card-box-open-dark.webp", alt: "The Grimoire card box, open", rot: "0deg", big: true },
              { light: "/chronicle/card-oxygen.webp", dark: "/chronicle/card-oxygen-dark.webp", alt: "The Oxygen card", rot: "6deg" },
            ].map((c) => (
              <div key={c.alt} className="overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1.5"
                style={{ width: c.big ? 240 : 170, transform: `rotate(${c.rot})`, border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)", boxShadow: "0 22px 46px -22px rgb(0 0 0 / 0.6)" }}>
                <img src={c.light} alt={c.alt} className="w-full dark:hidden" />
                <img src={c.dark} alt="" aria-hidden className="hidden w-full dark:block" />
              </div>
            ))}
          </Reveal>

          {/* Live 3D + live forge */}
          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full overflow-hidden rounded-2xl" style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 38%, transparent)", boxShadow: "0 18px 40px -22px rgb(0 0 0 / 0.55)" }}>
                <div className="relative h-[340px]" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}>
                  {WATER && <LazyMolecule3D molecule={WATER} showLonePairs={false} />}
                  <span className="pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-teal backdrop-blur-sm" style={{ background: "color-mix(in oklab, #000 40%, transparent)" }}>
                    Live 3D · H₂O · drag to rotate
                  </span>
                </div>
                <div className="p-5 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)" }}>
                  <p className="font-serif text-sm text-parchment">Every molecule renders in true 3D — the same view students pull up in AR.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex h-full flex-col rounded-2xl p-6" style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 38%, transparent)", boxShadow: "0 18px 40px -22px rgb(0 0 0 / 0.55)", background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)" }}>
                <p className="mb-4 text-center text-[10px] uppercase tracking-[0.3em] text-gold/80">Try the forge — real engine</p>
                <div className="flex flex-1 items-center">
                  <MiniForge className="w-full" />
                </div>
                <p className="mt-4 border-t border-parchment/15 pt-4 text-center font-serif text-sm text-parchment">
                  Valence, charge and electronegativity — impossible mixes get the Alchemist's counsel, never a wrong answer.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WHAT THE TEACHER SEES (console preview) ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="mb-10 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">From the front of the room</p>
            <h2 className="font-display text-4xl md:text-5xl">What the teacher sees.</h2>
            <p className="mx-auto mt-4 max-w-2xl font-serif text-parchment/80">
              A real educator console: classes with join codes, a five-topic gradebook, live quiz
              results, and a struggling-concepts view — exportable to CSV. (Illustrative preview.)
            </p>
          </Reveal>

          <Reveal>
            <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)", boxShadow: "0 22px 50px -24px rgb(0 0 0 / 0.6)", background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)" }}>
              {/* window chrome */}
              <div className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--color-border)" }}>
                <span className="font-display text-sm tracking-[0.1em]">AlcheMix · Educator Console</span>
                <span className="ml-auto flex gap-1.5">
                  {["Gradebook", "Performance", "Evidence"].map((t, i) => (
                    <span key={t} className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
                      style={i === 0 ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)", opacity: 0.6 }}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>

              {/* gradebook table */}
              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-parchment/55">
                      <th className="pb-2 pr-4 font-medium">Student</th>
                      {["Atomic Structure", "Bonding", "Gas Laws"].map((t) => <th key={t} className="pb-2 px-3 font-medium">{t}</th>)}
                      <th className="pb-2 pl-3 font-medium">Mastery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: "A. Reyes", g: [92, 88, 80], m: "Mastered", c: "var(--color-emerald-elixir)" },
                      { n: "J. Santos", g: [78, 71, 64], m: "Proficient", c: "var(--color-gold)" },
                      { n: "M. Cruz", g: [61, 52, 0], m: "Developing", c: "var(--color-amber-scry)" },
                      { n: "L. Dizon", g: [95, 90, 86], m: "Mastered", c: "var(--color-emerald-elixir)" },
                    ].map((r) => (
                      <tr key={r.n} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                        <td className="py-2.5 pr-4 font-ui font-medium text-spectral">{r.n}</td>
                        {r.g.map((v, i) => (
                          <td key={i} className="px-3 py-2.5 font-ui tabular-nums text-parchment">
                            {v > 0 ? <span className="text-teal">{v}%</span> : <span className="text-parchment/35">—</span>}
                          </td>
                        ))}
                        <td className="py-2.5 pl-3">
                          <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: r.c }}>{r.m}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* struggling concepts mini-bars */}
                <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.15em] text-parchment/55">Class struggling-concepts radar</p>
                  <div className="space-y-2">
                    {[
                      { label: "Mole calculations", pct: 72 },
                      { label: "Balancing redox", pct: 54 },
                      { label: "VSEPR geometry", pct: 38 },
                    ].map((b) => (
                      <div key={b.label} className="flex items-center gap-3">
                        <span className="w-40 flex-shrink-0 text-xs text-parchment/80">{b.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--color-parchment) 14%, transparent)" }}>
                          <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.pct > 60 ? "var(--color-crimson)" : b.pct > 45 ? "var(--color-amber-scry)" : "var(--color-emerald-elixir)" }} />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-parchment/70">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="relative z-10 py-2" aria-hidden>
        <img src="/ui/divider-gold.png" alt="" className="mx-auto h-5 w-auto max-w-[55%] object-contain opacity-80" />
      </div>

      {/* ── THE CASE — three pillars ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mb-14 text-center">
            <img src="/ui/banner-purple.png" alt="" aria-hidden className="mx-auto mb-4 h-14 object-contain" />
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Case For AlcheMix</p>
            <h2 className="font-display text-4xl md:text-5xl">Three people say yes to an ed-tech pilot.</h2>
            <p className="mx-auto mt-4 max-w-2xl font-serif text-parchment/80">
              The student, the teacher, and the IT coordinator. AlcheMix was built to convince all three.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ color, img, title, body, points }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div
                  className="group flex h-full flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                    border: `1px solid color-mix(in oklab, ${color} 24%, transparent)`,
                    boxShadow: `0 0 40px -20px color-mix(in oklab, ${color} 35%, transparent)`,
                  }}
                >
                  <img src={img} alt="" aria-hidden
                    className="animate-breathing mb-5 h-16 w-16 object-contain"
                    style={{ filter: `drop-shadow(0 4px 8px color-mix(in oklab, ${color} 30%, rgba(0,0,0,0.45)))` }} />
                  <h3 className="mb-3 text-xl">{title}</h3>
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
            <img src="/ui/banner-green.png" alt="" aria-hidden className="mx-auto mb-4 h-14 object-contain" />
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">The Inventory</p>
            <h2 className="font-display text-4xl md:text-5xl">What your school gets on day one.</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ color, img, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 100}>
                <div
                  className="flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <img src={img} alt="" aria-hidden className="mb-3 h-12 w-12 object-contain"
                    style={{ filter: `drop-shadow(0 3px 5px color-mix(in oklab, ${color} 25%, rgba(0,0,0,0.4)))` }} />
                  <h3 className="mb-2 text-lg">{title}</h3>
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
              {ROLLOUT.map(({ n, img, color, title, body }, i) => (
                <Reveal key={n} delay={i * 100}>
                  <div className="relative pt-2 text-center">
                    <div className="mb-3 flex justify-center">
                      <img src={img} alt="" aria-hidden className="h-14 w-14 object-contain"
                        style={{ filter: `drop-shadow(0 3px 6px color-mix(in oklab, ${color} 30%, rgba(0,0,0,0.45)))` }} />
                    </div>
                    <div className="mb-3 font-display text-sm" style={{ color }}>{n}</div>
                    <h3 className="mb-2 text-base">{title}</h3>
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
            {PRACTICAL.map(({ img, title, body }, i) => (
              <Reveal key={title} delay={(i % 2) * 100}>
                <div
                  className="flex h-full items-start gap-4 rounded-2xl p-6"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <img src={img} alt="" aria-hidden className="h-12 w-12 flex-shrink-0 object-contain"
                    style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.4))" }} />
                  <div>
                    <h3 className="mb-1.5 text-base">{title}</h3>
                    <p className="text-sm leading-relaxed text-parchment">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 py-2" aria-hidden>
        <img src="/ui/divider-purple.png" alt="" className="mx-auto h-5 w-auto max-w-[55%] object-contain opacity-80" />
      </div>

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
                <p className="font-ui text-sm font-semibold text-spectral">{label}</p>
                <p className="text-xs text-parchment/60">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pull-quote on a parchment tooltip ── */}
      <section className="relative z-10 py-8">
        <Reveal className="mx-auto max-w-lg px-6">
          <div className="relative">
            <img src="/ui/tooltip-parchment.png" alt="" aria-hidden className="w-full" />
            <div className="absolute inset-0 flex items-center justify-center px-12 text-center">
              <p className="font-serif text-sm italic md:text-base" style={{ color: "#3a2a0e" }}>
                Built around what a teacher actually needs to see — not a sales deck.
              </p>
            </div>
          </div>
        </Reveal>
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
            <img
              src="/dark-alchemy-vibe/seal-compass.webp"
              alt=""
              aria-hidden
              className="animate-float-slow relative h-16 w-16 rounded-full object-cover"
              style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)", boxShadow: "0 0 24px -6px color-mix(in oklab, var(--color-gold) 55%, transparent)" }}
            />
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
              Educator's Door
            </Link>
            <Link to="/elements" className="btn-ghost-arcane">
              Explore the Elements
            </Link>
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-parchment/50">
            Free to explore · Teacher verification protects the console
          </p>
        </Reveal>
      </section>

      <div className="relative z-10" aria-hidden>
        <img src="/dark-alchemy-vibe/band-workbench.webp" alt=""
          className="h-44 w-full object-cover md:h-56"
          style={{ maskImage: "linear-gradient(180deg, transparent, black 38%)", WebkitMaskImage: "linear-gradient(180deg, transparent, black 38%)" }} />
      </div>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs uppercase tracking-[0.25em] text-parchment/60">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
