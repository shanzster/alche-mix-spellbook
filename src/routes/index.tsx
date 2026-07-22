import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  FlaskConical,
  Eye,
  BookOpen,
  Feather,
  ArrowRight,
  ScrollText,
  Atom,
  GraduationCap,
  Camera,
  Zap,
  BookMarked,
} from "lucide-react";
import { BohrModel3D } from "../components/BohrModel3D";

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

// ── Shared: animated molecule node canvas ────────────────────────────────────
function MoleculeCanvas({ color = "var(--color-wraith)" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    type Node = { x: number; y: number; vx: number; vy: number; r: number; label: string };
    const LABELS = ["H₂O","NaCl","CO₂","O₂","CH₄","Fe","Au","Na","NH₃","HCl","Ca","Mg"];
    const nodes: Node[] = Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: 18 + Math.random() * 14, label: LABELS[i % LABELS.length],
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.r || n.x > canvas.width  - n.r) n.vx *= -1;
        if (n.y < n.r || n.y > canvas.height - n.r) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 180) {
            const a = (1 - d / 180) * 0.55;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `color-mix(in oklab, ${color} ${Math.round(a*100)}%, transparent)`;
            ctx.lineWidth = (1 - d / 180) * 2; ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `color-mix(in oklab, ${color} 14%, transparent)`; ctx.fill();
        ctx.strokeStyle = `color-mix(in oklab, ${color} 45%, transparent)`; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = `color-mix(in oklab, ${color} 80%, transparent)`;
        ctx.font = `600 10px "EB Garamond", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} className="w-full h-full" style={{ pointerEvents: "none" }} />;
}

// ── Shared: orbit ring visual ────────────────────────────────────────────────
function OrbitRing({ size = 220, color = "var(--color-wraith)", icon }: {
  size?: number; color?: string; icon: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      {[0.95, 0.72, 0.50].map((scale, i) => (
        <div key={i} className="absolute rounded-full border" style={{
          width: size * scale, height: size * scale,
          borderColor: `color-mix(in oklab, ${color} ${25 - i * 6}%, transparent)`,
          animation: `float-slow ${6 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 0.8}s`,
        }} />
      ))}
      <div className="absolute inset-0 rounded-full" style={{
        background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, ${color} 16%, transparent), transparent 65%)`,
      }} />
      <div className="relative z-10 flex items-center justify-center rounded-full animate-breathing"
        style={{
          width: size * 0.28, height: size * 0.28,
          background: `color-mix(in oklab, ${color} 15%, transparent)`,
          border: `1.5px solid color-mix(in oklab, ${color} 40%, transparent)`,
          color,
        }}>
        {icon}
      </div>
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

function Landing() {
  const y = useScrollY();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      {/* Starfield */}
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-70" />

      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 22 }).map((_, i) => {
          const violet = i % 2 === 0;
          return (
            <span
              key={`e-${i}`}
              className="animate-drift absolute h-1 w-1 rounded-full"
              style={{
                top: `${(i * 37) % 100}%`,
                animationDelay: `${i * 1.1}s`,
                animationDuration: `${18 + (i % 6) * 3}s`,
                background: violet ? "var(--color-wraith)" : "var(--color-gold)",
                boxShadow: `0 0 14px ${violet ? "var(--color-wraith)" : "var(--color-gold)"}`,
              }}
            />
          );
        })}
      </div>


      {/* Floating Pill Nav */}
      <header className="fixed top-5 left-0 right-0 z-50 flex justify-center pointer-events-none">
        {/* Outer wrapper — taller than pill to let orb overflow without clipping */}
        <div className="pointer-events-auto relative flex items-center justify-center" style={{ height: "68px" }}>

          {/* The single pill — all items in one row with a gap in the middle for the orb */}
          <div
            className="flex items-center h-12 rounded-full backdrop-blur-xl"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 88%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
              boxShadow:
                "0 8px 40px -8px color-mix(in oklab, var(--color-wraith) 30%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-spectral) 8%, transparent)",
              padding: "0 12px",
              gap: "6px",
            }}
          >
            {/* Left: 2 scroll links */}
            <NavScrollLink href="/about" label="About" isRoute />
            <NavScrollLink href="/elements" label="Elements" isRoute />

            {/* Center gap — exactly wide enough so the orb doesn't overlap the icons */}
            <div style={{ width: "72px", flexShrink: 0 }} />

            {/* Right: 2 scroll links */}
            <NavScrollLink href="/grimoire" label="Grimoire" isRoute />
            <NavScrollLink href="/learn" label="How It Works" isRoute />
          </div>

          {/* Logo orb — sits on top of the pill, centered, non-interactive for the pill row */}
          <Link
            to="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full animate-breathing group"
            style={{
              width: "60px",
              height: "60px",
              background: "#1D1D1B",
              border: "4px solid color-mix(in oklab, var(--color-slate-sunken) 100%, transparent)",
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--color-wraith) 55%, transparent), 0 0 28px -4px color-mix(in oklab, var(--color-wraith) 70%, transparent), 0 0 50px -10px color-mix(in oklab, var(--color-wraith) 40%, transparent)",
              flexShrink: 0,
            }}
          >
            <img
              src="/images/logo-outline.png"
              alt="AlcheMix"
              style={{ width: "36px", height: "36px", objectFit: "contain", filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-wraith) 80%, transparent))" }}
            />
            <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[9px] tracking-[0.2em] uppercase text-spectral/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              AlcheMix
            </span>
          </Link>

        </div>
      </header>

      {/* HERO — parallax */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24"
        style={{ cursor: "none" }}
      >
        {/* Half-circle gradient rising from the bottom */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 70% at 50% 110%, color-mix(in oklab, var(--color-wraith) 30%, transparent) 0%, color-mix(in oklab, var(--color-violet-deep) 18%, transparent) 45%, transparent 70%)",
          }}
        />

        {/* Floating crystals + gold magnifying lens with zoom */}
        <CrystalLens />

        {/* Foreground copy */}
        <div
          className="relative z-20 mx-auto max-w-4xl px-6 text-center"
          style={{ transform: `translateY(${y * -0.4}px)`, opacity: Math.max(0, 1 - y / 600) }}
        >
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            Where <span className="aurora-gradient animate-aurora">Elements</span>
            <br /> Whisper Their <span className="text-wraith text-glow-violet">Secrets.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-parchment leading-relaxed">
            AlcheMix AR is an augmented reality chemistry platform designed for
            secondary and tertiary education. Students interact with molecular structures
            in 3D, conduct guided experiments, and build evidence-based understanding
            — while educators track every step of the journey in real time.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-arcane btn-arcane-hover">
              <FlaskConical className="h-4 w-4" /> Start Learning
            </Link>
            <a href="#sandbox" className="btn-ghost-arcane">
              <ScrollText className="h-4 w-4" /> Explore Features
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-xs tracking-[0.3em] text-gold/70 uppercase animate-breathing">
          Descend ▾
        </div>
      </section> 

      {/* ── SECTION 1: Hook — molecule canvas backdrop ── */}
      <section className="relative z-10 py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <MoleculeCanvas />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, var(--color-mist) 0%, transparent 20%, transparent 80%, var(--color-mist) 100%)" }} />
        <Reveal className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-4">The Problem We Solve</p>
          <h2 className="font-display text-4xl md:text-5xl mb-6">
            Chemistry is invisible.<br />
            <span className="text-wraith text-glow-violet">We make it tangible.</span>
          </h2>
          <p className="text-parchment max-w-2xl mx-auto leading-relaxed text-lg">
            Atoms, bonds, and reactions happen at a scale the human eye can't observe. AlcheMix AR
            overlays molecular structures into your physical world through augmented reality —
            turning abstract concepts into something you can rotate, inspect, and actually understand.
          </p>
        </Reveal>
      </section>

      {/* ── SECTION 2: Three pillars with orbit rings ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">Three Pillars</p>
            <h2 className="font-display text-4xl md:text-5xl">What AlcheMix AR is made of.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                color: "var(--color-wraith)",
                icon: <Atom className="h-7 w-7" />,
                title: "AR Visualisation",
                body: "Students point their device at a Grimoire card or open the sandbox and watch molecular structures materialise in 3D — in their hands, in their physical world.",
                detail: "Bonds, geometry, and orbital shells rendered live.",
              },
              {
                color: "var(--color-gold)",
                icon: <Eye className="h-7 w-7" />,
                title: "Educator Dashboard",
                body: "A live analytics panel gives teachers class-wide visibility — experiment attempts, accuracy rates, and per-student logs — all in real time, all in one place.",
                detail: "Identify struggling students before they fall behind.",
              },
              {
                color: "var(--color-emerald-elixir)",
                icon: <Camera className="h-7 w-7" />,
                title: "AI Evidence Journal",
                body: "Students photograph real-world chemistry and submit it. An AI vision model analyses each entry and logs a scientific judgment into a personal learning record.",
                detail: "Bridges classroom chemistry and the real world.",
              },
            ].map(({ color, icon, title, body, detail }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="rounded-2xl p-6 h-full flex flex-col group hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                    border: `1px solid color-mix(in oklab, ${color} 22%, transparent)`,
                    boxShadow: `0 0 40px -20px color-mix(in oklab, ${color} 35%, transparent)`,
                  }}>
                  <div className="mb-5 flex items-center justify-center">
                    <OrbitRing size={140} color={color} icon={<div style={{ color }}>{icon}</div>} />
                  </div>
                  <div className="h-0.5 w-12 mx-auto mb-5 rounded-full"
                    style={{ background: `color-mix(in oklab, ${color} 50%, transparent)` }} />
                  <h3 className="font-display text-xl text-center mb-3">{title}</h3>
                  <p className="text-parchment text-sm leading-relaxed text-center flex-1">{body}</p>
                  <p className="mt-4 text-center text-xs tracking-[0.2em] uppercase" style={{ color }}>{detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Students vs Educators ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">Built For Two Audiences</p>
            <h2 className="font-display text-4xl md:text-5xl">Two sides of the same lab.</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={0}>
              <div className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 75%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-wraith) 30%, transparent)",
                  boxShadow: "0 0 40px -16px color-mix(in oklab, var(--color-wraith) 40%, transparent)",
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse at 30% 20%, color-mix(in oklab, var(--color-wraith) 14%, transparent), transparent 65%)" }} />
                <div className="relative p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full animate-breathing"
                      style={{ background: "color-mix(in oklab, var(--color-wraith) 15%, transparent)", border: "1.5px solid color-mix(in oklab, var(--color-wraith) 45%, transparent)" }}>
                      <GraduationCap className="h-6 w-6 text-wraith" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl">For Students</h3>
                      <p className="text-xs text-wraith tracking-[0.2em] uppercase mt-0.5">The Apprentice</p>
                    </div>
                  </div>
                  <p className="text-parchment text-sm leading-relaxed mb-6">
                    Explore the periodic table in a way no textbook can show you. Run reactions, forge elements
                    from base Grimoire cards, and submit real-world evidence to build a scientific journal.
                  </p>
                  <ul className="space-y-2.5 mb-7">
                    {["Scan Grimoire cards to reveal 3D AR models","Forge elements by combining base cards","Submit photo evidence for AI-graded analysis","Track your learning through a personal journal"].map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-parchment/85">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-wraith flex-shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                  <Link to="/elements" className="btn-arcane btn-arcane-hover text-sm">
                    <Atom className="h-4 w-4" /> Explore Elements
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 75%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
                  boxShadow: "0 0 40px -16px color-mix(in oklab, var(--color-gold) 30%, transparent)",
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse at 70% 20%, color-mix(in oklab, var(--color-gold) 10%, transparent), transparent 65%)" }} />
                <div className="relative p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full animate-breathing"
                      style={{ background: "color-mix(in oklab, var(--color-gold) 15%, transparent)", border: "1.5px solid color-mix(in oklab, var(--color-gold) 45%, transparent)" }}>
                      <Eye className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl">For Educators</h3>
                      <p className="text-xs text-gold tracking-[0.2em] uppercase mt-0.5">The Astrolabe</p>
                    </div>
                  </div>
                  <p className="text-parchment text-sm leading-relaxed mb-6">
                    See exactly where every student stands — in real time, across the whole class.
                    Monitor experiment attempts, accuracy scores, and evidence submissions in one dashboard.
                  </p>
                  <ul className="space-y-2.5 mb-7">
                    {["Real-time class-wide analytics dashboard","Per-student experiment and accuracy logs","Evidence journal entries visible to educators","Exportable curriculum-aligned reports"].map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-parchment/85">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                  <Link to="/app" className="btn-ghost-arcane text-sm">
                    <Eye className="h-4 w-4" /> View Dashboard
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Elements intro + Three.js crystal ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Main Stage</p>
              <h2 className="font-display text-4xl mb-6">
                118 elements.<br />
                <span className="text-wraith text-glow-violet">All waiting to be forged.</span>
              </h2>
              <p className="text-parchment leading-relaxed mb-5">
                The periodic table is the foundation of everything AlcheMix AR is built on.
                Every element has its own story — an electron shell diagram, a category, a set of
                chemical behaviours that make it unique.
              </p>
              <p className="text-parchment leading-relaxed mb-8">
                You start with 12 physical Grimoire cards: the base elements. From there, every
                combination you attempt in the Reaction Sandbox can unlock a new element — building
                your collection one discovery at a time.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {[
                  { sym: "H",  c: "#60a5fa" },{ sym: "O",  c: "#f87171" },
                  { sym: "C",  c: "#a3a3a3" },{ sym: "N",  c: "#93c5fd" },
                  { sym: "Fe", c: "#a78bfa" },{ sym: "Au", c: "#fbbf24" },
                  { sym: "Na", c: "#f87171" },{ sym: "Cl", c: "#4ade80" },
                  { sym: "Ca", c: "#fb923c" },{ sym: "U",  c: "#4ade80" },
                  { sym: "Pt", c: "#e2e8f0" },{ sym: "Pu", c: "#fb7185" },
                ].map(({ sym, c }, i) => (
                  <div key={sym} className="flex items-center justify-center rounded-lg font-display text-sm animate-breathing"
                    style={{
                      width: 44, height: 44,
                      background: `radial-gradient(circle at 35% 35%, color-mix(in oklab, ${c} 60%, white 15%), color-mix(in oklab, ${c} 30%, transparent))`,
                      border: `1.5px solid color-mix(in oklab, ${c} 50%, transparent)`,
                      boxShadow: `0 0 12px -3px ${c}`, color: "white",
                      animationDelay: `${i * 0.22}s`, animationDuration: `${2.4 + (i % 4) * 0.4}s`,
                    }}>{sym}</div>
                ))}
                <div className="flex items-center justify-center rounded-lg text-xs text-parchment/60 border border-parchment/20"
                  style={{ width: 44, height: 44 }}>+106</div>
              </div>
              <Link to="/elements" className="btn-arcane btn-arcane-hover">
                <Atom className="h-4 w-4" /> Browse the Elements
              </Link>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative rounded-2xl overflow-hidden"
                style={{
                  background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 40%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))",
                  border: "1px solid color-mix(in oklab, var(--color-wraith) 30%, transparent)",
                  boxShadow: "0 0 60px -20px color-mix(in oklab, var(--color-wraith) 50%, transparent)",
                  minHeight: "420px",
                }}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[0.85, 0.65, 0.45].map((s, i) => (
                    <div key={i} className="absolute rounded-full border border-wraith/10"
                      style={{ width: `${s*100}%`, height: `${s*100}%`, animation: `float-slow ${7+i*2}s ease-in-out infinite`, animationDelay: `${i*1.2}s` }} />
                  ))}
                </div>
                <BohrModel3D
                  electrons="2,8,18,32,18,1"
                  color="#a78bfa"
                  nucleusColor="#fbbf24"
                  label="Au"
                />
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[10px] tracking-[0.35em] uppercase text-wraith/60">✦ Gold · Au · 79 ✦</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: How it works — 4-step journey ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Journey</p>
            <h2 className="font-display text-4xl md:text-5xl">From card to discovery.</h2>
          </Reveal>
          <div className="relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px"
              style={{ background: "linear-gradient(90deg, var(--color-wraith), var(--color-gold), var(--color-amber-scry), var(--color-emerald-elixir))" }} />
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { n: "01", color: "var(--color-wraith)",        icon: <BookOpen className="h-5 w-5" />,    title: "Get the Grimoire",   body: "Receive your physical card set of 12 base elements from your educator." },
                { n: "02", color: "var(--color-gold)",          icon: <Atom className="h-5 w-5" />,        title: "Scan a Card",        body: "Point the app camera at any Grimoire card to reveal its 3D AR molecular model." },
                { n: "03", color: "var(--color-amber-scry)",    icon: <FlaskConical className="h-5 w-5" />,title: "Forge New Elements", body: "Combine base elements in the Reaction Sandbox to discover and unlock compounds." },
                { n: "04", color: "var(--color-emerald-elixir)",icon: <Camera className="h-5 w-5" />,      title: "Submit Evidence",    body: "Photograph real-world chemistry and get instant AI-graded scientific feedback." },
              ].map(({ n, color, icon, title, body }, i) => (
                <Reveal key={n} delay={i * 100}>
                  <div className="relative pt-2 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full z-10 animate-breathing"
                        style={{
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`,
                          boxShadow: `0 0 20px -4px color-mix(in oklab, ${color} 45%, transparent)`,
                          color,
                        }}>{icon}</div>
                    </div>
                    <div className="font-display text-xs tracking-[0.3em] uppercase mb-1" style={{ color }}>{n}</div>
                    <h3 className="font-display text-base mb-2">{title}</h3>
                    <p className="text-parchment text-xs leading-relaxed">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Tools preview ── */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center mb-14">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">What's Inside</p>
            <h2 className="font-display text-4xl md:text-5xl">Three tools. One platform.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Atom className="h-7 w-7" />, label: "Element Explorer", desc: "All 118 elements, colour-coded by category. Bohr model diagrams, electron shells, and curated facts — filterable and searchable.", tag: "Guest Access", tagColor: "var(--color-wraith)", to: "/elements", btnLabel: "Explore Now" },
              { icon: <BookMarked className="h-7 w-7" />, label: "Grimoire Cards", desc: "A physical card set of the 12 essential base elements — each one AR-scannable, unlocking 3D molecular models. The remaining 106 elements must be forged.", tag: "Physical + Digital", tagColor: "var(--color-gold)", to: "/grimoire", btnLabel: "View Collection" },
              { icon: <Zap className="h-7 w-7" />, label: "The Platform", desc: "The full AlcheMix experience — Reaction Sandbox, Educator Astrolabe, and AI Evidence Journal, all in one AR-powered web app.", tag: "Full Platform", tagColor: "var(--color-emerald-elixir)", to: "/app", btnLabel: "Open Platform" },
            ].map(({ icon, label, desc, tag, tagColor, to, btnLabel }) => (
              <Reveal key={label}>
                <div className="group flex flex-col rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 h-full"
                  style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: `1px solid color-mix(in oklab, ${tagColor} 20%, transparent)` }}>
                  <div className="h-1.5" style={{ background: tagColor }} />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <span style={{ color: tagColor }}>{icon}</span>
                      <span className="text-[9px] tracking-[0.25em] uppercase rounded-full px-2.5 py-0.5"
                        style={{ color: tagColor, background: `color-mix(in oklab, ${tagColor} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${tagColor} 30%, transparent)` }}>{tag}</span>
                    </div>
                    <h3 className="font-display text-xl mb-3">{label}</h3>
                    <p className="text-parchment text-sm leading-relaxed flex-1">{desc}</p>
                    <Link to={to as any} className="mt-6 inline-flex items-center gap-2 text-sm font-display tracking-[0.1em] transition-all duration-200" style={{ color: tagColor }}
                      onMouseEnter={e => (e.currentTarget.style.gap = "10px")}
                      onMouseLeave={e => (e.currentTarget.style.gap = "8px")}>
                      {btnLabel} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Molecule canvas divider ── */}
      <section className="relative z-10 h-52 overflow-hidden">
        <div className="absolute inset-0 opacity-30"><MoleculeCanvas color="var(--color-gold)" /></div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--color-mist), transparent 30%, transparent 70%, var(--color-mist))" }} />
        <div className="relative z-10 h-full flex items-center justify-center">
          <p className="font-display text-xl text-gold/70 tracking-[0.4em] uppercase animate-breathing">✦ Every element tells a story ✦</p>
        </div>
      </section>

      {/* ── SECTION 7: Credibility strip ── */}
      <section className="relative z-10 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-px md:grid-cols-3 rounded-2xl overflow-hidden"
            style={{ border: "1px solid color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}>
            {[
              { stat: "118", label: "Elements in the explorer", sub: "Every element on the periodic table" },
              { stat: "3D AR", label: "Molecular visualisation", sub: "Rendered in your physical space" },
              { stat: "AI-Graded", label: "Evidence submissions", sub: "Instant feedback on real-world samples" },
            ].map(({ stat, label, sub }) => (
              <div key={stat} className="flex flex-col items-center gap-2 px-8 py-10 text-center"
                style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)" }}>
                <p className="font-display text-3xl text-wraith">{stat}</p>
                <p className="font-display text-sm text-spectral">{label}</p>
                <p className="text-xs text-parchment/60">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: Final CTA ── */}
      <section className="relative overflow-hidden py-32 z-10">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--color-wraith) 18%, transparent), transparent 60%)" }} />
        <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-breathing" style={{ background: "var(--color-wraith)" }} />
            <Feather className="relative h-12 w-12 text-wraith animate-float-slow" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl mb-6">
            Ready to see chemistry<br />
            <span className="aurora-gradient animate-aurora">come to life?</span>
          </h2>
          <p className="mx-auto max-w-xl text-parchment leading-relaxed mb-10">
            Start with the Element Explorer — no account needed. When you're ready for the full
            AR experience, open the platform and step into the lab.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/elements" className="btn-arcane btn-arcane-hover">
              <Atom className="h-4 w-4" /> Start with Elements
            </Link>
            <Link to="/app" className="btn-ghost-arcane">
              <Zap className="h-4 w-4" /> Open the Platform
            </Link>
          </div>
          <p className="mt-6 text-xs text-parchment/50 tracking-[0.2em] uppercase">
            Free to explore · No login required for the element browser
          </p>
        </Reveal>
      </section>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
// ── Crystal + Magnifying Lens (hero canvas) ───────────────────────────────────

function drawCrystal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, rotation: number,
  color: string, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const pts: [number, number][] = [
    [0, -size], [size*0.55, -size*0.3], [size*0.55, size*0.5],
    [0, size*0.85], [-size*0.55, size*0.5], [-size*0.55, -size*0.3],
  ];
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 0.8;
  [[pts[0], pts[2]], [pts[0], pts[4]], [pts[3], pts[1]], [pts[3], pts[5]]].forEach(([a, b]) => {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  });
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

const CRYSTAL_COLORS = [
  "rgba(168,85,247,0.55)",
  "rgba(99,102,241,0.55)",
  "rgba(45,212,191,0.45)",
  "rgba(212,175,55,0.45)",
  "rgba(236,72,153,0.40)",
];

interface Crystal {
  x: number; y: number; size: number;
  rot: number; rotSpeed: number;
  vy: number; vx: number;
  color: string; alpha: number;
}

function CrystalLens() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const target = useRef({ x: -999, y: -999 });
  const pos = useRef({ x: -999, y: -999 });
  const isInside = useRef(false);
  const isPressed = useRef(false);
  const zoomScale = useRef(1);
  const crystals = useRef<Crystal[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    offscreenRef.current = off;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      off.width = canvas.width;
      off.height = canvas.height;
      crystals.current = Array.from({ length: 14 }, () => spawnCrystal(canvas.width, canvas.height, true));
    };
    resize();
    window.addEventListener("resize", resize);

    function spawnCrystal(w: number, h: number, anywhere = false): Crystal {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 60,
        size: 18 + Math.random() * 32,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.012,
        vy: -(0.15 + Math.random() * 0.35),
        vx: (Math.random() - 0.5) * 0.18,
        color: CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)],
        alpha: 0.35 + Math.random() * 0.5,
      };
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      isInside.current = inside;
      if (inside) target.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onDown = (e: MouseEvent) => { if (e.button === 0) isPressed.current = true; };
    const onUp = (e: MouseEvent) => { if (e.button === 0) isPressed.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const R = 42, BORDER = 4, HANDLE_LEN = 30, HANDLE_W = 7;
    const ANGLE = Math.PI / 4, ZOOM_MAX = 2.8, ZOOM_SPEED = 0.12;

    function drawGlass(tgt: CanvasRenderingContext2D, x: number, y: number, r: number, zoom: number, offscreen: HTMLCanvasElement) {
      tgt.save();
      if (zoom > 1.02) {
        tgt.save();
        tgt.beginPath(); tgt.arc(x, y, r - BORDER / 2, 0, Math.PI * 2); tgt.clip();
        const srcR = r / zoom;
        tgt.drawImage(offscreen, x - srcR, y - srcR, srcR * 2, srcR * 2, x - r, y - r, r * 2, r * 2);
        tgt.restore();
      } else {
        tgt.beginPath(); tgt.arc(x, y, r, 0, Math.PI * 2);
        tgt.fillStyle = "rgba(212,175,55,0.05)"; tgt.fill();
      }
      tgt.beginPath(); tgt.arc(x, y, r + BORDER / 2, 0, Math.PI * 2);
      tgt.strokeStyle = zoom > 1.5 ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.28)";
      tgt.lineWidth = BORDER + 8; tgt.stroke();
      const lg = tgt.createLinearGradient(x - r, y - r, x + r, y + r);
      lg.addColorStop(0, "#f5e17a"); lg.addColorStop(0.5, "#d4af37"); lg.addColorStop(1, "#a07820");
      tgt.beginPath(); tgt.arc(x, y, r, 0, Math.PI * 2);
      tgt.strokeStyle = lg; tgt.lineWidth = BORDER; tgt.stroke();
      tgt.beginPath(); tgt.arc(x, y, r - BORDER, Math.PI * 1.1, Math.PI * 1.6);
      tgt.strokeStyle = "rgba(255,245,180,0.5)"; tgt.lineWidth = 1.5; tgt.stroke();
      const hx1 = x + Math.cos(ANGLE) * (r - 2), hy1 = y + Math.sin(ANGLE) * (r - 2);
      const hx2 = x + Math.cos(ANGLE) * (r + HANDLE_LEN), hy2 = y + Math.sin(ANGLE) * (r + HANDLE_LEN);
      tgt.beginPath(); tgt.moveTo(hx1, hy1); tgt.lineTo(hx2, hy2);
      tgt.strokeStyle = "rgba(212,175,55,0.25)"; tgt.lineWidth = HANDLE_W + 6; tgt.lineCap = "round"; tgt.stroke();
      const hg = tgt.createLinearGradient(hx1, hy1, hx2, hy2);
      hg.addColorStop(0, "#f5e17a"); hg.addColorStop(0.4, "#d4af37"); hg.addColorStop(1, "#7a5c10");
      tgt.beginPath(); tgt.moveTo(hx1, hy1); tgt.lineTo(hx2, hy2);
      tgt.strokeStyle = hg; tgt.lineWidth = HANDLE_W; tgt.lineCap = "round"; tgt.stroke();
      tgt.beginPath(); tgt.arc(hx2, hy2, HANDLE_W / 2 + 1, 0, Math.PI * 2);
      tgt.fillStyle = "#a07820"; tgt.fill();
      tgt.restore();
    }

    const BOND_LABELS = ["H₂O","NaCl","CO₂","O₂","H₂","Fe","Au","Na","He","Ca","NH₃","CH₄","HCl","KBr","Mg"];

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      const offCtx = off.getContext("2d")!;
      zoomScale.current += ((isPressed.current ? ZOOM_MAX : 1) - zoomScale.current) * ZOOM_SPEED;
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;
      offCtx.clearRect(0, 0, w, h);
      const cs = crystals.current;
      for (const c of cs) {
        c.rot += c.rotSpeed; c.x += c.vx; c.y += c.vy;
        if (c.y < -80) {
          const nc = spawnCrystal(w, h, false);
          Object.assign(c, nc);
        }
      }
      for (let i = 0; i < cs.length; i++) {
        for (let j = i + 1; j < cs.length; j++) {
          const dx = cs[j].x - cs[i].x, dy = cs[j].y - cs[i].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) {
            const strength = 1 - dist / 180;
            offCtx.beginPath(); offCtx.moveTo(cs[i].x, cs[i].y); offCtx.lineTo(cs[j].x, cs[j].y);
            offCtx.strokeStyle = `rgba(168,130,255,${strength * 0.75})`; offCtx.lineWidth = strength * 2.5; offCtx.stroke();
            offCtx.beginPath(); offCtx.arc(cs[i].x, cs[i].y, 2.5 * strength, 0, Math.PI * 2);
            offCtx.fillStyle = `rgba(212,175,55,${strength * 0.9})`; offCtx.fill();
            if (strength > 0.35) {
              const mx = (cs[i].x + cs[j].x) / 2, my = (cs[i].y + cs[j].y) / 2;
              const label = BOND_LABELS[(i * 3 + j * 7) % BOND_LABELS.length];
              offCtx.font = `600 9px "EB Garamond", serif`;
              const bw = offCtx.measureText(label).width + 8, bh = 13;
              offCtx.save(); offCtx.globalAlpha = strength * 0.85;
              offCtx.beginPath(); offCtx.roundRect(mx - bw/2, my - bh/2, bw, bh, 3);
              offCtx.fillStyle = "rgba(18,10,49,0.82)"; offCtx.fill();
              offCtx.strokeStyle = `rgba(168,130,255,${strength * 0.6})`; offCtx.lineWidth = 0.8; offCtx.stroke();
              offCtx.fillStyle = `rgba(212,175,55,${strength})`; offCtx.textAlign = "center"; offCtx.textBaseline = "middle";
              offCtx.fillText(label, mx, my); offCtx.restore();
            }
          }
        }
      }
      for (const c of cs) drawCrystal(offCtx, c.x, c.y, c.size, c.rot, c.color, c.alpha);
      ctx.clearRect(0, 0, w, h); ctx.drawImage(off, 0, 0);
      if (isInside.current || pos.current.x > 0) drawGlass(ctx, pos.current.x, pos.current.y, R, zoomScale.current, off);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-20 w-full h-full" style={{ pointerEvents: "none" }} />;
}

function NavScrollLink({ href, label, isRoute = false }: { href: string; label: string; isRoute?: boolean }) {
  const inner = (
    <>
      <ScrollText className="h-3.5 w-3.5 text-gold group-hover:text-spectral transition-colors duration-200" />
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10px] tracking-[0.15em] uppercase text-spectral opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "color-mix(in oklab, var(--color-mist) 90%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)" }}>
        {label}
      </span>
    </>
  );
  const sharedClass = "group relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:scale-110";
  const sharedStyle = { background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 20%, transparent)" };
  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-wraith) 55%, transparent)";
      (e.currentTarget as HTMLElement).style.boxShadow = "0 0 14px -4px color-mix(in oklab, var(--color-wraith) 50%, transparent)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--color-parchment) 20%, transparent)";
      (e.currentTarget as HTMLElement).style.boxShadow = "none";
    },
  };
  if (isRoute) return <Link to={href as any} className={sharedClass} style={sharedStyle} {...hoverHandlers}>{inner}</Link>;
  return <a href={href} className={sharedClass} style={sharedStyle} {...hoverHandlers}>{inner}</a>;
}


