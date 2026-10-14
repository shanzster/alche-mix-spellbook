# AlcheMix — Development Logs

> Running log of what was built, changed, and decided — newest day first.
> Each entry names its commit(s) so the diff is one `git show` away.
> Companion docs: `SYSTEM_TECHNICALITIES.md` (how the system is built) and
> `ALGORITHM_OF_THE_SYSTEM.md` (how the core mechanics work).

---

## 2026-10-14 (Tuesday)

> Working-tree changes (uncommitted at time of writing).

### 1 · AlcheLoader — the spinning flask retired

The app-wide loading state was a lucide `FlaskConical` with `animate-spin`
(owner: "ugly"). Replaced with `src/components/AlcheLoader.tsx` — a
round-bottom flask in gold filigree whose teal elixir breathes while bubbles
rise, soft teal halo, no rotation. Keyframes (`alche-breathe`, `alche-swell`,
`alche-bubble-rise`) in `styles.css`, all paused under
`prefers-reduced-motion`. Swapped into every full-screen loader: `RequireRole`,
`RequireAuth`, `index.tsx` redirect hold, `TeacherVerification` (via the
`FlaskMark` sub-export). Tiny 4×4 inline button spinners left as-is.

### 2 · Chapter II "The Rite" — laid out as a bench

Landing-page forging section reworked: a candlelight backdrop glow grounds it,
the `band-workbench` art is layered under the panel so the cards rest on a
workbench, and the mix now sits on a distinct gold-ruled altar slab. The
`A + B → result` row no longer wraps badly — it stacks on mobile (arrow rotates
down), single row on desktop. Physical-set copy updated **12 → 20** cards; the
interactive demo tray still shows the 12 modeled base elements (`BASE_CARDS`),
relabeled with no count so it doesn't claim 20 over 12 tiles. **Open:**
`SCOPE.md` / roadmap still say "12 cards"; growing `BASE_CARDS` to 20 (new
element data + `combine()` coverage) is a separate, un-started task.

### 3 · About page — rebuilt, de-vibecoded

`/about` fully rewritten (owner: "so vibecoded"). Removed every floating pill
badge, the lucide icon set (marketing page → no icon libraries), the orbit/Bohr
visuals, and the unverified marketing ("Reimagined", "42 elements"). New hero
(atelier backdrop + veil + blackletter title, no pill). Eight owner-specified
chapters with `.mg-num` numerals instead of icon chips: (I) plain-language
definition, (II) the problem w/ PISA 2022 23% vs OECD 76%, (III) the alchemy
conceit explained (names the adviser's gamification-vocabulary flag, item 16),
(IV) how the chemistry stays honest (IUPAC/GHS/DepEd/engine-refuses + the
"illustrative not research-grade" admission), (V) colophon — Jerlyn C. Dela Cruz,
Lyceum of Subic Bay CCS, adviser Ms. Lucille Macusi-Republo, piloted at Olongapo
City NHS, (VI) privacy (DPA 2012 / RA 10173, images on the student's own record),
(VII) what it doesn't do (no lab replacement / no grades / no teacher
replacement), (VIII) the card set. Single-column reading layout, two band seams.

### 4 · Element modal — wider desktop, tiered hierarchy

`ElementModal` (`/elements`) rebuilt. Was a cramped `max-w-md` single scroll on
every screen; now `max-w-md` on mobile, **`max-w-4xl` two-column on desktop**.
Reading order made explicit with `TierLabel` bands, each tier more narrative than
the last: ① Identity (category-washed header: Bohr + name + category + at-a-glance
chips) → ② The Numbers (left col) → ③ Atomic Structure → ④ Why It Matters →
⑤ The Story / lore (right col, gold-voiced). Surfaced previously-hidden fields:
electronegativity, discovery year/antiquity, **state at 25 °C** (derived from
melt/boil vs 298 K) and **valence electrons** (last shell); melt/boil now show °C
too. All from existing data — nothing invented.
  **Light-mode fix (owner: "sakit sa mata"):** the category colours are fixed
  hexes tuned for dark bg, so in light mode they washed the whole card yellow and
  rendered labels pale-on-cream. Fixed by basing the modal on `--color-card`
  (white in light / navy in dark), softening the header wash (22%→13%), and
  routing every coloured label through `ink = color-mix(category 55%,
  var(--color-spectral))` so text darkens on light and lightens on dark. Inner
  boxes now use a shared `BOX_BG`/`BOX_BORDER` with real contrast in both themes.
  **Follow-up:** a 1:1 ink mix was still too pale for light categories (yellow)
  on white, so `ink` is now 30% category / 70% spectral (readable, hint of hue)
  and the vivid category colour was moved onto the rules/borders only via a
  `TierLabel {text, rule}` split.

### 18 · Perf — the site was laggy (3D render loops)

Root cause: `Molecule3D` + `BohrModel3D` ran **uncapped `requestAnimationFrame`
loops that never paused**, even scrolled off-screen — and `Molecule3D` was newly
on the `/learn` + `/schools` MARKETING pages, so every visitor pegged the GPU
continuously. Fixes: (1) both viewers now **pause the loop when off-screen**
(IntersectionObserver). (2) three.js (~550 KB) is **lazy-loaded** on marketing
pages via `LazyMolecule3D` (dynamic import + visibility gate) — off first paint.
(3) `public/ui/` PNGs downscaled to ≤400 px (15 MB → 6.6 MB). `tsc` +
`npm run build` clean. Guardrails added to DESIGN_DIRECTION §8.

**Landing hero jank** — separate cause: 8 hero layers (grain, crystal-frame, two
side wings × day/night) were BOTH `mix-blend-mode` AND parallaxed, over a
parallaxing backdrop → the GPU re-rasterised the blended stack every scroll/mouse
frame. Fix: those 8 layers + the backdrop are now **static** (dropped `data-par`
+ `will-change-transform`); only the non-blended Alchemist figure + headline
parallax on top. One moving layer instead of ten blended ones. `tsc` +
`npm run build` clean.

### 17 · Custom game-UI assets wired in (all 34)

Owner dropped 34 custom game-UI PNGs in `public/OTHER ASSETS/` (flat art on a
light-grey bg, no transparency). Cataloged via a vision subagent, then
**flood-keyed to transparent cutouts** (Pillow in a scratchpad venv; `bg_cut.py`
seeds from the borders so interior same-colour pixels survive) → `public/ui/`
with semantic names, trimmed + downscaled. **Every one is placed** (owner: "do
not leave them unused"): `close-button` → ScriptureModal; 6 `medal/badge/emblem`
→ Craft-ladder rank emblem (changes per tier, `/app`); `frame-round-zodiac` →
element-modal Bohr frame; `/schools` got the rest — lab-object/potion/icon
emblems on every PILLAR/FEATURE/PRACTICAL/ROLLOUT card, `nameplate-gold` hero
plate, `banner-*` section headers, `divider-*` separators, `tooltip-parchment`
pull-quote, and 3 `frame-*`/`icon-smoke` as faint hero ornaments. `tsc` +
`npm run build` clean.

### 16 · No Google auth · atomic signup fields · scripture modal

- **Removed Google sign-in/sign-up** everywhere (AuthDoor, SchoolDoor, signup)
  — email/password only, to cut login-error surface. Dropped `signInWithGoogle`
  + the Google provider from `auth.ts`.
- **Atomic signup fields**: `/signup` now collects first / middle (opt) / last
  name + school (optional) + email + password. New `firstName`/`middleName`/
  `lastName`/`schoolName` on the profile; `displayName` composed from them;
  `signUpWithEmail` takes a `{ names }` extra. (Field inputs inlined — an inner
  component would drop focus each keystroke.)
- **Scripture modal**: new `src/components/ScriptureModal.tsx` — an ornate
  roller rod (public/Modal-Texture/roller.png) at each end of a parchment body
  (parchment.png → optimized parchment.jpg) that **unrolls** open: horizontally
  on desktop, vertically on phones, with a roll-up on close (reduced-motion
  safe). `ElementModal` (`/elements`) rebuilt to render inside it with fixed
  dark-ink-on-cream styling (new `SStat`/`STier` + `INK`/`SCROLL_GOLD` palette).
  `tsc` + `npm run build` clean.

### 15 · Teachers are provisioned, not self-signup + auth parallax

Owner: teachers don't sign up — their school admin gives them accounts. Reworked:
`/signup` is now **students only** (dropped the teacher role + school-code field);
school admins **invite teachers by email** on `/school` (`createTeacherInvite` →
`teacherInvites/{email}` + `schools.teacherEmails[]`); `ensureUserProfile` promotes
an invited email to an **approved** teacher on first sign-in; the Educator's Door
(`/teacher/login`) is sign-in only now (removed "create educator account"). Rules:
`teacherInvites` collection + `hasTeacherInvite()` gating teacher-role create and
self-promotion; school admins may edit `teacherEmails`. Also: the auth left-panel
figure now has a **mouse-parallax** (figure drifts with the cursor, backdrop leans
away; reduced-motion safe), and the figure fit was fixed so the head never crops.
`tsc` + `npm run build` clean.

### 14 · Real product on the sell pages (/learn, /schools)

Owner: the pillar cards should show the REAL product, not decorative plates.
New `src/components/MiniForge.tsx` — a compact live forge running the actual
`combine()` engine (tap two base elements → real compound or the Alchemist's
counsel). **/learn**: Pillar 1 "See it in 3D" now embeds a live `Molecule3D`
water molecule (drag to rotate); Pillar 2 "Do it, don't just read it" embeds the
MiniForge. **/schools**: added a "See the actual product" showcase — real printed
cards (`/chronicle/card-*`, theme-paired), live H₂O 3D, and the MiniForge — plus
a "What the teacher sees" educator-console preview (illustrative gradebook table +
struggling-concepts bars). Also corrected the rollout copy to the current flow
(class code + request→accept, not the old auto-join/single-code wording).
`tsc` + `npm run build` clean. NOTE: the dashboard preview is a faithful
*illustrative* mock (sample data) — real captured screenshots of the gated
teacher/admin consoles still TODO (need a seeded login to screenshot).

### 13 · Guest-page design-direction conformance pass

Applied DESIGN_DIRECTION to ALL 7 guest pages uniformly (`tsc` + `npm run build`
clean). Workbench footer band added to /about, /elements, /lexicon (landing +
/learn already had it; /schools + /grimoire got it in their de-icon pass).
**De-iconed** the three icon-heavy marketing pages — /learn, /schools, /grimoire
— removing lucide entirely (§4: no icon libraries on marketing surfaces),
replacing icons with `✦` glyphs, `.mg-num` Roman numerals, gold-dot bullets, and
`plate-*`/`seal-*` art (done via 3 parallel agents, verified after). /grimoire
also gained `grimoire-skin` + lost its decorative pill. Re-audit confirms across
all 7: grimoire-skin ✓, lucide 0 ✓, decorative pills 0 ✓, footer band ✓.

### 12 · Multi-school (multi-tenant) — Phase 1 foundation

AlcheMix is going multi-school (Google-Classroom-style). Design locked with the
owner in `docs/SCHOOL_MULTITENANCY.md`; `docs/FLOW.md` has the as-is lifecycle.
Hierarchy: Super Admin → School → School Admin → Teacher → Class → Student.
Decisions: two codes (school code onboards teachers; students still join a class
by class code via URL autofill); student enrolment becomes request→teacher-accept
(Phase 4); school admins created by super admins; schools own name/logo/branding;
super admin hardcoded for now. **Phase 1 shipped** (`tsc` + `npm run build` clean):
new `schools/{id}` collection + `src/lib/schools.ts`; `role` gains `school_admin`
(+`schoolId` on profile; `"admin"` stays = super admin); `homeForRole`/`RequireRole`
→ `/school`; `ensureUserProfile` promotes an invited email to `school_admin`;
`/admin` Schools tab (create school, regen code, designate admin by email);
minimal `/school` dashboard; `firestore.rules` for schools + invites (needs a
rules deploy). **All phases (1–5) now shipped** (each `tsc` + `npm run build` clean).

**Grade export** (`tsc` + `npm run build` clean) — the last gap from `docs/FLOW.md`
closed: `buildClassGradesCsv` + `downloadCsv` in `teacher.ts`; **Export CSV** button
in the `/teacher` Gradebook tab. Per-topic score/outOf + % + mastery + average, one
row per student, client-side Blob download (UTF-8 BOM for Excel).

**Phase 2 shipped** (`tsc` + `npm run build` clean): `/school` School Admin
dashboard rebuilt — code card (copy + regenerate), branding editor (name, logo
upload → downscaled data URL, brand-color picker), live teacher-roster card
(`useSchoolTeachers`, empty until Phase 3). Rules: a school admin can update only
their own school's name/logo/brandColor/code and read user docs in their school.

**Phase 3 shipped** (`tsc` + `npm run build` clean) — Teacher ↔ School:
(A) teacher signup has a live school-code field → `schoolId` flows through
`signUpWithEmail`/`signInWithGoogle`/`ensureUserProfile` onto the profile;
(B) `createClass(…, schoolId)` stamps classes with their school;
(C) `/school` roster gained Approve/Reject + Review-ID per pending teacher.
Rules: school admin may set `status` on their school's teachers and read/update
those teachers' verifications (super admin still can too).

**Phase 4 shipped** (`tsc` + `npm run build` clean) — student join-by-URL +
request/approval: `/school-signup?code=` (and `/school-login`) autofill; enrolment
is request-based (`requestToJoinClass` → `classes/{id}/requests/{uid}` + pending
stamps); `/app` shows a "Request sent" card w/ cancel; the teacher class card has
a **Join requests** block (Accept → roster+stamp+drop / Reject). Join button on
`/app` now says "Request". Rules: requests subcollection + teacher-created roster
+ teacher may clear pending keys.

**Phase 5 shipped** (`tsc` + `npm run build` clean) — tenant isolation + migration:
`backfillIntoDefaultSchool` (super-admin Schools-tab button) stamps school-less
teachers + classes into a reusable "Default School"; super admin may update classes.
Isolation is by role-scoping + secret codes + `schoolId` stamps (hard rule-level
cross-school read blocks deliberately deferred — see SCHOOL_MULTITENANCY §Phase 5).
**Reminder: all multi-tenant rules need `firebase deploy --only firestore:rules`.**

### 11 · Split-panel auth + /teacher/login

New shared `src/components/AuthLayout.tsx`: a two-panel card (owner ref: a
split registration concept) — the theme-aware hero character
(`real-app-hero-page/cut-figure-*` over `hero-backdrop-*`) stands on the left
with a tagline; the form fills the right; collapses to an art banner + stacked
form on mobile. All four doors — `AuthDoor` (`/login`, `/teacher/login`),
`signup.tsx`, `SchoolDoor` (`/school-login`, `/school-signup`) — refactored
onto it (full rewrites; all auth logic preserved).
- **Teacher login split out to its own URL**: `src/routes/teacher_.login.tsx`
  → `/teacher/login` (trailing-underscore de-nests it from the guarded
  `/teacher` console). Gold-accented "Educator Sign-In", distinct from the
  violet student `/login`. `/educator` kept as a still-working alias; educator
  links now point to `/teacher/login`.

### 10 · Lexicon as a dictionary + cinematic auth

- **/lexicon** index was one long scroll (31 term cards + 18 glossary rows
  stacked). Rebuilt into a browsable dictionary: two **tabs** (Chemistry Terms /
  Words of the Grimoire), **live search**, and an **A–Z filter** (dead letters
  disabled). Glossary words are now a card grid too, not a long definition list.
  Term detail view unchanged.
- **Login / signup / educator** (AuthDoor + signup.tsx) restyled to a cinematic
  full-bleed layout (owner ref: a Harry Potter "First War" login concept): the
  theme-aware alchemy-hall art fills the screen (`.auth-backdrop`, reuses the
  about hero JPEGs), a big centred title sits over it, and the form floats in a
  glass panel (translucent `--color-card` + backdrop-blur). Responsive: single
  centred column, `max-w-md`, works mobile→desktop. All auth logic untouched.
  **SchoolDoor** (`/school-login` + `/school-signup`) given the identical
  cinematic shell afterward (teal accent), so all four doors — student,
  educator, school-login, school-signup — now match.

### 9 · Nav symmetry + elements backdrop + pill-badge ban

- **FloatingNav** rebalanced to 3 links · home orb · 3 links (was 2·orb·3):
  added **Grimoire** (`/grimoire`, `Layers` icon) to the left wing; right wing
  is How It Works · Lexicon · For Schools. Labels now show from `lg` (was `sm`)
  so the wider pill can't collide with the right-pinned theme/auth controls.
- **/elements** got the theme-aware `bg-grimoire-fixed` page backdrop
  (parchment-day / night-ink) instead of flat `bg-arcane` + stars.
- **Floating pill labels banned globally** (owner, 3rd flag — "so vibecoded").
  Removed the decorative eyebrow pills from `/elements` ("All 118 Elements"),
  `/learn` ("Learning Methodology"), `/schools` ("For Schools") → plain
  typographic `<p>` eyebrows. Rule written into DESIGN_DIRECTION §11 (bans
  decorative label badges only; functional pills — filters, nav, buttons, data
  chips — are kept).

### 8 · About page v3 — the owner's Higgsfield backgrounds

Owner dropped 9 Higgsfield images in `public/about-us-page/` (hf_*). Two are
theme PAIRS: an alchemy hall (landscape) and a crystal valley (tall portrait),
each in a light and a dark cut. Wired both as **theme-aware** art (CSS swaps the
`url()` on the root `.dark` class): the hall is the hero, the valley is a
fixed, veiled page atmosphere. Originals are 4–6 MB PNGs — too heavy — so
`sips`-converted to ~440 KB JPEGs (`about-hero-{light,dark}.jpg`,
`about-page-{light,dark}.jpg`; WebP unsupported by sips on this box). Layout
fix: every section now sits on a near-opaque `PANEL` card (`--color-card` 88%)
floating over the backdrop, so text never fights the busy art — same eight
chapters, splits/plates kept inside the panels.

### 5 · Elements search bar — one unified control

The ugly stacked input + detached button + "118 highlighted" line became a single
rounded field: inline magnifier glyph, transparent input, a clear (×) when typed,
and the Search action folded to the right as a teal pill. Count moved to a quiet
right-aligned helper ("Showing all 118 elements" / "N of 118 match").

### 6 · About page v2 — image-rich, de-walled

Owner: not one long paragraph — needs images + better layout. `/about` moved from
single-column text to alternating **image/text splits** with framed `Plate`s
(grimoire book, inked Alchemist, assayer's lens, hex monolith) and a `Split`/`Plate`
helper. §2 PISA numbers are now a visual 23%-vs-76% bar comparison, not prose; §4
honest-chemistry is a 2×2 card grid beside the lens plate; §5 colophon gained an
astrolabe seal; §7 is three cards. Same eight chapters, same facts, far less wall.
Uses existing `dark-alchemy-vibe` art — **no image generation** (Higgsfield is not
available in this environment; confirmed by tool-registry search).

### 7 · Modules.MD + Higgsfield prompt pack

Added `Modules.MD` (root) — a tick-box audit checklist of all 46 routes grouped
by user level (public / student / teacher / admin) with route links, for the
owner's self-audit. Added `docs/HIGGSFIELD_PROMPTS.md` — the art brief for
per-section landing backgrounds + one tall overlapping field, baked to
`DESIGN_DIRECTION`. **No landing code changed**; wiring waits on the generated
art landing in `public/backdrops/`.

---

## 2026-10-11 (Sunday)

### 1 · The inked landing page (guest page redesign)

The marketing landing (`/`) rebuilt around the owner's new "inked mysterious
fantasy" art set in `public/Hero-Section/` and `public/Modal-Texture/`
(vintage-ink dusk sky, cloud sea, cliff + alchemical monolith, a wizard split
into body + wand-arm layers, a gold transmutation ring, parchment + scroll
rollers). Same token palette, both themes.

- **Hero** — a layered parallax scene: sky backdrop (shifted so the moon
  clears the headline), slowly revolving transmutation ring
  (`mix-blend: screen` drops its dark fills into the sky), the Alchemist on
  the summit with a gently conjuring wand arm (`wizard-arm` / `wand-ember`
  keyframes), and a height-capped drifting cloud sea in front, fading into
  `var(--color-mist)` so both themes take over below. Owner review round:
  wizard + cliff enlarged and pushed to the edge, clouds reduced (38→26vh).
  A scene-on-the-left variant (cliff mirrored) was tried and rejected — the
  sky's moon is baked near the art's centre, so on the left the moon, ring,
  wizard and nav pile up; the scene lives on the RIGHT where the moon gets
  open sky. Hero text uses fixed cream/gold inks because the artwork is fixed.
- **Chapter I — The Chronicle** ("What is AlcheMix?") — an unrolled scroll:
  `scroll-parchment` utility (parchment texture, fixed sepia inks) flanked by
  the roller artwork, with a tally row (12 cards · 118 elements · 20+
  modules · 2 sides).
- **Chapter II — The Rite** ("How does it work?") — a LIVE forging demo: all
  12 base cards from `src/lib/cards.ts`, two altar slots, and the real
  `combine()` engine. Valid mixes pop a forged compound card (formula, name,
  common name, bond badge, uses line; unstable results jitter); impossible
  mixes get the Alchemist's counsel (reason), per "failure teaches".
- **Chapter III — Marginalia** — six ink-panel feature notes (modules, AR
  scanning, element lore, AI mentor w/ keyless fallback, teacher console,
  trials/streaks) + apprentice/educator doors.
- New `styles.css` utilities: `ink-panel`, `ink-halftone`,
  `scroll-parchment`, `animate-spin-slower`, arm/ember/cloud keyframes.
- Chemistry casing guarded: element symbols and formulas render in the UI
  sans (the display font is all-caps — "NaCl", never "NACL"), matching the
  `/elements` precedent.
- Verified with Playwright screenshots (dark + light + mobile, forge
  clicked through: Na+Cl → NaCl ionic; Na+Fe → alloy counsel).

### 2 · Dark-alchemy direction study (static)

`public/design-implementation/index.html` — a standalone format test for a
possible "dark alchemy" art direction, NOT wired into the app. Fonts:
UnifrakturMaguntia (display, title-case only — it's blackletter) +
Crimson Pro (body). Art from `public/dark-alchemy-vibe/` (29 pieces: night
sky, conjurer, transmutation compass, grimoire, lens, astrolabe, crystals,
vaulted atelier, leather, torn-parchment divider, ornate frame, workbench,
plus a parallax batch: element-cliff columns H/O/C and Fe/Au/Na, the
H-C-N-O-Na-Cl stone row, gold-dust field, rune stones, ledges, archway,
lantern, cage). Owner-approved direction ("OMG I LOVE IT"), hero revised to
a CENTRED ceremony: conjurer dead-centre inside the spinning compass disc,
blackletter typography centred and layered over him (dark veil keeps it
readable), element-cliff wings + gold dust on scroll parallax (--py CSS var
so base transforms survive). The no-alpha art blends in via lighten/screen +
masks. View at `/design-implementation/index.html` on the dev server or open
the file directly. Owner is comparing this against the shipped inked landing.

Owner iteration (Canva mock supplied — `Typography.png`): hero rebuilt as a
composed SCENE matching the mock — ruined archway centred behind the
conjurer, rune cliff on the left with the floating Au crest, Cl/Mg/Si stones
on the right, grass ledge bottom-left, rock shelf bottom-right, all on
stacked depth-layer parallax (the "layers" meaning of parallax — side-wing
columns rejected). Background removal: flood-fill script
(scratchpad `cutout.py`, Pillow) produced `cut-*.png` cutouts in
`dark-alchemy-vibe/` — originals untouched. Sections reordered to Hero →
What is AlcheMix → How Does It Work (+ a WORKING mix-and-match altar: the
app's `combineCards` valence rules ported verbatim to vanilla JS, hex-stone
chips in the art's language) → Why Schools Should Implement This (astrolabe
+ roman-numeral ledger) → quote band → Marginalia → Summons → workbench.
All glyph/emoji icons removed per owner ("no generic icons / vibe-coded
look") — typography and the owner's art only.

### 3 · The ceremony hero — built, then BENCHED (owner)

Owner reverted the landing to the inked dusk hero the same night — the
ceremony component stays in the repo, fully working but UNUSED
(`src/components/AlchemistHero.tsx`; re-import into `src/routes/index.tsx`
to bring it back). Original write-up:

The landing hero (`/`) rebuilt as a layered parallax scene in TanStack
Start — `src/components/AlchemistHero.tsx`, driven by the owner's split
layers in `public/hero/` (`body`, `hand-left/right` with pivots, 17 gems,
`layers.json`; canvas 1792×2432, halo_centre [900,760]).

- **Stage**: absolute layers in canvas coordinates, one scale transform —
  everything stays registered at any size. Stack: body → halo → hands.
- **Motion**: body drifts 8px/6s alternate; hands sway ±1.5° about their
  `pivot_local` (phase-offset); pointer parallax (body .4 / halo 1.0 /
  hands 1.6) eased per frame; all neutralised by prefers-reduced-motion
  (which gets the static `gems-ring` composite instead).
- **3D halo**: Three.js overlay (alpha, orthographic camera in canvas
  units) — 12 GLB crystals (H→Mg) on the gems' ellipse, ring revolving
  ~90s/turn, each crystal spinning 0.2–0.4 rad/s; MeshStandardMaterial
  tinted per element (opacity .86, rough .18, metal .25, low emissive);
  key + dim ambient; the painted gem ring sits underneath blurred as the
  glow. Element symbols are REAL HTML labels from
  `public/crystals/manifest.json` (real Z + crystal systems) — the baked
  art lettering is not used (it isn't real chemistry).
- **Crystal assets**: `public/crystals/` generated in-repo (scratchpad
  `gen_crystals.py`) — minimal GLBs whose silhouettes follow each
  element's actual crystal system (cubic/hexagonal/monoclinic/
  rhombohedral) + manifest. Swap for authored GLBs any time; same names.
- **Performance**: devicePixelRatio capped at 2, render loop paused
  offscreen via IntersectionObserver, GLTFLoader dynamically imported,
  PNGs served as WebP with PNG fallback (`<picture>`; body 4.6MB→569KB),
  no-WebGL fallback = flat gem PNGs on CSS ring/counter rotation.
- Verified: `npx tsc --noEmit`, `npm run build`, Playwright screenshots
  (halo revolve + pointer parallax). Hydration warning on load is
  pre-existing (theme no-flash script), confirmed on /schools too.

### 4 · The overnight build — adviser P0/P1 sweep + grimoire voice

Owner went to sleep with instructions: revert the landing hero to the Bohr
atom, then clear `docs/ADVISER_FEEDBACK.md` top-to-bottom, then make the UI
prettier in the approved dark-alchemy voice. NOT pushed — owner reviews
first. Full status per item: `docs/ADVISER_RESPONSES.md`.

- **Hero reverted** to the original living Bohr atom (owner request); the
  dark-alchemy sections (scroll, live forge, marginalia) stay beneath it.
  The AlchemistHero ceremony component remains in the repo, unused.
- **Periodic table (P0 1–3, 19):** one shared `PeriodicGrid` component on
  BOTH /periodic-table and /elements; Traditional ⇄ Interactive toggle
  (Traditional default: classic cells — Z top-left, mass opposite, big
  symbol, name); /elements rebuilt from 44 blobs to the full standard 118
  chart (public), with live search + a visible Search button and bigger
  category labels.
- **Element details (P0 4):** every element card now shows melt/boil
  (K + °C), electronegativity, discovery, shells AND electron configuration
  — new `src/lib/electron-config.ts` (Aufbau + the real exception set,
  verified against textbook values incl. Cr/Cu/Pd/Au/U). Unmeasured
  constants listed in `docs/DATA_GAPS.md`, shown as "Not established".
- **Class codes (P0 5):** `joinCode` + `joinCodeExpiresAt` fields decouple
  the active code from the doc id — regenerable any time, 30-day expiry,
  revoked/expired codes get their own student-facing messages (School Door
  + Bench join card). Legacy doc-id codes still work.
- **Educator console (P0 6):** roster rows with Remove; Archive/Restore
  classes; archived classes leave the working tabs. `firestore.rules`
  updated (teachers may clear a removed student's class stamp) — REMEMBER:
  `firebase deploy --only firestore:rules`.
- **Back/Home (P0 7):** PageHeader now carries ← Back and ⌂ Home on every
  page that uses it (all modules, teacher, admin, assignments).
- **Theme (P1 9–10):** light mode lifts more (firmer glass borders, deeper
  shadows, darker muted text); ThemeToggle moved OUT of the student rail
  back to the top-right; duplicate removed.
- **Atomic Builder (P1 14 + P2 17):** Legends control (proton/neutron/
  electron colours + nucleus note); particles accept typed numbers.
- **The Lexicon (P1 15–16):** `src/lib/lexicon.ts` — 28 chemistry terms,
  each with hover preview + full page at /lexicon citing NAMED sources
  (Britannica + standard textbooks; Wikipedia explicitly avoided per
  adviser). `Term` component = Wikipedia-style hover preview; integrated on
  /elements + Atomic Builder; glossary of invented vocabulary on /lexicon
  and in `docs/GLOSSARY.md` (manuscript appendix). Lexicon added to the
  public nav.
- **Grimoire voice everywhere:** public pages wear `grimoire-skin`
  (blackletter display + Crimson Pro body); the app shells wear
  `grimoire-display` (blackletter page titles only — body stays sans for
  dense UIs). Small headings and JOIN CODES are excluded from blackletter
  (codes render in bold sans — unambiguous characters matter).
- Verified: `npx tsc --noEmit` + `npm run build` green; Playwright sweep of
  landing/elements/lexicon/learn/about/login/schools in both themes.
- Deliberately NOT built without her confirmation: item 12's category-
  control redesign and item 13's mystery typeface (see ADVISER_RESPONSES).
- **Generated backdrops (owner follow-up, same night):** two page
  backgrounds generated with Higgsfield gpt_image_2_5 (0.5 credits total) —
  `public/backdrops/night-ink.png` (engraved navy sky, gold dust, faint
  transmutation circle that lands behind the hero's Bohr atom) and
  `parchment-day.png` (aged manuscript with ghosted compass marginalia for
  LIGHT mode). Served as WebP (53/43 KB) via the new `bg-grimoire-page`
  utility (theme-gradient overlay keeps text dominant; fixed attachment on
  desktop, scroll on phones). Landing also gained the torn-parchment seam
  under the hero and drifting crystal shards behind the forge (both
  dark-only; light stays clean manuscript).

  Owner then supplied a full THEME-PAIRED art set in
  `public/real-app-hero-page/` (renamed by purpose, WebP'd): hero backdrops
  (nebula glyph arch dark / sunlit atelier hall light), grain overlays
  (gold-dust specks / ink stains), crystal frames for the forge (neon /
  inked), side accents for the chronicle (chained monolith / rope cliff),
  and summons figures (hooded conjurer / apprentice with grimoire). All
  wired into the landing with `dark:`-paired layers, readability scrims,
  and blend modes. Gotcha fixed twice: transforms AND z-index stacking
  contexts isolate mix-blend-mode — blended layers must sit on the plain
  section (no z-10, outside Reveal wrappers) to blend with the page.
  Duplicate copies of the generated backdrops in that folder were removed
  (byte-identical to `public/backdrops/`).

  Final owner round — the static page's ceremony comes to the real app:
  - **Hero rebuilt centred**: the Alchemist is the middle hero, big
    (min(86vh)) — the hooded conjurer by night, the apprentice with her
    grimoire by day (both backgrounds flood-cut; bottom fade mask grounds
    them). The interactive Bohr atom floats THEME-AWARE: between the
    conjurer's raised arms at night, levitating above the apprentice's
    open palm by day (drag-to-spin kept).
  - **Layered parallax like the static study**: backdrop, grain, figure
    and headline each drift on scroll AND lean with the cursor, eased per
    frame via rAF + refs; paused offscreen; skipped under
    prefers-reduced-motion.
  - **Theme ripple**: switching themes now FILLS the page — a circle
    growing from the toggle click (View Transitions API in
    `lib/theme.ts` + `::view-transition` CSS; instant fallback for old
    browsers and reduced-motion). Works app-wide, captured mid-animation
    in Playwright.
  - **Full hero parallax stack (owner: the whole art set is hero-only).**
    Bohr atom removed (owner). Seven theme-paired layers, each with its
    own `data-par="mouseX,mouseY,scroll"` depth: hall backdrop → grain →
    crystal frame → LEFT wing (ruined arch + thorn vines dark / ivy
    column light — the two late "random name" additions, renamed
    `side-ruins-dark` / `side-column-light`) → RIGHT wing (monolith /
    rope cliff) → centred Alchemist figure. Crystal frames and side
    accents REMOVED from the forge/chronicle/summons sections
    accordingly. Rule enforced: blend modes live on the SAME element as
    the parallax transform (ancestor transforms isolate blending).
  - **Chronicle rebuilt: typography + the deck box.** "What is AlcheMix?"
    is now two columns — the words left, and on the right a GENERATED
    card-box interaction (owner spec: must be images, not SVG): four new
    Higgsfield pieces in `public/chronicle/` (closed box, open box made
    via image_references so it is the SAME box, Hydrogen card, Oxygen
    card; ~1 credit total; white backgrounds flood-cut, WebP'd). Hover or
    tap: the box opens (teal glow inside), dips down slightly, and the
    two cards rise out into a line above it, staggered, with a spring
    curve. The parchment scroll + rollers left the landing (Modal-Texture
    assets now unused there). Owner follow-up: a NIGHT EDITION of the
    whole set (midnight box w/ glowing seal, teal-H and ember-O cards;
    4 more reference-chained generations, ~1 credit) — the deck now swaps
    editions with the theme like everything else.
  - **Performance pass (owner: "parallax feels laggy, site heavy").**
    Fixes, in order of impact: (1) `background-attachment: fixed` on the
    page backdrop repainted the entire page every scroll frame — replaced
    with a GPU-composited `position:fixed` div (`bg-grimoire-fixed`);
    (2) the hero tagline's `backdrop-filter: blur` re-blurred the moving
    figure every frame — now a plain veil; (3) every parallax layer got
    `will-change-transform` (own compositor layer, no re-raster);
    (4) all decorative WebP textures downscaled to ~display size
    (e.g. light hall 966→443 KB, backdrops 1792 px wide; PNG sources kept
    full-res); (5) pointer-ease 0.06→0.12 (the "slow" feel) plus an idle
    guard that skips all style writes when nothing moved. Measured: ~58
    FPS during scripted continuous scroll in Playwright.
  - **Theme-switch lag (follow-up):** three fixes — (1) idle-time prefetch
    + decode of BOTH themes' artwork (CSS backgrounds on display:none
    layers are not fetched until shown, so the first flip used to stall
    on network+decode mid-ripple); (2) the hero parallax loop holds still
    while the ripple plays (`data-theme-ripple` attr set by lib/theme.ts);
    (3) ripple shortened 0.9→0.55 s; `content-visibility:auto` on the
    below-fold landing sections so the theme's full style recalc skips
    offscreen content. Note for posterity: in-page rAF measurements
    during a view transition are throttled by the API itself (42 FPS even
    on the near-empty /lexicon) — the ripple animation runs on the
    compositor and is smoother than those numbers suggest.

Note: `public/` still holds ~35 raw `hf_*.png` generation leftovers (~45 MB)
plus duplicate `wizard-*.png` and `Inked-fantasy-illustration…png` at the
root — the curated copies live in `Hero-Section/`. Worth pruning before a
deploy; left untouched pending owner say-so.

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

### 12 · Email sign-up verification via Brevo (server-side)

Student sign-up is now **verify-before-create**: the Firebase Auth account is
only created after a 6-digit code emailed through **Brevo** checks out, so
unverified addresses never enter Auth.

- **`src/lib/server/brevo.ts`** (SERVER-ONLY, never imported client-side): the
  code is signed as a **stateless HMAC token** (`${expiry}.${hmac(email|code|
  expiry)}`, Web-Crypto `subtle`) — no Firestore store needed, edge-safe. The
  code lives only in the email; the token carries just expiry + signature.
  10-minute TTL, constant-time compare. Keyless fallback: with no
  `BREVO_API_KEY`, the code is logged to the server console so dev still works.
- **`src/lib/email-verify.ts`**: `requestEmailCode` / `verifyEmailCode`
  `createServerFn` handlers. The **password never reaches the server** — it
  stays in the browser and is only passed to `createUserWithEmailAndPassword`
  after `verifyEmailCode` returns ok.
- **`src/routes/signup.tsx`**: two steps — details → 6-slot OTP (`InputOTP`,
  on-theme gold slots) with a 30s resend cooldown and a "keyless dev mode" hint.
- **The email** is an on-theme grimoire HTML (table layout, inline styles,
  ink-navy / antique-gold / teal, serif stack) — subject "Your AlcheMix sigil".
- **Env:** took Gemini + Brevo + Cloudinary from the owner's paste; **Firebase
  left untouched** (still hard-coded `alchemix-grimoire` in `firebase.ts`).
  Brevo is **server-side** (`BREVO_API_KEY`, no `VITE_`) unlike the source
  project's browser-send pattern, so the key stays off the bundle.

### 13 · MODULE_CATALOG completed — all modules assignable

`MODULE_CATALOG` (`src/lib/teacher.ts`) grew from 15 to **24** entries so a
teacher's Mission can target every practice-logging module. Added:
`solutions`, `thermo`, `rates`, `equilibrium`, `electro`, `forces`, `grimoire`
(/cards), `identifier`, `scanner` — each with its real route + `practiceKey`
(verified against the `logPractice(...)` call sites). Quizzes remain
curriculum-topic based (no `moduleId`) by design.

### 14 · Super-admin console — rebuilt in the app's design language

`/admin` (`src/routes/admin.tsx`) was restyled from the flat header + pill-tabs
layout to match the student side's quality:
- A floating **`glass-strong` left sidebar** (desktop) — logo, labeled section
  nav with `orb-rune` icons + active spine marker (wraith accent), theme toggle
  + sign-out pinned at the foot. Mobile: `glass-strong` top bar + a horizontal
  scrollable section strip.
- `bg-arcane` + `bg-aurora` ambience (same as `StudentShell`), content cleared
  to `md:pl-[16.5rem]`, capped `max-w-5xl`.
- Every panel is now a `glass` card; stat tiles, quick-action cards, the
  verification/teacher/user/class/school cards all use `orb-rune` badges and
  `SectionHead` (blackletter title + eyebrow). All data hooks and actions
  (`usePendingVerifications`, `approveTeacher`, `createSchool`, …) unchanged.

### 15 · Separate, role-locked technical logins

Each admin tier now has its OWN minimalistic sign-in (no shared login):
`/admin/login`, `/school/signin` (NOT `/school/login` — that id collides with
the student class-code door `/school-login` in the generated route tree),
`/teacher/login`. All render `src/components/TechLogin.tsx`, which signs in,
checks the role matches, and bounces a wrong-role account back out. Three test
accounts were seeded (see `docs/TEST_ACCOUNTS.md`); `superadmin@gmail.com` was
added to `ADMIN_EMAILS` + `isAdmin()` and the rules deployed.

### 16 · Super admin CREATES the school-admin account (not an email invite)

The `/admin` → Schools flow changed: **New school** now collects the school name
*and* the admin's name/email/password, and creates both in one step
(`createSchoolWithAdmin` in `schools.ts`). The admin's real Firebase Auth account
is minted on a **throwaway secondary Firebase app** (`admin-create-*`) so the
super admin's own session is never hijacked by `createUserWithEmailAndPassword`;
the new user's `users/{uid}` profile is written AS that user (satisfying the
create rule via the `schoolAdminInvites` doc written first). Each school card can
mint more admins (`createSchoolAdminAccount`). The admin signs in at
`/school/signin` immediately — no self-signup, no verification code. The moving
`ArcaneField` backdrop was also added to `/admin`.

### 17 · Super-admin build — Phase 1 (core CRUD + audit log)

Scoped per owner: super-admin routes first; reuse components for school-scoped
admin later. **No separate school-admin console in this pass.**
- **Audit log** (`src/lib/audit.ts`) — append-only `auditLog/{id}` collection;
  `logAudit(action, target, details)` (best-effort, never throws) is called by
  every privileged mutation; `useAuditLog(n)` drives a read-only **Audit log**
  tab (newest first).
- **User CRUD** (`admin.ts`): `updateUserAdmin` (role/status/schoolId/displayName
  ONLY — grades/mastery/practice are never editable, per scope), `deleteUserProfile`
  (profile doc only — the Auth credential can't be removed client-side),
  `createUserAdmin` (student/teacher/school_admin via the secondary-app helper +
  the right invite). Users tab gained search, **New user**, per-row edit/delete.
- **School CRUD** (`schools.ts`): `updateSchool` (name/brand/active), `deleteSchool`
  (no cascade — warns), plus the existing create+code+admin. Cards gained
  edit/delete + an inactive badge. Extracted `createAuthUserWithProfile` (generic
  secondary-app account creator).
- **Verification review** unchanged in behaviour; now audited.
- **Rules (MUST DEPLOY):** `users` delete → `isAdmin()`; new `auditLog` match
  (read `isAdmin`, create `isAdmin || isSchoolAdmin`, no update/delete).
- Out of scope (owner): editing grades/mastery/practice, live quiz, analytics.
- **Next:** Phase 2 (class management, card catalogue, Emporium catalogue);
  Phase 3 (overview dashboard, system status, DPA export/erasure) if time allows.

### 18 · Teacher + school-admin consoles — polish pass

Brought `/teacher` and `/school` up to the superadmin look (owner: "somewhat
polished, I'll do bongga next time"): swapped the static `bg-aurora`/
`bg-arcane-stars` backdrops for the moving **`ArcaneField`**, and cleared the
same blackletter-on-data bug — `.font-display` on names/labels/scores/buttons/
indices → readable `font-ui` (empty-state titles promoted to `<h3>`, which
renders Crimson Pro). Headings keep blackletter. A fuller glass pass on the
teacher tab-rail/cards is still available for later.

### 19 · School-admin: full teacher accounts + embedded class code; no code regen

Per owner: the school admin can **no longer regenerate the school code** (removed
from `/school` CodeCard — only a super admin can). "Add teacher" now **creates
the full account** (name + email + password) via `createTeacherAccount`
(`schools.ts`, secondary-app pattern): the teacher is bound to the school
(`schoolId` + `schoolCode` embedded), auto-approved, and a **class is
auto-created at the same moment** so a shareable join code is embedded from day
one. Students who enter that code are grouped with that teacher — which is what
the class-based assignment loop needs. The console shows each teacher's class
code (copyable) via the new `useSchoolClasses` hook.

Verified the data-flow simulation is adequate end-to-end: teacher assigns
(class doc) → student (joined via the code, teacher-accepted) sees it at
`/assignments` → takes the quiz (score persisted to `assignmentResults`) →
student sees their score + teacher sees it in `QuizResults` → teacher exports
via `buildClassGradesCsv`/`downloadCsv`. No NEW rules needed (teacher-invite +
class-create-by-teacher are already permitted); the pending Phase-1 deploy
(auditLog + user-delete) is still the only outstanding rules change.

### 20 · Code wording fix, console nav, demo guide

- Student door (`SchoolDoor`): the field was mislabeled **"School code"** but it
  resolves a **class** code — relabeled to **"Class code"** everywhere (label,
  hint, errors, the `/login` + AuthDoor prompts). Lookup logic unchanged. Model
  locked: **school code groups** the institution; **class code enrols** a student
  to a specific teacher/section.
- `PageHeader` gained `hideNav`; the Back/Home pills are removed from the
  **teacher** and **school** consoles (they ARE home) but kept on student module
  pages (adviser item 7).
- New `docs/SIMULATION_GUIDE.md` — a step-by-step demo script for presenting the
  full data-flow to the adviser (Mam Lucy), with page links + test accounts.
- **Owner chose Option B** for missions (lock a module's trial until assigned,
  record the trial score back to the teacher) — NOT yet built; it changes the
  student trial experience across ~15 module routes, so sequence it AFTER the
  presentation to keep the demo stable.

### Decisions & reminders

- **Brevo/Cloudinary keys are from the owner's paste (originally a different
  project) — rotate before a public demo**, same caution as the Gemini key.
  Sender `jherlyndelacruz24@gmail.com` is a verified Brevo sender; **deactivate
  Brevo "Authorised IPs"** (serverless egress is dynamic). In prod set
  `BREVO_API_KEY` via `wrangler secret put`, not `VITE_`.
- **Known rules hole:** `firestore.rules` leaves the `config` collection
  `allow read, write: if true` (TEMP) — restore `allow write: if isAdmin()`
  before public use.
- CMS: deferred by owner — do not start.
- Module direction discussion: parked for later (owner).
- `firebase deploy --only firestore:rules` still required for the School
  Door's pre-auth code lookup.
- The pasted Gemini key is dev-only: rotate before public demo; use
  `wrangler secret put GEMINI_API_KEY` in production.
- "Send us your account details" surprise copy flagged once as
  phishing-adjacent for a school app; owner kept it.
