# AlcheMix — Module Audit Checklist

> A walk-through list of every route in the app, grouped by who it is for.
> Tick each box as you verify it on your end. Routes are file-based in
> `src/routes/`; the link is the in-app path (prefix with your dev/prod host).
> Last mapped: 2026-10-14.

---

## 🌐 Public / Guest (no sign-in required)

Marketing, discovery, and the entry doors. Anyone can reach these.

- [ ] **`/`** — **Landing page.** The brand front door; hero + entry into the app.
- [ ] **`/about`** — **About.** What AlcheMix is, the story/pitch.
- [ ] **`/learn`** — **Learn More.** Marketing explainer: hero, the six base stones, CTAs into `/elements` and `/app`.
- [ ] **`/schools`** — **For Schools.** Institutional / pricing marketing page for school buyers.
- [ ] **`/elements`** — **Element Explorer.** ~44 curated elements + lore (etymology / history / alchemy symbols for all 118 in `element-lore.ts`). Public-facing periodic reference.
- [ ] **`/lexicon`** — **The Lexicon.** Public glossary of chemistry + alchemy terms, each with its own entry page.
- [ ] **`/grimoire`** — **Grimoire (preview).** Public sample-card showcase of the collection (teaser; the real bound collection is the student `/cards`).

### Sign-in / sign-up doors

- [ ] **`/login`** — **Sign In.** Student/standard login.
- [ ] **`/signup`** — **Sign Up.** Student/standard registration.
- [ ] **`/educator`** — **The Educator's Door.** Gold-liveried teacher sign-in (same auth backend as `/login`; role-aware routing).
- [ ] **`/school-login`** — **School Sign In.** Institutional account login.
- [ ] **`/school-signup`** — **School Sign Up.** Institutional account registration.

---

## 🧪 Student (Apprentice)

Everything inside the `/app` hub. New student modules are registered in three
places: `app.tsx` (MODULES), `StudentShell.tsx` (NAV), `guide.ts` (GUIDE).

### Hub & wayfinding

- [ ] **`/app`** — **The Bench (hub).** Student home: module grid, daily drops, mentor chat, entry to everything below.
- [ ] **`/cards`** — **Grimoire.** Guide TOC + AR card collection; forged-card printing. The real bound collection.
- [ ] **`/guide`** — **The Guide.** Learning path — recommended chapter order (recommends, never locks).

### Learning modules

- [ ] **`/starters`** — **Daily Starters.** Duolingo-style daily rite: 3 AI questions (bank fallback), streak + best + run Ledger, cracked-cauldron lapse, Mending Trial restore; feeds SM-2.
- [ ] **`/lab-safety`** — **Lab Safety.** GHS / apparatus study + 10 fail-safely scenario trials.
- [ ] **`/atomic-builder`** — **Atomic Builder.** Bohr builder (Z ≤ 20), missions + 15-challenge trial. (Daily drop: the Phial.)
- [ ] **`/periodic-table`** — **Periodic Table.** 118 elements, 4 lenses: family / state-vs-temperature slider / trend heat-maps / discovery timeline.
- [ ] **`/states`** — **States of Matter.** Particle phases, 4 substances (CO₂ sublimes), heating curve.
- [ ] **`/study`** — **The Study.** 5 topics × 3 concepts: learn → practise → assess + SM-2 review. The only sequentially-gated path.
- [ ] **`/molecules`** — **Molecule Shapes.** 6 VSEPR molecules, 3D viewer. (Daily drop: the Alembic.)
- [ ] **`/reactions`** — **Reaction Theatre.** 8 reactions, conservation-of-mass ledger, narration.
- [ ] **`/equation-balancer`** — **Equation Balancer.** 24 equations, 3 difficulties, persisted Time Attack.
- [ ] **`/codex`** — **Compound Codex.** Discovery encyclopedia over the real combiner (~25 compounds).
- [ ] **`/gas-laws`** — **Gas Laws.** PV=nRT sim + AI-generated 5-problem trial.
- [ ] **`/solutions`** — **The Elixir Bench.** Solutions & molarity: real solubility limits, particles view, commissions trial.
- [ ] **`/thermo`** — **Cauldron of Heat.** Coffee-cup calorimetry, real ΔH data, guided q=mcΔT assay.
- [ ] **`/rates`** — **Reaction Rates.** Collision theory sim: temp / concentration / surface / catalyst, quick check.
- [ ] **`/equilibrium`** — **Equilibrium.** N₂O₄⇌NO₂ with emergent K, ValveWheel burner, Le Chatelier stresses, Haber tab; overpressure shatters the flask (warm reset).
- [ ] **`/electro`** — **The Voltaic Forge.** Build galvanic cells from real potentials, animated e⁻ flow, trial.
- [ ] **`/forces`** — **Invisible Bonds.** IMF sim + 5-substance boiling-point race, quick check.
- [ ] **`/titration`** — **Titration Lab.** Strong + weak acid, 3 indicators, pour realism, unknown assay.
- [ ] **`/decay`** — **Radioactive Decay.** 6 isotopes, half-life slider.
- [ ] **`/table-game`** — **Placement Trials.** 3-difficulty placement game (name → symbol → riddles).
- [ ] **`/quiz`** — **3D Visual Quiz.** 4 question templates, persisted bests.
- [ ] **`/assignments`** — **Assignments.** Student-side view of teacher-authored quizzes + missions.

### Mobile / capture companion

- [ ] **`/identifier`** — **Element Identifier (mobile).** Live camera lens reads items in frame for their elements (on-device COCO-SSD + keyless fallback) + 5-round clue trial; desktop hands off via QR.
- [ ] **`/scanner`** — **AR Scanner (mobile).** MindAR; Alche-mix ceremony runs the real combiner; noble gases refuse; forged compounds render as SVG data-cards.
- [ ] **`/scavenger`** — **AI Scavenger Hunt.** COCO-SSD + Gemini deep scan; teacher evidence inbox.

### 🎲 Arcade (student — benched from nav, reachable by direct URL)

> Hidden via `ARCADE_HIDDEN` in `StudentShell.tsx` (owner, 2026-10-01). Flip the flag to restore. Verify these by direct URL.

- [ ] **`/duel`** — **Duel the Alchemist.** vs-AI card battles (easy/medium/hard); stats from real chemistry; forge move.
- [ ] **`/duels`** — **Class Duels.** Async PvP vs classmates over the duel engine (`duels/{id}` docs).
- [ ] **`/leaderboard`** — **Hall of Records.** Class leaderboards (stars / duels / compounds / streaks) via roster denormalization.
- [ ] **`/shop`** — **The Emporium.** Aurum sink: frames, titles, charms with equip slots.

---

## 👩‍🏫 Teacher

- [ ] **`/teacher`** — **Teacher Console.** Classes & join codes · gradebook (5 topics) · scavenger evidence review · Performance tab (class matrix, drill-downs, struggling-concepts radar) · Quiz Builder (curriculum seeding + live class results) · Mission Configurator. All authored content stored on the class doc.

---

## 🛡️ Admin

- [ ] **`/admin`** — **Admin Console.** Teacher ID + face-match verification; user / class management.
- [ ] **`/modules`** — **The Curator.** Module-visibility switchboard: every module as a chaptered checklist; checked = visible in apprentice nav. State in Firestore `config/modules`, live-updates open shells. **Anyone can view; only the seeded admin's writes are accepted.**

---

### Notes for the audit

- Every surface must work in **dark AND light** mode (token-based styling).
- Camera / AR flows (`/scanner`, `/identifier`, `/scavenger`) can only be truly verified on a **phone over HTTPS**.
- `src/routeTree.gen.ts` is auto-generated — never hand-edit.
- `__root.tsx` and `src/routes/README.md` are infrastructure, not modules (not listed above).
