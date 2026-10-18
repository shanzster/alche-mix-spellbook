import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onAuthChange } from "../lib/auth";
import { AlcheLoader } from "../components/AlcheLoader";
import { FloatingNav } from "../components/FloatingNav";
import { BASE_CARDS, combine, type Card, type MixResult } from "../lib/cards";

export const Route = createFileRoute("/")({
  component: Landing,
});

// ── Shared: scroll-reveal ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(30px)",
    }}>
      {children}
    </div>
  );
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

// ── Section heading — eyebrow + display title, the page's recurring voice ───
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="text-center mb-10 md:mb-14">
      <p className="text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.4em] text-gold uppercase mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="font-serif italic text-parchment mt-4 text-base sm:text-lg max-w-2xl mx-auto">{sub}</p>}
    </Reveal>
  );
}

// Ornamental ink divider between chapters.
function InkDivider({ label }: { label?: string }) {
  return (
    <div className="relative z-10 mx-auto flex max-w-4xl items-center gap-5 px-6 py-6">
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-gold) 55%, transparent))" }} />
      <span className="text-gold text-sm">✦</span>
      {label && <p className="font-serif italic text-sm text-parchment whitespace-nowrap">{label}</p>}
      <span className="text-gold text-sm">✦</span>
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--color-gold) 55%, transparent), transparent)" }} />
    </div>
  );
}

// ── HERO — the Alchemist's ceremony, centred (the static page's layout,
// rebuilt with the real-app-hero-page art). Layered parallax: backdrop,
// grain, figure and headline each drift on scroll AND lean with the cursor,
// eased every frame. The living Bohr atom floats above the Alchemist's
// hands — drag it to spin.
function HeroScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const onMove = (e: MouseEvent) => {
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) { target.x = 0; target.y = 0; }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });

    // Every layer declares its own depth: data-par="mouseX,mouseY,scroll".
    // Transform goes on the SAME element as any blend mode (an ancestor's
    // transform would isolate the blend — learned the hard way).
    const layers = Array.from(
      sectionRef.current?.querySelectorAll<HTMLElement>("[data-par]") ?? [],
    );
    let lastSy = -1;
    const frame = () => {
      if (!running) return;
      // Hold still while the theme ripple captures and plays.
      if (document.documentElement.hasAttribute("data-theme-ripple")) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dx = target.x - eased.x;
      const dy = target.y - eased.y;
      eased.x += dx * 0.12;
      eased.y += dy * 0.12;
      const sy = window.scrollY;
      // Idle guard: no pointer drift and no scroll → skip all style writes.
      if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002 && sy === lastSy) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastSy = sy;
      for (const el of layers) {
        const [fx, fy, fs] = (el.dataset.par ?? "0,0,0").split(",").map(Number);
        el.style.transform = `translate(${(eased.x * fx).toFixed(2)}px, ${(sy * fs + eased.y * fy).toFixed(2)}px)`;
      }
      if (headRef.current) {
        headRef.current.style.transform = `translate(${(eased.x * 7).toFixed(2)}px, ${(sy * -0.22 + eased.y * 5).toFixed(2)}px)`;
        headRef.current.style.opacity = String(Math.max(0, 1 - sy / 620));
      }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.02 });
    if (sectionRef.current) io.observe(sectionRef.current);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen overflow-hidden">
      {/* The hall — glyphed nebula arch by night, sunlit atelier by day.
          Bled past the edges so the parallax never shows a seam. */}
      <div className="absolute -inset-[5%]">
        <img
          src="/real-app-hero-page/hero-backdrop-dark.webp"
          alt="" aria-hidden
          className="absolute inset-0 hidden h-full w-full object-cover dark:block"
        />
        <img
          src="/real-app-hero-page/hero-backdrop-light.webp"
          alt="" aria-hidden
          className="absolute inset-0 h-full w-full object-cover dark:hidden"
        />
      </div>
      {/* Grain, crystal frame and side wings are STATIC — they use mix-blend-mode,
          and parallaxing a blended layer forces the whole stack to re-composite
          every scroll frame (landing jank). Keeping them still composites once;
          the backdrop, figure and headline still parallax for depth. */}
      {/* Grain — gold dust by night, old ink stains by day */}
      <div
        className="pointer-events-none absolute -inset-[7%] hidden dark:block"
        style={{ background: "url('/real-app-hero-page/grain-overlay-dark.webp') center / cover", mixBlendMode: "screen", opacity: 0.55 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-[7%] dark:hidden"
        style={{ background: "url('/real-app-hero-page/grain-overlay-light.webp') center / cover", mixBlendMode: "multiply", opacity: 0.3 }}
        aria-hidden
      />
      {/* Crystal frame — shards ringing the hero's edges, centre left clear */}
      <div
        className="pointer-events-none absolute -inset-[6%] hidden dark:block"
        style={{ background: "url('/real-app-hero-page/crystal-frame-dark.webp') center / cover", mixBlendMode: "lighten", opacity: 0.6 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-[6%] dark:hidden"
        style={{ background: "url('/real-app-hero-page/crystal-frame-light.webp') center / cover", mixBlendMode: "multiply", opacity: 0.4 }}
        aria-hidden
      />
      {/* LEFT wing — ruined arch and thorn vines by night, the ivy column by day */}
      <img
        src="/real-app-hero-page/side-ruins-dark.webp"
        alt="" aria-hidden
        className="pointer-events-none absolute left-[-3%] top-1/2 hidden h-[115%] -translate-y-1/2 md:dark:block"
        style={{ mixBlendMode: "lighten" }}
      />
      <img
        src="/real-app-hero-page/side-column-light.webp"
        alt="" aria-hidden
        className="pointer-events-none absolute left-[-3%] top-1/2 hidden h-[115%] -translate-y-1/2 md:block dark:hidden"
        style={{ mixBlendMode: "multiply" }}
      />
      {/* RIGHT wing — the chained monolith by night, the rope cliff by day */}
      <img
        src="/real-app-hero-page/side-monolith-dark.webp"
        alt="" aria-hidden
        className="pointer-events-none absolute right-[-3%] top-1/2 hidden h-[115%] -translate-y-1/2 md:dark:block"
        style={{ mixBlendMode: "lighten" }}
      />
      <img
        src="/real-app-hero-page/side-cliff-light.webp"
        alt="" aria-hidden
        className="pointer-events-none absolute right-[-3%] top-1/2 hidden h-[115%] -translate-y-1/2 md:block dark:hidden"
        style={{ mixBlendMode: "multiply" }}
      />
      {/* Centre veil + fade into the page below */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ background: "radial-gradient(ellipse 58% 62% at 50% 56%, rgb(11 18 32 / 0.52), transparent 78%), linear-gradient(180deg, transparent 62%, var(--color-mist) 97%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{ background: "radial-gradient(ellipse 58% 62% at 50% 56%, rgb(246 243 236 / 0.6), transparent 78%), linear-gradient(180deg, transparent 62%, var(--color-mist) 97%)" }}
        aria-hidden
      />

      {/* The Alchemist — the middle hero, a bit big. Conjurer by night,
          apprentice by day (backgrounds cut, so parallax transforms are safe). */}
      <div
        className="pointer-events-none absolute bottom-[-4vh] left-1/2 z-[5] -translate-x-1/2"
        style={{ height: "min(86vh, 820px)", aspectRatio: "1792 / 2432" }}
      >
        <div data-par="20,12,0.06" className="will-change-transform relative h-full w-full">
          {/* Bottom fade grounds the figures into the page fade (and hides
              the painted floor shadows the cutout keeps). */}
          <img
            src="/real-app-hero-page/cut-figure-conjurer-dark.webp"
            alt="The Alchemist"
            className="absolute inset-0 hidden h-full w-full object-contain dark:block"
            style={{
              maskImage: "linear-gradient(180deg, black 80%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(180deg, black 80%, transparent 98%)",
            }}
          />
          <img
            src="/real-app-hero-page/cut-figure-apprentice-light.webp"
            alt="The Alchemist's apprentice"
            className="absolute inset-0 h-full w-full object-contain dark:hidden"
            style={{
              maskImage: "linear-gradient(180deg, black 76%, transparent 96%)",
              WebkitMaskImage: "linear-gradient(180deg, black 76%, transparent 96%)",
            }}
          />
        </div>
      </div>

      {/* The proclamation — centred over the ceremony */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col items-center px-5 pb-[5vh] pt-24 text-center sm:px-6 sm:pt-28">
        <div ref={headRef} className="will-change-transform relative">
          <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-gold sm:text-[11px] sm:tracking-[0.45em]" style={{ textShadow: "0 1px 10px color-mix(in oklab, var(--color-mist) 90%, transparent), 0 0 4px color-mix(in oklab, var(--color-mist) 70%, transparent)" }}>
            ✦ The Alchemist's Grimoire ✦
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.07] sm:text-5xl md:text-6xl lg:text-7xl">
            Where <span className="aurora-gradient animate-aurora">Elements</span>
            <br /> Whisper Their <span className="text-wraith text-glow-violet">Secrets.</span>
          </h1>
        </div>

        <div className="relative mt-auto">
          {/* Frosted band so the tagline reads over the robes */}
          <div
            className="absolute -inset-x-10 -inset-y-5 sm:-inset-x-24 -z-10"
            style={{
              background: "color-mix(in oklab, var(--color-mist) 82%, transparent)",
              maskImage: "radial-gradient(ellipse 58% 80% at 50% 50%, black 52%, transparent 84%)",
              WebkitMaskImage: "radial-gradient(ellipse 58% 80% at 50% 50%, black 52%, transparent 84%)",
            }}
            aria-hidden
          />
          <p className="mx-auto max-w-xl font-serif text-base italic leading-relaxed text-parchment sm:text-lg">
            Real chemistry, bound in a grimoire. Scan the cards, mix the
            elements, and forge what the old masters only dreamed of.
          </p>
          <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-arcane btn-arcane-hover">
              Begin the Apprenticeship
            </Link>
            <a href="#chronicle" className="btn-ghost-arcane">
              Read the Chronicle
            </a>
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-parchment/70">
            Free to explore · No account needed for the elements
          </p>
        </div>
      </div>
    </section>
  );
}

// ── CHAPTER I — What is AlcheMix (typography + the deck box) ───────────────
// Two columns: the chronicle's words, and the physical card box — hover or
// tap and the box opens, dips a little, and two cards rise out of it into a
// line. All real generated art, no SVG.
function DeckBox() {
  const [open, setOpen] = useState(false);
  const cards = [
    { light: "/chronicle/card-hydrogen.webp", dark: "/chronicle/card-hydrogen-dark.webp", alt: "The Hydrogen card", x: "-56%", r: -11, d: 0 },
    { light: "/chronicle/card-oxygen.webp", dark: "/chronicle/card-oxygen-dark.webp", alt: "The Oxygen card", x: "56%", r: 11, d: 120 },
  ];
  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div
        className="relative h-[440px] w-full cursor-pointer select-none sm:h-[500px]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-pressed={open}
        aria-label="Open the AlcheMix card box"
      >
        {/* The two cards — tucked inside, rising into a line when opened.
            Day and night editions swap with the theme. */}
        {cards.map((c) => {
          const cardStyle = {
            zIndex: open ? 3 : 1,
            transform: open
              ? `translate(calc(-50% + ${c.x}), -62%) rotate(0deg)`
              : `translate(-50%, 4%) rotate(${c.r}deg) scale(0.5)`,
            opacity: open ? 1 : 0,
            transition: "transform .7s cubic-bezier(.34,1.56,.64,1), opacity .4s ease",
            transitionDelay: open ? `${c.d}ms` : "0ms",
            filter: "drop-shadow(0 12px 26px rgb(0 0 0 / 0.35))",
          } as const;
          return (
            <span key={c.alt}>
              <img src={c.light} alt={c.alt} className="absolute left-1/2 top-[34%] w-36 sm:w-40 dark:hidden" style={cardStyle} />
              <img src={c.dark} alt={c.alt} className="absolute left-1/2 top-[34%] hidden w-36 sm:w-40 dark:block" style={cardStyle} />
            </span>
          );
        })}
        {/* The box — swaps open and dips subtly to let the cards out.
            Parchment edition by day, midnight edition by night. */}
        <div
          className="absolute inset-x-0 bottom-0 z-[2] flex justify-center"
          style={{
            transform: open ? "translateY(18px) scale(0.95)" : "none",
            transition: "transform .6s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div className="relative w-[80%]" style={{ filter: "drop-shadow(0 18px 30px rgb(0 0 0 / 0.3))" }}>
            {/* sizing img (keeps the wrapper's height) */}
            <img
              src="/chronicle/card-box-closed.webp"
              alt="The AlcheMix card box"
              className="w-full dark:hidden"
              style={{ opacity: open ? 0 : 1, transition: "opacity .35s ease" }}
            />
            <img
              src="/chronicle/card-box-closed-dark.webp"
              alt="The AlcheMix card box"
              className="hidden w-full dark:block"
              style={{ opacity: open ? 0 : 1, transition: "opacity .35s ease" }}
            />
            <img
              src="/chronicle/card-box-open.webp"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full dark:hidden"
              style={{ opacity: open ? 1 : 0, transition: "opacity .35s ease" }}
            />
            <img
              src="/chronicle/card-box-open-dark.webp"
              alt=""
              aria-hidden
              className="absolute inset-0 hidden w-full dark:block"
              style={{ opacity: open ? 1 : 0, transition: "opacity .35s ease" }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.25em] text-parchment/60">
        {open ? "The base elements, ready to forge" : "Hover — or tap — to open the deck"}
      </p>
    </div>
  );
}

function ChronicleScroll() {
  return (
    <section id="chronicle" className="relative scroll-mt-24 overflow-hidden py-14 md:py-20" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 760px" }}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 md:gap-12 lg:grid-cols-2">
        {/* The words */}
        <Reveal>
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">Chapter I — The Chronicle</p>
          <h2 className="font-display mb-6 text-4xl md:text-5xl">
            What is <span className="text-gold">AlcheMix?</span>
          </h2>
          <div className="space-y-4 font-serif text-lg leading-relaxed text-parchment">
            <p>
              AlcheMix is a chemistry learning platform wearing the cloak of
              alchemy. Beneath the robes, every number is textbook-true — real
              bond types, real reactions, real elements — taught through a
              world of grimoires, trials, and forging.
            </p>
            <p>
              It begins with a deck of <strong className="text-spectral">12 physical trading cards</strong>,
              the base elements. Point a phone at a card and it wakes in
              augmented reality; carry the deck to the website and the full
              Grimoire opens — simulations, guided lessons, and the Compound
              Codex of everything you have forged.
            </p>
            <p>
              Educators hold the other half of the book: classes, assignments,
              and a live view of every apprentice's progress.
            </p>
          </div>
          {/* The tallies */}
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-2 border-t pt-5" style={{ borderColor: "color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
            {[
              ["12", "physical cards"],
              ["118", "elements chronicled"],
              ["20+", "learning modules"],
            ].map(([n, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <span className="font-display text-3xl text-gold">{n}</span>
                <span className="text-xs uppercase tracking-[0.15em] text-parchment/70">{l}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* The deck */}
        <Reveal delay={140}>
          <DeckBox />
        </Reveal>
      </div>
    </section>
  );
}

// ── CHAPTER II — How does it work (the live forging rite) ───────────────────
// A real taste of the system: two Grimoire cards go into the altar and the
// app's actual combine() engine decides what — if anything — is forged.
function MiniCard({ card, onClick, dimmed }: { card: Card; onClick: () => void; dimmed: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={dimmed}
      className="hex-stone group w-[76px] p-[2px] transition-all duration-200 hover:-translate-y-1 disabled:opacity-30 disabled:hover:translate-y-0"
      style={{
        aspectRatio: "0.9",
        background: `linear-gradient(170deg, color-mix(in oklab, ${card.color} 55%, var(--color-gold)), color-mix(in oklab, var(--color-gold) 40%, transparent))`,
      }}
      aria-label={`Pick ${card.name}`}
    >
      <span
        className="hex-stone flex h-full w-full flex-col items-center justify-center"
        style={{
          background: `radial-gradient(circle at 36% 24%, color-mix(in oklab, ${card.color} 26%, var(--color-slate-sunken)), var(--color-mist) 74%)`,
        }}
      >
        {/* Symbols keep chemical casing (Na, Cl) — serif like the engraved stones. */}
        <span className="font-serif text-2xl font-semibold" style={{ color: `color-mix(in oklab, ${card.color} 70%, var(--color-spectral))` }}>
          {card.symbol}
        </span>
        <span className="text-[8px] uppercase tracking-widest text-parchment">{card.name}</span>
      </span>
    </button>
  );
}

function AltarSlot({ card, onClear, label }: { card: Card | null; onClear: () => void; label: string }) {
  if (!card) {
    return (
      <div
        className="hex-stone w-[108px] p-[2px]"
        style={{ aspectRatio: "0.9", background: "color-mix(in oklab, var(--color-gold) 35%, transparent)" }}
      >
        <div
          className="hex-stone flex h-full w-full flex-col items-center justify-center text-center"
          style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)" }}
        >
          <span className="mb-1 text-wraith/80">✦</span>
          <span className="px-3 text-[10px] uppercase tracking-[0.15em] text-parchment">{label}</span>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={onClear}
      className="hex-stone group w-[108px] p-[2px] transition-transform hover:scale-[1.04]"
      style={{
        aspectRatio: "0.9",
        background: `linear-gradient(170deg, color-mix(in oklab, ${card.color} 60%, var(--color-gold)), color-mix(in oklab, var(--color-gold) 45%, transparent))`,
      }}
      aria-label={`Remove ${card.name}`}
      title={`Remove ${card.name}`}
    >
      <span
        className="hex-stone flex h-full w-full flex-col items-center justify-center"
        style={{ background: `radial-gradient(circle at 36% 24%, color-mix(in oklab, ${card.color} 28%, var(--color-slate-sunken)), var(--color-mist) 74%)` }}
      >
        <span className="font-serif text-4xl font-semibold" style={{ color: `color-mix(in oklab, ${card.color} 70%, var(--color-spectral))` }}>{card.symbol}</span>
        <span className="mt-0.5 text-[9px] uppercase tracking-widest text-parchment">{card.name}</span>
        <span className="text-[9px] text-parchment/0 transition-colors group-hover:text-parchment/80">× remove</span>
      </span>
    </button>
  );
}

function ForgeRite() {
  const [slotA, setSlotA] = useState<Card | null>(null);
  const [slotB, setSlotB] = useState<Card | null>(null);
  const [result, setResult] = useState<MixResult | null>(null);
  const [forging, setForging] = useState(false);

  const pick = (card: Card) => {
    setResult(null);
    if (!slotA) setSlotA(card);
    else if (!slotB) setSlotB(card);
  };
  const clear = (which: "a" | "b") => {
    setResult(null);
    if (which === "a") setSlotA(null);
    else setSlotB(null);
  };
  const forge = () => {
    if (!slotA || !slotB || forging) return;
    setForging(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(combine(slotA, slotB));
      setForging(false);
    }, 900);
  };

  return (
    <section className="relative overflow-hidden py-14 md:py-20" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 1400px" }}>
      {/* Bench backdrop — a warm pool of candlelight grounds the altar so the
          rite reads as a lit workbench, not a floating card. Pure decoration. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute left-1/2 top-[58%] h-[560px] w-[900px] max-w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: "radial-gradient(ellipse, color-mix(in oklab, var(--color-gold) 13%, transparent), transparent 70%)" }}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6">
        <SectionHead
          eyebrow="Chapter II — The Rite"
          title="How does it work?"
          sub="Draw two cards from the Grimoire and lay them on the altar. The forge obeys real chemistry — some pairs bond, some refuse."
        />

        {/* The three movements of the rite */}
        <Reveal className="mb-12">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "I", title: "Draw from the Deck", body: "Twenty physical base-element cards in the set. In the app they wake in AR; here, draw any two below." },
              { n: "II", title: "Mix at the Altar", body: "The combiner weighs valence, charge, and electronegativity — the same engine that runs the real forge." },
              { n: "III", title: "Forge & Collect", body: "A true bond forges a compound card for your Codex. An impossible mix earns the Alchemist's counsel instead." },
            ].map(({ n, title, body }) => (
              <div key={n} className="ink-panel ink-halftone p-6 text-center">
                <p className="mb-2 text-xs tracking-[0.4em] text-teal">— {n} —</p>
                <h3 className="font-display mb-2 text-2xl">{title}</h3>
                <p className="text-sm leading-relaxed text-parchment">{body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* The altar bench — the workbench surface is layered under the rite so
            the cards visibly rest on it; a gold-ruled slab holds the mix. */}
        <Reveal>
          <div className="ink-panel relative overflow-hidden rounded-2xl">
            <img
              src="/dark-alchemy-vibe/band-workbench.webp"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] w-full object-cover opacity-20"
              style={{
                maskImage: "linear-gradient(180deg, transparent, black 70%)",
                WebkitMaskImage: "linear-gradient(180deg, transparent, black 70%)",
              }}
            />
            <div className="relative p-6 md:p-10">
              {/* The deck — base cards to draw from */}
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.3em] text-parchment/70">
                The base cards — draw two
              </p>
              <div className="mb-8 flex flex-wrap justify-center gap-2.5">
                {BASE_CARDS.map((c) => (
                  <MiniCard
                    key={c.symbol}
                    card={c}
                    dimmed={!!slotA && !!slotB}
                    onClick={() => pick(c)}
                  />
                ))}
              </div>

              {/* The altar slab — a distinct inset surface the mix is laid on */}
              <div
                className="rounded-xl border border-[color-mix(in_oklab,var(--color-gold)_30%,transparent)] px-4 py-6 md:px-8"
                style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}
              >
                <p className="mb-5 text-center font-serif text-xs italic text-parchment/60">
                  — lay them on the altar —
                </p>
                {/* Slots + forge: stacked on mobile, a single row on desktop */}
                <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
                  <AltarSlot card={slotA} onClear={() => clear("a")} label="First card" />
                  <span className="font-display text-3xl text-gold">+</span>
                  <AltarSlot card={slotB} onClear={() => clear("b")} label="Second card" />
                  <span className="font-display text-3xl text-gold md:-rotate-0 rotate-90">→</span>

                  {/* Crucible / result */}
                  <div className="relative flex h-40 w-56 items-center justify-center">
                {forging && (
                  <img
                    src="/Hero-Section/rings.png"
                    alt=""
                    aria-hidden
                    className="absolute h-36 w-36"
                    style={{ animation: "spin-slow 2.5s linear infinite", mixBlendMode: "screen", opacity: 0.9 }}
                  />
                )}
                {!forging && result?.valid && (
                  <div
                    className={`animate-card-pop flex h-full w-full flex-col items-center justify-center rounded-xl px-3 text-center ${result.unstable ? "animate-hazard-shake" : ""}`}
                    style={{
                      background: "linear-gradient(170deg, color-mix(in oklab, var(--color-gold) 18%, var(--color-slate-sunken)), var(--color-slate-sunken))",
                      border: "1.5px solid color-mix(in oklab, var(--color-gold) 60%, transparent)",
                      boxShadow: "0 0 30px -8px color-mix(in oklab, var(--color-gold) 55%, transparent)",
                    }}
                  >
                    <span className="font-serif text-4xl font-semibold text-gold">{result.formula}</span>
                    <span className="mt-1 font-ui text-sm font-semibold">{result.name}</span>
                    {result.commonName && (
                      <span className="font-serif text-xs italic text-parchment">"{result.commonName}"</span>
                    )}
                    <span className="mt-1.5 rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em]"
                      style={{
                        color: "var(--color-emerald-elixir)",
                        border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 45%, transparent)",
                        background: "color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent)",
                      }}>
                      {result.bond} bond
                    </span>
                  </div>
                )}
                {!forging && result && !result.valid && (
                  <div className="animate-card-pop flex h-full w-full flex-col items-center justify-center px-4 text-center"
                    style={{
                      background: "color-mix(in oklab, var(--color-amber-scry) 10%, var(--color-slate-sunken))",
                      border: "1.5px dashed color-mix(in oklab, var(--color-amber-scry) 55%, transparent)",
                    }}>
                    <span className="mb-1 text-[10px] uppercase tracking-[0.25em] text-amber-scry">The Alchemist Counsels</span>
                    <span className="font-serif text-sm italic leading-snug text-parchment">{result.reason}</span>
                  </div>
                )}
                {!forging && !result && (
                  <div className="rune-dashed flex h-full w-full items-center justify-center rounded-xl">
                    <span className="px-4 text-center text-[10px] uppercase tracking-[0.2em] text-parchment/70">
                      The forged card appears here
                    </span>
                  </div>
                )}
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col items-center gap-3">
              <button
                onClick={forge}
                disabled={!slotA || !slotB || forging}
                className="btn-arcane btn-arcane-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {forging ? "Forging…" : "Forge the Mix"}
              </button>
              <p className="max-w-md text-center text-xs text-parchment/60">
                {result?.valid && result.uses ? (
                  <span className="font-serif italic text-parchment">Found in the world: {result.uses}</span>
                ) : (
                  <>Not sure where to start? Try <span className="text-gold">Na + Cl</span>,{" "}
                  <span className="text-gold">H + O</span>, or <span className="text-gold">Na + Fe</span> —
                  and see what the forge says.</>
                )}
              </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── CHAPTER III — Marginalia (facts about the system) ───────────────────────
function Marginalia() {
  const FEATURES = [
    { n: "I", title: "A Shelf of 20+ Modules", body: "Titration, gas laws, equilibrium, electrochemistry, VSEPR shapes, radioactive decay and more — every simulation built on textbook-accurate values." },
    { n: "II", title: "AR Card Scanning", body: "The physical Grimoire cards wake under a phone camera: 3D atoms in your hands, and a scanning ceremony that runs the real compound engine." },
    { n: "III", title: "118 Elements, with Lore", body: "The full periodic table — trends, states, discovery timeline — plus etymology and alchemical history for every element in the chronicle." },
    { n: "IV", title: "Ask the Alchemist", body: "A mentor on every page. Wrong answers and impossible mixes earn warm counsel, never punishment — and the mentor still answers offline." },
    { n: "V", title: "The Educator's Astrolabe", body: "Classes with join codes, a quiz builder, mission configurator, gradebook, and a live performance matrix that surfaces struggling concepts early." },
    { n: "VI", title: "Rites that Build Habits", body: "Daily starter questions with streaks, spaced review that remembers what you forget, and trials that award stars — motivation, never grades." },
  ];
  return (
    <section className="relative z-10 py-14 md:py-20" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 1100px" }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHead
          eyebrow="Chapter III — Marginalia"
          title="Noted in the margins."
          sub="More of what the system holds, for apprentices and their educators."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ n, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 110}>
              <div className="ink-panel ink-halftone group h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mg-num">{n}</div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-parchment">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Two doors — apprentice & educator */}
        <Reveal className="mt-14">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="ink-panel p-8">
              <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-wraith">Students</p>
              <h3 className="font-display mb-3 text-2xl">For Apprentices</h3>
              <p className="mb-5 text-sm leading-relaxed text-parchment">
                Collect the cards, pass the trials, fill your Codex. The
                element browser is open to everyone — no account, no key.
              </p>
              <Link to="/elements" className="btn-arcane btn-arcane-hover text-sm">
                Browse the Elements
              </Link>
            </div>
            <div className="ink-panel p-8">
              <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-gold">Teachers &amp; Schools</p>
              <h3 className="font-display mb-3 text-2xl">For Educators</h3>
              <p className="mb-5 text-sm leading-relaxed text-parchment">
                Open a class with a join code and watch the whole room learn —
                assignments, analytics, and evidence review in one console.
              </p>
              <Link to="/schools" className="btn-ghost-arcane text-sm">
                Why Schools Choose AlcheMix
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Final summons ────────────────────────────────────────────────────────────
function FinalSummons() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 700px" }}>
      <Reveal className="relative mx-auto max-w-3xl px-5 sm:px-6">
        {/* The summons plate — double gold rule, a revolving transmutation
            seal turning slowly behind the words (dark mode only). */}
        <div className="ink-panel relative overflow-hidden px-6 py-14 text-center md:px-14 md:py-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden aspect-square w-[560px] -translate-x-1/2 -translate-y-1/2 dark:block">
            <div
              className="animate-spin-slower h-full w-full"
              style={{
                background: "url('/dark-alchemy-vibe/hf_20261011_153423_0ee5b51a-ca2f-478b-b917-254fd5752b5c.png') center / contain no-repeat",
                mixBlendMode: "screen",
                opacity: 0.32,
                maskImage: "radial-gradient(circle closest-side, black 70%, transparent 96%)",
                WebkitMaskImage: "radial-gradient(circle closest-side, black 70%, transparent 96%)",
              }}
            />
          </div>

          <p className="relative mb-4 text-xs uppercase tracking-[0.4em] text-gold">✦ The Summons ✦</p>
          <h2 className="relative mb-5 font-display text-4xl md:text-5xl">
            The Grimoire is waiting.<br />
            <span className="text-gold" style={{ textShadow: "0 0 26px color-mix(in oklab, var(--color-gold) 45%, transparent)" }}>
              Open it.
            </span>
          </h2>
          <p className="relative mx-auto mb-9 max-w-xl font-serif text-lg italic leading-relaxed text-parchment">
            Start with the elements — free, no account. When you're ready,
            step into the Grimoire and begin forging.
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-arcane btn-arcane-hover">
              Enter the Grimoire
            </Link>
            <Link to="/elements" className="btn-ghost-arcane">
              Start with Elements
            </Link>
          </div>
          <p className="relative mt-7 text-[10px] uppercase tracking-[0.25em] text-parchment/60">
            Free to explore · No account needed for the elements
          </p>
        </div>
      </Reveal>
    </section>
  );
}

// Both themes' artwork, so a theme flip never stalls on network + decode.
// CSS backgrounds on display:none elements are NOT fetched until shown —
// without this, the ripple froze while the other edition downloaded.
const THEME_ART = [
  "/backdrops/night-ink.webp", "/backdrops/parchment-day.webp",
  "/real-app-hero-page/hero-backdrop-dark.webp", "/real-app-hero-page/hero-backdrop-light.webp",
  "/real-app-hero-page/grain-overlay-dark.webp", "/real-app-hero-page/grain-overlay-light.webp",
  "/real-app-hero-page/crystal-frame-dark.webp", "/real-app-hero-page/crystal-frame-light.webp",
  "/real-app-hero-page/side-ruins-dark.webp", "/real-app-hero-page/side-column-light.webp",
  "/real-app-hero-page/side-monolith-dark.webp", "/real-app-hero-page/side-cliff-light.webp",
  "/real-app-hero-page/cut-figure-conjurer-dark.webp", "/real-app-hero-page/cut-figure-apprentice-light.webp",
  "/chronicle/card-box-closed.webp", "/chronicle/card-box-closed-dark.webp",
  "/chronicle/card-box-open.webp", "/chronicle/card-box-open-dark.webp",
  "/chronicle/card-hydrogen.webp", "/chronicle/card-hydrogen-dark.webp",
  "/chronicle/card-oxygen.webp", "/chronicle/card-oxygen-dark.webp",
];

function usePrefetchThemeArt() {
  useEffect(() => {
    const idle: (cb: () => void) => void =
      window.requestIdleCallback?.bind(window) ??
      ((cb: () => void) => { window.setTimeout(cb, 1200); });
    idle(() => {
      for (const src of THEME_ART) {
        const img = new Image();
        img.src = src;
        img.decode?.().catch(() => {});
      }
    });
  }, []);
}

function Landing() {
  usePrefetchThemeArt();

  // Signed-in students skip the marketing page and go straight to the dashboard.
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => onAuthChange((u) => {
    if (u) navigate({ to: "/app" });
    else setAuthReady(true);
  }), [navigate]);

  // Hold the page until we know whether to redirect — avoids flashing the
  // landing to a logged-in student before the bounce to /app.
  if (!authReady) {
    return <AlcheLoader label={null} />;
  }

  return (
    <div className="grimoire-skin min-h-screen overflow-x-hidden text-spectral">
      {/* GPU-composited page backdrop (replaces background-attachment:fixed,
          which repainted the whole page on every scroll frame). */}
      <div className="bg-grimoire-fixed" aria-hidden />
      <FloatingNav />

      <HeroScene />

      {/* Torn parchment seam between the sky and the chronicle (dark only —
          in light the parchment page needs no seam). */}
      <div
        className="relative z-10 hidden h-24 md:h-32 dark:block"
        style={{ background: "url('/dark-alchemy-vibe/hf_20261011_153424_ee3e2950-5aa7-4b5e-9619-bf958dfc863d.png') center / cover no-repeat" }}
        aria-hidden
      />

      <ChronicleScroll />
      <InkDivider label="Every element tells a story" />
      <ForgeRite />
      <InkDivider label="Some pairs bond — some refuse" />
      <Marginalia />
      <FinalSummons />

      <footer className="border-t border-parchment/20 py-8 text-center text-xs uppercase tracking-[0.25em] text-parchment/60">
        ✦ AlcheMix — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
