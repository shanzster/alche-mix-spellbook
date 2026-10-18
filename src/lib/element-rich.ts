/**
 * Rich, education-first content for the curated elements — the real-world
 * uses, a "you've seen it here" example, and a one-line wonder note that the
 * element detail page (`/element/$symbol`) leans on. Kept out of the route
 * files so both the periodic table and the detail page share one source.
 *
 * Real chemistry only (SCOPE principle 1): every use and example is genuine.
 * Elements without an entry fall back to category-derived copy on the page.
 */
export interface RichInfo {
  state: "Solid" | "Liquid" | "Gas";
  /** Real-world applications — rendered as "sample items" on the detail page. */
  uses: string[];
  /** One everyday place a student has already met this element. */
  examples: string;
  /** A single wonder-fact. */
  note: string;
}

export const RICH: Record<number, RichInfo> = {
  1: { state: "Gas", uses: ["Rocket fuel", "Making ammonia for fertiliser", "Hydrogen fuel cells"],
    examples: "Bonded with oxygen it makes every drop of water (H₂O).",
    note: "The lightest and most abundant element in the universe — stars are mostly hydrogen." },
  2: { state: "Gas", uses: ["Filling balloons & airships", "Cooling MRI magnets", "Deep-sea diving gas mixes"],
    examples: "The gas that makes party balloons float and your voice go squeaky.",
    note: "So light it escapes Earth's gravity — and it was first discovered in the Sun, not on Earth." },
  3: { state: "Solid", uses: ["Rechargeable batteries", "Mood-stabilising medicine", "Heat-resistant glass"],
    examples: "Powers your phone, laptop and electric cars.",
    note: "The lightest metal — soft enough to cut with a knife and light enough to float on water." },
  6: { state: "Solid", uses: ["Making steel", "Diamonds & pencil 'lead'", "The backbone of all living things"],
    examples: "Every living thing — you included — is built around carbon.",
    note: "The same element forms both diamond (hardest natural material) and soft, slippery graphite." },
  7: { state: "Gas", uses: ["Fertilisers", "Preserving packaged food", "Liquid nitrogen for freezing"],
    examples: "Makes up 78% of the air you breathe.",
    note: "Its molecules are so unreactive it's pumped into crisp packets to keep them fresh." },
  8: { state: "Gas", uses: ["Breathing & hospital medicine", "Making steel", "Rocket propellant"],
    examples: "Every breath you take and every fire that burns needs it.",
    note: "Reactive enough to rust iron and power your cells — about 21% of the air is oxygen." },
  9: { state: "Gas", uses: ["Fluoride in toothpaste", "Non-stick coatings (Teflon)", "Refrigerant gases"],
    examples: "Added to toothpaste and tap water to protect your teeth.",
    note: "The most reactive element of all — it reacts with almost everything, even glass." },
  10: { state: "Gas", uses: ["Glowing signs", "High-voltage indicators", "Some lasers"],
    examples: "The red-orange glow of classic 'neon' signs.",
    note: "A full outer shell makes it completely unreactive — it simply glows when electrified." },
  11: { state: "Solid", uses: ["Table salt (with chlorine)", "Orange street lamps", "Soap making"],
    examples: "Half of the salt on your food is sodium.",
    note: "So reactive that pure sodium bursts into flame in water — yet it's essential for your nerves." },
  12: { state: "Solid", uses: ["Lightweight alloys", "Fireworks & flares", "Dietary supplements"],
    examples: "Burns with a brilliant white light in fireworks and flares.",
    note: "It sits at the centre of chlorophyll — without it, plants couldn't photosynthesise." },
  13: { state: "Solid", uses: ["Drink cans & foil", "Aircraft bodies", "Power lines"],
    examples: "Drink cans, kitchen foil and aeroplane fuselages.",
    note: "The most abundant metal in Earth's crust — light, strong and endlessly recyclable." },
  14: { state: "Solid", uses: ["Computer chips", "Solar panels", "Glass & ceramics"],
    examples: "The 'silicon' in Silicon Valley — it runs every computer.",
    note: "A semiconductor: it conducts electricity just enough to switch signals on and off." },
  16: { state: "Solid", uses: ["Making sulfuric acid", "Vulcanising rubber for tyres", "Gunpowder & matches"],
    examples: "The yellow crust around volcanoes and hot springs.",
    note: "It gives rotten eggs their smell — and the acid made from it is the world's most-produced chemical." },
  17: { state: "Gas", uses: ["Disinfecting water & pools", "Household bleach", "Making PVC plastic"],
    examples: "Keeps swimming pools and drinking water safe.",
    note: "A toxic green gas on its own, but bonded with sodium it becomes harmless table salt." },
  19: { state: "Solid", uses: ["Fertilisers", "Salt substitutes", "Nerve & muscle signals"],
    examples: "Bananas are famous for being rich in it.",
    note: "Vital for your heartbeat and nerves — its symbol K comes from the Latin 'kalium'." },
  20: { state: "Solid", uses: ["Cement & concrete", "Building bones & teeth", "Antacid tablets"],
    examples: "Builds your bones and teeth; found in milk and cheese.",
    note: "The most abundant metal in your body — and the main ingredient of chalk, marble and seashells." },
  26: { state: "Solid", uses: ["Steel for buildings & cars", "Tools & machinery", "Carrying oxygen in your blood"],
    examples: "Steel skyscrapers, cars — and the haemoglobin in your blood.",
    note: "The most common element on Earth by mass, and the reason your blood is red." },
  29: { state: "Solid", uses: ["Electrical wiring", "Water pipes", "Coins & bronze"],
    examples: "The wires in your walls and the pipes under your sink.",
    note: "One of the first metals humans used — it slowly turns green as it weathers, like the Statue of Liberty." },
  79: { state: "Solid", uses: ["Jewellery", "Electronics connectors", "Dentistry"],
    examples: "Rings, medals and the gold contacts inside phones.",
    note: "So unreactive it never tarnishes — gold buried for thousands of years comes out still shining." },
};

export function richFor(atomicNumber: number): RichInfo | undefined {
  return RICH[atomicNumber];
}
