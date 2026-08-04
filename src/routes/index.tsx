import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onAuthChange } from "../lib/auth";
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
import { FloatingNav } from "../components/FloatingNav";

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

// ── Base element data ─────────────────────────────────────────────────────────
const BASE_ELEMENTS = [
  { sym:"H",  name:"Hydrogen",  num:1,  electrons:"1",          c:"#60a5fa", nc:"#93c5fd" },
  { sym:"O",  name:"Oxygen",    num:8,  electrons:"2,6",        c:"#f87171", nc:"#fca5a5" },
  { sym:"C",  name:"Carbon",    num:6,  electrons:"2,4",        c:"#a3a3a3", nc:"#d4d4d4" },
  { sym:"N",  name:"Nitrogen",  num:7,  electrons:"2,5",        c:"#93c5fd", nc:"#bfdbfe" },
  { sym:"Fe", name:"Iron",      num:26, electrons:"2,8,14,2",   c:"#a78bfa", nc:"#c4b5fd" },
  { sym:"Au", name:"Gold",      num:79, electrons:"2,8,18,32,18,1", c:"#fbbf24", nc:"#fde68a" },
  { sym:"Na", name:"Sodium",    num:11, electrons:"2,8,1",      c:"#f87171", nc:"#fca5a5" },
  { sym:"Cl", name:"Chlorine",  num:17, electrons:"2,8,7",      c:"#4ade80", nc:"#86efac" },
  { sym:"Ca", name:"Calcium",   num:20, electrons:"2,8,8,2",    c:"#fb923c", nc:"#fdba74" },
  { sym:"U",  name:"Uranium",   num:92, electrons:"2,8,18,32,21,9,2", c:"#4ade80", nc:"#6ee7b7" },
  { sym:"Mg", name:"Magnesium", num:12, electrons:"2,8,2",      c:"#34d399", nc:"#6ee7b7" },
  { sym:"S",  name:"Sulfur",    num:16, electrons:"2,8,6",      c:"#facc15", nc:"#fde68a" },
];

// The AlcheMix signature element — a fictional "brand atom" for the hero.
// 6 protons, electron shells 2,4 — it spins on its own.
const ALCHEMIX_ELEMENT = {
  sym: "Ax",
  name: "AlcheMix",
  protons: 6,
  electrons: "2,4",
  color: "#2dd4bf",        // teal — primary
  nucleusColor: "#a855f7", // violet — secondary
};

// ── Shared selected-element state (lifted so both components share it) ─────
import { createContext, useContext } from "react";
const ElementCtx = createContext<{
  selected: typeof BASE_ELEMENTS[0];
  setSelected: (e: typeof BASE_ELEMENTS[0]) => void;
}>({ selected: BASE_ELEMENTS[5], setSelected: () => {} });

function ElementSelector() {
  const { selected, setSelected } = useContext(ElementCtx);
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {BASE_ELEMENTS.map((el, i) => {
          const isActive = selected.sym === el.sym;
          return (
            <button
              key={el.sym}
              onClick={() => setSelected(el)}
              className="relative flex items-center justify-center rounded-lg font-display text-sm transition-all duration-200 hover:scale-110"
              style={{
                width: 44, height: 44,
                background: `radial-gradient(circle at 35% 35%, color-mix(in oklab, ${el.c} ${isActive ? 80 : 55}%, white 15%), color-mix(in oklab, ${el.c} ${isActive ? 50 : 25}%, transparent))`,
                border: `${isActive ? "2px" : "1.5px"} solid color-mix(in oklab, ${el.c} ${isActive ? 90 : 45}%, transparent)`,
                boxShadow: isActive ? `0 0 20px -2px ${el.c}, 0 0 40px -8px ${el.c}` : `0 0 8px -4px ${el.c}`,
                color: "white",
                animationDelay: `${i * 0.22}s`,
              }}
              aria-label={el.name}
              aria-pressed={isActive}
            >
              {el.sym}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                  style={{ background: el.c, boxShadow: `0 0 6px 2px ${el.c}` }} />
              )}
            </button>
          );
        })}
        <div className="flex items-center justify-center rounded-lg text-xs text-parchment/50 border border-parchment/20"
          style={{ width: 44, height: 44 }}>+30</div>
      </div>
      <Link to="/elements" className="btn-arcane btn-arcane-hover">
        <Atom className="h-4 w-4" /> Browse All Elements
      </Link>
    </>
  );
}

function BohrModelPanel() {
  const { selected } = useContext(ElementCtx);
  return (
    <div className="atom-stage-panel relative rounded-2xl overflow-hidden"
      style={{
        border: `1px solid color-mix(in oklab, ${selected.c} 35%, transparent)`,
        boxShadow: `0 0 60px -20px color-mix(in oklab, ${selected.c} 45%, transparent)`,
        minHeight: "420px",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}>
      {/* Background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0.85, 0.65, 0.45].map((s, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: `${s * 100}%`, height: `${s * 100}%`,
              border: `1px solid color-mix(in oklab, ${selected.c} 12%, transparent)`,
              animation: `float-slow ${7 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.2}s`,
              transition: "border-color 0.4s",
            }} />
        ))}
      </div>

      {/* Re-mount the model when element changes by using sym as key */}
      <BohrModel3D
        key={selected.sym}
        electrons={selected.electrons}
        color={selected.c}
        nucleusColor={selected.nc}
        label={selected.sym}
      />

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-center pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, color-mix(in oklab, #0b1220 80%, transparent))" }}>
        <span className="font-display text-lg" style={{ color: selected.c }}>{selected.sym}</span>
        <span className="text-white/60 text-xs ml-2 tracking-[0.2em] uppercase">{selected.name} · {selected.num}p</span>
      </div>
    </div>
  );
}

function Landing() {
  const [selectedEl, setSelectedEl] = useState(BASE_ELEMENTS[5]); // Gold default
  const y = useScrollY();
  const heroRef = useRef<HTMLDivElement>(null);

  // Signed-in students skip the marketing page and go straight to the dashboard.
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => onAuthChange((u) => {
    if (u) navigate({ to: "/app" });
    else setAuthReady(true);
  }), [navigate]);

  const heroEl = ALCHEMIX_ELEMENT;

  // Hold the page until we know whether to redirect — avoids flashing the
  // landing to a logged-in student before the bounce to /app.
  if (!authReady) {
    return <div className="bg-arcane min-h-screen flex items-center justify-center">
      <FlaskConical className="h-8 w-8 text-teal animate-spin" />
    </div>;
  }

  return (
    <ElementCtx.Provider value={{ selected: selectedEl, setSelected: setSelectedEl }}>
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      {/* Starfield */}
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-70" />

      {/* Floating Pill Nav (shared across the app) */}
      <FloatingNav />

      {/* HERO — living atom */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16"
      >
        {/* Single ambient glow behind the atom */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 85% 65% at 62% 52%, color-mix(in oklab, ${heroEl.color} 20%, transparent) 0%, color-mix(in oklab, var(--color-wraith) 10%, transparent) 45%, transparent 70%)`,
          }}
        />

        <div className="relative z-20 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-2 md:gap-10">
          {/* Left — copy */}
          <div
            className="order-2 text-center md:order-1 md:text-left"
            style={{ transform: `translateY(${y * -0.25}px)`, opacity: Math.max(0, 1 - y / 700) }}
          >
            <h1 className="font-display text-5xl leading-[1.05] md:text-6xl lg:text-7xl">
              Where <span className="aurora-gradient animate-aurora">Elements</span>
              <br /> Whisper Their <span className="text-wraith text-glow-violet">Secrets.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-parchment md:mx-0">
              An augmented-reality chemistry platform for secondary and tertiary
              education. Students turn, inspect, and forge molecular structures in 3D —
              while educators track every step in real time.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Link to="/app" className="btn-arcane btn-arcane-hover">
                <FlaskConical className="h-4 w-4" /> Start Learning
              </Link>
              <a href="#discover" className="btn-ghost-arcane">
                <ScrollText className="h-4 w-4" /> Explore Features
              </a>
            </div>
          </div>

          {/* Right — the AlcheMix signature atom (spins on its own, drag to spin) */}
          <div
            className="order-1 relative flex items-center justify-center md:order-2"
            style={{ transform: `translateY(${y * -0.1}px)` }}
          >
            {/* Faint orbital rings behind the atom */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {[1, 0.78].map((s, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `min(${s * 100}%, ${s * 500}px)`,
                    aspectRatio: "1",
                    border: `1px solid color-mix(in oklab, ${heroEl.color} ${14 - i * 5}%, transparent)`,
                  }}
                />
              ))}
            </div>

            <div className="relative w-full max-w-[460px]">
              {/* Dark stage so the luminous atom reads on the light-mode page.
                  Invisible (transparent) in dark mode — the night sky is stage enough. */}
              <div
                className="atom-stage-orb pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: "min(116%, 520px)", aspectRatio: "1" }}
              />
              <div className="relative h-[380px] md:h-[480px]">
                <BohrModel3D
                  interactive
                  tumble
                  electrons={heroEl.electrons}
                  color={heroEl.color}
                  nucleusColor={heroEl.nucleusColor}
                  label={heroEl.sym}
                />
              </div>

              {/* Element caption */}
              <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
                <div className="font-display text-2xl" style={{ color: heroEl.color }}>{heroEl.name}</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-parchment/70">
                  The AlcheMix Element · {heroEl.protons} protons
                </div>
              </div>

              {/* Interaction hint */}
              <div className="pointer-events-none absolute right-1 top-1 text-[9px] uppercase tracking-[0.2em] text-parchment/50">
                drag to spin ⟳
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-[10px] tracking-[0.3em] text-gold/70 uppercase">
          Scroll to explore ▾
        </div>
      </section>

      {/* ── SECTION 1: Hook — molecule canvas backdrop ── */}
      <section id="discover" className="relative z-10 py-24 overflow-hidden">
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

      {/* ── SECTION 4: Elements intro + Bohr model ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Main Stage</p>
              <h2 className="font-display text-4xl mb-6">
                42 elements.<br />
                <span className="text-wraith text-glow-violet">All waiting to be forged.</span>
              </h2>
              <p className="text-parchment leading-relaxed mb-5">
                The periodic table is the foundation of everything AlcheMix AR is built on.
                Every element has its own story — an electron shell diagram, a category, a set of
                chemical behaviours that make it unique.
              </p>
              <p className="text-parchment leading-relaxed mb-6">
                You start with 12 physical Grimoire cards: the base elements. From there, every
                combination you attempt in the Reaction Sandbox can unlock a new element — building
                your collection one discovery at a time.
              </p>

              {/* Interactive element selector */}
              <p className="text-[10px] tracking-[0.3em] text-parchment/50 uppercase mb-3">
                Select an element to preview its Bohr model →
              </p>
              <ElementSelector />
            </Reveal>

            {/* Bohr model panel — driven by ElementSelector state via context */}
            <Reveal delay={150}>
              <BohrModelPanel />
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
              { icon: <BookMarked className="h-7 w-7" />, label: "Grimoire Cards", desc: "A physical card set of the 12 essential base elements — each one AR-scannable, unlocking 3D molecular models. The remaining 30 elements must be forged.", tag: "Physical + Digital", tagColor: "var(--color-gold)", to: "/grimoire", btnLabel: "View Collection" },
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

      {/* ── Quiet divider ── */}
      <section className="relative z-10 py-16">
        <div className="mx-auto flex max-w-5xl items-center gap-5 px-6">
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, var(--color-border))" }} />
          <p className="font-display text-sm text-gold tracking-[0.35em] uppercase whitespace-nowrap">Every element tells a story</p>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--color-border), transparent)" }} />
        </div>
      </section>

      {/* ── SECTION 7: Credibility strip ── */}
      <section className="relative z-10 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-px md:grid-cols-3 rounded-2xl overflow-hidden"
            style={{ border: "1px solid color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}>
            {[
              { stat: "42", label: "Elements in the explorer", sub: "Every element on the periodic table" },
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
    </ElementCtx.Provider>
  );
}
