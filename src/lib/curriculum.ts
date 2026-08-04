/**
 * The AlcheMix learning curriculum — the shared content behind both the Guided
 * Lesson Paths and the Spaced-Repetition Review.
 *
 * A Topic is a stop on the path. Each Topic holds a few Concepts; a Concept
 * bundles a short "learn" explainer with one check-for-understanding question.
 * Concept ids are globally unique (`${topicId}.${local}`) so the review
 * scheduler can track them across topics.
 *
 * The voice is lightly alchemy-flavoured; the chemistry stays plain and correct.
 */

export interface Concept {
  /** Globally unique, e.g. "atomic.protons". */
  id: string;
  title: string;
  /** One or two sentences shown in the Learn stage. */
  learn: string;
  question: {
    prompt: string;
    choices: string[];
    /** Index into `choices`. */
    answer: number;
    hint: string;
  };
}

export interface Topic {
  id: string;
  title: string;
  blurb: string;
  color: string;
  concepts: Concept[];
}

export const CURRICULUM: Topic[] = [
  {
    id: "atomic",
    title: "Atomic Structure",
    blurb: "What every atom is built from.",
    color: "var(--color-emerald-elixir)",
    concepts: [
      {
        id: "atomic.protons",
        title: "Protons define the element",
        learn: "An atom's identity is set by its number of protons — its atomic number. Change the protons and you change the element itself. Neutrons and electrons can vary without changing what element it is.",
        question: {
          prompt: "What determines which element an atom is?",
          choices: ["Number of protons", "Number of neutrons", "Number of electrons", "Total mass"],
          answer: 0,
          hint: "It's the particle in the nucleus with a positive charge.",
        },
      },
      {
        id: "atomic.shells",
        title: "Electron shells fill in order",
        learn: "Electrons occupy shells around the nucleus. The first shell holds at most 2 electrons, the second up to 8. Shells fill from the inside out.",
        question: {
          prompt: "What is the maximum number of electrons the first shell can hold?",
          choices: ["1", "2", "8", "18"],
          answer: 1,
          hint: "It's the smallest, closest shell — think helium.",
        },
      },
      {
        id: "atomic.isotopes",
        title: "Isotopes differ in neutrons",
        learn: "Isotopes are atoms of the same element (same protons) with different numbers of neutrons. They share chemistry but differ in mass.",
        question: {
          prompt: "Two isotopes of an element differ in their number of…",
          choices: ["Neutrons", "Protons", "Electrons", "Charge"],
          answer: 0,
          hint: "Not protons — that would make them different elements.",
        },
      },
    ],
  },
  {
    id: "periodic",
    title: "The Periodic Table",
    blurb: "How the elements are organised.",
    color: "var(--color-wraith)",
    concepts: [
      {
        id: "periodic.groups",
        title: "Groups share valence electrons",
        learn: "The columns of the periodic table are groups. Elements in the same group have the same number of outer-shell (valence) electrons, so they behave similarly.",
        question: {
          prompt: "Elements in the same group (column) share the same number of…",
          choices: ["Valence electrons", "Protons", "Neutrons", "Shells"],
          answer: 0,
          hint: "It's the outer-shell electrons that drive chemistry.",
        },
      },
      {
        id: "periodic.periods",
        title: "Atomic number rises across a period",
        learn: "The rows are periods. Reading left to right across a period, the atomic number increases by one each step as protons are added.",
        question: {
          prompt: "Moving left→right across a period, the atomic number…",
          choices: ["Increases", "Decreases", "Stays the same", "Doubles"],
          answer: 0,
          hint: "Each element adds one proton.",
        },
      },
      {
        id: "periodic.metals",
        title: "Metals sit on the left",
        learn: "Metals occupy the left and centre of the table; non-metals are on the upper right, separated by a 'staircase' of metalloids.",
        question: {
          prompt: "On the periodic table, most metals are found on the…",
          choices: ["Left and centre", "Upper right", "Bottom row only", "Right edge"],
          answer: 0,
          hint: "Think of iron, sodium, calcium — where do they live?",
        },
      },
    ],
  },
  {
    id: "bonding",
    title: "Chemical Bonding",
    blurb: "Why atoms join together.",
    color: "var(--color-gold)",
    concepts: [
      {
        id: "bonding.ionic",
        title: "Ionic bonds transfer electrons",
        learn: "When a metal meets a non-metal, the metal gives electrons to the non-metal. The resulting oppositely-charged ions attract — an ionic bond.",
        question: {
          prompt: "An ionic bond typically forms between…",
          choices: ["A metal and a non-metal", "Two non-metals", "Two metals", "Two noble gases"],
          answer: 0,
          hint: "One side gives electrons, the other takes them.",
        },
      },
      {
        id: "bonding.covalent",
        title: "Covalent bonds share electrons",
        learn: "Two non-metals bond by sharing pairs of electrons rather than transferring them — a covalent bond, as in water or methane.",
        question: {
          prompt: "In a covalent bond, electrons are…",
          choices: ["Shared", "Transferred", "Destroyed", "Ignored"],
          answer: 0,
          hint: "Neither atom wants to fully give them up.",
        },
      },
      {
        id: "bonding.octet",
        title: "The octet rule",
        learn: "Atoms bond to reach a full outer shell — usually 8 valence electrons (an 'octet'), the stable configuration of the noble gases.",
        question: {
          prompt: "Atoms generally bond to achieve how many valence electrons?",
          choices: ["8", "2", "4", "18"],
          answer: 0,
          hint: "It's why noble gases are unreactive.",
        },
      },
    ],
  },
  {
    id: "balancing",
    title: "Balancing Equations",
    blurb: "Conservation of mass in action.",
    color: "var(--color-emerald-elixir)",
    concepts: [
      {
        id: "balancing.conservation",
        title: "Mass is conserved",
        learn: "In any chemical reaction, atoms are neither created nor destroyed. A balanced equation has equal numbers of each atom on both sides.",
        question: {
          prompt: "In a balanced equation, the atoms of each element are…",
          choices: ["Equal on both sides", "Greater on the right", "Greater on the left", "Unimportant"],
          answer: 0,
          hint: "Nothing is lost — it just rearranges.",
        },
      },
      {
        id: "balancing.coefficients",
        title: "Balance with coefficients",
        learn: "You balance an equation by changing coefficients (the big numbers in front), never the subscripts — changing a subscript would change the substance itself.",
        question: {
          prompt: "To balance an equation you adjust the…",
          choices: ["Coefficients", "Subscripts", "Element symbols", "Arrow"],
          answer: 0,
          hint: "Changing subscripts turns H₂O into something else.",
        },
      },
      {
        id: "balancing.example",
        title: "Worked example: water",
        learn: "For H₂ + O₂ → H₂O, oxygen is unbalanced. Balancing gives 2 H₂ + O₂ → 2 H₂O: 4 H and 2 O on each side.",
        question: {
          prompt: "Balancing H₂ + O₂ → H₂O, what coefficient goes in front of H₂O?",
          choices: ["2", "1", "3", "4"],
          answer: 0,
          hint: "You need an even number of oxygen atoms on the right.",
        },
      },
    ],
  },
  {
    id: "gas-laws",
    title: "Gas Laws",
    blurb: "How gases respond to pressure, volume & heat.",
    color: "var(--color-wraith)",
    concepts: [
      {
        id: "gas.ideal",
        title: "The ideal gas law",
        learn: "PV = nRT ties pressure, volume, moles and temperature together. At fixed n and T, squeezing the volume down forces the pressure up.",
        question: {
          prompt: "Using PV = nRT at constant n and T, if volume decreases, pressure…",
          choices: ["Increases", "Decreases", "Stays the same", "Becomes zero"],
          answer: 0,
          hint: "P and V trade off to keep the product constant.",
        },
      },
      {
        id: "gas.boyle",
        title: "Boyle's law",
        learn: "Boyle's law is the special case at constant temperature: pressure and volume are inversely proportional (P ∝ 1/V).",
        question: {
          prompt: "Boyle's law describes the relationship between…",
          choices: ["Pressure and volume", "Volume and temperature", "Pressure and temperature", "Moles and mass"],
          answer: 0,
          hint: "It's the one where temperature is held fixed.",
        },
      },
      {
        id: "gas.charles",
        title: "Charles's law",
        learn: "Charles's law: at constant pressure, a gas's volume is proportional to its absolute (Kelvin) temperature. Heat it and it expands.",
        question: {
          prompt: "Charles's law says volume is proportional to…",
          choices: ["Absolute temperature", "Pressure", "Number of shells", "Mass only"],
          answer: 0,
          hint: "Measured in Kelvin, not Celsius.",
        },
      },
    ],
  },
];

// ── Lookups ───────────────────────────────────────────────────────────────────
export function topicById(id: string): Topic | undefined {
  return CURRICULUM.find((t) => t.id === id);
}

const CONCEPT_INDEX: Record<string, { concept: Concept; topic: Topic }> = {};
for (const topic of CURRICULUM) {
  for (const concept of topic.concepts) CONCEPT_INDEX[concept.id] = { concept, topic };
}

export function conceptById(id: string): { concept: Concept; topic: Topic } | undefined {
  return CONCEPT_INDEX[id];
}

export const ALL_CONCEPT_IDS = Object.keys(CONCEPT_INDEX);
