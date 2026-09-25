# AlcheMix — System Overview
_Last updated: 2026-09-09 (reflects the live codebase on main @ 536bcb9)_

## What it is
An alchemy-themed chemistry education platform for middle/high-school
students ("apprentices"), built around physical AR trading cards and a
fantasy narrative wrapped around real, accurate chemistry. Two-sided:
the website (desktop) is for deep study; mobile / installed PWA is the
capture companion (AR scanner, scavenger hunt).

## Stack
- TanStack Start (React, file routes in src/routes/) · Vite 8 · Nitro
- Tailwind v4 with CSS custom-property tokens — full dark + light themes
- Firebase: Auth (email/password + Google) · Firestore (all app data)
- Three.js (Bohr models, molecules) · MindAR (card tracking)
- AI: Gemini via server functions, keyless rule-based fallback everywhere
- Hosting target: Firebase Hosting (.output/public), deploy via nitro

## Roles & entrances
- Student  → /login  (violet door)         → lands at /app
- Teacher  → /educator (gold Educator's Door) → lands at /teacher
- Admin    → either door                    → lands at /admin
Sign-in is role-aware: both doors read users/{uid}.role after auth and
route accordingly, so the "wrong" door still lands you in the right room.
/signup?role=teacher preselects the educator tab. Teacher accounts need
status "approved" (ID verification flow, or admin approval).

## Student side
Shell (src/components/StudentShell.tsx):
- Desktop: floating glass CHAPTER RAIL on the left — crest (home), one
  rune per chapter opening an ORB FLYOUT of its pages (staggered
  materialise, hover-intent), then Contents (⌘K), theme toggle, sign-out.
  No top bar. Bottom PAGER flips pages in book order.
- Mobile: glass top bar + bottom tab bar (Home, Grimoire, Scanner,
  Scavenger, More) — "More" opens the full chapter sheet in orb style.
- Table of Contents overlay on ⌘K.

Chapters & modules (31 routes, see NAV in StudentShell):
  The Bench:        Home · Grimoire · The Guide · Starters for Ten · Assignments
  I  Foundations:   Lab Safety · Atomic Builder · Periodic Table · States of Matter
  II The Study:     The Study (5 topics × learn/practise/assess + SM-2)   [HIDDEN]
  III Molecules:    Molecule Shapes · Invisible Bonds · Reaction Theatre ·
                    Equation Balancer · Compound Codex
  IV Advanced Labs: Gas Laws · Elixir Bench · Cauldron of Heat · Reaction
                    Rates · Equilibrium · Voltaic Forge · Titration · Decay [HIDDEN]
  V  Prove Craft:   3D Quiz                                                [HIDDEN]
  The Arcade:       Duel · Class Duels · Placement Trials · Hall of
                    Records · The Emporium                                 [HIDDEN]
  Field Work:       AR Scanner · Scavenger Hunt (mobile)

Hub (/app): welcome header with streak/aurum/card stats · "Continue your
path" card (Guide's next visible step, whole-card link) · class card
(join by 6-char code, or enrolled state) · THE CRAFT ladder · module grid
by chapter.

The Craft (src/lib/craft.ts): tiered mastery ladder — a module is
"mastered" only on proof (its Trial at ≥2★, 3/5 Study topics done, or
5+ compounds forged). 15 crafts; tiers Novice → Initiate(1) →
Apprentice(3) → Adept(6) → Magister(10) → Archalchemist(15). Derived
from existing profile signals, synced to users/{uid}.craft for teachers.

First-login walkthrough (src/components/Walkthrough.tsx): modal offer on
first arrival at the Bench; accepting runs a user-paced spotlight tour —
each stop dims the page around a real element (data-tour anchors), docks
a guide card with a bobbing arrow, Back/Next, progress bar, resumable via
localStorage. Tour covers every VISIBLE module. Declining/finishing
stamps walkthroughDone on the profile.

Module guidance: ModuleShell accepts a `guide` prop — a numbered "What to
do here" strip under any module header (States of Matter wired so far).

## Teacher side (/teacher)
Same design language: glass rail (6 sections), mobile top bar + tabs.
- Classes: create class → 6-char join code (doc id), roster chips
- Gradebook: per-student topic scores + mastery (teacher-entered — the
  only real grades in the system; practice counters are engagement only)
- Evidence: scavenger-hunt submission review (approve fallback finds)
- Performance: live class matrix — topic stages, CRAFT TIER column,
  trial stars, engagement — plus struggling-concepts radar
- Quiz Builder & Missions: authored content stored on the class doc

## Admin (/admin)
Seeded by email allowlist (ramalusubov@gmail.com — also hardcoded in
firestore.rules isAdmin()). Teacher ID + face-match verification review,
user/class management.

## Data (Firestore) — see docs/DATA_INVENTORY.md for the full D1–D10 map
- users/{uid}            profile: role/status, grades, mastery, practice,
                         grimoire/compounds/forged, trials, aurum, streaks,
                         craft, walkthroughDone, …
- users/{uid}/evidence   scavenger submissions
- classes/{CODE}         class + quizzes[] + missions[]; roster subcollection
- duels/{id}             async PvP battles
- verifications/{uid}    teacher ID verification
- config/modules         curator visibility doc: hidden: string[]

## Module curation (hiding unfinished work)
Two layers, composed as a union:
1. MANUAL_HIDDEN_ROUTES (src/lib/moduleVisibility.ts) — code list,
   currently hiding The Study, Advanced Labs, Prove Your Craft, Arcade.
2. config/modules doc — togglable live from the public /modules
   "Curator" page (chaptered checklist; code-hidden rows shown locked).
Hidden modules disappear from: rail, flyouts, ⌘K contents, pager, mobile
nav, hub grid (incl. the separate Arcade section), the Guide page +
progress + next-step, and the walkthrough tour. Home is never hideable.
NOTE: this is curation, not access control — direct URLs still work.

## Current TEMP flags (restore before students arrive)
1. firestore.rules: config/{docId} `allow write: if true` (testing) —
   restore `if isAdmin();` and re-publish.
2. Walkthrough PREVIEW_ALWAYS_OFFER = true (offer pops on every /app
   visit) — set false for first-login-only.
3. Live rules in the Firebase console may lag the repo's
   firestore.rules — the console is currently the only deploy path
   (local Firebase CLI is not logged in).
4. Test teacher account: teacher@alchemix.test / Cauldron#2026
   (role teacher, status approved).

## Verification workflow
npx tsc --noEmit && npm run build   (routeTree.gen.ts regenerates; never
hand-edit). AR/camera flows verify only on a phone over HTTPS.

## Key documents
SCOPE.md (scope contract, design principles, roadmap) ·
docs/DATA_INVENTORY.md (stores D1–D10, DFD/ERD source) ·
FEATURE_BRAINSTORM.md + docs/brainstorm/ (research).
