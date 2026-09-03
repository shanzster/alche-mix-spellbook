import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Flame,
  Droplets,
  Skull,
  FlameKindling,
  Bomb,
  Cylinder,
  HeartPulse,
  AlertTriangle,
  Fish,
  Beaker,
  FlaskConical,
  FlaskRound,
  TestTube,
  TestTube2,
  Pipette,
  Thermometer,
  Eye,
  EyeOff,
  Wind,
  Hand,
  GlassWater,
  Star,
  Trophy,
  RotateCcw,
  ChevronRight,
  Swords,
  BookOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/lab-safety")({
  component: () => (
    <RequireRole role="student">
      <LabSafety />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-crimson)";
const GOLD = "var(--color-gold)";
const GREEN = "var(--color-emerald-elixir)";

const GHS = [
  {
    name: "Flammable",
    icon: Flame,
    meaning: "Catches fire easily near heat, sparks or flame.",
    examples: "Ethanol, acetone, hydrogen",
  },
  {
    name: "Corrosive",
    icon: Droplets,
    meaning: "Destroys skin, eyes and metal on contact.",
    examples: "Strong acids & bases, bleach",
  },
  {
    name: "Acute toxicity",
    icon: Skull,
    meaning: "Fatal or toxic if swallowed, inhaled or absorbed.",
    examples: "Methanol, cyanide salts",
  },
  {
    name: "Oxidiser",
    icon: FlameKindling,
    meaning: "Feeds fire by releasing oxygen — makes flames fiercer.",
    examples: "Hydrogen peroxide, nitrates",
  },
  {
    name: "Explosive",
    icon: Bomb,
    meaning: "May explode from heat, shock or friction.",
    examples: "Organic peroxides",
  },
  {
    name: "Compressed gas",
    icon: Cylinder,
    meaning: "Gas under pressure; the cylinder may burst if heated.",
    examples: "Oxygen, butane cylinders",
  },
  {
    name: "Health hazard",
    icon: HeartPulse,
    meaning: "Carcinogen, or damages organs / breathing over time.",
    examples: "Benzene, formaldehyde",
  },
  {
    name: "Harmful / irritant",
    icon: AlertTriangle,
    meaning: "Irritates skin, eyes or airways; harmful in quantity.",
    examples: "Dilute acids, many solvents",
  },
  {
    name: "Environmental",
    icon: Fish,
    meaning: "Toxic to aquatic life — never pour down the drain.",
    examples: "Heavy-metal salts, pesticides",
  },
];

const APPARATUS = [
  { name: "Beaker", icon: Beaker, use: "Holding & mixing liquids; only a rough volume guide." },
  {
    name: "Conical flask",
    icon: FlaskConical,
    use: "Swirling without spills — the classic titration flask.",
  },
  { name: "Round-bottom flask", icon: FlaskRound, use: "Even heating of liquids; distillation." },
  { name: "Test tube", icon: TestTube, use: "Small-scale reactions and observations." },
  {
    name: "Measuring cylinder",
    icon: TestTube2,
    use: "Measuring a liquid's volume fairly accurately.",
  },
  { name: "Pipette", icon: Pipette, use: "Delivering a precise, fixed small volume." },
  { name: "Bunsen burner", icon: Flame, use: "The lab's adjustable heat source." },
  { name: "Thermometer", icon: Thermometer, use: "Measuring temperature during a reaction." },
];

function Diamond({ icon: Icon }: { icon: typeof Flame }) {
  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <div
        className="absolute inset-0 rotate-45 rounded-md"
        style={{ background: "#fff", border: "3px solid var(--color-crimson)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-7 w-7" style={{ color: "#1a1a1a" }} />
      </div>
    </div>
  );
}

// ── Safety Trials — Labster-style "freedom to fail" scenarios ───────────────

type VisualKey =
  | "fizz"
  | "spatter"
  | "flame"
  | "smoke"
  | "cut"
  | "burn"
  | "eye"
  | "poison"
  | "safe";

const VISUALS: Record<VisualKey, { emoji: string[]; anim: string }> = {
  fizz: { emoji: ["🫧", "🧪", "🫧"], anim: "lab-trial-rise" },
  spatter: { emoji: ["💥", "⚗️", "💥"], anim: "lab-trial-spatter" },
  flame: { emoji: ["🔥", "🔥", "🔥"], anim: "lab-trial-flicker" },
  smoke: { emoji: ["💨", "😵", "💨"], anim: "lab-trial-rise" },
  cut: { emoji: ["🩸", "🖐️", "🩸"], anim: "lab-trial-shake" },
  burn: { emoji: ["🔥", "🖐️", "😖"], anim: "lab-trial-shake" },
  eye: { emoji: ["💧", "👁️", "💧"], anim: "lab-trial-spatter" },
  poison: { emoji: ["☠️", "🤢", "☠️"], anim: "lab-trial-shake" },
  safe: { emoji: ["✨", "🧑‍🔬", "✨"], anim: "lab-trial-glow" },
};

interface TrialChoice {
  text: string;
  correct: boolean;
  visual: VisualKey;
  outcome: string;
}

interface TrialScenario {
  id: string;
  title: string;
  icon: typeof Flame;
  situation: string;
  choices: TrialChoice[];
  rule: string;
}

const SCENARIOS: TrialScenario[] = [
  {
    id: "disposal",
    title: "The Leftover Acid",
    icon: Beaker,
    situation:
      "Your dilute hydrochloric acid potion is finished, and half a beaker remains. Along the workshop wall stand three vessels: the ordinary sink, a bin marked \"organic solvents\", and a labelled acid-waste crock beside the neutralising station.",
    choices: [
      {
        text: "Tip it into the organic-solvents bin — waste is waste.",
        correct: false,
        visual: "fizz",
        outcome:
          "The bin hisses and froths over the rim. Acids and solvents can react, heat up and release fumes — in a real lab this mix can ignite or gas out the room.",
      },
      {
        text: "Pour it into the labelled acid-waste crock, or neutralise it as your teacher directs.",
        correct: true,
        visual: "safe",
        outcome:
          "The acid is contained, logged and neutralised. No fumes, no surprises — exactly how a working lab handles waste.",
      },
      {
        text: "Pour it down the sink and walk away quickly.",
        correct: false,
        visual: "fizz",
        outcome:
          "Fizzing rises from the drain. Some very dilute acids may be sinked with plenty of water — but only when your teacher says so. Unchecked waste corrodes pipes and meets other chemicals downstream.",
      },
    ],
    rule: "Waste goes into the labelled container for its type — acids with acids, solvents with solvents. When unsure, ask before you pour.",
  },
  {
    id: "dilution",
    title: "The Fierce Dilution",
    icon: Droplets,
    situation:
      "The recipe calls for dilute sulfuric acid, but the shelf holds only the concentrated stock. Before you: the stock bottle, a large flask of water, and a stirring rod.",
    choices: [
      {
        text: "Pour water into the concentrated acid.",
        correct: false,
        visual: "spatter",
        outcome:
          "The first drops of water flash to steam on the acid's surface and spit hot acid back out of the vessel — straight towards your hands and face.",
      },
      {
        text: "Shake them together quickly to get it over with.",
        correct: false,
        visual: "spatter",
        outcome:
          "Heat plus agitation sends acid spray everywhere. Shaking concentrated acid is how you paint the ceiling with it.",
      },
      {
        text: "Slowly add the acid to the water, stirring as you go.",
        correct: true,
        visual: "safe",
        outcome:
          "The heat of mixing spreads through the large volume of water, warming it gently instead of spitting. Slow, stirred, safe.",
      },
    ],
    rule: "Always add acid to water, never water to acid — \"do as you oughta, add acid to water\".",
  },
  {
    id: "sleeve-fire",
    title: "The Burning Sleeve",
    icon: Flame,
    situation:
      "Across the bench, an apprentice leans too close to a burner and their sleeve catches. They freeze, staring at the flame crawling up the fabric.",
    choices: [
      {
        text: "Grab the nearest beaker of clear liquid and throw it over them.",
        correct: false,
        visual: "flame",
        outcome:
          "The \"water\" was ethanol. The flames leap higher. In a lab, never assume a clear liquid is water.",
      },
      {
        text: "Shout for the teacher and smother the flame — fire blanket, or stop, drop and roll.",
        correct: true,
        visual: "safe",
        outcome:
          "Smothering starves the fire of oxygen and it dies in seconds. Fast, calm, correct — and help is already on the way.",
      },
      {
        text: "Tell them to run to the door for help.",
        correct: false,
        visual: "flame",
        outcome:
          "Running feeds the flames with fresh air and fans them larger. Movement is fuel for a clothing fire.",
      },
    ],
    rule: "Clothing on fire: stop, drop and roll — or smother with a fire blanket. Never run, never throw unknown liquids.",
  },
  {
    id: "pictogram",
    title: "Read the Label",
    icon: ShieldAlert,
    situation:
      "A delivery crate holds a jar labelled only with a scribbled note: \"Releases oxygen readily — makes any fire burn fiercer. Keep far from flammables.\" Which pictogram belongs on the jar?",
    choices: [
      {
        text: "The flame — flammable.",
        correct: false,
        visual: "flame",
        outcome:
          "Close — but this jar doesn't burn by itself; it feeds other fires. Mislabelled as merely flammable, it ends up shelved beside the solvents it makes fiercer.",
      },
      {
        text: "The flame over a circle — oxidiser.",
        correct: true,
        visual: "safe",
        outcome:
          "The circle is the O of oxygen. Oxidisers needn't be flammable themselves — they make everything around them burn harder.",
      },
      {
        text: "The corrosion symbol — corrosive.",
        correct: false,
        visual: "flame",
        outcome:
          "Corrosive warns of eaten skin and metal — this note says nothing of that. With the wrong diamond on the jar, the storeroom sorts it next to the flammables.",
      },
    ],
    rule: "Flame-over-circle means oxidiser: it releases oxygen and intensifies fire. Store oxidisers well away from anything flammable.",
  },
  {
    id: "smell",
    title: "The Unknown Vapour",
    icon: Wind,
    situation:
      "A stoppered flask of unknown clear liquid needs identifying, and one useful clue is its smell.",
    choices: [
      {
        text: "Hold it under your nose and inhale deeply.",
        correct: false,
        visual: "smoke",
        outcome:
          "A lungful of concentrated vapour — your eyes stream and your throat burns. Some vapours injure in a single breath.",
      },
      {
        text: "Dip a finger in and taste a drop — the old alchemists did.",
        correct: false,
        visual: "poison",
        outcome:
          "The old alchemists also died young, frequently of exactly this. Nothing in a lab ever goes in your mouth.",
      },
      {
        text: "Hold the flask away and waft the air above it towards your nose.",
        correct: true,
        visual: "safe",
        outcome:
          "A tiny, diluted wisp of vapour drifts over — enough to identify, not enough to harm.",
      },
    ],
    rule: "Never smell a chemical directly — waft its vapour gently towards your nose. And never, ever taste.",
  },
  {
    id: "glass",
    title: "The Shattered Flask",
    icon: AlertTriangle,
    situation:
      "A conical flask slips from your grip and bursts on the stone floor, scattering shards of glass around your boots.",
    choices: [
      {
        text: "Pick up the pieces quickly with your fingers before anyone notices.",
        correct: false,
        visual: "cut",
        outcome:
          "A sliver you never saw opens your fingertip. Lab glass shatters into near-invisible splinters that find bare skin every time.",
      },
      {
        text: "Kick the shards under the bench and carry on brewing.",
        correct: false,
        visual: "cut",
        outcome:
          "The next apprentice to drop a pencil finds the glass with their hand. Hidden shards always cut someone eventually.",
      },
      {
        text: "Tell the teacher, then sweep it up with a brush and dustpan into the sharps bin.",
        correct: true,
        visual: "safe",
        outcome:
          "Every shard — even the invisible ones — ends up in the rigid sharps bin, where it can cut no one. Reported, swept, done.",
      },
    ],
    rule: "Broken glass never touches bare hands: brush and dustpan, into the sharps bin — and always report it.",
  },
  {
    id: "bunsen",
    title: "The Waiting Flame",
    icon: FlameKindling,
    situation:
      "Your burner roars with a hot blue flame, but you must cross the workshop to fetch more reagent. The flame will be out of your sight for a minute.",
    choices: [
      {
        text: "Leave it roaring blue — you'll only be a moment.",
        correct: false,
        visual: "burn",
        outcome:
          "The hot blue flame is nearly invisible in bright light. Someone reaching across the bench doesn't see it — until their sleeve does.",
      },
      {
        text: "Close the air hole to the yellow safety flame (or turn it off) before you go.",
        correct: true,
        visual: "safe",
        outcome:
          "The yellow luminous flame is cooler and visible from across the room — everyone can see the burner is live.",
      },
      {
        text: "Balance a book over it to mark the spot.",
        correct: false,
        visual: "flame",
        outcome:
          "The book chars, smokes, then catches. Nothing goes above a flame you aren't deliberately heating.",
      },
    ],
    rule: "Never leave a burner unattended on the blue flame — set the yellow safety flame, or turn it off.",
  },
  {
    id: "eyewash",
    title: "Seconds Count",
    icon: Eye,
    situation:
      "A splash — the apprentice beside you cries out, a drop of alkali in their eye. The eye-wash station is three steps away.",
    choices: [
      {
        text: "Get them to the eye wash now and rinse for 10–15 minutes while someone fetches the teacher.",
        correct: true,
        visual: "safe",
        outcome:
          "Flushing began within seconds. Chemical eye injuries are decided in the first moments — fast rinsing is what saves sight.",
      },
      {
        text: "Tell them to keep the eye shut tight until the stinging passes.",
        correct: false,
        visual: "eye",
        outcome:
          "Behind the closed lid the alkali keeps burning deeper. Alkalis are even worse for eyes than acids — every second matters.",
      },
      {
        text: "Hunt through the cupboard for the exact neutralising drops first.",
        correct: false,
        visual: "eye",
        outcome:
          "Minutes lost hunting a \"perfect\" remedy while plain water waited three steps away. Water, immediately, wins every time.",
      },
    ],
    rule: "Chemical in the eye: rinse at the eye wash immediately for 10–15 minutes, and get help while rinsing. Speed beats everything.",
  },
  {
    id: "spill-skin",
    title: "Acid on the Hand",
    icon: Hand,
    situation:
      "A dribble of acid runs down the outside of a bottle and onto the back of your hand. It is starting to prickle.",
    choices: [
      {
        text: "Wipe it off hard with a dry cloth.",
        correct: false,
        visual: "burn",
        outcome:
          "The cloth smears acid across more skin and rubs it in. The prickle becomes a burn.",
      },
      {
        text: "Rinse under cold running water for several minutes and tell the teacher.",
        correct: true,
        visual: "safe",
        outcome:
          "Running water dilutes the acid and carries it away before it can do real work on your skin.",
      },
      {
        text: "Pour a base on it to neutralise the acid — chemistry!",
        correct: false,
        visual: "spatter",
        outcome:
          "Neutralisation releases heat — now it's a chemical burn and a thermal burn. Skin is not a titration.",
      },
    ],
    rule: "Chemical on skin: flood with running water at once, then report it. Don't wipe, don't try to neutralise.",
  },
  {
    id: "drink",
    title: "The Thirsty Apprentice",
    icon: GlassWater,
    situation:
      "Halfway through a long brewing session your throat is dry. Your own water bottle sits in your bag at the side of the workshop.",
    choices: [
      {
        text: "Take a quick swig at the bench — it's your own sealed bottle.",
        correct: false,
        visual: "poison",
        outcome:
          "Your gloves have touched three reagents today — and now they've touched your bottle, and your mouth. Invisible residues travel.",
      },
      {
        text: "Sip from a clean beaker — beakers hold water fine.",
        correct: false,
        visual: "poison",
        outcome:
          "\"Clean\" lab glassware is never clean enough to drink from — and drinking from beakers builds exactly the habit that poisons people.",
      },
      {
        text: "Step outside the lab, take your gloves off, wash your hands, then drink.",
        correct: true,
        visual: "safe",
        outcome:
          "Thirst handled, chemistry left behind at the door. Gloves off, hands washed — no residue follows you.",
      },
    ],
    rule: "Never eat or drink in the lab. Step outside, gloves off, hands washed — then drink.",
  },
];

const TRIAL_OUT_OF = SCENARIOS.length;

function starsFor(score: number): number {
  return score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0;
}

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function StarRow({ count, size = "h-5 w-5" }: { count: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={size}
          style={{
            color: i < count ? GOLD : "color-mix(in oklab, var(--color-parchment) 25%, transparent)",
            fill: i < count ? GOLD : "transparent",
          }}
        />
      ))}
    </span>
  );
}

function ConsequenceVisual({ visual }: { visual: VisualKey }) {
  const v = VISUALS[visual];
  return (
    <div className="flex items-center justify-center gap-3 py-3 text-4xl select-none" aria-hidden>
      {v.emoji.map((e, i) => (
        <span
          key={i}
          className="inline-block"
          style={{ animation: `${v.anim} 0.9s ease-in-out ${i * 0.15}s infinite` }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

function SafetyTrials() {
  const { uid, profile } = useUserProfile();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [run, setRun] = useState<TrialScenario[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<TrialChoice | null>(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const best = profile?.trials?.["lab-safety"];

  const start = () => {
    setRun(shuffled(SCENARIOS).map((s) => ({ ...s, choices: shuffled(s.choices) })));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setResults([]);
    setPhase("playing");
  };

  const pick = (choice: TrialChoice) => {
    if (picked) return; // first choice is the one that counts
    setPicked(choice);
    setResults((r) => [...r, choice.correct]);
    if (choice.correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 < run.length) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      setPhase("done");
      void recordTrial(uid, "lab-safety", {
        score,
        outOf: TRIAL_OUT_OF,
        stars: starsFor(score),
      });
    }
  };

  const scenario = run[idx];

  return (
    <div className="mx-auto max-w-2xl">
      <style>{`
        @keyframes lab-trial-rise {
          0% { transform: translateY(6px); opacity: 0.5; }
          50% { transform: translateY(-8px); opacity: 1; }
          100% { transform: translateY(6px); opacity: 0.5; }
        }
        @keyframes lab-trial-spatter {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.25) rotate(-8deg); }
          60% { transform: scale(0.9) rotate(6deg); }
        }
        @keyframes lab-trial-flicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          40% { transform: scale(1.2) translateY(-3px); opacity: 0.8; }
          70% { transform: scale(0.95); opacity: 1; }
        }
        @keyframes lab-trial-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-3deg); }
          40% { transform: translateX(4px) rotate(3deg); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes lab-trial-glow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px color-mix(in oklab, var(--color-gold) 60%, transparent)); }
          50% { transform: scale(1.12); filter: drop-shadow(0 0 10px color-mix(in oklab, var(--color-gold) 80%, transparent)); }
        }
        @keyframes lab-trial-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {phase === "intro" && (
        <div
          className="rounded-2xl p-6 sm:p-8 text-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`,
              color: ACCENT,
              border: `1px solid color-mix(in oklab, ${ACCENT} 35%, transparent)`,
            }}
          >
            <Swords className="h-7 w-7" />
          </span>
          <h2 className="font-display text-xl mb-2">Freedom to fail — safely.</h2>
          <p className="text-sm text-parchment/70 leading-relaxed max-w-md mx-auto mb-2">
            Ten moments where a real lab goes right or wrong. Make your call and watch the
            consequence play out — here, a mistake costs nothing and teaches everything.
          </p>
          <p className="text-xs text-parchment/50 mb-6">
            Your first choice on each scenario is the one that scores. {TRIAL_OUT_OF} scenarios,
            shuffled every run.
          </p>
          {best && (
            <div
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs"
              style={{
                background: `color-mix(in oklab, ${GOLD} 10%, transparent)`,
                border: `1px solid color-mix(in oklab, ${GOLD} 30%, transparent)`,
                color: "var(--color-parchment)",
              }}
            >
              <Trophy className="h-3.5 w-3.5" style={{ color: GOLD }} />
              Best: {best.best}/{best.outOf}
              <StarRow count={best.stars} size="h-3.5 w-3.5" />
            </div>
          )}
          <div>
            <button
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-ui font-medium tracking-wide transition hover:brightness-110"
              style={{
                background: ACCENT,
                color: "#fff",
                boxShadow: `0 8px 30px -10px ${ACCENT}`,
              }}
            >
              <Swords className="h-4 w-4" /> Begin the trials
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && scenario && (
        <div style={{ animation: "lab-trial-in 0.3s ease-out" }} key={scenario.id}>
          {/* progress dots */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {run.map((s, i) => (
                <span
                  key={s.id}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      i < results.length
                        ? results[i]
                          ? GREEN
                          : ACCENT
                        : i === idx
                          ? "color-mix(in oklab, var(--color-parchment) 70%, transparent)"
                          : "color-mix(in oklab, var(--color-parchment) 20%, transparent)",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-parchment/50 whitespace-nowrap">
              {idx + 1} / {run.length} · score {score}
            </span>
          </div>

          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                  color: ACCENT,
                }}
              >
                <scenario.icon className="h-5 w-5" />
              </span>
              <h3 className="font-ui font-medium text-lg leading-tight">{scenario.title}</h3>
            </div>
            <p className="text-sm text-parchment/75 leading-relaxed mb-5">{scenario.situation}</p>

            {!picked ? (
              <div className="flex flex-col gap-2.5">
                {scenario.choices.map((c) => (
                  <button
                    key={c.text}
                    onClick={() => pick(c)}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm leading-snug transition hover:brightness-110"
                    style={{
                      background: "color-mix(in oklab, var(--color-slate-sunken) 90%, transparent)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-parchment)",
                    }}
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ animation: "lab-trial-in 0.3s ease-out" }}>
                {/* consequence panel */}
                <div
                  className="rounded-xl p-4 mb-3"
                  style={{
                    background: `color-mix(in oklab, ${picked.correct ? GREEN : ACCENT} 8%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${picked.correct ? GREEN : ACCENT} 40%, transparent)`,
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-ui font-medium mb-1"
                    style={{ color: picked.correct ? GREEN : ACCENT }}
                  >
                    {picked.correct ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Well chosen
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" /> Watch what happens…
                      </>
                    )}
                  </div>
                  <ConsequenceVisual visual={picked.visual} />
                  <p className="text-sm text-parchment/80 leading-relaxed">{picked.outcome}</p>
                  {!picked.correct && (
                    <p className="mt-2 text-xs text-parchment/55 italic">
                      No harm done — now you know before it counts.
                    </p>
                  )}
                </div>

                {/* the rule, stated plainly */}
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    background: `color-mix(in oklab, ${GOLD} 8%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${GOLD} 30%, transparent)`,
                  }}
                >
                  <div
                    className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium mb-1"
                    style={{ color: GOLD }}
                  >
                    The rule
                  </div>
                  <p className="text-sm text-parchment/85 leading-relaxed">{scenario.rule}</p>
                </div>

                <button
                  onClick={next}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-ui font-medium tracking-wide transition hover:brightness-110 sm:w-auto"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  {idx + 1 < run.length ? "Next scenario" : "See your result"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div
          className="rounded-2xl p-6 sm:p-8 text-center"
          style={{
            animation: "lab-trial-in 0.3s ease-out",
            background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="mb-3 flex justify-center">
            <StarRow count={starsFor(score)} size="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl mb-1">
            {score}/{TRIAL_OUT_OF}
          </h2>
          <p className="text-sm text-parchment/70 mb-1">
            {score >= 9
              ? "A master of the workshop — nothing catches you off guard."
              : score >= 7
                ? "Sharp instincts. A couple of rules to lock in and you're there."
                : score >= 5
                  ? "Good foundations — the trials you missed are the ones to remember."
                  : "Every mistake here is one you'll never make at the bench. Run it again."}
          </p>
          {best && (
            <p className="text-xs text-parchment/50 mb-6">
              Best so far: {Math.max(best.best, score)}/{best.outOf}
            </p>
          )}
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-ui font-medium tracking-wide transition hover:brightness-110"
            style={{ background: ACCENT, color: "#fff", boxShadow: `0 8px 30px -10px ${ACCENT}` }}
          >
            <RotateCcw className="h-4 w-4" /> Run the trials again
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

function LabSafety() {
  const { uid, profile } = useUserProfile();
  const [tab, setTab] = useState<"study" | "trials">("study");
  const [test, setTest] = useState(false);
  useEffect(() => {
    if (uid) void logPractice(uid, "lab-safety");
  }, [uid]);

  const best = profile?.trials?.["lab-safety"];

  return (
    <StudentShell title="Lab Safety">
      <PageHeader
        eyebrow="Before You Begin"
        title="Read the room — and the labels."
        subtitle="Every chemical carries hazard pictograms, and every tool has a job. Learn to read both before you touch anything."
        icon={ShieldAlert}
        accent={ACCENT}
        right={
          tab === "study" ? (
            <button
              onClick={() => setTest((t) => !t)}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] tracking-[0.15em] uppercase transition"
              style={{
                background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
                color: ACCENT,
                border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
              }}
            >
              {test ? (
                <>
                  <Eye className="h-3 w-3" /> Show answers
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" /> Test yourself
                </>
              )}
            </button>
          ) : best ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] tracking-[0.15em] uppercase"
              style={{
                background: `color-mix(in oklab, ${GOLD} 10%, transparent)`,
                color: GOLD,
                border: `1px solid color-mix(in oklab, ${GOLD} 30%, transparent)`,
              }}
            >
              <Trophy className="h-3 w-3" /> Best {best.best}/{best.outOf}
            </span>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-8 flex gap-2">
        {(
          [
            { id: "study", label: "Study", icon: BookOpen },
            { id: "trials", label: "Safety Trials", icon: Swords },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-ui font-medium tracking-[0.1em] uppercase transition"
              style={
                active
                  ? {
                      background: `color-mix(in oklab, ${ACCENT} 16%, transparent)`,
                      color: ACCENT,
                      border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)`,
                    }
                  : {
                      background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
                      color: "color-mix(in oklab, var(--color-parchment) 65%, transparent)",
                      border: "1px solid var(--color-border)",
                    }
              }
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.id === "trials" && best && best.stars > 0 && (
                <StarRow count={best.stars} size="h-3 w-3" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "trials" ? (
        <SafetyTrials />
      ) : (
        <>
          {/* GHS pictograms */}
          <section className="mb-12">
            <h2 className="font-ui font-medium text-sm tracking-[0.2em] uppercase text-parchment/70 mb-4">
              GHS Hazard Symbols
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GHS.map((g) => (
                <div
                  key={g.name}
                  className="flex gap-4 rounded-2xl p-4"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Diamond icon={g.icon} />
                  <div className="min-w-0">
                    <div className="font-ui font-medium text-base mb-1">{g.name}</div>
                    {test ? (
                      <div className="text-xs text-parchment/40 italic">
                        What does this warn about?
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-parchment/70 leading-snug mb-1">{g.meaning}</p>
                        <p className="text-[11px] text-parchment/45">e.g. {g.examples}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Apparatus */}
          <section>
            <h2 className="font-ui font-medium text-sm tracking-[0.2em] uppercase text-parchment/70 mb-4">
              Common Apparatus
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {APPARATUS.map((a) => (
                <div
                  key={a.name}
                  className="rounded-2xl p-4"
                  style={{
                    background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                    style={{
                      background:
                        "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
                      color: "var(--color-emerald-elixir)",
                    }}
                  >
                    <a.icon className="h-5 w-5" />
                  </span>
                  <div className="font-ui font-medium text-sm mb-1">{a.name}</div>
                  {!test && <p className="text-[11px] text-parchment/60 leading-snug">{a.use}</p>}
                  {test && <p className="text-[11px] text-parchment/40 italic">What's it for?</p>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </StudentShell>
  );
}
