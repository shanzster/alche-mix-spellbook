# JERLYN'S REVIEWER — The AR Card Scanner

*Your cheat sheet for the AlcheMix **AR Scanner**: what it is, how it works,
how it was built, and exactly how to explain and demo it to your teacher.*

---

## 1. What is it? (say this first)

> "This is the **AR Scanner** module of AlcheMix. When you point the camera at
> our printed element card, a **3D crystal rises out of the card** on the
> screen — like the card comes alive. It's **augmented reality in the browser**,
> so it works on any phone or laptop with a camera. **No app to install.**"

That's the whole pitch. Everything below is backup for when the teacher asks
"how?"

---

## 2. How it works (the simple version)

Think of it in 3 steps:

1. **The card is the trigger.** The system was taught to recognize one specific
   image — the AlcheMix element card artwork. This is called **image tracking**.
2. **The camera looks for the card.** When you press *Start scanning*, the
   browser opens the camera and keeps comparing what it sees against the card's
   "fingerprint" (hundreds of small detail points saved from the artwork).
3. **The 3D model is glued to the card.** The moment the card is found, a 3D
   crystal model is drawn *on top of the card's position* — and it stays locked
   on. Move or tilt the card and the crystal follows, because the software
   re-finds those fingerprint points every frame.

### A good analogy for the teacher

> "It's like how our brain recognizes a friend's face from any angle. The
> computer memorized the card's unique details ahead of time, so when the
> camera sees those same details, it knows exactly where the card is in 3D
> space — and it can stand a 3D object on it."

### Important: what it is NOT

| Thing | Difference |
|---|---|
| **QR code scan** | A QR code just opens a link. Ours recognizes the *artwork itself* and anchors a live 3D model to it. |
| **A video / filter** | Nothing is pre-recorded. The crystal is a real 3D model rendered live, tracking the real card. |
| **A mobile app** | It runs entirely in the web browser — that's what makes it special. |

---

## 3. How I built it (your build story)

Tell it as 4 steps:

**Step 1 — Designed the trigger card.**
The element card artwork (`public/image-trigger/image-trigger-<element>.png` —
one card each for Alchemix and Helium).
AR tracking needs an image with lots of **detail and contrast** — a plain logo
won't track — so the card art is intentionally detailed.

**Step 2 — "Taught" the computer the card.**
I used a free, open-source AR library called **MindAR**. It has a compiler that
scans the card image, extracts its feature points (the fingerprint), and saves
them into one small file: `public/targets.mind`. This is done **once**, before
anyone ever scans. (I even wrote a local script for this —
`scripts/compile-mind-target.mjs` — because the normal compiler tool didn't
work on my machine. Run with `npm run compile:ar`.)

**Step 3 — Made the 3D crystal appear.**
The website is built with **React** and **Three.js** (a 3D graphics library).
My component `src/components/CrystalAR.tsx` does the work: it starts the
camera through MindAR, and when MindAR says "card found — here's its position,"
I attach the crystal model (`public/3d-models/alchemix/scene.gltf`) to that
spot, rotate it so it **stands up out of the card**, and spin it slowly like a
display turntable. I also added lights so the crystal's metallic texture shines.

**Step 4 — Put it in the app.**
The scanner lives at the **AR Scanner** page (`src/routes/scanner.tsx`) inside
AlcheMix, next to the Periodic Table and the Grimoire card collection. Scanning
only starts when you press the button, because browsers require a user's
permission (and a click) before opening the camera.

**Tech stack in one breath:** *"React and Three.js for the website and 3D,
MindAR for the image-tracking AR, and Firebase for hosting and accounts."*

---

## 4. How to demo it to the teacher

**Prepare before class:**
- Charge the device; clean the camera lens.
- Bring the **printed element card** (or have the trigger image open on another
  screen as backup).
- Make sure the site is open over **HTTPS** (the deployed site) or localhost —
  the camera won't work otherwise.
- Do one practice scan so the camera permission is already granted.

**The demo (under two minutes):**
1. Open AlcheMix → **AR Scanner** in the menu.
2. Say the one-liner from Section 1.
3. Press **Start scanning**, aim at the card.
4. When the crystal rises — with a **burst of gold-and-emerald sparks and a
   chime** — **slowly move and tilt the card** and say
   *"see how it stays locked onto the card? That's the image tracking."*
5. **Tap the crystal** — a floating info card appears in AR with the element's
   symbol, name, and facts. Say: *"the 3D is the hook — this is the lesson."*
6. Press **✕ to close the camera** — the page now shows
   **"Discovery unlocked."** Explain the outcome:
   - the scan was **saved to my student profile** (my teacher can see I did it),
   - a **3-question quick check** appears, using facts from the crystal's info
     card — answer them live,
   - a perfect 3/3 earns the **AR Alchemist badge**, shown on my Home page,
   - then it points me to the **Periodic Table** and **Atomic Builder** to keep
     learning. Say: *"so a scan isn't just a wow moment — it's recorded, tested,
     rewarded with a badge, and leads into the next lesson."*

**Demo tips:** even lighting, no glare on the card, hold it steady and fill the
camera frame. Glare and motion blur are the trackers' enemies.

---

## 5. Questions the teacher might ask (with answers)

**Q: Is this an app? Do students need to install anything?**
A: No — it's a website. Any phone or laptop browser with a camera works.

**Q: How does the camera know it's *your* card?**
A: Before anyone scans, the card artwork is compiled into a file of feature
points — like a fingerprint of the image. At scan time, the camera feed is
matched against that fingerprint many times per second.

**Q: Is the crystal a video?**
A: No, it's a real 3D model rendered live with Three.js. That's why it tracks
the card as it moves — nothing is pre-recorded.

**Q: Did you build this yourself?**
A: I built it on top of open-source libraries — MindAR for the tracking and
Three.js for the 3D — the same way real developers build on existing tools. The
card design, the compiling of the tracking file, the AR component, and wiring
it into the app are our work.

**Q: How is this useful for learning chemistry?**
A: It makes elements tangible — a card in your hand becomes a 3D object, and
the scan has a real outcome: it's saved to my student profile, I answer a quick
check about the element, and it leads me into the Periodic Table (study each
element, its uses, and 3D views) and the Atomic Builder. The AR is the hook;
the element content is the lesson.

**Q: What was the hardest part?**
A: Two things. First, compiling the tracking file — the official tool needed
software my computer couldn't install, so we wrote our own script that decodes
the image in pure JavaScript and feeds it to MindAR's compiler. Second, placing
the model: the crystal had to be centered, scaled, rotated 90° so it stands up
out of the card instead of lying flat, and lifted so its base sits on the card.

**Q: Can it recognize more than one card?**
A: Yes — the compiler accepts multiple images, and each card can summon a
different 3D model. Right now one card is live, and more can be added.

---

## 6. Key words cheat sheet

| Term | What to say it means |
|---|---|
| **AR (augmented reality)** | Adding virtual objects on top of the real world through a camera. |
| **Image tracking** | The camera recognizes a specific picture and follows its position. |
| **Trigger image / target** | The card artwork the system was trained to recognize. |
| **Feature points** | The unique details of the image the computer memorizes — its fingerprint. |
| **MindAR** | The free browser AR library that does the recognizing and tracking. |
| **Three.js** | The 3D graphics library that draws the crystal. |
| **GLTF** | The standard file format of the 3D crystal model. |
| **Anchor** | The tracked position on the card where the 3D model is attached. |

---

## 7. If something goes wrong in the demo

| Problem | Fix / what to say |
|---|---|
| Camera won't open | Check the permission prompt was allowed; must be on HTTPS or localhost. Refresh and press Start again. |
| Crystal won't appear | Fill the frame with the card, reduce glare, hold it flat and steady, better lighting. |
| Tracking is jittery | Move the card more slowly; avoid shadows across the card. |
| Total failure (backup plan) | Stay calm: show the trigger image on a second screen and scan that, or walk through the Periodic Table and explain the AR with the steps in Section 2. A calm explanation still shows you understand it. |

---

*Files to remember if the teacher wants to see code:*
`src/components/CrystalAR.tsx` (the AR itself) · `src/routes/scanner.tsx` (the
page) · `scripts/compile-mind-target.mjs` (the card compiler) ·
`public/targets.mind` (the card's fingerprint file). Full technical write-up:
`AR_IMPLEMENTATION.MD`.
