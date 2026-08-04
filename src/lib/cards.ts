// The 12 physical "Grimoire" base-element cards, plus the rule-based logic that
// lets collected cards be mixed into compounds. (This combine logic used to live
// in the Bonding module.)

export type Kind = "metal" | "nonmetal";

export interface Card {
  symbol: string;
  name: string;
  number: number;
  electrons: string;
  color: string;
  nucleus: string;
  category: string;
  /** Combining power (valence magnitude). */
  val: number;
  /** +1 = tends to give electrons (metal/H), -1 = tends to gain them. */
  sign: 1 | -1;
  kind: Kind;
  /** Rough electronegativity — decides which element is written first. */
  en: number;
  /** Root used to name the anion, e.g. "Chlor" → chloride. */
  anionRoot?: string;
}

export const BASE_CARDS: Card[] = [
  { symbol: "H",  name: "Hydrogen",  number: 1,  electrons: "1",       color: "#60a5fa", nucleus: "#93c5fd", category: "Nonmetal", val: 1, sign:  1, kind: "nonmetal", en: 2.2, anionRoot: "Hydr" },
  { symbol: "C",  name: "Carbon",    number: 6,  electrons: "2,4",     color: "#a3a3a3", nucleus: "#d4d4d4", category: "Nonmetal", val: 4, sign: -1, kind: "nonmetal", en: 2.5, anionRoot: "Carb" },
  { symbol: "N",  name: "Nitrogen",  number: 7,  electrons: "2,5",     color: "#93c5fd", nucleus: "#bfdbfe", category: "Nonmetal", val: 3, sign: -1, kind: "nonmetal", en: 3.0, anionRoot: "Nitr" },
  { symbol: "O",  name: "Oxygen",    number: 8,  electrons: "2,6",     color: "#f87171", nucleus: "#fca5a5", category: "Nonmetal", val: 2, sign: -1, kind: "nonmetal", en: 3.5, anionRoot: "Ox" },
  { symbol: "S",  name: "Sulfur",    number: 16, electrons: "2,8,6",   color: "#facc15", nucleus: "#fde68a", category: "Nonmetal", val: 2, sign: -1, kind: "nonmetal", en: 2.6, anionRoot: "Sulf" },
  { symbol: "Cl", name: "Chlorine",  number: 17, electrons: "2,8,7",   color: "#34d399", nucleus: "#86efac", category: "Halogen",  val: 1, sign: -1, kind: "nonmetal", en: 3.2, anionRoot: "Chlor" },
  { symbol: "Na", name: "Sodium",    number: 11, electrons: "2,8,1",   color: "#f87171", nucleus: "#fca5a5", category: "Alkali Metal", val: 1, sign: 1, kind: "metal", en: 0.9 },
  { symbol: "Mg", name: "Magnesium", number: 12, electrons: "2,8,2",   color: "#34d399", nucleus: "#6ee7b7", category: "Alkaline Earth Metal", val: 2, sign: 1, kind: "metal", en: 1.3 },
  { symbol: "Al", name: "Aluminium", number: 13, electrons: "2,8,3",   color: "#60a5fa", nucleus: "#93c5fd", category: "Post-transition Metal", val: 3, sign: 1, kind: "metal", en: 1.6 },
  { symbol: "K",  name: "Potassium", number: 19, electrons: "2,8,8,1", color: "#c084fc", nucleus: "#d8b4fe", category: "Alkali Metal", val: 1, sign: 1, kind: "metal", en: 0.8 },
  { symbol: "Ca", name: "Calcium",   number: 20, electrons: "2,8,8,2", color: "#fb923c", nucleus: "#fdba74", category: "Alkaline Earth Metal", val: 2, sign: 1, kind: "metal", en: 1.0 },
  { symbol: "Fe", name: "Iron",      number: 26, electrons: "2,8,14,2",color: "#a78bfa", nucleus: "#c4b5fd", category: "Transition Metal", val: 2, sign: 1, kind: "metal", en: 1.8 },
];

export function cardBySymbol(symbol: string): Card | undefined {
  return BASE_CARDS.find((c) => c.symbol === symbol);
}

const PREFIX = ["", "", "Di", "Tri", "Tetra", "Penta", "Hexa"];
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

export interface MixResult {
  valid: boolean;
  reason?: string;
  formula?: string;
  bond?: "ionic" | "covalent";
  name?: string;
  first?: Reagent;
  second?: Reagent;
  /** Enrichment from the known-compound table (below). */
  commonName?: string;
  uses?: string;
  hazard?: Hazard;
  unstable?: boolean;
  note?: string;
}

/** Combine two element cards into a compound using valence rules. */
export function combineCards(a: Card, b: Card): MixResult {
  if (a.kind === "metal" && b.kind === "metal")
    return { valid: false, reason: "Two metals form an alloy, not a molecular compound." };
  if (a.symbol === b.symbol)
    return { valid: false, reason: "Mix two different cards to forge a compound." };

  const bond: "ionic" | "covalent" = a.kind !== b.kind ? "ionic" : "covalent";
  const [first, second] = a.en <= b.en ? [a, b] : [b, a];

  let s1 = second.val, s2 = first.val;
  const g = gcd(s1, s2) || 1;
  s1 /= g; s2 /= g;

  const sub = (n: number) => (n === 1 ? "" : String(n));
  const formula = `${first.symbol}${sub(s1)}${second.symbol}${sub(s2)}`;

  let name: string;
  if (bond === "ionic") {
    name = `${first.name} ${second.anionRoot ?? second.name}ide`;
  } else {
    const p1 = s1 < PREFIX.length ? PREFIX[s1] : "";
    const p2 = s2 < PREFIX.length ? PREFIX[s2] : "";
    const firstPart = p1 ? p1 + " " : "";
    name = `${firstPart}${first.name} ${p2 || "Mono"}${(second.anionRoot ?? second.name).toLowerCase()}ide`;
  }

  return enrich({ valid: true, formula, bond, name, first, second });
}

// ════════════════════════════════════════════════════════════════════════════
//  Polyatomic ions — so real compounds (CaCO₃, NaOH, acids…) become forgeable.
//  A polyatomic ion is a group of atoms that stays together as one unit.
// ════════════════════════════════════════════════════════════════════════════
export interface PolyIon {
  symbol: string;   // e.g. "CO3"
  display: string;  // e.g. "CO₃²⁻"
  name: string;     // e.g. "Carbonate"
  val: number;      // charge magnitude (combining power)
  sign: 1 | -1;     // +1 = behaves as a cation (ammonium), -1 = anion
  color: string;
  isIon: true;
}

export const POLYATOMIC_IONS: PolyIon[] = [
  { symbol: "OH",   display: "OH⁻",   name: "Hydroxide",   val: 1, sign: -1, color: "#38bdf8", isIon: true },
  { symbol: "NO3",  display: "NO₃⁻",  name: "Nitrate",     val: 1, sign: -1, color: "#f472b6", isIon: true },
  { symbol: "HCO3", display: "HCO₃⁻", name: "Bicarbonate", val: 1, sign: -1, color: "#a3e635", isIon: true },
  { symbol: "CO3",  display: "CO₃²⁻", name: "Carbonate",   val: 2, sign: -1, color: "#facc15", isIon: true },
  { symbol: "SO4",  display: "SO₄²⁻", name: "Sulfate",     val: 2, sign: -1, color: "#fb923c", isIon: true },
  { symbol: "PO4",  display: "PO₄³⁻", name: "Phosphate",   val: 3, sign: -1, color: "#c084fc", isIon: true },
  { symbol: "NH4",  display: "NH₄⁺",  name: "Ammonium",    val: 1, sign:  1, color: "#60a5fa", isIon: true },
];

/** Anything you can drop into the cauldron: an element card or a polyatomic ion. */
export type Reagent = Card | PolyIon;
export function isIon(r: Reagent): r is PolyIon {
  return (r as PolyIon).isIon === true;
}

// ── Hazard / stability metadata for known real compounds ──────────────────────
export type Hazard = "toxic" | "corrosive" | "flammable" | "oxidiser" | "harmful" | "none";
interface CompoundInfo { name: string; uses: string; hazard: Hazard; unstable?: boolean; note?: string; }

/** Keyed by the exact formula `combine` generates. Unknown mixes stay "none". */
const COMPOUND_INFO: Record<string, CompoundInfo> = {
  "NaCl":      { name: "Sodium chloride (table salt)", uses: "Seasoning and preserving food.", hazard: "none" },
  "H2O":       { name: "Water", uses: "Essential to all life; the universal solvent.", hazard: "none" },
  "CO2":       { name: "Carbon dioxide", uses: "Fizzy drinks and fire extinguishers.", hazard: "harmful", note: "Not poisonous, but suffocating in high concentration." },
  "CaCO3":     { name: "Calcium carbonate", uses: "Limestone, chalk, marble and eggshells.", hazard: "none" },
  "NaOH":      { name: "Sodium hydroxide (lye)", uses: "Making soap and unblocking drains.", hazard: "corrosive" },
  "Ca(OH)2":   { name: "Calcium hydroxide (slaked lime)", uses: "Treating soil and making cement.", hazard: "corrosive" },
  "H2SO4":     { name: "Sulfuric acid", uses: "Car batteries and industry.", hazard: "corrosive" },
  "HNO3":      { name: "Nitric acid", uses: "Fertilisers and explosives.", hazard: "corrosive" },
  "HCl":       { name: "Hydrogen chloride (hydrochloric acid)", uses: "Stomach acid; cleaning metal.", hazard: "corrosive" },
  "KNO3":      { name: "Potassium nitrate (saltpetre)", uses: "Fertiliser and gunpowder.", hazard: "oxidiser" },
  "Na2CO3":    { name: "Sodium carbonate (washing soda)", uses: "Making glass and softening water.", hazard: "harmful" },
  "NaHCO3":    { name: "Sodium bicarbonate (baking soda)", uses: "Baking and gentle cleaning.", hazard: "none" },
  "CaO":       { name: "Calcium oxide (quicklime)", uses: "Making cement and steel.", hazard: "corrosive" },
  "MgO":       { name: "Magnesium oxide", uses: "Antacids and heat-resistant bricks.", hazard: "none" },
  "Na2O":      { name: "Sodium oxide", uses: "Making glass and ceramics.", hazard: "corrosive" },
  "Al2O3":     { name: "Aluminium oxide", uses: "Sandpaper and ceramics; protects aluminium.", hazard: "none" },
  "H3N":       { name: "Ammonia", uses: "Fertilisers and cleaning products.", hazard: "toxic", note: "Choking fumes — handle with ventilation." },
  "NCl3":      { name: "Nitrogen trichloride", uses: "Almost none — dangerously explosive.", hazard: "toxic", unstable: true, note: "Detonates from heat or shock — an unstable compound." },
  "FeS":       { name: "Iron(II) sulfide", uses: "Releases rotten-egg gas in acid.", hazard: "harmful" },
  "FeO":       { name: "Iron(II) oxide", uses: "Pigments; a form of rust.", hazard: "none" },
  "FeCl2":     { name: "Iron(II) chloride", uses: "Treating waste water.", hazard: "harmful" },
  "K2CO3":     { name: "Potassium carbonate (potash)", uses: "Making soap and glass.", hazard: "harmful" },
  "(NH4)2SO4": { name: "Ammonium sulfate", uses: "A common nitrogen fertiliser.", hazard: "harmful" },
  "Mg(OH)2":   { name: "Magnesium hydroxide", uses: "Milk of magnesia — an antacid.", hazard: "none" },
  "CaSO4":     { name: "Calcium sulfate", uses: "Plaster of Paris and blackboard chalk.", hazard: "none" },
};

function enrich(res: MixResult): MixResult {
  const info = res.formula ? COMPOUND_INFO[res.formula] : undefined;
  if (!info) return { ...res, hazard: "none" };
  return { ...res, commonName: info.name, uses: info.uses, hazard: info.hazard, unstable: info.unstable, note: info.note };
}

// ════════════════════════════════════════════════════════════════════════════
//  Unified combine — elements AND polyatomic ions.
// ════════════════════════════════════════════════════════════════════════════
export function combine(a: Reagent, b: Reagent): MixResult {
  if (a.symbol === b.symbol) return { valid: false, reason: "Mix two different things to forge a compound." };
  // Two element cards → the original valence logic (keeps covalent naming etc.).
  if (!isIon(a) && !isIon(b)) return combineCards(a, b);

  // At least one polyatomic ion → ionic assembly (needs one + and one −).
  const pos = [a, b].find((r) => r.sign === 1);
  const neg = [a, b].find((r) => r.sign === -1);
  if (!pos || !neg) {
    return { valid: false, reason: "No compound forms — you need one positive part (a metal, hydrogen or ammonium) and one negative part (a non-metal or an ion)." };
  }

  const g = gcd(pos.val, neg.val) || 1;
  const nPos = neg.val / g, nNeg = pos.val / g;
  const part = (r: Reagent, n: number) => {
    const s = n === 1 ? "" : String(n);
    return isIon(r) && n > 1 ? `(${r.symbol})${s}` : `${r.symbol}${s}`;
  };
  const formula = part(pos, nPos) + part(neg, nNeg);

  const catName = pos.name; // metal / "Hydrogen" / "Ammonium"
  const anName = isIon(neg) ? neg.name.toLowerCase() : `${(neg as Card).anionRoot ?? neg.name}ide`;
  const name = `${catName} ${anName}`;

  return enrich({ valid: true, formula, bond: "ionic", name, first: pos, second: neg });
}
