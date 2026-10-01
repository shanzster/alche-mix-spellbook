# AlcheMix — Algorithm of the System

> How the core mechanics actually work, end to end — the algorithms behind
> the features, with the real constants from the code. Written 2026-10-01
> (the code wins if they ever disagree). Companions:
> `SYSTEM_TECHNICALITIES.md` (architecture), `DATA_INVENTORY.md` (data),
> `LOGS.md` (history).

## 1. Spaced repetition — lightweight SM-2 (`src/lib/learning.ts`)

Every practice answer (The Study, Daily Starters, the Mending Trial) feeds
one shared per-concept schedule in `users/{uid}.reviews`.

```
nextReview(prev, correct, now):
  ease   starts at 2.3, clamped to [1.7, 2.8]
  if WRONG:  ease −0.2 · reps reset to 0 · lapses +1
             due again in 10 MINUTES (misses return same session)
  if RIGHT:  ease +0.1 · reps +1
             interval = 1 day (1st) → 3 days (2nd) → round(prev × ease) after
             dueAt = now + interval
```

`dueConceptIds(reviews, now)` returns everything past due, soonest first —
this is what puts review items at the front of the Daily Starters set.

## 2. The daily set — deterministic seeding (`src/routes/starters.tsx`)

Each student's three daily concepts must be stable all day (refreshes,
practice replays) without storing anything server-side first:

```
buildDailyConcepts(reviews, dayKey):
  due  = dueConceptIds(reviews, now) …take up to 3        // review first
  fill = seededShuffle(remaining bank, seed = xmur3(dayKey))
  return (due ++ fill) take 3
```

`xmur3` hashes the `YYYY-MM-DD` day-key into a 32-bit seed; `mulberry32` is
the PRNG behind the Fisher–Yates shuffle — same day, same order, no RNG
state stored. The AI layer then *rewords* those concepts (§3); the chosen
concepts (and thus the SM-2 wiring) stay deterministic.

## 3. AI question pipeline with honest fallback (`src/lib/ai.ts`)

```
Daily Starters run:
  1. localStorage cache hit for (uid, dayKey)?  → reuse (stable all day)
  2. aiStarterQuiz({concepts: [{id, topic, title, learn}], seed: uid+dayKey})
       Gemini writes ONE fresh MCQ per concept FROM the curated `learn`
       text (never invents facts), with a teaching explanation.
       Shape-guarded: 4 choices, valid answer index, conceptId echoes back
       — anything malformed throws → fallback.
  3. fallback: the bank's own question for the SAME concepts
  4. cache {source, questions}; record answers → SM-2 (§1)
```

Every AI call goes through `askGemini` (server-only): strict JSON via
`responseSchema`, then `try flash → retry once on 503/429 → try flash-lite
→ throw` — and every caller catches the throw into a deterministic result
tagged `source: "fallback"`. No AI feature can dead-end keyless.

## 4. Streaks, the broken cauldron, and the Mending Trial

```
recordStarterRun (profile.ts):
  same day        → count unchanged
  gap ≤ 36 hours  → count + 1          // one grace window, like Duolingo
  otherwise       → count = 1
  best = max(best, count); run prepended to starterHistory (cap 60)

cauldronMood(streak, today):            // components/Cauldron.tsx
  no streak                 → "cold"
  lastDay within 36 h       → "warm"  (bubbling mascot)
  older                     → "broken" (cracked mascot)
  mendable = count ≥ 2 AND gap ≤ 7 days

Mending Trial (starters.tsx):           // restoration must be EARNED
  5 bank questions (due-review concepts first, then random)
  pass = ≥ 4 correct
  pass → restoreStarterStreak: count back, lastDay = YESTERDAY
         (so brewing today's Three continues the chain at count+1)
  fail → warm retry with a fresh set, or voluntarily start at day 1
  all mend answers feed SM-2 either way — failure still teaches
```

## 5. Tap economies (engagement toys, never grades)

- **Drop vessels** (Alembic `/molecules`, Phial `/atomic-builder`): first
  tap of a local day adds exactly ONE drop (`lastDay` gate), capped at 300;
  fill fraction = drops/300. Stored per vessel in `dropVessels.{id}`.
- Writes are owner-profile updates only; counters never touch grades.

## 6. The equilibrium engine (`src/routes/equilibrium.tsx`)

A stochastic particle model where K *emerges* instead of being programmed:

```
per frame, for T in [250, 400] K, V in [0.4, 1.0]:
  forward:  each N₂O₄ dimer splits with p_f = 0.006 · e^((T−298)/22)   (endothermic)
  reverse:  recombinations accrue at p_r · M² / V, nearest NO₂ pairs fuse
            p_r = (0.006/16) · e^(−(T−298)/60)                          (exothermic)
  ⇒ K(T) = p_f/p_r  (= 16 at 298 K) appears from the rules alone
  Q = M² / (D · V) is measured live from the counts; the Q→K chase after
  every stress IS Le Chatelier, not a scripted animation.
```

Rendering is apparatus-true: bulb **area** scales with V (compression
visibly crowds the same count), particles reflect off the circular glass
(`v −= 2(v·n̂)n̂`), the burner flame height maps the valve/temperature, and
the brown tint alpha tracks [NO₂] — the colour is the readout.

### Glassware limits — strain and shatter

```
pressure proxy  P = n · (T/298) / V        // ideal-gas reasoning on counts
danger          P > 300  OR  T ≥ 388 K
strain          += 0.006/frame in danger (≈3 s to break at 60 fps)
                −= 0.012/frame when safe   (ease off → glass recovers)
strain > 0.22   → rattle (jitter ∝ strain) + red stress cracks + warning
strain = 1      → SHATTER: particles vented, jagged bowl + shards drawn,
                  controls inert, warm "perfectly normal" overlay,
                  one-button fresh-flask reset
```

## 7. Vision: two eyes, one verdict (Scavenger & Identifier)

```
Live layer (on-device, free, instant): COCO-SSD at ~7 passes/s draws
  reticles; CLASS_ELEMENTS maps its 80 object classes to real chemistry
  (mouse → Cu Sn Au C Fe; banana → C H O N K Mg …).
Reasoning layer (Gemini, on capture): the downscaled still is judged for
  materials and contents — things COCO can't see (the water IN the cup,
  a gold ring). Scavenger polls every 2.8 s and LOCKS on the first
  confident hit to stop spending calls.
Identifier verdict: Gemini's per-item element list wins when live;
  keyless, the COCO detections + composition map ARE the (honestly
  labelled) estimate. Element symbols deep-link to the periodic table.
```

## 8. Other deterministic cores, briefly

- **Haber yield** (`equilibrium.tsx`): bilinear interpolation over the real
  Larson–Dodge %NH₃ table — linear in T, linear in ln P.
- **Compound combiner** (`cards.ts` `combine()`): rule-based engine over
  the 12 base cards; noble gases refuse; discoveries fill the Codex and
  can mint forged cards (`forgedFromMix`).
- **Join codes** (`teacher.ts`): 6 chars from an unambiguous 32-char set
  (no O/0/I/1), collision-checked; the code IS the class document id.
- **Identifier deduction trial**: 5 rounds × 5 progressively sharper clues
  built from curated element data; points = 6 − clues seen.
- **Class analytics**: pure read-side fan-in over rostered profiles — the
  app computes matrices/radars in the client; nothing new is stored.
