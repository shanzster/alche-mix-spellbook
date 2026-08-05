import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, Loader2, ScanLine, Sparkles, X, AlertTriangle } from "lucide-react";

/**
 * Image-trigger AR scanner.
 *
 * Opens the camera, watches for the AlcheMix element trigger image
 * (public/image-trigger/alchemix-element-trigger.png, compiled into
 * public/targets.mind), and renders the 3D crystal
 * (public/3d-models/alchemix/scene.gltf) standing up out of the card.
 *
 * MindAR (WebGL + camera) and GLTFLoader are dynamically imported inside start()
 * so nothing touches `window`/`document` during SSR.
 *
 * To add more trigger images later: recompile targets.mind with the extra
 * images (npm run compile:ar), keep this file's anchor index in sync with the
 * compile order, and addAnchor(n) for each.
 */

const MIND_SRC = "/targets.mind";
const MODEL_SRC = "/3d-models/alchemix/scene.gltf";

// Tuning knobs for how the crystal sits on the card.
const MODEL_SIZE = 0.6;   // longest dimension, in MindAR units (image width = 1)
const SPIN_SPEED = 0.012; // radians/frame turntable spin

// Placeholder element info shown when you tap the crystal in AR.
// TODO: swap for real element data (or pass it in as a prop) later.
const ELEMENT_INFO = {
  symbol: "Ax",
  name: "Alchemix",
  number: 118,
  mass: "294.21",
  category: "Mythic Metalloid",
  facts: [
    "State: Crystalline solid",
    "Origin: The Grand Grimoire",
    "Glows faintly under moonlight",
  ],
};

// Builds the floating info card as a canvas-textured plane that lives in AR
// space (anchored to the card, billboarded toward the camera). Client-only —
// only ever called at runtime from start().
function makeInfoPanel(): THREE.Mesh {
  const W = 512;
  const H = 660;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const round = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  ctx.fillStyle = "rgba(12,18,28,0.93)";
  round(8, 8, W - 16, H - 16, 28);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(52,211,153,0.55)";
  ctx.stroke();

  const pad = 44;
  ctx.textBaseline = "top";

  ctx.fillStyle = "#67e8c3";
  ctx.font = "bold 150px system-ui, sans-serif";
  ctx.fillText(ELEMENT_INFO.symbol, pad, 40);

  ctx.textAlign = "right";
  ctx.fillStyle = "#e8dcc0";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText(String(ELEMENT_INFO.number), W - pad, 52);
  ctx.fillStyle = "rgba(232,220,192,0.7)";
  ctx.font = "500 26px system-ui, sans-serif";
  ctx.fillText(ELEMENT_INFO.mass, W - pad, 102);
  ctx.textAlign = "left";

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 54px system-ui, sans-serif";
  ctx.fillText(ELEMENT_INFO.name, pad, 210);

  ctx.fillStyle = "#d4b25a";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(ELEMENT_INFO.category, pad, 278);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 340);
  ctx.lineTo(W - pad, 340);
  ctx.stroke();

  ctx.font = "400 28px system-ui, sans-serif";
  ELEMENT_INFO.facts.forEach((f, i) => {
    const y = 372 + i * 54;
    ctx.fillStyle = "#34d399";
    ctx.fillText("•", pad, y);
    ctx.fillStyle = "rgba(232,220,192,0.9)";
    ctx.fillText(f, pad + 30, y);
  });

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "italic 22px system-ui, sans-serif";
  ctx.fillText("tap to close · placeholder data", pad, H - 74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const w = 0.72;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w * (H / W)),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false, // always readable, never hidden behind the crystal
    }),
  );
  mesh.renderOrder = 999;
  mesh.visible = false;
  return mesh;
}

type Status = "idle" | "starting" | "scanning" | "found" | "error";

export function CrystalAR({ onFound }: { onFound?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mindarRef = useRef<any>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [infoOpen, setInfoOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");

  const stop = async () => {
    const mindar = mindarRef.current;
    if (!mindar) return;
    try {
      cleanupRef.current?.(); // remove listeners first so exitFullscreen doesn't loop
      cleanupRef.current = null;
      mindar.renderer.setAnimationLoop(null);
      mindar.stop();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {
      /* ignore */
    }
    mindarRef.current = null;
    setInfoOpen(false);
    setFullscreen(false);
    setStatus("idle");
  };

  const start = async () => {
    const container = containerRef.current;
    if (!container || mindarRef.current) return;
    setStatus("starting");
    setError("");
    try {
      // MindAR swallows camera errors (it only console.logs them), so pre-flight
      // the camera ourselves to surface a real, actionable message.
      if (!window.isSecureContext) {
        throw new Error(
          "Camera needs a secure page. Open the app at http://localhost (not a LAN IP), or over HTTPS.",
        );
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser can't access the camera here.");
      }
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      probe.getTracks().forEach((t) => t.stop()); // release; MindAR reacquires

      // Go immersive BEFORE MindAR measures the container, so the feed fills the
      // whole screen. CSS `fixed inset-0` is the reliable part; native
      // requestFullscreen (best-effort) additionally hides the browser chrome.
      setFullscreen(true);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      try {
        await container.requestFullscreen?.();
      } catch {
        /* CSS fullscreen still applies */
      }

      const [{ MindARThree }, { GLTFLoader }] = await Promise.all([
        import("mind-ar/dist/mindar-image-three.prod.js"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
      ]);

      const mindar = new MindARThree({
        container,
        imageTargetSrc: MIND_SRC,
        uiScanning: "yes",
        uiLoading: "yes",
      });
      mindarRef.current = mindar;
      const { renderer, scene, camera } = mindar;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Lighting that flatters the crystal's metallic-roughness textures.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(1, 2, 3);
      scene.add(key);

      // Anchor 0 = the alchemix element trigger (first/only image in targets.mind).
      const anchor = mindar.addAnchor(0);
      const spinner = new THREE.Group(); // turntable wrapper (spins the crystal)
      anchor.group.add(spinner);

      // Populated once the model loads; the tap handler + render loop read these.
      let model: THREE.Object3D | null = null;
      let infoPanel: THREE.Mesh | null = null;

      new GLTFLoader().load(
        MODEL_SRC,
        (gltf: { scene: THREE.Group }) => {
          model = gltf.scene;

          // Center the model on the origin, then scale to a friendly size.
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          model.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = MODEL_SIZE / maxDim;
          model.scale.setScalar(scale);

          // Stand the crystal UP out of the card: rotate the model's +Y (up) onto
          // +Z, which points straight out of a card lying flat on the table.
          model.rotation.x = Math.PI / 2;
          spinner.add(model);

          // Lift so the base rests on the card instead of being half-buried.
          const crystalHeight = size.y * scale;
          spinner.position.z = crystalHeight / 2;

          // Floating info card — added to the anchor (not the spinner) so it does
          // not turntable-spin; it billboards toward the camera each frame.
          infoPanel = makeInfoPanel();
          infoPanel.position.set(0.6, 0, crystalHeight * 0.9);
          anchor.group.add(infoPanel);
        },
        undefined,
        (err: unknown) => {
          console.error("[CrystalAR] model load failed", err);
          setError("Could not load the 3D crystal model.");
          setStatus("error");
        },
      );

      // Tap the crystal → toggle the info card. Tap the card → dismiss it.
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const onPointerDown = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        if (infoPanel?.visible && raycaster.intersectObject(infoPanel, false).length) {
          infoPanel.visible = false;
          setInfoOpen(false);
          return;
        }
        if (model && raycaster.intersectObject(model, true).length) {
          const open = !(infoPanel?.visible ?? false);
          if (infoPanel) infoPanel.visible = open;
          setInfoOpen(open);
        }
      };
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.addEventListener("pointerdown", onPointerDown);

      // If the user leaves native fullscreen (e.g. Esc), end the session too.
      const onFsChange = () => {
        if (!document.fullscreenElement && mindarRef.current) void stop();
      };
      document.addEventListener("fullscreenchange", onFsChange);

      cleanupRef.current = () => {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("fullscreenchange", onFsChange);
      };

      let firstFind = true;
      anchor.onTargetFound = () => {
        setStatus("found");
        if (firstFind) {
          firstFind = false;
          onFound?.();
        }
      };
      anchor.onTargetLost = () => setStatus("scanning");

      await mindar.start(); // getUserMedia + tracking (needs a user gesture → this runs from a click)

      // MindAR positions its <video> at z-index:-2, which the native-fullscreen
      // backdrop paints over (black screen). Pin the video + canvas to explicit
      // positive layers so the feed shows in both windowed and fullscreen.
      const videoEl = (mindar as unknown as { video?: HTMLVideoElement }).video;
      if (videoEl) videoEl.style.zIndex = "0";
      renderer.domElement.style.zIndex = "1";

      const camWorld = new THREE.Vector3();
      renderer.setAnimationLoop(() => {
        spinner.rotation.z += SPIN_SPEED;
        if (infoPanel?.visible) {
          infoPanel.lookAt(camera.getWorldPosition(camWorld)); // billboard to camera
        }
        renderer.render(scene, camera);
      });
      setStatus("scanning");
    } catch (e: unknown) {
      console.error("[CrystalAR] start failed", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /permission|denied|notallowed/i.test(msg)
          ? "Camera permission was blocked. Allow camera access and try again."
          : msg || "Could not start the camera.",
      );
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFullscreen(false);
      setStatus("error");
    }
  };

  // Tidy up the camera/renderer if the component unmounts mid-scan.
  useEffect(() => () => void stop(), []);

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? "fixed inset-0 z-[60] h-screen w-screen overflow-hidden bg-slate-sunken"
          : "relative w-full overflow-hidden rounded-2xl bg-slate-sunken"
      }
      // `isolation: isolate` gives this panel its own stacking context so MindAR's
      // z-index:-2 <video> renders inside it (above the background), not behind it.
      // Windowed: 16:9 matches typical desktop webcams so the feed fills the width.
      style={
        fullscreen
          ? { isolation: "isolate" }
          : { aspectRatio: "16 / 9", minHeight: 380, isolation: "isolate" }
      }
    >
      {/* Idle: prompt to launch the camera. */}
      {status === "idle" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <ScanLine className="h-12 w-12 text-emerald-elixir" />
          <div>
            <p className="font-medium text-parchment">Scan the AlcheMix element card</p>
            <p className="mt-1 text-sm text-parchment/60">
              Point your camera at the trigger image to summon the 3D crystal.
            </p>
          </div>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-elixir px-5 py-2.5 font-medium text-slate-sunken transition hover:brightness-110"
          >
            <Camera className="h-4 w-4" /> Start scanning
          </button>
        </div>
      )}

      {status === "starting" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-elixir" />
          <p className="text-sm text-parchment/70">Starting camera…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-crimson" />
          <p className="max-w-xs text-sm text-parchment/80">{error}</p>
          <button
            onClick={() => {
              void stop().then(start);
            }}
            className="rounded-full border border-parchment/25 px-4 py-2 text-sm text-parchment hover:bg-parchment/10"
          >
            Try again
          </button>
        </div>
      )}

      {/* Live overlay while the camera is running. */}
      {(status === "scanning" || status === "found") && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-sunken/80 px-3 py-1.5 text-xs backdrop-blur">
            {status === "found" ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="text-gold">Crystal summoned</span>
              </>
            ) : (
              <>
                <ScanLine className="h-3.5 w-3.5 animate-pulse text-emerald-elixir" />
                <span className="text-parchment/80">Looking for the card…</span>
              </>
            )}
          </div>
          <button
            onClick={() => void stop()}
            className="absolute right-3 top-3 z-10 rounded-full bg-slate-sunken/80 p-2 text-parchment backdrop-blur hover:bg-slate-sunken"
            aria-label="Stop scanning"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Tap hint — only once the crystal is on-screen. */}
          {status === "found" && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-sunken/80 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur">
              {infoOpen ? "Tap the card to close the info" : "Tap the crystal to inspect the element"}
            </div>
          )}

          {/* AlcheMix watermark, bottom-right. */}
          <img
            src="/images/logo-outline.png"
            alt="AlcheMix"
            className="pointer-events-none absolute bottom-3 right-3 z-10 h-8 w-auto opacity-70 drop-shadow-lg sm:h-10"
          />
        </>
      )}
    </div>
  );
}
