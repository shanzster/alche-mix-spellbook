import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Atom, Play, Pause, RotateCcw } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { elementStyle } from "../lib/molecules";

export const Route = createFileRoute("/reactions")({
  component: () => (
    <RequireRole role="student">
      <ReactionAnimator />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-gold)";

// ── Reaction presets ──────────────────────────────────────────────────────────
// Each molecule lists its atoms (central first) and bonds as local index pairs.
interface Mol { atoms: string[]; bonds: [number, number][]; }
interface Reaction {
  id: string; equation: string; label: string;
  reactants: Mol[]; products: Mol[];
}

const line = (n: number): [number, number][] => (n === 2 ? [[0, 1]] : []);
const star = (n: number): [number, number][] => Array.from({ length: n - 1 }, (_, i) => [0, i + 1] as [number, number]);

const REACTIONS: Reaction[] = [
  {
    id: "water", equation: "2 H₂ + O₂ → 2 H₂O", label: "Synthesis of water",
    reactants: [{ atoms: ["H", "H"], bonds: line(2) }, { atoms: ["H", "H"], bonds: line(2) }, { atoms: ["O", "O"], bonds: line(2) }],
    products: [{ atoms: ["O", "H", "H"], bonds: star(3) }, { atoms: ["O", "H", "H"], bonds: star(3) }],
  },
  {
    id: "co2", equation: "C + O₂ → CO₂", label: "Combustion of carbon",
    reactants: [{ atoms: ["C"], bonds: [] }, { atoms: ["O", "O"], bonds: line(2) }],
    products: [{ atoms: ["C", "O", "O"], bonds: star(3) }],
  },
  {
    id: "ammonia", equation: "N₂ + 3 H₂ → 2 NH₃", label: "Haber process",
    reactants: [{ atoms: ["N", "N"], bonds: line(2) }, { atoms: ["H", "H"], bonds: line(2) }, { atoms: ["H", "H"], bonds: line(2) }, { atoms: ["H", "H"], bonds: line(2) }],
    products: [{ atoms: ["N", "H", "H", "H"], bonds: star(4) }, { atoms: ["N", "H", "H", "H"], bonds: star(4) }],
  },
];

// Flatten molecules into global atoms + bonds + per-molecule cluster centres.
interface Flat {
  atoms: { el: string; base: [number, number] }[]; // base = layout offset within its cluster (unit-ish)
  bonds: [number, number][];
  centres: [number, number][]; // one per molecule (normalized column layout)
}
function flatten(mols: Mol[], side: "L" | "R"): Flat {
  const atoms: Flat["atoms"] = [];
  const bonds: [number, number][] = [];
  const centres: [number, number][] = [];
  const x = side === "L" ? 0.24 : 0.76;
  mols.forEach((m, mi) => {
    const cy = (mi + 1) / (mols.length + 1);
    centres.push([x, cy]);
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
  return { atoms, bonds, centres };
}

function ReactionAnimator() {
  const [id, setId] = useState(REACTIONS[0].id);
  const [playing, setPlaying] = useState(true);
  const reaction = REACTIONS.find((r) => r.id === id)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState("Breaking bonds");
  const tRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const restart = () => { tRef.current = 0; setPlaying(true); };

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
    let last = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      if (playingRef.current) tRef.current = (tRef.current + dt / 5) % 1.25; // 5s cycle + 0.25 hold
      const raw = Math.min(1, tRef.current);

      // Phases: 0–.2 break · .2–.8 travel · .8–1 form
      const breakP = Math.min(1, raw / 0.2);
      const travel = smooth(Math.max(0, Math.min(1, (raw - 0.2) / 0.6)));
      const formP = Math.max(0, Math.min(1, (raw - 0.8) / 0.2));
      setPhase(raw < 0.2 ? "Breaking bonds" : raw < 0.8 ? "Atoms rearranging" : "Forming products");

      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const px = (nx: number) => nx * w;
      const py = (ny: number) => ny * h * 0.9 + h * 0.05;
      const rAtom = Math.max(9, w * 0.016);

      // current position of each reactant atom (it carries the product slot it's headed to)
      const cur = R.atoms.map((a, i) => {
        const from = a.base;
        const to = P.atoms[match[i]].base;
        return [from[0] + (to[0] - from[0]) * travel, from[1] + (to[1] - from[1]) * travel] as [number, number];
      });

      // reactant bonds fade out during break
      ctx.lineCap = "round";
      if (breakP < 1) {
        ctx.globalAlpha = 1 - breakP;
        ctx.strokeStyle = "#cfd6e4"; ctx.lineWidth = rAtom * 0.5;
        for (const [a, b] of R.bonds) {
          ctx.beginPath(); ctx.moveTo(px(cur[a][0]), py(cur[a][1])); ctx.lineTo(px(cur[b][0]), py(cur[b][1])); ctx.stroke();
        }
      }
      // product bonds fade in during form (drawn between the atoms filling those slots)
      if (formP > 0) {
        ctx.globalAlpha = formP;
        ctx.strokeStyle = "#cfd6e4"; ctx.lineWidth = rAtom * 0.5;
        for (const [a, b] of P.bonds) {
          const ra = invMatch[a], rb = invMatch[b];
          ctx.beginPath(); ctx.moveTo(px(cur[ra][0]), py(cur[ra][1])); ctx.lineTo(px(cur[rb][0]), py(cur[rb][1])); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // atoms
      for (let i = 0; i < R.atoms.length; i++) {
        const [x, y] = [px(cur[i][0]), py(cur[i][1])];
        const col = elementStyle(R.atoms[i].el).color;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rAtom * 1.6);
        glow.addColorStop(0, col); glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, rAtom * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rAtom, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.font = `700 ${rAtom * 1.05}px "EB Garamond", serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(R.atoms[i].el, x, y);
      }

      // centre arrow
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
        subtitle="A balanced equation isn't just symbols — atoms are conserved and simply rearranged. Press play to see it happen."
        icon={Atom}
        accent={ACCENT}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {REACTIONS.map((r) => (
          <button key={r.id} onClick={() => { setId(r.id); restart(); }}
            className="rounded-xl px-3.5 py-2 text-sm font-display transition-all hover:-translate-y-0.5"
            style={r.id === id
              ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)` }
              : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
            {r.equation}
          </button>
        ))}
      </div>

      <div className="atom-stage-panel relative rounded-2xl overflow-hidden" style={{ border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, boxShadow: `0 0 60px -26px ${ACCENT}` }}>
        <canvas ref={canvasRef} className="w-full block" style={{ height: 340 }} />
        <div className="absolute top-3 left-4 font-display text-lg text-white">{reaction.equation}</div>
        <span className="absolute top-3.5 right-4 text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--color-gold)" }}>{phase}</span>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => setPlaying((p) => !p)} className="btn-arcane btn-arcane-hover text-sm">
          {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}
        </button>
        <button onClick={restart} className="btn-ghost-arcane text-sm"><RotateCcw className="h-4 w-4" /> Replay</button>
      </div>

      <p className="mt-5 text-sm text-parchment/60 max-w-2xl leading-relaxed">
        Notice the atom count never changes — every atom on the left reappears on the right, just bonded differently.
        That's <span className="text-gold">conservation of mass</span>, the reason equations must balance.
      </p>
    </StudentShell>
  );
}
