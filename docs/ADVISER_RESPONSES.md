# Responses to ADVISER_FEEDBACK.md — build of 2026-10-12 (overnight)

Status per item. "DONE" = implemented and typechecked/built this session.

## P0

1. **Standard periodic table — DONE.** The grid was already IUPAC-positioned
   in the data; the chart now renders through ONE shared component
   (`src/components/PeriodicGrid.tsx`) on both /periodic-table and /elements.
2. **Cell data — DONE.** Traditional cells show atomic number (top-left),
   atomic mass (top-right, opposite), large centred symbol, name beneath.
3. **Traditional/Interactive toggle — DONE,** defaults to Traditional; the
   lenses (state/trends/timeline) live under Interactive.
4. **Element detail completeness — DONE.** Every element's card shows name,
   symbol, Z, mass, melting/boiling points (K and °C), electron
   configuration (new `src/lib/electron-config.ts`, textbook exceptions
   verified), category, shells, description/lore. Remaining physically
   unmeasured constants are recorded in `docs/DATA_GAPS.md` and shown as
   "Not established".
5. **Class codes — DONE.** Codes are now regenerable (new code invalidates
   the old immediately) and expire after 30 days (`CODE_VALID_DAYS`).
   Expired/revoked codes give students a "ask your teacher for a fresh one"
   message, not a generic error. NOTE: `firestore.rules` changed — deploy
   with `firebase deploy --only firestore:rules` before demoing removal.
6. **Educator console — DONE.** Roster shows per-student rows with Remove;
   classes can be Archived/Restored; archived classes drop out of the
   working tabs but stay manageable.
7. **Back/Home — DONE.** Every page using PageHeader (all modules, teacher,
   admin, assignments) now has ← Back and ⌂ Home controls; browser back
   already worked (router history; modals use replace).

## P1

8. **Landing page — REBUILT** this session under the owner's direction
   (Bohr-atom hero restored by owner; dark-alchemy skin, serif/blackletter
   voice, live forge demo). Owner is iterating on it personally.
9. **Theme contrast — IMPROVED.** Light mode: stronger glass borders +
   lift shadows, deeper muted-text tone. Both themes re-screenshotted.
10. **Theme toggle — DONE.** Moved out of the student rail back to the
    top-right of the screen; rail duplicate removed; mobile keeps its
    top-bar toggle.
11. **Search — DONE.** /elements has live search PLUS a visible Search
    button below the field (keyboard-free operation).
12. **Category filter — PARTIALLY.** Labels enlarged and given colour dots;
    the tier filter (which only made sense for the old 44-element subset)
    was removed when the page moved to all 118. Her intended redesign is
    still unconfirmed — ask her before further rework (her note: "Ayusin mo
    yan" without specifics).
13. **Text size/spacing — PARTIALLY.** Category labels and legends bumped;
    the "hard to read typeface" at [29:27] still needs her to point at the
    screen she meant before changing fonts.
14. **Atomic Builder legends — DONE.** A "Legends" control on the model
    reveals proton/neutron/electron colours + a nucleus note.
15. **Term pages + hover previews — SHIPPED (reduced form).** 28 chemistry
    terms with Wikipedia-style hover previews (`Term` component) opening
    full in-house pages at /lexicon, EACH citing named reliable sources
    (Britannica article titles + standard textbooks — no Wikipedia).
    Integrated on /elements and the Atomic Builder; the component drops
    into any page in one line, so coverage can grow term by term.
16. **Vocabulary glossary — DONE.** Invented-word glossary lives on
    /lexicon ("Words of the Grimoire") and in `docs/GLOSSARY.md` for the
    manuscript appendix. Full user manual deliberately deferred per her
    sequencing instruction.

## P2

17. **Number entry — DONE.** Protons/neutrons/electrons accept typed
    numbers as well as steppers.
18. **Admin confirmation on sign-up — DECISION RECORDED.** Students: no
    admin confirmation needed — the class code IS the gate (her own
    Google-Classroom model; an invalid/expired code admits no one).
    Teachers: already require admin confirmation — the existing
    verification flow (teacher ID + face match, approved from the admin
    Control Room) must pass before educator features unlock. This is the
    justification to present if asked.
19. **Table consistency — DONE.** One `PeriodicGrid` component everywhere.

## Needs her confirmation before further work
- Item 12 (what the category control should become).
- Item 13 (which screen's typeface she meant).
- Item 17 was treated as a request and implemented; flag if she only meant
  it as an observation.
