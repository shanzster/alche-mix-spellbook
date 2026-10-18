# AlcheMix — UPDATED SCOPE & USER LEVELS

> **Read this first.** This is the current, authoritative scope + role contract
> for AlcheMix as of **2026-10-18**. It supersedes the role/console sections of
> the older `SCOPE.md` where they disagree; `SCOPE.md` remains the source for the
> design principles and the full learning-module list. Companion docs:
> `docs/teacher-modules.md` (teacher console catalogue), `docs/SCHOOL_MULTITENANCY.md`
> (the multi-tenant design + phases), `docs/DATA_INVENTORY.md` (stores D1–D15),
> `docs/DESIGN_DIRECTION.md` (visual direction + the app-shell navigation spec).

---

## 1 · What AlcheMix is

An **alchemy-themed chemistry education platform** for middle/high-school
students ("apprentices"), built around **physical AR trading cards** and a
fantasy narrative (Grimoire, forging, trials, aurum) wrapped around **real,
accurate chemistry**. It is **multi-school / multi-tenant** (Google-Classroom
style): many schools, each with its own admin, branding, and codes.

**Two-sided architecture** (enforced by `src/lib/platform.ts`):
- **Website (desktop)** = deep study — simulations, guided lessons, trials.
- **Mobile / installed PWA** = capture companion — AR scanner, AI scavenger
  hunt, element identifier; hands off to the website for full study.

**Stack:** TanStack Start (file routes in `src/routes/`; never create
`src/pages/` or Next.js conventions; `src/routeTree.gen.ts` is auto-generated —
never hand-edit) · React · Tailwind v4 with CSS custom-property tokens
(`var(--color-gold)` etc.; dark + light always) · Firebase Auth + Firestore ·
Three.js + MindAR (AR) · TensorFlow.js COCO-SSD + Gemini (`GEMINI_API_KEY`,
server-only via `createServerFn`) · Nitro / Cloudflare.

---

## 2 · The four user levels (roles)

`users.role` is one of: **`admin`** (the super / system admin) · **`school_admin`**
· **`teacher`** · **`student`**. The `"admin"` string IS the super admin (kept
as-is to avoid churn). Each role has a home, set by `homeForRole` in
`src/lib/auth.ts`:

| Role | Home route | Console file | Accent |
|---|---|---|---|
| `student` | `/app` | `src/components/StudentShell.tsx` + module routes | teal/violet |
| `teacher` | `/teacher` | `src/routes/teacher.tsx` | teal (emerald-elixir) |
| `school_admin` | `/school` | `src/routes/school.tsx` | amber (amber-scry) |
| `admin` (super) | `/admin` | `src/routes/admin.tsx` | violet (wraith) |

The hierarchy (see `docs/SCHOOL_MULTITENANCY.md`):

```
Super Admin (seeded via ADMIN_EMAILS allowlist in src/lib/admin.ts + firestore.rules)
  • creates Schools, mints school codes, creates School Admins, global CRUD, backups
  └─ School Admin (created by a super admin, assigned to ONE school)
       • edits their school (name, logo, brand colour), sees/uses the school code
       • provisions TEACHER accounts, approves/rejects teacher ID verification
       • read-only oversight of every class under the school
       └─ Teacher (joins a school with the SCHOOL code at signup; auto-approved
          when provisioned, else pending ID verification)
            • creates Classes (each with its own CLASS join code)
            • accepts student join requests; grades; authors quizzes/missions/notices
            └─ Student / Apprentice (signs up with a CLASS code → requests to
               join → teacher accepts → enrolled)
```

**Two codes, two levels:** the **school code** onboards *teachers* into a
school; the **class join code** enrols *students* into a specific class.

---

### 2.1 · Student ("Apprentice") — `/app`

The learner. Signs up (generally at `/signup`, or with a class code at
`/school-signup`), then lives in the student shell.

**Shell** (`StudentShell.tsx`): the app presented as a *book*.
- Desktop: a floating left **chapter rail** (crest → chapter runes with hover
  flyouts → Table of Contents → theme → sign-out) + a bottom pager; no top bar.
- Mobile: a floating top bar (logo + title + theme) + a **fixed bottom tab bar**
  of chapters, each opening a bottom-sheet of its pages.
- `⌘K` opens the Table of Contents.

**Capabilities / surface** (all learning modules; full list in `SCOPE.md`):
Grimoire (card collection) · The Guide (recommended path) · Daily Starters
(streak rite) · Assignments (teacher quizzes + missions + **the Bulletin /
noticeboard**) · ~20 simulation modules (Lab Safety, Atomic Builder, Periodic
Table, States, The Study + SM-2 review, Molecule Shapes, Reactions, Equation
Balancer, Codex, Gas Laws, Elixir Bench, Cauldron of Heat, Rates, Equilibrium,
Voltaic Forge, Invisible Bonds, Titration, Decay, 3D Quiz) · AR Scanner /
Scavenger Hunt / Element Identifier (mobile) · "Ask the Alchemist" mentor on
every page. **The Arcade** (duels, placement trials, Hall of Records, Emporium)
is benched behind `ARCADE_HIDDEN` in `StudentShell.tsx` (routes still reachable
by URL).

**Writes:** their own `users/{uid}` doc (practice counters, trials/stars, aurum,
grimoire/compounds/forged, starter streak + history, SM-2 reviews,
assignmentResults). **Never** writes grades. Requests class enrolment
(`classes/{id}/requests/{uid}`).

---

### 2.2 · Teacher ("Educator") — `/teacher`

Runs classes inside a school. Provisioned by a school admin (or self-signs-up at
`/signup?role=teacher` with the school code, then completes ID + face-match
verification, approved by their school admin). Signs in at `/teacher/login`.

**Shell:** the console shell — desktop floating rail + mobile floating top bar +
**fixed bottom tab bar (four primary slots + a "More" sheet)** once sections
exceed five (see `DESIGN_DIRECTION.md` §7b). 10 sections:

| Section | What it does | Writes? |
|---|---|---|
| **Overview** | class dashboard — active-today, mastery pulse, needs-attention | read-only |
| **Classes** | create classes, issue/regenerate expiring join codes, accept/reject join requests, remove students, archive/restore | class doc + roster |
| **Gradebook** | per-topic score + mastery per student; CSV export | `users.grades/.mastery` (the ONLY real grades) |
| **Performance** | class matrix (path stage, trials stars, engagement) + struggling-concepts radar | read-only |
| **Daily Starters** | per-class streak leaderboard & state | read-only |
| **Collections** | Grimoire/Codex oversight (cards, compounds, forged) | read-only |
| **Evidence** | AI Scavenger-Hunt review inbox (approve/reject) | evidence subdoc |
| **Quiz Builder** | author quizzes (+ curriculum seeding) + live results | class `quizzes[]` |
| **Missions** | ordered module checklists with a note | class `missions[]` |
| **Bulletin** | post dated/pinnable notices the class sees on `/assignments` | class `announcements[]` |

**Scope rule:** every teacher module mirrors a student surface and reads the
same live data. **Practice ≠ grades** — streaks/stars/cards are engagement
analytics, never auto-graded; only the Gradebook writes grades, by hand.
Catalogue: `docs/teacher-modules.md`.

---

### 2.3 · School Admin — `/school`

Runs ONE school. Created by a super admin and assigned a `schoolId`. Signs in at
`/school/signin` (the `/school_.signin` route; a dedicated door) or `/login`
(routed by role). Accent: amber.

**Shell:** the console shell (desktop rail + mobile top bar + fixed bottom tab
bar). Four tabs:

| Tab | What it does |
|---|---|
| **Overview** | teacher/class stat tiles, a pending-teacher-approval callout, the shareable school code |
| **School** | the school code (copy) + branding editor (name, logo upload → data URL, brand colour) |
| **Teachers** | provision teacher accounts (name/email/password, bound to the school with a class code), roster, Approve/Reject + Review-ID (reuses the verification flow) |
| **Classes** | read-only oversight of every class under the school (name, teacher, join code, archived) |

**Honest limit — no Students tab.** Students don't reliably carry a `schoolId`,
and Firestore rules only let a **class's own teacher** read its roster — a school
admin cannot. So per-class student counts live in each teacher's console.
Lifting this needs a rules change (school-admin roster read) + redeploy.

**Writes:** their own `schools/{id}` doc (name/logo/brandColor/code only);
`status` on their school's teachers; their teachers' `verifications`;
`teacherInvites`.

---

### 2.4 · Super / System Admin — `/admin`

The platform operator. **Seeded, not created:** any account whose email is in
`ADMIN_EMAILS` (`src/lib/admin.ts`, kept in sync with `firestore.rules`
`isAdmin()`) is granted `admin`. Accent: violet.

**Shell:** a wider floating sidebar (not the rail) + mobile top bar + horizontal
section strip. Eight sections:

| Section | What it does |
|---|---|
| **Overview** | global counts (users, classes, pending verifications) |
| **Schools** | create schools (+ first school admin), regenerate school codes, edit/soft-disable/delete, backfill school-less teachers/classes into a Default School |
| **Verifications** | review any educator's ID + selfie; approve/reject |
| **Teachers** | set any teacher's status |
| **Users** | **full CRUD** — create (student/teacher/school_admin), edit identity/role/status/school, delete profile |
| **Classes** | **full CRUD** — search, rename, archive/restore, delete |
| **Data & Backups** | **export · Version Machine · import/rollback** (see §4) |
| **Audit log** | append-only, tamper-evident record of every privileged mutation (super-admin read only) |

**Can change anything** the rules permit: `isAdmin()` grants broad read/write.
Grades/mastery/practice are still **not** editable here (teacher/system-owned) —
the admin edits identity, role, status, school assignment only.

**Honest limits** (client SDK + rules — surfaced in the UI):
- Cannot create a Firebase Auth *credential* deletion, nor recreate a deleted
  `users`/`classes` doc from the client — those need the Admin SDK server-side.
- `deleteUserProfile` removes the profile doc only; the Auth account persists.

---

## 3 · Authentication & routing (the login contract)

- **Normal sign-in is role-routed.** `/login` (`AuthDoor`) and the role doors
  authenticate, then `homeForRole(role)` sends the user to their home. Entering
  the "wrong" door still lands you in the right place.
- **A class/school code is for REGISTRATION ONLY.** Once an account exists it is
  already linked to its school, so returning users just sign in at `/login` and
  are routed — they never re-enter a code.
  - `/school-signup` — the School Door; students register + request to join a
    class with a code. Teacher share links: `/school-signup?code=ABC123`.
  - `/school-login` — **redirects to `/login`** (there is no "sign in with a
    code" flow; old links still resolve).
  - `/signup` (general), `/signup?role=teacher` (with the school-code field),
    `/teacher/login` (educator door), `/school/signin` (school-admin door),
    `/admin` (super admin, seeded by email).
- Student enrolment is **request-based**: signing up with a class code creates a
  join request; the teacher accepts before the student is on the roster.

---

## 4 · Data & Backups (super admin) — "the standard"

`src/lib/backup.ts` + the `/admin` → Data tab:

- **Export** — reads the chosen collections (schools/users/classes, optionally
  verifications/auditLog) into a **Timestamp-safe JSON** file (`Timestamp`s
  encode to `{__ts__:[s,n]}` and revive on restore), downloaded locally.
- **Version Machine** — each snapshot's metadata is stored in `backups/{id}`
  (super-admin read/create/delete, never updated = immutable), newest-first; the
  **full payload is kept inline only when ≤ 700 KB** (Firestore's 1 MB doc cap),
  else metadata-only. Per snapshot: download, roll back, delete.
- **Import / Rollback** — upload a file or pick a snapshot → preview contents →
  **type `RESTORE`** → writes back doc-by-doc (merge), then shows a per-collection
  report. `schools` round-trips fully; `users`/`classes`/`verifications` merge
  existing docs; docs the rules won't let the client recreate are **skipped and
  counted**, never silently lost.
- Every backup/restore/CRUD action is written to the **audit log (D14)**.

> **Deploy note:** the `backups` Firestore rule (and any rule change) only takes
> effect after `firebase deploy --only firestore:rules`.

---

## 5 · Non-negotiable design principles (unchanged)

1. **Real chemistry, illustrative engines.** Textbook-accurate values; curated,
   not research-grade physics.
2. **Keyless fallbacks everywhere.** Every AI feature (`src/lib/ai.ts`) works
   without a Gemini key, tagged `source: "gemini" | "fallback"`.
3. **Practice ≠ grades.** `practice.*`, streaks, stars, collections are
   engagement; grades are teacher-entered only.
4. **Guide, don't gate.** The Guide recommends an order, locks nothing; only The
   Study's topic path gates sequentially.
5. **Failure teaches.** Wrong answers / impossible mixes get warm counsel.
6. **On-brand naming.** Trials, forging, Codex, aurum, the Alchemist,
   apprentices. The Grimoire is "the Alchemist's Grimoire" — never coin new
   fantasy words (no "atelier").
6b. **Games stay in the Arcade** (currently benched via `ARCADE_HIDDEN`).
7. **Both themes, mobile-friendly, token-based.** Every surface works dark + light
   using CSS tokens; wide content scrolls in its own container.
8. **The font system.** `--font-display` (blackletter, Title-Case, large only) for
   brand/titles/hero; `--font-sans` for body/UI; `--font-serif` for subtitles &
   flavour. Never put the display font on small labels.

---

## 6 · The app-shell navigation standard (DESIGN_DIRECTION §7b)

The **student shell is the reference**; teacher and school admin consoles mirror
it so the product feels like one book:
- **Desktop:** slim floating `glass-strong` rail, left-centre (crest → section
  runes with a teal/amber active spine-marker → theme → sign-out); scrolls when
  sections overflow.
- **Mobile:** floating `glass-strong` top bar (logo + theme) + a **fixed
  `glass-strong` bottom tab bar** (`bottom-2 inset-x-2 h-16`, `justify-around`,
  2px active top-marker, `text-[10px]` labels). Pages reserve `pb-28` on mobile.
  Once sections exceed five, the bar shows the primary few + a **"More"** sheet.
- The super admin's `/admin` uses a wider sidebar variant (more sections, denser).
- **Guest `FloatingNav`** (landing/marketing) is a different pattern: a centred
  pill with the logo orb in its middle; on mobile the links collapse behind a
  hamburger so the pill never overflows.

---

## 7 · Data stores (summary — full detail in `docs/DATA_INVENTORY.md`)

`D1` Firebase Auth · `D2` `users/{uid}` (profile: identity, role, schoolId,
classId, practice, grades/mastery, trials, aurum, grimoire/compounds/forged,
starterStreak/History, reviews, assignmentResults) · `D3` `users/{uid}/evidence`
· `D4` `classes/{id}` (+ `quizzes[]`, `missions[]`, `announcements[]`, `schoolId`,
regenerable/expiring `joinCode`, `archived`) · `D5` `classes/{id}/roster/{uid}`
· `D6` `duels/{id}` · `D7` `verifications/{uid}` · `D8` browser-local · `D9`
static in-code datasets · `D10` `config/modules` · `D11` `schools/{id}` (name,
code, logoUrl, brandColor, adminUids, active) · `D12` `schoolAdminInvites/{email}`
· `D13` `classes/{id}/requests/{uid}` · `D14` `auditLog/{id}` (append-only) ·
`D15` `backups/{id}` (the Version Machine).

---

## 8 · Out of scope (deliberate — do not build unless the owner changes this)

- Research-grade engines (molecular dynamics, quantum chemistry, spectra,
  organic synthesis).
- LMS/LTI grade passback (Canvas/Moodle). Google-Classroom-style share links are
  the ceiling.
- A separate rewards world — the Grimoire/card collection IS the reward world.
- Native apps (PWA + website only).
- Full i18n + the complete accessibility quad (desirable later, not this
  milestone).
- Two-way teacher↔student messaging (the Bulletin is one-way by design).
- Server-side (Admin SDK) operations: true recreate-from-backup of deleted
  docs, Auth credential deletion, cross-tenant hard rule-blocks — all noted as
  honest limits, not shipped.

---

## 9 · Working conventions for AI sessions

- New **student modules** register in THREE places: `src/routes/app.tsx`
  (MODULES), `src/components/StudentShell.tsx` (NAV), `src/lib/guide.ts` (GUIDE).
- Reuse teaching primitives from `src/components/Learn.tsx` and the trial
  persistence helpers — don't invent parallel systems.
- Reuse the console-shell pattern + `PageHeader` for any new admin/teacher/school
  surface; keep both themes and mobile working.
- Keep the living docs current **in the same change**: `SCOPE.md`,
  `UPDATED_SCOPE.md` (this file), `docs/DATA_INVENTORY.md`,
  `docs/DESIGN_DIRECTION.md`, `docs/SCHOOL_MULTITENANCY.md`,
  `docs/teacher-modules.md`, and a dated entry in `docs/LOGS.md`.
- **Verify before calling work done:** `npx tsc --noEmit` and `npm run build`.
- Firestore rule changes only take effect after `firebase deploy --only
  firestore:rules`. Camera/AR flows can only be truly verified on a phone over
  HTTPS — say so honestly.
