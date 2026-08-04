import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shapes, Triangle, Eye, EyeOff } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { Molecule3D } from "../components/Molecule3D";
import { MOLECULES, elementStyle } from "../lib/molecules";

export const Route = createFileRoute("/molecules")({
  component: () => (
    <RequireRole role="student">
      <MoleculeViewer />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-emerald-elixir)";

function MoleculeViewer() {
  const [id, setId] = useState(MOLECULES[1].id); // default: water
  const [lonePairs, setLonePairs] = useState(true);
  const mol = MOLECULES.find((m) => m.id === id)!;

  return (
    <StudentShell title="Molecule Shapes">
      <PageHeader
        eyebrow="VSEPR Geometry"
        title="See the real shape of a molecule."
        subtitle="Bohr models show electrons; this shows how atoms actually arrange in 3D space. Drag to spin any molecule."
        icon={Shapes}
        accent={ACCENT}
      />

      {/* Molecule picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {MOLECULES.map((m) => {
          const active = m.id === id;
          return (
            <button key={m.id} onClick={() => setId(m.id)}
              className="rounded-xl px-3.5 py-2 text-sm font-display transition-all duration-150 hover:-translate-y-0.5"
              style={active
                ? { background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`, color: ACCENT, border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)`, boxShadow: `0 0 20px -8px ${ACCENT}` }
                : { color: "var(--color-parchment)", border: "1px solid var(--color-border)" }}>
              {m.formula}
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* 3D stage */}
        <div className="atom-stage-panel relative rounded-2xl overflow-hidden"
          style={{ border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`, boxShadow: `0 0 60px -26px ${ACCENT}`, minHeight: 380 }}>
          <div className="h-[380px]">
            <Molecule3D key={mol.id} molecule={mol} showLonePairs={lonePairs} />
          </div>
          <button onClick={() => setLonePairs((v) => !v)}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase backdrop-blur-sm"
            style={{ background: "color-mix(in oklab, #0b1220 60%, transparent)", color: "#fff", border: "1px solid color-mix(in oklab, #fff 20%, transparent)" }}>
            {lonePairs ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Lone pairs
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] text-white/45">drag to spin ⟳</div>
        </div>

        {/* Facts */}
        <div>
          <h2 className="font-display text-3xl mb-1">{mol.name}</h2>
          <p className="text-sm text-parchment/60 mb-5">{mol.formula} · central atom {mol.central}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <Fact label="Geometry" value={mol.geometry} accent={ACCENT} icon={<Triangle className="h-4 w-4" />} />
            <Fact label="Bond angle" value={mol.angle} accent="var(--color-gold)" />
            <Fact label="Hybridisation" value={mol.hybridisation} accent="var(--color-wraith)" />
            <Fact label="Lone pairs" value={String(mol.lonePairs.length)} accent="var(--color-emerald-elixir)" />
          </div>

          {/* Atom legend */}
          <div className="flex flex-wrap gap-3 mb-5">
            {[mol.central, ...mol.bonds.map((b) => b.el)].filter((v, i, a) => a.indexOf(v) === i).map((el) => (
              <span key={el} className="inline-flex items-center gap-2 text-xs text-parchment/70">
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: elementStyle(el).color }} /> {el}
              </span>
            ))}
          </div>

          <div className="rounded-xl px-4 py-3 text-sm text-parchment leading-relaxed"
            style={{ borderLeft: `3px solid color-mix(in oklab, ${ACCENT} 60%, transparent)`, background: `color-mix(in oklab, ${ACCENT} 7%, transparent)` }}>
            {mol.note}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}

function Fact({ label, value, accent, icon }: { label: string; value: string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: accent }}>{icon}{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}
