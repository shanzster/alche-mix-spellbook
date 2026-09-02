# AlcheMix — Session Recap

Scope: the current system (`shanzster/alche-mix-spellbook`). Everything below was
implemented, typechecks + builds clean, and is pushed to `main`.

---

## Work done (8 commits)

### 1. AR "Alche-mix" ceremony — `63d2f59`
When two element cards are in view together, an **"Alche-mix them?"** button
appears → plays a swirling **Bohr 3D atom** animation → pops up a **new forged
card** (`/other_cards/3rd_card.png`). This is the flow for introducing new elements.
- `src/components/CrystalAR.tsx`
- `src/styles.css` (new `card-pop` keyframe)

### 2. AR fixes — `73333f0`
- Set `maxTrack` so **both** card models render at once (MindAR defaults to
  tracking a single target — the cause of "only one pops up").
- Disabled MindAR's built-in scanning/loading overlays and strip them on stop —
  fixed the **lingering "QR scan" animation** after leaving the camera.
- `src/components/CrystalAR.tsx`

### 3. Forged cards → Grimoire + printing — (with `63d2f59`)
New forged cards register to the student's Grimoire. A **"Forged Elements"**
section shows them; tapping a card opens its face (the *itsura*) with a
**Print this card** button.
- `src/lib/forged.ts` (new registry)
- `src/lib/profile.ts` (`registerForged` + `forged` / `forgedAt` fields)
- `src/routes/scanner.tsx`, `src/routes/cards.tsx`

### 4. Smarter Scavenger "AI eye" — `d615175`
COCO-SSD only knows 80 object classes — it couldn't see the water in a cup or a
gold ring. Added a **Gemini deep-scan** that reasons about materials/contents,
running alongside COCO (COCO for fast reticles, Gemini for the smart lock).
- `src/lib/ai.ts` (`aiScanFrame` server function)
- `src/lib/useAI.ts`, `src/routes/scavenger.tsx`, `src/lib/element-vision.ts`

### 5. Periodic Table → classic 18-column layout — `77007c9`
Rebuilt as the familiar "Modern Periodic Table" wall chart (matching
`periodic.png`): all 118 elements, lanthanides/actinides pulled out below,
colour-coded by family, tap-to-study 3D / Bohr viewer. Data validated — unique
grid cells and every electron-shell config sums to its atomic number.
- `src/lib/periodic-table-data.ts` (new — all 118 elements)
- `src/routes/periodic-table.tsx`, `src/lib/molecules.ts`

### 6. Reaction Theatre — surfaced + made to teach — `8e13815`, `bc29e4a`
Unhidden in both menus. Expanded 3 → **8 reactions across 4 types** (Synthesis,
Combustion, Decomposition, Neutralisation). Added a live **conservation-of-mass
atom ledger**, plain-language "what happens / why it matters", on-stage molecule
labels that hand off as atoms migrate (H₂ + O₂ → H₂O), a step-by-step narration
bar, and a playback speed control.
- `src/routes/reactions.tsx`
- `src/lib/molecules.ts` (added Na/Ca/K/Fe colours)
- `src/routes/app.tsx`, `src/components/StudentShell.tsx` (unhide)

### 7. Atomic Builder — clear purpose + live teaching — `f4828dd`
Reframed as a mission-driven build-an-atom lab: goals with **live sub-goal
checklists**, per-stepper purpose labels (protons → element, neutrons → mass,
electrons → charge), a live **"What you've built"** plain-English readout, and
de-jargoned outputs.
- `src/routes/atomic-builder.tsx`

### 8. Light-mode enhancement — `beeff9b`
Token-level retune so every card improves at once: warm off-white ground,
deeper card surfaces, crisper borders, and a soft card shadow. Dark mode
untouched.
- `src/styles.css`

---

## APIs / services & libraries used

### External APIs
| Service | Where | Notes |
|---|---|---|
| **Google Gemini API** | `generativelanguage.googleapis.com`, model `gemini-flash-latest`, key `GEMINI_API_KEY` | Scavenger vision grading + new live deep-scan. Server-only via TanStack `createServerFn` (key never reaches the browser). |
| **Cloud Firestore** | project `alchemix-grimoire` | Profile, grimoire, forged cards, evidence, practice counters (`arrayUnion`, `serverTimestamp`, `onSnapshot`). |
| **Firebase Auth** | — | `RequireAuth` / `RequireRole` gates. |
| **Cloudinary** | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Evidence-image upload. **Not configured** → falls back to inline images in Firestore. |

### On-device / browser APIs
- **MindAR** (`mindar-image-three`) — image-target AR tracking (the `maxTrack` fix).
- **Three.js** + **GLTFLoader** — 3D models and Bohr atoms.
- **TensorFlow.js** + **COCO-SSD** (`lite_mobilenet_v2`) — fast on-device scavenger detector.
- **WebRTC `getUserMedia`** — camera (AR + scavenger).
- **Canvas 2D** — reaction animation, info panels, frame capture.
- **Web Audio** — summon chime.
- **Fullscreen API** — immersive AR.
- **`window.print`** — Grimoire card printing.

### Stack (context, unchanged)
TanStack Start / Router · React · Tailwind CSS v4 · Vite · Nitro / Cloudflare (`wrangler`).

---

## Caveats
- Camera / AR / print / Gemini flows were verified by **build + data checks**, not
  live click-through — they need a real camera on HTTPS and are behind login.
  Worth a manual pass on a phone.
- Gemini live scan uses cloud calls every few seconds while hunting; it stops once
  it locks on. Requires `GEMINI_API_KEY` (already set) and HTTPS/localhost.
- Nine modules remain built but hidden; the natural next one to surface is
  **Molecule Shapes** (completes the mix → compound → shape loop).
