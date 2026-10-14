import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

// A readable panel that floats over the atmospheric backdrop — near-opaque card
// surface (white in light, navy in dark) so text never fights the background.
const PANEL: React.CSSProperties = {
  background: "color-mix(in oklab, var(--color-card) 88%, transparent)",
  border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
  boxShadow: "0 24px 60px -30px rgb(0 0 0 / 0.5)",
};

// ── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 },
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
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  );
}

// A framed engraving plate.
function Plate({ src, alt, caption, className = "" }: { src: string; alt: string; caption?: string; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 38%, transparent)", boxShadow: "0 16px 36px -20px rgb(0 0 0 / 0.55)" }}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {caption && (
        <div className="px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.3em] text-parchment/70"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" }}>
          {caption}
        </div>
      )}
    </div>
  );
}

// A numbered chapter, rendered on a readable panel over the backdrop.
function Chapter({ num, title, children, max = "max-w-3xl" }: {
  num: string; title: string; children: React.ReactNode; max?: string;
}) {
  return (
    <section className="relative z-10 py-7 md:py-9">
      <div className={`mx-auto ${max} px-6`}>
        <Reveal>
          <div className="rounded-2xl p-7 md:p-10" style={PANEL}>
            <p className="mg-num">{num}</p>
            <h2 className="font-display mb-5 text-3xl md:text-4xl">{title}</h2>
            <div className="space-y-4 text-parchment leading-relaxed">{children}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// A two-column chapter: text + a framed plate, together on one panel.
function Split({ num, title, img, alt, caption, reverse = false, children }: {
  num: string; title: string; img: string; alt: string; caption?: string; reverse?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="relative z-10 py-7 md:py-9">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="grid items-center gap-7 rounded-2xl p-6 md:grid-cols-2 md:gap-10 md:p-9" style={PANEL}>
            <div className={reverse ? "md:order-2" : ""}>
              <p className="mg-num">{num}</p>
              <h2 className="font-display mb-4 text-3xl md:text-4xl">{title}</h2>
              <div className="space-y-4 text-parchment leading-relaxed">{children}</div>
            </div>
            <div className={reverse ? "md:order-1" : ""}>
              <Plate src={img} alt={alt} caption={caption} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <div className="grimoire-skin relative min-h-screen overflow-x-hidden text-spectral">
      {/* Theme-aware atmosphere: the crystal-valley backdrop, muted by a veil so
          text stays legible. Both layers auto-swap light/dark via tokens + CSS. */}
      <div aria-hidden className="about-page-backdrop pointer-events-none fixed inset-0 z-0" />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "color-mix(in oklab, var(--color-mist) 60%, transparent)" }} />

      <FloatingNav />

      {/* ── HERO — the alchemy hall (theme-aware art) ── */}
      <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden pt-28 pb-16">
        <div aria-hidden className="about-hero-art absolute inset-0 z-0" />
        {/* legibility veil over the art, stronger toward the centre */}
        <div aria-hidden className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 48%, color-mix(in oklab, var(--color-mist) 55%, transparent), color-mix(in oklab, var(--color-mist) 20%, transparent) 70%, transparent)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-0 h-32"
          style={{ background: "linear-gradient(180deg, transparent, var(--color-mist))" }} />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h1 className="font-display mb-6 text-5xl leading-tight md:text-7xl"
              style={{ textShadow: "0 2px 20px color-mix(in oklab, var(--color-mist) 80%, transparent)" }}>
              About AlcheMix
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto max-w-xl font-serif text-lg italic leading-relaxed text-spectral/90 md:text-xl">
              A printed deck, a phone camera, and real chemistry underneath the fantasy.
            </p>
          </Reveal>
        </div>

        <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-gold/70">
          Read on ▾
        </div>
      </section>

      {/* 1 — What AlcheMix is (plain, no poetry) */}
      <Split
        num="I"
        title="What AlcheMix is"
        img="/dark-alchemy-vibe/plate-grimoire-book.webp"
        alt="An open grimoire glowing with teal light"
        caption="The companion app, opened from a scanned card"
      >
        <p className="text-lg text-spectral">
          AlcheMix is a chemistry learning platform built around printed cards you scan with your
          phone.
        </p>
        <p>
          Each card stands for a chemical element. Scanning one opens a companion app where students
          build atoms, combine elements into real compounds, run guided simulations, and practise
          with short exercises. Teachers get their own console to set up classes and follow how
          students are doing. It runs in a normal web browser, works on an ordinary phone, and needs
          no special lab equipment to start.
        </p>
      </Split>

      {/* 2 — Why it exists (stat comparison) */}
      <section className="relative z-10 py-7 md:py-9">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="rounded-2xl p-7 md:p-10" style={PANEL}>
              <p className="mg-num">II</p>
              <h2 className="font-display mb-6 text-3xl md:text-4xl">Why it exists</h2>
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div className="space-y-4 text-parchment leading-relaxed">
                  <p>
                    Filipino students are falling behind in science. In the PISA 2022 assessment, only
                    about a quarter reached the baseline the OECD treats as functional scientific
                    literacy — far below the OECD average.
                  </p>
                  <p>
                    Part of the gap is practical: many schools teach chemistry with no working
                    laboratory equipment, so reactions meant to be seen and handled are only described.
                    AlcheMix exists to let those classrooms see and manipulate chemistry using the
                    phones students already carry.
                  </p>
                </div>
                <div className="rounded-xl p-6" style={{ background: "color-mix(in oklab, var(--color-spectral) 5%, var(--color-card))", border: "1px solid color-mix(in oklab, var(--color-spectral) 12%, transparent)" }}>
                  <p className="mb-5 text-center text-[10px] uppercase tracking-[0.3em] text-parchment/60">
                    PISA 2022 · Level 2 science proficiency
                  </p>
                  {[
                    { label: "Filipino students", pct: 23, color: "var(--color-amber-scry)" },
                    { label: "OECD average", pct: 76, color: "var(--color-emerald-elixir)" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="mb-5 last:mb-0">
                      <div className="mb-1.5 flex items-end justify-between">
                        <span className="text-sm text-parchment">{label}</span>
                        <span className="font-display text-3xl" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--color-spectral) 14%, transparent)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                  <p className="mt-5 border-t border-parchment/15 pt-3 text-center text-xs italic text-parchment/60">
                    Reaching at least Level 2 — the floor for functional scientific literacy.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3 — The alchemy conceit, explained */}
      <Split
        num="III"
        title="Why the alchemy theme"
        img="/dark-alchemy-vibe/plate-inked-alchemist.webp"
        alt="The Alchemist, inked in the old style"
        caption="The Alchemist — the app's guide and narrator"
        reverse
      >
        <p>
          AlcheMix wraps its chemistry in the language of alchemy: a Grimoire of cards, forging
          compounds, trials to pass, aurum to earn. This naming is deliberate, and worth being plain
          about.
        </p>
        <p>
          The framing is a hook. A deck of spell-cards and a book of discoveries is more inviting to
          a Grade 8 student than a worksheet — and that invitation is the point. But it is only a
          surface. The chemistry underneath is unchanged: a forged compound is a real compound, a
          trial is an ordinary set of questions, the element data is the element data.
        </p>
        <p>
          We call this out because our own adviser flagged it: the vocabulary follows the pattern of
          a game, not a chemistry text. That is true, and intended. The theme carries the motivation;
          it never edits the science.
        </p>
      </Split>

      {/* 4 — How the chemistry stays honest */}
      <section className="relative z-10 py-7 md:py-9">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="rounded-2xl p-7 md:p-10" style={PANEL}>
              <div className="grid gap-8 md:grid-cols-5 md:gap-10 md:items-start">
                <div className="md:col-span-2">
                  <p className="mg-num">IV</p>
                  <h2 className="font-display mb-4 text-3xl md:text-4xl">How the chemistry stays honest</h2>
                  <p className="mb-5 text-parchment leading-relaxed">
                    A themed shell is only acceptable if what it teaches is correct. AlcheMix is built
                    so the fantasy never bends the facts.
                  </p>
                  <Plate
                    src="/dark-alchemy-vibe/plate-assayer-lens.webp"
                    alt="The assayer's lens examining a crystal"
                    caption="Every value checked against a standard"
                  />
                </div>
                <div className="md:col-span-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Element data from IUPAC", "Atomic numbers, masses, symbols and properties follow the recognised international standard — not values chosen to fit the game."],
                      ["Hazard symbols from the UN GHS", "Safety pictograms use the Globally Harmonised System — the same signage students meet in a real lab."],
                      ["Content within DepEd competencies", "Topics and sequencing map to the Department of Education's chemistry competencies, reinforcing the curriculum."],
                      ["The engine refuses impossible mixes", "Combine two elements that don't form a real compound and the forge declines and explains why — it won't invent a product."],
                    ].map(([head, body]) => (
                      <div key={head} className="rounded-xl p-5" style={{ background: "color-mix(in oklab, var(--color-spectral) 5%, var(--color-card))", border: "1px solid color-mix(in oklab, var(--color-gold) 22%, transparent)" }}>
                        <h3 className="mb-1.5 font-serif text-base font-semibold text-spectral">{head}</h3>
                        <p className="text-sm leading-relaxed text-parchment">{body}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-l-2 border-gold/40 pl-4 font-serif italic text-parchment/90">
                    The simulations are illustrative, not research-grade. They teach the shape of an
                    idea — collision theory, equilibrium shifts, titration curves — not exact lab
                    outcomes. We say so plainly, because an honest limit is worth more than an
                    overstated claim.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — Who built it (colophon) */}
      <section className="relative z-10 py-7 md:py-9">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <div className="flex flex-col items-center gap-6 rounded-2xl p-7 md:flex-row md:p-10" style={PANEL}>
              <img
                src="/dark-alchemy-vibe/seal-astrolabe.webp"
                alt=""
                aria-hidden
                className="h-24 w-24 flex-shrink-0 object-contain opacity-90 md:h-28 md:w-28"
              />
              <div>
                <p className="mg-num">V</p>
                <h2 className="font-display mb-3 text-3xl md:text-4xl">Who built it</h2>
                <p className="mb-4 text-parchment leading-relaxed">
                  AlcheMix is the work of a single proponent — designed, built, and written by one
                  person, not a studio.
                </p>
                <dl className="grid gap-x-6 gap-y-2 font-serif text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="uppercase tracking-[0.15em] text-gold/80">Proponent</dt>
                  <dd className="text-spectral">Jerlyn C. Dela Cruz · sole proponent</dd>
                  <dt className="uppercase tracking-[0.15em] text-gold/80">Institution</dt>
                  <dd className="text-spectral">Lyceum of Subic Bay — College of Computer Studies</dd>
                  <dt className="uppercase tracking-[0.15em] text-gold/80">Adviser</dt>
                  <dd className="text-spectral">Ms. Lucille Macusi-Republo</dd>
                  <dt className="uppercase tracking-[0.15em] text-gold/80">Piloted at</dt>
                  <dd className="text-spectral">Olongapo City National High School</dd>
                </dl>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6 — Privacy */}
      <Chapter num="VI" title="Privacy">
        <p>
          AlcheMix is used by minors, so this section is written for the parents and teachers who
          will read it before anything else.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gold/80">What is collected</p>
            <ul className="space-y-1.5 text-sm text-parchment">
              <li>— A name and email to create the account.</li>
              <li>— Which class the student belongs to.</li>
              <li>— Practice activity and progress within the app.</li>
              <li>— Photos a student chooses to submit for an activity.</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gold/80">What is not</p>
            <ul className="space-y-1.5 text-sm text-parchment">
              <li>— No selling of student data.</li>
              <li>— No third-party advertising or ad tracking.</li>
              <li>— No sharing outside the student's own class.</li>
            </ul>
          </div>
        </div>
        <p>
          Submitted images live inside the student's own record, visible to that student and their
          teacher — not in a public bucket anyone can browse. All data handling follows the
          Philippines' Data Privacy Act of 2012 (Republic Act No. 10173).
        </p>
      </Chapter>

      {/* 7 — What AlcheMix doesn't do */}
      <section className="relative z-10 py-7 md:py-9">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="rounded-2xl p-7 md:p-10" style={PANEL}>
              <p className="mg-num">VII</p>
              <h2 className="font-display mb-3 text-3xl md:text-4xl">What AlcheMix doesn't do</h2>
              <p className="mb-7 max-w-2xl text-parchment leading-relaxed">
                Being clear about the limits matters as much as the features — especially to a teacher
                deciding whether this belongs in their classroom.
              </p>
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  ["Not a replacement for lab work", "Where real equipment exists, students should still use it. AlcheMix is for building intuition and for classrooms where the lab isn't an option — not a substitute for the bench."],
                  ["It does not award grades", "Practice counters and trial scores are for motivation. Grades and mastery are entered by the teacher; the app never decides them."],
                  ["It does not replace the teacher", "AlcheMix gives a teacher better visibility and new material to teach with. The teaching — and the judgement — stays with them."],
                ].map(([head, body]) => (
                  <div key={head} className="rounded-xl p-6" style={{ background: "color-mix(in oklab, var(--color-spectral) 5%, var(--color-card))", border: "1px solid color-mix(in oklab, var(--color-wraith) 25%, transparent)" }}>
                    <h3 className="mb-2 font-serif text-lg font-semibold text-spectral">{head}</h3>
                    <p className="text-sm leading-relaxed text-parchment">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8 — The card set */}
      <Split
        num="VIII"
        title="The card set"
        img="/dark-alchemy-vibe/plate-hex-monolith.webp"
        alt="A carved hexagonal element stone"
        caption="One card, one element"
        reverse
      >
        <p>
          The physical set is a deck of printed element cards; scanning a card with the app's camera
          opens that element and its activities.
        </p>
        <p>
          The digital side works on its own too — a student with no cards can still use the full
          platform in a browser, and the cards add the hands-on, scan-to-reveal layer on top.
        </p>
        <p className="text-sm text-parchment/70">
          Pricing and bulk orders for schools are on the{" "}
          <Link to="/schools" className="text-gold underline-offset-2 hover:underline">Schools page</Link>.
        </p>
      </Split>

      {/* ── Close ── */}
      <section className="relative z-10 pb-24 pt-6">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/elements" className="btn-arcane btn-arcane-hover">Browse the elements</Link>
            <Link to="/learn" className="btn-ghost-arcane">How it works</Link>
            <Link to="/schools" className="btn-ghost-arcane">For schools</Link>
          </Reveal>
        </div>
      </section>

      {/* The alchemist's workbench closes every guest page (DESIGN_DIRECTION §4). */}
      <div className="relative z-10" aria-hidden>
        <img src="/dark-alchemy-vibe/band-workbench.webp" alt=""
          className="h-44 w-full object-cover md:h-56"
          style={{ maskImage: "linear-gradient(180deg, transparent, black 38%)", WebkitMaskImage: "linear-gradient(180deg, transparent, black 38%)" }} />
      </div>
      <footer className="relative z-10 border-t border-parchment/20 py-8 text-center text-xs uppercase tracking-[0.25em] text-parchment/60">
        ✦ AlcheMix — chemistry learning, card by card ✦
      </footer>
    </div>
  );
}
