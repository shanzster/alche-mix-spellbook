# AlcheMix — Design Direction

> The living record of the visual direction the owner has approved — what the
> "AlcheMix look" IS, the rules that keep it coherent, and the recipes that
> make it work technically. Update this doc in the same commit as any visual
> change that sets a new precedent. Companion docs: `SCOPE.md` (principles),
> `LOGS.md` (how we got here).
>
> Origin: the owner's approved static study at
> `public/design-implementation/index.html` ("OMG I LOVE IT") — the real app
> is converging on that page's voice. Last updated: 2026-10-12.

---

## 1 · The vibe, in one line

**A premium dark-alchemy grimoire**: an illuminated manuscript by day, an
engraved night ceremony after dark — real chemistry presented as treasure.

Touchstones: vintage engraved ink illustration, gold filigree on parchment,
glowing crystals, blackletter headings, tipped-in plates like an old book.
NOT: flat SaaS, generic icon grids, neon gamer UI, anything that reads
"vibe-coded".

## 2 · Typography (the voice)

| Role | Font | Rules |
|---|---|---|
| Display | **UnifrakturMaguntia** (blackletter) | Title-Case ONLY, never all-caps. LARGE sizes only (h1/h2, hero text). Small headings fall back to Crimson Pro semibold — tiny blackletter is unreadable. |
| Body / serif voice | **Crimson Pro** (with EB Garamond fallback) | Paragraphs, buttons, taglines on marketing pages. Italic for flavour lines. |
| Data strings | UI sans, bold | Join codes, element symbols, formulas — anywhere character ambiguity matters. Chemical casing is sacred: `NaCl`, never `NACL`. |
| App interior | `--font-sans` body + blackletter page titles | See the two skins below. |

Loaded via Google Fonts in `src/routes/__root.tsx`. Cyberjunkies remains the
fallback brand font.

**The two skins** (in `src/styles.css`):
- `.grimoire-skin` — full voice (serif body + blackletter display + gold
  plates). For GUEST pages: landing, /about, /learn, /schools, /lexicon,
  /elements, auth doors.
- `.grimoire-display` — light touch (blackletter page titles only, sans body
  kept). For app shells (StudentShell, teacher, admin) — dense UIs stay
  readable.

## 3 · Colour

Token-driven, both themes always (SCOPE principle 7). The palette family:
deep ink navy (`--mist` dark `#0b1220`), warm parchment cream (light
`#f6f3ec`), antique gold (`--gold`), teal (`--emerald-elixir`, primary),
violet (`--wraith`). Gold is the ornament colour of the grimoire look —
rules, seals, frames, tallies. Teal is the arcane glow. Never invent new
hex values in components; use the tokens.

## 4 · Ornament rules

- **NO icon libraries on marketing surfaces.** Lucide/generic icons read
  "vibe-coded" (owner, twice). Use instead: Roman numerals (`mg-num` style),
  gold hairlines, ✦ glyphs, or real art. Small functional icons inside the
  app's dense UIs are tolerated.
- **Plates, not pictures**: `ink-panel` = double gold-ruled engraving plate
  (+ optional `ink-halftone` grain). Art images are presented as **tipped-in
  plates**: `rounded-2xl overflow-hidden` + 1px gold-mix border + deep soft
  shadow + optional caption strip on `--color-slate-sunken`. This works in
  BOTH themes with zero blending tricks because the art keeps its own
  background.
- **Seals**: square art cropped `rounded-full object-cover` with a gold ring
  + glow — used as section emblems (astrolabe = educators, compass = CTA,
  lens = analysis).
- **Bands**: full-width art strips — torn-parchment seam between chapters,
  workbench band masked into the footer of every guest page (top-fade mask).
- Brand vocabulary in copy: Grimoire, forging, trials, Codex, aurum, the
  Alchemist, apprentices. Never coin new fantasy words (no "atelier").

## 5 · The hero formula (landing)

Centred ceremony, layered parallax — the Alchemist is the middle hero, big:
1. Hall backdrop (theme pair) — slowest layer
2. Grain overlay (gold dust / ink stains)
3. Crystal frame ringing the edges
4. Side wings (left ruins/column, right monolith/cliff) — fastest
5. The Alchemist figure (cutout, bottom-fade mask) — drifts WITH the cursor
   while everything else leans away
6. Centred blackletter headline over the figure (dark veil for legibility),
   tagline + CTAs in a soft mist band at the foot

Every layer: `data-par="mouseX,mouseY,scroll"` + `will-change-transform`.
One rAF loop, eased pointer (0.12 lerp), idle guard, paused offscreen and
during theme ripples, disabled under prefers-reduced-motion.

## 6 · Theme pairing (non-negotiable)

Every piece of fixed art ships as a DAY and NIGHT edition, swapped with
`dark:` / `dark:hidden` classes — backdrops, grains, frames, wings, figures,
even the chronicle deck box and its cards. Generate night editions by
image-referencing the day edition (gpt_image_2_5 `image_references`) so the
design stays identical across editions. Theme switching is a RIPPLE: the new
mode fills the page as a circle from the toggle (View Transitions API in
`src/lib/theme.ts`; instant fallback).

## 7 · Signature interactions

- **The deck box** (What is AlcheMix): closed box → hover/tap → box opens
  (glow inside), dips down, two cards rise into a line. Real generated
  images, no SVG. Spring cubic-bezier(.34,1.56,.64,1), staggered delays.
- **Scroll-reveal** on sections (opacity + 28px rise).
- **Theme ripple** (above).
- Chemistry interactions stay REAL: the landing forge demo runs the actual
  `combine()` valence engine; impossible mixes get the Alchemist's counsel.

## 7b · App-shell navigation (student = the reference)

The student shell (`StudentShell.tsx`) is the canonical app-shell chrome; the
teacher and admin consoles mirror it so the whole product feels like one book.

- **Desktop:** a slim floating `glass-strong` rail pinned left-centre (crest →
  section runes with a teal active spine-marker → contents/theme/sign-out),
  no top bar. Hover name-chips.
- **Mobile:** a floating `glass-strong` top bar (logo + title + theme) **and a
  fixed `glass-strong` bottom tab bar** (`bottom-2 inset-x-2 h-16`,
  `justify-around`) — one tab per section, a 2px teal top-marker on the active
  tab, `text-[10px]` labels. Thumb-reachable; never an in-content scroll strip.
  Pages reserve `pb-28` on mobile so nothing hides behind the bar.
- **Overflow (>5 sections, e.g. the teacher console):** the bar shows the first
  few primary sections + a **“More”** slot that opens a bottom sheet (same
  `sheet-up` + `orb-rune` language as the student chapter sheet) with the rest;
  “More” carries the active top-marker when the current section lives inside it.
  On desktop the rail just scrolls (`scroll-slim`, `overflow-y-auto`).
- **Guest `FloatingNav` (landing/marketing)** is a DIFFERENT pattern — a single
  centred pill with the logo orb seated in its middle. On mobile the six links
  collapse behind a hamburger (glass sheet under the pill); the pill keeps only
  logo + theme + auth so it can't overflow a narrow phone.

## 8 · Technical guardrails (learned the hard way)

- `mix-blend-mode` must live on the SAME element as any transform —
  transforms and `z-index` stacking contexts on ancestors isolate blending
  (white-box bug). Prefer flood-cut transparencies (`cutout2.py` in the
  session scratchpad pattern — dark-bg and white-bg keyers) over blending.
- No `background-attachment: fixed` — use a `position:fixed` backdrop div
  (`bg-grimoire-fixed`).
- **Never parallax a `mix-blend-mode` layer, and never move a layer BEHIND
  one.** A blended layer re-rasterises against its backdrop every frame the
  blend or the backdrop moves — 8 blended hero layers over a moving backdrop was
  the landing's scroll jank. Fix (landing hero): grain, crystal-frame, side
  wings AND the backdrop are STATIC; only the (non-blended) Alchemist figure +
  headline parallax, on top of the already-composited scene. Keep it that way.
- No `backdrop-filter` over animated layers.
- Serve decorative art as WebP at ~display size (PNG masters stay full-res).
- `content-visibility: auto` on below-fold marketing sections.
- Prefetch + decode BOTH themes' art at idle (CSS backgrounds on
  display:none don't load until shown → first theme flip stalls otherwise).
- Reduced motion: every loop and animation must check/respect it.
- **3D viewers MUST pause their render loop off-screen** (IntersectionObserver
  gating `requestAnimationFrame`) — a three.js loop that renders every frame
  while scrolled away is a constant GPU/CPU drain (this caused site-wide lag).
  Both `Molecule3D` and `BohrModel3D` do this. On MARKETING pages, load three.js
  lazily (`LazyMolecule3D` — dynamic import + visibility gate) so the ~550 KB
  chunk never hits first paint.
- **Serve UI/art at display size.** Keyed cutouts in `public/ui/` are ≤400 px;
  don't ship 1024² PNGs for 48 px emblems.

## 9 · Asset map (what lives where)

| Folder | Contents |
|---|---|
| `public/real-app-hero-page/` | Landing hero layers ONLY (owner's rule): theme-paired backdrops, grains, crystal frames, side wings, figure cutouts (`cut-*`). |
| `public/chronicle/` | Deck-box interaction: box closed/open + H/O cards, day & night editions (`*-dark`), `-src` = uncut masters. |
| `public/dark-alchemy-vibe/` | The 29-piece art library + named derivatives: `plate-*` (illustration plates), `seal-*` (round emblems), `band-*` (strips), `ornament-rings` (transparent), `cut-*` (transparencies). |
| `public/ui/` | 34 keyed custom game-UI cutouts (owner's `OTHER ASSETS`, flood-keyed to transparency): `close-button`, `check-button`, `arrow-button`; `banner-*`, `divider-*`, `nameplate-gold`, `tooltip-parchment`; `medal-*`/`badge-*`/`emblem-atom` (craft ranks); `potion-*`/`flask-*`/`beaker-*`, `mortar-pestle`/`bunsen-burner`/`test-tube-rack`/`grimoire-book`/`scroll-diploma`/`scepter-wand` (lab objects); `icon-*`, `frame-*`. Source originals stay in `public/OTHER ASSETS/` (can be deleted to slim the deploy). |
| `public/backdrops/` | Generated page backdrops (night-ink / parchment-day) for `bg-grimoire-fixed`. |
| `public/hero/` | Split ceremony layers + `layers.json` (the benched AlchemistHero component). |
| `public/crystals/` | Generated element GLBs + manifest (benched with AlchemistHero). |
| `public/Hero-Section/`, `Modal-Texture/` | The earlier inked-dusk direction (sky/clouds/cliff/wizard, scroll + rollers) — superseded on the landing but reusable (scroll texture, rings). |

Generation style prompt anchor: *"vintage engraved ink illustration with
watercolor tint — parchment, deep navy, antique gold, teal glow"*. Always
generate on pure white (or near-black) and flood-cut; chain
`image_references` for same-object variants. ~0.25 credits/image.

## 10 · Status / to-do

- **Guest-page conformance pass complete (2026-10-14).** All 7 guest pages
  (`/`, /about, /learn, /elements, /lexicon, /schools, /grimoire) now verified:
  `grimoire-skin` ✓, NO lucide/icon libraries ✓ (icons → `✦` glyphs, `.mg-num`
  numerals, gold-dot bullets, `plate-*`/`seal-*` art), NO decorative pill labels
  ✓, workbench footer band ✓. `tsc` + `npm run build` clean.
- **Done (2026-10-14):** auth doors carry a faint **compass seal** watermark
  behind the form (in `AuthLayout`); /lexicon header gained an **astrolabe seal**
  (gold ring + glow). The static study page remains at `/design-implementation/`
  as the reference artifact.
- Benched, kept in repo: `AlchemistHero.tsx` ceremony component (Bohr-era),
  the Bohr hero itself.

## 11 · Precedents set 2026-10-14

- **Loading state = `AlcheLoader`** (`src/components/AlcheLoader.tsx`), never a
  spinning icon. Gold-filigree round-bottom flask, teal elixir that breathes,
  rising bubbles; no rotation; all motion paused under `prefers-reduced-motion`.
  Use `<AlcheLoader label=… />` full-screen, `<FlaskMark />` inside a shell.
- **NO floating pill labels. ANYWHERE. (Owner rule — do not reintroduce.)**
  A decorative pill = a `rounded-full` + border/tinted-bg + small `uppercase`
  `tracking-[…]` eyebrow badge sitting above a heading (e.g. the old
  "ALL 118 ELEMENTS", "About AlcheMix AR"). The owner has flagged these three
  separate times as "so vibecoded" — they are banned on every page, marketing
  or app. Replace them with a **plain typographic eyebrow**: a bare `<p>` with
  `text-xs tracking-[0.3em] uppercase` in a muted accent, no border, no bg, no
  rounding. (This does NOT ban functional pills — interactive filter chips,
  nav links, auth buttons, data chips keep their pill shape; the ban is on
  decorative *label* badges only.)
- **Marketing pages carry NO icon library.** The `/about` rebuild dropped
  lucide entirely and uses typographic ornament only: `.mg-num` numerals
  (numeral + gold rule) in place of icon chips, `✦` glyphs, real art plates/bands.
- **Honest first, poetry second.** A marketing page's opening paragraph must be
  plain enough to survive a reader who's never heard of AlcheMix; grimoire voice
  comes after. Stated limits ("illustrative, not research-grade") are a feature.
- **Modals are scriptures, not squares** (`ScriptureModal`, 2026-10-14). An
  ornate roller rod (`Modal-Texture/roller.png`) at each end of a parchment body
  (`Modal-Texture/parchment.jpg`) that UNROLLS open — horizontally on desktop,
  vertically on phones — with a roll-up close; reduced-motion opens instantly.
  The scroll surface is ALWAYS cream, so its content uses fixed ink colours
  (`INK #2c1f0e`, `INK_SOFT #6b5231`, `SCROLL_GOLD #8a5a12`, category darkened via
  `color-mix(cat 52%, INK)`), NOT theme tokens. First applied to the element modal.
- **Auth is email/password only** — no third-party (Google) sign-in, to minimise
  login-error surface. Signup collects atomic name parts + optional school.
- **Admin/educator consoles wear the `grimoire-display` shell, same family as the
  student app** (set with the `/admin` rebuild, 2026-10-14). Pattern: a floating
  `glass-strong` sidebar (logo + labeled nav with `orb-rune` section icons and an
  active spine marker) over `bg-arcane` + `bg-aurora`; content in `glass` cards
  with `SectionHead` (eyebrow + blackletter title) and `orb-rune` badges. The
  super admin's accent is **wraith** (violet); teal/gold are secondary. Do NOT
  fall back to flat pill-tab + slate-card layouts for management UIs.
- **`ArcaneField`** (`src/components/ArcaneField.tsx`, 2026-10-14) — the premium
  moving backdrop: large teal/violet/gold gradient orbs orbiting in slow circles
  behind the glass (pure-CSS `@keyframes arcane-spin`, token colours, frozen under
  `prefers-reduced-motion`). Use it in place of the static `bg-aurora` when a
  surface should feel alive (first set on `/admin`). Keep orbs blurred + low-
  opacity so content stays legible.
- **Technical/internal logins are minimalistic and role-locked** (`TechLogin`):
  plain centred card, no grimoire art, one dedicated door per role — they are
  tooling, not marketing surfaces.
