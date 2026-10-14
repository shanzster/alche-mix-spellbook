# AlcheMix — Reviewer Brief (2026-10-14)

> A single-page orientation for the reviewer: what the system is, what changed
> in this build, how the three admin tiers work, and the exact fonts, colours,
> and AI tooling used. Companion docs: `SCOPE.md` (the scope contract),
> `docs/DESIGN_DIRECTION.md` (full visual spec), `docs/LOGS.md` (dated dev log),
> `docs/TEST_ACCOUNTS.md` (accounts to log in with).

---

## 1 · What AlcheMix is (30 seconds)

An **alchemy-themed chemistry learning app** for middle/high-school students,
built around real, textbook-accurate chemistry wrapped in a grimoire narrative.
TanStack Start (React) · Tailwind v4 (CSS-token theming, dark + light) ·
Firebase Auth + Firestore · Gemini for AI features (with keyless fallbacks) ·
AR via Three.js + MindAR. ~25 student modules, plus teacher, school-admin, and
super-admin consoles.

---

## 2 · What changed in this build (2026-10-14)

### a. Email-verified sign-up via Brevo (NEW)
Student sign-up is now **verify-before-create**: a 6-digit code is emailed
through **Brevo**, and the Firebase account is only created once the code
checks out — unverified emails never enter Auth.
- `src/lib/server/brevo.ts` — server-only. Stateless **HMAC token** (no
  database store; the code lives only in the email). 10-minute expiry. On-theme
  grimoire HTML email.
- `src/lib/email-verify.ts` — `requestEmailCode` / `verifyEmailCode` server
  functions. The password never leaves the browser.
- `src/routes/signup.tsx` — two steps: details → 6-digit code entry (resend
  with 30s cooldown).

### b. Teacher assignments now cover every module
`MODULE_CATALOG` (`src/lib/teacher.ts`) expanded from 15 → **24** modules, so a
teacher's **Mission** can target any practice-logging activity (added
Solutions, Thermo, Rates, Equilibrium, Electro, Forces, Grimoire/cards,
Identifier, Scanner).

### c. Environment wiring
Took the owner-provided **Gemini**, **Brevo**, and **Cloudinary** credentials
into `.env`. **Firebase was deliberately left untouched** (still the hard-coded
`alchemix-grimoire` project in `src/lib/firebase.ts`). Brevo is sent
**server-side**, so its key is never in the browser bundle.

---

## 3 · The three admin tiers (verified against the code)

| Tier | Role | Console | How it works |
|---|---|---|---|
| **Super admin** | `admin` | `/admin` | Email allowlist (`ramalusubov@gmail.com`). Creates schools, designates school admins, reviews teacher ID verifications, approves/revokes teachers, views all users/classes. |
| **School admin** | `school_admin` | `/school` | Designated by the super admin. **Provisions teacher accounts** by email invite, manages the school code + branding, approves/reviews teachers. Does **not** create student accounts or class codes (by design). |
| **Teacher** | `teacher` | `/teacher` | Invited by a school admin (auto-approved). Creates classes + join codes, gradebook (+CSV), reviews scavenger evidence, sees a performance matrix, and **authors assignments**. |

**Assignments — how a teacher targets a module:** the **Missions** tab lets the
teacher pick modules from the catalog to build a checklist; each item
auto-completes from the student's real practice counters. (The separate
**Quiz Builder** is curriculum-topic based, not module-targeted — by design.)

**Account provisioning is pre-authorization, not credential creation:** a school
admin/super admin authorizes an email; that person then creates their own
password at `/signup`. Nothing emails the invite yet — the invite URL is shared
out-of-band. (Now that Brevo is wired, auto-emailing invites is an easy
follow-up if desired.)

---

## 4 · Fonts (the three voices)

Loaded via Google Fonts in `src/routes/__root.tsx`
(`Cinzel`, `EB Garamond`, `UnifrakturMaguntia`, `Crimson Pro`).

| Role | Font | Where |
|---|---|---|
| **Display / headings** | **UnifrakturMaguntia** (blackletter) | Page titles (h1), hero text, brand mark. Title-Case, large sizes only. Falls back to Crimson Pro / Cyberjunkies. |
| **Body / serif voice** | **Crimson Pro** (EB Garamond → Georgia fallback) | Paragraphs, buttons, taglines on guest/marketing pages. |
| **UI / app interior** | system **sans** (`--font-sans`, aliased `--font-ui`) | All interface text, labels, data strings. |

Two skins (`src/styles.css`): `.grimoire-skin` (full voice — guest pages) and
`.grimoire-display` (blackletter titles + sans body — dense app shells).
Rule: never put the display/blackletter font on small labels.

---

## 5 · Colours (token-driven, both themes)

Every surface uses CSS custom-property tokens — never raw hex in components.
Palette family: ink navy, parchment cream, antique gold (ornament), teal
(primary/arcane glow), violet (secondary).

| Token | Light (day) | Dark (night) | Role |
|---|---|---|---|
| `--mist` | `#f6f3ec` | `#0b1220` | Background |
| `--slate-sunken` | `#e8e1d1` | `#141d2e` | Card / surface |
| `--spectral` | `#111826` | `#eaf0fa` | High-contrast text |
| `--parchment` | `#45505f` | `#9aa7bd` | Muted text |
| `--gold` | `#9a6207` | `#e0b457` | Ornament — rules, seals, frames |
| `--emerald-elixir` (`--teal`) | `#0d9488` | `#2dd4bf` | **Primary** accent / glow |
| `--wraith` | `#7c3aed` | `#a855f7` | Secondary (violet) |
| `--crimson` | `#dc2626` | `#f87171` | Errors / danger |

All fixed art ships as a **day and night edition** (`dark:` / `dark:hidden`);
theme switching is a circular ripple from the toggle.

---

## 6 · AI used for IMAGE GENERATION

- **Tool:** **Higgsfield** (connected via MCP). Brief/prompt pack:
  `docs/HIGGSFIELD_PROMPTS.md`.
- **Model:** `gpt_image_2_5`, using **image-referencing** (`image_references`)
  to generate matching day/night editions of the same artwork so the design
  stays identical across themes. ~0.25 credits/image.
- **Locked style anchor** (every prompt): *"antique engraved ink illustration,
  18th-century alchemical manuscript plate, fine cross-hatching and stipple
  linework, aged parchment and deep midnight-blue ground, antique gold filigree,
  faint teal arcane glow."* Generated on pure white or near-black, then
  flood-cut to transparency.
- Asset library lives under `public/dark-alchemy-vibe/`, `public/backdrops/`,
  `public/real-app-hero-page/`, `public/ui/` (see `DESIGN_DIRECTION.md §9`).

## 6b · AI used for FEATURES (text/vision)

- **Google Gemini** (`gemini-flash-latest`), server-only via `createServerFn`
  (`src/lib/server/gemini.ts`). Powers the Ask-the-Alchemist tutor, generated
  quiz/problem items, answer grading, and the scavenger/identifier vision reads.
- **Every AI feature has a keyless rule-based fallback** — the app is fully
  usable with no key (submissions route to manual teacher review).
- On-device vision: TensorFlow.js **COCO-SSD** for the live camera scanner.

---

## 7 · Things to know before testing

- **New accounts require a real email inbox** — `/signup` now emails a Brevo
  verification code. Use addresses you can open. (To test without sending real
  mail, unset `BREVO_API_KEY` in `.env` and the code prints to the dev server
  console instead.) See `docs/TEST_ACCOUNTS.md`.
- **Known rules hole (not yet fixed):** `firestore.rules` leaves the `config`
  collection `allow read, write: if true` (a TEMP line) — restore
  `allow write: if isAdmin()` before any public use.
- **Credentials are from the owner's paste** (originally another project) —
  rotate the Brevo/Cloudinary/Gemini keys before a public demo.
- **Verify commands:** `npx tsc --noEmit` (clean) and `npm run build`. AR/camera
  flows can only be truly verified on a phone over HTTPS.
- The `ADMIN_CREDENTIALS.MD` file still mentions a "Continue with Google" login
  — that does **not** exist; sign-in is email/password only.
