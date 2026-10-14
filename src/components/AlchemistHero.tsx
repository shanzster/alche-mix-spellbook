import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * The Alchemist's ceremony — the landing hero as a layered parallax scene.
 *
 * Layers (back → front): body, gem halo, hand-left, hand-right, composited
 * from `public/hero/layers.json` inside one canvas-space stage (1792×2432)
 * that is scaled with a single transform so everything stays registered.
 *
 * The halo is a Three.js overlay: 12 GLB crystals (H…Mg, real crystal
 * systems) on an ellipse about halo_centre, revolving once per ~90s, each
 * spinning on its own Y axis, labelled with real HTML element symbols.
 *
 * Fallbacks: no WebGL → the flat gem PNGs on CSS rotation; reduced motion →
 * the static composite with no animation at all.
 */

// ── layers.json / manifest.json shapes ──────────────────────────────────────
interface HeroLayer {
  file: string;
  role: "body" | "hand" | "halo" | "gem";
  offset: [number, number];
  size: [number, number];
  centre?: [number, number];
  pivot_local?: [number, number];
}
interface HeroLayout {
  canvas: [number, number];
  layers: HeroLayer[];
  halo_centre: [number, number];
  background: string;
}
interface CrystalEntry {
  symbol: string;
  name: string;
  z: number;
  crystalSystem: string;
  color: string;
}

// Parallax factors (screen px per unit of cursor offset from centre)
const PARALLAX_BASE = 22;
const FACTOR = { body: 0.4, halo: 1.0, hands: 1.6 };
const RING_PERIOD = 90; // seconds per revolution
const CRYSTAL_SIZE = 150; // target height in canvas units

const strip = (file: string) => file.replace(/\.png$/, "");

/** PNG layer served as WebP with PNG fallback. */
function LayerImg({ base, alt = "" }: { base: string; alt?: string }) {
  return (
    <picture>
      <source srcSet={`/hero/${base}.webp`} type="image/webp" />
      <img
        src={`/hero/${base}.png`}
        alt={alt}
        draggable={false}
        className="h-full w-full select-none"
        style={{ display: "block" }}
      />
    </picture>
  );
}

export function AlchemistHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyParRef = useRef<HTMLDivElement>(null);
  const handsParRef = useRef<HTMLDivElement>(null);
  const haloScreenRef = useRef<HTMLDivElement>(null); // canvas + labels (screen space)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [layout, setLayout] = useState<HeroLayout | null>(null);
  const [crystals, setCrystals] = useState<CrystalEntry[]>([]);
  // webgl: 3D halo · png: flat gems on CSS rotation · static: no motion
  const [mode, setMode] = useState<"webgl" | "png" | "static">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "static"
      : "webgl"
  );

  // ── data ──
  useEffect(() => {
    let dead = false;
    Promise.all([
      fetch("/hero/layers.json").then((r) => r.json()),
      fetch("/crystals/manifest.json").then((r) => r.json()),
    ])
      .then(([lay, man]) => {
        if (dead) return;
        setLayout(lay);
        setCrystals((man as CrystalEntry[]).slice(0, 12));
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);

  // ── scene + motion ──
  useEffect(() => {
    if (!layout || mode === "static") return;
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    const [CW, CH] = layout.canvas;
    const [hx, hy] = layout.halo_centre;
    const gems = layout.layers.filter((l) => l.role === "gem" && l.centre);
    const rx =
      gems.length > 0
        ? (Math.max(...gems.map((g) => g.centre![0])) - Math.min(...gems.map((g) => g.centre![0]))) / 2
        : 700;
    const ry =
      gems.length > 0
        ? (Math.max(...gems.map((g) => g.centre![1])) - Math.min(...gems.map((g) => g.centre![1]))) / 2
        : 420;

    let scale = container.clientWidth / CW;
    let raf = 0;
    let running = true;
    let visible = true;
    let disposed = false;
    let last = performance.now();
    let t = 0;

    // pointer parallax — eased toward the cursor's offset from centre
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return; // only when the cursor truly leaves the window
      target.x = 0;
      target.y = 0;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });

    // ── Three.js halo ──
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    const spinners: { group: THREE.Group; baseAngle: number; speed: number }[] = [];

    const initGL = async () => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("no canvas");
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight, false);

      scene = new THREE.Scene();
      // Orthographic camera in canvas units so crystals sit flat on the art
      camera = new THREE.OrthographicCamera(0, CW, 0, -CH, -600, 600);
      camera.position.z = 10;

      const key = new THREE.DirectionalLight(0xfff2d8, 1.4);
      key.position.set(-500, 700, 500); // upper left
      scene.add(key);
      scene.add(new THREE.AmbientLight(0x8893b0, 0.35));

      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      const loaded = await Promise.all(
        crystals.map((c) => loader.loadAsync(`/crystals/${c.symbol}.glb`))
      );
      if (disposed) return;

      loaded.forEach((gltf, i) => {
        const entry = crystals[i];
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(entry.color),
          transparent: true,
          opacity: 0.86,
          roughness: 0.18,
          metalness: 0.25,
          emissive: new THREE.Color(entry.color),
          emissiveIntensity: 0.22,
          flatShading: true,
        });
        const group = new THREE.Group();
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const mesh = new THREE.Mesh((o as THREE.Mesh).geometry, material);
            group.add(mesh);
          }
        });
        // normalise to a consistent on-art size
        const box = new THREE.Box3().setFromObject(group);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        const s = CRYSTAL_SIZE / Math.max(sz.x, sz.y, sz.z || 1);
        group.scale.setScalar(s);
        spinners.push({
          group,
          baseAngle: -Math.PI / 2 + (i * 2 * Math.PI) / crystals.length,
          speed: 0.2 + 0.2 * ((i * 7) % 12) / 11, // 0.2–0.4 rad/s, unsynchronised
        });
        scene!.add(group);
      });
    };

    // ── frame loop ──
    const frame = (now: number) => {
      if (!running || disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      eased.x += (target.x - eased.x) * 0.06;
      eased.y += (target.y - eased.y) * 0.06;
      const sy = 0.6; // vertical parallax is gentler
      if (bodyParRef.current)
        bodyParRef.current.style.transform = `translate(${((eased.x * PARALLAX_BASE * FACTOR.body) / scale).toFixed(2)}px, ${((eased.y * PARALLAX_BASE * FACTOR.body * sy) / scale).toFixed(2)}px)`;
      if (handsParRef.current)
        handsParRef.current.style.transform = `translate(${((eased.x * PARALLAX_BASE * FACTOR.hands) / scale).toFixed(2)}px, ${((eased.y * PARALLAX_BASE * FACTOR.hands * sy) / scale).toFixed(2)}px)`;
      if (haloScreenRef.current)
        haloScreenRef.current.style.transform = `translate(${(eased.x * PARALLAX_BASE * FACTOR.halo).toFixed(2)}px, ${(eased.y * PARALLAX_BASE * FACTOR.halo * sy).toFixed(2)}px)`;

      if (renderer && scene && camera && mode === "webgl") {
        const ringAngle = (t * 2 * Math.PI) / RING_PERIOD;
        spinners.forEach((sp, i) => {
          const a = sp.baseAngle + ringAngle;
          const px = hx + rx * Math.cos(a);
          const py = hy + ry * Math.sin(a);
          sp.group.position.set(px, -py, 0);
          sp.group.rotation.y = t * sp.speed;
          const label = labelRefs.current[i];
          if (label) {
            const lx = (hx + (rx + 92) * Math.cos(a)) * scale;
            const ly = (hy + (ry + 72) * Math.sin(a)) * scale;
            label.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -50%)`;
            label.style.opacity = "1"; // hidden until first positioned
          }
        });
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!running && visible && !disposed) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // pause offscreen
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.02 }
    );
    io.observe(container);

    // keep the stage registered on resize
    const ro = new ResizeObserver(() => {
      scale = container.clientWidth / CW;
      stage.style.transform = `scale(${scale})`;
      renderer?.setSize(container.clientWidth, container.clientHeight, false);
    });
    ro.observe(container);
    stage.style.transform = `scale(${scale})`;

    if (mode === "webgl") {
      initGL().catch(() => {
        // WebGL unavailable or a crystal failed to load — flat gems instead
        renderer?.dispose();
        renderer = null;
        setMode("png");
      });
    }
    running = false;
    start();

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      spinners.forEach((sp) =>
        sp.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        })
      );
      renderer?.dispose();
    };
  }, [layout, crystals, mode]);

  if (!layout) {
    return <div ref={containerRef} className="h-full w-full" style={{ background: "transparent" }} />;
  }

  const [CW, CH] = layout.canvas;
  const [hx, hy] = layout.halo_centre;
  const body = layout.layers.find((l) => l.role === "body");
  const hands = layout.layers.filter((l) => l.role === "hand");
  const ring = layout.layers.find((l) => l.role === "halo");
  const gems = layout.layers.filter((l) => l.role === "gem");
  const ringRadius = 980; // generous box around halo_centre for the CSS ring

  const place = (l: HeroLayer): React.CSSProperties => ({
    position: "absolute",
    left: l.offset[0],
    top: l.offset[1],
    width: l.size[0],
    height: l.size[1],
  });

  const isStatic = mode === "static";
  const showPngGems = mode !== "webgl";

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ aspectRatio: `${CW} / ${CH}` }}>
      {/* The stage — canvas-space coordinates, one scale transform */}
      <div
        ref={stageRef}
        className="absolute left-0 top-0"
        style={{ width: CW, height: CH, transformOrigin: "top left" }}
      >
        {/* 1 · body */}
        <div ref={bodyParRef} className="absolute inset-0">
          <div className={isStatic ? "" : "ceremony-drift"}>
            {body && (
              <div style={place(body)}>
                <LayerImg base={strip(body.file)} alt="The Alchemist" />
              </div>
            )}
          </div>
        </div>

        {/* 2a · in 3D mode the painted ring stays underneath, blurred into a
            pure glow — the crystals carry no bloom of their own */}
        {mode === "webgl" && ring && (
          <div className="absolute inset-0" aria-hidden>
            <div style={{ ...place(ring), opacity: 0.5, filter: "blur(14px) saturate(1.15)" }}>
              <LayerImg base={strip(ring.file)} />
            </div>
          </div>
        )}

        {/* 2b · gem halo (flat fallback / static composite) */}
        {showPngGems && ring && (
          <div className="absolute inset-0">
            {isStatic ? (
              <div style={place(ring)}>
                <LayerImg base={strip(ring.file)} />
              </div>
            ) : (
              <div
                className="ceremony-ring absolute"
                style={{ left: hx - ringRadius, top: hy - ringRadius, width: ringRadius * 2, height: ringRadius * 2 }}
              >
                {gems.map((g) => (
                  <div
                    key={g.file}
                    className="ceremony-ring-counter absolute"
                    style={{
                      left: g.offset[0] - (hx - ringRadius),
                      top: g.offset[1] - (hy - ringRadius),
                      width: g.size[0],
                      height: g.size[1],
                    }}
                  >
                    <LayerImg base={strip(g.file)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3 · hands, swaying about their pivots */}
        <div ref={handsParRef} className="absolute inset-0">
          {hands.map((h, i) => (
            <div key={h.file} style={place(h)}>
              <div
                className={isStatic ? "" : i === 0 ? "ceremony-sway-a" : "ceremony-sway-b"}
                style={{
                  width: "100%",
                  height: "100%",
                  transformOrigin: h.pivot_local
                    ? `${h.pivot_local[0]}px ${h.pivot_local[1]}px`
                    : "center",
                }}
              >
                <LayerImg base={strip(h.file)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The 3D halo + labels — screen space, parallaxed as one layer */}
      {mode === "webgl" && (
        <div ref={haloScreenRef} className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {crystals.map((c, i) => (
            <div
              key={c.symbol}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 font-ui text-[13px] font-semibold tracking-wide"
              style={{
                color: "#efe0bd",
                opacity: 0,
                textShadow: "0 1px 4px rgb(5 8 14), 0 0 12px rgb(5 8 14 / 0.8)",
              }}
              title={`${c.name} · ${c.crystalSystem}`}
            >
              {c.symbol}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
