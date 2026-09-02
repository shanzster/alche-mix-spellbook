# AlcheMix — Current System Inventory

What is actually implemented in `alche-mix-spellbook` as of 2026-09-02. This is the baseline
the gap analysis in `FEATURE_BRAINSTORM.md` was checked against.

Stack: TanStack Start / React (file-based routes in `src/routes`), Firebase Auth + Firestore,
Three.js/MindAR for AR, TensorFlow.js (COCO-SSD) + Gemini for AI. Theme: alchemy-flavoured
chemistry education PWA. Two "sides" enforced by `lib/platform.ts`: **website** (desktop =
deep learning) vs **mobile/PWA** (camera/AR capture + glimpses).

## 1. Student Module Routes

### Atomic Builder — `src/routes/atomic-builder.tsx`
- Core interaction: three steppers (protons 1–20, neutrons 0–30, electrons 0–30) drive a live 3D Bohr model (`BohrModel3D`); "Balance charge" and "Reset" shortcuts.
- Content range: **elements 1–20 only** (H→Ca, hardcoded with common neutron counts). Computes element identity, mass number, ion charge/type, isotope status, shell filling (2,8,8,18… rule), and a heuristic stability label (stable / slightly unstable / likely radioactive based on neutron delta).
- Game element: 5 fixed guided "missions" (make Lithium, neutral Oxygen, Na⁺, Cl⁻, C-14) with live sub-goal checklists; cycles through them, tracks `done` set in local state.
- Scoring: no score; completing a mission calls `logPractice` (engagement counter only).
- Depth limits: shell model is the simplified Bohr rule (not real subshells/orbitals); stability is a crude neutron-difference heuristic, not real nuclide data.

### Periodic Table — `src/routes/periodic-table.tsx` (data: `lib/periodic-table-data.ts`)
- Core interaction: full **118-element** classic 18-column grid (lanthanides/actinides pulled out), colour-coded by 10 categories, click a cell to open a detail panel with a 3D view / 2D animated Bohr SVG toggle and a text search that dims non-matches.
- Content range: all 118 elements have number/symbol/name/mass/category/shells + grid position. **Rich study content (uses, real-world examples, "did you know") exists for only ~20 curated elements** (`RICH` map: H, He, Li, C, N, O, F, Ne, Na, Mg, Al, Si, S, Cl, K, Ca, Fe, Cu, Au); others show a "full study page on its way" placeholder with basic stats.
- Game/scoring: none; visiting logs practice.
- Depth limits: uneven depth (curated few vs. bare majority); shells string powers Bohr views for all.

### Molecule Shapes — `src/routes/molecules.tsx` (data: `lib/molecules.ts`)
- Core interaction: pick a molecule, view real 3D VSEPR geometry (`Molecule3D`), toggle lone-pair lobes, drag to spin; facts panel shows geometry/bond angle/hybridisation/lone-pair count/atom legend/note.
- Content range: **6 molecules only** — CO₂ (linear), H₂O (bent), NH₃ (trigonal pyramidal), CH₄ (tetrahedral), BF₃ (trigonal planar), HCl (diatomic). Real textbook angles/hybridisation values.
- Game/scoring: none; logs practice.
- Depth limits: fixed six-molecule set; no build-your-own; CPK colours tuned for a dark stage.

### Reaction Theatre — `src/routes/reactions.tsx`
- Core interaction: canvas animation of bonds breaking → atoms travelling → products forming, with play/pause, replay, 0.5/1/2× speed, and step-by-step narration; reactions grouped by type.
- Content range: **8 fixed reactions** across 4 types — Synthesis (water, Haber ammonia, salt), Combustion (carbon, methane), Decomposition (peroxide, electrolysis), Neutralisation (HCl+NaOH). Each has plain-English summary + real-world "why".
- Game element: live conservation-of-mass ledger (per-element left→right counts with ✓/✗); a `ConceptCard` naming the reaction type.
- Scoring: none; logs practice.
- Depth limits: pre-authored reactions only; animation is illustrative (atom-matching by element), not a physics/kinetics sim.

### Equation Balancer — `src/routes/equation-balancer.tsx`
- Core interaction: adjust integer coefficients (1–12) per species via steppers; a per-element tally turns green when balanced; auto-detects a balanced state.
- Content range: **8 equations** (water, ammonia, methane, salt, rust, propane, peroxide, alumina). Simple formulas only (regex parser, **no parentheses/polyatomic groups**).
- Game element: two modes — **Practice** (browse/prev/next) and **Time Attack** (5 shuffled equations against a live seconds timer, trophy result screen).
- Scoring: time-attack records completion time; solving logs practice. No persistent leaderboard.
- Depth limits: only 8 curated equations; coefficient cap 12; subscript parsing can't handle brackets.

### Gas Laws Simulator — `src/routes/gas-laws.tsx`
- Core interaction: PV=nRT with sliders for T/V/P/n and a "Solve for P/V/T" toggle (solved variable becomes computed/disabled); animated canvas particle box where speed=temperature, box size=volume, particle count=moles.
- Content range: ideal gas law only; teaches Boyle/Charles/Gay-Lussac as special cases via `ConceptCard`. Ranges: T 100–1000 K, V 1–50 L, P 0.1–10 atm, n 0.1–5 mol.
- Game/scoring: none; logs practice once.
- Depth limits: ideal gas only (no real-gas/van der Waals); particle animation is decorative, not a true kinetic simulation.

### Titration — `src/routes/titration.tsx`
- Core interaction: slider (+ 0.1/1/5 mL buttons, "jump to equivalence", reset) adds base to acid; live beaker with phenolphthalein pink fade, pH readout, universal-indicator colour bar, and an SVG titration curve with equivalence marker.
- Content range: **strong acid / strong base only, fixed cell** — 25 mL of 0.1 M HCl titrated with 0.1 M NaOH; equivalence hardcoded at 25 mL. pH computed by simple mole-difference formula.
- Game/scoring: none; logs practice; "≈ Equivalence point" proximity cue only.
- Depth limits: single fixed scenario; no weak-acid buffering region, no concentration/volume configurability, no indicator choice.

### Radioactive Decay — `src/routes/decay.tsx`
- Core interaction: pick an isotope; 100-dot population grid recolours parent→daughter as a half-life slider (0–6 t½) moves or auto-plays; SVG exponential decay curve + decay-equation chips (Z/A) + facts.
- Content range: **6 isotopes** — C-14, U-238, I-131, Co-60, Rn-222, H-3. Two decay modes (α, β⁻) with real half-lives, daughters, and real-world uses.
- Game/scoring: none; logs practice.
- Depth limits: fixed 6 isotopes; α and β⁻ only (no γ, no decay chains beyond first daughter); population is a visual random-scatter model.

### 3D Visual Quiz — `src/routes/quiz.tsx`
- Core interaction: reads a rotating 3D Bohr atom, then multiple-choice with reveal + per-question explanation; intro → play → results (trophy, X/N score, retry).
- Content range: **11 elements** (H–Ca subset). 3 question kinds: identify element, count shells, count valence electrons. 6 randomly-built questions per run with generated distractors.
- Game element: scored X/6, "Flawless!" on perfect; each question explained.
- Scoring: completion logs practice once; score is session-only (not persisted).
- Depth limits: small element pool; three question templates only.

### Lab Safety — `src/routes/lab-safety.tsx`
- Core interaction: reference cards for 9 GHS hazard pictograms (meaning + examples) and 8 common apparatus (use); "Test yourself" toggle hides the explanations as a self-quiz.
- Content range: 9 GHS hazards, 8 apparatus. Static reference content.
- Game/scoring: self-test is toggle-only (no grading); logs practice.
- Depth limits: purely informational; no interactive assessment or scoring.

### AR Scanner — `src/routes/scanner.tsx` (engine: `components/CrystalAR.tsx`)
- Core interaction: **platform-gated** — on mobile/PWA (`arCapable`) opens MindAR image-tracking camera that summons a 3D GLTF model out of a printed trigger card (particle burst + chime, tap to inspect floating info panel); on desktop shows a QR handoff to phone.
- Content range: **2 AR trigger targets only** — "Alchemix" (mythic, symbol Ax) and Helium (compiled into `targets.mind`, models in `public/3d-models/`). Post-scan shows a one-fact "glimpse" then hands off to the website Grimoire for full study.
- Game element: **Alche-mix ceremony** — when ≥2 cards visible, an "Alche-mix them?" button triggers a swirl animation revealing one **forged card** (`3rd_card`, purely presentational/fixed for now) registered to the Grimoire.
- Scoring: scanning calls `scanCard` (adds symbol to `grimoire`, timestamps first obtain) + logs practice; mixing calls `registerForged`.
- Depth limits: only 2 real AR targets; mix reveal is hardcoded to one sample card; requires HTTPS/localhost + printed/on-screen trigger with good lighting.

### AI Scavenger Hunt — `src/routes/scavenger.tsx` (logic: `lib/scavenger.ts`, `lib/element-vision.ts`, `lib/ai.ts`)
- Core interaction: pick element → camera/upload photo of a household object containing it → submit for verdict. Two live "eyes" over the video: **on-device COCO-SSD** (`element-vision.ts`) draws green/red reticles by mapping ~80 object classes to plausible elements; **Gemini `aiScanFrame`** reasons about materials/contents every ~2.8 s and locks on.
- Content range: **16 findable elements** (Fe, Al, Cu, C, Na, Cl, Ca, O, H, K, N, Mg, S, Zn, Sn, Au) each with hints + household examples.
- Game element: verdict screen (Verified / Not quite / Sent to teacher) with confidence %; "Your Finds" history grid of past evidence.
- Scoring: submissions saved to `users/{uid}/evidence`; bumps practice counters. **Keyless fallback** routes every submission to manual teacher review (never auto-fails).
- Depth limits: COCO map is a rough heuristic (80 classes); real grading needs a Gemini key or teacher; correctness is AI/teacher-judged, not deterministic.

### Cards / Grimoire (collection) — `src/routes/cards.tsx`
- Core interaction: the personal Grimoire — hosts the **Grimoire Guide** (learning-path table of contents) plus the AR-card collection grid; owned cards open a detail popup, unclaimed show "Scan its card".
- Content range: AR_ELEMENTS (2 cards) + forged cards. On website the popup shows all facts + `QuickCheck`; on mobile only a one-fact glimpse.
- Game element: card count "X / N", "Collected"/"Forged" badges, print-the-card (itsura) for forged cards via a clean print window.
- Scoring: `QuickCheck` awards the `ar-alchemist` badge on a perfect run; logs practice.
- Depth limits: collection is small (2 base + 1 sample forged).

### Grimoire (marketing) — `src/routes/grimoire.tsx`
- Public marketing page for the **physical 12-card set** (H, O, C, N, Na, Cl, Ca, Fe, Cu, Zn, Mg, S). Explains Base/Forged/Legendary card tiers, how AR scanning works, buy CTA (Shopee link). Static; no auth, no scoring.
- Note: narrative says 12 base cards + 100+ forgeable, but the app ships only 2 AR targets.

### The Study — `src/routes/study.tsx` (engine: `lib/learning.ts`, `lib/curriculum.ts`)
- Core interaction: two tabs. **Learning Path** — sequential topics, each a learn → practise → assess flow. **Review** — spaced-repetition queue of due concepts.
- Content range: **5 topics** (Atomic Structure, Periodic Table, Chemical Bonding, Balancing Equations, Gas Laws), 3 concepts each (15 total), each concept = short explainer + one MCQ with hint.
- Game element: topics unlock sequentially; assessment pass threshold 70%; result screen with pass/retry.
- Scoring: writes `pathProgress` (stage + best score) and per-concept `reviews` (SM-2 schedule) to the user doc.
- Depth limits: only 15 concepts; single-MCQ per concept; assessment reuses the same practice questions without hints.

### Learn — `src/routes/learn.tsx`
- Static marketing/methodology page (public). Describes 3 pedagogical pillars, the educator's role, learning outcomes. No interaction. Note: references a "Reaction Sandbox" and "Evidence Journal" as framing — neither exists as a module.

### Elements — `src/routes/elements.tsx`
- Public element explorer — floating "blob" grid, click for a modal with animated Bohr SVG, stats, shell breakdown, fact. Search + category filter + Tier filter.
- Content range: **~41 curated elements** across 3 tiers. (Header says "All 12 Elements" — inaccurate label.)
- Game/scoring: none; public, no auth.

## 2. Learning Infrastructure

- **`lib/curriculum.ts`** — shared content model: `Topic` → `Concept` (ids like `atomic.protons`), each concept bundling a `learn` explainer + one check question (prompt/choices/answer/hint). 5 topics × 3 concepts = 15. Powers both the guided path and spaced review.
- **`lib/learning.ts`** — the engine. **Spaced repetition:** lightweight SM-2 (`nextReview`) — ease 1.7–2.8, intervals 1d→3d→geometric growth, lapse returns card in 10 min. **Guided paths:** stages learn→practise→assess→done, `ASSESS_PASS = 0.7`, sequential topic gating, `advancePath` (never moves backward, tracks best).
- **`lib/profile.ts`** — student data model + live Firestore subscription. Roles (`student|teacher|admin`), teacher status (`pending|approved|rejected`), **Mastery** (`not-started|developing|proficient|mastered`, teacher-set), teacher-entered `grades`, app-recorded `practice` counters, `grimoire`/`grimoireScans`, `compounds`, `forged`, `badges`, `pathProgress`, `reviews`. Practice counters are explicitly **engagement, never grades**.
- **`lib/guide.ts`** — the **Grimoire Guide**: W3Schools-style ordered table of contents (5 chapters, 12 steps: lab-safety → atomic-builder → periodic-table → study → molecules → reactions → equation-balancer → gas-laws → titration → decay → quiz → card-hunt). Each step has a `done(profile)` predicate; computes done count, %, and the single "You are here" next step. **Guides but never gates.**
- **`lib/forged.ts`** — forged-card registry: currently **one sample** (`3rd_card`) with a printable image path.
- **`lib/cards.ts`** — the 12 base element cards + **rule-based compound combiner**: valence/electronegativity logic produces formula, ionic/covalent bond type, and systematic name; supports 7 polyatomic ions (OH, NO₃, HCO₃, CO₃, SO₄, PO₄, NH₄); enriches ~25 known compounds with common name/uses/hazard/stability. **The combiner exists in the lib; the AR mix UI currently just reveals the fixed sample card.**
- **`QuickCheck.tsx`** — per-element 3-question MCQ, website-side only. Quizzes exist for **2 elements**. Perfect score awards the `ar-alchemist` badge.
- **`Learn.tsx`** (component) — reusable teaching primitives: `ConceptCard` ("Alchemist's Note"), `DidYouKnow` ("In the Mortal World"), `ChallengeBanner` (trial).

## 3. Teacher / Admin Features

### Teacher Console — `src/routes/teacher.tsx` (gated by `RequireRole role="teacher"`)
- **Classes tab:** create classes (6-char join code = the class doc id), live per-class rosters, copy join code. Students self-enrol by code.
- **Gradebook tab:** per student, set score/outOf + Mastery level for **5 fixed topics**. Students see these read-only.
- **Evidence tab:** review inbox for Scavenger submissions across the roster (live merged feed, "Needs review" vs "All"). Approve/reject with undo; shows student answer, AI feedback, AI-graded vs needs-review source.
- **More Tools tab:** 3 **"Coming soon" placeholders** — Quiz Builder, Mission Configurator, Class Performance Matrix. Not implemented.
- Teachers **cannot** yet: build quizzes, configure missions, or see aggregated analytics (only raw practice counters exist; the "live analytics" on the Learn marketing page is not built).

### Teacher Verification — `components/TeacherVerification.tsx` (+ `lib/admin.ts`, `lib/facematch.ts`)
- Upload teaching/government ID + capture a **live selfie**; on-device face match compares the two (images stay in the browser until submit). Must pass (or hit manual review) to submit; teachers stay `pending` until an admin approves.

### Admin Console — `src/routes/admin.tsx` (gated by `RequireRole role="admin"`)
- Admin seeded by email allowlist; auto-promoted on profile ensure.
- **Overview** stat tiles; **Verifications** (ID+selfie review with face-match result, approve/reject); **Teachers** (approve/revoke); **Users** (searchable live list); **Classes** (platform-wide list).

## 4. Platform

- **PWA manifest**: "AlcheMix AR — Chemistry Companion", `start_url: /app`, standalone, portrait, 192/512 icons. Installable — **no service worker, so not offline**.
- **Platform detection** (`lib/platform.ts`): website vs mobile/PWA; `arCapable` gates AR & camera; QR/copy-link handoff between sides.
- **AR stack:** MindAR image-target tracking + Three.js + GLTFLoader, dynamically imported (SSR-safe). 2 targets compiled into `public/targets.mind`. Multi-card tracking, particle bursts, WebAudio chime, fullscreen. Requires HTTPS/localhost.
- **AI stack** (`lib/ai.ts` server fns + `lib/useAI.ts`): Gemini key server-only via TanStack `createServerFn`. Five capabilities — `aiVerifyMission` (scavenger grading), `aiScanFrame` (live-frame reasoning), `aiGenerateProblem` (problem sets), `aiGradeAnswer` (auto-grade + explain), `aiAskAlchemist` (tutor chatbot). Every function has a **deterministic keyless fallback**. **`aiGenerateProblem`, `aiGradeAnswer`, and `aiAskAlchemist` are implemented but not wired into any UI** — only scavenger uses the vision functions.
- **Auth & roles:** Firebase email/password + Google; `RequireAuth`/`RequireRole` wrappers; `firestore.rules` present.
- **Print:** forged-card itsuras only (`printCardImage` full-bleed print window). No other printing.
- **Student hub** (`/app`): dashboard of 14 module tiles mirroring the guide order, badge display, mastery per topic, class join. PWA `start_url`.

## 5. Cross-cutting depth limits

- Small curated datasets throughout: 6 molecules, 8 reactions, 8 equations, 6 isotopes, 5 topics/15 concepts, ~20 rich elements, 2 AR targets.
- Real chemistry values are accurate where present, but engines are illustrative: no weak-acid titration curves, no real-gas behaviour, no orbital/subshell model, no decay chains, no parenthesized-formula balancing.
- Scoring is largely session-local or engagement-counter based; persisted learning state = path progress, spaced-repetition reviews, teacher grades/mastery, badges, grimoire/forged/evidence.
- Teacher analytics and the AI tutor/problem-generation UIs described in marketing copy are scaffolded but not shipped.
