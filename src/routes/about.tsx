import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  FlaskConical, GraduationCap, Atom, Sparkles,
  BookOpen, Eye, Zap, Camera, ArrowRight,
} from "lucide-react";
import * as THREE from "three";
import { FloatingNav } from "../components/FloatingNav";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

// ── 3D Crystal (Three.js) ───────────────────────────────────────────────────
function CrystalThree() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Crystal geometry — stacked octahedrons for a multi-facet feel
    const geo = new THREE.OctahedronGeometry(1.5, 0);

    // Solid inner crystal — translucent violet
    const solidMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#7c3aed"),
      emissive: new THREE.Color("#4c1d95"),
      specular: new THREE.Color("#e9d5ff"),
      shininess: 120,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const solidMesh = new THREE.Mesh(geo, solidMat);
    scene.add(solidMesh);

    // Wireframe overlay — bright amethyst edges
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#a78bfa"),
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    wireMesh.scale.setScalar(1.01);
    scene.add(wireMesh);

    // Outer glow shell — larger, very transparent
    const glowGeo = new THREE.OctahedronGeometry(1.9, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#c4b5fd"),
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    // Lights
    const ambient = new THREE.AmbientLight(0x4c1d95, 1.2);
    scene.add(ambient);

    const pointA = new THREE.PointLight(0xa78bfa, 6, 12);
    pointA.position.set(3, 3, 3);
    scene.add(pointA);

    const pointB = new THREE.PointLight(0xd4af37, 3, 10);
    pointB.position.set(-3, -2, 2);
    scene.add(pointB);

    const pointC = new THREE.PointLight(0x60a5fa, 2.5, 8);
    pointC.position.set(0, -3, -2);
    scene.add(pointC);

    // Resize handler
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let frameId: number;
    let t = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.008;

      // Main spin + wobble
      solidMesh.rotation.y += 0.006;
      solidMesh.rotation.x = Math.sin(t * 0.7) * 0.25;
      solidMesh.rotation.z = Math.cos(t * 0.5) * 0.15;

      wireMesh.rotation.copy(solidMesh.rotation);
      wireMesh.rotation.y += 0.002; // slight offset from solid

      glowMesh.rotation.y -= 0.003;
      glowMesh.rotation.x = Math.cos(t * 0.4) * 0.2;

      // Pulsing glow
      const pulse = 0.85 + Math.sin(t * 1.6) * 0.15;
      solidMat.opacity = 0.45 + pulse * 0.15;
      pointA.intensity = 5 + pulse * 3;

      // Orbit the bright point light
      pointA.position.x = Math.sin(t) * 3.5;
      pointA.position.z = Math.cos(t) * 3.5;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ minHeight: "420px" }}
    />
  );
}

// ── Animated molecule node canvas ──────────────────────────────────────────
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
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 18 + Math.random() * 14,
      label: LABELS[i % LABELS.length],
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.r || n.x > canvas.width - n.r) n.vx *= -1;
        if (n.y < n.r || n.y > canvas.height - n.r) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 180) {
            const a = (1 - d / 180) * 0.55;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `color-mix(in oklab, ${color} ${Math.round(a*100)}%, transparent)`;
            ctx.lineWidth = (1 - d / 180) * 2;
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `color-mix(in oklab, ${color} 14%, transparent)`;
        ctx.fill();
        ctx.strokeStyle = `color-mix(in oklab, ${color} 45%, transparent)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = `color-mix(in oklab, ${color} 80%, transparent)`;
        ctx.font = `600 10px "EB Garamond", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={ref} className="w-full h-full" style={{ pointerEvents: "none" }} />;
}

// ── Electron orbit ring ─────────────────────────────────────────────────────
function OrbitRing({ size = 220, color = "var(--color-wraith)", icon }: {
  size?: number; color?: string; icon: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Rings */}
      {[0.95, 0.72, 0.50].map((scale, i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: size * scale, height: size * scale,
            borderColor: `color-mix(in oklab, ${color} ${25 - i * 6}%, transparent)`,
            animation: `float-slow ${6 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      {/* Orbiting dot on outer ring */}
      <div className="absolute" style={{ width: size * 0.95, height: size * 0.95 }}>
        <div
          className="absolute h-2.5 w-2.5 rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            background: color,
            boxShadow: `0 0 10px 2px ${color}`,
            animation: "float-slow 6s linear infinite",
          }}
        />
      </div>
      {/* Glow pool */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, ${color} 18%, transparent), transparent 65%)` }} />
      {/* Center icon */}
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

// ── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
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

function AboutPage() {
  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="animate-drift absolute h-1 w-1 rounded-full"
            style={{
              top: `${(i * 43) % 100}%`,
              animationDelay: `${i * 1.4}s`,
              animationDuration: `${20 + (i % 5) * 3}s`,
              background: i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)",
              boxShadow: `0 0 10px ${i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)"}`,
            }} />
        ))}
      </div>

      <FloatingNav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-bleed molecule canvas behind copy */}
        <div className="absolute inset-0 z-0 opacity-40">
          <MoleculeCanvas />
        </div>
        <div className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(ellipse 100% 70% at 50% 60%, color-mix(in oklab, var(--color-wraith) 22%, transparent), transparent 65%)" }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-wraith/30 bg-wraith/10 px-4 py-1.5 text-xs tracking-[0.3em] text-wraith uppercase mb-8">
              <Sparkles className="h-3 w-3" /> About AlcheMix AR
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-display text-5xl md:text-7xl mb-6 leading-tight">
              Chemistry Education,<br />
              <span className="aurora-gradient animate-aurora">Reimagined.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto max-w-2xl text-lg text-parchment leading-relaxed">
              AlcheMix AR is a learning platform that makes chemistry tangible. Instead of reading
              about molecules, you see them — in your physical space, in 3D, responding to your hands.
            </p>
          </Reveal>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-xs tracking-[0.3em] text-gold/60 uppercase animate-breathing">
          Descend ▾
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="relative z-10 py-28">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Problem</p>
            <h2 className="font-display text-4xl mb-6">Chemistry is invisible.<br />Until now.</h2>
            <p className="text-parchment leading-relaxed mb-4">
              Atoms, bonds, and reactions happen at a scale the human eye can't observe. For decades,
              students have been asked to imagine what they cannot see — relying on flat diagrams and
              static textbooks to build understanding of something fundamentally three-dimensional.
            </p>
            <p className="text-parchment leading-relaxed">
              AlcheMix AR changes the relationship between student and science. By overlaying
              molecular structures onto the real world through augmented reality, abstract concepts
              become physical, rotatable, and genuinely understandable.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="flex items-center justify-center">
              <OrbitRing size={260} icon={<Atom className="h-8 w-8" />} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── THREE PILLARS with orbit visuals ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">Three Pillars</p>
            <h2 className="font-display text-4xl">What AlcheMix AR is made of.</h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                color: "var(--color-wraith)",
                icon: <Atom className="h-7 w-7" />,
                title: "AR Visualisation",
                body: "Students point their device at a Grimoire card or open the sandbox and watch molecular structures materialise in 3D — in their hands, at their desk, in their physical world.",
                detail: "Bonds, geometry, and orbital shells rendered live.",
              },
              {
                color: "var(--color-gold)",
                icon: <Eye className="h-7 w-7" />,
                title: "Educator Dashboard",
                body: "A live analytics panel gives teachers class-wide visibility: experiment attempts, accuracy rates, and per-student logs — all in real time, all in one place.",
                detail: "Identify struggling students before they fall behind.",
              },
              {
                color: "var(--color-emerald-elixir)",
                icon: <Camera className="h-7 w-7" />,
                title: "AI Evidence Journal",
                body: "Students photograph real-world chemistry — rust, crystals, household materials — and submit it. An AI vision model analyses each entry and logs a scientific judgment.",
                detail: "Bridges classroom chemistry and the real world.",
              },
            ].map(({ color, icon, title, body, detail }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div
                  className="rounded-2xl p-6 h-full flex flex-col group hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                    border: `1px solid color-mix(in oklab, ${color} 22%, transparent)`,
                    boxShadow: `0 0 40px -20px color-mix(in oklab, ${color} 35%, transparent)`,
                  }}
                >
                  <div className="mb-5 flex items-center justify-center">
                    <OrbitRing size={140} color={color} icon={<div style={{ color }}>{icon}</div>} />
                  </div>
                  <div className="h-0.5 w-12 mx-auto mb-5 rounded-full"
                    style={{ background: `color-mix(in oklab, ${color} 50%, transparent)` }} />
                  <h3 className="font-display text-xl text-center mb-3">{title}</h3>
                  <p className="text-parchment text-sm leading-relaxed text-center flex-1">{body}</p>
                  <p className="mt-4 text-center text-xs tracking-[0.2em] uppercase"
                    style={{ color }}>{detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">Designed For</p>
            <h2 className="font-display text-4xl">Two sides of the same lab.</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Students */}
            <Reveal delay={0}>
              <div className="relative rounded-2xl overflow-hidden group"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-wraith) 28%, transparent)",
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse at 20% 20%, color-mix(in oklab, var(--color-wraith) 14%, transparent), transparent 60%)" }} />
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
                  <p className="text-parchment leading-relaxed mb-6 text-sm">
                    Explore the periodic table in a way no textbook can show you. Run reactions
                    in the sandbox, forge new elements from base cards, and submit real-world evidence
                    to build a scientific journal that's actually yours.
                  </p>
                  <ul className="space-y-2.5 mb-7">
                    {[
                      "Scan Grimoire cards to reveal 3D AR models",
                      "Forge elements by combining base cards in the sandbox",
                      "Submit photo evidence for AI-graded scientific analysis",
                      "Track your learning through a personal evidence journal",
                    ].map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-parchment/85">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-wraith flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link to="/elements" className="btn-arcane btn-arcane-hover text-sm">
                    <Atom className="h-4 w-4" /> Start Exploring
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Educators */}
            <Reveal delay={120}>
              <div className="relative rounded-2xl overflow-hidden group"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 72%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)",
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(ellipse at 80% 20%, color-mix(in oklab, var(--color-gold) 10%, transparent), transparent 60%)" }} />
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
                  <p className="text-parchment leading-relaxed mb-6 text-sm">
                    See exactly where every student stands — in real time, across the whole class.
                    The Educator's Astrolabe gives you a live view of experiment attempts, accuracy
                    scores, and evidence submissions so you can act before anyone falls behind.
                  </p>
                  <ul className="space-y-2.5 mb-7">
                    {[
                      "Real-time class-wide analytics dashboard",
                      "Per-student experiment attempt and accuracy logs",
                      "Evidence journal entries visible to educators",
                      "Exportable reports aligned to curriculum outcomes",
                    ].map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-parchment/85">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />
                        {b}
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

      {/* ── ELEMENTS INTRO + 3D CRYSTAL ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left — Elements intro */}
            <Reveal>
              <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Main Stage</p>
              <h2 className="font-display text-4xl mb-6">
                118 elements.<br />
                <span className="text-wraith text-glow-violet">All waiting to be forged.</span>
              </h2>
              <p className="text-parchment leading-relaxed mb-5">
                The periodic table is the foundation of everything AlcheMix AR is built on.
                Every element has its own story — an electron shell diagram, a category, a set
                of chemical behaviours that make it unique.
              </p>
              <p className="text-parchment leading-relaxed mb-8">
                You start with 12 physical Grimoire cards: the base elements. From there,
                every combination you attempt in the Reaction Sandbox can unlock a new element —
                building your collection one discovery at a time, until the full periodic table is yours.
              </p>

              {/* Mini element preview strip */}
              <div className="flex flex-wrap gap-2 mb-8">
                {[
                  { sym: "H",  color: "#60a5fa" },
                  { sym: "O",  color: "#f87171" },
                  { sym: "C",  color: "#a3a3a3" },
                  { sym: "N",  color: "#93c5fd" },
                  { sym: "Fe", color: "#a78bfa" },
                  { sym: "Au", color: "#fbbf24" },
                  { sym: "Na", color: "#f87171" },
                  { sym: "Cl", color: "#4ade80" },
                  { sym: "Ca", color: "#fb923c" },
                  { sym: "U",  color: "#4ade80" },
                  { sym: "Pt", color: "#e2e8f0" },
                  { sym: "Pu", color: "#fb7185" },
                ].map(({ sym, color }, i) => (
                  <div
                    key={sym}
                    className="flex items-center justify-center rounded-lg font-display text-sm animate-breathing"
                    style={{
                      width: 44, height: 44,
                      background: `radial-gradient(circle at 35% 35%, color-mix(in oklab, ${color} 60%, white 15%), color-mix(in oklab, ${color} 30%, transparent))`,
                      border: `1.5px solid color-mix(in oklab, ${color} 50%, transparent)`,
                      boxShadow: `0 0 12px -3px ${color}`,
                      color: "white",
                      animationDelay: `${i * 0.22}s`,
                      animationDuration: `${2.4 + (i % 4) * 0.4}s`,
                    }}
                  >
                    {sym}
                  </div>
                ))}
                <div
                  className="flex items-center justify-center rounded-lg text-xs text-parchment/60 border border-parchment/20"
                  style={{ width: 44, height: 44 }}
                >
                  +106
                </div>
              </div>

              <Link to="/elements" className="btn-arcane btn-arcane-hover">
                <Atom className="h-4 w-4" /> Browse the Elements
              </Link>
            </Reveal>

            {/* Right — Three.js crystal */}
            <Reveal delay={150}>
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 40%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))",
                  border: "1px solid color-mix(in oklab, var(--color-wraith) 30%, transparent)",
                  boxShadow: "0 0 60px -20px color-mix(in oklab, var(--color-wraith) 50%, transparent)",
                  minHeight: "420px",
                }}
              >
                {/* Glow rings behind the crystal */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[0.85, 0.65, 0.45].map((s, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full border border-wraith/10"
                      style={{
                        width: `${s * 100}%`,
                        height: `${s * 100}%`,
                        animation: `float-slow ${7 + i * 2}s ease-in-out infinite`,
                        animationDelay: `${i * 1.2}s`,
                      }}
                    />
                  ))}
                </div>
                <CrystalThree />
                {/* Bottom label */}
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[10px] tracking-[0.35em] uppercase text-wraith/60">
                    ✦ Arcane Crystal ✦
                  </span>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── JOURNEY FLOW — visual step strip ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Journey</p>
            <h2 className="font-display text-4xl">From card to discovery.</h2>
          </Reveal>

          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-6 top-8 bottom-8 w-px md:hidden"
              style={{ background: "linear-gradient(180deg, var(--color-wraith), var(--color-gold), var(--color-emerald-elixir))" }} />
            {/* Horizontal connector on desktop */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px"
              style={{ background: "linear-gradient(90deg, var(--color-wraith), var(--color-gold), var(--color-emerald-elixir))" }} />

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { n: "01", color: "var(--color-wraith)", icon: <BookOpen className="h-5 w-5" />, title: "Get the Grimoire", body: "Receive your physical card set of 12 base elements from your educator." },
                { n: "02", color: "var(--color-gold)", icon: <Atom className="h-5 w-5" />, title: "Scan a Card", body: "Point the app camera at any Grimoire card to reveal its 3D AR molecular model." },
                { n: "03", color: "var(--color-amber-scry)", icon: <FlaskConical className="h-5 w-5" />, title: "Forge New Elements", body: "Combine base elements in the Reaction Sandbox to discover and unlock new compounds." },
                { n: "04", color: "var(--color-emerald-elixir)", icon: <Camera className="h-5 w-5" />, title: "Submit Evidence", body: "Photograph real-world chemistry and get instant AI-graded scientific feedback." },
              ].map(({ n, color, icon, title, body }, i) => (
                <Reveal key={n} delay={i * 100}>
                  <div className="relative pt-2">
                    <div className="flex justify-center mb-4">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full z-10 animate-breathing"
                        style={{
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`,
                          boxShadow: `0 0 20px -4px color-mix(in oklab, ${color} 45%, transparent)`,
                          color,
                        }}>
                        {icon}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-xs tracking-[0.3em] uppercase mb-1" style={{ color }}>{n}</div>
                      <h3 className="font-display text-base mb-2">{title}</h3>
                      <p className="text-parchment text-xs leading-relaxed">{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MOLECULE CANVAS DIVIDER ── */}
      <section className="relative z-10 h-52 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <MoleculeCanvas color="var(--color-gold)" />
        </div>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, var(--color-mist), transparent 30%, transparent 70%, var(--color-mist))" }} />
        <div className="relative z-10 h-full flex items-center justify-center">
          <p className="font-display text-xl text-gold/70 tracking-[0.4em] uppercase animate-breathing">
            ✦ Every element tells a story ✦
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-breathing"
                style={{ background: "var(--color-wraith)" }} />
              <FlaskConical className="relative h-12 w-12 text-wraith animate-float-slow" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl mb-6">
              Ready to step<br />
              <span className="aurora-gradient animate-aurora">into the lab?</span>
            </h2>
            <p className="text-parchment max-w-xl mx-auto leading-relaxed mb-10">
              Start with the Element Explorer — no account needed. When you're ready to forge,
              scan, and experiment, open the platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/elements" className="btn-arcane btn-arcane-hover">
                <Atom className="h-4 w-4" /> Explore Elements
              </Link>
              <Link to="/learn" className="btn-ghost-arcane">
                <ArrowRight className="h-4 w-4" /> How It Works
              </Link>
              <Link to="/app" className="btn-ghost-arcane">
                <Zap className="h-4 w-4" /> Open Platform
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase relative z-10">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
