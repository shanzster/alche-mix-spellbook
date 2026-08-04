import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldAlert, Flame, Droplets, Skull, FlameKindling, Bomb, Cylinder,
  HeartPulse, AlertTriangle, Fish, Beaker, FlaskConical, FlaskRound,
  TestTube, TestTube2, Pipette, Thermometer, Eye, EyeOff,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";

export const Route = createFileRoute("/lab-safety")({
  component: () => (
    <RequireRole role="student">
      <LabSafety />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-crimson)";

const GHS = [
  { name: "Flammable", icon: Flame, meaning: "Catches fire easily near heat, sparks or flame.", examples: "Ethanol, acetone, hydrogen" },
  { name: "Corrosive", icon: Droplets, meaning: "Destroys skin, eyes and metal on contact.", examples: "Strong acids & bases, bleach" },
  { name: "Acute toxicity", icon: Skull, meaning: "Fatal or toxic if swallowed, inhaled or absorbed.", examples: "Methanol, cyanide salts" },
  { name: "Oxidiser", icon: FlameKindling, meaning: "Feeds fire by releasing oxygen — makes flames fiercer.", examples: "Hydrogen peroxide, nitrates" },
  { name: "Explosive", icon: Bomb, meaning: "May explode from heat, shock or friction.", examples: "Organic peroxides" },
  { name: "Compressed gas", icon: Cylinder, meaning: "Gas under pressure; the cylinder may burst if heated.", examples: "Oxygen, butane cylinders" },
  { name: "Health hazard", icon: HeartPulse, meaning: "Carcinogen, or damages organs / breathing over time.", examples: "Benzene, formaldehyde" },
  { name: "Harmful / irritant", icon: AlertTriangle, meaning: "Irritates skin, eyes or airways; harmful in quantity.", examples: "Dilute acids, many solvents" },
  { name: "Environmental", icon: Fish, meaning: "Toxic to aquatic life — never pour down the drain.", examples: "Heavy-metal salts, pesticides" },
];

const APPARATUS = [
  { name: "Beaker", icon: Beaker, use: "Holding & mixing liquids; only a rough volume guide." },
  { name: "Conical flask", icon: FlaskConical, use: "Swirling without spills — the classic titration flask." },
  { name: "Round-bottom flask", icon: FlaskRound, use: "Even heating of liquids; distillation." },
  { name: "Test tube", icon: TestTube, use: "Small-scale reactions and observations." },
  { name: "Measuring cylinder", icon: TestTube2, use: "Measuring a liquid's volume fairly accurately." },
  { name: "Pipette", icon: Pipette, use: "Delivering a precise, fixed small volume." },
  { name: "Bunsen burner", icon: Flame, use: "The lab's adjustable heat source." },
  { name: "Thermometer", icon: Thermometer, use: "Measuring temperature during a reaction." },
];

function Diamond({ icon: Icon }: { icon: typeof Flame }) {
  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <div className="absolute inset-0 rotate-45 rounded-md" style={{ background: "#fff", border: "3px solid var(--color-crimson)" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-7 w-7" style={{ color: "#1a1a1a" }} />
      </div>
    </div>
  );
}

function LabSafety() {
  const [test, setTest] = useState(false);

  return (
    <StudentShell title="Lab Safety">
      <PageHeader
        eyebrow="Before You Begin"
        title="Read the room — and the labels."
        subtitle="Every chemical carries hazard pictograms, and every tool has a job. Learn to read both before you touch anything."
        icon={ShieldAlert}
        accent={ACCENT}
        right={
          <button onClick={() => setTest((t) => !t)}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] tracking-[0.15em] uppercase transition"
            style={{ background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)` }}>
            {test ? <><Eye className="h-3 w-3" /> Show answers</> : <><EyeOff className="h-3 w-3" /> Test yourself</>}
          </button>
        }
      />

      {/* GHS pictograms */}
      <section className="mb-12">
        <h2 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70 mb-4">GHS Hazard Symbols</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GHS.map((g) => (
            <div key={g.name} className="flex gap-4 rounded-2xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <Diamond icon={g.icon} />
              <div className="min-w-0">
                <div className="font-display text-base mb-1">{g.name}</div>
                {test ? (
                  <div className="text-xs text-parchment/40 italic">What does this warn about?</div>
                ) : (
                  <>
                    <p className="text-xs text-parchment/70 leading-snug mb-1">{g.meaning}</p>
                    <p className="text-[11px] text-parchment/45">e.g. {g.examples}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Apparatus */}
      <section>
        <h2 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70 mb-4">Common Apparatus</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPARATUS.map((a) => (
            <div key={a.name} className="rounded-2xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)", color: "var(--color-emerald-elixir)" }}>
                <a.icon className="h-5 w-5" />
              </span>
              <div className="font-display text-sm mb-1">{a.name}</div>
              {!test && <p className="text-[11px] text-parchment/60 leading-snug">{a.use}</p>}
              {test && <p className="text-[11px] text-parchment/40 italic">What's it for?</p>}
            </div>
          ))}
        </div>
      </section>
    </StudentShell>
  );
}
