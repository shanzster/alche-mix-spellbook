# AlcheMix — Teacher Modules

> The authoritative catalogue of the educator console: **every module a
> teacher needs, mapped to the student surface it serves.** The console is the
> *other half of the book* — for each thing an apprentice does, there is a way
> for their educator to see it, support it, or author for it.
>
> Read alongside `SCOPE.md` (the two-sided architecture + principles),
> `docs/DATA_INVENTORY.md` (storage shapes D1–D9) and
> `docs/DESIGN_DIRECTION.md` §7b (the shared app-shell navigation).
> Last updated: 2026-10-18.

---

## Design contract (how teacher modules must behave)

1. **In conjunction, not in parallel.** Every teacher module mirrors a real
   student surface and reads the same live data the student writes
   (`users/{uid}` docs + the `classes/{id}` doc). No shadow data model.
2. **Practice ≠ grades** (SCOPE principle 3). `practice.*` counters, streaks,
   stars, cards and compounds are **engagement analytics** — surfaced to
   celebrate and to spot who needs help, never auto-converted to a grade. Only
   the Gradebook writes grades, and only a human enters them.
3. **Read-only by default.** Analytics modules only *read* student docs
   (Firestore rules already let the owning teacher read every rostered
   student). The only modules that *write* are the authoring ones
   (Gradebook → student grades; Quiz Builder / Missions / Bulletin → the class
   doc, which students read).
4. **Both themes, mobile-first.** Same shell as the student side: desktop
   floating rail, mobile floating top bar + fixed bottom tab bar (with a
   “More” sheet once the tabs overflow). Tokens only.

---

## The map — student surface → teacher module

| Student surface | What the apprentice does | Teacher module | Status | Reads |
|---|---|---|---|---|
| Enrolment / join codes | Joins a class with a code | **Classes** | Shipped | `classes/{id}` + `roster` + join requests |
| The whole class, at a glance | — | **Overview** | **New** | roster + all student docs (aggregate) |
| 5 curriculum topics, grades & mastery | Learns topics; teacher grades them | **Gradebook** | Shipped | `grades`, `mastery`; CSV export |
| Guided paths + SM-2 review (The Study, all modules) | Learn → practise → assess; spaced review | **Performance** (matrix + struggling-concepts radar) | Shipped | `pathProgress`, `trials`, `practice`, `reviews`, `craft` |
| Daily Starters (streaks, the Ledger) | Brews the daily Three; keeps a streak | **Daily Starters** | **New** | `starterStreak`, `starterHistory` |
| Grimoire + Compound Codex (cards / forging) | Scans cards, forges compounds | **Collections** | **New** | `grimoire`, `compounds`, `forged` |
| AI Scavenger Hunt / Element Identifier | Photographs elements in the wild | **Evidence** review inbox | Shipped | per-student `scavenger` evidence |
| Assignments — quizzes | Takes teacher quizzes | **Quiz Builder** (+ live results) | Shipped | class `quizzes` + `assignmentResults` |
| Assignments — missions | Works an ordered module checklist | **Missions** configurator | Shipped | class `missions` + `practice` |
| Assignments — notices | Reads the class’s notices | **Bulletin** | **New** | class `announcements` (teacher writes, student reads) |
| Trials / Arcade (benched) | Earns stars & aurum | surfaced inside **Performance** | Shipped | `trials` (stars), `aurum` |

> **Deliberately NOT a teacher module** (SCOPE out-of-scope): LMS/LTI grade
> passback, a separate rewards world, research-grade engines, live Kahoot-style
> hosting (that is a *roadmap* item — “Live class quiz mode” — not built here).

---

## Shipped modules (already in `src/routes/teacher.tsx`)

### Classes
Create classes, issue/regenerate expiring join codes, approve join requests,
remove students, archive/restore classes. The roster is the spine every other
module hangs off.

### Gradebook
Per student, per curriculum topic: a score (`score/outOf`) and a mastery level
(`not-started → developing → proficient → mastered`). The **only** place grades
are written. Exports the class gradebook to CSV. Students see these in “My
Progress”.

### Performance
The class matrix — one row per student, one column per curriculum topic
(path-stage chip + best %), plus Craft tier, Trials stars, and Engagement
(practice actions + last-active). Expand a row for a full per-student
drill-down. Below the matrix, the **struggling-concepts radar**
(`aggregateConceptTrouble`) ranks concepts the class is collectively forgetting
(overdue SM-2 reviews + lapses) — the misconception early-warning.

### Evidence
The AI Scavenger Hunt inbox: each photographed element find, AI-graded or
flagged for a human decision; approve/reject with an audit trail.

### Quiz Builder
Author multiple-choice quizzes (4 choices, one answer, optional hint), or
**seed** a quiz from a curriculum topic’s concept questions. Live per-quiz class
results (taken count + class average + per-student chips).

### Missions
Compose an ordered checklist of modules with a note to the class; students tick
items off automatically as their `practice.*` counters prove they practised.

---

## New modules — built in this pass

### 1 · Overview  *(new console home)*
**Mirrors:** the whole student side, at a glance.
**Why:** the console opened on a raw class list; a teacher had no single “how is
my room doing today?” screen. Overview is that screen and the new default tab.

**Shows (all aggregated live, read-only):**
- Enrolled · **active today** · pending actions (join requests + evidence
  awaiting review) as headline stat tiles.
- **Mastery pulse** — the spread of teacher-set mastery across the roster
  (not-started / developing / proficient / mastered).
- **Daily-rite pulse** — how many apprentices kept their Starters streak today,
  and the longest streak in the room.
- **Collections pulse** — total cards scanned & compounds forged this class.
- **Needs attention** — top struggling concepts (reused radar) and students
  with no activity in 7+ days.

No new storage. Pure read over roster + student docs.

### 2 · Daily Starters
**Mirrors:** the student `/starters` module (the Duolingo-style daily rite).
**Why:** Starters is the app’s habit engine; teachers should see who is showing
up daily without it ever being a grade.

**Shows:**
- A **streak leaderboard** — current streak, personal best, and whether today’s
  Three is done / the streak is live, lapsed, or not started
  (`starterStreakState`).
- Class rollups: brewed today, streaks live, longest active streak.
- Per-student recent Ledger (last few runs: score/outOf, Gemini vs fallback),
  from `starterHistory`.

Read-only over `starterStreak` + `starterHistory`.

### 3 · Collections
**Mirrors:** the Grimoire (`/cards`) and Compound Codex (`/codex`).
**Why:** forging is where chemistry becomes play; teachers can celebrate it and
see who is exploring the combiner.

**Shows:**
- Class totals: element cards scanned, compounds forged, forged-card variants.
- Per-student counts (cards / compounds / forged) with a progress sense.
- **Most-forged compounds** across the class — a tiny tally of what the room has
  discovered (real formulas from the combiner).

Read-only over `grimoire`, `compounds`, `forged`.

### 4 · Bulletin
**Mirrors:** the student `/assignments` page (where class-authored content
appears).
**Why:** teachers need a plain way to post a notice the whole class sees — the
one piece missing from “in conjunction with the student side”.

**Behaviour:**
- Teacher writes dated notices (optionally **pinned**) stored as an
  `announcements` array on the `classes/{id}` doc — the exact same pattern as
  `missions`/`quizzes`, so Firestore rules already cover it (owning teacher
  writes; `allow get: if true` lets the enrolled student read).
- Students see the notices **at the top of their Assignments page**, pinned
  first, newest next.

Storage change: `classes/{id}.announcements: AnnouncementDef[]`
(`{ id, body, pinned?, createdAt }`). Recorded in `DATA_INVENTORY.md`.

---

## Navigation (console shell)

Ten sections is past what a phone tab bar holds, so the shell follows the
student pattern and extends it:

- **Desktop:** the floating left rail lists every section as a rune (now
  vertically scrollable, like the student rail).
- **Mobile:** the fixed bottom bar shows five primary sections
  (Overview · Classes · Gradebook · Performance · **More**); **More** opens a
  bottom sheet with the rest (Daily Starters · Collections · Evidence · Quiz
  Builder · Missions · Bulletin). Recorded in `DESIGN_DIRECTION.md` §7b.

---

## Explicitly not built (and why)

- **Live hosted quiz (Kahoot-style).** Roadmap item #4 in SCOPE; needs a
  real-time session model, out of this pass.
- **Messaging / DMs with students.** Bulletin is one-way by design; two-way chat
  is a larger safeguarding surface, not in scope.
- **Auto-grading from practice.** Violates practice≠grades. Analytics inform the
  human; they never post a grade.
