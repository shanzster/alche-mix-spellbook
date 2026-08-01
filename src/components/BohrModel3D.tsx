import { useEffect, useRef } from "react";
import * as THREE from "three";

interface BohrModel3DProps {
  electrons?: string;
  color?: string;
  nucleusColor?: string;
  label?: string;
  className?: string;
  /** When true, the user can drag to spin the atom (grab cursor + pointer control). */
  interactive?: boolean;
  /** When true, the atom continuously tumbles on all three axes (as if being spun). */
  tumble?: boolean;
}

// Deterministic tilts spread evenly across 3D space for up to 7 shells.
// Each triplet is [rotX, rotY, rotZ] in radians.
const SHELL_AXES: [number, number, number][] = [
  [0,            0,           0           ],   // shell 1 — equatorial
  [Math.PI / 2,  0,           0           ],   // shell 2 — polar
  [Math.PI / 4,  Math.PI / 4, 0           ],   // shell 3 — diagonal XY
  [0,            Math.PI / 2, Math.PI / 4 ],   // shell 4 — diagonal YZ
  [Math.PI / 3,  0,           Math.PI / 2 ],   // shell 5 — diagonal XZ
  [-Math.PI / 4, Math.PI / 3, Math.PI / 6],   // shell 6
  [Math.PI / 6,  -Math.PI/3,  -Math.PI/4 ],   // shell 7
];

export function BohrModel3D({
  electrons  = "2,8,18,32,18,1",
  color      = "#a78bfa",
  nucleusColor = "#fbbf24",
  label      = "Au",
  className  = "",
  interactive = false,
  tumble = false,
}: BohrModel3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 480;
    const H = mount.clientHeight || 480;

    // ── Renderer ────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch { return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Drag-to-spin (opt-in) ────────────────────────────────────────────────
    let dragging = false;
    let lastX = 0, lastY = 0;
    if (interactive) {
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.style.touchAction = "none";
    }
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      scene.rotation.y += dx * 0.01;
      scene.rotation.x = Math.max(-1.2, Math.min(1.2, scene.rotation.x + dy * 0.01));
    };
    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      if (interactive) renderer.domElement.style.cursor = "grab";
    };
    if (interactive) {
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }

    // ── Scene & camera ───────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 200);
    camera.position.set(0, 0, 15);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.PointLight(0xffffff, 2.5, 80);
    sun.position.set(8, 8, 12);
    scene.add(sun);

    // Nucleus-colored fill light
    const fill = new THREE.PointLight(new THREE.Color(nucleusColor), 1.8, 25);
    fill.position.set(0, 0, 0);
    scene.add(fill);

    // ── Parse shells ─────────────────────────────────────────────────────────
    const shells     = electrons.split(",").map(Number).filter(n => !isNaN(n) && n > 0);
    const shellCount = shells.length;
    const shellRadii = shells.map((_, i) => 1.9 + i * 1.5);

    // ── Nucleus ──────────────────────────────────────────────────────────────
    const nc = new THREE.Color(nucleusColor);
    const ec = new THREE.Color(color);

    const nucGeo = new THREE.SphereGeometry(0.52, 48, 48);
    const nucMat = new THREE.MeshPhongMaterial({
      color:   nc,
      emissive: nc,
      emissiveIntensity: 0.65,
      shininess: 120,
    });
    const nucleus = new THREE.Mesh(nucGeo, nucMat);
    scene.add(nucleus);

    // Outer glow shell
    const glowGeo = new THREE.SphereGeometry(0.9, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: nc, transparent: true, opacity: 0.15, side: THREE.BackSide });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // Inner protons/neutrons
    const pMat = new THREE.MeshPhongMaterial({ color: 0xff6060, emissive: 0x550000, shininess: 80 });
    const nMat = new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x001144, shininess: 80 });
    const pGeo = new THREE.SphereGeometry(0.13, 12, 12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.Mesh(pGeo, i % 2 === 0 ? pMat : nMat);
      p.position.set(
        Math.cos(a) * 0.26,
        Math.sin(a) * 0.26 * 0.6,
        (i % 3 - 1) * 0.15,
      );
      scene.add(p);
    }

    // ── Shells ───────────────────────────────────────────────────────────────
    // Each shell: tilt group (fixed) → spin pivot (animated) → ring + electrons
    const spinPivots: THREE.Group[] = [];

    for (let s = 0; s < shellCount; s++) {
      const r     = shellRadii[s];
      const [rx, ry, rz] = SHELL_AXES[s % SHELL_AXES.length];

      // Tilt group — stays fixed, determines the orbital plane orientation
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.set(rx, ry, rz);
      scene.add(tiltGroup);

      // Spin pivot — this is what rotates during animation
      const spin = new THREE.Group();
      tiltGroup.add(spin);
      spinPivots.push(spin);

      // ── Torus ring ────────────────────────────────────────────────────────
      // Thicker tube + double-sided for that 3D ring look
      const tubeR  = 0.035 + s * 0.005; // outer shells slightly thicker
      const torusGeo = new THREE.TorusGeometry(r, tubeR, 20, 160);
      const torusMat = new THREE.MeshPhongMaterial({
        color:   ec,
        emissive: ec,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: Math.max(0.12, 0.45 - s * 0.05),
        shininess: 60,
        side: THREE.DoubleSide,
      });
      // Torus lives in tiltGroup (not spin pivot) — the ring itself doesn't spin,
      // only the electrons travel along it. This sells the 3D ring illusion.
      tiltGroup.add(new THREE.Mesh(torusGeo, torusMat));

      // ── Electrons ─────────────────────────────────────────────────────────
      const eCount = Math.min(shells[s], 18); // cap display at 18 for perf
      for (let e = 0; e < eCount; e++) {
        const baseAngle = (e / eCount) * Math.PI * 2;

        // Pivot per electron — offset by base angle, then animate spin
        const ePivot = new THREE.Group();
        ePivot.rotation.z = baseAngle;
        spin.add(ePivot);

        // Electron sphere — placed at (r, 0, 0) in local pivot space
        const eGeo = new THREE.SphereGeometry(0.10, 14, 14);
        const eMat = new THREE.MeshPhongMaterial({
          color:   ec,
          emissive: ec,
          emissiveIntensity: 1.1,
          shininess: 120,
        });
        const electron = new THREE.Mesh(eGeo, eMat);
        electron.position.set(r, 0, 0);
        ePivot.add(electron);

        // Glow halo around electron
        const hGeo = new THREE.SphereGeometry(0.19, 10, 10);
        const hMat = new THREE.MeshBasicMaterial({ color: ec, transparent: true, opacity: 0.22 });
        const halo = new THREE.Mesh(hGeo, hMat);
        halo.position.set(r, 0, 0);
        ePivot.add(halo);
      }
    }

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth || W;
      const h = mount.clientHeight || H;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Animation ─────────────────────────────────────────────────────────────
    // Inner shells faster, outer slower
    const speeds = shells.map((_, i) => 0.018 + (shellCount - i) * 0.007);
    let frameId: number;
    let t = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.01;

      // Nucleus pulse
      nucleus.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04);
      nucMat.emissiveIntensity = 0.45 + Math.sin(t * 2.5) * 0.3;
      fill.intensity = 1.4 + Math.sin(t * 2.5) * 0.6;

      // Global rotation. While the user is dragging, hand control to their pointer.
      if (!dragging) {
        if (tumble) {
          // Continuous 3-axis tumble — as if someone is spinning it by hand.
          scene.rotation.y += 0.009;
          scene.rotation.x += 0.005;
          scene.rotation.z += 0.0025;
        } else {
          // Gentle single-axis drift with a slight idle wobble.
          scene.rotation.y += 0.0035;
          const idleX = Math.sin(t * 0.15) * 0.2;
          scene.rotation.x += (idleX - scene.rotation.x) * 0.04;
        }
      }

      // Spin the electron pivots around their orbital plane
      for (let s = 0; s < shellCount; s++) {
        spinPivots[s].rotation.z += speeds[s];
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      try {
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      } catch { /* ignore */ }
    };
  }, [electrons, color, nucleusColor, label, interactive, tumble]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: "420px" }}
    />
  );
}
