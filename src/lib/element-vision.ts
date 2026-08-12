/**
 * Live "AI eye" for the Scavenger Hunt.
 *
 * Runs COCO-SSD (TensorFlow.js) on the camera feed IN THE BROWSER — no API
 * key, no server round-trips — and draws scanner reticles over every object it
 * recognises: GREEN if that kind of object plausibly contains the hunted
 * element, RED if not. Gemini (or the teacher) still gives the final verdict
 * on the captured photo; this is the real-time tracking layer.
 *
 * Client-only: import lazily / call from effects. The model (~4 MB,
 * lite_mobilenet_v2) downloads once from the TF Hub CDN and is cached.
 */

// ── Which elements does each COCO object class plausibly contain? ────────────
// COCO-SSD knows 80 everyday classes. Rough-but-defensible chemistry:
// steel/appliances → Fe (+ Zn coatings, Cu wiring), electronics → Cu/Sn/Au,
// living & food things → C/H/O/N (+ the famous ones: banana→K, dairy→Ca…).
const ORGANIC = ["C", "H", "O", "N"];
const ANIMAL = [...ORGANIC, "Ca", "K", "Na", "Fe", "S", "Mg"]; // bodies have it all
const ELECTRONICS = ["Cu", "Sn", "Au", "C", "Fe"];
const STEEL_THING = ["Fe", "C"];
const VEHICLE = ["Fe", "Al", "C"];

const CLASS_ELEMENTS: Record<string, string[]> = {
  // People, pets & wildlife — living things are walking element kits.
  person: ANIMAL, bird: ANIMAL, cat: ANIMAL, dog: ANIMAL, horse: ANIMAL,
  sheep: ANIMAL, cow: ANIMAL, elephant: ANIMAL, bear: ANIMAL, zebra: ANIMAL,
  giraffe: ANIMAL,
  // Cutlery & kitchen metal — stainless steel (Fe) with Cr/Ni we don't track.
  fork: STEEL_THING, knife: STEEL_THING, spoon: STEEL_THING,
  scissors: STEEL_THING,
  sink: ["Fe", "Cu", "Zn"],
  refrigerator: ["Fe", "Al", "Cu"], oven: ["Fe", "Cu"], toaster: ["Fe", "Cu"],
  microwave: ["Fe", "Cu"], "hair drier": ["Cu", "Fe", "C"],
  // Electronics — copper tracks, tin solder, gold contacts, plastic shells.
  tv: ELECTRONICS, laptop: ELECTRONICS, "cell phone": ELECTRONICS,
  keyboard: ELECTRONICS, mouse: ELECTRONICS, remote: [...ELECTRONICS, "Zn"],
  // Vehicles & street furniture.
  bicycle: VEHICLE, car: VEHICLE, motorcycle: VEHICLE, bus: VEHICLE,
  truck: VEHICLE, train: ["Fe", "C"], airplane: ["Al", "Fe"], boat: VEHICLE,
  "traffic light": ["Fe", "Al"], "fire hydrant": ["Fe"],
  "stop sign": ["Al", "Fe"], "parking meter": ["Fe", "Zn"],
  bench: ["Fe", "C"], clock: ["Fe", "Al", "Zn", "C"],
  // Food — organic chemistry plus the classics.
  banana: [...ORGANIC, "K", "Mg"], apple: ORGANIC, orange: [...ORGANIC, "Ca"],
  broccoli: [...ORGANIC, "K", "Mg", "Ca", "S"], carrot: [...ORGANIC, "K"],
  sandwich: [...ORGANIC, "Na"], pizza: [...ORGANIC, "Na", "Ca"],
  "hot dog": [...ORGANIC, "Na", "S"], donut: [...ORGANIC, "Na"],
  cake: [...ORGANIC, "Na", "Ca"],
  // Dishes & containers — glass (Na/Ca), ceramics (Ca), plastics (C/H).
  bottle: ["C", "H", "O", "Na"], "wine glass": ["O", "Na", "Ca"],
  cup: ["C", "Ca", "O"], bowl: ["C", "Ca", "O"], vase: ["Ca", "O", "C"],
  toilet: ["Ca", "O"],
  // Plants — photosynthesis in a pot.
  "potted plant": [...ORGANIC, "K", "Mg"],
  // Furniture & fabric — wood, foam, plastic, springs.
  chair: ["C", "H", "Fe"], couch: ["C", "H", "Fe"], bed: ["C", "H", "Fe"],
  "dining table": ["C", "H"], book: ["C", "H", "O"],
  "teddy bear": ["C", "H"], tie: ["C", "H"], handbag: ["C", "H"],
  backpack: ["C", "H"], suitcase: ["C", "H", "Al"], umbrella: ["C", "Fe", "Al"],
  toothbrush: ["C", "H"],
  // Sports gear.
  "sports ball": ["C", "H"], frisbee: ["C", "H"], kite: ["C", "H"],
  "baseball bat": ["C", "Al"], "baseball glove": ["C", "H"],
  skateboard: ["C", "Fe"], surfboard: ["C", "H", "O"],
  "tennis racket": ["C", "Al"], skis: ["C", "Al"], snowboard: ["C", "H"],
};

/** Does this detected object class plausibly contain the hunted element? */
export function classContainsElement(cls: string, symbol: string): boolean {
  return (CLASS_ELEMENTS[cls] ?? []).includes(symbol);
}

export interface LiveDetection {
  label: string;
  score: number;
  match: boolean;
}

export interface DetectorHandle {
  stop: () => void;
}

interface StartOpts {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  elementSymbol: string;
  /** Fires after every detection pass with the best match (or best non-match). */
  onUpdate?: (best: LiveDetection | null) => void;
  /** Model ready — reticles are now live. */
  onReady?: () => void;
  /** Model failed to load (offline?) — plain camera still works. */
  onError?: (err: unknown) => void;
}

// Load once per session, shared across mounts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPromise: Promise<any> | null = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs"); // registers the WebGL backend
      const coco = await import("@tensorflow-models/coco-ssd");
      return coco.load({ base: "lite_mobilenet_v2" }); // smallest & fastest
    })();
    modelPromise.catch(() => { modelPromise = null; }); // allow retry next mount
  }
  return modelPromise;
}

/**
 * Starts the detect → draw loop over `video`, painting reticles onto `canvas`
 * (which must overlay the video; the video is assumed `object-fit: cover`).
 * Returns a handle whose `stop()` ends the loop and clears the canvas.
 */
export function startElementDetector(opts: StartOpts): DetectorHandle {
  const { video, canvas, elementSymbol, onUpdate, onReady, onError } = opts;
  let stopped = false;
  let timer = 0;

  const run = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any;
    try {
      model = await loadModel();
    } catch (err) {
      console.warn("[Vision] live detector unavailable:", err);
      if (!stopped) onError?.(err);
      return;
    }
    if (stopped) return;
    onReady?.();

    const tick = async () => {
      if (stopped) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const preds = (await model.detect(video, 8, 0.5)) as {
            bbox: [number, number, number, number];
            class: string;
            score: number;
          }[];
          if (stopped) return;
          draw(canvas, video, preds, elementSymbol);
          const scored = preds.map((p) => ({
            label: p.class,
            score: p.score,
            match: classContainsElement(p.class, elementSymbol),
          }));
          const best =
            scored.filter((s) => s.match).sort((a, b) => b.score - a.score)[0] ??
            scored.sort((a, b) => b.score - a.score)[0] ??
            null;
          onUpdate?.(best);
        } catch (err) {
          console.warn("[Vision] detect pass failed:", err);
        }
      }
      timer = window.setTimeout(tick, 140); // ~7 passes/sec — smooth yet cool-running
    };
    void tick();
  };
  void run();

  return {
    stop: () => {
      stopped = true;
      window.clearTimeout(timer);
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

// ── Reticle drawing ──────────────────────────────────────────────────────────
const GREEN = "#34d399";
const RED = "#f87171";

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  preds: { bbox: [number, number, number, number]; class: string; score: number }[],
  elementSymbol: string,
) {
  const dw = canvas.clientWidth;
  const dh = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== dw * dpr || canvas.height !== dh * dpr) {
    canvas.width = dw * dpr;
    canvas.height = dh * dpr;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, dw, dh);

  // Map video-intrinsic coords → displayed coords under object-fit: cover.
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const s = Math.max(dw / vw, dh / vh);
  const ox = (dw - vw * s) / 2;
  const oy = (dh - vh * s) / 2;

  for (const p of preds) {
    const match = classContainsElement(p.class, elementSymbol);
    const color = match ? GREEN : RED;
    const x = p.bbox[0] * s + ox;
    const y = p.bbox[1] * s + oy;
    const w = p.bbox[2] * s;
    const h = p.bbox[3] * s;

    // Scanner-style corner brackets ("square tracker").
    const arm = Math.max(14, Math.min(w, h) * 0.18);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    // top-left
    ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y);
    // top-right
    ctx.moveTo(x + w - arm, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + arm);
    // bottom-right
    ctx.moveTo(x + w, y + h - arm); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - arm, y + h);
    // bottom-left
    ctx.moveTo(x + arm, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - arm);
    ctx.stroke();
    // faint full outline to tie the brackets together
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(x, y, w, h);
    ctx.globalAlpha = 1;

    // Label chip: "scissors ✓ Fe" / "cup ✗"
    const label = `${p.class} ${match ? `✓ ${elementSymbol}` : "✗"}`;
    ctx.font = "600 12px system-ui, sans-serif";
    const tw = ctx.measureText(label).width;
    const chipY = y > 24 ? y - 22 : y + 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, chipY, tw + 14, 18, 6);
    ctx.fill();
    ctx.fillStyle = "#0b1220";
    ctx.fillText(label, x + 7, chipY + 13);
  }
}
