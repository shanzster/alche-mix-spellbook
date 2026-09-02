# AlcheMix

**Read `SCOPE.md` before doing anything** — it is the project's scope contract:
what AlcheMix is, the design principles, the shipped module surface, the
prioritized roadmap, what is explicitly out of scope, and the working
conventions (route registration checklist, verification commands).

Quick facts:
- TanStack Start file routes in `src/routes/` (no `src/pages/`, no Next.js
  conventions); `src/routeTree.gen.ts` is auto-generated — never hand-edit.
- Tailwind v4 with CSS custom-property tokens; every surface must work in
  dark AND light mode.
- Real chemistry values only; every AI feature needs a keyless fallback;
  practice counters are engagement, never grades.
- Verify with `npx tsc --noEmit` and `npm run build` before calling work done.

Background documents: `FEATURE_BRAINSTORM.md` (feature gap analysis vs 25
chem-ed platforms) and `docs/brainstorm/` (research pack).
