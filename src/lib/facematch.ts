// Browser-only face verification using @vladmandic/face-api (TensorFlow.js).
// No API key, no backend — models load from a CDN on first use.
// Everything here is dynamically imported so it never runs during SSR and
// isn't pulled into the main bundle.

type FaceApi = typeof import("@vladmandic/face-api");

// face-api ships its model weights in the package; serve them from jsDelivr.
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

let apiPromise: Promise<FaceApi> | null = null;
let modelsLoaded = false;

async function getFaceApi(): Promise<FaceApi> {
  if (!apiPromise) apiPromise = import("@vladmandic/face-api");
  const faceapi = await apiPromise;
  if (!modelsLoaded) {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  }
  return faceapi;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface FaceMatchResult {
  ok: boolean;        // faces are the same person
  score: number;      // similarity 0–100 (higher = more alike)
  error?: string;     // set when the check couldn't run / no face found
}

// Standard face-api threshold: descriptor distance < 0.6 ≈ same person.
const MATCH_DISTANCE = 0.6;

/** Detect the face on the ID and in the selfie and compare them. */
export async function matchFaces(idSrc: string, selfieSrc: string): Promise<FaceMatchResult> {
  try {
    const faceapi = await getFaceApi();
    const [idImg, selfieImg] = await Promise.all([loadImage(idSrc), loadImage(selfieSrc)]);
    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

    const idDet = await faceapi.detectSingleFace(idImg, opts).withFaceLandmarks().withFaceDescriptor();
    if (!idDet) return { ok: false, score: 0, error: "No face found on the ID photo — use a clearer, well-lit picture." };

    const selfieDet = await faceapi.detectSingleFace(selfieImg, opts).withFaceLandmarks().withFaceDescriptor();
    if (!selfieDet) return { ok: false, score: 0, error: "No face found in the selfie — try again in better light." };

    const dist = faceapi.euclideanDistance(idDet.descriptor, selfieDet.descriptor);
    const score = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));
    return { ok: dist < MATCH_DISTANCE, score };
  } catch (e) {
    console.error("matchFaces failed:", e);
    return { ok: false, score: 0, error: "Face check couldn't run — you can still submit for manual review." };
  }
}
