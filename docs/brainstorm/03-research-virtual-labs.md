# Research — Virtual Chemistry Lab Platforms

Feature research for the AlcheMix brainstorm. Compiled 2026-09-02.
Covers ChemCollective, Labster, Beyond Labz / Virtual ChemLab, LabXchange, PraxiLabs, Vlaby.

## ChemCollective (Carnegie Mellon, chemcollective.org)

Free, NSF/Dept. of Ed-funded, CC BY-NC-ND. Core asset: a browser-based "wet chemistry"
virtual lab plus a library of activity types built on it.

### Catalog
Organized by ten topic areas; virtual lab activities include:
- **Stoichiometry — Mole, Molarity, Density** (7 activities): dilutions, identify a liquid by density, stock solutions from solids.
- **Reaction Stoichiometry & Limiting Reagents** (7): gravimetric analysis, DNA-concentration problems.
- **Thermochemistry** (9): heats of reaction, heat capacity, Hess's Law; camping "Meals-Ready-to-Eat" heater design.
- **Equilibrium**: LeChatelier cobalt-chloride color-shift lab; DNA–dye binding equilibrium.
- **Acid-Base**: strong/weak acids and bases, protein pKa determination, 3 buffer-design activities, NaOH standardization titration.
- **Solubility**: Ksp determination, temperature effects.
- **Redox**: order reducing agents by standard reduction potential.
- **Analytical**: acid/base titrations, gravimetric analysis.

Scenario-based activities: Mixed Reception (murder mystery), Powderade (sports-drink dilution), The Factory (city water compliance), Arsenic in Drinking Water (Bangladesh wells), Bioremediation of Oil Spills, Meals-Ready-to-Eat, Mission Critical Chemistry (Mars fuel design), Hot/Cold Pack Design, Solar Power specific-heat design, Ozone Kinetics, Equilibrium Color-Change, DNA-Binding Dyes, pH and Swimming Pools (lifeguard), Acid Mine Drainage, Food Dye Analysis.

Also: Stoichiometry Tutorials, concept tests, molecular-level visualizations, and two full online courses through CMU's Open Learning Initiative.

### Lab-bench mechanics
- 2D workbench + "Stockroom Explorer" of cabinets with **hundreds of aqueous reagents**; drag glassware/tools onto the bench.
- Glassware: beakers, Erlenmeyer/volumetric flasks, graduated cylinders; tools: Bunsen burner (adjustable flame), pipettes, burets, balances, pH meter, thermometer, conductivity.
- **Two transfer modes**: "Precise Transfer" (type exact mL) and "Realistic Transfer" (hold-to-pour with live counters — you can overshoot a titration).
- **Solution Info panel**: volume, temperature, pH, full species list with concentrations, elemental concentration viewer. Instructors can **disable panel features per assignment** — e.g., hide the species list to create unknown-identification problems.
- Thermal Properties per vessel: set temperature, "Insulated from Surroundings" toggle (calorimetry).
- Underlying chemistry engine computes equilibria so arbitrary mixtures behave correctly.
- No spill/explosion theatrics — realism is chemical, not visual.

### Pedagogy
- **Autograded virtual labs**: randomly generated unknowns per student; web forms grade automatically with **targeted feedback keyed to common student errors**; scaffolded step-by-step variants for weaker students. Topics: density, molarity, limiting reagents, empirical formulas, enthalpy, common-ion effect, titrations, buffer design, gravimetric/redox analysis.
- **Scenario framing**: Mixed Reception has students solve a poisoning via molar mass/stoichiometry, with structured dialogues (problem analysis, categorizing info, choosing qualitative vs quantitative analysis).
- Tutorials interleave instruction with practice; OLI courses add videos, practice tutors, progress tracking.

### Teacher features
- Teacher's guide + per-activity notes; free custom classroom landing pages on request.
- **Authoring**: Virtual Lab Authoring Tool — create problems from scratch, edit XML, or clone an existing activity; XML format with `<DIRECTORY>` blocks holding `<PROBLEM>` entries. "Over half of our activities were developed in response to user community requests."
- Progress tracking only via the OLI course wrapper; no native gradebook/LTI for the standalone vlab.

### Worth stealing
- Instructor-toggleable info panels (hide species list → any lab becomes an unknown).
- Precise vs realistic transfer as an explicit difficulty/authenticity dial.
- Randomized unknowns + error-specific feedback.
- Murder-mystery/scenario shells around the same engine.
- XML problem format: a "problem" = reagent set + equipment + hidden panels + goal.

## Labster (labster.com)

Commercial, 300+ gamified 3D simulations.

### Chemistry catalog (representative)
Acidity/Alkalinity in Everyday Substances; Acids and Bases Principles ("avoid falling in a lake of acid"); Advanced Acids and Bases; Titration: Neutralize an Acid Lake (full burette/stand/clamp setup, indicator choice, concordant repeat runs); Aromatic Nomenclature (chemistry-Olympics framing); Chemical Nomenclature (alchemist challenge naming 16 inorganic compounds); Azo Dye Test; Carbon NMR mystery compound; Balancing Equations; Gravimetric Analysis; Stoichiometric Calculations; Bomb Calorimeter (renewable-energy mission); Chemistry Safety (biodiesel in a fume hood); Waste Disposal (wrong bin → harmful reactions/explosions); Hazard Symbols; Electrolysis (hydrogen fuel for a Mars rover); Electrophilic Addition (Titan colony); Aromatic Substitution (perfume); Elimination Reaction; Elements and Compounds (restore spaceship oxygen); Distillation; Matter and Phase Changes.

High-school package of 13: Safety, Solution Prep, Periodic Table, Atomic Structure, Organic Intro, Thermodynamics, Stoichiometry, Phase Changes, Ionic/Covalent Bonds, Titration, Equilibrium, Advanced Acids & Bases, Ideal Gas Law. AP Chemistry course mapping.

### Lab-bench mechanics
- First-person avatar in a 3D lab; guided task sequences rather than free mixing (assemble apparatus, swirl flask near endpoint, pick indicators, vary volumes).
- Equipment: burettes, pipettes, flasks, fume hood, bomb calorimeter, electrolytic cells, NMR/spectrometers, distillation rigs, waste bins, PPE.
- **Safety consequences are a feature**: "freedom to fail" — wrong solvent/waste-bin choices trigger dangerous reactions/explosions safely.
- No open-ended chemistry engine; outcomes authored per storyline.

### Pedagogy
- **Storyline/mission structure**: each sim is a mission with real-world stakes (acid lake, Mars rover, biodiesel plant), chunked into progressively harder tasks.
- **Dr. One**: robot guide character; dialogue with options.
- **LabPad**: in-sim tablet with tasks, **quiz-question checkpoints**, and **Theory pages** (all quiz answers findable in theory). Wrong answer → immediate feedback → nudged to Theory → retake at slightly reduced points.
- Points per quiz question, completion recognition, unlimited replays; 3D molecular-scale animations. Claimed outcome: quiz scores 69% → 90%.

### Teacher features
- **Dashboard** (LMS or Labster Course Manager): per-student completion %, score, attempts, per-question answer history (tries per question), time in sim; full quiz transcript drill-down. Functions as a gradebook.
- **LTI 1.3** with Canvas, Moodle, Blackboard, Brightspace; grade passback (first/last/best-attempt policy); bulk multi-add of sims to a course.
- Course-mapping service; AP-aligned simulation courses.

### Worth stealing
- Quiz-checkpoint + Theory loop with point decay.
- Mission framing with stakes + a guide character.
- Safety sims where the *point* is triggering the disaster.
- Attempt-level analytics synced to gradebooks.

## Beyond Labz / Virtual ChemLab (beyondlabz.com)

Open-ended "virtual lab bench" philosophy: 650+ activities — General Chemistry 254, Organic 120, plus physics/biology; 234 high-school and 499 university-level, textbook-aligned.

### Lab benches
- **Inorganic Qualitative Analysis**: 26 cations × 11 reagents in any sequence → >10^16 outcomes; rendered from 2,500+ real photos and 220+ flame-test videos.
- **Titration**: acid-base and redox; qualitative runs with live graphs or quantitative knowns/unknowns.
- **Calorimetry**: coffee-cup, dewar, bomb; heats of combustion/solution/reaction, ice fusion, temperature plots.
- **Gases**: ideal/real/van der Waals; N₂, CO₂, CH₄, H₂O, NH₃, He, custom mixtures.
- **Quantum**: optics table with sources (lasers, electron gun, alpha source), samples (gas, foil, two-slit), modifiers (heat, E/B fields), detectors — recreate Rutherford, photoelectric, two-slit.
- **Organic synthesis**: pick materials/solvents/reagents, build apparatus, run, work up, purify; >1,000,000 outcomes.
- **Organic qualitative analysis**: 300+ unknowns; ¹H/¹³C NMR, FTIR, MS, TLC (700+ spectra per technique) + 15 functional-group wet tests with video results.

### Mechanics (the standout: realistic error)
- Interface: **stockroom** (create knowns, generate practice unknowns, retrieve instructor-assigned unknowns), workbench, chalkboard, **electronic lab book** (records procedure/observations, exports data to spreadsheets/PDF).
- Glassware/instruments: burets, pipets, cylinders, beakers, pH/conductivity meters, voltmeter, analytical balance.
- **Per-student persistent glassware error functions** — students must *calibrate* glassware by weighing delivered water; buret error is non-constant (multi-point calibration). Balance readings need buoyancy corrections from room temp/pressure read off a wall LED. Meters have accuracy + noise. Unstirred solutions show delayed pH/conductivity response; stirring cuts lag.
- Chemistry engine: pH from mass/charge balance + equilibria with Debye-Hückel activity coefficients; Nernst potentials; literature conductivities.
- Dangerous combos trigger a simulated explosion with shattering-glass audio.

### Pedagogy & teacher
- Deliberately **open-ended** ("experiment, practice, fail, discover"); practice compounds before unknowns; instruction lives in 650+ downloadable worksheets + companion workbook.
- Instructor-assigned unknowns distributed through the stockroom; grading via exported lab books/worksheets (dashboards thin vs Labster).

### Worth stealing
- Calibration & error as learnable skill.
- Photo/video-backed outcome library (real flame tests, real precipitates).
- Stockroom that mints practice unknowns on demand.
- Combinatorial reagent space rather than scripted paths.
- Lab book with data export.

## LabXchange (Harvard / Amgen Foundation)

Free, ad-free OER platform; simulations are one asset type among videos, texts, assessments, case studies.

- Flagship protocol sims are mostly bio-leaning (spectrophotometer, gel electrophoresis, egg-lab osmosis…); chemistry topics covered via **pathways** that mix embedded PhET sims, videos, and case studies.
- Protocol sims: **every learner action is tracked**; outcomes depend on decisions; learners can deviate to probe variables. "Simply clicking through will not produce results" — skipped steps yield failed results.
- **Three selectable guidance levels** per sim: Level 1 detailed prompts → Level 3 minimal (built-in differentiation).
- **Pathways**: sequenced playlists mixing sims, videos, texts, assessments; any public asset cloneable/remixable; teachers upload their own material and interleave.
- **Classes**: private spaces with rosters, assigned pathways, discussion boards; completion/progress visibility (framed as engagement, not mastery). Everything free; no deep LTI gradebook.

### Worth stealing
- Learner-selected scaffolding level (1/2/3) on the same sim.
- Remix-a-pathway model: sims as embeddable atoms in teacher-authored sequences.
- "No result unless you actually did it" anti-click-through design.

## PraxiLabs (praxilabs.com) — brief

- 200+ immersive 3D experiments across 20+ branches; chemistry: analytical (titration types incl. Volhard's, chromatography, spectroscopy, electrochemistry), inorganic radical analysis, organic functional-group tests, lab-safety training.
- **"Oxi" virtual lab-partner character**; hints, manuals, walkthrough videos, hazard cautions; unlimited repeats; skip-ahead allowed but recorded; MCQ quizzes; instant feedback.
- Institution side: analytics on student actions, LMS integration, custom experiment development in any language; strong MENA localization.

## Vlaby (vlaby.com) — brief

- 400+ interactive experiments (chemistry, physics, general science), online **and offline**, any device; simulates a traditional school lab with full glassware/chemicals/devices; curriculum-mapped per grade/country. Positioning: safety + access for schools lacking physical labs.

## Cross-platform takeaways

- **Two realism dials**: ChemCollective's precise-vs-realistic transfer and Beyond Labz's error/calibration model — "realism" can be opt-in per assignment.
- **Unknowns as content multiplier**: randomized unknowns turn one sim into infinite assessments.
- **Quiz-checkpoint + theory loop with point decay** (Labster) is the cleanest embedded-assessment pattern.
- **Guide characters** recur everywhere (Dr. One, Oxi) — low-cost narrative glue.
- **Instructor-visible action logs** are the analytics baseline.
- **Authoring**: ChemCollective's XML problem format and LabXchange's remix pathways are the two proven teacher-authoring models.

## Sources

chemcollective.org (vlabs, autograded, scenario_based, teachers, vlabUserGuide, modifyingactivities), labster.com (simulations, titration, game-based, quiz-answers, help center dashboard/LTI docs, AP course), beyondlabz.com (+ freshdesk docs: Gen Chem labs, Organic labs, Titrations simulation; Virtual ChemLab J.Chem.Educ. 10.1021/ed081p1672), labxchange.org (+ help articles), praxilabs.com, vlaby.com.
