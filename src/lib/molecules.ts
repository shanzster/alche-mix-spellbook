/**
 * Molecular geometry data for the VSEPR 3D viewer (and reused wherever we draw
 * real molecules). Positions are unit direction vectors from the central atom;
 * the renderer scales them by bond length. Angles/hybridisation are the real
 * textbook values.
 */

// ── Element render styles (CPK-ish, tuned for the dark stage) ─────────────────
export interface ElementStyle { color: string; radius: number; }
export const ELEMENT_STYLE: Record<string, ElementStyle> = {
  H:  { color: "#e8edf5", radius: 0.30 },
  C:  { color: "#5b6472", radius: 0.50 },
  N:  { color: "#5b8def", radius: 0.48 },
  O:  { color: "#ef4444", radius: 0.46 },
  F:  { color: "#4ade80", radius: 0.42 },
  Cl: { color: "#22c55e", radius: 0.58 },
  B:  { color: "#fbbf24", radius: 0.50 },
  S:  { color: "#eab308", radius: 0.58 },
  P:  { color: "#f97316", radius: 0.56 },
};
export function elementStyle(el: string): ElementStyle {
  return ELEMENT_STYLE[el] ?? { color: "#a78bfa", radius: 0.45 };
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
type V3 = [number, number, number];
const norm = (v: V3): V3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

// A few canonical VSEPR direction sets.
const TETRA: V3[] = ([[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]] as V3[]).map(norm);
const bentH = (deg: number): V3[] => {
  const h = ((deg / 2) * Math.PI) / 180;
  return [[-Math.sin(h), -Math.cos(h), 0], [Math.sin(h), -Math.cos(h), 0]];
};

export interface MolBond { el: string; pos: V3; order: 1 | 2 | 3; }
export interface Molecule {
  id: string;
  name: string;
  formula: string;
  central: string;
  geometry: string;   // e.g. "Bent"
  angle: string;      // e.g. "104.5°"
  hybridisation: string; // e.g. "sp³"
  bonds: MolBond[];
  lonePairs: V3[];    // directions of lone-pair lobes on the central atom
  note: string;
}

export const MOLECULES: Molecule[] = [
  {
    id: "co2", name: "Carbon dioxide", formula: "CO₂", central: "C",
    geometry: "Linear", angle: "180°", hybridisation: "sp",
    bonds: [
      { el: "O", pos: [1, 0, 0], order: 2 },
      { el: "O", pos: [-1, 0, 0], order: 2 },
    ],
    lonePairs: [],
    note: "Two double bonds, no lone pairs on carbon → the two oxygens sit on exact opposite sides.",
  },
  {
    id: "h2o", name: "Water", formula: "H₂O", central: "O",
    geometry: "Bent", angle: "104.5°", hybridisation: "sp³",
    bonds: bentH(104.5).map((pos) => ({ el: "H", pos, order: 1 as const })),
    lonePairs: [norm([0, 0.6, 0.9]), norm([0, 0.6, -0.9])],
    note: "Four electron domains, but two are lone pairs — they push the O–H bonds down into a bend.",
  },
  {
    id: "nh3", name: "Ammonia", formula: "NH₃", central: "N",
    geometry: "Trigonal pyramidal", angle: "107°", hybridisation: "sp³",
    bonds: [0, 1, 2].map((k) => {
      const a = (k * 2 * Math.PI) / 3;
      return { el: "H", pos: norm([0.943 * Math.cos(a), -0.333, 0.943 * Math.sin(a)]), order: 1 as const };
    }),
    lonePairs: [[0, 1, 0]],
    note: "One lone pair on top presses the three N–H bonds into a pyramid.",
  },
  {
    id: "ch4", name: "Methane", formula: "CH₄", central: "C",
    geometry: "Tetrahedral", angle: "109.5°", hybridisation: "sp³",
    bonds: TETRA.map((pos) => ({ el: "H", pos, order: 1 as const })),
    lonePairs: [],
    note: "Four bonds, no lone pairs — the most symmetric everyday shape.",
  },
  {
    id: "bf3", name: "Boron trifluoride", formula: "BF₃", central: "B",
    geometry: "Trigonal planar", angle: "120°", hybridisation: "sp²",
    bonds: [0, 1, 2].map((k) => {
      const a = (k * 2 * Math.PI) / 3;
      return { el: "F", pos: [Math.cos(a), Math.sin(a), 0] as V3, order: 1 as const };
    }),
    lonePairs: [],
    note: "Only three bonds and no lone pairs on boron → a flat triangle.",
  },
  {
    id: "hcl", name: "Hydrogen chloride", formula: "HCl", central: "Cl",
    geometry: "Linear (diatomic)", angle: "—", hybridisation: "—",
    bonds: [{ el: "H", pos: [1, 0, 0], order: 1 }],
    lonePairs: [norm([-0.6, 0.8, 0]), norm([-0.6, -0.8, 0]), norm([-0.6, 0, 0.8])],
    note: "A simple two-atom molecule — a single polar covalent bond.",
  },
];

export function moleculeById(id: string): Molecule | undefined {
  return MOLECULES.find((m) => m.id === id);
}
