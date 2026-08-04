# AlcheMix — Recommendations & Ideas

A running list of features, improvements, and "next moves" for the platform —
grouped by theme, with a rough **Impact / Effort** read to help you prioritise.

Context of where the app is today:
- **Student:** Hub, Atomic Builder, Periodic Table codex, Grimoire (AR scan / collect / mix cards), Equation Balancer, Gas Laws sim, 3D Quiz, teaching layer, teacher-driven progress.
- **Teacher:** Educator Console — classes + join codes + roster + gradebook (Quiz Builder / Missions / AI review scaffolded).
- **Admin:** teacher verification (ID + on-device face match) + approval.
- **Stack:** TanStack Start, Firebase (Auth + Firestore), Three.js, face-api.js, Cloudflare; Gemini AI planned (see `Free-Ai-Implementation-Tutorial.MD`).

Legend: 🟢 quick win · 🟡 medium · 🔴 big build · ⭐ high demo/impact value

---

## 1. Finish what's already speced (highest ROI)

These come straight from your existing requirement docs and close obvious gaps.

| Feature | Notes | Impact / Effort |
|---|---|---|
| **AI AR-scavenger verification** ⭐ | Wire the Gemini proxy from the tutorial to grade scanned-card missions. Ties Grimoire + AI together. | 🔴 |
| **AI problem-set generator + auto-grading** | Unique per-student Gas Law / stoichiometry problems with step-by-step feedback. | 🟡 |
| **Teacher Quiz Builder** | Let teachers define target compounds, timed balancing sets, 3D ID tasks → assign to a class. | 🔴 |
| **Mission Configurator** | Teachers pick problem sets + AR card prompts per lesson. | 🟡 |
| **Simulation lock/unlock** | Gate modules (e.g. lock Gas Laws until Atomic Structure passes). | 🟢 |
| **Class Performance Matrix** ⭐ | Aggregate grid: accuracy per module across the class + **high-error concept flags**. | 🟡 |
| **Full periodic table** | Expand the codex dataset from 19 → all 118 (lighter content for the long tail). | 🟢 |

---

## 2. AI-powered ideas (leverage the planned Gemini setup)

- **"Ask the Alchemist" tutor chatbot** ⭐ — a floating helper that answers chemistry questions in-context (multimodal: student can snap a photo of homework). 🟡
- **Explain-my-mistake** — when a quiz/equation is wrong, AI gives a tailored hint, not just the answer. 🟢
- **Auto-generated flashcards / summaries** per topic. 🟢
- **Lab report grader** — student writes an observation, AI checks reasoning. 🟡
- **Difficulty auto-tuning** — AI raises/lowers problem difficulty from recent accuracy. 🔴

> Keep all AI keys server-side (proxy pattern) and add rate-limiting — see the AI tutorial.

---

## 3. Learning & engagement

- **Spaced-repetition review** ⭐ — resurface previously-missed concepts on a schedule. Strong pedagogy, great differentiator. 🟡
- **Guided lesson paths** — a "learn → practise → assess" track per topic instead of loose modules. 🟡
- **Achievements as mastery milestones** (not game XP) — e.g. "Balanced 20 equations", "Discovered 12 cards". Aligns with the teacher-input philosophy. 🟢
- **Daily challenge** — one rotating problem per day. 🟢
- **Collaborative lab / co-op mix** — two students combine cards in real time (Firestore live). 🔴 ⭐
- **Class live-mode** — teacher runs a synchronized quiz; students answer live (think Kahoot). 🔴 ⭐

---

## 4. Content depth (chemistry)

- **Real 3D molecular geometry viewer** (VSEPR shapes, not just Bohr) — bent, tetrahedral, etc. ⭐ 🟡
- **Reaction animation** — show bonds breaking/forming for a balanced equation. 🟡
- **Lab safety & apparatus module** — hazard symbols, equipment ID. 🟢
- **Titration / pH simulator** — another interactive sim in the same style. 🟡
- **Isotope & radioactive decay visualiser** — extends Atomic Builder. 🟢

---

## 5. Teacher & admin tooling

- **CSV / PDF export** of the gradebook and reports ⭐. 🟢
- **Bulk student import** (roster upload) + remove/reset student. 🟡
- **Announcements** to a class. 🟢
- **Assignment due dates + submission tracking.** 🟡
- **Admin: teacher management** — list/search all teachers, revoke access, audit log. 🟡
- **Admin analytics** — platform usage, active classes, sign-ups over time. 🟡
- **Auto-approve high-confidence face matches** (≥ threshold) to cut admin load; manual only for borderline. 🟢

---

## 6. Notifications & communication

- **In-app + email notifications** — "grades posted", "new assignment", "teacher approved". 🟡
- **Web push** (PWA) for missions/reminders. 🟡
- **Parent/guardian read-only portal** — view a child's progress. 🔴

---

## 7. Platform, PWA & accessibility

- **Make it a PWA** ⭐ — installable, offline shell, home-screen icon. Great for classroom tablets & low connectivity. 🟡
- **Localization (English + Filipino)** ⭐ — big for your audience; wrap strings in an i18n layer. 🟡
- **Accessibility pass** — keyboard nav, ARIA on the 3D/quiz interactions, colour-contrast audit, screen-reader labels. 🟡
- **Reduced-motion** already respected — extend to the Three.js scenes. 🟢
- **Onboarding tour** — first-run walkthrough of the Grimoire + modules. 🟢
- **Loading skeletons** instead of spinners on data-heavy screens. 🟢

---

## 8. Technical hardening (do before real users)

| Item | Why | Effort |
|---|---|---|
| **Move verification/AR images to Firebase Storage** | Base64-in-Firestore hits the 1 MB doc limit; Storage is the right tool. | 🟡 |
| **Firebase App Check** | Blocks abuse of your Firestore/AI from outside your app. | 🟢 |
| **Server-side AI proxy + rate limiting** | Protect keys and quota (per the AI tutorial). | 🟡 |
| **Tighten Firestore rules + tests** | Add the Firestore rules emulator test suite. | 🟡 |
| **Error monitoring** (Sentry) + **analytics** (already have GA) | See failures & usage in the wild. | 🟢 |
| **Automated tests** — unit (Vitest) + e2e (Playwright) on auth/roles/grading | Confidence as it grows. | 🟡 |
| **CI/CD** — build + deploy on push (Cloudflare/Firebase Hosting) | Faster, safer releases. | 🟢 |
| **Bundle/Three.js perf** — lazy-load heavy 3D, code-split routes (partly done) | Faster first load, esp. mobile. | 🟡 |
| **Data privacy / minors** | Student data = sensitive; add a privacy policy, consent, retention, and consider FERPA/GDPR-style handling. | 🟡 |

---

## 9. Marketing & product

- **SEO + SSR content** for the public landing (currently gated behind an auth check). 🟢
- **Demo / sandbox mode** — try a module without signing up (drives conversion). 🟡
- **Grimoire card commerce** — deepen the existing Shopee link (bundles, class packs). 🟢
- **School licensing / pricing page.** 🟡
- **Case study / results page** — show learning outcomes for credibility. 🟢

---

## 10. Suggested phased roadmap

**Phase A — polish & close gaps (1–2 sprints)**
- Simulation lock/unlock, full periodic table, gradebook CSV/PDF export, achievements-as-mastery, App Check, error monitoring.

**Phase B — the AI layer (needs Gemini proxy)**
- AI AR-scavenger verification → AI problem sets + auto-grading → "Ask the Alchemist" tutor.

**Phase C — teacher power tools**
- Quiz Builder, Mission Configurator, Class Performance Matrix + high-error flags, assignments/due dates.

**Phase D — reach & scale**
- PWA + offline, localization (EN/FIL), notifications, parent portal, live class mode.

---

## 11. Highest-impact picks (if you only do a few)

1. **AI AR-scavenger verification** — completes the signature feature loop. ⭐
2. **Class Performance Matrix + high-error flags** — what teachers actually want. ⭐
3. **PWA + Filipino localization** — massively widens real-world usability. ⭐
4. **"Ask the Alchemist" AI tutor** — a memorable, demo-friendly wow feature. ⭐
5. **Move images to Storage + App Check + AI rate-limiting** — the boring stuff that makes it production-real. ⭐

---

*Related docs:* `STUDENT-REQUIREMENTS.MD`, `alchemix_teacher_features_v3.md`,
`Free-Ai-Implementation-Tutorial.MD`, `FACE_API_REQUIREMENTS.MD`, `ADMIN_CREDENTIALS.MD`.
