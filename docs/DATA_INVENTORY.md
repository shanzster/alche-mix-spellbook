# AlcheMix — Feature & Data-Storage Inventory

> **Purpose.** The single source of truth for building the Data Flow Diagrams
> (DFDs) and the Entity Relationship Diagram (ERD). Every feature (process),
> every data store, and every external entity in the shipped app is listed
> here, with the code file that owns it.
>
> **Guidance for AI sessions:** when asked to draw or update a DFD, use the
> processes in §1, the stores in §2 (IDs `D1`–`D9`), and the external entities
> in §3 — keep the store IDs stable across diagrams. When asked to build the
> ERD, use §4: Firestore documents are the entities; the embedded maps/arrays
> listed there are weak entities or multivalued attributes (call that out on
> the diagram rather than inventing new collections). If code and this file
> disagree, the code wins — update this file in the same commit.
>
> Last verified against the code: 2026-09-04.

---

## 1. Features (DFD processes)

### 1.1 Identity & access

| Feature | Route / file | Data touchpoints |
|---|---|---|
| Sign up / login (email+password, Google popup) | `/login`, `/signup` · `src/lib/auth.ts` | Firebase Auth **D1**; creates/merges `users/{uid}` **D2** |
| Role gating (student / teacher / admin) | `src/lib/auth.ts`, `src/lib/admin.ts` | reads `users/{uid}.role`, `.status`; admin allowlist is hardcoded (`ADMIN_EMAILS`) |
| Teacher ID + face-match verification | `/teacher` onboarding · `src/lib/admin.ts`, `src/lib/facematch.ts` | writes `verifications/{uid}` **D7** (downscaled ID + selfie JPEGs as data URLs); admin approval flips `users/{uid}.status` |
| Admin console (user/class management, verification review) | `/admin` · `src/lib/admin.ts` | reads all of **D2**, **D4**, **D7**; writes `status` fields |

### 1.2 Student learning modules

All modules log engagement to `users/{uid}.practice.*` (counts only, never
grades) and most persist best game runs to `users/{uid}.trials.*` via
`recordTrial()` in `src/lib/profile.ts`. Aurum rewards flow through
`earnAurum()`. Content itself is static in-code data (**D9**) — no CMS.

| Route | Module | Extra data touchpoints beyond practice/trials/aurum |
|---|---|---|
| /cards | Grimoire (card collection + Guide TOC) | reads `grimoire`, `grimoireScans`, `forged`, `forgedAt`, `equipped` |
| /guide | Grimoire Guide (recommended path) | reads whole profile to compute step completion (`src/lib/guide.ts`) |
| /starters | Starters for Ten (daily 10-question ritual) | `recordStarterRun()` → `starterStreak`, feeds SM-2 `reviews` |
| /lab-safety | Lab Safety (GHS study + scenario trials) | — |
| /atomic-builder | Atomic Builder (Bohr, Z ≤ 20) | — |
| /periodic-table | Periodic Table (118 elements, 4 lenses) | deep links `?element=Fe`; static data **D9** |
| /table-game | Placement Trials | — |
| /states | States of Matter | — |
| /study | The Study (5 topics × 3 concepts, learn→practise→assess) | `pathProgress` (gated path), `reviews` (SM-2) via `src/lib/learning.ts` |
| /molecules | Molecule Shapes (VSEPR 3D) | — |
| /reactions | Reaction Theatre | — |
| /equation-balancer | Equation Balancer (+ Time Attack) | persisted bests in `trials` |
| /codex | Compound Codex (discovery encyclopedia) | `compounds` (discovered formulas); intro flag in localStorage **D8** |
| /gas-laws | Gas Laws (PV=nRT + AI trial) | calls `aiGenerateProblem` (E3) |
| /solutions | The Elixir Bench (molarity) | — |
| /thermo | Cauldron of Heat (calorimetry) | — |
| /rates | Reaction Rates (collision theory) | — |
| /equilibrium | Equilibrium (N₂O₄⇌NO₂, Haber) | — |
| /electro | The Voltaic Forge (galvanic cells) | — |
| /forces | Invisible Bonds (IMFs) | — |
| /titration | Titration Lab | AI grading of the unknown assay (`aiGradeAnswer`, E3) |
| /decay | Radioactive Decay | — |
| /quiz | 3D Visual Quiz | persisted bests in `trials` |
| /elements | Element Explorer (public, no auth) | static data **D9** only |

### 1.3 Capture companion (mobile / PWA)

| Route | Module | Data touchpoints |
|---|---|---|
| /scanner | AR Scanner (MindAR) | camera (E4); AR targets `public/targets.mind` (**D9**); Alche-mix ceremony runs `combine()` → writes `grimoire`, `grimoireScans`, `compounds`, `forged`, `forgedAt`, `badges` |
| /scavenger | AI Scavenger Hunt (COCO-SSD + Gemini deep scan) | camera (E4); Gemini via `aiVerifyMission`/`aiScanFrame` (E3); writes `users/{uid}/evidence/{id}` **D3** + practice counters |

### 1.4 Arcade (games & rewards — separate hub section by design)

| Route | Module | Data touchpoints |
|---|---|---|
| /duel | Duel the Alchemist (vs AI) | `duelRecord`; engine is pure (`src/lib/duel.ts`) |
| /duels | Class Duels (async PvP) | `duels/{id}` **D6** (authoritative serialized `DuelState`); reads class roster **D5** for the challenge list; payout-dedupe + seen-bookmark flags in localStorage **D8** |
| /leaderboard | Hall of Records | reads denormalized stats on roster entries **D5** (written by `syncRosterStats()` in `profile.ts`) |
| /shop | The Emporium (aurum sink) | catalog is static in `src/routes/shop.tsx` (**D9**); `spendAurum()` → `aurum`, `inventory`, `equipped` |

### 1.5 Assignments & teacher console

| Feature | Route / file | Data touchpoints |
|---|---|---|
| Class creation + join codes | `/teacher` · `src/lib/teacher.ts` | creates `classes/{CODE}` **D4** (the join code IS the doc id) |
| Student joins a class | `/app` join dialog | writes roster entry **D5** + stamps `users/{uid}.classId/.className` |
| Gradebook (5 topics) + mastery | `/teacher` | writes `users/{uid}.grades`, `.mastery` (teacher-entered — the only real grades in the system) |
| Quiz Builder (+ curriculum seeding, live results) | `/teacher` | quizzes stored as an **array field on the class doc** (`classes/{id}.quizzes[]`); results read from students' `assignmentResults` |
| Mission Configurator | `/teacher` | `classes/{id}.missions[]`; completion proven by students' `practice.*` counters |
| Performance tab (matrix, drill-downs, radar) | `/teacher` | read-only fan-in over every rostered student's `users/{uid}` doc |
| Scavenger evidence review inbox | `/teacher` | reads/updates **D3** (`teacherApproved`) |
| Assignments (student side) | `/assignments` | reads class doc **D4**; writes own `assignmentResults` |

### 1.6 Cross-cutting

| Feature | File | Data touchpoints |
|---|---|---|
| Ask the Alchemist (mentor chat, every student page) | `src/lib/ai.ts` → `aiAskAlchemist` | Gemini (E3) with keyless fallback; no persistence |
| AI plumbing (5 capabilities + status/ping) | `src/lib/ai.ts`, `useAI.ts` | server-only `createServerFn`; `GEMINI_API_KEY` env; every result tagged `source: "gemini" \| "fallback"` |
| Theme (dark/light) | `src/lib/theme.ts` | localStorage `theme` **D8** |
| Offline shell | `public/sw.js` | Cache Storage **D8** (`alchemix-{version}`, conservative precache) |
| Badges | `src/lib/profile.ts` | `users/{uid}.badges[]` |

---

## 2. Data stores

### D1 — Firebase Auth (external managed store)
Identity records: email/password credentials, Google-linked accounts, `uid`,
`displayName`, `photoURL`. The `uid` is the foreign key into everything else.

### D2 — Firestore `users/{uid}` (THE student/teacher profile doc)
Owner: `src/lib/profile.ts` (`StudentProfile`). One doc per user, all roles.

| Field | Type | Notes |
|---|---|---|
| uid, email, displayName, photoURL | scalars | mirrored from Auth |
| role | "student" \| "teacher" \| "admin" | |
| status | "pending" \| "approved" \| "rejected" | teachers only |
| classId, className | string | denormalized from the joined class |
| grades | map topicId → {score, outOf, feedback?} | **teacher-entered** |
| mastery | map topicId → Mastery | teacher-entered |
| practice | map key → number (+ lastActiveAt) | engagement counters, never grades |
| grimoire | string[] (element symbols) | scanned cards |
| grimoireScans | map symbol → Timestamp | first-obtained times |
| compounds | string[] (formulas) | forged via `combine()` |
| forged, forgedAt | string[], map id → Timestamp | forged-card unlocks |
| badges | string[] | |
| pathProgress | map topicId → {stage, best?} | The Study's gated path |
| reviews | map conceptId → {ease, intervalDays, dueAt, reps, lapses} | SM-2 |
| trials | map trialId → {best, outOf, stars, timeSec?, plays} | module game bests |
| aurum | number | currency |
| starterStreak | {count, lastDay} | |
| inventory, equipped | string[], map slot → itemId | Emporium |
| duelRecord | map difficulty → {wins, losses} | |
| assignmentResults | map assignmentId → {score, outOf} | |
| walkthroughDone | boolean | first-login tour offered (taken or declined) |

### D3 — Firestore `users/{uid}/evidence/{autoId}` (subcollection)
Owner: `src/lib/scavenger.ts` (`EvidenceEntry`). One doc per scavenger-hunt
submission: element, elementName, question, answer, image (data URL),
correct, confidence, feedback, needsManualReview, source (gemini/fallback),
teacherApproved?, createdAt.

### D4 — Firestore `classes/{CODE}`
Owner: `src/lib/teacher.ts`. Doc id = the 6-char join code.
Fields: name, teacherId, teacherName, createdAt, **quizzes[]** (`QuizDef`:
id, title, questions[{prompt, choices×4, answer, hint?}], createdAt-ms),
**missions[]** (`MissionDef`: id, title, note?, targets[{moduleId, label,
practiceKey}], createdAt-ms). Teacher-authored content lives on this doc —
there are deliberately no separate quiz/mission collections.

### D5 — Firestore `classes/{CODE}/roster/{uid}` (subcollection)
Written on join (`teacher.ts`) and by `syncRosterStats()` (`profile.ts`).
Fields: uid, name, email, joinedAt + **denormalized leaderboard stats**:
displayName, stars, aurum, duelWins, compounds (count), streak, statsAt.
Classmates may read this; nothing sensitive is mirrored.

### D6 — Firestore `duels/{autoId}`
Owner: `src/lib/duel-net.ts` (`DuelDoc`). Fields: players[2] (uids, index =
engine side), names[2], classId, seed, draft0?, draft1, **state** (the
authoritative serialized `DuelState`), status (pending/active/done),
winnerUid?, createdAt, updatedAt. Declined challenges are deleted.

### D7 — Firestore `verifications/{uid}`
Owner: `src/lib/admin.ts` (`Verification`). Fields: uid, name, email,
idImage + selfie (downscaled JPEG data URLs stored **in the doc** — no
Cloud Storage bucket), faceMatch?, faceMatched?, status, submittedAt,
reviewedAt. 1:1 with a teacher's user doc.

### D8 — Browser-local storage (per device, not synced)
| Key / cache | Owner | Purpose |
|---|---|---|
| `theme` | `src/lib/theme.ts` | "light" / "dark" |
| `alchemix-codex-intro` | `src/routes/codex.tsx` | intro-seen flag |
| `alchemix-duel-settled:{duelId}:{uid}` | `src/lib/duel-net.ts` | dedupes the one-time duel payout |
| `alchemix-duel-seen:{duelId}` | `src/lib/duel-net.ts` | "new since last visit" log bookmark |
| Cache Storage `alchemix-{SW_VERSION}` | `public/sw.js` | offline app shell + conservative runtime cache |

### D9 — Static in-code datasets (read-only "reference stores")
Not databases, but they appear on DFDs as the content source every module
reads. All in `src/lib/` unless noted: `cards.ts` (12 base cards + the
`combine()` compound engine, ~25 compounds), `forged.ts` (forged-card
definitions), `curriculum.ts` + `learning.ts` (topics/concepts/question
bank + SM-2), `periodic-table-data.ts` (118 elements + physical data),
`element-lore.ts` (lore for all 118), `molecules.ts` (VSEPR set),
`guide.ts` (guide steps), `duel.ts` (pure duel engine), the Emporium
catalog in `src/routes/shop.tsx`, per-module datasets inside each route
file (reactions, equations, isotopes, solubility, potentials, ΔH…), and
`public/targets.mind` (compiled AR image targets).

---

## 3. External entities (DFD terminators)

| ID | Entity | Interaction |
|---|---|---|
| E1 | Student ("apprentice") | all student modules, capture companion, arcade |
| E2 | Teacher | console, gradebook, authoring, evidence review; verification flow |
| E2b | Admin | approvals, user/class management |
| E3 | Google Gemini API | server-only via `createServerFn` (`src/lib/ai.ts`), `GEMINI_API_KEY`; **every call has a deterministic keyless fallback** |
| E4 | Device camera | AR scanner (MindAR), scavenger hunt (COCO-SSD runs on-device), teacher selfie/ID capture |
| E5 | Firebase (Auth + Firestore) | the managed backend; no self-hosted server DB |
| E6 | Printer | forged-card printing from the Grimoire |

---

## 4. ERD guidance

**Entities = Firestore docs.** Six strong entities: `User` (D2),
`Class` (D4), `RosterEntry` (D5), `Duel` (D6), `Verification` (D7),
`Evidence` (D3). Firebase Auth's identity record can be shown as a
seventh external entity keyed by the same `uid`.

**Relationships & cardinality:**
- `User` 0..1 —— 1 `Class` — membership via `users.classId` (a student
  belongs to at most one class; the join code is the class PK).
- `Class` 1 —— * `RosterEntry`; each `RosterEntry` 1 —— 1 `User`
  (associative entity between Class and User, carrying denormalized stats).
- `Class` 1 —— 1 `User` (teacher) via `teacherId`.
- `User` 1 —— * `Evidence` (subcollection under the student).
- `Duel` * —— 2 `User` via `players[]`; `Duel` * —— 1 `Class`.
- `Verification` 1 —— 1 `User` (teachers only; shared PK `uid`).
- Teacher-authored `Quiz` and `Mission` are **embedded arrays on Class**
  — model them as weak entities owned by Class (composite key
  `classId + id`), not standalone tables.
- The maps on `User` (`trials`, `reviews`, `pathProgress`, `grades`,
  `mastery`, `duelRecord`, `assignmentResults`) are embedded weak entities
  keyed by `uid + mapKey`; the string arrays (`grimoire`, `compounds`,
  `forged`, `badges`, `inventory`) are multivalued attributes whose values
  reference **static catalog data (D9)**, not other documents.
- `assignmentResults` logically FK-references a `Quiz` embedded in the
  student's class — a cross-document soft reference worth a dashed line.

**Things the ERD should NOT contain:** no server-side database beyond
Firestore, no Cloud Storage bucket (images are data URLs inside docs),
no AI-conversation persistence, no separate assignments/shop/leaderboard
collections (they are class-doc arrays, static catalogs, and roster
denormalization respectively).

## 5. DFD guidance

- **Context level:** E1/E2/E2b ↔ AlcheMix ↔ E3 (Gemini), E4 (camera),
  E5 (Firebase). The PWA/website split (`src/lib/platform.ts`) is a
  presentation concern — one system bubble is correct at context level.
- **Level 1 processes** that carve the system cleanly: 1 Identity &
  Verification · 2 Learning Modules · 3 Capture Companion (AR + scavenger)
  · 4 Arcade (duels, leaderboard, shop) · 5 Teacher Console · 6 AI
  Services (server functions with fallback) · 7 Offline Shell.
- Reuse the store IDs D1–D9 verbatim so diagrams stay cross-referenced
  with this file.
- Notable flows worth drawing explicitly: `recordTrial`/`earnAurum` fan-in
  from every module into D2; `syncRosterStats` D2 → D5 denormalization;
  the scavenger flow camera → on-device COCO-SSD → server Gemini → D3 →
  teacher review; the duel flow where clients take turns rewriting the
  authoritative `state` in D6.
