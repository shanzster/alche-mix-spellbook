/**
 * The Grimoire Guide — the learning system's table of contents.
 *
 * Like W3Schools' tutorial index, it lays every module out in the order a
 * beginner should take them (foundations → core theory → reactions → advanced
 * labs → proving it), tracks which steps are already done from the student's
 * profile, and always points at ONE recommended next step ("You are here").
 *
 * It guides rather than gates: nothing is locked — a student can jump ahead,
 * the guide just keeps showing the recommended path back.
 */
import type { ComponentType, CSSProperties } from "react";
import {
  ShieldAlert,
  Atom,
  Grid3x3,
  Brain,
  Shapes,
  Scale,
  Gauge,
  Beaker,
  Radiation,
  ClipboardList,
  ScanLine,
  Flame,
  FlaskConical,
  Thermometer,
  Crosshair,
  Swords,
  Activity,
  RefreshCw,
  Zap,
  Magnet,
  Droplets,
  Coffee,
} from "lucide-react";
import { CURRICULUM } from "./curriculum";
import type { StudentProfile } from "./profile";

export interface GuideStep {
  id: string;
  /** Chapter heading the step is grouped under. */
  chapter: string;
  title: string;
  /** Why this step comes now — shown under the title. */
  why: string;
  to: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  /** Marks the step complete from the live profile. */
  done: (p: StudentProfile | null) => boolean;
  /** Optional live sub-progress, e.g. "2/5 topics". */
  detail?: (p: StudentProfile | null) => string | null;
  /** Camera/AR steps — best taken on the phone / installed app. */
  mobileSide?: boolean;
}

const practised = (p: StudentProfile | null, id: string) => (p?.practice?.[id] ?? 0) > 0;

const CH1 = "I · Foundations";
const CH2 = "II · The Study Path";
const CH3 = "III · Molecules & Reactions";
const CH4 = "IV · Advanced Labs";
const CH5 = "V · Prove Your Craft";

export const GUIDE: GuideStep[] = [
  {
    id: "lab-safety",
    chapter: CH1,
    title: "Lab Safety",
    to: "/lab-safety",
    icon: ShieldAlert,
    why: "Hazard symbols and apparatus come before any experiment — know before you touch.",
    done: (p) => practised(p, "lab-safety"),
  },
  {
    id: "atomic-builder",
    chapter: CH1,
    title: "Atomic Builder",
    to: "/atomic-builder",
    icon: Atom,
    why: "Everything is made of atoms. Forge one from protons, neutrons and electrons.",
    done: (p) => practised(p, "atomic-builder"),
  },
  {
    id: "periodic-table",
    chapter: CH1,
    title: "Periodic Table",
    to: "/periodic-table",
    icon: Grid3x3,
    why: "Meet all 118 elements and how the table organises them.",
    done: (p) => practised(p, "periodic-table"),
  },
  {
    id: "table-game",
    chapter: CH1,
    title: "Placement Trials",
    to: "/table-game",
    icon: Crosshair,
    why: "Prove you know the map — place elements in their true cells from memory.",
    done: (p) => practised(p, "table-game"),
  },
  {
    id: "states",
    chapter: CH1,
    title: "States of Matter",
    to: "/states",
    icon: Thermometer,
    why: "Solid, liquid, gas — heat real substances and watch their particles change.",
    done: (p) => practised(p, "states"),
  },
  {
    id: "study",
    chapter: CH2,
    title: "The Study",
    to: "/study",
    icon: Brain,
    why: "The guided lessons: learn each topic, practise it, then pass its assessment to unlock the next.",
    done: (p) => CURRICULUM.every((t) => p?.pathProgress?.[t.id]?.stage === "done"),
    detail: (p) => {
      const done = CURRICULUM.filter((t) => p?.pathProgress?.[t.id]?.stage === "done").length;
      return `${done}/${CURRICULUM.length} topics`;
    },
  },
  {
    id: "molecules",
    chapter: CH3,
    title: "Molecule Shapes",
    to: "/molecules",
    icon: Shapes,
    why: "Atoms rarely stay alone — see the 3D geometry they form when they bond.",
    done: (p) => practised(p, "molecules"),
  },
  {
    id: "forces",
    chapter: CH3,
    title: "Invisible Bonds",
    to: "/forces",
    icon: Magnet,
    why: "Between molecules there are forces too — they decide what boils when.",
    done: (p) => practised(p, "forces"),
  },
  {
    id: "reactions",
    chapter: CH3,
    title: "Reaction Theatre",
    to: "/reactions",
    icon: Atom,
    why: "Watch bonds break and reform, and see mass conserved atom by atom.",
    done: (p) => practised(p, "reactions"),
  },
  {
    id: "equation-balancer",
    chapter: CH3,
    title: "Equation Balancer",
    to: "/equation-balancer",
    icon: Scale,
    why: "Now balance those reactions yourself with coefficients.",
    done: (p) => practised(p, "equation-balancer"),
  },
  {
    id: "codex",
    chapter: CH3,
    title: "Compound Codex",
    to: "/codex",
    icon: FlaskConical,
    why: "Now forge compounds yourself — every real mixture fills a page of the Codex.",
    done: (p) => (p?.compounds?.length ?? 0) > 0,
    detail: (p) => {
      const n = p?.compounds?.length ?? 0;
      return n > 0 ? `${n} discovered` : null;
    },
  },
  {
    id: "gas-laws",
    chapter: CH4,
    title: "Gas Laws Simulator",
    to: "/gas-laws",
    icon: Gauge,
    why: "PV = nRT with live particles — pressure, volume and temperature trade off.",
    done: (p) => practised(p, "gas-laws"),
  },
  {
    id: "solutions",
    chapter: CH4,
    title: "The Elixir Bench",
    to: "/solutions",
    icon: Droplets,
    why: "Mix real solutes and master molarity — the language of every lab recipe.",
    done: (p) => practised(p, "solutions"),
  },
  {
    id: "thermo",
    chapter: CH4,
    title: "Cauldron of Heat",
    to: "/thermo",
    icon: Coffee,
    why: "Reactions give and take heat — measure it with a calorimeter.",
    done: (p) => practised(p, "thermo"),
  },
  {
    id: "rates",
    chapter: CH4,
    title: "Reaction Rates",
    to: "/rates",
    icon: Activity,
    why: "Why do some reactions race and others crawl? Collision theory, live.",
    done: (p) => practised(p, "rates"),
  },
  {
    id: "equilibrium",
    chapter: CH4,
    title: "Equilibrium",
    to: "/equilibrium",
    icon: RefreshCw,
    why: "Some reactions run both ways — stress the balance and predict the shift.",
    done: (p) => practised(p, "equilibrium"),
  },
  {
    id: "electro",
    chapter: CH4,
    title: "The Voltaic Forge",
    to: "/electro",
    icon: Zap,
    why: "Chemistry makes electricity — build a battery from two metals.",
    done: (p) => practised(p, "electro"),
  },
  {
    id: "titration",
    chapter: CH4,
    title: "Titration Lab",
    to: "/titration",
    icon: Beaker,
    why: "Acids meet bases: run a titration and read the pH curve.",
    done: (p) => practised(p, "titration"),
  },
  {
    id: "decay",
    chapter: CH4,
    title: "Radioactive Decay",
    to: "/decay",
    icon: Radiation,
    why: "Isotopes, half-life and decay — one nucleus at a time.",
    done: (p) => practised(p, "decay"),
  },
  {
    id: "quiz",
    chapter: CH5,
    title: "3D Visual Quiz",
    to: "/quiz",
    icon: ClipboardList,
    why: "Prove you can identify elements from their rotating atoms alone.",
    done: (p) => practised(p, "quiz"),
  },
  {
    id: "duel",
    chapter: CH5,
    title: "Duel the Alchemist",
    to: "/duel",
    icon: Swords,
    why: "Everything you've learned, weaponised — win a duel where the stats are real chemistry.",
    done: (p) =>
      Object.values(p?.duelRecord ?? {}).some((d) => (d?.wins ?? 0) > 0),
    detail: (p) => {
      const wins = Object.values(p?.duelRecord ?? {}).reduce((s, d) => s + (d?.wins ?? 0), 0);
      return wins > 0 ? `${wins} victories` : null;
    },
  },
  {
    id: "starters",
    chapter: CH5,
    title: "Starters for Ten",
    to: "/starters",
    icon: Flame,
    why: "Make it a habit — ten questions a day keeps every topic warm.",
    done: (p) => practised(p, "starters"),
    detail: (p) => {
      const s = p?.starterStreak?.count ?? 0;
      return s > 0 ? `${s}-day streak` : null;
    },
  },
  {
    id: "card-hunt",
    chapter: CH5,
    title: "Card Hunt (AR)",
    to: "/scanner",
    icon: ScanLine,
    why: "On your phone: summon element cards in AR and claim them into this Grimoire.",
    done: (p) => (p?.grimoire?.length ?? 0) > 0,
    detail: (p) => `${p?.grimoire?.length ?? 0} cards claimed`,
    mobileSide: true,
  },
];

export interface GuideStatus {
  steps: { step: GuideStep; done: boolean; detail: string | null }[];
  /** Index of the recommended next step (first not-done), or -1 when all done. */
  nextIndex: number;
  doneCount: number;
  total: number;
  pct: number;
}

export function guideStatus(profile: StudentProfile | null): GuideStatus {
  const steps = GUIDE.map((step) => ({
    step,
    done: step.done(profile),
    detail: step.detail?.(profile) ?? null,
  }));
  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    nextIndex: steps.findIndex((s) => !s.done),
    doneCount,
    total: steps.length,
    pct: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
  };
}

/** The single recommended next step, for surfacing outside the Grimoire (e.g. Home). */
export function nextGuideStep(profile: StudentProfile | null): GuideStep | null {
  const { steps, nextIndex } = guideStatus(profile);
  return nextIndex === -1 ? null : steps[nextIndex].step;
}
