# AlcheMix — Multi-School (Multi-Tenant) Design

> AlcheMix is becoming a multi-school platform (Google-Classroom-style): many
> schools, each with its own admin dashboard, branding, and codes. This doc is
> the locked design + the phased build plan. Decisions below were made with the
> owner on 2026-10-14. Update it as phases land. Companion: `docs/FLOW.md`
> (lifecycle), `docs/DATA_INVENTORY.md` (stores).

## The hierarchy

```
Super Admin (hardcoded for now — one account)
  • creates Schools (name, logo, branding, school code)
  • creates School Admin accounts and assigns each to a school
  • manages every school, admin, user, and code globally
  └─ School (schools/{id} — name, code, logo, branding, active)
       └─ School Admin (created by a super admin; runs ONE school)
            • sees/edits their school: name, logo, branding
            • sees + can regenerate the school code
            • shares the school code with teachers
            • manages the school's teacher roster
            • provisions TEACHERS by email (no teacher self-signup)
            └─ Teacher (provisioned by email → signs in at /teacher/login, auto-approved)
                 • creates Classes under the school (each class has a join code)
                 • shares the CLASS code with students (URL autofill)
                 • ACCEPTS student join requests (approval-based enrolment)
                 • assignments, grading, etc. (unchanged, now school-scoped)
                 └─ Student (signs up via URL with the class code prefilled)
                      • requests to join the class → teacher accepts → enrolled
```

## Locked decisions

1. **Two codes, two levels.** The **school code** onboards *teachers* into a
   school. Students still join a specific **class** via that class's existing
   join code — preserving roster/gradebook/assignments per class.
2. **Student enrolment is request-based.** A student signing up with a class
   code creates a *join request*; the **teacher accepts** it before the student
   is on the roster. (Changes today's auto-enrol `joinClass`.)
3. **Student link autofill.** Teachers share a URL like
   `/school-signup?code=ABC123`; the code prefills the School Door form.
4. **School admins are created by super admins** and assigned to one school.
5. **A school owns:** name, logo, branding (accent color). **No** subscription,
   plan, or billing.
6. **Super admin is hardcoded** for now (`ADMIN_EMAILS`); a managed super-admin
   set comes later.

### Defaults chosen for undecided details (flag if you want them changed)
- **Teacher verification** (ID / face-match) stays, but is reviewed by the
  **school admin** of that teacher's school (moves off the super admin). Lands
  in Phase 3.
- **One school admin per school** to start; the model allows `adminUids[]` so
  multiple is a later, non-breaking change.
- A teacher/student belongs to **exactly one school** (`users.schoolId`).

## Roles

`users.role`: `admin` | `school_admin` | `teacher` | `student`.
**`"admin"` IS the super admin** (kept as-is to avoid churn across the codebase;
the hardcoded `ADMIN_EMAILS` account gets it). `school_admin` is the new role.

`homeForRole`: super_admin → `/admin` · school_admin → `/school` ·
teacher → `/teacher` · student → `/app`.

## Data model (new + changed)

**New collection `schools/{schoolId}`** (owner: `src/lib/schools.ts`):
| Field | Type | Notes |
|---|---|---|
| id | string | auto id |
| name | string | display name |
| code | string | 6-char, unique — the SCHOOL code (teacher onboarding) |
| logoUrl | string | data URL or path (branding) |
| brandColor | string | accent for the school's dashboards (branding) |
| adminUids | string[] | the school's admin user(s) |
| createdBy | string | super admin uid |
| createdAt | Timestamp | |
| active | boolean | soft-disable a school |

**`users/{uid}` additions:** `schoolId` (string — for school_admin, teacher,
student); `role` gains the two new values.

**`classes/{id}` addition:** `schoolId` (which school the class belongs to).

**Class join requests (Phase 4):** `classes/{id}/requests/{uid}` — pending
student requests `{uid, name, email, requestedAt}`; teacher accept → moves to
`roster/{uid}` (D5) + stamps the student; reject → deletes.

## Routes

- `/admin` — **Super Admin console** (repurposed): Schools tab (create/manage
  schools, mint codes), School Admins tab (create + assign), global users.
- `/school` — **School Admin dashboard** (new): this school's details, code,
  branding editor, teacher roster.
- `/teacher`, `/teacher/login`, `/app`, `/school-signup`, `/school-login` —
  existing, progressively school-scoped.

---

## Phased build plan

- **Phase 1 — Foundation (schools + roles + super-admin school mgmt).**
  Role type + `homeForRole` updated; hardcoded email → `super_admin`.
  `schools` collection + `src/lib/schools.ts` (createSchool, listSchools,
  getSchool, updateSchool, regenerateSchoolCode, resolveSchoolByCode,
  createSchoolAdmin). Super Admin console gains Schools + School-Admins tabs.
  Security rules for `schools`. **✅ DONE (2026-10-14).** Shipped:
  `src/lib/schools.ts`; role + `schoolId` on profile; `homeForRole`/`RequireRole`
  route `school_admin` → `/school`; `ensureUserProfile` promotes an invited email
  to `school_admin` on login; Super Admin `/admin` → **Schools tab** (create
  school, regenerate code, designate school-admin by email); minimal `/school`
  dashboard (shows the school code); `firestore.rules` for `schools` +
  `schoolAdminInvites` + guarded self-promotion. **Needs
  `firebase deploy --only firestore:rules` to work against live Firestore.**
- **Phase 2 — School Admin dashboard (`/school`). ✅ DONE (2026-10-14).**
  `/school` rebuilt: school-code card (copy + regenerate), branding editor
  (name, logo upload → downscaled data URL, brand-color picker → `updateSchool`),
  and a live teacher-roster card (`useSchoolTeachers`, empty until Phase 3).
  Rules: a school admin may update ONLY their own school's
  name/logo/brandColor/code, and read user docs within their school.
- **Phase 3 — Teacher ↔ School. ✅ DONE (2026-10-14).**
  (A) Teacher signup (`/signup?role=teacher`) now has a live school-code field
  (`resolveSchoolByCode`); `signUpWithEmail`/`signInWithGoogle`/`ensureUserProfile`
  carry `schoolId` → stamped on the teacher's profile. (B) `createClass` takes
  `schoolId`; `/teacher` passes the teacher's school so classes carry `schoolId`.
  (C) The `/school` teacher roster gained **Approve/Reject + Review-ID** per
  pending teacher (reuses `approveTeacher`/`rejectTeacher`/`getVerification`).
  Rules: a school admin may set `status` on their school's teachers and
  read/update those teachers' `verifications`. (Super admin can still review too.)
- **Phase 4 — Student join-by-URL + request/approval. ✅ DONE (2026-10-14).**
  `/school-signup?code=ABC123` (and `/school-login`) autofill + resolve the code.
  Enrolment is now request-based: `requestToJoinClass` writes
  `classes/{id}/requests/{uid}` + stamps `users.pendingClassId/pendingClassName`;
  `/app` shows a "Request sent" card (with cancel); the teacher's class card has a
  **Join requests** block with Accept (`acceptJoinRequest` → roster + stamp +
  drop request) / Reject. Rules: requests subcollection (student creates/own,
  teacher reads/deletes), teacher may create roster entries + clear pending keys.
- **Phase 5 — Tenant isolation + scoping + migration. ✅ DONE (2026-10-14).**
  `backfillIntoDefaultSchool` (super-admin button in the Schools tab) stamps
  every school-less teacher + class into a reusable "Default School". Super admin
  may now update classes (migration/oversight). **Isolation model (honest):**
  tenancy is enforced by (a) role scoping — school admins see only their school's
  teachers/verifications/users; teachers see only their own classes; (b) secret
  codes — class/school codes are the join secret; (c) `schoolId` stamps on users
  and classes. NOT added (deliberately, to avoid breaking the public pre-auth
  class-code `get` and the working flows): hard rule-level blocks on reading
  another school's class doc by known id. Acceptable for the current milestone.

> Build order is deliberate: each phase is shippable and verified (`tsc` +
> `npm run build`) before the next. Nothing below Phase N assumes Phase N+1.

---

## Post-phase updates

### 2026-10-18 — Login flow: a code is for REGISTERING, not signing in

The School Door used to offer a *sign-in with a class code* mode
(`/school-login`). That was wrong: once a student has an account it is already
linked to their school, so re-entering a code to log in made no sense (and the
old flow even re-fired a join request on every login). Fixed:

- **`/school-login` now redirects to `/login`** (`beforeLoad` → `redirect`).
  Old links/bookmarks still resolve.
- The class-code door (`/school-signup`, `SchoolDoor`) is **registration-only**.
  Its footer now sends existing accounts to `/login` ("Already have an account?
  Sign in").
- The `/login` (`AuthDoor`) class-code banner now points to **`/school-signup`**
  ("New, with a class code? Join your class when you sign up").
- Returning users of every role sign in at `/login` (or the role doors) and are
  routed by `homeForRole` — student → `/app` (their class), teacher → `/teacher`,
  school_admin → `/school`, super admin → `/admin`. A code is never needed again.

### 2026-10-18 — `/school` rebuilt as a full console

The school-admin dashboard was a single scrolling page. It now wears the same
shell as the student/teacher consoles (desktop floating rail + mobile floating
top bar + fixed bottom tab bar; see `DESIGN_DIRECTION.md` §7b), accent amber,
with four tabs:

- **Overview** — teacher/class stat tiles, a pending-teacher-approval callout
  (jumps to Teachers), and the shareable school code.
- **School** — the code card + branding editor (name, logo, brand colour).
- **Teachers** — provision teacher accounts, roster, Approve/Reject + Review-ID
  (unchanged behaviour, reused).
- **Classes** — read-only oversight of every class under the school (name,
  teacher, join code, archived state) from `useSchoolClasses`.

**Honest limits:** no Students tab — students don't reliably carry `schoolId`,
and Firestore rules don't let a school admin read class rosters (only the class
teacher can). So per-class student counts live in each teacher's console, and
Classes oversight shows class-doc fields only. Lifting that would need a rules
change (school-admin roster read) + a redeploy.
