# AlcheMix — Development Logs

> Running log of what was built, changed, and decided — newest day first.
> Each entry names its commit(s) so the diff is one `git show` away.
> Companion docs: `SYSTEM_TECHNICALITIES.md` (how the system is built) and
> `ALGORITHM_OF_THE_SYSTEM.md` (how the core mechanics work).

---

## 2026-10-01 (Thursday)

A full consultation-feedback + feature day: thirteen commits, pushed to
`main` (`464fd7c` → `184a816`).

### Context

Prof's consultation log (CCS Form 04A) reviewed. Marketing page (`/schools`)
and school-code-at-signup were already shipped; the CMS item was explicitly
deferred by the owner; card-set bundling belongs in the CBA costing document
(the `/schools` page deliberately shows no pricing). The actionable item was
UI/UX polish — plus a day of owner-directed feature work.

### 1 · Public-pages UI/UX pass — `464fd7c`

- Display font (Cyberjunkies) removed from every small label on `/`,
  `/about`, `/schools`, the floating nav and auth buttons — interface sans
  per SCOPE rule 8. Display stays on h1/h2/hero text.
- Neon text glows now ignite in dark mode only (they smudged on parchment).
- **Bug fix:** `MoleculeCanvas` passed CSS `var()` into canvas paint styles
  (unresolvable there) — decorative molecules rendered as grey blobs. Now
  resolves the computed colour first.
- Copy consistency: 42 explorer elements / 12 physical cards / 118 in the
  app table, stated the same everywhere. `/elements` h1 rejoined the
  display-font heading system; oversized section gaps tightened.

### 2 · Chapter-rail horizontal-scroll fix — `dafb8b6`

Hover name-chips were absolutely positioned outside the rail *inside* its
`overflow-y-auto` box — clipped AND creating a horizontal scrollbar. A
single fixed-position chip now floats beside the rail (flyout-panel
technique); the rail is `overflow-x-hidden`.

### 3 · Gemini goes live + overload resilience — `3539fe2`

- Owner's API key installed in `.env` (`GEMINI_API_KEY`, server-only,
  git-ignored). All server functions verified end-to-end returning
  `source: "gemini"`.
- `askGemini` hardened: one retry on 503/429, then a hop to
  `gemini-flash-lite-latest` before surrendering to the rule-based
  fallback. The primary Flash pool's "high demand" 503s were reproducible
  that day; the Lite hop kept every capability live.

### 4 · The School Door — `9c99241`

Consultation feedback implemented as dedicated pages: `/school-signup` and
`/school-login` (shared `SchoolDoor` component). The school code is the
first field, looked up live so the student sees *which class* they are
joining before the account exists; enrolment happens on auth. The general
`/signup` and `/login` carry a "Have a School Code ready?" link instead of
an inline field. `firestore.rules`: public single-doc `get` on
`classes/{code}` (listing stays signed-in) — **deploy with
`firebase deploy --only firestore:rules`**.

### 5 · Element Identifier → the Assayer's Lens — `48c55f8`, `43e5141`, part of `408da21`

- Rebuilt as a camera experience: every item in the frame is identified and
  broken into the chemical elements it genuinely contains (new
  `aiIdentifyItems` server fn; Gemini is the source of truth). Keyless
  fallback: on-device COCO-SSD + the curated composition map. Element chips
  deep-link to `/periodic-table?element=X`. The original clue-deduction
  trial survives as a second tab.
- Made **phone-only** like the AR Scanner (shared `MobileHandoff` QR panel
  extracted from the scanner).
- Moved from "Prove Your Craft" to **Field Work** (rail chapter, hub group,
  guide step marked phone-side).

### 6 · Arcade benched — `2492fbf`

Owner request: the whole Arcade (Duel, Class Duels, Placement Trials, Hall
of Records, Emporium) hidden from every nav surface and the hub section via
one `ARCADE_HIDDEN` flag in `StudentShell.tsx`. Routes stay reachable by
URL; the `/modules` curator still lists them. Flip the flag to restore.

### 7 · Daily Starters, Duolingo-style — `9167020`, `408da21`

- "Starters for Ten" became **Daily Starters**: three AI-written questions
  a day (`aiStarterQuiz`), each anchored to a curriculum concept (due
  spaced-review first) so SM-2 keeps feeding; bank questions step in
  keyless. Wrong answers name the correct choice and teach why.
- **The Ledger**: every tracked run stored (last 60) — date, score, each
  question with your answer vs the correct one.
- Streaks track a personal best; the intro cauldron bubbles while the
  streak lives and **cracks** when it lapses.
- **The Mending Trial** (`408da21`): a lapsed streak (≥2 days, broken ≤7
  days ago) is restored only by *earning* it — 4 of 5 bank patch questions.
  Failing teaches and offers another patch; no free restore button.
- The "AI-written daily" badge was removed the same day (owner request) —
  the `source` tag stays internal.

### 8 · Equilibrium goes apparatus — `aff5370`

The abstract particle box became the bench demo it simulates: a drawn
round-bottom flask (bulb area ∝ V) over a burner whose flame grows as you
open the new **`ValveWheel`** — a rotary 270° hand-wheel replacing the
temperature slider. Particles bounce off the curved glass; injection
squirts down the neck. Same stochastic engine, same emergent K.

### 9 · Tap toys — `ece259b`, `c1b60cc`, removal in `184a816`

- The **Great Cauldron** (Bench): tap to stir, 1 ladle per 10 stirs, 1000
  cap → Alchemist's-surprise message. *Removed again the same day on owner
  request* (`184a816`); the cauldron mascot itself remains in Starters.
- **Daily drop vessels** (`c1b60cc`, kept): the **Alembic** on `/molecules`
  and the **Phial** on `/atomic-builder` — one tap a day drops ONE animated
  drop into the glass, 300-drop cap, same surprise message at full.

### 10 · The flask shatters — `184a816`

Equilibrium's glassware gained honest limits: ideal-gas pressure proxy
(n·T/V) + a scorching-flame threshold build visible strain (rattle, red
stress cracks, pulsing warning); ~3 s of sustained abuse shatters the flask
(shards, escaped vapour, pilot flame). Framing is deliberately warm —
"Perfectly normal. Every alchemist breaks a flask or two." — with a
one-button fresh-flask reset. Easing off in time lets the glass recover.

### 11 · Mobile home-bar — the rail laid flat

The phone bottom bar no longer shows four hand-picked tabs + "More": it now
mirrors the desktop rail one-to-one — a Home crest plus one orb per chapter
(Bench, I–V, Field), and tapping a chapter opens the SAME flyout as desktop,
rendered as a bottom sheet of that chapter's pages. Same chapter set, same
curation (config/modules + ARCADE_HIDDEN), same active-chapter highlight.

### Decisions & reminders

- CMS: deferred by owner — do not start.
- Module direction discussion: parked for later (owner).
- `firebase deploy --only firestore:rules` still required for the School
  Door's pre-auth code lookup.
- The pasted Gemini key is dev-only: rotate before public demo; use
  `wrangler secret put GEMINI_API_KEY` in production.
- "Send us your account details" surprise copy flagged once as
  phishing-adjacent for a school app; owner kept it.
