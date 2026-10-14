/**
 * The Lexicon — in-platform reference pages for chemistry terms, plus the
 * glossary of AlcheMix's invented vocabulary.
 *
 * Adviser items 15–16: hovering a term shows a short preview; clicking opens
 * the full page; every page is written in-house and names a RELIABLE source
 * (Britannica / standard textbooks — never Wikipedia, which she rejected as
 * editable). Chemistry content is stable, so these pages don't need upkeep.
 */

export interface LexiconEntry {
  id: string;
  term: string;
  /** One–two sentences for the hover preview. */
  preview: string;
  /** Full page body (plain paragraphs). */
  body: string[];
  /** Named, checkable references — the page's "cite the source" line. */
  source: string;
}

const BRITANNICA = "Encyclopædia Britannica";
const CENTRAL = "Brown, LeMay, Bursten & Murphy — Chemistry: The Central Science (14th ed., Pearson)";
const ZUMDAHL = "Zumdahl & Zumdahl — Chemistry (10th ed., Cengage)";

export const LEXICON: LexiconEntry[] = [
  {
    id: "atom",
    term: "Atom",
    preview: "The smallest unit of an element that keeps its chemical identity — a nucleus of protons and neutrons surrounded by electrons.",
    body: [
      "An atom is the smallest piece of an element that still behaves like that element. Every atom has a tiny, dense nucleus containing protons (positive) and neutrons (no charge), surrounded by a cloud of electrons (negative).",
      "The number of protons — the atomic number — decides which element the atom is. Atoms are electrically neutral when the electron count matches the proton count.",
      "Almost all of an atom's mass sits in the nucleus, but almost all of its volume is the electron cloud: if the nucleus were a marble on a football pitch, the electrons would roam the whole stadium.",
    ],
    source: `${BRITANNICA} — "Atom"; ${CENTRAL}, ch. 2.`,
  },
  {
    id: "element",
    term: "Element",
    preview: "A pure substance made of only one kind of atom — defined by its proton count. 118 are known; they are the periodic table.",
    body: [
      "An element is a substance that cannot be broken down into simpler substances by chemical means, because all of its atoms have the same number of protons.",
      "118 elements are currently known; about 90 occur naturally on Earth. Each has a one- or two-letter symbol (H, Fe, Na) — many from Latin names, like Fe from ferrum.",
      "The periodic table arranges all of them by atomic number into rows (periods) and columns (groups), so that elements with similar behaviour line up.",
    ],
    source: `${BRITANNICA} — "Chemical element"; ${CENTRAL}, ch. 1–2.`,
  },
  {
    id: "compound",
    term: "Compound",
    preview: "A substance made of two or more elements chemically bonded in a fixed ratio — like H₂O or NaCl — with properties all its own.",
    body: [
      "A compound forms when atoms of two or more different elements bond chemically in a fixed, definite ratio. Water is always H₂O; table salt is always NaCl.",
      "A compound's properties can be completely different from its ingredients: sodium is a metal that ignites in water, chlorine is a toxic gas — bonded together they are the salt on your chips.",
      "Compounds can only be separated back into their elements by chemical reactions, not by physical means like filtering or evaporating.",
    ],
    source: `${BRITANNICA} — "Chemical compound"; ${ZUMDAHL}, ch. 2.`,
  },
  {
    id: "molecule",
    term: "Molecule",
    preview: "Two or more atoms held together by covalent bonds — the smallest unit of a covalent substance that can exist on its own.",
    body: [
      "A molecule is a group of atoms held together by covalent bonds, moving as one unit. It can be one element (O₂, N₂) or a compound (H₂O, CO₂).",
      "The formula tells you exactly which atoms and how many: CH₄ is one carbon with four hydrogens.",
      "Molecular shape — the 3D arrangement of those atoms — controls behaviour: water's bent shape is why it is liquid at room temperature and why it dissolves salt.",
    ],
    source: `${BRITANNICA} — "Molecule"; ${CENTRAL}, ch. 9.`,
  },
  {
    id: "ion",
    term: "Ion",
    preview: "An atom or group of atoms with an electric charge, made by losing electrons (positive, cation) or gaining them (negative, anion).",
    body: [
      "An ion is an atom (or group of atoms) that has lost or gained electrons, so its charges no longer cancel. Losing electrons leaves it positive (a cation); gaining makes it negative (an anion).",
      "Metals tend to lose electrons (Na → Na⁺); nonmetals tend to gain them (Cl → Cl⁻). Opposite charges attract — that attraction is the ionic bond that builds salts.",
      "Ions run your body: nerve impulses are Na⁺ and K⁺ crossing membranes, and Ca²⁺ triggers every muscle contraction.",
    ],
    source: `${BRITANNICA} — "Ion"; ${CENTRAL}, ch. 2 & 8.`,
  },
  {
    id: "isotope",
    term: "Isotope",
    preview: "Atoms of the same element with different neutron counts — same chemistry, different mass; some are radioactive.",
    body: [
      "Isotopes are atoms of one element (same protons) with different numbers of neutrons, so their masses differ. Carbon-12 and carbon-14 are both carbon — 6 protons each — with 6 and 8 neutrons.",
      "Because chemistry is decided by electrons and protons, isotopes behave chemically the same. But nuclear stability differs: many heavier isotopes are radioactive.",
      "Radioactive isotopes decay at a fixed, known rate (the half-life), which is why carbon-14 can date ancient bones and uranium-238 can date rocks.",
    ],
    source: `${BRITANNICA} — "Isotope"; ${ZUMDAHL}, ch. 2 & 18.`,
  },
  {
    id: "proton",
    term: "Proton",
    preview: "The positively charged particle in the nucleus. The proton count (atomic number) defines which element an atom is.",
    body: [
      "Protons carry a +1 charge and sit in the nucleus. The number of protons is the atomic number — it alone decides the element's identity.",
      "Change the proton count and you change the element itself: 6 protons is always carbon, 7 is always nitrogen. No chemical reaction can do this; only nuclear processes can.",
    ],
    source: `${BRITANNICA} — "Proton"; ${CENTRAL}, ch. 2.`,
  },
  {
    id: "neutron",
    term: "Neutron",
    preview: "The uncharged particle in the nucleus. Neutrons add mass and set which isotope an atom is; too few or too many make it unstable.",
    body: [
      "Neutrons have no electric charge and roughly the same mass as protons. They share the nucleus with protons and act as nuclear glue, spacing the positive charges that would otherwise repel.",
      "Changing the neutron count makes isotopes of the same element. The balance matters: nuclei with too many or too few neutrons are unstable and decay — they are radioactive.",
    ],
    source: `${BRITANNICA} — "Neutron"; ${CENTRAL}, ch. 2 & 21.`,
  },
  {
    id: "electron",
    term: "Electron",
    preview: "The tiny negative particle orbiting the nucleus in shells. Electrons do all the chemistry — bonding, charge, reactions.",
    body: [
      "Electrons carry a −1 charge and are nearly 2000 times lighter than protons. They occupy shells (energy levels) around the nucleus.",
      "Chemistry IS electron behaviour: atoms bond by sharing or transferring their outermost (valence) electrons, and ions form when electrons are gained or lost.",
      "The shell pattern repeats — 2, 8, 8… — and that repetition is exactly why the periodic table's columns share behaviour.",
    ],
    source: `${BRITANNICA} — "Electron"; ${CENTRAL}, ch. 6.`,
  },
  {
    id: "atomic-number",
    term: "Atomic number",
    preview: "The number of protons in an atom's nucleus — the element's ID number and its address on the periodic table.",
    body: [
      "The atomic number (symbol Z) counts the protons in the nucleus. It is unique to each element and fixes its place in the periodic table.",
      "In a neutral atom it also equals the electron count, which is why it predicts chemical behaviour.",
    ],
    source: `${BRITANNICA} — "Atomic number"; ${CENTRAL}, ch. 2.`,
  },
  {
    id: "atomic-mass",
    term: "Atomic mass",
    preview: "The weighted average mass of an element's atoms in unified atomic mass units (u), averaged over its natural isotopes.",
    body: [
      "Atomic mass is the average mass of an element's atoms, weighted by how common each isotope is in nature, measured in unified atomic mass units (u).",
      "Chlorine's 35.45 u is not a whole number because natural chlorine is about 76% chlorine-35 and 24% chlorine-37.",
      "On the periodic table it is the number printed opposite the atomic number on each cell.",
    ],
    source: `${BRITANNICA} — "Atomic mass"; ${ZUMDAHL}, ch. 3.`,
  },
  {
    id: "electron-configuration",
    term: "Electron configuration",
    preview: "The arrangement of an atom's electrons in shells and subshells, e.g. iron is [Ar] 3d⁶ 4s² — it predicts the element's chemistry.",
    body: [
      "An electron configuration lists exactly where an atom's electrons live, subshell by subshell: hydrogen is 1s¹, oxygen is [He] 2s² 2p⁴, iron is [Ar] 3d⁶ 4s².",
      "Electrons fill from the lowest energy upward (the Aufbau principle). The noble-gas shorthand ([He], [Ne], [Ar]…) abbreviates the filled inner core.",
      "The outermost electrons — the valence electrons — are the ones that react, which is why two elements with similar configurations (like sodium and potassium) behave alike.",
    ],
    source: `${BRITANNICA} — "Electronic configuration"; ${CENTRAL}, ch. 6.`,
  },
  {
    id: "valence-electron",
    term: "Valence electron",
    preview: "An electron in the outermost shell — the ones an atom uses to bond. Group-1 metals have one; noble gases have a full set.",
    body: [
      "Valence electrons occupy an atom's outermost shell and are the only electrons involved in ordinary bonding.",
      "Atoms bond to reach a stable, full outer shell (usually 8 — the octet). Sodium gives its one valence electron away; chlorine takes one; carbon shares its four.",
      "Elements in the same periodic-table group have the same valence count — that is the whole secret of the table's columns.",
    ],
    source: `${BRITANNICA} — "Valence electron" (under "Valence"); ${CENTRAL}, ch. 8.`,
  },
  {
    id: "electronegativity",
    term: "Electronegativity",
    preview: "How strongly an atom pulls shared electrons toward itself in a bond. Fluorine pulls hardest (3.98 on the Pauling scale).",
    body: [
      "Electronegativity measures an atom's pull on the electrons it shares in a bond, usually on the Pauling scale. Fluorine tops the table at 3.98; metals like caesium sit near 0.8.",
      "The difference between two bonded atoms predicts the bond type: a large difference transfers electrons outright (ionic), a small one shares them (covalent), and an in-between difference shares them unevenly (polar covalent — water's secret).",
      "It rises across a period and falls down a group — one of the table's cleanest trends.",
    ],
    source: `${BRITANNICA} — "Electronegativity"; ${CENTRAL}, ch. 8.`,
  },
  {
    id: "chemical-bond",
    term: "Chemical bond",
    preview: "The attraction holding atoms together — formed by transferring electrons (ionic) or sharing them (covalent).",
    body: [
      "A chemical bond is the electrostatic attraction that holds atoms together in compounds. Bonds form because bonded atoms reach lower energy than separate ones.",
      "The two main kinds: ionic bonds (electrons transferred, then opposite ions attract — metals with nonmetals) and covalent bonds (electrons shared — nonmetals with nonmetals). Metallic bonding, a sea of shared electrons, holds metals themselves together.",
      "Breaking bonds costs energy; forming them releases it. Every fire, battery and digestion is this ledger being balanced.",
    ],
    source: `${BRITANNICA} — "Chemical bonding"; ${ZUMDAHL}, ch. 8.`,
  },
  {
    id: "ionic-bond",
    term: "Ionic bond",
    preview: "A bond formed when a metal gives electrons to a nonmetal and the resulting opposite ions attract — salts like NaCl.",
    body: [
      "In an ionic bond, one atom (a metal) hands electrons to another (a nonmetal). The metal becomes a positive cation, the nonmetal a negative anion, and they lock together by attraction.",
      "Ionic compounds form rigid crystal lattices — endless repeating grids of alternating charges — which is why salts are hard, brittle, high-melting solids that conduct only when molten or dissolved.",
    ],
    source: `${BRITANNICA} — "Ionic bond"; ${CENTRAL}, ch. 8.`,
  },
  {
    id: "covalent-bond",
    term: "Covalent bond",
    preview: "A bond where two atoms share a pair of electrons — how nonmetals join, from H₂O to DNA.",
    body: [
      "A covalent bond is a shared pair of electrons between two atoms, each counting the pair toward its own full shell. Two shared pairs make a double bond, three a triple.",
      "Covalent substances form true molecules with definite shapes. Those shapes — bent water, tetrahedral methane — decide boiling points, solubility, and biology itself.",
    ],
    source: `${BRITANNICA} — "Covalent bond"; ${CENTRAL}, ch. 8–9.`,
  },
  {
    id: "chemical-reaction",
    term: "Chemical reaction",
    preview: "A process that rearranges atoms into new substances by breaking and forming bonds. Atoms are never created or destroyed.",
    body: [
      "In a chemical reaction, bonds break and new bonds form, turning reactants into products with different properties. The atoms themselves are only rearranged — never created or destroyed (conservation of mass).",
      "That is why equations must balance: every atom entering the arrow must come out the other side.",
      "Signs a reaction happened: colour change, gas given off, a precipitate forming, light, or a temperature change.",
    ],
    source: `${BRITANNICA} — "Chemical reaction"; ${ZUMDAHL}, ch. 3–4.`,
  },
  {
    id: "periodic-table",
    term: "Periodic table",
    preview: "The chart of all 118 elements ordered by atomic number, arranged so columns (groups) share chemical behaviour.",
    body: [
      "The periodic table lists every known element in order of atomic number, folded into rows so that elements with similar properties stack into columns.",
      "Dmitri Mendeleev published the first widely accepted version in 1869 — and famously left gaps that correctly predicted undiscovered elements.",
      "The layout encodes real physics: a row (period) is an electron shell filling up; a column (group) is a repeating valence pattern. Read it right and the table predicts charges, formulas and reactivity.",
    ],
    source: `${BRITANNICA} — "Periodic table"; ${CENTRAL}, ch. 7.`,
  },
  {
    id: "group",
    term: "Group (family)",
    preview: "A column of the periodic table — elements with the same valence electron count and similar chemistry, numbered 1–18.",
    body: [
      "A group is a vertical column of the periodic table (numbered 1–18). Elements in a group carry the same number of valence electrons, so they behave alike.",
      "Famous families: group 1 alkali metals (soft, violently reactive), group 17 halogens (reactive nonmetals), group 18 noble gases (almost inert).",
    ],
    source: `${BRITANNICA} — "Periodic table" (groups); ${CENTRAL}, ch. 7.`,
  },
  {
    id: "period",
    term: "Period",
    preview: "A row of the periodic table — one electron shell filling from metal on the left to noble gas on the right.",
    body: [
      "A period is a horizontal row of the table. Crossing a period left to right adds one proton and one electron per step, filling a single shell.",
      "Properties shift smoothly along the way — atoms get smaller, electronegativity climbs — until the shell completes at a noble gas and the next row begins.",
    ],
    source: `${BRITANNICA} — "Periodic table" (periods); ${CENTRAL}, ch. 7.`,
  },
  {
    id: "acid",
    term: "Acid",
    preview: "A substance that releases hydrogen ions (H⁺) in water — sour, pH below 7, turns litmus red. Vinegar and stomach acid are acids.",
    body: [
      "An acid donates hydrogen ions (H⁺) in solution (the Brønsted–Lowry definition). More H⁺ means a lower pH — below 7 at 25 °C.",
      "Strong acids like hydrochloric acid (HCl) release essentially every H⁺; weak acids like the acetic acid in vinegar release only a fraction, holding an equilibrium.",
      "Acids neutralise bases to give a salt plus water — the reaction behind antacid tablets calming stomach acid.",
    ],
    source: `${BRITANNICA} — "Acid"; ${ZUMDAHL}, ch. 14.`,
  },
  {
    id: "base",
    term: "Base",
    preview: "A substance that accepts hydrogen ions or releases OH⁻ in water — bitter, slippery, pH above 7. Soap and lye are basic.",
    body: [
      "A base accepts hydrogen ions (or releases hydroxide, OH⁻, in water), pushing pH above 7.",
      "Strong bases like sodium hydroxide (lye) are as corrosive as strong acids; weak ones like baking soda are gentle enough to cook with.",
      "Base + acid → salt + water: neutralisation, one of chemistry's most-used reactions.",
    ],
    source: `${BRITANNICA} — "Base (chemistry)"; ${ZUMDAHL}, ch. 14.`,
  },
  {
    id: "ph",
    term: "pH",
    preview: "The 0–14 scale of acidity: 7 is neutral, lower is acidic, higher is basic. Each step is a tenfold change in H⁺.",
    body: [
      "pH measures the concentration of hydrogen ions in a solution on a logarithmic scale: pH = −log₁₀[H⁺]. At 25 °C, pure water sits at 7.",
      "Because the scale is logarithmic, lemon juice at pH 2 has ten times the H⁺ of soda at pH 3 — and a hundred thousand times more than water.",
      "Indicators (litmus, phenolphthalein, universal indicator) change colour with pH, which is how titrations find their endpoint.",
    ],
    source: `${BRITANNICA} — "pH"; ${CENTRAL}, ch. 16.`,
  },
  {
    id: "catalyst",
    term: "Catalyst",
    preview: "A substance that speeds a reaction without being consumed, by offering an easier pathway (lower activation energy).",
    body: [
      "A catalyst accelerates a reaction by providing an alternative route with a lower activation energy — and emerges unchanged, ready to work again.",
      "Your body runs on protein catalysts called enzymes; cars burn cleaner through platinum catalytic converters; most industrial chemistry is catalysed.",
      "A catalyst never changes WHERE equilibrium settles — only how fast the system gets there.",
    ],
    source: `${BRITANNICA} — "Catalyst"; ${ZUMDAHL}, ch. 12.`,
  },
  {
    id: "equilibrium",
    term: "Chemical equilibrium",
    preview: "The balanced state where forward and reverse reactions run at equal rates, so amounts stop changing — not a stop, a standoff.",
    body: [
      "Many reactions run both ways. Chemical equilibrium is reached when the forward and reverse rates become equal, so concentrations hold steady — though both reactions keep running.",
      "Le Chatelier's principle predicts the response to disturbance: push on an equilibrium (add reactant, change pressure or temperature) and it shifts to partially undo the push.",
      "The Haber process exploits this to make ammonia for fertiliser — balancing pressure, temperature and catalyst to feed roughly half the world.",
    ],
    source: `${BRITANNICA} — "Chemical equilibrium"; ${CENTRAL}, ch. 15.`,
  },
  {
    id: "mole",
    term: "Mole",
    preview: "Chemistry's counting unit: 6.022 × 10²³ particles. One mole of an element's atoms weighs its atomic mass in grams.",
    body: [
      "A mole is 6.022 × 10²³ of anything (Avogadro's number) — the bridge between atom-scale counting and gram-scale weighing.",
      "The trick that makes it useful: one mole of carbon-12 atoms weighs exactly 12 g; one mole of water molecules weighs about 18 g. Mass on a balance becomes a count of particles.",
      "Balanced equations speak in moles: 2H₂ + O₂ → 2H₂O means two moles of hydrogen per mole of oxygen.",
    ],
    source: `${BRITANNICA} — "Mole (chemistry)"; ${ZUMDAHL}, ch. 3.`,
  },
  {
    id: "solution",
    term: "Solution",
    preview: "A uniform mixture of a solute dissolved in a solvent — salt water, air, and brass are all solutions.",
    body: [
      "A solution is a homogeneous mixture: the dissolved substance (solute) spreads evenly through the dissolving one (solvent) down to the particle level.",
      "Concentration says how much is dissolved; chemists usually use molarity — moles of solute per litre of solution.",
      "Solubility has limits: a saturated solution holds all it can at that temperature. 'Like dissolves like' — polar solvents (water) dissolve polar and ionic solutes; oils need nonpolar solvents.",
    ],
    source: `${BRITANNICA} — "Solution (chemistry)"; ${CENTRAL}, ch. 13.`,
  },
  {
    id: "half-life",
    term: "Half-life",
    preview: "The time for half of a radioactive sample to decay — fixed for each isotope, from microseconds to billions of years.",
    body: [
      "A half-life is the time it takes for half the nuclei in a radioactive sample to decay. It is a fixed property of each isotope, untouched by temperature, pressure or chemistry.",
      "After one half-life, 50% remains; after two, 25%; after three, 12.5% — the curve never quite reaches zero.",
      "Known half-lives make nuclear clocks: carbon-14 (5,730 years) dates bones and wood; uranium-238 (4.5 billion years) dates the Earth itself.",
    ],
    source: `${BRITANNICA} — "Half-life (radioactivity)"; ${ZUMDAHL}, ch. 18.`,
  },
];

export const lexiconById = (id: string): LexiconEntry | undefined =>
  LEXICON.find((e) => e.id === id);

// ── The invented vocabulary — AlcheMix's own words, defined ────────────────
// Adviser item 16: in-app, hovering shows the meaning; in the manuscript, the
// appendix glossary lists every word (docs/GLOSSARY.md mirrors this list).
export interface GlossaryWord {
  word: string;
  meaning: string;
}

export const GLOSSARY: GlossaryWord[] = [
  { word: "The Alchemist", meaning: "The platform's mentor character. Answers questions, gives warm counsel on mistakes, and narrates the modules." },
  { word: "Apprentice", meaning: "A student. Every learner in AlcheMix is an apprentice of the Alchemist." },
  { word: "Grimoire", meaning: "The student's card collection — the book of element cards collected and forged. Also names the platform's fantasy frame as a whole." },
  { word: "Forge / Forging", meaning: "Combining two element cards to make a real chemical compound. Runs on actual valence rules." },
  { word: "Codex", meaning: "The compound encyclopedia. Every compound forged earns a page there." },
  { word: "Trial", meaning: "A module's challenge mode. Scores earn stars kept as personal bests — motivation, never grades." },
  { word: "Aurum", meaning: "The practice currency earned from activities (Latin for gold). Spent on cosmetics in the Emporium; it is not a grade." },
  { word: "The Emporium", meaning: "The shop where aurum buys cosmetic frames, titles and charms." },
  { word: "The Study", meaning: "The guided lesson module: five topics, each learned, practised and assessed in sequence." },
  { word: "Daily Starters", meaning: "The daily three-question warm-up rite, with streaks kept in a cauldron." },
  { word: "The Mending Trial", meaning: "The quiz that restores a lapsed Daily-Starters streak — a broken streak must be earned back." },
  { word: "The Bench", meaning: "The student home page (dashboard), where the day's work is laid out." },
  { word: "The Astrolabe", meaning: "The educator console — classes, gradebook, quiz builder and performance views." },
  { word: "The Alembic & The Phial", meaning: "Daily drop vessels on module pages: one tap a day adds a drop toward a small surprise." },
  { word: "Itsura", meaning: "A card's cosmetic appearance/frame, equipped from the Emporium." },
  { word: "Hall of Records", meaning: "The class leaderboard (stars, duels, compounds, streaks)." },
  { word: "Assayer's Lens", meaning: "The phone camera mode that identifies the elements inside everyday objects." },
];
