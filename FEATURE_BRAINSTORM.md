# AlcheMix — Feature Brainstorm

**What this is:** a cross-check of AlcheMix against the best chemistry simulation & education
platforms on the web — what they do, what we already have, what's missing, and which missing
things fit our alchemy brand best. For brainstorming; nothing here is committed work.

**Full research pack:** the detailed per-platform reports and the complete AlcheMix system
inventory live in [`docs/brainstorm/`](docs/brainstorm/README.md) — this file is the synthesis.

**Platforms surveyed:** PhET (CU Boulder), Concord Consortium / Molecular Workbench,
ChemCollective (CMU), Labster, Beyond Labz / Virtual ChemLab, LabXchange (Harvard),
PraxiLabs, MolView, Ptable, PubChem, ChemDoodle Web, MolCalc, RSC Periodic Table,
ACS/AACT (teachchemistry.org), Collisions (Playmada), Legends of Learning, Little Alchemy 2 /
Doodle God, ChemCaper, Elementeo / Ion / Covalence (card games), Kahoot / Blooket / Gimkit,
BrainPOP, Toca Lab: Elements, Tinybop, Minecraft Education Chemistry.

---

## 1. Where AlcheMix stands today

14 live modules: Grimoire/cards, Lab Safety, Atomic Builder, Periodic Table (118 elements),
The Study (guided path + SM-2 spaced review), Molecule Shapes, Reaction Theatre,
Equation Balancer, Gas Laws, Titration, Radioactive Decay, 3D Visual Quiz, AR Scanner,
AI Scavenger Hunt. Plus: teacher console (classes/gradebook/evidence review), admin console
with ID + face-match teacher verification, PWA manifest, two-sided architecture
(mobile = capture/AR, website = deep study).

**Genuine differentiators nobody surveyed has:**
- Physical AR trading cards that summon 3D models, with a forging ceremony.
- Live AI camera scavenger hunt (COCO-SSD + Gemini) with a teacher evidence-review inbox.
- The alchemy narrative wrapper itself.
- On-device face-match teacher verification.

**Known depth limits (from the code inventory):**
- Small curated datasets everywhere: 6 molecules, 8 reactions, 8 equations, 6 isotopes,
  5 study topics / 15 concepts, ~20 richly-documented elements, 2 AR targets.
- Titration: one fixed scenario (25 mL of 0.1 M HCl vs 0.1 M NaOH), strong/strong only.
- Gas laws: ideal only; decorative particles, not a kinetic simulation.
- Scores are session-only; the only persisted learning state is path progress, reviews,
  teacher grades, badges, grimoire/evidence.
- **Built but unwired:** `aiGenerateProblem`, `aiGradeAnswer`, `aiAskAlchemist` (lib/ai.ts) have
  no UI; the rule-based compound combiner in `lib/cards.ts` (valence logic, 7 polyatomic ions,
  ~25 enriched compounds) is unused — the AR mix ceremony reveals one hardcoded card.
- Teacher "More Tools" tab: Quiz Builder, Mission Configurator, Performance Matrix are
  "coming soon" placeholders.
- No service worker (installable, not offline). No accessibility work. English only.

---

## 2. Feature scan — what the best platforms do

### 2.1 Simulation design (PhET, Concord, AACT)

| Feature | Who | What it looks like |
|---|---|---|
| Multi-screen sims, easy→hard | PhET | Every sim = 2–4 screens (Intro → Explore → Game; Macro → Micro → My Solution). One idea per screen. |
| **Game screens with levels & stars** | PhET | Build an Atom: 4 levels × 5 challenges, 2 tries, star scoring, optional timer, best-time tracking. Balancing Equations & Reactants/Products have the same pattern. |
| Multiple linked representations | PhET, AACT | Symbolic + particle + macroscopic views updating together (pH macro beaker ↔ particle ratio; balance-scale ↔ bar-chart for equations). |
| Implicit scaffolding | PhET | No instructions; affordances invite play; constraints prevent dead ends; "Basics" variants for younger grades. |
| Mystery/prediction hooks | PhET, AACT | Density "Mystery" blocks, mystery liquids, build-a-mystery-element from isotope data — student derives the answer from evidence. |
| **Randomized generation** | AACT, ChemCollective | Random titration curves per run, random unknown solutions per student — one sim becomes infinite problems. |
| Real physics engine as content | Concord | Actual molecular dynamics: boiling/dissolving/attraction emerge from the model; students probe with heat/force tools with live graphs. |
| One-question micro-sims | Concord | Tiny interactives framed by a single driving question, in series that vary one factor at a time (6 gas-law relationships as 6 micro-sims). |
| Particle + macro dual view in every sim | AACT | Their recurring house pattern; sims embed self-check quizzes. |
| Accessibility quad | PhET | Screen-reader descriptions, sonification, full keyboard input, pan/zoom — on the whole chemistry suite. 80–100+ translations per sim. |
| Offline single-file + embed | PhET | Each sim is one self-contained .html; iframe embed snippets; full offline installers. |

### 2.2 Virtual labs (ChemCollective, Labster, Beyond Labz, LabXchange)

| Feature | Who | What it looks like |
|---|---|---|
| Open wet bench + stockroom | ChemCollective, Beyond Labz | Drag glassware onto a bench, hundreds of reagents, real equilibrium engine so arbitrary mixtures behave correctly. |
| **Realism dials** | ChemCollective | "Precise transfer" (type exact mL) vs "Realistic transfer" (hold-to-pour, you can overshoot) — authenticity is per-assignment. |
| Calibration & error as content | Beyond Labz | Each student's glassware has a hidden persistent error function; you must calibrate by weighing water. Meters have noise; unstirred solutions lag. |
| Randomized unknowns + autograding | ChemCollective | Per-student unknowns; web forms grade automatically with **feedback keyed to specific common errors**; scaffolded variants for weaker students. |
| Scenario shells | ChemCollective, Labster | Murder mystery (Mixed Reception), arsenic in Bangladesh wells, Mars fuel design, acid-lake cleanup — same engine, story wrapper. |
| **Quiz-checkpoint + theory loop** | Labster | In-sim LabPad: quiz gates between tasks; wrong answer → pointed at the Theory page → retry for slightly reduced points. |
| Guide character | Labster, PraxiLabs | Dr. One / Oxi — a robot mentor giving dialogue, pacing, and tone. |
| Safety with consequences | Labster | Wrong waste bin / wrong solvent → (safe, simulated) explosion. "Freedom to fail before it counts." |
| Attempt-level analytics → gradebook | Labster | Per-student: completion %, score, attempts, tries-per-question, time-in-sim; LTI 1.3 grade passback to Canvas/Moodle. |
| Scaffolding levels 1/2/3 | LabXchange | Same sim, learner-selected prompt detail — built-in differentiation. |
| Remixable pathways | LabXchange, Legends | Teachers sequence sims + videos + quizzes into an assignable playlist; any public asset cloneable. |
| Electronic lab notebook | Beyond Labz | Records procedure + observations, exports data to spreadsheets/PDF. |
| Problem authoring format | ChemCollective | A "problem" = XML of reagents + equipment + hidden info panels + goal. Cheap to author; teachers request & share. |

### 2.3 Reference & visualization (MolView, Ptable, PubChem, RSC, ChemDoodle, MolCalc)

| Feature | Who | What it looks like |
|---|---|---|
| **Temperature slider on the table** | Ptable | Drag through K/°C and all 118 elements recolor live by state — watch mercury boil. Their single most-cited feature. |
| Discovery-year time machine | Ptable | Slider that assembles the table through history. |
| Layered data lenses | Ptable | Same grid, 4 tabs: Properties (heat-map any of 30+ properties), Orbitals (hover → 3D orbital), Isotopes (card-fan per element), Compounds (click 2 elements → real compounds they form). |
| Table game as first-class view | PubChem | TABLE / LIST / **GAME** tabs — element-placement memorization game, 3 difficulties, embeddable widget. |
| Property-trend plots + open data | PubChem | Interactive periodicity graphs; all element data downloadable for classroom analysis. |
| **Element storytelling** | RSC | Per element: podcast episode + transcript, rich history narrative, commissioned artwork, supply-risk score, **alchemical symbol with an explanation of its imagery**, etymology (Au → aurum). |
| 2D sketch → 3D molecule | MolView | Draw a structure, one click → 3D model; spectra (MS/IR/NMR) generated from *your* structure; shareable permalink per molecule. |
| Structure autograding | ChemDoodle | Compare a student-drawn molecule to the answer; name↔structure round-trips; stoichiometry-table component. |
| Real cheap computation | MolCalc | Students run genuine quantum calcs on their own small molecules — animated vibrations, molecular orbitals, in seconds. |
| Lesson-starter ritual | RSC | "Starters for Ten" — 10 quick questions as a repeatable lesson-opening format. |

### 2.4 Games & engagement (Collisions, Minecraft, Little Alchemy, Legends, Gimkit/Blooket, Toca, ChemCaper)

| Feature | Who | What it looks like |
|---|---|---|
| **Rules-enforced particle sandbox** | Collisions | The chemistry engine *is* the feedback: try to remove a core electron and the game pushes back with ionization energy. Tutorial → leveled targets → sandbox, per concept. |
| Target-based building wins | Collisions | Win condition = hit a geometry / a charge ratio / a phase sequence. No quiz layer needed. |
| **Chemistry outputs that are useful** | Minecraft Edu | You make compounds because the products do things: glow sticks, ice bombs, underwater torches, super fertilizer, helium balloons. Crafting = stoichiometry. |
| Element constructor / material reducer | Minecraft Edu | Proton/neutron/electron sliders craft element blocks (400+ isotopes); any world block decomposes into its constituent elements by %. |
| **Discovery encyclopedia** | Little Alchemy 2 | 720 items from combining 2 at a time; no fail state; % complete per category; milestone-gated unlockables; terminal items marked; metered hints. Doodle God adds chapters, quests, a world that visibly evolves with your discoveries. |
| Creatures-as-molecules | ChemCaper | Collect element orbs, bond particles into creature companions; a "Chempendium" codex maps every fantasy item to its real chemistry. |
| Stats from real properties | Elementeo | Oxidation state = attack, state of matter = movement, electrons = hit points; compound cards from combining. |
| Asymmetric-info co-op | Covalence | One student sees the secret molecule, others reconstruct it from limited clues. |
| Content decoupled from game shells | Blooket | One question set plays through 25+ modes (tower defense, battle royale, café…) — write chemistry once, skin it many ways. |
| Earn-then-spend economy | Gimkit, Legends | Correct answers earn currency spent mid-game on upgrades (compounding), or in a persistent avatar/pet world (earn in class, spend in world). |
| Collection meta / gacha | Blooket, Toca Lab | Collectible avatars with rarity tiers; Toca Lab: all 118 elements as characters, the table itself is the progress screen. |
| Playlist assignment + live class mode | Legends, Kahoot | Teacher sequences instruct-game → sim → assessment as one assignment; live host dashboards with per-question class accuracy. |
| Reflection capture | BrainPOP | SnapThought: screenshot a game moment + write a prediction/reflection, submitted to the teacher — makes any game assessable. |
| Question distribution co-op | Quizlet Live | The answer pool is split across teammates — forced collaboration. |
| Confidence-based SRS | Brainscape | Rate your confidence 1–5; low-confidence cards recur sooner. |

---

## 3. Gap analysis — cross-check vs AlcheMix

Legend: ✅ have · 🟡 partial / shallow · ❌ missing

| Capability | Status | Notes |
|---|---|---|
| **Sim game screens (levels, stars, persisted best scores)** | 🟡 | Only Equation Balancer Time Attack + session-only quiz score. No levels, stars, or persisted bests anywhere. |
| **Randomized / generated problems** | ❌ | Every module runs on a fixed curated set. `aiGenerateProblem` exists, unwired. |
| **Build-your-own molecule** | ❌ | Molecule Shapes is view-only (6 molecules). No PhET-style Build a Molecule, no sketcher, no collection boxes. |
| **Compound combination / discovery game** | 🟡 | The combiner engine exists in `lib/cards.ts` but the mix ceremony reveals one hardcoded card. No discovery encyclopedia. |
| **Open virtual wet bench (mix anything, stockroom, unknowns)** | ❌ | Titration is one fixed scenario. No mixing, no unknowns, no measurement-as-skill. |
| **Weak acids / indicator choice / configurable titration** | ❌ | Strong/strong only, fixed 0.1 M. |
| **States of matter / phase change sim** | ❌ | The single most common sim on every platform surveyed; we have none. |
| **Solutions & concentration / molarity sim** | ❌ | PhET Concentration/Molarity, ChemCollective stock solutions. |
| **Reaction rates / equilibrium / thermochemistry / electrochemistry sims** | ❌ | AACT galvanic cells, Concord kinetics, Labster calorimetry — none in AlcheMix. |
| **Intermolecular forces / bonding polarity sim** | ❌ | Collisions IMF game, PhET Molecule Polarity, Concord SAM series. |
| **Isotope depth** | 🟡 | Atomic Builder does isotopes 1–20 + crude stability heuristic; Decay has 6 isotopes. No isotope browser, no build-average-atomic-mass activity. |
| **Periodic table data lenses (temp slider, trend heat-maps, discovery timeline, compounds tab)** | ❌ | Our table is layout + category colors + per-element panel. No property lenses at all. |
| **Table placement/coordinate games** | ❌ | PubChem game view, Periodic Battleship. |
| **Element storytelling depth (history, etymology, alchemy symbols, audio)** | 🟡 | ~20 elements have uses/examples; 98 are placeholders. No history, etymology, or — ironically for AlcheMix — **alchemical symbols**. |
| **Multiple linked representations** | 🟡 | Reaction Theatre's mass ledger is a good start; most modules show one representation. |
| **Embedded quiz checkpoints inside sims** | 🟡 | QuickCheck exists for 2 AR cards only; no Labster-style checkpoint→theory→retry loop. |
| **Structure/answer autograding with error-specific feedback** | ❌ | `aiGradeAnswer` exists, unwired. |
| **Scenario / mission framing with stakes** | 🟡 | Atomic Builder has 5 missions; everything else is a sandbox with lore-flavored copy. No storylines, no guide character (despite `aiAskAlchemist` sitting unwired — the mentor is literally on the bench). |
| **Safety training with consequences** | 🟡 | Lab Safety is static reference cards + hide-the-answer toggle. Nothing like Labster's fail-safely disasters. |
| **Lab notebook / reflection capture** | 🟡 | Scavenger evidence capture is a strong start, but only for one module; no notebook, no snapshot-and-reflect anywhere else. |
| **Teacher: quiz/mission authoring** | ❌ | Both are "coming soon" placeholders in the console. |
| **Teacher: playlists / assignable sequences** | ❌ | The Grimoire Guide is one global fixed path; teachers can't assign or reorder anything. |
| **Teacher: per-concept analytics / misconception dashboards** | ❌ | Only raw engagement counters; the marketing page promises analytics that don't exist. |
| **Live class mode (host a game, real-time class accuracy)** | ❌ | Kahoot/Gimkit territory; nothing in AlcheMix. |
| **LMS / Google Classroom integration** | ❌ | Own auth only. |
| **Multiplayer / social (leaderboards, trading, co-op, battles)** | ❌ | Zero — striking, given we have *literal trading cards*. |
| **Meta-economy (currency, collection rarity, spend-to-customize)** | 🟡 | 1 badge, card counts. No currency, no rarity, no spending. |
| **Scaffolding / difficulty selection per activity** | ❌ | One difficulty everywhere. |
| **Accessibility (keyboard, screen reader, sonification, zoom)** | ❌ | Nothing deliberate; 3D/AR/canvas modules are inaccessible. |
| **Localization** | ❌ | English only (PhET ships 100+ languages; even Tinybop labels in 30+). |
| **True offline (service worker)** | ❌ | Installable PWA but no offline caching. |
| **Shareable deep links into a specific state** | ❌ | MolView/Ptable permalink pattern; useful for teachers projecting a setup. |
| **AR cards, AI scavenger, forging ceremony, teacher ID verification** | ✅ | Ours alone — the moat. Build around these. |

---

## 4. Brainstorm — what to build, in tiers

### Tier 0 — already built, just wire it (days, not weeks)

1. **Ask the Alchemist (guide character).** `aiAskAlchemist` is implemented with a keyless
   fallback. Give it a face and a floating rune-button in every module. Every serious platform
   has a Dr. One / Oxi; ours is thematically *better* — a mentor Alchemist — and it's sitting
   unwired. Fallback answers can come from the curriculum concept explainers.
2. **Real forging via the combiner.** Swap the hardcoded `3rd_card` reveal for
   `lib/cards.ts`' combiner: scan Na + Cl → actually forge NaCl with formula, bond type, name,
   uses. This single change turns the AR ceremony from a demo into the core loop.
3. **Infinite practice via `aiGenerateProblem`.** Add a "Trial of the Alchemist" button to
   Gas Laws and Equation Balancer that generates fresh problems (with the deterministic
   fallback bank behind it), graded by `aiGradeAnswer` with explanations.

### Tier 1 — quick wins on existing modules (each ~a module-sized effort)

4. **PhET-style Game screens for every sim.** Add a Practice / Trial split to Atomic Builder,
   Equation Balancer, Molecule Shapes quiz, Decay: levels × 5 challenges, 2 tries, star scoring,
   persisted best scores in the profile. We already have `logPractice` and badges; add a
   `trials` map. This is the highest leverage-per-effort item on the list.
5. **Periodic table lenses (Ptable's playbook).** On our existing 118-grid: (a) temperature
   slider recoloring by state, (b) property heat-map dropdown (electronegativity, radius,
   ionization energy — data is freely downloadable from PubChem), (c) discovery-year
   timeline slider, (d) "Compounds" mode — tap two elements, see what they form (reuse the
   combiner!). Each lens is one data field + one coloring function on a grid we already render.
6. **Alchemy symbols & element lore.** RSC-style depth, AlcheMix-branded: per element add the
   historical alchemical symbol + its meaning, name etymology (Au → aurum), a 3-sentence
   history, and a "supply risk / where it comes from" hook. Directly fixes the 98-placeholder
   problem and is the single most on-brand content investment possible. (Could be
   AI-drafted, human-reviewed, shipped 10 elements at a time.)
7. **Titration v2.** Random unknown concentration each run (AACT pattern) + weak acid/base
   option with buffer region + indicator choice + a "report your result" autograde with
   error-specific feedback ("you overshot the endpoint — the pink held for 30 s").
   Realism dial: precise-input mode vs hold-to-pour mode (ChemCollective's two transfer modes).
8. **Table placement game.** PubChem-style: empty grid, place the element tiles; escalate
   easy→hard (symbol → name → proton count). Persist best scores. Cheap to build on the
   existing grid component.
9. **Quiz checkpoint pattern.** Generalize `QuickCheck` into the Labster loop: checkpoint
   question inside each module → wrong answer links to the exact Study concept → retry for
   reduced credit. Connects the sims to the curriculum engine that already exists.
10. **Lesson starter ritual.** "Starters for Ten" à la RSC: a daily 10-question mixed quiz
    drawn from the concept bank + spaced-review queue. Streak counter. Pairs perfectly with
    the existing SM-2 engine.

### Tier 2 — new modules that fit the brand (each a real project)

11. **The Compound Codex — discovery encyclopedia.** The flagship idea. Little Alchemy's loop
    with *real* chemistry: combine any two (later three) elements/compounds; the combiner
    validates; every real product fills a Codex page (formula, bond type, uses, hazard) with
    % complete per family (oxides, salts, acids…). No-fail experimentation, milestone unlocks,
    terminal/stable products marked (noble gases!), metered hints. Feeds forged cards back
    into the Grimoire. This unifies cards.ts, the AR ceremony, and the grimoire into one game.
    (Little Alchemy × Minecraft Compound Creator × ChemCaper's Chempendium.)
12. **Build-a-Molecule.** Upgrade Molecule Shapes from viewer to builder: drag atoms from a
    kit, bonds validate by valence, fill "collection flasks" (PhET's collection boxes), then
    see your molecule in 3D with the existing `Molecule3D`. Later: MolCalc-style extras
    (animated vibrations) as a "wow" tier.
13. **The Alchemist's Bench — virtual wet lab v1.** Not Beyond Labz scale; start with:
    a stockroom of ~20 aqueous reagents, drag to mix in beakers, color/precipitate/gas
    outcomes from a lookup of real reactions, pH meter + balance tools, and **randomized
    unknown identification** ("which potion is the acid?") as the game mode. Scenario shells
    on top ("cure the poisoned well" = ChemCollective's arsenic lab, alchemy-skinned).
14. **States of Matter / Phase Change sim.** The most conspicuous catalog hole. Heat/cool a
    particle box (we already animate particles in Gas Laws), phase diagram, IMF strength
    selector. Concord's driving-question format: ship it as 3 micro-screens.
15. **Safety trials with consequences.** Upgrade Lab Safety: scenario quiz where wrong
    choices play out (safely) — wrong waste bin fizzes, missing goggles ends the trial.
    Labster's freedom-to-fail, cartoon-alchemy tone.
16. **Missions & storylines layer.** Wrap existing modules in quest framing with stakes
    (Mars fuel, poisoned reception, acid lake — ours: "the Guild's water supply is cursed").
    Atomic Builder's mission checklist is already the template; extend the pattern, narrated
    by the Alchemist character.
17. **Teacher: assignments & analytics v1.** Fill the three placeholder tabs with the proven
    patterns: (a) playlist builder — sequence modules/concepts/quizzes into an assignment
    (Legends/LabXchange), (b) assign specific trial levels pre/post-instruction (Collisions),
    (c) per-concept class matrix from quiz + review data — which concepts the class is
    missing (Labster's tries-per-question is the model).

### Tier 3 — big bets (only after tiers above prove out)

18. **Card economy & multiplayer.** We have physical trading cards and no social layer.
    Options, in escalating order: class leaderboards on trials → card trading between
    classmates → Elementeo-style battles where stats derive from real properties
    (oxidation state = attack, electrons = HP) → Covalence-style co-op (one student sees the
    secret compound, others reconstruct it). Even leaderboards alone would change retention.
19. **Transmutation economy.** Earn "aurum" from any correct work (Gimkit's earn-then-spend);
    spend on card frames, grimoire cosmetics, hint scrolls, or gacha card packs (Blooket's
    blooks). Keeps academic play and reward play separate, like Legends' Awakening world.
20. **Live class mode.** Teacher hosts a trial; class plays the same generated problem set
    live; host screen shows per-question accuracy in real time. (Kahoot mechanics over our
    existing question bank — content decoupled from the shell, so one bank feeds many modes.)
21. **Content authoring.** ChemCollective's lesson: a "problem" is just data (reagents +
    goal + hidden panels). Define a JSON problem format for trials/missions so teachers (and
    we) can author without code; the Quiz Builder placeholder becomes real.
22. **Accessibility & localization.** PhET's quad (keyboard, descriptions, sonification,
    zoom) is a years-long bar, but start with: full keyboard nav on non-3D modules, alt text,
    prefers-reduced-motion, and an i18n string layer (Azerbaijani + English would already
    out-localize every competitor locally).
23. **Offline service worker.** Cache the app shell + module data; PhET ships whole sims as
    single offline files — our modules are already mostly client-side.
24. **Deep links.** Shareable URLs encoding module state (element selected, reaction loaded,
    trial level) for teachers projecting or assigning a specific setup (MolView/Ptable pattern).

---

## 5. Deliberately skip (for now)

- **Full molecular-dynamics engine** (Concord-grade) — years of physics work; our illustrative
  animations + curated data serve the age group.
- **Organic chemistry / synthesis labs** (Beyond Labz's 1M-outcome benches) — wrong level for
  our audience.
- **LTI/LMS integration** — matters for institutional sales, not for the current classroom
  motion; Google Classroom share links would cover 90% at 5% of the cost.
- **Research-grade spectra/quantum tools** (MolView spectra, MolCalc) — fun, but off-level.
- **A separate rewards world** (Legends' Awakening) — the Grimoire/card collection *is* our
  reward world; deepen it instead of building a second one.

## 6. Theme synergy cheat-sheet

The alchemy brand isn't decoration — several "missing" features are *more* natural here than
on the platforms that invented them:

| Industry pattern | AlcheMix translation |
|---|---|
| Discovery encyclopedia (Little Alchemy) | The Compound Codex, pages of the Grimoire |
| Guide character (Dr. One) | The Alchemist mentor (`aiAskAlchemist`, already coded) |
| Crafting compounds (Minecraft) | Forging ceremony + itsura card printing (already ours) |
| Currency economy (Gimkit) | Aurum / transmutation gold |
| Levels & stars (PhET games) | Trials & guild ranks (Apprentice → Adept → Master) |
| Element history (RSC) | Alchemical symbols, etymology, "the old names" |
| Scenario labs (ChemCollective) | Guild quests: cursed wells, poisoned feasts, dragon's breath (gas laws) |
| Collection meta (Blooket) | Card rarity tiers — Base / Forged / Legendary (already in marketing copy!) |

---

*Sources: phet.colorado.edu (+ metadata API), concord.org / lab.concord.org, chemcollective.org,
labster.com, beyondlabz.com, labxchange.org, praxilabs.com, molview.org, ptable.com,
pubchem.ncbi.nlm.nih.gov/periodic-table, web.chemdoodle.com, molcalc.org,
periodic-table.rsc.org, edu.rsc.org, teachchemistry.org, playmadagames.com,
legendsoflearning.com, littlealchemy2.com, geniusgames.org, chemedx.org, Minecraft Education
Chemistry Update docs, Common Sense Education reviews. Compiled 2026-09-02.*
