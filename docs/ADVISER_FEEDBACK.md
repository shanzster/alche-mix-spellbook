# Adviser Feedback — Consultation Review

Source: consultation recording with Ms. Lucille Macusi-Republo, transcribed.
Timestamps in brackets point back at the recording.

**Status stated in the consultation:** the platform is roughly 40% complete
[12:14]. Defense is expected in December [12:17]. There is no semester break
for this project [12:22].

**How to use this file.** Work top to bottom. P0 items block the defense
demo. P1 items were explicitly asked for. P2 items are improvements she
raised but did not insist on. Do not start anything outside this list until
P0 and P1 are clear.

---

## P0 — Blocks the defense

### 1. Adopt the standard periodic table arrangement [4:45–5:36]

The current custom arrangement must be replaced by, or made switchable with,
the conventional IUPAC layout.

Her reasoning, stated directly: Grade 8 students already study the table of
elements [5:00]. The standard arrangement has not changed [5:17]. Students
are familiar with the usual display, and a different arrangement will
confuse them [5:31].

- Render the 118 elements in the conventional period-and-group grid.
- Lanthanides and actinides in the usual two detached rows.
- Do not reposition cells for aesthetic reasons.

### 2. Element cells must carry the standard data [5:44–6:27]

Each cell in the grid shows, in the arrangement students already know:

- element symbol, large, centred
- atomic number
- atomic mass, placed opposite the atomic number
- element name

She described it as: the symbol, "tapos kailangan din dito yung atomic
number niya, atomic mass sa kabila" [6:21].

### 3. Traditional / interactive toggle [6:28–6:59]

One control that switches the periodic table between two presentations:

- **Traditional** — the static conventional table, the display students
  recognise from class.
- **Interactive** — the existing lensed version with the trend heat maps,
  state slider and discovery timeline.

Her words: "Pwede siyang pagpiliin. O toggle na lang" [6:53]. Default to
Traditional so the first thing a student sees is familiar.

### 4. Element detail pages are missing information [4:34, 27:29]

"Kulang yung information mo sa Fe" [4:34]. "Maganda na siya eh, kaso nga
lang, kulang ng information" [27:31].

Every element page needs, at minimum: name, symbol, atomic number, atomic
mass, boiling point, melting point, electron configuration, category, and a
short description. Fill the gaps against `periodic-table-data.ts` and record
which fields are still blank.

### 5. School / class code system [10:01–11:25]

Students must not each be registered individually [10:15]. Instead:

- An educator generates a code for their class. The code belongs to one
  school and one class [10:22].
- A student entering the code is automatically placed in that class
  [10:21], and that is how the platform knows which school the student
  belongs to [10:26].
- Modelled on Google Classroom's class code [10:47], which she named as the
  reference.

Two requirements she added that the current implementation does not have:

- **The code must be regenerable** [10:56]. An educator can issue a new code
  at any time.
- **The code must expire** [11:16]. The reason she gave: so that former
  students cannot keep using an old code to get back in [11:20].

### 6. Educator console must be polished [11:46–12:00, 14:02]

She asked whether the educator account exists and the answer was that it is
not ready [14:13]. She responded "dapat ipolish mo na yan" [11:58].

- Complete the educator account flow end to end.
- An educator can see the students in their class [11:36].
- An educator can **remove** a student who is not part of the class
  [13:51, 13:57].
- An **archive** function for students or classes [13:59, 14:00].

### 7. Back and home navigation [16:29–17:18]

There was no way to return to the previous screen during the demo. She
asked twice and the answer was "wala pa" [16:42].

- A working back control on every inner page.
- A home control that returns to the hub [17:08].
- Verify the browser back button behaves correctly on every route.

---

## P1 — Explicitly requested

### 8. Landing page [3:10]

"Ang pangit pa rin yung landing page mo" — the landing page is still bad.
This is the second time she has said it. Rebuild it rather than adjusting it.

### 9. Theme contrast in both modes [3:39–3:53]

When the background changes between dark and light, every other element must
adjust with it [3:42]. Her specific complaint: in light mode, light content
stops standing out against the background — "parang hindi na siya umaangat
from the background" [3:49].

- Audit every surface in both themes.
- Check the top navigation specifically: logo, About, Elements [3:32].

### 10. Theme toggle is in the wrong place [14:35–15:14]

The view/theme switch that used to sit in its original position has been
moved into the menu [14:46]. She wants it back where it was [14:57] and the
duplicate removed [15:13].

### 11. Search control [4:06–4:33]

Search by name, symbol and atomic number exists but:

- There is no visible search button; it sits at the side rather than below
  the field [4:10–4:14].
- Live search as you type is correct and should stay [4:25–4:33].
- Add a clickable search button as well, because she asked what happens if
  the keyboard does not work [4:20].

### 12. Category filter [3:53–4:04]

The tier / combo / per-category control. Her verdict: "Ayusin mo yan. Hindi
ko gusto" [4:04]. Rework it. The transcript does not capture a specific
alternative, so confirm the intended behaviour with her before rebuilding.

### 13. Text size and spacing [15:22–15:44, 29:27–29:39]

- Category labels are too small to read [15:26].
- The layout assumed a large screen; it must be flexible [15:52].
- Review spacing throughout [29:35].
- One typeface was called hard to read [29:27]; identify which screen this
  referred to before changing anything.

### 14. Legends for the Atomic Builder [21:57–23:18]

The Bohr diagram uses colour to distinguish particles [23:15] with nothing
explaining what the colours mean.

- Add a **Legends** control that reveals what each dot represents: proton,
  neutron, electron [23:08].
- An image or a simple panel is acceptable [22:23].
- She asked directly: "Asan diyan ng proton? Asan diyan ng neuron?" [22:30].

### 15. Term definitions with hover preview and linked pages [23:19–27:17]

This is the largest item in the list and she spent four minutes on it.

**The behaviour she described:**

- Hovering a term shows a short preview with basic information only
  [24:36, 26:48].
- Clicking opens a page with the full details [24:41, 27:00].
- She used Wikipedia's hover preview as the interaction reference [24:31]
  and demonstrated it during the session [25:14].

**The sourcing rule, which matters more than the interaction:**

- **Do not use Wikipedia as a source.** Her reason: it is editable and
  therefore not reliable [25:05, 25:12].
- **Use Britannica** or an equivalent reliable reference [25:03, 26:27].
- Build the pages yourself and cite the source on each one [27:05].
- If the content comes from a book, name the book on the page [27:12].
- She noted chemistry content is stable and does not change [27:17], so the
  pages will not need maintaining.

**Why she wants it:** so students stay inside the platform for in-depth
learning instead of leaving to search elsewhere [25:52, 26:14].

### 16. Vocabulary and glossary [17:20–18:26, 28:50–29:25]

The platform uses invented vocabulary — Grimoire, Forge, The Study, Lab
Safety, aurum, trials, Codex — which she pointed out follows a gamification
pattern rather than a chemistry one [18:14–18:19].

Two separate deliverables:

- **In the platform:** hovering a term shows its meaning [29:21].
- **In the manuscript:** a glossary in the appendices listing every invented
  word with its meaning [18:23].

Her sequencing instruction: prepare the word list and the definitions now,
but write the user manual only once everything is final, because things may
still change [17:48–17:55].

---

## P2 — Raised, not insisted on

### 17. Atomic Builder number entry [27:34–28:13]

Currently protons, neutrons and electrons are added by repeated clicks. She
noticed the counter and suggested direct number entry would be less tedious
— "Grabe naman kasi yun" [28:13].

### 18. Admin confirmation on sign-up [13:12–13:18]

She asked whether sign-up triggers a confirmation from an admin. There is
none at present. Decide whether one is needed and be ready to justify the
answer.

### 19. Periodic table consistency [29:43–29:55]

The table shown inside a module differs from the one on the public page
[29:49]. Make them one component.

---

## Interpretation notes

The recording is Taglish and machine-transcribed, so some passages are
uncertain. Three items need confirming with her before building:

- **Item 12**, the category filter. She said she did not like it but the
  transcript does not record what she wants instead.
- **Item 13**, the typeface complaint at [29:27]. The transcribed word is
  not a real typeface name, so the screen she meant is unclear.
- **Item 17**, whether number entry is a request or an observation.

Everything else above is stated plainly enough in the recording to act on.

---

## Suggested order of work

1. Periodic table: standard arrangement, cell data, toggle (items 1–3). This
   is the single largest P0 block and the most visible in a demo.
2. School code with regeneration and expiry (item 5), then the educator
   console (item 6). These two are one chain.
3. Back and home navigation (item 7). Small, and it embarrassed the demo.
4. Element detail completeness (item 4).
5. Theme contrast and the toggle's position (items 9, 10).
6. Landing page rebuild (item 8).
7. Term pages with hover preview and Britannica sourcing (item 15). Large;
   start the content collection early and build the interaction later.
8. Legends, search button, vocabulary tooltips, text sizing (items 11, 13,
   14, 16).

Items 1 through 7 are what a December defense needs. Item 15 is what makes
the platform defensible as an educational tool rather than a toy, so it
should not be dropped entirely even if it ships in reduced form.
