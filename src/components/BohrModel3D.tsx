import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * BohrModel3D — a Three.js Bohr atom.
 *
 * Props:
 *  - electrons: comma-separated shell counts, e.g. "2,8,18,32,18,1" (Gold)
 *  - color:     hex string for the electron / shell colour
 *  - nucleusColor: hex string for the nucleus glow
 *  - label:     element symbol shown as a floating sprite (optional)
 */
interface BohrModel3DProps {
  electrons?: string;
  color?: string;
  nucleusColor?: string;
  label?: string;
  className?: string;
}

export function BohrModel3D({
  electrons = "2,8,18,32,18,1",
  color = "#a78bfa",
  nucleusColor = "#fbbf24",
  label = "Au",
  className = "",
}: BohrModel3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 480;
    const H = mount.clientHeight || 480;

    // ── Renderer ──────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene & camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 0, 14);

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.PointLight(0xffffff, 2, 60);
    keyLight.position.set(10, 10, 10);
    scene.add(keyLight);

    // ── Parse shells ──────────────────────────────────────────────────────────
    const shells = electrons.split(",").map(Number).filter(n => !isNaN(n) && n > 0);
    const shellCount = shells.length;

    // Shell radii — evenly spaced starting at 1.8, gap 1.5
    const shellRadii = shells.map((_, i) => 1.8 + i * 1.55);

    // ── Nucleus ───────────────────────────────────────────────────────────────
    const nucleusGeo  = new THREE.SphereGeometry(0.55, 32, 32);
    const nucleusMat  = new THREE.MeshPhongMaterial({
      color:    new THREE.Color(nucleusColor),
      emissive: new THREE.Color(nucleusColor),
      emissiveIntensity: 0.7,
      shininess: 80,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    scene.add(nucleus);

    // Nucleus glow halo (additive sprite-like shell)
    const halGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const halMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(nucleusColor),
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(halGeo, halMat));

    // Nucleus proton/neutron detail — small inner spheres
    const protonMat = new THREE.MeshPhongMaterial({ color: 0xff6b6b, emissive: 0x660000 });
    const neutronMat = new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x003366 });
    const particleGeo = new THREE.SphereGeometry(0.14, 12, 12);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 0.28;
      const p = new THREE.Mesh(particleGeo, i % 2 === 0 ? protonMat : neutronMat);
      p.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.5, (Math.random() - 0.5) * 0.3);
      scene.add(p);
    }

    // ── Shell rings ───────────────────────────────────────────────────────────
    const electronColor = new THREE.Color(color);
    const ringMat = new THREE.MeshBasicMaterial({
      color: electronColor,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });

    // Each shell tilted slightly differently so they don't all overlap
    const shellTilts = [
      new THREE.Euler(0, 0, 0),
      new THREE.Euler(Math.PI / 3, 0, Math.PI / 6),
      new THREE.Euler(Math.PI / 5, Math.PI / 4, 0),
      new THREE.Euler(-Math.PI / 4, Math.PI / 3, Math.PI / 5),
      new THREE.Euler(Math.PI / 6, -Math.PI / 5, Math.PI / 3),
      new THREE.Euler(-Math.PI / 3, Math.PI / 6, -Math.PI / 4),
      new THREE.Euler(Math.PI / 2, 0, Math.PI / 4),
    ];

    // Shell groups — each shell has its own pivot group for tilt
    const shellGroups: THREE.Group[] = [];

    for (let s = 0; s < shellCount; s++) {
      const r = shellRadii[s];
      const group = new THREE.Group();
      group.rotation.copy(shellTilts[s % shellTilts.length]);
      scene.add(group);
      shellGroups.push(group);

      // Torus ring
      const torusGeo = new THREE.TorusGeometry(r, 0.025, 8, 120);
      const torusMat = new THREE.MeshBasicMaterial({
        color: electronColor,
        transparent: true,
        opacity: 0.30 - s * 0.02,
      });
      group.add(new THREE.Mesh(torusGeo, torusMat));

      // Electrons on this shell
      const eCount = shells[s];
      for (let e = 0; e < eCount; e++) {
        const angle = (e / eCount) * Math.PI * 2;

        // Electron sphere
        const eGeo = new THREE.SphereGeometry(0.10, 10, 10);
        const eMat = new THREE.MeshPhongMaterial({
          color: electronColor,
          emissive: electronColor,
          emissiveIntensity: 0.9,
          shininess: 100,
        });
        const electron = new THREE.Mesh(eGeo, eMat);
        electron.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        // Store initial angle as userData
        electron.userData = { angle, radius: r, shell: s };
        group.add(electron);

        // Electron glow halo
        const eHaloGeo = new THREE.SphereGeometry(0.18, 10, 10);
        const eHaloMat = new THREE.MeshBasicMaterial({
          color: electronColor,
          transparent: true,
          opacity: 0.25,
        });
        const eHalo = new THREE.Mesh(eHaloGeo, eHaloMat);
        eHalo.position.copy(electron.position);
        eHalo.userData = { ...electron.userData, isHalo: true };
        group.add(eHalo);
      }
    }

    // ── Slow whole-model rotation group ───────────────────────────────────────
    // (we rotate the shell groups slightly for a lazy drift)

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth || W;
      const h = mount.clientHeight || H;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Animation ─────────────────────────────────────────────────────────────
    let frameId: number;
    let t = 0;

    // Per-shell rotation speeds — inner shells faster
    const shellSpeeds = shells.map((_, i) => 0.008 + (shellCount - i) * 0.004);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.01;

      // Nucleus pulse
      const pulse = 1 + Math.sin(t * 2) * 0.04;
      nucleus.scale.setScalar(pulse);
      nucleusMat.emissiveIntensity = 0.5 + Math.sin(t * 2.5) * 0.3;

      // Lazy global Y drift
      scene.rotation.y += 0.003;
      scene.rotation.x = Math.sin(t * 0.18) * 0.15;

      // Spin each shell at its own speed
      for (let s = 0; s < shellCount; s++) {
        shellGroups[s].rotation.z += shellSpeeds[s];
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      try {
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      } catch { /* ignore */ }
    };
  }, [electrons, color, nucleusColor, label]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: "420px" }}
    />
  );
}
