import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Atom, Play, Pause, RotateCcw, Scale, Gauge, Lightbulb } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ConceptCard } from "../components/Learn";
import { elementStyle } from "../lib/molecules";

export const Route = createFileRoute("/reactions")({
  component: () => (
    <RequireRole role="student">
      <ReactionAnimator />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-gold)";

// Plain-English names for the atoms on screen — a student shouldn't have to
// already know that "Na" means sodium.
const ELEMENT_NAMES: Record<string, string> = {
  H: "hydrogen", O: "oxygen", C: "carbon", N: "nitrogen",
  Na: "sodium", Cl: "chlorine",
};

// ── Reaction data ──────────────────────────────────────────────────────────────
// Each molecule lists its atoms (central first), bonds as local index pairs,
// plus a formula/name so the stage can label it.
interface Mol { formula: string; name: string; atoms: string[]; bonds: [number, number][]; }
type ReactionType = "Synthesis" | "Combustion" | "Decomposition" | "Neutralisation";
interface Reaction {
  id: string; equation: string; label: string; type: ReactionType;
  /** One plain sentence: what happens. */
  summary: string;
  /** Why a student should care — a real-world hook. */
  why: string;
  /** What forms, said simply (shown during the "products form" step). */
  formStep: string;
  reactants: Mol[]; products: Mol[];
}

const line = (n: number): [number, number][] => (n === 2 ? [[0, 1]] : []);
const star = (n: number): [number, number][] => Array.from({ length: n - 1 }, (_, i) => [0, i + 1] as [number, number]);

// Reusable molecule shapes (read-only — safe to share across reactions).
const H2: Mol = { formula: "H₂", name: "hydrogen gas", atoms: ["H", "H"], bonds: line(2) };
const O2: Mol = { formula: "O₂", name: "oxygen gas", atoms: ["O", "O"], bonds: line(2) };
const N2: Mol = { formula: "N₂", name: "nitrogen gas", atoms: ["N", "N"], bonds: line(2) };
const Cl2: Mol = { formula: "Cl₂", name: "chlorine gas", atoms: ["Cl", "Cl"], bonds: line(2) };
const H2O: Mol = { formula: "H₂O", name: "water", atoms: ["O", "H", "H"], bonds: star(3) };
const NH3: Mol = { formula: "NH₃", name: "ammonia", atoms: ["N", "H", "H", "H"], bonds: star(4) };
const CO2: Mol = { formula: "CO₂", name: "carbon dioxide", atoms: ["C", "O", "O"], bonds: star(3) };
const CH4: Mol = { formula: "CH₄", name: "methane", atoms: ["C", "H", "H", "H", "H"], bonds: star(5) };
const H2O2: Mol = { formula: "H₂O₂", name: "hydrogen peroxide", atoms: ["O", "O", "H", "H"], bonds: [[0, 1], [0, 2], [1, 3]] };
const HCl: Mol = { formula: "HCl", name: "hydrochloric acid", atoms: ["Cl", "H"], bonds: line(2) };
const NaOH: Mol = { formula: "NaOH", name: "sodium hydroxide", atoms: ["O", "Na", "H"], bonds: star(3) };
const NaCl: Mol = { formula: "NaCl", name: "table salt", atoms: ["Na", "Cl"], bonds: line(2) };
const Na: Mol = { formula: "Na", name: "sodium metal", atoms: ["Na"], bonds: [] };
const C: Mol = { formula: "C", name: "carbon", atoms: ["C"], bonds: [] };

const REACTIONS: Reaction[] = [
  { id: "water", equation: "2 H₂ + O₂ → 2 H₂O", label: "Synthesis of water", type: "Synthesis",
    summary: "Hydrogen gas and oxygen gas combine to make water.",
    why: "It's how fuel cells and rockets turn hydrogen into energy — and every water molecule around you was built this way.",
    formStep: "Each oxygen grabs two hydrogens → water (H₂O).",
    reactants: [H2, H2, O2], products: [H2O, H2O] },
  { id: "ammonia", equation: "N₂ + 3 H₂ → 2 NH₃", label: "The Haber process", type: "Synthesis",
    summary: "Nitrogen from the air joins with hydrogen to make ammonia.",
    why: "This is the Haber process — it makes the fertiliser that grows most of the world's food.",
    formStep: "Each nitrogen bonds with three hydrogens → ammonia (NH₃).",
    reactants: [N2, H2, H2, H2], products: [NH3, NH3] },
  { id: "salt", equation: "2 Na + Cl₂ → 2 NaCl", label: "Making table salt", type: "Synthesis",
    summary: "Sodium metal reacts with chlorine gas to make table salt.",
    why: "A metal that explodes in water plus a poisonous green gas become the harmless salt on your food.",
    formStep: "Each sodium pairs with one chlorine → salt (NaCl).",
    reactants: [Na, Na, Cl2], products: [NaCl, NaCl] },
  { id: "carbon", equation: "C + O₂ → CO₂", label: "Combustion of carbon", type: "Combustion",
    summary: "Carbon burns in oxygen to make carbon dioxide.",
    why: "It's what happens when charcoal, wood or coal burns — releasing the heat that cooks food and warms homes.",
    formStep: "Carbon grabs two oxygens → carbon dioxide (CO₂).",
    reactants: [C, O2], products: [CO2] },
  { id: "methane", equation: "CH₄ + 2 O₂ → CO₂ + 2 H₂O", label: "Burning natural gas", type: "Combustion",
    summary: "Natural gas burns in oxygen, making carbon dioxide and water.",
    why: "The blue flame on a gas stove — this reaction cooks your food and heats your home.",
    formStep: "Atoms regroup into carbon dioxide (CO₂) and water (H₂O).",
    reactants: [CH4, O2, O2], products: [CO2, H2O, H2O] },
  { id: "peroxide", equation: "2 H₂O₂ → 2 H₂O + O₂", label: "Peroxide breakdown", type: "Decomposition",
    summary: "Hydrogen peroxide breaks apart into water and oxygen.",
    why: "The fizz when you pour peroxide on a cut is the oxygen bubbling out.",
    formStep: "The pieces regroup into water (H₂O) and oxygen gas (O₂).",
    reactants: [H2O2, H2O2], products: [H2O, H2O, O2] },
  { id: "electrolysis", equation: "2 H₂O → 2 H₂ + O₂", label: "Electrolysis of water", type: "Decomposition",
    summary: "Electricity splits water into hydrogen and oxygen gas.",
    why: "One clean way to make hydrogen fuel — just add electricity to water.",
    formStep: "Atoms split into hydrogen (H₂) and oxygen (O₂) gas.",
    reactants: [H2O, H2O], products: [H2, H2, O2] },
  { id: "neutralise", equation: "HCl + NaOH → NaCl + H₂O", label: "Acid meets base", type: "Neutralisation",
    summary: "An acid and a base cancel each other into salt and water.",
    why: "It's how antacids calm an upset stomach — acid + base → harmless salt and water.",
    formStep: "The atoms regroup into salt (NaCl) and water (H₂O).",
    reactants: [HCl, NaOH], products: [NaCl, H2O] },
];

const TYPE_INFO: Record<ReactionType, string> = {
  Synthesis: "Two or more simple substances join into one larger compound (A + B → AB).",
  Combustion: "A fuel reacts with oxygen, releasing heat and light (fuel + O₂ → oxides).",
  Decomposition: "A single compound breaks apart into simpler substances (AB → A + B).",
  Neutralisation: "An acid and a base react to make a salt and water (acid + base → salt + water).",
};
const TYPE_ORDER: ReactionType[] = ["Synthesis", "Combustion", "Decomposition", "Neutralisation"];

// Plain-language narration for each phase of the animation.
const STEP_BREAK = "The bonds holding each molecule together snap apart, freeing the atoms.";
const STEP_REARRANGE = "The freed atoms drift across and look for new partners.";

// ── Atom bookkeeping (conservation of mass) ─────────────────────────────────────
function atomCounts(mols: Mol[]): Record<string, number> {
  const c: Record<string, number> = {};
  mols.forEach((m) => m.atoms.forEach((el) => (c[el] = (c[el] ?? 0) + 1)));
  return c;
}

// ── Flatten molecules into global atoms + bonds + labelled clusters ────────────
interface Flat {
  atoms: { el: string; base: [number, number] }[];
  bonds: [number, number][];
  clusters: { formula: string; centre: [number, number] }[];
}
function flatten(mols: Mol[], side: "L" | "R"): Flat {
  const atoms: Flat["atoms"] = [];
  const bonds: [number, number][] = [];
  const clusters: Flat["clusters"] = [];
  const x = side === "L" ? 0.24 : 0.76;
  mols.forEach((m, mi) => {
    const cy = (mi + 1) / (mols.length + 1);
    clusters.push({ formula: m.formula, centre: [x, cy] });
    const start = atoms.length;
    m.atoms.forEach((el, ai) => {
      let off: [number, number] = [0, 0];
      if (m.atoms.length === 2) off = ai === 0 ? [-0.045, 0] : [0.045, 0];
      else if (ai > 0) {
        const a = ((ai - 1) / (m.atoms.length - 1)) * Math.PI * 2 - Math.PI / 2;
        off = [Math.cos(a) * 0.06, Math.sin(a) * 0.06];
      }
      atoms.push({ el, base: [x + off[0], cy + off[1]] });
    });
    m.bonds.forEach(([a, b]) => bonds.push([start + a, start + b]));
  });
  return { atoms, bonds, clusters };
}

const SPEEDS = [0.5, 1, 2] as const;

function ReactionAnimator() {
  const [id, setId] = useState(REACTIONS[0].id);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const reaction = REACTIONS.find((r) => r.id === id)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stepTitle, setStepTitle] = useState("Bonds break");
  const [stepText, setStepText] = useState(STEP_BREAK);
  const tRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const restart = () => { tRef.current = 0; setPlaying(true); };

  // Live conservation-of-mass ledger for the selected reaction.
  const ledger = useMemo(() => {
    const L = atomCounts(reaction.reactants);
    const R = atomCounts(reaction.products);
    const els = Array.from(new Set([...Object.keys(L), ...Object.keys(R)]));
    return els.map((el) => ({ el, left: L[el] ?? 0, right: R[el] ?? 0 }));
  }, [reaction]);
  const balanced = ledger.every((r) => r.left === r.right);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const R = flatten(reaction.reactants, "L");
    const P = flatten(reaction.products, "R");

    // Match reactant→product atoms by element (balanced ⇒ counts line up).
    const match: number[] = new Array(R.atoms.length).fill(-1);
    const invMatch: number[] = new Array(P.atoms.length).fill(-1);
    const byEl: Record<string, number[]> = {};
    P.atoms.forEach((a, i) => (byEl[a.el] ??= []).push(i));
    const cursor: Record<string, number> = {};
    R.atoms.forEach((a, i) => {
      const list = byEl[a.el] ?? [];
      const k = cursor[a.el] ?? 0;
      const pIdx = list[k] ?? list[list.length - 1];
      cursor[a.el] = k + 1;
      match[i] = pIdx; invMatch[pIdx] = i;
    });

    const smooth = (x: number) => x * x * (3 - 2 * x);
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    let last = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      if (playingRef.current) tRef.current = (tRef.current + (dt / 5) * speedRef.current) % 1.25; // 5s cycle + 0.25 hold
      const raw = Math.min(1, tRef.current);

      // Phases: 0–.2 break · .2–.8 travel · .8–1 form
      const breakP = Math.min(1, raw / 0.2);
      const travel = smooth(clamp((raw - 0.2) / 0.6));
      const formP = clamp((raw - 0.8) / 0.2);
      if (raw < 0.2) { setStepTitle("Bonds break"); setStepText(STEP_BREAK); }
      else if (raw < 0.8) { setStepTitle("Atoms rearrange"); setStepText(STEP_REARRANGE); }
      else { setStepTitle("Products form"); setStepText(reaction.formStep); }

      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const px = (nx: number) => nx * w;
      const py = (ny: number) => ny * h * 0.9 + h * 0.06;
      const rAtom = Math.max(9, w * 0.015);

      const cur = R.atoms.map((a, i) => {
        const from = a.base;
        const to = P.atoms[match[i]].base;
        return [from[0] + (to[0] - from[0]) * travel, from[1] + (to[1] - from[1]) * travel] as [number, number];
      });

      // ── Molecule name labels (they hand off as atoms migrate) ──
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const labelFont = `600 ${rAtom * 1.15}px Inter, system-ui, sans-serif`;
      ctx.font = labelFont;
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 6;
      // Reactant labels fade out as the atoms leave.
      ctx.globalAlpha = clamp(1 - travel / 0.55);
      ctx.fillStyle = "#e8dcc0";
      for (const cl of R.clusters) ctx.fillText(cl.formula, px(cl.centre[0]), py(cl.centre[1]) - rAtom * 2.6);
      // Product labels fade in as the atoms arrive.
      ctx.globalAlpha = clamp((travel - 0.5) / 0.5);
      ctx.fillStyle = "#67e8c3";
      for (const cl of P.clusters) ctx.fillText(cl.formula, px(cl.centre[0]), py(cl.centre[1]) - rAtom * 2.6);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      // ── Bonds ──
      ctx.lineCap = "round";
      if (breakP < 1) {
        ctx.globalAlpha = 1 - breakP;
        ctx.strokeStyle = "#cfd6e4"; ctx.lineWidth = rAtom * 0.5;
        for (const [a, b] of R.bonds) {
          ctx.beginPath(); ctx.moveTo(px(cur[a][0]), py(cur[a][1])); ctx.lineTo(px(cur[b][0]), py(cur[b][1])); ctx.stroke();
        }
      }
      if (formP > 0) {
        ctx.globalAlpha = formP;
        ctx.strokeStyle = "#cfd6e4"; ctx.lineWidth = rAtom * 0.5;
        for (const [a, b] of P.bonds) {
          const ra = invMatch[a], rb = invMatch[b];
          ctx.beginPath(); ctx.moveTo(px(cur[ra][0]), py(cur[ra][1])); ctx.lineTo(px(cur[rb][0]), py(cur[rb][1])); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // ── Atoms ──
      for (let i = 0; i < R.atoms.length; i++) {
        const [x, y] = [px(cur[i][0]), py(cur[i][1])];
        const col = elementStyle(R.atoms[i].el).color;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rAtom * 1.6);
        glow.addColorStop(0, col); glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, rAtom * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rAtom, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.font = `700 ${rAtom * 1.05}px "EB Garamond", serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(R.atoms[i].el, x, y);
      }

      // ── Centre arrow ──
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#8b93a5"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.47, h / 2); ctx.lineTo(w * 0.53, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.53, h / 2); ctx.lineTo(w * 0.515, h / 2 - 6); ctx.lineTo(w * 0.515, h / 2 + 6); ctx.closePath(); ctx.fillStyle = "#8b93a5"; ctx.fill();
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };
    let raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [reaction]);

  return (
    <StudentShell title="Reactions">
      <PageHeader
        eyebrow="Reaction Theatre"
        title="Watch bonds break and reform."
        subtitle="A chemical reaction just rearranges atoms into new molecules. Pick one below and press play — the stage tells you what's happening at each step."
        icon={Atom}
        accent={ACCENT}
      />

      {/* Reactions grouped by type — teaches the taxonomy while you browse. */}
      <div className="mb-5 space-y-3">
        {TYPE_ORDER.map((t) => (
          <div key={t}>
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-parchment/45">{t}</div>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.filter((r) => r.type === t).map((r) => (
                <button key={r.id} onClick={() => { setId(r.id); restart(); }}
                  className="rounded-xl px-3.5 py-2 font-display text-sm transition-all hover:-translate-y-0.5"
                  style={r.id === id
                    ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)` }
                    : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
                  {r.equation}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* What & why — plain language, BEFORE the abstract animation. */}
      <div className="mb-4 rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${ACCENT} 9%, transparent)`, border: `1px solid color-mix(in oklab, ${ACCENT} 28%, transparent)` }}>
        <div className="mb-1 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-gold" />
          <span className="font-display text-sm text-spectral">{reaction.summary}</span>
        </div>
        <p className="pl-6 text-sm leading-relaxed text-parchment/75">{reaction.why}</p>
      </div>

      {/* Stage */}
      <div className="atom-stage-panel relative overflow-hidden rounded-2xl" style={{ border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, boxShadow: `0 0 60px -26px ${ACCENT}` }}>
        {/* side headers */}
        <span className="pointer-events-none absolute left-4 top-3 text-[10px] uppercase tracking-[0.25em] text-parchment/45">Reactants</span>
        <span className="pointer-events-none absolute right-4 top-3 text-[10px] uppercase tracking-[0.25em] text-teal/55">Products</span>
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
          <div className="font-display text-base text-white sm:text-lg">{reaction.equation}</div>
        </div>

        <canvas ref={canvasRef} className="block w-full" style={{ height: 360 }} />

        {/* Narration bar — explains the current step as it happens. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm" style={{ color: "var(--color-gold)" }}>{stepTitle}</span>
          </div>
          <p className="text-sm text-white/85">{stepText}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setPlaying((p) => !p)} className="btn-arcane btn-arcane-hover text-sm">
          {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}
        </button>
        <button onClick={restart} className="btn-ghost-arcane text-sm"><RotateCcw className="h-4 w-4" /> Replay</button>
        <div className="ml-auto inline-flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-parchment/50" />
          <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className="rounded-full px-3 py-1 text-xs transition"
                style={speed === s ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT } : { color: "var(--color-parchment)" }}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conservation-of-mass ledger — with the atoms named in plain English. */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
        <div className="mb-1 flex items-center gap-2 text-teal">
          <Scale className="h-4 w-4" />
          <span className="font-display text-[11px] uppercase tracking-[0.2em]">Count the atoms — none are created or destroyed</span>
        </div>
        <p className="mb-3 text-xs text-parchment/60">The same atoms are on both sides of the arrow — they've only swapped partners.</p>
        <div className="flex flex-wrap gap-2.5">
          {ledger.map(({ el, left, right }) => {
            const col = elementStyle(el).color;
            return (
              <div key={el} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: `color-mix(in oklab, ${col} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${col} 32%, transparent)` }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold" style={{ background: col, color: "#0b1220" }}>{el}</span>
                <span className="text-sm text-parchment">
                  <span className="capitalize text-spectral">{ELEMENT_NAMES[el] ?? el}</span>:
                  <span className="mx-1 text-spectral">{left}</span>
                  <span className="text-parchment/40">→</span>
                  <span className="mx-1 text-spectral">{right}</span>
                </span>
                <span className="text-emerald-elixir">{left === right ? "✓" : "✗"}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-parchment/70">
          {balanced
            ? "Every atom on the left reappears on the right — just bonded differently. That's "
            : "The counts don't match — this equation isn't balanced. Real reactions always obey "}
          <span className="text-gold">conservation of mass</span>: the reason chemical equations must balance.
        </p>
      </div>

      {/* What kind of reaction is this? */}
      <div className="mt-4">
        <ConceptCard title={`This is a ${reaction.type.toLowerCase()} reaction`}>{TYPE_INFO[reaction.type]}</ConceptCard>
      </div>
    </StudentShell>
  );
}
