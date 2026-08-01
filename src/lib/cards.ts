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
  first?: Card;
  second?: Card;
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

  return { valid: true, formula, bond, name, first, second };
}
