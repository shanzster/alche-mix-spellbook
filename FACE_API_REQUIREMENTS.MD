# Face Verification — Implementation & Requirements

How the teacher **identity / face verification** works in AlcheMix: a teacher
uploads a photo of their ID and takes a live selfie, the app checks that the two
faces are the **same person**, and an admin gives final approval.

The whole face match runs **in the browser** — no API key, no backend, no cost.

---

## 1. What was chosen (and why)

| Option | Free? | Key/Backend? | Chosen |
|---|---|---|---|
| **`@vladmandic/face-api`** (TensorFlow.js, in-browser) | ✅ Yes | ❌ None | ✅ **This one** |
| Stripe Identity | Paid | Backend + key | — |
| AWS Rekognition `CompareFaces` | Free tier | AWS creds + backend | — |
| Onfido / Persona / Veriff | Paid | Backend + key | — |
| face-api.js (unmaintained fork) | ✅ | ❌ | superseded by vladmandic fork |

**Why `@vladmandic/face-api`:** it's the only genuinely free option that needs
no server and no secret keys. Detection + 128-D face embeddings run client-side;
we compare the ID face to the selfie face with a distance metric.

---

## 2. Dependency

```jsonc
// package.json
"@vladmandic/face-api": "^<installed version>"
```

- Installed via `npm install @vladmandic/face-api`.
- ⚠️ The install reported **2 high-severity advisories** in transitive
  (TF.js-era) deps. Not build-blocking; review with `npm audit` before production.

---

## 3. How it works (flow)

```
Teacher (unapproved)                     Browser (on-device)            Firestore                Admin
  upload ID photo  ─────────────┐
  capture selfie   ─────────────┤
  tap "Check face match" ───────┼──► face-api: detect face on ID
                                │    detect face in selfie
                                │    compare embeddings → score
                                │◄── match? show result
  (match required) Submit ──────┼───────────────────────────────► verifications/{uid}
                                                                    { idImage, selfie,
                                                                      faceMatch, faceMatched,
                                                                      status: "submitted" }
                                                                                    ─────────►  reviews at /admin
                                                                    users/{uid}.status ◄──────  approve / reject
```

- **Match is required to submit** — if the faces don't match (or no face is
  found), submission is blocked with guidance to retake.
- **Fallback:** if the model can't run at all, the teacher may submit for
  **manual review** and the admin sees "needs manual review".

---

## 4. Files

| File | Role |
|---|---|
| `src/lib/facematch.ts` | Loads face-api (lazy) + models, runs `matchFaces(idSrc, selfieSrc)` → `{ ok, score, error }`. |
| `src/components/TeacherVerification.tsx` | UI: ID upload, live selfie capture, "Check face match", gated Submit. Shown by `RequireRole` for unapproved teachers. |
| `src/lib/admin.ts` | `Verification` type (adds `faceMatch`, `faceMatched`), `submitVerification`, `getVerification`, `usePendingVerifications`, `approveTeacher`, `rejectTeacher`. |
| `src/routes/admin.tsx` | Admin panel — shows ID + selfie + the **AI face-check badge**, approve/reject. |
| `firestore.rules` | `verifications/{uid}` access rules (below). |

---

## 5. Face-match logic (`src/lib/facematch.ts`)

- **Lazy import:** `import("@vladmandic/face-api")` runs only when a check is
  triggered → a separate ~1.3 MB chunk, never in the main bundle or during SSR.
- **Models loaded from CDN** (nothing committed to the repo):
  `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/`
  - `ssdMobilenetv1` (face detection)
  - `faceLandmark68Net` (landmarks)
  - `faceRecognitionNet` (128-D descriptor)
- **Compare:** `euclideanDistance(idDescriptor, selfieDescriptor)`.
- **Threshold:** `distance < 0.6` ≈ same person (standard face-api/LFW value).
- **Score shown:** `round((1 - distance) * 100)` as a "% similar".

To tune strictness, change `MATCH_DISTANCE` in `facematch.ts` (lower = stricter).

---

## 6. Data model

`verifications/{uid}` (Firestore):

```jsonc
{
  "uid": "…",
  "name": "Jane Doe",
  "email": "jane@school.edu",
  "idImage": "data:image/jpeg;base64,…",   // downscaled ≤900px, q0.6
  "selfie":  "data:image/jpeg;base64,…",   // downscaled ≤480px, q0.6
  "faceMatch": 87,                          // similarity 0–100
  "faceMatched": true,                      // passed the on-device check
  "status": "submitted" | "approved" | "rejected"
}
```

Approval also sets `users/{uid}.status = "approved"` (what `RequireRole` checks).

> Images are stored as **downscaled base64 JPEGs inside the Firestore doc** to
> avoid needing Firebase Storage. Keep them small (they must fit the 1 MB doc
> limit). For production, move images to **Firebase Storage** and store URLs.

---

## 7. Firestore rules

```
match /verifications/{uid} {
  allow read:          if signedIn() && (request.auth.uid == uid || isAdmin());
  allow create, update: if request.auth.uid == uid || isAdmin();
  allow delete:        if isAdmin();
}
```

`isAdmin()` is matched by the verified auth-token email (see `ADMIN_CREDENTIALS.MD`).

---

## 8. Runtime requirements

- **HTTPS or localhost** — `getUserMedia` (selfie camera) needs a secure context.
  Testing on a phone over `http://<LAN-IP>` will block the camera.
- **Network at first check** — model weights download from jsDelivr the first
  time a check runs (cached afterward by the browser).
- **WebGL** — TF.js uses the WebGL backend; works in all modern browsers.

---

## 9. Privacy

- The face match happens **entirely on the teacher's device**. Photos are only
  sent to Firestore **when they hit Submit**. Nothing is sent to any third-party
  face API.

---

## 10. Limitations & production hardening

- On-device matching is **good enough to auto-gate**, but it is **not liveness
  detection** — someone could hold up a photo. For real anti-spoofing, use a KYC
  provider (Stripe Identity / Onfido / Veriff) with liveness.
- Base64-in-Firestore is a prototype shortcut → use **Firebase Storage** in prod.
- Consider **auto-approving** very high-confidence matches to cut admin load
  (see the open question below).
- Consider server-side re-verification so the client can't fake `faceMatched`.

---

## 11. Config / where to change things

| Change | Where |
|---|---|
| Match strictness | `MATCH_DISTANCE` in `src/lib/facematch.ts` |
| Model source | `MODEL_URL` in `src/lib/facematch.ts` |
| Image sizes/quality | `downscale(...)` calls in `TeacherVerification.tsx` |
| Who is admin | `ADMIN_EMAILS` in `src/lib/admin.ts` + `isAdmin()` in `firestore.rules` |

---

## 12. Test checklist

- [ ] Firestore enabled + `firebase deploy --only firestore:rules`.
- [ ] Sign up as a **teacher** → land on the verification screen.
- [ ] Upload an ID that has a face + take a selfie → **Check face match**.
- [ ] Matching faces → green result → **Submit** works.
- [ ] Mismatched faces → blocked.
- [ ] Sign in as **admin** → `/admin` shows the submission + AI badge → **Approve**.
- [ ] Teacher now reaches the Educator Console (`/teacher`).
