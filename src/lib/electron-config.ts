/**
 * Ground-state electron configurations for all 118 elements.
 *
 * Built by Aufbau (Madelung) filling, then corrected against the accepted
 * experimental configurations for the elements that break the simple rule
 * (Cr, Cu, the Nb–Ag run, Pt/Au, and the lanthanide/actinide d¹ cases).
 * Output uses the noble-gas core shorthand students meet in class,
 * e.g. iron → "[Ar] 3d⁶ 4s²".
 */

const ORDER = [
  "1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p",
  "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p",
] as const;

const CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };

// Accepted experimental configurations that differ from plain Aufbau.
// Values are the full subshell lists AFTER the noble-gas core.
const EXCEPTIONS: Record<number, string> = {
  24: "[Ar] 3d⁵ 4s¹",            // chromium
  29: "[Ar] 3d¹⁰ 4s¹",           // copper
  41: "[Kr] 4d⁴ 5s¹",            // niobium
  42: "[Kr] 4d⁵ 5s¹",            // molybdenum
  44: "[Kr] 4d⁷ 5s¹",            // ruthenium
  45: "[Kr] 4d⁸ 5s¹",            // rhodium
  46: "[Kr] 4d¹⁰",               // palladium
  47: "[Kr] 4d¹⁰ 5s¹",           // silver
  57: "[Xe] 5d¹ 6s²",            // lanthanum
  58: "[Xe] 4f¹ 5d¹ 6s²",        // cerium
  64: "[Xe] 4f⁷ 5d¹ 6s²",        // gadolinium
  78: "[Xe] 4f¹⁴ 5d⁹ 6s¹",       // platinum
  79: "[Xe] 4f¹⁴ 5d¹⁰ 6s¹",      // gold
  89: "[Rn] 6d¹ 7s²",            // actinium
  90: "[Rn] 6d² 7s²",            // thorium
  91: "[Rn] 5f² 6d¹ 7s²",        // protactinium
  92: "[Rn] 5f³ 6d¹ 7s²",        // uranium
  93: "[Rn] 5f⁴ 6d¹ 7s²",        // neptunium
  96: "[Rn] 5f⁷ 6d¹ 7s²",        // curium
  103: "[Rn] 5f¹⁴ 7s² 7p¹",      // lawrencium
};

// Noble-gas cores, largest first.
const CORES: [number, string][] = [
  [86, "Rn"], [54, "Xe"], [36, "Kr"], [18, "Ar"], [10, "Ne"], [2, "He"],
];

const SUPERS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
const sup = (n: number) => String(n).split("").map((d) => SUPERS[d]).join("");

function aufbau(z: number): [string, number][] {
  const filled: [string, number][] = [];
  let left = z;
  for (const sub of ORDER) {
    if (left <= 0) break;
    const cap = CAPACITY[sub[sub.length - 1]];
    const take = Math.min(cap, left);
    filled.push([sub, take]);
    left -= take;
  }
  return filled;
}

/** Ground-state configuration in noble-gas shorthand, e.g. "[Ar] 3d⁶ 4s²". */
export function electronConfig(z: number): string {
  if (z < 1) return "";
  const exception = EXCEPTIONS[z];
  if (exception) return exception;

  const core = CORES.find(([coreZ]) => coreZ < z);
  const filled = aufbau(z);

  if (!core) {
    return filled.map(([s, n]) => `${s}${sup(n)}`).join(" ");
  }
  // Subtract the core's own subshells, then print what remains in shell order
  // (n ascending, s<p<d<f within a shell — the order students write).
  const coreFilled = aufbau(core[0]);
  const rest = new Map(filled);
  for (const [s, n] of coreFilled) {
    const have = rest.get(s) ?? 0;
    if (have <= n) rest.delete(s);
    else rest.set(s, have - n);
  }
  const L: Record<string, number> = { s: 0, p: 1, d: 2, f: 3 };
  const parts = [...rest.entries()].sort((a, b) => {
    const [na, la] = [parseInt(a[0]), L[a[0][a[0].length - 1]]];
    const [nb, lb] = [parseInt(b[0]), L[b[0][b[0].length - 1]]];
    return na - nb || la - lb;
  });
  return `[${core[1]}] ${parts.map(([s, n]) => `${s}${sup(n)}`).join(" ")}`;
}
