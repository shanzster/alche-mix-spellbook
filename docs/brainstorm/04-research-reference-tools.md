# Research — Molecular Visualization & Chemistry Reference Sites

Feature research for the AlcheMix brainstorm. Compiled 2026-09-02.
Covers MolView, Ptable, PubChem, ChemDoodle Web / MolCalc / ChemEd X, RSC, ACS/AACT.

## MolView (molview.org)

### Key interactive features
- Split-screen: 2D structural-formula sketcher left, live 3D viewer right; "2D to 3D" converts the sketch to a 3D model instantly.
- Sketcher toolbar: atom/bond selection, element picker with full periodic table, fragment insertion (benzene etc.), charge +/-, "Clean" auto-tidy.
- 3D viewer: multiple engines (GLmol, Jmol, ChemDoodle); ball-and-stick, stick, vdW spheres, wireframe, lines; rotate/pan/zoom.
- Jmol tools: MMFF94 energy minimization, molecular electrostatic potential surfaces, distance/angle/torsion measurement.
- Database search with live autocomplete across PubChem, Crystallography Open Database, and RCSB simultaneously; similarity/substructure/superstructure searches using the sketched molecule.
- Spectra tab: mass spectrum, IR, ¹H-NMR prediction for the sketched structure (NIST WebBook, ~30k spectra), exportable PNG/JCAMP.
- Protein visualization (ribbon, cylinder/plate, B-factor tube, C-alpha trace; six coloring schemes); crystals: unit cells/supercells from COD (~300k structures).
- **URL deep-linking**: every molecule/view has a shareable URL (`molview.org/?cid=356`).

### Worth stealing
- The 2D-sketch → 3D-model one-click loop.
- Unified search fanning out to multiple databases with typed suggestions.
- Spectra generated from the student's *own* drawn structure.
- Shareable permalink per molecule/view.

## Ptable (ptable.com)

### Key interactive features
- Four layered tabs on one grid: **Properties**, **Electrons (Orbitals)**, **Isotopes**, **Compounds**.
- **Temperature slider**: drag through °C/°F/K and elements recolor live by physical state — watch mercury boil and hydrogen liquefy. The single most-cited feature.
- **Discovery-year "time machine" slider**: shows only elements known by a chosen date — the table assembles itself through history.
- Property heat-mapping: select any property and every element recolors proportionally — trends become visible. ~15 headline properties plus 17+ more, including the first 30 ionization energies.
- **Orbitals tab**: full electron configuration, quantum numbers, oxidation states, orbital diagram per Hund's rules; hovering an electron pair pops a drag-to-rotate 3D orbital view.
- **Isotopes tab**: click an element and fan through its isotopes "like a deck of cards" while 12 properties update live (half-life, decay mode, abundance, binding energy…).
- **Compounds tab**: click one or more elements → list of real compounds they form, linked to Wikipedia; formula search with filtering.
- Wide 32-column layout option, dark mode, print stylesheets, hover-updates-everything with click-to-lock, full keyboard navigation, instant search, docked Wikipedia reading pane.
- Deep links preserve exact visualization state; installable **offline PWA**; dozens of languages, plus Latin names revealing symbol origins (Au → aurum).

### Data depth
- Curated libraries (Wolfram|Alpha), layout reviewed by Eric Scerri, current IUPAC atomic weights; abundances in universe/sun/crust/ocean/human body; conductivity, hardness, radii variants.

### Worth stealing
- Temperature slider as an embodied states-of-matter demo.
- Discovery-year timeline scrubber (history as a slider).
- Layered-tab architecture: one familiar grid, many data lenses.
- Isotope card-fan and hover-3D orbitals — micro-interactions that reward exploration.
- Compound-formation clicking (pick two elements, see what they make) — inherently game-like.

## PubChem (pubchem.ncbi.nlm.nih.gov)

### PubChem Periodic Table (launched for IYPT 2019)
- Three view modes: **TABLE**, **LIST W/ PROPERTIES**, and **GAME**.
- Table view: color elements by any property via dropdown; selected property's value shows on each tile.
- **Game view**: element-placement memorization game with three difficulty levels.
- Freely **embeddable widget** for third-party educational sites (including the game).
- All element data downloadable in machine-readable formats — NCBI promotes classroom exercises like plotting ionization energy vs atomic number.
- Interactive property-trend plot pages for eight key properties.

### Element pages
- Per-element: atomic properties, isotopes, **history and uses**, with every value annotated with its **authoritative source** (NIST, IUPAC, Jefferson Lab, LANL…). Element pages gateway into bioactivity and health/safety data.
- Compound pages (69M+): 2D/3D structures, physical properties, spectra, GHS safety, pharmacology, literature.

### Worth stealing
- Built-in memorization game as a first-class view of the reference table.
- Property-driven recoloring + downloadable open dataset.
- Source attribution per data point (teaches provenance).
- Embed-anywhere widget strategy.

## ChemDoodle Web / MolCalc / ChemEd X

### ChemDoodle Web Components (web.chemdoodle.com)
- Pure-JS chemistry graphics library (~420KB, no plugins, touch support, ADA/WCAG options).
- 2D: SketcherCanvas, ViewerCanvas, RotatorCanvas, SlideshowCanvas, MolGrabberCanvas (fetch structures by name/database). 3D: EditorCanvas3D, ViewerCanvas3D, MovieCanvas3D. Spectra: interactive canvases with peak seeking.
- Education-specific: **PeriodicTableCanvas** and a **Stoichiometry Table** component.
- Teaching demos: **automatic structure grading** (compare student-drawn structure to answer), Lewis dot structures, mechanism matching, IUPAC naming (structure→name), NMR/MS simulation from drawn structures, stereochemistry analysis, stoichiometry calculation; reads SMILES/CDX; name-to-structure via cloud API.

### MolCalc (molcalc.org)
- JSmol editor (16 elements) feeding a real quantum-chemistry backend (GAMESS, PM3 / RHF/STO-3G).
- In seconds-to-minutes: heats of formation, thermodynamic properties, **vibrational frequencies with animated modes**, molecular orbitals and energies; "Get name" for the drawn structure.
- Built for teaching, not research: assignments like "compute how a substituent shifts a vibration, then rationalize with MOs"; deliberate limits keep it fast. Open source.

### ChemEd X (chemedx.org)
- Peer-reviewed hub of activities, demos, blogs, assessments for HS/college teachers.
- **Chemical Thinking Interactives**: simulations emphasizing the particulate nature of matter (photoelectron spectroscopy, activation energy).
- Interactive-video experiments; community layer with comments and shared classroom implementations.

### Worth stealing
- Structure grading (auto-checking a student's drawn molecule) and name↔structure round-trips.
- "Cheap real computation": students run genuine calculations on their own molecules with animated vibrations/orbitals.
- Stoichiometry-table and periodic-table as reusable embeddable components.

## RSC — Royal Society of Chemistry (periodic-table.rsc.org, edu.rsc.org)

### Interactive periodic table
- Toggleable views including **Murray Robertson's "Visual Elements" artwork** (commissioned art per element) and an **alchemy-themed lens**; data-trend visualizations; a History section on the table's development.
- Per-element page anatomy (verified on gold):
  - Fact box: group, period, melting/boiling, density, atomic number, relative mass, electron configuration, key isotopes, specific heat, Young's modulus…
  - "Uses and properties" with vivid hooks ("1 gram can be beaten into a square metre sheet just 230 atoms thick").
  - Rich narrative **History** (gold: prehistoric → Egypt → 640 BC coinage, Tutankhamun's mask).
  - **Supply risk** score with sub-indicators (recycling rate, crustal abundance, political stability of producers) — unique among periodic tables.
  - Atomic data, oxidation states, isotopes tables.
  - **Podcast tab**: full "Chemistry in its Element" audio episode + transcript per element; **Video tab** per element.
  - **Alchemical symbol with an explanation of its imagery**; glossary hover definitions; prev/next navigation.

### RSC Education
- **"Starters for Ten"**: short lesson-opener quiz packs across all major topics.
- Interactive periodic table game, classroom demos, screen experiments (virtual labs), printable tables, assessment-for-learning materials, full secondary resource library by topic and age band (11–14, 14–16, 16–18).

### Worth stealing
- Element storytelling: podcast + transcript + history + commissioned artwork (elements as characters, not data rows).
- Alchemy symbols and etymology as a hook — directly relevant to the AlcheMix brand.
- Supply-risk/real-world-scarcity angle (chemistry meets economics/sustainability).
- Lesson-starter quiz format (10 quick questions as a ritual).

## ACS / AACT (teachchemistry.org)

### Simulations (32, HTML5)
Scientific Measurements; Behavior of Gases; **Acid-Base Titration (randomly generated pH curves per run)**; Safety Data Sheets; "What Type of Element Are You?" personality quiz; Radioactive Decay (with 10-question quiz); Colligative Properties; Graphing; **Galvanic/Voltaic Cells 1 & 2** (build cells from chosen metals/solutions/concentrations); **Metals in Aqueous Solutions** (test 8 metals to build an activity series); Specific Heat (engineering + cost-analysis framing); Intermolecular Forces; Preparing Solutions; Predicting Products; States of Matter & Phase Changes; Reaction Rates; Reactions & Stoichiometry; Q vs K; Measuring Volume (graduated-cylinder reading with uncertainty); **Isotopes & Average Atomic Mass (build mystery elements from isotope abundances)**; Half-Life; Energy Changes; Ionic & Covalent Bonding (drag atoms together → bond type, formula, name); **Periodic Trends I & II** (pick elements, compare data, graph); Gas Laws; Density; Heating Curve of Water; Exciting Electrons; Comparing Attractive Forces; Balancing Equations.

Recurring design pattern: macroscopic view paired with **particle-level animation**, plus embedded quizzes and randomized problem generation.

### Animations (19, silent by design)
Physical properties, separating mixtures, pH scale, classifying reactions, EM spectrum, solubility, atomic/ionic radii, orbitals, net ionic equations, limiting reactant, equilibrium, bonding, gases, galvanic cell, etc. Silent so the teacher narrates.

### Classroom orientation
- 1,000+ K-12 resources: lesson plans, labs, unit plans, demos; **Student Pass** system — teachers generate passes giving students 7 days of access to locked multimedia; grade-band tagging.

### Worth stealing
- Particle-level + macroscopic dual view in every sim.
- Randomized generation (titration curves, mystery isotopes) so each attempt is fresh.
- Build-the-rule-from-evidence structures (activity series, mystery element).
- Engagement hook framings: engineering cost analysis; element personality quiz.
- Embedded self-check quizzes inside sims; silent teacher-narratable animations.

## Sources

molview.org (+ ConfChem paper), ptable.com (+ /about), pubchem.ncbi.nlm.nih.gov/periodic-table (+ docs, Chemistry Teacher International 10.1515/cti-2020-0006), web.chemdoodle.com, molcalc.org (+ JCE 10.1021/ed400164n), chemedx.org (+ Chemical Thinking Interactives), periodic-table.rsc.org (gold page), edu.rsc.org (periodic table resources, interactive game), teachchemistry.org (simulations, animations, multimedia).
