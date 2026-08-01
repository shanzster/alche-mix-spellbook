import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, RefreshCw, Atom } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { ConceptCard, DidYouKnow, ChallengeBanner } from "../components/Learn";
import { useUserProfile, logPractice } from "../lib/profile";

export const Route = createFileRoute("/atomic-builder")({
  component: () => (
    <RequireAuth>
      <AtomicBuilder />
    </RequireAuth>
  ),
});

// ── Elements 1–20 with their most common neutron count ──────────────────────
interface ElementInfo { z: number; symbol: string; name: string; commonN: number; }
const ELEMENTS: ElementInfo[] = [
  { z: 1,  symbol: "H",  name: "Hydrogen",  commonN: 0  },
  { z: 2,  symbol: "He", name: "Helium",    commonN: 2  },
  { z: 3,  symbol: "Li", name: "Lithium",   commonN: 4  },
  { z: 4,  symbol: "Be", name: "Beryllium", commonN: 5  },
  { z: 5,  symbol: "B",  name: "Boron",     commonN: 6  },
  { z: 6,  symbol: "C",  name: "Carbon",    commonN: 6  },
  { z: 7,  symbol: "N",  name: "Nitrogen",  commonN: 7  },
  { z: 8,  symbol: "O",  name: "Oxygen",    commonN: 8  },
  { z: 9,  symbol: "F",  name: "Fluorine",  commonN: 10 },
  { z: 10, symbol: "Ne", name: "Neon",      commonN: 10 },
  { z: 11, symbol: "Na", name: "Sodium",    commonN: 12 },
  { z: 12, symbol: "Mg", name: "Magnesium", commonN: 12 },
  { z: 13, symbol: "Al", name: "Aluminium", commonN: 14 },
  { z: 14, symbol: "Si", name: "Silicon",   commonN: 14 },
  { z: 15, symbol: "P",  name: "Phosphorus",commonN: 16 },
  { z: 16, symbol: "S",  name: "Sulfur",    commonN: 16 },
  { z: 17, symbol: "Cl", name: "Chlorine",  commonN: 18 },
  { z: 18, symbol: "Ar", name: "Argon",     commonN: 22 },
  { z: 19, symbol: "K",  name: "Potassium", commonN: 20 },
  { z: 20, symbol: "Ca", name: "Calcium",   commonN: 20 },
];
const MAX_Z = ELEMENTS.length;

const SHELL_CAPS = [2, 8, 8, 18, 18, 32];

/** Fill electron shells using the simplified Bohr rule (2, 8, 8, 18…). */
function shellsFromElectrons(e: number): number[] {
  const shells: number[] = [];
  let rem = e;
  for (const cap of SHELL_CAPS) {
    if (rem <= 0) break;
    const n = Math.min(cap, rem);
    shells.push(n);
    rem -= n;
  }
  if (rem > 0) shells.push(rem);
  return shells;
}

function Stepper({
  label, value, onChange, min, max, color,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; color: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="rounded-xl p-4"
      style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color }}>{label}</span>
        <span className="font-display text-2xl" style={{ color }}>{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => set(value - 1)} disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:scale-105 disabled:opacity-30"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`, color }}
          aria-label={`Decrease ${label}`}>
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)" }}>
          <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${((value - min) / (max - min)) * 100}%`, background: color }} />
        </div>
        <button onClick={() => set(value + 1)} disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:scale-105 disabled:opacity-30"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`, color }}
          aria-label={`Increase ${label}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface Challenge { text: string; hint: string; check: (p: number, n: number, e: number) => boolean }
const CHALLENGES: Challenge[] = [
  { text: "Build a neutral Carbon atom (6 protons, 6 electrons).", hint: "Protons = electrons makes it neutral.", check: (p, _n, e) => p === 6 && e === 6 },
  { text: "Make a Sodium ion, Na⁺ — 11 protons but only 10 electrons.", hint: "Remove one electron to give it a +1 charge.", check: (p, _n, e) => p === 11 && e === 10 },
  { text: "Create Carbon-14, the isotope with 8 neutrons.", hint: "Keep 6 protons; change the neutron count.", check: (p, n) => p === 6 && n === 8 },
  { text: "Build a Chloride ion, Cl⁻ — 17 protons and 18 electrons.", hint: "Add one extra electron for a −1 charge.", check: (p, _n, e) => p === 17 && e === 18 },
];

function AtomicBuilder() {
  const { uid } = useUserProfile();
  const [protons, setProtons]     = useState(6); // Carbon by default
  const [neutrons, setNeutrons]   = useState(6);
  const [electrons, setElectrons] = useState(6);
  const [challengeIdx, setChallengeIdx] = useState(0);

  const el = protons >= 1 && protons <= MAX_Z ? ELEMENTS[protons - 1] : null;

  const analysis = useMemo(() => {
    const mass = protons + neutrons;
    const charge = protons - electrons;
    const shells = shellsFromElectrons(electrons);
    const ion =
      charge === 0 ? "Neutral atom"
      : charge > 0 ? `Cation (${charge}+)`
      : `Anion (${Math.abs(charge)}−)`;
    const isIsotope = el ? neutrons !== el.commonN : false;
    // Approximate nuclear stability from closeness to the common isotope.
    const nDiff = el ? Math.abs(neutrons - el.commonN) : 99;
    const stability =
      nDiff <= 1 ? { label: "Stable", color: "var(--color-emerald-elixir)" }
      : nDiff <= 3 ? { label: "Slightly unstable", color: "var(--color-gold)" }
      : { label: "Likely radioactive", color: "var(--color-crimson)" };
    return { mass, charge, shells, ion, isIsotope, stability };
  }, [protons, neutrons, electrons, el]);

  // Colour the atom by its ionic state.
  const atomColor = analysis.charge === 0 ? "#2dd4bf" : analysis.charge > 0 ? "#e0b457" : "#60a5fa";

  const shellString = analysis.shells.join(",");

  // ── Guided challenge ──
  const challenge = CHALLENGES[challengeIdx];
  const solved = challenge.check(protons, neutrons, electrons);
  useEffect(() => {
    if (solved && uid) logPractice(uid, "atomic-builder");
  }, [solved, uid]);
  const nextChallenge = () => setChallengeIdx((i) => (i + 1) % CHALLENGES.length);

  const setNeutral = () => setElectrons(protons);
  const reset = () => { setProtons(6); setNeutrons(6); setElectrons(6); };

  return (
    <ModuleShell
      title="Atomic Builder"
      eyebrow="Simulation Engine"
      icon={Atom}
      subtitle="Adjust the subatomic particles to construct an atom. The Bohr model, element identity, isotope and ion state all update live."
    >
        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Left: 3D model + identity ── */}
          <div>
            <div className="relative rounded-2xl overflow-hidden"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 30%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))",
                border: `1px solid color-mix(in oklab, ${atomColor} 35%, transparent)`,
                boxShadow: `0 0 60px -22px color-mix(in oklab, ${atomColor} 50%, transparent)`,
                minHeight: 380,
              }}>
              <BohrModel3D key={shellString || "empty"} interactive electrons={shellString} color={atomColor} nucleusColor="#a855f7" label={el?.symbol ?? "?"} />
              <div className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.2em] text-parchment/50 pointer-events-none">drag to spin ⟳</div>
            </div>

            {/* Identity banner */}
            <div className="mt-4 rounded-2xl p-5 flex items-center gap-5"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: `color-mix(in oklab, ${atomColor} 16%, transparent)`, border: `2px solid color-mix(in oklab, ${atomColor} 55%, transparent)` }}>
                <span className="font-display text-2xl leading-none" style={{ color: atomColor }}>{el?.symbol ?? "?"}</span>
                <span className="text-[9px] text-parchment/60 mt-0.5">{protons}p</span>
              </div>
              <div>
                <h2 className="font-display text-2xl">{el?.name ?? "Unknown"}</h2>
                <p className="text-sm text-parchment mt-0.5">
                  {el ? <>Mass number <span className="text-spectral font-medium">{analysis.mass}</span> · {el.symbol}-{analysis.mass}</> : "Set 1–20 protons"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: controls + readouts ── */}
          <div className="space-y-4">
            <Stepper label="Protons"   value={protons}   onChange={setProtons}   min={1} max={MAX_Z} color="#e0b457" />
            <Stepper label="Neutrons"  value={neutrons}  onChange={setNeutrons}  min={0} max={30}    color="#9aa7bd" />
            <Stepper label="Electrons" value={electrons} onChange={setElectrons} min={0} max={30}    color="#2dd4bf" />

            <div className="flex gap-3">
              <button onClick={setNeutral}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs tracking-[0.12em] uppercase transition hover:-translate-y-0.5"
                style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)", color: "var(--color-emerald-elixir)" }}>
                Make Neutral
              </button>
              <button onClick={reset}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs tracking-[0.12em] uppercase text-parchment/70 transition hover:text-spectral"
                style={{ border: "1px solid var(--color-border)" }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>

            {/* Readouts */}
            <div className="grid grid-cols-2 gap-3">
              <Readout label="Charge / Ion" value={analysis.ion}
                color={analysis.charge === 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)"} />
              <Readout label="Isotope" value={analysis.isIsotope ? "Yes — rare isotope" : "No — common form"}
                color={analysis.isIsotope ? "var(--color-wraith)" : "var(--color-parchment)"} />
              <Readout label="Mass Number (A)" value={String(analysis.mass)} color="var(--color-spectral)" />
              <Readout label="Nuclear Stability" value={analysis.stability.label} color={analysis.stability.color} />
            </div>

            {/* Shell capacities */}
            <div className="rounded-xl p-4"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="text-[10px] tracking-[0.25em] uppercase text-parchment/60 mb-2">Electron Shells</div>
              {analysis.shells.length === 0 ? (
                <p className="text-sm text-parchment/50">No electrons — a bare nucleus.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.shells.map((n, i) => (
                    <span key={i} className="rounded-full px-3 py-1 text-xs"
                      style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 30%, transparent)", color: "var(--color-emerald-elixir)" }}>
                      Shell {i + 1}: {n}/{SHELL_CAPS[i] ?? "—"} e⁻
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Guided challenge */}
            <ChallengeBanner prompt={challenge.text} solved={solved} hint={challenge.hint} />
            {solved && (
              <button onClick={nextChallenge} className="btn-ghost-arcane w-full justify-center text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Next challenge
              </button>
            )}
          </div>
        </div>

        {/* Teaching layer */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ConceptCard title="What each particle does">
            <span className="text-spectral">Protons</span> decide which element it is (the atomic number).{" "}
            <span className="text-spectral">Neutrons</span> change the mass — same element, different mass is an{" "}
            <span className="text-wraith">isotope</span>. <span className="text-spectral">Electrons</span> balance the charge —
            add or remove one and you get an <span className="text-gold">ion</span>.
          </ConceptCard>
          <DidYouKnow>
            Carbon-14 — carbon with 8 neutrons instead of 6 — is radioactive and decays at a known rate.
            Scientists measure how much is left to <span className="text-spectral">date bones and artefacts</span> thousands of years old.
          </DidYouKnow>
        </div>
    </ModuleShell>
  );
}

function Readout({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5"
      style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/55 mb-1">{label}</div>
      <div className="font-display text-sm" style={{ color }}>{value}</div>
    </div>
  );
}
