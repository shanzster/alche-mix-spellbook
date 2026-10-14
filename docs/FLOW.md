# AlcheMix — System Flows (end-to-end lifecycle)

> What actually happens, step by step, as a class uses AlcheMix — the actors,
> the routes/functions they touch, and the data stores that change. Store IDs
> (`D1`–`D10`) and external entities (`E1`–`E6`) are the ones defined in
> `docs/DATA_INVENTORY.md`; this file is the *verb* view (who does what, in what
> order), that file is the *noun* view (what data exists). If code and this file
> disagree, the code wins — update both in the same commit.
>
> Last verified against the code: 2026-10-14.

---

> **Update (2026-10-14): multi-tenancy shipped.** AlcheMix is now multi-school.
> The "admin creates the code" step below is resolved: a **super admin** creates
> SCHOOLS + school codes, **school admins** run each school, **teachers** join via
> the school code and create classes, **students** request a class and the teacher
> accepts. Full design + flows: `docs/SCHOOL_MULTITENANCY.md`. The §0 table below
> is the ORIGINAL single-tenant audit, kept for history; the grade-export gap
> (step 10) is still open.

## 0. The proposed flow vs. the real system

The flow this was checked against:

> admin creates school code → teacher shares it → students register with it →
> student uses the system → teacher assigns assignment → students answer it →
> students duel each other → teacher grades students → student sees grades →
> teacher exports grades (formatted) → repeat.

Audit result — **8 of 10 steps are implemented as proposed; 1 differs; 1 is
missing; 1 works but is currently hidden:**

| # | Proposed step | Reality in code | Status |
|---|---|---|---|
| 1 | **Admin** creates school code | The **teacher** creates the class, and the join code IS the class (`createClass`, `classes/{CODE}` **D4**). Admin never creates codes. | ⚠️ **Differs** — teacher, not admin |
| 2 | Teacher shares school code | Teacher owns `joinCode` (regenerable, 30-day expiry) and shares it | ✅ |
| 3 | Students register with code | `SchoolDoor` → `joinClass()` → roster entry **D5** + stamps `users/{uid}.classId` **D2** | ✅ |
| 4 | Student uses the system | All learning modules (§1.2 of DATA_INVENTORY) | ✅ |
| 5 | Teacher assigns assignment | Quiz Builder → `classes/{id}.quizzes[]`; Mission Configurator → `.missions[]` **D4** | ✅ |
| 6 | Students answer assignment | `/assignments` → `recordAssignmentResult()` → `users/{uid}.assignmentResults` **D2** | ✅ |
| 7 | Students duel each other | `/duels` Class Duels over `duels/{id}` **D6** — fully built | ⚠️ **Hidden** — `ARCADE_HIDDEN = true` removes it from nav; reachable by direct URL only |
| 8 | Teacher grades students | Gradebook → `setStudentGrade()` → `users/{uid}.grades`/`.mastery` **D2** (the only real grades) | ✅ |
| 9 | Student sees grades/scores | `/app` (the Bench) renders `grades` + `mastery` back to the student | ✅ |
| 10 | Teacher exports grades (formatted) | **No export exists** — no CSV/print/download anywhere in the teacher console | ❌ **Missing** |

**Bottom line:** the core loop (code → join → learn → assign → answer → grade →
see grades) is real and wired. The gaps are (1) the actor on step 1, (10) the
export feature, and (7) duels being benched. See §3 for the fixes.

---

## 1. The actual lifecycle flow

Actors: **E1** student · **E2** teacher · **E2b** admin · **E5** Firebase.

### A. Teacher onboarding (precedes everything)
1. Teacher signs up — `/signup?role=teacher` or `/teacher/login` → `AuthDoor` →
   `signUpWithEmail(…, "teacher")` → `users/{uid}` **D2** with `role:"teacher"`,
   `status:"pending"`.
2. Teacher is gated into identity verification (`RequireRole` → `TeacherVerification`):
   uploads ID + selfie → `verifications/{uid}` **D7**; face-match runs.
3. **Admin** reviews at `/admin` → flips `users/{uid}.status` to `approved`.
   *(This — approval — is the admin's actual role in the loop, not code creation.)*

### B. Class + code creation — **the teacher does this**
4. Approved teacher opens `/teacher` → `createClass(teacherId, name)` writes
   `classes/{CODE}` **D4** with a 6-char `joinCode` (`joinCodeExpiresAt` = +30 days).
   The doc id is the original code; the active code lives in `joinCode` and can be
   `regenerateJoinCode()`-ed (old code dies instantly).
5. Teacher shares the code with the class (verbally / on the board — no in-app send).

### C. Student enrolment
6. Student goes to `/school-signup` (or `/school-login`) → `SchoolDoor`.
7. As they type the 6 chars, `resolveClassByCode()` looks up **D4** live and shows
   *which class* they're about to join (found / missing / expired / unverified).
8. On auth, `joinClass()` writes `classes/{CODE}/roster/{uid}` **D5** and stamps
   `users/{uid}.classId/.className` **D2**. The student lands on `/app`.

### D. Student learning (the daily use)
9. Student works through modules (§1.2). Engagement → `practice.*`; game bests →
   `recordTrial()` → `trials`; currency → `earnAurum()`; study path → `pathProgress`
   + SM-2 `reviews`; cards → `grimoire`/`compounds`/`forged` — all on `users/{uid}` **D2**.
10. `syncRosterStats()` denormalises stars/aurum/streak/… onto the roster entry **D5**
    so classmates' leaderboards and the duel challenge list can read them cheaply.

### E. Assignments
11. Teacher authors in `/teacher`: **Quiz Builder** → `classes/{id}.quizzes[]`;
    **Mission Configurator** → `classes/{id}.missions[]` **D4** (embedded arrays,
    not separate collections).
12. Student opens `/assignments` → reads the class doc **D4** → answers a quiz →
    `recordAssignmentResult()` → `users/{uid}.assignmentResults[quizId] = {score,outOf}`
    **D2**. Missions are proven by the student's own `practice.*` counters.
13. Teacher watches live results in the Quiz Builder (reads students' `assignmentResults`).

### F. Duels (peer play) — built, currently benched
14. `/duels` (Class Duels) pairs rostered classmates over `duels/{id}` **D6**; each
    client rewrites the authoritative serialized `DuelState` in turn; winner + payout
    settle once (localStorage dedupe **D8**). **Hidden from nav today** (`ARCADE_HIDDEN`).

### G. Grading & reporting
15. Teacher opens a student in `/teacher` gradebook → `getStudentGrades()` →
    `setStudentGrade(uid, topic, {score,outOf,feedback}, mastery)` → `users/{uid}.grades`
    + `.mastery` **D2**. These are the **only real grades** (practice/trials are not grades).
16. Student sees them at `/app` (the Bench): `grades` render as `score/outOf (%)` per
    topic, `mastery` as a labelled badge. (`src/routes/app.tsx`.)
17. **Export (formatted report): not implemented.** → §3.

### H. Repeat
18. Teacher issues the next quiz/mission (E), regenerates the code if needed (B4),
    enters the next grades (G); the student loop (D–F) continues.

---

## 2. One-line data trail

```
E2b admin ── approves ──▶ users.status (D7→D2)
E2 teacher ── createClass ──▶ classes/{CODE} (D4, joinCode)
E2 teacher ── shares code (offline)
E1 student ── SchoolDoor/joinClass ──▶ roster (D5) + users.classId (D2)
E1 student ── modules ──▶ practice/trials/aurum/… (D2) ──syncRosterStats──▶ roster (D5)
E2 teacher ── Quiz/Mission builder ──▶ classes.quizzes[]/missions[] (D4)
E1 student ── /assignments ──▶ users.assignmentResults (D2)
E1 ⇄ E1    ── /duels ──▶ duels/{id} state (D6)                [nav-hidden]
E2 teacher ── gradebook/setStudentGrade ──▶ users.grades/.mastery (D2)
E1 student ── /app ──◀ reads users.grades/.mastery (D2)
E2 teacher ── export formatted report ──▶ (MISSING)
```

---

## 3. Gaps & recommendations

1. **Grade export (step 10) — ✅ DONE (2026-10-14).**
   `buildClassGradesCsv` + `downloadCsv` in `src/lib/teacher.ts`; **Export CSV**
   button in the `/teacher` Gradebook tab. Fans the roster **D5** × each student's
   teacher-entered `grades`/`mastery` **D2** into a formatted CSV (per-topic
   score/outOf, %, mastery, + average), client-side Blob download with a UTF-8 BOM
   for Excel. The proposed flow (step 10) is now fully covered.

2. **Step 1 actor — "admin creates school code" does not match the model.**
   There is no "school" entity above classes, and admins don't mint codes —
   **teachers create classes and their join codes directly**. The admin's role in
   the loop is *approving teachers* (B3). If a true admin-owned "school code"
   (a school/org entity that groups classes, provisioned by an admin) is actually
   wanted, that's a new entity + new flow — not a tweak. Otherwise, read step 1 as
   "**teacher** creates the class code."

3. **Duels (step 7) — built but benched.**
   `/duels` fully works; it's hidden by `ARCADE_HIDDEN = true` in
   `StudentShell.tsx` (owner decision: "not too gamified"). Flip that flag to put
   peer duels back in the student nav; no new code needed.
