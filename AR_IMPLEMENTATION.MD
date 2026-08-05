# AR Implementation — Image-Trigger AR Scanner

*Point a phone/webcam at the AlcheMix element card → a 3D crystal rises out of it
in augmented reality, in the browser, no app install.*

- **For:** AlcheMix Spellbook (TanStack Start · React 19 · Vite · Three.js · Firebase)
- **Status:** ✅ **Built and wired in** — live at the **AR Scanner** module (`/scanner`)
- **Library:** [MindAR](https://github.com/hiukim/mind-ar-js) (`mind-ar`) — free, browser-based image tracking

---

## 1. What it does

This is **image-tracking AR** (natural-feature tracking): the camera recognises a
specific image (our card artwork) and draws a 3D model **locked onto it** — the
model follows the card as you move, tilt and rotate it.

The current build:

- **Trigger image:** `public/image-trigger/alchemix-element-trigger.png`
- **3D model:** `public/3d-models/alchemix/scene.gltf` (the crystal — GLTF + `scene.bin` + textures)
- **Behaviour:** camera opens → looks for the card → the crystal stands up out of
  the card and slowly turns → tracks the card as it moves.

Not to be confused with:

| Thing | What it does | This project? |
|---|---|---|
| **Image-tracking AR** (this) | model appears **on a specific image** | ✅ |
| Surface/plane AR (`<model-viewer>`, WebXR) | model dropped on the **floor/table** | ❌ no image trigger |
| QR scan | reads a **code**, opens a link | ❌ not 3D / not anchored |

---

## 2. The pieces (where everything lives)

| Piece | Location | Notes |
|---|---|---|
| Trigger image | `public/image-trigger/alchemix-element-trigger.png` | 2289×3852 source art |
| Compiled tracking target | `public/targets.mind` | **generated** — do not hand-edit |
| 3D crystal model | `public/3d-models/alchemix/scene.gltf` (+ `.bin`, `textures/`) | loaded via Three's `GLTFLoader` |
| AR viewport component | `src/components/CrystalAR.tsx` | camera + MindAR + model |
| Scanner module (route) | `src/routes/scanner.tsx` | `/scanner`, in the student nav |
| Nav entry | `src/components/StudentShell.tsx` | "AR Scanner" |
| MindAR type shim | `src/mind-ar.d.ts` | MindAR ships no TS types |
| Target compiler script | `scripts/compile-mind-target.mjs` | rebuilds `targets.mind` |
| Vite tweak | `vite.config.ts` | excludes `mind-ar` from optimize/SSR |

---

## 3. How MindAR works (mental model)

Two stages:

```
  Trigger image(s)  ──compile──▶  targets.mind  ──runtime──▶  anchor.group (tracked)
  (PNG artwork)      (one-time)   (fingerprints)   (webcam)     ▲ we attach the crystal
```

- **Compile (one-time):** MindAR extracts tracking "feature points" from each
  image and bundles them into a single `targets.mind` file. Anchor index = the
  image's position in the compile order.
- **Runtime:** MindAR opens the webcam and, for each target, exposes
  `anchor.group` — a Three.js `Group` it keeps positioned right on the card. We
  add the crystal to that group; MindAR does the tracking.

### How our `targets.mind` was compiled

The usual route is MindAR's [online compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile).
We instead compile **locally** because MindAR's Node compiler depends on the
native `canvas` package, which won't build on this machine. `scripts/compile-mind-target.mjs`
sidesteps that: it decodes the PNG with pure-JS **pngjs** and feeds the pixels
straight into MindAR's own feature extractor.

```bash
# Recompile from the default trigger image → public/targets.mind
npm run compile:ar

# Or specify inputs + output explicitly (multiple images allowed):
node scripts/compile-mind-target.mjs public/image-trigger/alchemix-element-trigger.png public/targets.mind
```

> The current file is ~492 KB (1 target, 2289×3852). Compilation is CPU-heavy
> (TensorFlow.js on the full-res image) and takes a couple of minutes — normal.

---

## 4. How the AR component works (`CrystalAR.tsx`)

1. **SSR-safe:** `mind-ar` and `GLTFLoader` are **dynamically imported inside the
   Start-scanning click handler**, so nothing touches `window`/`document` during
   server rendering. (`vite.config.ts` also marks `mind-ar` external for SSR and
   excludes it from dep-optimization.)
2. **User gesture:** the camera (`getUserMedia`) needs a user gesture, so scanning
   begins from the **Start scanning** button, not on mount.
3. **Scene:** MindAR hands us `renderer/scene/camera`; we add a hemisphere +
   directional light to flatter the crystal's metallic-roughness textures.
4. **Model placement:** on load we
   - center the model on the origin (via its bounding box),
   - scale so its longest side ≈ `MODEL_SIZE` (0.6 MindAR units; image width = 1),
   - rotate `-90°` about X so it **stands up out of the card**,
   - lift it by half its height so the base rests on the card,
   - and spin it slowly (turntable) each frame.
5. **State/UX:** idle → starting → scanning → found, with a camera-permission
   error path and a Stop button. On first detection it calls the optional
   `onFound` callback (hook for sounds, logging, unlocks, etc.).

Two tuning knobs at the top of the file:

```ts
const MODEL_SIZE = 0.6;   // crystal's longest dimension (bigger = larger on card)
const SPIN_SPEED = 0.012; // turntable spin, radians/frame
```

---

## 5. Requirements & gotchas

- **HTTPS or localhost only** — browsers block the camera on plain `http://`.
  `vite dev` on localhost is fine; deployed must be HTTPS (Firebase Hosting is).
- **Good trigger art matters most.** MindAR tracks **detail + contrast**. Our
  card is detailed, which tracks well; flat symbol-on-gradient art tracks poorly.
- **Anchor index = compile order.** If you add images, keep `addAnchor(n)` in
  `CrystalAR.tsx` in sync with the order passed to the compiler.
- **`targets.mind` is generated** — never edit by hand; recompile instead.
- **Lighting/glare** — even lighting, minimal glare and motion blur = best tracking.

---

## 6. Testing it

```bash
npm run dev
```

- Open on **localhost** (desktop webcam) or your **phone** over the LAN URL — but
  the phone needs **HTTPS**, so for on-device testing either deploy a preview or
  use a tunnel (e.g. an HTTPS dev tunnel) pointing at the dev server.
- Go to **AR Scanner** in the nav → **Start scanning** → grant camera → aim at a
  printed or on-screen copy of `alchemix-element-trigger.png`.
- The crystal should rise out of the card and turn.

---

## 7. Extending it

**Add more trigger cards → different models**

1. Add each new trigger PNG under `public/image-trigger/`.
2. Recompile **all** images in one go, in a fixed order:
   ```bash
   node scripts/compile-mind-target.mjs \
     public/image-trigger/alchemix-element-trigger.png \
     public/image-trigger/second-card.png \
     public/targets.mind
   ```
3. In `CrystalAR.tsx`, `addAnchor(1)` (etc.) for each extra target and load the
   model you want on that anchor. Keep indices matching the compile order.

**Ideas (not yet built)**

- Drag-to-spin / pinch-to-zoom on the crystal (mirror the pointer logic in
  `BohrModel3D.tsx` / `Molecule3D.tsx`).
- A particle burst + sound on `onFound` for the "summon" moment.
- Floating label (element name/number) as a sprite above the crystal.
- Record the scan to the student's profile on `onFound` (reuse `scanCard` /
  `logPractice` from `src/lib/profile.ts`), tying AR into progress tracking.
- Graceful fallback to the on-screen 3D viewer when there's no camera/permission.

---

## 8. Dependencies added

- `mind-ar` — browser AR runtime (installed with `--ignore-scripts`; its native
  `canvas` dep is only needed for the *offline* compiler, which we bypass).
- `pngjs` (dev) — pure-JS PNG decode for the local compile script.

---

## 9. Links

- MindAR docs: <https://hiukim.github.io/mind-ar-js-doc/>
- Online image-target compiler (alternative to our script): <https://hiukim.github.io/mind-ar-js-doc/tools/compile>
- MindAR + Three.js examples: <https://hiukim.github.io/mind-ar-js-doc/examples/threejs>
- MindAR GitHub: <https://github.com/hiukim/mind-ar-js>
