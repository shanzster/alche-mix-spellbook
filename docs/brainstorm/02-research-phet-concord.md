# Research — PhET Interactive Simulations & Concord Consortium

Feature research for the AlcheMix brainstorm. Compiled 2026-09-02.

## PhET Interactive Simulations (phet.colorado.edu)

### Full chemistry catalog (HTML5; locale counts = number of translations of the live build)

Core chemistry sims:
- **Build an Atom** — drag protons/neutrons/electrons from buckets into an atom model; live readouts of element identity, charge, mass; game screen. 104 locales, PhET-iO enabled, full a11y quad (description/sonification/alt-input/pan-zoom).
- **Balancing Chemical Equations** — balance equations with number spinners; feedback via balance-scales and bar-chart representations; game screen. 99 locales, PhET-iO, full a11y quad.
- **Acid-Base Solutions** — compare strong/weak acids and bases; views of molecules, equilibrium graph, pH meter/paper/conductivity probe; "My Solution" screen to design a custom acid/base. 102 locales.
- **States of Matter** (+ **Basics**) — heat/cool/compress atoms and molecules; screens: States, Phase Changes (with pressure & phase diagram), Interaction (Lennard-Jones potential between two atoms). 95/86 locales.
- **Molecule Shapes** (+ **Basics**) — build VSEPR geometries by adding bonds/lone pairs to a central atom; Model vs Real Molecules screens; toggles for bond angles, geometry names. 84/77 locales.
- **Molecule Polarity** — screens: Two Atoms, Three Atoms, Real Molecules; drag electronegativity sliders, view bond dipoles, partial charges, electrostatic potential surfaces; toggle an external E-field to watch the molecule rotate. 79 locales.
- **pH Scale** (+ **Basics**) — dilute everyday liquids (soda, vomit, drain cleaner); Macro / Micro / My Solution screens; H₃O⁺/OH⁻ ratio, particle counts, logarithmic scale visualization. 93/86 locales.
- **Concentration** — add solid solute or concentrated solution, evaporate/dilute, saturation behavior, concentration meter. 85 locales.
- **Beer's Law Lab** — Concentration + Beer's Law screens: shine light through solutions, vary wavelength/width/concentration, absorbance & transmittance readouts. 91 locales.
- **Reactants, Products and Leftovers** — Sandwiches screen (limiting-reagent analogy), Molecules screen (real reactions), Game screen. 85 locales.
- **Isotopes and Atomic Mass** — build isotopes with sliders; Mixtures screen: assemble isotope mixtures and compare computed average atomic mass to nature's mix. 86 locales.
- **Gas Properties** (+ **Gases Intro**, + **Diffusion**) — pump particles, heat/cool, resize container; screens: Ideal, Explore, Energy (speed histograms), Diffusion (two-species divided chamber). 92 locales.
- **Density** — Intro/Compare/Mystery screens; drop blocks in water, mystery-materials identification task. 83 locales.
- **Build a Molecule** — drag atoms from kits to form molecules; 3D view; fill "collection boxes" (single + multiple molecule goals) across kits — a collection-completion game loop. 82 locales.

Other chemistry-tagged HTML5 sims: **Atomic Interactions** (interatomic potential curves), **Molarity**, **Molecules and Light** (photon–molecule interaction), **Models of the Hydrogen Atom** (compare Billiard/Plum-pudding/Bohr/de Broglie/Schrödinger models against experiment), **Rutherford Scattering**, **Build a Nucleus**, **Energy Forms and Changes**, **Blackbody Spectrum**, **Balloons and Static Electricity**, **Coulomb's Law**, **Membrane Transport**, **Quantum Measurement / Quantum Coin Toss**, **Fourier: Making Waves**, **Diffusion**.

Legacy Java/Flash chemistry sims still served via CheerpJ (browser JVM): Reactions & Rates, Reversible Reactions, Salts & Solubility, Sugar and Salt Solutions, Alpha/Beta Decay, Nuclear Fission, Radioactive Dating Game, Neon Lights & Other Discharge Lamps, Photoelectric Effect, Lasers, Conductivity, Balloons & Buoyancy, Microwaves, Greenhouse Effect. (~60 chemistry-tagged sims total.)

### Interaction & pedagogy patterns

- **Multi-screen structure**: every sim opens to a home screen of 2–4 named screens ordered easy→hard (Intro → Explore → Game; Macro → Micro → My Solution). Screens isolate one idea each.
- **Game screens with levels/scoring**:
  - Build an Atom: 4 levels — build from schematic, find charge/mass, complete the chemical symbol; 5 challenges/level, 2 tries, star scoring, optional timer, best-time tracking.
  - Balancing Chemical Equations: levels of increasing equation complexity, points, timer.
  - Reactants Products & Leftovers: 3 levels, 5 random questions each, one guaranteed "no products" question per level, 2 attempts then reveal; variants hide molecules or hide numbers to force representation-switching.
- **Implicit scaffolding**: no instructions; affordances (buckets, pumps, sliders) invite exploration; constraints prevent unproductive states; "Basics" versions strip complexity for younger grades.
- **Multiple linked representations**: symbolic + particulate + macroscopic views update simultaneously (pH Scale's macro beaker vs. particle ratio; BCE's bars/balances; Beer's Law's meter + light beam).
- **Invisible-until-needed feedback**: meters, probes and rulers live in toolboxes; students choose to measure. Smiley-face/checkmark feedback only appears on submission in games.
- **Mystery/prediction hooks**: Density's "Mystery" blocks, pH Scale mystery liquids, Isotopes' "Nature's mix" comparison.
- **Offline/embedding**: every HTML5 sim is a single self-contained .html file — download, run offline, or embed via iframe copy-paste; iOS/Android/Windows apps; full-site offline installer. 100+ crowdsourced translations per flagship sim.

### Accessibility (per-sim feature flags)

- **Interactive Description** (screen-reader state + responsive descriptions), **Sound & Sonification**, **Alternative Input** (full keyboard), **Pan & Zoom**, **Voicing** (self-voicing web speech on some sims), **Interactive Highlights**, **Camera Input: Hands** (some math sims).
- The chemistry suite (Build an Atom, Balancing Equations, Acid-Base, Beer's Law, Concentration, pH Scale, Gas Properties, Density, Diffusion, Molecule Polarity, Models of H Atom) carries the description + sonification + alt-input + zoom quad.

### Teacher-facing

- **Activities Database**: thousands of teacher-contributed lesson plans, labs, homework, **clicker/concept questions**, searchable by sim/type/level/language; PhET-team "gold star" activities.
- **Teacher Tips PDFs**: per-sim guides with model simplifications, insights into student use, suggested prompts.
- **Virtual Workshop for Teachers**: self-paced course on inquiry-based sim use, whole-class strategies, concept-question design.
- **PhET-iO**: instrumented sim builds for platform partners — customize (hide/show controls, relabel, preset/lock state), real-time event streams of every interaction for dashboards, stealth assessment, adaptive tutorials, teacher reports.

## Concord Consortium (concord.org)

### Molecular Workbench (classic, Java)

- Free, open-source; hundreds of models + curriculum modules for grades 6–16.
- **Five physics engines spanning scales**: continuum mechanics, classical macro, mesoscale dynamics, atomic-scale molecular dynamics, subatomic quantum dynamics — real computational physics, not canned animation.
- **Full authoring system**: teachers build multi-page activities mixing live models, text, images, graphs, controls, and **embedded assessments** (MC, open response, snapshot annotations) with real-time student reports.
- Chemistry module examples: Chemical Bonding, Chemical Equilibrium, Chemical Potential, Distillation, Redox, Crystals, Fluorescence, Spectroscopy, Self-Assembly, Quantum Mechanics.

### Next-Gen Molecular Workbench / lab.concord.org (HTML5)

~1,494 interactives total, ~40+ chemistry:
- **SAM: Intermolecular Attractions** — Seeing Intermolecular Attractions; Dipole-Dipole vs London Dispersion; Oil and Water; Boiling Point; Polarity and Attractive Strength; Hydrogen Bonds.
- **SAM: Gas Laws** — What is Pressure?; Volume-Pressure; Temperature-Volume; Temperature-Pressure; Number-Volume; Pressure Equilibrium (two-chamber).
- **SAM: Phase Change** — Molecular View of Gas/Liquid/Solid; Intermolecular Attractions & States of Matter; Phase Change; Attractions & Temperature.
- **SAM: Diffusion** — Diffusion of a Drop; & Temperature; & Molecular Mass; Across Semipermeable/Permeable Membranes.
- **SAM: Chemical Reactions** — What is a Chemical Reaction?; Concentration/Temperature and Reaction Rate; Stoichiometry & Balancing; Catalysis; Polymers & Monomers.
- **SAM: Chemical Bonds** — s/p atomic orbitals; Electronegativity Affects Covalent Bond Type; Pentane vs 1-Pentanol polarity.
- **SAM: Molecular Geometry** — BF₃, CO₂, NH₃ geometries; small molecules vs macromolecules.
- **Interactions Project** (~60 interactives) — Atom and Ion Builder; Crookes Tube; Rutherford gold-foil; Making/Breaking Bonds vs temperature; bond-energy series; Dissolving; Micelles; Molecule Sorting; Protein Folding; plus **games**: Electrostatics Maze Game, Target Game series (steer a charged particle; variants isolate charge-magnitude vs distance).
- **VISUAL: Recycling** — Ceramic/Metal/Plastic/Tire Forces (structure→mechanical properties).
- **Structured activities** (interactive + text + video + embedded assessment): States of Matter, Boiling Point, Solubility, Diffusion, Gas Laws & Weather Balloons.

### Patterns worth stealing

- **One-question interactives**: each sim is deliberately tiny — a single manipulable model framed by one driving question ("How does temperature affect diffusion rate?"). Contrast with PhET's open sandboxes.
- **Real molecular dynamics under everything**: emergent boiling, dissolving, attractions — students probe with heat, force, and field tools; live energy/property graphs alongside the particle view.
- **Progression by controlled variation**: series of near-identical interactives varying one factor at a time (the six gas-law relationships as six micro-sims).
- **Game mechanics via physics**: maze/target games where the physics model itself is the game engine.
- **One-click Share/embed code** per interactive; permissive open-source licenses; partners embed in edX, CK-12.

### Teacher-facing (STEM Resource Finder, learn.concord.org)

- Free teacher accounts: create classes, **assign** activities/sequences, Google/Schoology SSO, saved student work.
- **Real-time reports**: class progress graphs, per-student detail, answers to embedded assessments; Teacher Edition views with pedagogical annotations.
- **Interactions**: full-year NGSS 9th-grade physical science/chemistry curriculum, deliverable fully online or paper+projector.
- Curated collections; the high-school chemistry landing page lists 42 curated activities.

## Sources

PhET metadata API (`phet.colorado.edu/services/metadata/1.3/simulations`), phet.colorado.edu/en/accessibility/prototypes, phet-io.colorado.edu/io-features, PhET Reactants/Products teacher guide PDF, PhET Activities Database (via SERC), PhET Virtual Workshop, mw.concord.org/modeler, mw.concord.org/nextgen, lab.concord.org/interactives.json, concord.org/lp/high-school-chemistry.html, learn.concord.org/interactions.
