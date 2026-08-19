import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, RefreshCw, Atom, Target, Check, Sparkles } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { ConceptCard, DidYouKnow } from "../components/Learn";
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
  label, hint, value, onChange, min, max, color,
}: { label: string; hint: string; value: number; onChange: (v: number) => void; min: number; max: number; color: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="rounded-xl p-4"
      style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color }}>{label}</div>
          <div className="mt-0.5 text-[11px] text-parchment/55">{hint}</div>
        </div>
        <span className="font-display text-2xl leading-none" style={{ color }}>{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => set(value - 1)} disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:scale-105 disabled:opacity-30"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`, color }}
          aria-label={`Decrease ${label}`}>
          <Minus className="h-4 w-4" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)" }}>
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

// ── Guided missions — each gives a purpose + live sub-goals to hit ───────────
interface Goal { label: string; met: boolean; }
interface Mission {
  tag: string;
  text: string;
  hint: string;
  goals: (p: number, n: number, e: number) => Goal[];
}
const MISSIONS: Mission[] = [
  {
    tag: "Element", text: "Make Lithium. Protons decide the element — set them so the atom becomes Lithium.",
    hint: "Lithium is element number 3.",
    goals: (p) => [{ label: "3 protons", met: p === 3 }],
  },
  {
    tag: "Neutral atom", text: "Build a neutral Oxygen atom — 8 protons and 8 electrons.",
    hint: "Equal protons and electrons make the charge zero.",
    goals: (p, _n, e) => [{ label: "8 protons", met: p === 8 }, { label: "8 electrons", met: e === 8 }],
  },
  {
    tag: "Positive ion", text: "Make a Sodium ion, Na⁺ — 11 protons but only 10 electrons.",
    hint: "Remove one electron to leave a +1 charge.",
    goals: (p, _n, e) => [{ label: "11 protons", met: p === 11 }, { label: "10 electrons", met: e === 10 }],
  },
  {
    tag: "Negative ion", text: "Make a Chloride ion, Cl⁻ — 17 protons and 18 electrons.",
    hint: "Add one extra electron for a −1 charge.",
    goals: (p, _n, e) => [{ label: "17 protons", met: p === 17 }, { label: "18 electrons", met: e === 18 }],
  },
  {
    tag: "Isotope", text: "Create Carbon-14 — carbon with 8 neutrons.",
    hint: "Keep 6 protons; change only the neutrons.",
    goals: (p, n) => [{ label: "6 protons", met: p === 6 }, { label: "8 neutrons", met: n === 8 }],
  },
];

function AtomicBuilder() {
  const { uid } = useUserProfile();
  const [protons, setProtons]     = useState(6); // Carbon by default
  const [neutrons, setNeutrons]   = useState(6);
  const [electrons, setElectrons] = useState(6);
  const [missionIdx, setMissionIdx] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());

  const el = protons >= 1 && protons <= MAX_Z ? ELEMENTS[protons - 1] : null;

  const analysis = useMemo(() => {
    const mass = protons + neutrons;
    const charge = protons - electrons;
    const shells = shellsFromElectrons(electrons);
    const ion =
      charge === 0 ? "Neutral atom"
      : charge > 0 ? `Positive ion +${charge} (cation)`
      : `Negative ion −${Math.abs(charge)} (anion)`;
    const isIsotope = el ? neutrons !== el.commonN : false;
    const nDiff = el ? Math.abs(neutrons - el.commonN) : 99;
    const stability =
      nDiff <= 1 ? { label: "Stable", color: "var(--color-emerald-elixir)" }
      : nDiff <= 3 ? { label: "Slightly unstable", color: "var(--color-gold)" }
      : { label: "Likely radioactive", color: "var(--color-crimson)" };
    return { mass, charge, shells, ion, isIsotope, stability };
  }, [protons, neutrons, electrons, el]);

  // Live, plain-language read of exactly what you've built right now.
  const story = useMemo(() => {
    if (!el) return ["Set 1–20 protons to build an element."];
    const lines: string[] = [];
    lines.push(`${protons} proton${protons === 1 ? "" : "s"} makes this ${el.name} (${el.symbol}) — protons alone decide the element.`);
    if (analysis.charge === 0)
      lines.push(`Electrons balance the protons, so the + and − cancel out: a neutral atom.`);
    else if (analysis.charge > 0)
      lines.push(`It's short ${analysis.charge} electron${analysis.charge === 1 ? "" : "s"}, so it carries a +${analysis.charge} charge — a positive ion.`);
    else
      lines.push(`It has ${Math.abs(analysis.charge)} extra electron${Math.abs(analysis.charge) === 1 ? "" : "s"}, so it carries a −${Math.abs(analysis.charge)} charge — a negative ion.`);
    if (analysis.isIsotope)
      lines.push(`${neutrons} neutrons (the usual is ${el.commonN}) makes this the isotope ${el.symbol}-${analysis.mass}${analysis.stability.label === "Likely radioactive" ? " — likely radioactive" : ""}.`);
    else
      lines.push(`${neutrons} neutrons is ${el.name}'s most common, stable form: ${el.symbol}-${analysis.mass}.`);
    return lines;
  }, [el, protons, neutrons, analysis]);

  const atomColor = analysis.charge === 0 ? "#2dd4bf" : analysis.charge > 0 ? "#e0b457" : "#60a5fa";
  const shellString = analysis.shells.join(",");

  // ── Mission tracking ──
  const mission = MISSIONS[missionIdx];
  const goals = mission.goals(protons, neutrons, electrons);
  const solved = goals.every((g) => g.met);
  useEffect(() => {
    if (solved && uid) logPractice(uid, "atomic-builder");
    if (solved) setDone((d) => (d.has(missionIdx) ? d : new Set(d).add(missionIdx)));
  }, [solved, uid, missionIdx]);
  const nextMission = () => setMissionIdx((i) => (i + 1) % MISSIONS.length);

  const setNeutral = () => setElectrons(protons);
  const reset = () => { setProtons(6); setNeutrons(6); setElectrons(6); };

  return (
    <ModuleShell
      title="Atomic Builder"
      eyebrow="Build-an-Atom Lab"
      icon={Atom}
      subtitle="Every atom in the universe is just three particles — protons, neutrons and electrons. Add or remove them here and watch which element you make, whether it's charged, and whether it's radioactive."
    >
      {/* Mission — the point of the lab, up top. */}
      <div className="mb-6 rounded-2xl p-5"
        style={{ background: `color-mix(in oklab, ${solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} ${solved ? 12 : 9}%, transparent)`, border: `1px solid color-mix(in oklab, ${solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} ${solved ? 45 : 30}%, transparent)`, boxShadow: solved ? "0 0 30px -12px var(--color-emerald-elixir)" : "none" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${solved ? "var(--color-emerald-elixir)" : "var(--color-gold)"} 18%, transparent)`, color: solved ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
              {solved ? <Check className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            </span>
            <span className="font-display text-sm" style={{ color: solved ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
              {solved ? "Mission complete!" : `Mission · ${mission.tag}`}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/45">{done.size}/{MISSIONS.length} solved</span>
        </div>
        <p className="mt-2 text-sm text-spectral">{mission.text}</p>
        {/* Live sub-goal checklist — see exactly what's left. */}
        <div className="mt-3 flex flex-wrap gap-2">
          {goals.map((g) => (
            <span key={g.label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition"
              style={{
                background: `color-mix(in oklab, ${g.met ? "var(--color-emerald-elixir)" : "var(--color-parchment)"} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${g.met ? "var(--color-emerald-elixir)" : "var(--color-parchment)"} 30%, transparent)`,
                color: g.met ? "var(--color-emerald-elixir)" : "var(--color-parchment)",
              }}>
              {g.met ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border" style={{ borderColor: "currentColor" }} />}
              {g.label}
            </span>
          ))}
        </div>
        {!solved
          ? <p className="mt-2 text-xs text-parchment/60">Hint: {mission.hint}</p>
          : <button onClick={nextMission} className="btn-ghost-arcane mt-3 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Next mission</button>}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Left: 3D model + identity + live explanation ── */}
        <div>
          <div className="relative overflow-hidden rounded-2xl"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, color-mix(in oklab, var(--color-violet-deep) 30%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))",
              border: `1px solid color-mix(in oklab, ${atomColor} 35%, transparent)`,
              boxShadow: `0 0 60px -22px color-mix(in oklab, ${atomColor} 50%, transparent)`,
              minHeight: 360,
            }}>
            <BohrModel3D key={shellString || "empty"} interactive electrons={shellString} color={atomColor} nucleusColor="#a855f7" label={el?.symbol ?? "?"} />
            <div className="pointer-events-none absolute right-3 top-3 text-[9px] uppercase tracking-[0.2em] text-parchment/50">drag to spin ⟳</div>
          </div>

          {/* Identity banner */}
          <div className="mt-4 flex items-center gap-5 rounded-2xl p-5"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 68%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl"
              style={{ background: `color-mix(in oklab, ${atomColor} 16%, transparent)`, border: `2px solid color-mix(in oklab, ${atomColor} 55%, transparent)` }}>
              <span className="font-display text-2xl leading-none" style={{ color: atomColor }}>{el?.symbol ?? "?"}</span>
              <span className="mt-0.5 text-[9px] text-parchment/60">{protons}p</span>
            </div>
            <div>
              <h2 className="font-display text-2xl">{el?.name ?? "Unknown"}</h2>
              <p className="mt-0.5 text-sm text-parchment">
                {el ? <>{el.symbol}-{analysis.mass} · <span style={{ color: atomColor }}>{analysis.ion}</span></> : "Set 1–20 protons"}
              </p>
            </div>
          </div>

          {/* Live "what you just built" explanation — the teaching core. */}
          <div className="mt-4 rounded-2xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="mb-2 flex items-center gap-2 text-teal">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-display text-[11px] uppercase tracking-[0.2em]">What you've built</span>
            </div>
            <ul className="space-y-1.5">
              {story.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-parchment/85">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: atomColor }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right: controls + readouts ── */}
        <div className="space-y-4">
          <Stepper label="Protons"   hint="sets which element it is"        value={protons}   onChange={setProtons}   min={1} max={MAX_Z} color="#e0b457" />
          <Stepper label="Neutrons"  hint="sets the mass — makes isotopes"  value={neutrons}  onChange={setNeutrons}  min={0} max={30}    color="#9aa7bd" />
          <Stepper label="Electrons" hint="sets the charge — makes ions"    value={electrons} onChange={setElectrons} min={0} max={30}    color="#2dd4bf" />

          <div className="flex gap-3">
            <button onClick={setNeutral}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs uppercase tracking-[0.12em] transition hover:-translate-y-0.5"
              style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)", color: "var(--color-emerald-elixir)" }}>
              Balance charge
            </button>
            <button onClick={reset}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-parchment/70 transition hover:text-spectral"
              style={{ border: "1px solid var(--color-border)" }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>

          {/* Readouts */}
          <div className="grid grid-cols-2 gap-3">
            <Readout label="Charge" value={analysis.ion}
              color={analysis.charge === 0 ? "var(--color-emerald-elixir)" : "var(--color-gold)"} />
            <Readout label="Isotope?" value={analysis.isIsotope ? "Rare isotope" : "Common form"}
              color={analysis.isIsotope ? "var(--color-wraith)" : "var(--color-parchment)"} />
            <Readout label="Mass number (protons + neutrons)" value={String(analysis.mass)} color="var(--color-spectral)" />
            <Readout label="Nuclear stability" value={analysis.stability.label} color={analysis.stability.color} />
          </div>

          {/* Shell capacities */}
          <div className="rounded-xl p-4"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-parchment/60">Electron shells (fill inner first)</div>
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
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-parchment/55">{label}</div>
      <div className="font-display text-sm" style={{ color }}>{value}</div>
    </div>
  );
}
