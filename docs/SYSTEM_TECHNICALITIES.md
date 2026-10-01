# AlcheMix — System Technicalities

> What the system is made of and how the pieces connect, for thesis
> documentation and future sessions. Written 2026-10-01; verify against the
> code if much time has passed (the code always wins). Companions:
> `DATA_INVENTORY.md` (stores D1–D9, DFD/ERD source of truth), `LOGS.md`
> (day-by-day history), `ALGORITHM_OF_THE_SYSTEM.md` (mechanics).

## 1. Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | TanStack Start (React 19, Vite 8) | File-based routes in `src/routes/`; `src/routeTree.gen.ts` is generated — never hand-edited |
| Styling | Tailwind CSS v4 + CSS custom-property tokens | `var(--color-gold)` etc.; every surface works in dark AND light (`.dark` class on `<html>`) |
| Fonts | Cyberjunkies (display) · system sans (`--font-ui`) · EB Garamond (serif) | Three voices, never mixed (SCOPE rule 8) |
| Auth + data | Firebase Auth + Firestore | Client SDK only; security enforced by `firestore.rules` |
| 3D / AR | Three.js + MindAR | AR targets compiled to `public/targets.mind` (`npm run compile:ar`) |
| On-device vision | TensorFlow.js COCO-SSD (`lite_mobilenet_v2`) | Loaded lazily, cached per session (`src/lib/element-vision.ts`) |
| Generative AI | Google Gemini via REST | `gemini-flash-latest`, Lite fallback; server-only (§4) |
| Server/deploy | Nitro → Cloudflare | `npm run build` → `.output/`; deploy via wrangler |

## 2. Application architecture

**Two-sided by design** (`src/lib/platform.ts`): the desktop website is the
deep-study side (simulations, lessons, trials); a phone browser or the
installed PWA is the *capture companion* (AR Scanner, Scavenger Hunt,
Element Identifier). `usePlatform()` detects standalone display-mode, mobile
user agents (including iPadOS-as-Mac), and coarse-pointer touch; camera
modules render a `MobileHandoff` QR panel on the wrong side. Detection is
client-only — nothing platform-specific is rendered until `ready`.

**Route surface.** ~40 file routes. Public: `/`, `/about`, `/schools`,
`/elements`, auth pages (`/login`, `/signup`, `/educator`, `/school-login`,
`/school-signup`). Student routes are wrapped in `RequireAuth` /
`RequireRole`; teacher/admin consoles live at `/teacher`, `/admin`.

**Student shell.** `StudentShell.tsx` renders the whole student chrome: a
floating chapter rail (desktop), ⌘K Table of Contents, bottom pager, mobile
tab bar + sheet, the Ask-the-Alchemist chat, and the first-login
walkthrough. One `NAV` array is the single source of module order/chapters;
`config/modules` (Firestore, live) curates visibility; `ARCADE_HIDDEN`
benches the Arcade chapter wholesale. New modules register in THREE places:
`app.tsx` (`MODULES`), `StudentShell.tsx` (`NAV`), `guide.ts` (`GUIDE`).

## 3. Identity, roles, and rules

- Roles: `student` / `teacher` / `admin` on `users/{uid}.role`; teachers
  additionally need `status: "approved"` (ID + face-match verification
  reviewed in `/admin`). `homeForRole()` routes after sign-in.
- The **School Door** (`/school-signup`, `/school-login`) looks a class code
  up live (`classes/{CODE}` — the join code IS the document id) before any
  account exists, then enrols on auth (roster entry + `classId` stamp).
- `firestore.rules` highlights: users may edit their own doc except
  `grades/mastery/role/status`; approved teachers may edit only
  grades/mastery; class docs are `get`-public (code lookup) but `list`
  requires sign-in; everything else denies by default. `config/*` writes are
  TEMP-open for owner testing — restore `isAdmin()` before student use.

## 4. The AI layer

All generative AI flows through `src/lib/ai.ts` as TanStack
`createServerFn` handlers — the key (`GEMINI_API_KEY`, `.env` locally /
wrangler secret in prod) never reaches the browser. `src/lib/server/gemini.ts`
owns the REST call: strict-JSON responses via `responseSchema`, model
`gemini-flash-latest` (pin with `GEMINI_MODEL`), **one retry on 503/429,
then a hop to `gemini-flash-lite-latest`** before giving up.

Seven capabilities, every result tagged `source: "gemini" | "fallback"` and
every one usable keyless (non-negotiable principle):

| Server fn | Used by | Keyless fallback |
|---|---|---|
| `aiAskAlchemist` | mentor chat (every page) | rule-based reply |
| `aiVerifyMission` | Scavenger evidence | teacher manual review |
| `aiScanFrame` | Scavenger live frame | COCO-SSD only |
| `aiIdentifyItems` | Element Identifier lens | COCO-SSD + `CLASS_ELEMENTS` composition map |
| `aiStarterQuiz` | Daily Starters | the curated question bank |
| `aiGenerateProblem` | Gas Laws trial | seeded local generator |
| `aiGradeAnswer` | Titration assay | local grader |

`useAI()` is the client wrapper (busy/error/configured state); `aiPing`
self-tests once per load and logs the verdict to the console.

## 5. Data model (summary — see DATA_INVENTORY.md for the full map)

One profile document per user (`users/{uid}`, store **D2**) carries nearly
everything student-side: practice counters (engagement, never grades),
trials bests, aurum/inventory, grimoire + forged cards, SM-2 `reviews`,
`starterStreak`/`starterHistory`, `dropVessels`, assignment results.
Classes (**D4**) embed quizzes/missions as arrays; rosters (**D5**) carry
denormalized leaderboard stats. Duels (**D6**) hold serialized engine
state. Evidence photos (**D3**) store downscaled data-URLs (or Cloudinary
URLs when configured). Curriculum, periodic-table data, lore, card data are
static in-code (**D9**) — no CMS, deliberately (deferred by owner).

## 6. Media pipeline

Camera frames are downscaled client-side (`downscaleImage`, ≤720 px JPEG)
before leaving the device — both for Gemini calls (raw base64, no prefix)
and Firestore storage limits. COCO-SSD draws live reticles on an overlay
canvas; Gemini reasons about the captured still. Canvas gotcha learned the
hard way: CSS `var()` does not resolve inside canvas paint styles — resolve
via `getComputedStyle` first.

## 7. Offline, theming, caching

- `public/sw.js`: conservative precache of the app shell (versioned cache).
- Theme: `.dark` on `<html>`, set pre-paint by `NO_FLASH_SCRIPT`, persisted
  in localStorage; neon glow utilities disable themselves in light mode.
- localStorage (**D8**) also holds the same-day Daily Starters question
  cache, Codex intro flag, duel bookmarks.

## 8. Build, verify, deploy

- `npx tsc --noEmit` and `npm run build` are the definition of done.
- Dev: `npm run dev` (Vite, port 8080; Nitro loads `.env`).
- Prod: Cloudflare via Nitro preset; secrets via `wrangler secret put`.
- Camera/AR flows are only truly verifiable on a phone over HTTPS.

## 9. Known TEMP states (as of 2026-10-01)

- `ARCADE_HIDDEN = true` (StudentShell) — Arcade benched, owner will restore.
- `config/*` Firestore writes open (owner testing) — tighten to admin.
- Updated `firestore.rules` (public class `get`) awaiting deploy.
- Gemini key in `.env` is dev-only; rotate for any public demo.
