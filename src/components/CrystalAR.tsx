import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, Loader2, ScanLine, Sparkles, X, AlertTriangle, FlaskConical } from "lucide-react";
import { BohrModel3D } from "./BohrModel3D";

/**
 * Image-trigger AR scanner (multi-card).
 *
 * Opens the camera and watches for the AlcheMix element trigger cards
 * (public/image-trigger/image-trigger-<element>.png, compiled together into
 * public/targets.mind). When a card is found, that element's 3D model
 * (public/3d-models/<element>/scene.gltf) rises out of it.
 *
 * MindAR (WebGL + camera) and GLTFLoader are dynamically imported inside start()
 * so nothing touches `window`/`document` during SSR.
 *
 * IMPORTANT: anchor index = position in AR_ELEMENTS = the order the trigger
 * images are passed to `npm run compile:ar`. Keep all three in sync.
 */

const MIND_SRC = "/targets.mind";

// Tuning knobs for how each model sits on its card.
const MODEL_SIZE = 0.6;   // longest dimension, in MindAR units (card width = 1)
const SPIN_SPEED = 0.012; // radians/frame turntable spin

export interface ARElement {
  key: string;      // folder name under public/3d-models/, all lower case
  symbol: string;
  name: string;
  number: number;
  mass: string;
  category: string;
  facts: string[];
}

/** Anchor index = position here = compile order of the trigger images. */
export const AR_ELEMENTS: ARElement[] = [
  {
    key: "alchemix",
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
  },
  {
    key: "helium",
    symbol: "He",
    name: "Helium",
    number: 2,
    mass: "4.003",
    category: "Noble Gas",
    facts: [
      "State: Colorless, odorless gas",
      "Second-lightest element of all",
      "Lighter than air — balloons float",
    ],
  },
];

const modelSrc = (el: ARElement) => `/3d-models/${el.key}/scene.gltf`;

// Builds the floating info card as a canvas-textured plane that lives in AR
// space (anchored to the card, billboarded toward the camera). Client-only —
// only ever called at runtime from start().
function makeInfoPanel(el: ARElement): THREE.Mesh {
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
  ctx.fillText(el.symbol, pad, 40);

  ctx.textAlign = "right";
  ctx.fillStyle = "#e8dcc0";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText(String(el.number), W - pad, 52);
  ctx.fillStyle = "rgba(232,220,192,0.7)";
  ctx.font = "500 26px system-ui, sans-serif";
  ctx.fillText(el.mass, W - pad, 102);
  ctx.textAlign = "left";

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 54px system-ui, sans-serif";
  ctx.fillText(el.name, pad, 210);

  ctx.fillStyle = "#d4b25a";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(el.category, pad, 278);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 340);
  ctx.lineTo(W - pad, 340);
  ctx.stroke();

  ctx.font = "400 28px system-ui, sans-serif";
  el.facts.forEach((f, i) => {
    const y = 372 + i * 54;
    ctx.fillStyle = "#34d399";
    ctx.fillText("•", pad, y);
    ctx.fillStyle = "rgba(232,220,192,0.9)";
    ctx.fillText(f, pad + 30, y);
  });

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "italic 22px system-ui, sans-serif";
  ctx.fillText("tap to close", pad, H - 74);

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
      depthTest: false, // always readable, never hidden behind the model
    }),
  );
  mesh.renderOrder = 999;
  mesh.visible = false;
  return mesh;
}

// Synthesized "summon" chime (rising C-major arpeggio) — no audio asset needed.
// The camera's Start click already counts as the user gesture browsers require.
function playChime() {
  try {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.05);
    });
    window.setTimeout(() => void ctx.close().catch(() => {}), 2200);
  } catch {
    /* sound is a garnish — never block the summon */
  }
}

type Status = "idle" | "starting" | "scanning" | "found" | "error";

// The forged card the mix ceremony currently reveals. One sample for now;
// later this is chosen from the two cards being mixed.
const MIX_FORGED_ID = "3rd_card";
const MIX_FORGED_IMAGE = "/other_cards/3rd_card.png";

export function CrystalAR({
  onFound,
  onMix,
}: {
  onFound?: (elementKey: string) => void;
  /** Fires once the mix reveals a new card, so the host can register it. */
  onMix?: (forgedId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mindarRef = useRef<any>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [foundName, setFoundName] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  // How many element cards are on screen at once — the "Alche-mix them?" button
  // only appears when two or more are visible together.
  const [visibleCount, setVisibleCount] = useState(0);
  // The mix ceremony: idle → swirling (Bohr atom) → revealed (new card pops up).
  const [mixPhase, setMixPhase] = useState<"idle" | "swirling" | "revealed">("idle");
  const mixTimerRef = useRef<number | null>(null);

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
    resetMix();
    setVisibleCount(0);
  };

  // ── Alche-mix ceremony ──────────────────────────────────────────────────────
  // Kick off the swirl, then reveal the new element card. Purely presentational
  // for now — the swirl runs for a fixed beat, then the new card pops up.
  const startMix = () => {
    if (mixPhase !== "idle") return;
    setMixPhase("swirling");
    playChime();
    if (mixTimerRef.current) window.clearTimeout(mixTimerRef.current);
    mixTimerRef.current = window.setTimeout(() => {
      setMixPhase("revealed");
      mixTimerRef.current = null;
      onMix?.(MIX_FORGED_ID); // register the new card to the Grimoire
    }, 2600);
  };
  const resetMix = () => {
    if (mixTimerRef.current) {
      window.clearTimeout(mixTimerRef.current);
      mixTimerRef.current = null;
    }
    setMixPhase("idle");
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

      // Lighting that flatters metallic-roughness textures.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(1, 2, 3);
      scene.add(key);

      // ── Summon-moment particle burst ─────────────────────────────────────
      // Sparks fly out of a card the instant its model is first found.
      const bursts: { points: THREE.Points; velocities: THREE.Vector3[]; age: number }[] = [];
      const spawnBurst = (group: THREE.Group, color: number, count: number) => {
        const pos = new Float32Array(count * 3);
        const velocities: THREE.Vector3[] = [];
        for (let i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 0.15;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
          pos[i * 3 + 2] = Math.random() * 0.1;
          const dir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            0.4 + Math.random() * 0.8, // biased upward, out of the card
          ).normalize();
          velocities.push(dir.multiplyScalar(0.5 + Math.random() * 0.9));
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const points = new THREE.Points(
          geo,
          new THREE.PointsMaterial({
            color, size: 0.028, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        group.add(points);
        bursts.push({ points, velocities, age: 0 });
      };
      const BURST_DT = 1 / 60;
      const BURST_LIFE = 1.4; // seconds
      const updateBursts = () => {
        for (let bi = bursts.length - 1; bi >= 0; bi--) {
          const b = bursts[bi];
          b.age += BURST_DT;
          const attr = b.points.geometry.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < b.velocities.length; i++) {
            const v = b.velocities[i];
            attr.setXYZ(i, attr.getX(i) + v.x * BURST_DT, attr.getY(i) + v.y * BURST_DT, attr.getZ(i) + v.z * BURST_DT);
            v.multiplyScalar(0.965); // air drag
            v.z -= 0.5 * BURST_DT;   // gentle gravity back toward the card
          }
          attr.needsUpdate = true;
          const mat = b.points.material as THREE.PointsMaterial;
          mat.opacity = Math.max(0, 1 - b.age / BURST_LIFE);
          if (b.age > BURST_LIFE) {
            b.points.parent?.remove(b.points);
            b.points.geometry.dispose();
            mat.dispose();
            bursts.splice(bi, 1);
          }
        }
      };

      // ── One anchor per element card ──────────────────────────────────────
      interface Tracked {
        el: ARElement;
        spinner: THREE.Group;
        model: THREE.Object3D | null;
        infoPanel: THREE.Mesh | null;
        summoned: boolean; // first-find latch (per scan session)
      }
      const loader = new GLTFLoader();
      const visibleAnchors = new Set<number>();
      const tracked: Tracked[] = AR_ELEMENTS.map((el, i) => {
        const anchor = mindar.addAnchor(i);
        const spinner = new THREE.Group(); // turntable wrapper (spins the model)
        anchor.group.add(spinner);
        const t: Tracked = { el, spinner, model: null, infoPanel: null, summoned: false };

        loader.load(
          modelSrc(el),
          (gltf: { scene: THREE.Group }) => {
            const model = gltf.scene;

            // ── Seat the model dead-centre on the card ──
            // The anchor's origin IS the centre of the card. Centre the raw
            // geometry inside a holder first (offset applied *before* the
            // holder's rotation/scale, so it stays exact for any model pivot),
            // then stand the holder up and lift it by half its height so the
            // base rests precisely on the card's centre.
            const holder = new THREE.Group();
            holder.add(model);
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            model.position.sub(center); // geometric centre → holder origin

            const scale = MODEL_SIZE / (Math.max(size.x, size.y, size.z) || 1);
            holder.scale.setScalar(scale);
            holder.rotation.x = Math.PI / 2; // model's up (+Y) → out of the card (+Z)
            t.spinner.add(holder);

            const height = size.y * scale; // extent along +Z after standing up
            t.spinner.position.set(0, 0, height / 2);

            // Floating info card — added to the anchor (not the spinner) so it
            // does not turntable-spin; it billboards toward the camera.
            const infoPanel = makeInfoPanel(el);
            infoPanel.position.set(0.6, 0, height * 0.9);
            anchor.group.add(infoPanel);

            t.model = model;
            t.infoPanel = infoPanel;
          },
          undefined,
          (err: unknown) => {
            console.error(`[CrystalAR] ${el.key} model load failed`, err);
            setError(`Could not load the 3D model for ${el.name}.`);
            setStatus("error");
          },
        );

        anchor.onTargetFound = () => {
          visibleAnchors.add(i);
          setVisibleCount(visibleAnchors.size);
          setStatus("found");
          setFoundName(el.name);
          if (!t.summoned) {
            t.summoned = true;
            spawnBurst(anchor.group, 0xffd873, 130); // gold sparks
            spawnBurst(anchor.group, 0x34d399, 70);  // emerald sparks
            playChime();
            onFound?.(el.key);
          }
        };
        anchor.onTargetLost = () => {
          visibleAnchors.delete(i);
          setVisibleCount(visibleAnchors.size);
          if (visibleAnchors.size === 0) setStatus("scanning");
        };

        return t;
      });

      // Tap a model → toggle its info card (closing any other). Tap a card → dismiss.
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const onPointerDown = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        for (const t of tracked) {
          if (t.infoPanel?.visible && raycaster.intersectObject(t.infoPanel, false).length) {
            t.infoPanel.visible = false;
            setInfoOpen(false);
            return;
          }
        }
        for (const t of tracked) {
          if (t.model && raycaster.intersectObject(t.model, true).length) {
            const open = !(t.infoPanel?.visible ?? false);
            tracked.forEach((o) => { if (o.infoPanel) o.infoPanel.visible = false; });
            if (t.infoPanel) t.infoPanel.visible = open;
            setInfoOpen(open);
            return;
          }
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

      await mindar.start(); // getUserMedia + tracking (needs a user gesture → this runs from a click)

      // MindAR positions its <video> at z-index:-2, which the native-fullscreen
      // backdrop paints over (black screen). Pin the canvas above it.
      const videoEl = (mindar as unknown as { video?: HTMLVideoElement }).video;
      renderer.domElement.style.zIndex = "1";

      // MindAR sizes the <video> with manual pixel math derived from
      // video.videoWidth/Height — which phones (iOS Safari especially) report
      // late or wrong at start, leaving a tiny/offset feed. Don't trust it:
      // pin the video to the container and let object-fit:cover do the
      // cropping/centring. Geometrically identical to MindAR's intended
      // layout, but self-correcting on every size change.
      const coverVideo = () => {
        if (!videoEl) return;
        videoEl.style.zIndex = "0";
        videoEl.style.top = "0px";
        videoEl.style.left = "0px";
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
      };
      coverVideo();

      // Still run MindAR's resize() (it derives the camera FOV/projection from
      // the container) whenever the viewport or the camera's reported
      // dimensions settle — then re-assert our cover styles, since resize()
      // rewrites the video's inline pixel sizing.
      const nudgeResize = () => {
        if (mindarRef.current === mindar) {
          try { mindar.resize(); } catch { /* session ending — ignore */ }
          coverVideo();
        }
      };
      const resizeTimers = [250, 700, 1500].map((ms) => window.setTimeout(nudgeResize, ms));
      window.addEventListener("orientationchange", nudgeResize);
      document.addEventListener("fullscreenchange", nudgeResize);
      window.visualViewport?.addEventListener("resize", nudgeResize);
      // <video> fires "resize" when videoWidth/videoHeight actually change —
      // the exact moment phones deliver the camera's true dimensions.
      videoEl?.addEventListener("resize", nudgeResize);
      const prevCleanup = cleanupRef.current;
      cleanupRef.current = () => {
        resizeTimers.forEach((t) => window.clearTimeout(t));
        window.removeEventListener("orientationchange", nudgeResize);
        document.removeEventListener("fullscreenchange", nudgeResize);
        window.visualViewport?.removeEventListener("resize", nudgeResize);
        videoEl?.removeEventListener("resize", nudgeResize);
        prevCleanup?.();
      };

      const camWorld = new THREE.Vector3();
      renderer.setAnimationLoop(() => {
        tracked.forEach((t) => { t.spinner.rotation.z += SPIN_SPEED; });
        updateBursts();
        tracked.forEach((t) => {
          if (t.infoPanel?.visible) {
            t.infoPanel.lookAt(camera.getWorldPosition(camWorld)); // billboard to camera
          }
        });
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
          // inset-0 alone sizes the fixed box to the *visible* viewport;
          // h-screen (100vh) would overshoot it on phones with dynamic URL bars.
          ? "fixed inset-0 z-[60] overflow-hidden bg-slate-sunken"
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
            <p className="font-medium text-parchment">Scan an AlcheMix element card</p>
            <p className="mt-1 text-sm text-parchment/60">
              Point your camera at a trigger card to summon its 3D model.
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
                <span className="text-gold">{foundName || "Element"} summoned</span>
              </>
            ) : (
              <>
                <ScanLine className="h-3.5 w-3.5 animate-pulse text-emerald-elixir" />
                <span className="text-parchment/80">Looking for a card…</span>
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

          {/* Tap hint — only once a model is on-screen. */}
          {status === "found" && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-sunken/80 px-3 py-1.5 text-xs text-parchment/80 backdrop-blur">
              {infoOpen ? "Tap the card to close the info" : "Tap the model to inspect · ✕ to claim your discovery"}
            </div>
          )}

          {/* Two cards on screen at once → offer to mix them. */}
          {mixPhase === "idle" && visibleCount >= 2 && (
            <button
              onClick={startMix}
              className="animate-pulse-ring absolute bottom-16 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-wraith to-emerald-elixir px-6 py-3 font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              <FlaskConical className="h-5 w-5" /> Alche-mix them?
            </button>
          )}

          {/* AlcheMix watermark, bottom-right. */}
          <img
            src="/images/logo-outline.png"
            alt="AlcheMix"
            className="pointer-events-none absolute bottom-3 right-3 z-10 h-8 w-auto opacity-70 drop-shadow-lg sm:h-10"
          />
        </>
      )}

      {/* ── Mix ceremony: swirling Bohr atom ── */}
      {mixPhase === "swirling" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-sunken/85 backdrop-blur-sm">
          <div className="h-64 w-64 sm:h-80 sm:w-80">
            <BohrModel3D electrons="2,8,8,2" color="#c084fc" nucleusColor="#fbbf24" tumble />
          </div>
          <p className="animate-pulse text-lg font-medium text-parchment text-glow-teal">
            Fusing elements…
          </p>
        </div>
      )}

      {/* ── Mix ceremony: the new element card pops up ── */}
      {mixPhase === "revealed" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-slate-sunken/90 p-6 backdrop-blur">
          <img
            src={MIX_FORGED_IMAGE}
            alt="A newly forged element card"
            className="animate-card-pop max-h-[60vh] w-auto rounded-2xl shadow-2xl"
          />
          <p className="flex items-center gap-1.5 text-sm text-gold text-glow-teal">
            <Sparkles className="h-4 w-4" /> New element added to your Grimoire
          </p>
          <button
            onClick={resetMix}
            className="inline-flex items-center gap-2 rounded-full border border-parchment/25 bg-slate-sunken/70 px-5 py-2.5 text-parchment transition hover:bg-parchment/10"
          >
            Claim &amp; keep scanning
          </button>
        </div>
      )}
    </div>
  );
}
