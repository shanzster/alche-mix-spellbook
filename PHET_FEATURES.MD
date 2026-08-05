# PhET Chemistry Simulations — Feature Reference & AlcheMix Mapping

*A catalogue of the chemistry simulations on [PhET Interactive Simulations](https://phet.colorado.edu/en/simulations/filter?subjects=chemistry)
(University of Colorado Boulder), with what each one teaches — and how AlcheMix
currently compares. Use this as the benchmark for "make it like PhET."*

- **Compiled:** 4 August 2026
- **Source:** PhET chemistry category + [Chemistry LibreTexts PhET index](https://chem.libretexts.org/Ancillary_Materials/Interactive_Applications/PhET_Simulations)
- **Legend:** ✅ AlcheMix has a real equivalent · 🟡 partial / related · ❌ gap

> About PhET: a free, research-based library of interactive math/science sims
> founded in 2002 by Nobel laureate Carl Wieman. The modern sims are **HTML5**
> (run on any browser, tablet or Chromebook), emphasise **discovery through play**,
> use everyday analogies, and give **immediate visual feedback** — the same design
> goals AlcheMix is built around.

---

## 1. Atomic structure

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **Build an Atom** | Drag protons, neutrons and electrons together and watch the element, charge and mass update live. | atomic number, isotopes, ions, mass number | ✅ **Atomic Builder** |
| **Isotopes and Atomic Mass** | Mix isotopes of an element and see how natural abundance produces the average atomic mass. | isotopes, abundance, weighted average | 🟡 **Radioactive Decay** (covers isotopes/decay, not abundance→mass) |
| **Rutherford Scattering** | Fire alpha particles at atoms to recreate the experiment that disproved the "plum-pudding" model. | nucleus, historical models | ❌ gap |
| **Models of the Hydrogen Atom** | Compare historical atomic models against experimental spectra. | quantum models, spectra | ❌ gap (Bohr model exists visually) |

## 2. Bonding & molecular shape

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **Build a Molecule** | Snap atoms together to assemble real molecules (H₂O, CO₂, NH₃…) and collect them. | molecular formula, bonding, compounds | ✅ **Grimoire → Mix & Match** (now forges real named compounds + polyatomic ions) |
| **Molecule Shapes** | Add single/double/triple bonds and lone pairs to a central atom; watch the 3D shape and bond angles change. | VSEPR, lone pairs, bond angles | ✅ **Molecule Shapes** (VSEPR viewer) |
| **Molecule Shapes: Basics** | Simplified VSEPR with bonds only (no lone-pair subtleties). | VSEPR intro | ✅ covered by Molecule Shapes |
| **Molecule Polarity** | Adjust electronegativity and see bond dipoles, molecular dipole and how the field responds. | polarity, dipole, electronegativity | ❌ gap |
| **Atomic Interactions** | Explore attraction/repulsion between atom pairs as distance changes. | intermolecular forces, potential energy | ❌ gap |

## 3. Reactions & stoichiometry

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **Balancing Chemical Equations** | Balance equations with visual scales/bar charts; a game mode tests you. | conservation of mass, coefficients | ✅ **Equation Balancer** (+ **Reaction Theatre** animation) |
| **Reactants, Products and Leftovers** | "How many sandwiches from these ingredients?" → limiting reagent and leftovers in real reactions. | limiting reactant, stoichiometry, leftovers | 🟡 **Reaction Theatre** shows atoms conserved, but no limiting-reagent game |
| **Reactions & Rates** | Collide molecules; change temperature/concentration and watch reaction rate and energy barriers. | collision theory, activation energy, rate | ❌ gap |

## 4. Solutions & concentration

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **Concentration** | Add solute/water/evaporate and watch colour intensity and the molarity meter respond. | concentration, saturation, dilution | ❌ gap |
| **Molarity** | Relate moles, litres and molarity directly with sliders. | molarity, mol/L | ❌ gap |
| **Beer's Law Lab** | Shine light through solutions of varying concentration and measure absorbance. | Beer's law, absorbance, path length | ❌ gap |
| **Salts & Solubility** *(legacy)* | Dissolve salts to saturation; explore the solubility product. | dissolving, Ksp | ❌ gap |
| **Sugar and Salt Solutions** *(legacy)* | Compare how ionic vs molecular solids dissolve and conduct. | electrolytes, dissociation | ❌ gap |

## 5. Acids, bases & pH

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **pH Scale** | Test everyday liquids; see H₃O⁺ vs OH⁻ counts, switch log/linear, dilute and watch pH move. | pH, hydronium/hydroxide, dilution | 🟡 **Titration Lab** (pH via titration; not the dropper/everyday-liquids tool) |
| **pH Scale: Basics** | The same, stripped down for first exposure. | pH intro | 🟡 partial |
| **Acid-Base Solutions** | Compare strong vs weak acids/bases with virtual lab tools (conductivity, pH). | strong/weak, dissociation, Ka | 🟡 partial |

## 6. States of matter & gases

| PhET simulation | What it does | Key concepts | AlcheMix |
|---|---|---|---|
| **Gas Properties** | Pump gas into a box; change volume/heat and watch pressure, temperature and particle motion. | PV=nRT, kinetic theory | ✅ **Gas Laws Simulator** |
| **Gases Intro / Diffusion** | Simplified gas behaviour and particle diffusion/mixing. | diffusion, partial pressure | 🟡 partial (Gas Laws) |
| **States of Matter (+ Basics)** | Heat/cool substances between solid, liquid and gas and watch the particles. | phase changes, particle model | ❌ gap |

## 7. Light & spectra *(chemistry-adjacent)*

| PhET simulation | What it does | AlcheMix |
|---|---|---|
| **Molecules and Light** | How different molecules absorb infrared/visible light (greenhouse link). | ❌ gap |
| **Blackbody Spectrum** | Temperature vs emitted light spectrum. | ❌ gap (relates to a possible flame-test/emission feature) |

---

## Coverage summary

Counting the **core chemistry sims** (excluding legacy Java and light/spectra edge cases):

| Status | Count | Sims |
|---|---|---|
| ✅ Have a real equivalent | **5** | Build an Atom, Build a Molecule, Molecule Shapes, Balancing Equations, Gas Properties |
| 🟡 Partial / related | **4** | Isotopes (Decay), Reactants-Products-Leftovers (Reaction Theatre), pH Scale + Acid-Base (Titration Lab) |
| ❌ Gap | **~8** | Molecule Polarity, Atomic Interactions, Reactions & Rates, Concentration, Molarity, Beer's Law, States of Matter, Rutherford Scattering |

**Headline for a reviewer:** AlcheMix already mirrors the **five most-taught PhET chemistry sims** and partially covers four more — *and* wraps them in a game layer, AR card scanning, an AI evidence journal and a teacher dashboard, none of which PhET offers. PhET is a sim **library**; AlcheMix is a sim library **inside a course platform**.

---

## Recommended next builds (biggest PhET gaps, ranked)

1. **Concentration / Molarity** 🟢 — the quickest strong PhET match: a beaker with solute + water sliders, live colour intensity, and a mol/L meter. High demo value, low effort.
2. **Reactants, Products & Leftovers** 🟡 — the limiting-reagent "sandwich" game; pairs naturally with the existing Reaction Theatre and Equation Balancer.
3. **Molecule Polarity** 🟡 — electronegativity slider → dipole arrows; a natural companion to the Molecule Shapes viewer.
4. **States of Matter** 🟡 — heat/cool a substance and watch particles change phase; complements Gas Laws.
5. **Reactions & Rates** 🔴 — collision theory + activation energy; the most involved but a strong upper-secondary topic.

> Design note: PhET's magic is **immediate, playful, visual feedback with everyday
> analogies** (sandwiches for stoichiometry, coffee/spit for pH). AlcheMix's edge is
> doing that *and* recording it to a student's progress + a teacher's dashboard.
> Keep new sims in that mould — a toy first, an assessment second.

---

## Sources
- [PhET Interactive Simulations — Chemistry](https://phet.colorado.edu/en/simulations/filter?subjects=chemistry)
- [Chemistry LibreTexts — PhET Simulations index](https://chem.libretexts.org/Ancillary_Materials/Interactive_Applications/PhET_Simulations)
- [Molecule Shapes (PhET)](https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_all.html)
- [Build a Molecule (PhET)](https://phet.colorado.edu/sims/html/build-a-molecule/latest/build-a-molecule_all.html)
- [Reactants, Products and Leftovers (PhET)](https://phet.colorado.edu/sims/html/reactants-products-and-leftovers/latest/reactants-products-and-leftovers_all.html)
- [RSC Education — PhET interactive chemical simulations](https://edu.rsc.org/resources/collections/phet-interactive-simulations)
