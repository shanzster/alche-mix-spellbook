# AlcheMix — Project Scope

> Context document for AI assistants and collaborators. Read this first.
> It defines what AlcheMix IS, what is shipped, what is planned, and what is
> deliberately OUT of scope. Deeper background: `FEATURE_BRAINSTORM.md`
> (gap analysis vs 25 chem-ed platforms) and `docs/brainstorm/` (research pack).
> Last updated: 2026-09-02.

## What AlcheMix is

An **alchemy-themed chemistry education app** for middle/high-school students
("apprentices"), built around **physical AR trading cards** and a fantasy
narrative (Grimoire, forging, trials, aurum) wrapped around **real, accurate
chemistry**. Sold with a physical card set; classroom-ready with teacher and
admin consoles.

**Two-sided architecture** (enforced by `src/lib/platform.ts`):
- **Website (desktop)** = deep study: simulations, guided lessons, trials.
- **Mobile / installed PWA** = capture companion: AR scanner, AI scavenger
  hunt, quick "glimpses" that hand off to the website for full study.

**Stack:** TanStack Start (file routes in `src/routes/`, do NOT create
`src/pages/` or Next.js conventions) · React · Tailwind v4 with CSS
custom-property tokens (`var(--color-gold)` etc., dark + light) · Firebase
Auth + Firestore · Three.js + MindAR (AR) · TensorFlow.js COCO-SSD +
Gemini (`GEMINI_API_KEY`, server-only via `createServerFn`) · Nitro/Cloudflare.

## Non-negotiable design principles

1. **Real chemistry, illustrative engines.** Values (angles, Ka, half-lives,
   electronegativities) must be textbook-accurate; the engines are curated and
   illustrative, not research-grade physics. Curated datasets are fine; wrong
   data is not.
2. **Keyless fallbacks everywhere.** Every AI feature (`src/lib/ai.ts`) must
   work without a Gemini key via deterministic fallbacks, tagged
   `source: "gemini" | "fallback"`.
3. **Practice ≠ grades.** `practice.*` counters are engagement only. Grades
   and mastery are teacher-entered. Trials store best scores/stars but are
   student-facing motivation, surfaced to teachers as analytics, not grades.
4. **Guide, don't gate.** The Grimoire Guide (`src/lib/guide.ts`) recommends
   an order but locks nothing. Only The Study's topic path gates sequentially.
5. **Failure teaches.** Wrong answers, impossible mixes, and safety mistakes
   get warm teaching moments (the Alchemist's counsel), never punishment.
6. **On-brand naming.** Trials, forging, Codex, aurum, itsura, "the Alchemist"
   — new features should extend the alchemy vocabulary, not break it.
7. **Both themes, mobile-friendly, token-based styling.** Every surface must
   work in dark and light mode using the existing CSS tokens; wide content
   scrolls horizontally in its own container.

## Shipped surface (current)

**Student modules** (all registered in `/app` hub, sidebar nav, and Grimoire Guide):

| Route | Module | Notes |
|---|---|---|
| /cards | Grimoire | Guide TOC + AR card collection, forged-card printing |
| /starters | Starters for Ten | Daily 10-question ritual; feeds SM-2; streaks |
| /lab-safety | Lab Safety | GHS/apparatus study + 10 fail-safely scenario trials |
| /atomic-builder | Atomic Builder | Bohr builder (Z ≤ 20), missions + 15-challenge trial |
| /periodic-table | Periodic Table | 118 elements, 4 lenses: family / state-vs-temperature slider / trend heat-maps / discovery timeline |
| /table-game | Placement Trials | 3-difficulty placement game (name → symbol → riddles) |
| /states | States of Matter | Particle phases, 4 substances (CO₂ sublimes), heating curve |
| /study | The Study | 5 topics × 3 concepts, learn→practise→assess + SM-2 review |
| /molecules | Molecule Shapes | 6 VSEPR molecules, 3D viewer |
| /reactions | Reaction Theatre | 8 reactions, conservation-of-mass ledger, narration |
| /equation-balancer | Equation Balancer | 24 equations, 3 difficulties, persisted Time Attack |
| /codex | Compound Codex | Discovery encyclopedia over the real combiner (~25 compounds) |
| /gas-laws | Gas Laws | PV=nRT sim + AI-generated 5-problem trial |
| /titration | Titration Lab | Strong + weak acid, 3 indicators, pour realism, unknown assay |
| /decay | Radioactive Decay | 6 isotopes, half-life slider |
| /quiz | 3D Visual Quiz | 4 question templates, persisted bests |
| /scanner | AR Scanner (mobile) | MindAR; Alche-mix ceremony runs the REAL combiner; noble gases refuse; forged compounds render as SVG data-cards |
| /scavenger | AI Scavenger Hunt | COCO-SSD + Gemini deep scan; teacher evidence inbox |
| /elements | Element Explorer (public) | ~44 curated elements + lore (etymology/history/alchemy symbols for all 118 in `src/lib/element-lore.ts`) |

**Cross-cutting:** Ask the Alchemist mentor chat on every student page ·
persistent Trials (`profile.trials`, stars) · **aurum currency (earn-only —
no shop yet)** · starter streaks · badges.

**Teacher:** classes/join codes · gradebook (5 topics) · scavenger evidence
review · **Performance tab** (class matrix, drill-downs, struggling-concepts
radar). **Admin:** teacher ID + face-match verification, user/class management.

**Key libs:** `profile.ts` (data model + `recordTrial`/`earnAurum`/
`recordStarterRun`) · `curriculum.ts` + `learning.ts` (content + SM-2 + paths)
· `cards.ts` (12 base cards, `combine()` rule-based compound engine) ·
`forged.ts` (dynamic forged cards, `forgedFromMix`) · `ai.ts`/`useAI.ts`
(5 AI capabilities, all wired) · `guide.ts` · `element-lore.ts` ·
`periodic-table-data.ts` (118 elements + physical data).

## In scope — next (in priority order)

1. **Duel the Alchemist (battles v1)** — vs-AI card battles using existing
   data: HP = valence electrons, attack = |oxidation state|, turn order by
   state of matter, abilities from real properties (Fe rusts, Na + water
   explodes, noble gases can't attack), forged compounds as trump cards.
   Client-only + existing profile. Winnings in aurum. *Design agreed, not built.*
2. **Async class duels (battles v2)** — challenge classmates, correspondence
   turns via Firestore `battles/{id}` + `onSnapshot` (same pattern as the
   evidence feed). Then **v3**: live duels + card trading with teacher approval.
3. **Aurum shop** — spend the currency: card frames, grimoire cosmetics,
   hint scrolls, card packs. (Currency already accrues; a sink is needed.)
4. **More AR targets** — the physical set is 12 cards; only 2 compiled targets
   (`public/targets.mind`, via `npm run compile:ar`). Closing this gap makes
   real forging shine.
5. **Teacher authoring** — Quiz Builder and Mission Configurator placeholders
   in the teacher console; model on ChemCollective's data-driven problem format.
6. **Class leaderboards / live quiz mode** — trial stars per class; later a
   Kahoot-style hosted session over the existing question bank.
7. **Remaining sim topics** — reaction rates, equilibrium, thermochemistry,
   electrochemistry/galvanic cells, intermolecular forces, solutions/molarity.
8. **Offline service worker, deep links, richer element pages** (lore into
   /periodic-table detail panel), scaffolding levels per activity.

## Out of scope (deliberate — do not build unless the owner changes this)

- **Research-grade engines**: molecular dynamics, quantum chemistry, spectra
  prediction, organic synthesis labs. Wrong level for the audience.
- **LMS/LTI integration** (Canvas/Moodle grade passback). Google-Classroom-
  style share links are the ceiling for now.
- **A separate rewards world** (Legends-of-Learning style). The Grimoire/card
  collection IS the reward world — deepen it instead.
- **Native apps.** PWA + website only.
- **Full i18n and the PhET accessibility quad** — desirable later, but not
  part of the current milestone; don't block features on them.

## Working conventions for AI sessions

- Routes are file-based; `src/routeTree.gen.ts` is auto-generated (regenerates
  on `npm run build` / dev) — never hand-edit it.
- New student modules must be registered in THREE places: `src/routes/app.tsx`
  (MODULES), `src/components/StudentShell.tsx` (NAV), `src/lib/guide.ts` (GUIDE).
- Reuse teaching primitives from `src/components/Learn.tsx` (`ConceptCard`,
  `DidYouKnow`, `ChallengeBanner`) and the trial persistence helpers — don't
  invent parallel systems.
- Verify with `npx tsc --noEmit` and `npm run build` before calling work done.
- Camera/AR flows can only be truly verified on a phone over HTTPS — say so
  honestly when shipping changes to them.
