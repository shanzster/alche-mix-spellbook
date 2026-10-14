# AlcheMix — Live Demo Guide (for presenting to Ms. Lucille Macusi-Republo / "Mam Lucy")

> A step-by-step script for Jerlyn to walk the adviser through the whole system
> and the end-to-end data flow: **super admin → school → teacher → student →
> assignment → submission → grade → export.** Follow it top to bottom; each step
> says what to click, what to say, and which page you're on.
> Last updated: 2026-10-14.

---

## 0 · Before the meeting (5-minute prep)

- **Start the app.** Local: run `npm run dev` and use the base URL
  **`http://localhost:8080`**. (If you're demoing a deployed build, swap that base
  URL into every link below.)
- **Deploy the latest rules once** (so the Audit log + user management work):
  `firebase deploy --only firestore:rules`.
- **Have the test accounts handy** (all password **`Password123!`**):
  - Super admin — `superadmin@gmail.com`
  - School admin — `schooladmin@gmail.com`
  - Teacher — `teacher@gmail.com`
  - You'll create a **student** live during the demo.
- **Open two browser windows** side by side: one for the teacher, one for the
  student. This lets Mam Lucy *see the data flow in real time* (teacher assigns →
  student sees it appear).
- Full account details live in `docs/TEST_ACCOUNTS.md`.

> Tip: new `/signup` student accounts email a real verification code (Brevo). For
> a smooth demo, either use a real inbox you can open, or create the student
> ahead of time.

---

## 1 · Open on the story (30 seconds) — page: [`/`](http://localhost:8080/)

Land on the home page. One line for Mam Lucy:

> "AlcheMix is an alchemy-themed chemistry learning app built on **real,
> textbook-accurate chemistry**. It's **classroom-ready** — it has a super-admin,
> school-admin, teacher, and student side, all multi-tenant by school. I'll show
> you the full loop: an admin sets up a school, a teacher assigns work, a student
> does it, and the grade flows back."

---

## 2 · Super Admin — the platform owner — page: [`/admin/login`](http://localhost:8080/admin/login)

1. Sign in as **`superadmin@gmail.com`** → lands on **[`/admin`](http://localhost:8080/admin)**.
2. Point out the **Overview** stat cards (users, teachers, classes, pending reviews).
3. Go to **Schools → New school**. Fill:
   - School name (e.g. *"Lyceum of Subic Bay"*)
   - School admin **name, email, password** → **Create school & admin**.
   - 👉 Say: *"The super admin creates the school AND its admin account in one
     step, and the school gets a generated code — this is the multi-tenant layer
     the paper lists as planned."*
4. Open the **Verifications**, **Users**, and **Audit log** tabs briefly.
   - 👉 Say: *"Every privileged action is written to an append-only **audit log** —
     accountability for a school system."*

**Talking point:** the super admin is the developer/platform owner; the same
components will later power a school-scoped admin view filtered by school.

---

## 3 · School Admin — runs one school — page: [`/school/signin`](http://localhost:8080/school/signin)

1. Sign in as **`schooladmin@gmail.com`** → **[`/school`](http://localhost:8080/school)**.
2. Show the **School code** card. 👉 Say: *"This code is the school's identity — it
   **groups** the school's teachers and students. The school admin **cannot**
   regenerate it; only a super admin can."*
3. **Teachers → Add a teacher**: enter a **name, email, password** → **Create
   teacher account**.
   - 👉 Say: *"The school admin creates the teacher's full account — bound to this
     school and auto-approved. Notice it immediately gets a **class code** (shown
     on the teacher's row) — that's what students use to enrol with this specific
     teacher."*

**Talking point (the two codes, cleanly):**
> School code = the institution (groups everyone). Class code = enrols a student
> into **one specific teacher's class/section** (like "Grade 9 – Diamond").

---

## 4 · Teacher — assigns the work — page: [`/teacher/login`](http://localhost:8080/teacher/login)

Use the **teacher window.** Sign in as **`teacher@gmail.com`** → **[`/teacher`](http://localhost:8080/teacher)**.

1. **Classes tab** — show the class and its **class code** (e.g. `DMND01`). This is
   the code students type. (Rename the class to a section name like *"Grade 9 –
   Diamond"* to make it concrete.)
2. **Quiz Builder tab** — pick the class → **New quiz**, or choose a curriculum
   topic and **Seed from curriculum** (auto-fills real concept questions) → add/edit
   questions → **Save quiz**.
   - 👉 Say: *"The teacher authors the assignment. Students in this class see it
     instantly."*
3. (Optional) **Missions tab** — show that a mission targets the student learning
   **modules** themselves.

Keep this window open — you'll return to see the score arrive.

---

## 5 · Student — joins and does the work — student window

1. Go to **[`/school-signup`](http://localhost:8080/school-signup)**.
2. Enter the **class code** from Step 4 → it confirms *"You're joining Grade 9 –
   Diamond."* Create the student account (name, email, password).
   - 👉 Say: *"The student enrols into that specific teacher's class with the class
     code."*
3. Back in the **teacher window → Classes tab**, **accept** the student's join
   request. (This is the one approval step.)
4. In the **student window**, open **[`/assignments`](http://localhost:8080/assignments)**.
   - 👉 Say: *"There's the quiz the teacher just assigned."* Take it and submit.
   - The student **sees their score immediately** (e.g. "8 / 10").

---

## 6 · The grade flows back — teacher window

1. **Quiz Builder tab** → under the quiz, the student's **score appears** in the
   results list.
   - 👉 Say: *"The submission flowed straight back to the teacher — no manual
     collection."*
2. **Gradebook tab** → enter topic grades if you like, then **Export** the grade
   report as **CSV**.
   - 👉 Say: *"The teacher exports a grade report for their records."*
3. **Performance tab** → show the class progress matrix and the struggling-concepts
   view.

**The loop, named for Mam Lucy:** *assign → student sees → submits → teacher sees
& grades → student sees the grade → teacher exports.* ✅

---

## 7 · Close — what makes it thesis-worthy (1 minute)

Hit these points:
- **Real chemistry, always.** Values are textbook-accurate; engines are curated
  and illustrative (stated honestly, not research-grade).
- **AI with a keyless fallback.** Every AI feature (tutor, quiz generation,
  grading help, scavenger vision) still works with no API key — it falls back to
  rule-based mode, so a classroom is never blocked.
- **Multi-tenant by school**, with role separation (super admin / school admin /
  teacher / student) enforced by Firebase security rules.
- **Accountability**: append-only audit log; teacher-entered grades are separate
  from engagement counters (a super admin can't alter a grade).
- **Privacy** (DPA / RA 10173): a student's images/records stay on their own record.

---

## Page-link quick reference

| Page | Link | Who |
|---|---|---|
| Home | [`/`](http://localhost:8080/) | everyone |
| Super admin sign-in | [`/admin/login`](http://localhost:8080/admin/login) | super admin |
| Super admin console | [`/admin`](http://localhost:8080/admin) | super admin |
| School admin sign-in | [`/school/signin`](http://localhost:8080/school/signin) | school admin |
| School admin console | [`/school`](http://localhost:8080/school) | school admin |
| Teacher sign-in | [`/teacher/login`](http://localhost:8080/teacher/login) | teacher |
| Teacher console | [`/teacher`](http://localhost:8080/teacher) | teacher |
| Student join (class code) | [`/school-signup`](http://localhost:8080/school-signup) | student |
| Student sign-in | [`/login`](http://localhost:8080/login) | student |
| Student hub | [`/app`](http://localhost:8080/app) | student |
| Student assignments | [`/assignments`](http://localhost:8080/assignments) | student |

---

## Gotchas (so nothing surprises you on the day)

- **Student join needs teacher approval** (Step 5.3). Keep both windows open.
- **`/signup` emails a code** — use a real inbox, a pre-made student, or the
  `/school-signup` class-code flow.
- **Audit log + super-admin user-delete** need the latest rules deployed
  (`firebase deploy --only firestore:rules`).
- Camera/AR features (Scanner, Scavenger, Identifier) only work on a **phone over
  HTTPS** — mention them, but demo them from a phone if asked, not the laptop.
- **Coming next (not in this demo):** assignments that **lock** a module's trial
  until a teacher assigns it, then record that trial's score back to the teacher
  (the "Option B" model) — in progress.
