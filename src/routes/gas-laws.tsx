import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Gauge, Thermometer, Box, Atom } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice } from "../lib/profile";

export const Route = createFileRoute("/gas-laws")({
  component: () => (
    <RequireAuth>
      <GasLaws />
    </RequireAuth>
  ),
});

const R = 0.0821; // L·atm·mol⁻¹·K⁻¹
type Solve = "P" | "V" | "T";

const RANGES = {
  T: { min: 100, max: 1000, step: 10, unit: "K" },
  V: { min: 1, max: 50, step: 1, unit: "L" },
  P: { min: 0.1, max: 10, step: 0.1, unit: "atm" },
  n: { min: 0.1, max: 5, step: 0.1, unit: "mol" },
};

// ── Particle box — illustrates T (speed/colour), V (box size), n (count) ────
function ParticleBox({ tvn }: { tvn: React.MutableRefObject<{ T: number; V: number; n: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    interface P { x: number; y: number; vx: number; vy: number }
    let parts: P[] = [];
    let raf = 0;

    const spawn = (n: number, box: { x: number; y: number; w: number; h: number }): P => ({
      x: box.x + Math.random() * box.w,
      y: box.y + Math.random() * box.h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    });

    const draw = () => {
      const { T, V, n } = tvn.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Box scales with volume.
      const frac = (V - RANGES.V.min) / (RANGES.V.max - RANGES.V.min);
      const bw = (0.4 + frac * 0.5) * W;
      const bh = (0.45 + frac * 0.45) * H;
      const box = { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh };

      // Container walls
      ctx.strokeStyle = "color-mix(in oklab, var(--color-parchment) 40%, transparent)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Particle count from moles.
      const target = Math.max(4, Math.min(70, Math.round(n * 12)));
      while (parts.length < target) parts.push(spawn(n, box));
      if (parts.length > target) parts = parts.slice(0, target);

      // Speed from temperature.
      const speed = 0.6 + Math.sqrt(T / 300) * 1.6;
      const hue = 240 * (1 - (T - RANGES.T.min) / (RANGES.T.max - RANGES.T.min)); // blue→red
      const color = `hsl(${hue}, 85%, 62%)`;

      for (const p of parts) {
        // keep inside current box (volume may have shrunk)
        if (p.x < box.x) p.x = box.x; if (p.x > box.x + box.w) p.x = box.x + box.w;
        if (p.y < box.y) p.y = box.y; if (p.y > box.y + box.h) p.y = box.y + box.h;

        const mag = Math.hypot(p.vx, p.vy) || 1;
        p.x += (p.vx / mag) * speed;
        p.y += (p.vy / mag) * speed;

        if (p.x <= box.x || p.x >= box.x + box.w) p.vx *= -1;
        if (p.y <= box.y || p.y >= box.y + box.h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [tvn]);

  return <canvas ref={ref} className="w-full h-full" style={{ minHeight: 340 }} />;
}

function Slider({
  label, icon: Icon, value, onChange, min, max, step, unit, disabled, color,
}: {
  label: string; icon: typeof Gauge; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; disabled?: boolean; color: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`, opacity: disabled ? 0.85 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase" style={{ color }}>
          <Icon className="h-3.5 w-3.5" /> {label} {disabled && <span className="text-parchment/50">(computed)</span>}
        </span>
        <span className="font-display text-lg" style={{ color }}>{value.toFixed(step < 1 ? 1 : 0)} <span className="text-xs text-parchment/60">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-current disabled:opacity-50" style={{ accentColor: color }} />
    </div>
  );
}

function GasLaws() {
  const { uid } = useUserProfile();
  const [solve, setSolve] = useState<Solve>("P");
  const [T, setT] = useState(300);
  const [V, setV] = useState(22.4);
  const [P, setP] = useState(1);
  const [n, setN] = useState(1);

  // Record a single practice visit (no scoring).
  useEffect(() => { if (uid) logPractice(uid, "gas-laws"); }, [uid]);

  // Compute the dependent variable from the ideal gas law.
  const computed = (() => {
    if (solve === "P") return { P: (n * R * T) / V, V, T };
    if (solve === "V") return { V: (n * R * T) / P, P, T };
    return { T: (P * V) / (n * R), P, V };
  })();
  const shownP = solve === "P" ? computed.P! : P;
  const shownV = solve === "V" ? computed.V! : V;
  const shownT = solve === "T" ? computed.T! : T;

  const tvn = useRef({ T: shownT, V: shownV, n });
  useEffect(() => { tvn.current = { T: shownT, V: shownV, n }; }, [shownT, shownV, n]);

  const SolveToggle = (
    <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {(["P", "V", "T"] as const).map((s) => (
        <button key={s} onClick={() => setSolve(s)}
          className="rounded-full px-4 py-1.5 text-xs tracking-[0.12em] uppercase transition"
          style={solve === s ? { background: "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)", color: "var(--color-emerald-elixir)" } : { color: "var(--color-parchment)" }}>
          Solve {s}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Gas Laws Simulator"
      eyebrow="Kinetic Theory"
      icon={Gauge}
      accent="var(--color-wraith)"
      subtitle="Manipulate temperature, volume, pressure and moles under PV = nRT. Choose which variable to solve for and watch the molecules respond."
      right={SolveToggle}
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Simulation */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))", border: "1px solid var(--color-border)" }}>
          <ParticleBox tvn={tvn} />
          <div className="px-5 py-4 border-t text-center" style={{ borderColor: "var(--color-border)" }}>
            <div className="font-display text-lg">
              <span className="text-gold">P</span>·<span className="text-teal">V</span> = <span className="text-parchment">n</span>·R·<span className="text-wraith">T</span>
            </div>
            <div className="text-xs text-parchment/70 mt-1">
              {shownP.toFixed(2)} atm · {shownV.toFixed(1)} L = {n.toFixed(1)} mol · {R} · {shownT.toFixed(0)} K
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <Slider label="Temperature" icon={Thermometer} value={shownT} onChange={setT} {...RANGES.T} disabled={solve === "T"} color="#a855f7" />
          <Slider label="Volume" icon={Box} value={shownV} onChange={setV} {...RANGES.V} disabled={solve === "V"} color="#2dd4bf" />
          <Slider label="Pressure" icon={Gauge} value={shownP} onChange={setP} {...RANGES.P} disabled={solve === "P"} color="#e0b457" />
          <Slider label="Amount" icon={Atom} value={n} onChange={setN} {...RANGES.n} color="#9aa7bd" />

          <div className="rounded-xl p-4 text-sm text-parchment leading-relaxed"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <span className="text-teal font-display">Observe:</span>{" "}
            {solve === "P" && "Shrinking the volume or heating the gas raises the pressure."}
            {solve === "V" && "Heating the gas or dropping the pressure expands the volume."}
            {solve === "T" && "Higher pressure or larger volume means the gas must be hotter."}
          </div>

        </div>
      </div>

      {/* Teaching layer */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConceptCard title="Three laws, one equation">
          <span className="text-spectral">PV = nRT</span> bundles them together:{" "}
          <span className="text-gold">Boyle's law</span> (P↑ as V↓ at fixed T),{" "}
          <span className="text-teal">Charles's law</span> (V↑ as T↑ at fixed P), and{" "}
          <span className="text-wraith">Gay-Lussac's law</span> (P↑ as T↑ at fixed V). Hold one slider still and move
          another to see each in action.
        </ConceptCard>
        <DidYouKnow>
          Car airbags use this: a chemical reaction makes a burst of gas, and PV = nRT means that gas <em>must</em> expand
          to fill the bag in ~30 milliseconds. Scuba divers watch it too — pressure rising with depth shrinks the air in their lungs.
        </DidYouKnow>
      </div>
    </ModuleShell>
  );
}
