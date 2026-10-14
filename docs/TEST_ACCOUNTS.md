# AlcheMix — Test Accounts & Login Runbook

> ⚠️ Keep out of any public repo (secrets-adjacent). Everything you need to log
> in and exercise all four roles for manual testing.
> Last updated: 2026-10-14.

## ✅ Ready now — seeded accounts (created 2026-10-14)

These three accounts already exist in the live `alchemix-grimoire` project with
their roles set — **just sign in**, no sign-up/verification needed. Each has its
own dedicated, role-locked login page.

| Role | Email | Password | Login page |
|---|---|---|---|
| **Super admin** | `superadmin@gmail.com` | `Password123!` | `/admin/login` |
| **School admin** | `schooladmin@gmail.com` | `Password123!` | `/school/signin` |
| **Teacher** | `teacher@gmail.com` | `Password123!` | `/teacher/login` |

- A test school **"Lyceum of Subic Bay (Test)"** (id `lsb-test`, school code
  **`LSBTST`**) was created; the school admin + teacher are attached to it.
- The teacher is pre-**approved** (no ID review needed).
- A **student** account is not seeded — students self-register at `/signup`
  (with the emailed code) or join a class at `/school-signup`. See §4.

> Each login rejects the wrong role: e.g. the teacher can't sign in at
> `/admin/login`. The student themed door stays at `/login`.

---
### Reference — how the accounts/roles were provisioned (for re-creating)

## ⚠️ Read this first — sign-up now emails a code

As of 2026-10-14, **`/signup` emails a 6-digit verification code via Brevo**
before the account is created. So **every brand-new account needs a real email
inbox you can open** — including the first-time bootstrap of admin, school
admin, and teacher accounts (they all create their password at `/signup`).

Two ways to test:
- **Real inboxes (default):** use Gmail/any address you control; open the email,
  type the code. The sender is `jherlyndelacruz24@gmail.com` (a verified Brevo
  sender). Subject: *"Your AlcheMix sigil: ######"*.
- **No-email dev mode:** comment out `BREVO_API_KEY` in `.env` and restart
  `npm run dev`; the code is then **printed to the dev-server console** instead
  of emailed. Handy for throwaway test emails.

> Returning logins at `/login` and `/teacher/login` do **not** require a code —
> only the first-time `/signup` does.

---

## 1 · Super Admin  (role `admin`)

| Field | Value |
|---|---|
| **Email** | `ramalusubov@gmail.com` (hard-coded allowlist — the only admin) |
| **Password** | whatever you set on first sign-up (suggested `AlcheMixAdmin!2026`) |
| **Console** | `/admin` |

**First time (bootstrap):** go to `/signup`, enter the admin email + a password,
verify the emailed code → you're auto-promoted to `admin`. (You'll briefly land
on `/app` then get routed to `/admin`.)
**After that:** sign in at `/login`.

What to test: Overview stats · **Schools** (create a school, designate a school
admin) · **Verifications** (teacher ID review) · **Teachers** (approve/revoke) ·
Users / Classes viewers.

---

## 2 · School Admin  (role `school_admin`)

Not self-serve — the **super admin creates the account directly** (no email
invite / self-signup, no verification code).

**To create one (as super admin):**
1. `/admin` → **Schools** → **New school**: fill the school name, then the
   admin's **name + email + password** → **Create school & admin**.
2. The account is created immediately (on a throwaway secondary Firebase app so
   your super-admin session stays put), and the school gets its generated code.
   Add more admins anytime from a school's card → **Add an admin account**.

**To log in as the school admin:** go straight to `/school/signin` with the
email + password you set — no code needed. (Any email works; it does NOT have to
be a real inbox, since nothing is emailed.)

| Field | Value |
|---|---|
| **Email** | *(the email you set when creating the school)* |
| **Password** | *(the password you set)* |
| **Console** | `/school` (sign in at `/school/signin`) |

What to test: invite a teacher by email; copy/regenerate the school code; edit
branding; approve/reject a pending teacher.

---

## 3 · Teacher  (role `teacher`)

Not self-serve — a school admin invites them (invited teachers are
auto-approved; no ID review needed).

**To create one (as school admin):**
1. `/school` → **Teachers** card → enter the teacher's email, e.g.
   `alchemix.teacher@gmail.com` → **Add**.

**To log in as the teacher (first time):**
2. Open `/signup`, enter that exact email + a password, verify the emailed code.
3. You're created as a `teacher` (status `approved`) and routed to `/teacher`.
   (Returning: sign in at `/teacher/login`.)

| Field | Value |
|---|---|
| **Email** | *(the invited email — use a real inbox)* |
| **Password** | *(set at first sign-up)* |
| **Console** | `/teacher` (sign in at `/teacher/login`) |

What to test: create a class (note the **join code**); open **Missions**, build
an assignment by tapping modules from the catalog (all 24 now available); open
**Quiz Builder**, seed from a curriculum topic; check Gradebook, Performance,
Evidence.

---

## 4 · Student  (role `student`)

Fully self-serve — two doors:

- **Open signup:** `/signup` → enter name + email + password → **verify the
  emailed code** → lands in the student hub `/app`. Suggested test email:
  `alchemix.student@gmail.com` (use a real inbox).
- **Class-code door:** `/school-signup` → students join a class with the
  **teacher's join code** from step 3 above.

What to test: do a couple of modules, then confirm the teacher's **Mission**
items tick off (they complete from real practice counters), and that a taken
quiz's score shows back on the teacher's side.

---

## Suggested end-to-end test order

1. Bootstrap **super admin** → create a school + designate a school admin.
2. Sign in as **school admin** → invite a teacher.
3. Sign in as **teacher** → create a class, author a Mission + a Quiz.
4. Sign up a **student** → join the class with the join code → do the modules →
   verify completion/scores flow back to the teacher.

> Tip: for steps 1–4 you need 4 distinct email inboxes. If that's inconvenient,
> use the **no-email dev mode** above and read each code from the dev console,
> or use Gmail "+aliases" (e.g. `youraddress+teacher@gmail.com`) which all land
> in one inbox.
