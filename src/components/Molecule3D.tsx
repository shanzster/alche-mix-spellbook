import { useEffect, useRef } from "react";
import * as THREE from "three";
import { elementStyle, type Molecule } from "../lib/molecules";

/**
 * Renders a molecule's real VSEPR geometry in 3D: central atom + ligands as
 * CPK-coloured spheres, bonds as cylinders (double/triple shown as parallel
 * rods), and lone pairs as translucent lobes. Drag to spin; gently auto-rotates.
 */
export function Molecule3D({
  molecule, bondLength = 2.2, className = "", showLonePairs = true,
}: {
  molecule: Molecule; bondLength?: number; className?: string; showLonePairs?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 460;
    const H = mount.clientHeight || 460;

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
    camera.position.set(0, 0, 11);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.PointLight(0xffffff, 2.4, 60);
    key.position.set(6, 8, 10);
    scene.add(key);
    const rim = new THREE.PointLight(0x88aaff, 1.1, 40);
    rim.position.set(-8, -4, 4);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // ── Atom sphere factory ──
    const atom = (el: string, at: THREE.Vector3, scale = 1) => {
      const s = elementStyle(el);
      const c = new THREE.Color(s.color);
      const geo = new THREE.SphereGeometry(s.radius * scale, 40, 40);
      const mat = new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 0.18, shininess: 90 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(at);
      root.add(mesh);
    };

    // ── Bond cylinder (supports order 1/2/3 as parallel rods) ──
    const yAxis = new THREE.Vector3(0, 1, 0);
    const addBond = (from: THREE.Vector3, to: THREE.Vector3, order: number) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
      // perpendicular for spacing multiple rods
      const perp = new THREE.Vector3(1, 0, 0).cross(dir).normalize();
      if (perp.lengthSq() < 0.01) perp.set(0, 0, 1);
      const gap = 0.16;
      const offsets = order === 1 ? [0] : order === 2 ? [-gap, gap] : [-gap * 1.6, 0, gap * 1.6];
      for (const off of offsets) {
        const geo = new THREE.CylinderGeometry(0.09, 0.09, len, 20, 1, true);
        const mat = new THREE.MeshPhongMaterial({ color: 0xcfd6e4, emissive: 0x2a3550, emissiveIntensity: 0.3, shininess: 70 });
        const rod = new THREE.Mesh(geo, mat);
        rod.quaternion.copy(quat);
        rod.position.copy(from).add(to).multiplyScalar(0.5).add(perp.clone().multiplyScalar(off));
        root.add(rod);
      }
    };

    // ── Build the molecule ──
    const centre = new THREE.Vector3(0, 0, 0);
    atom(molecule.central, centre, 1.15);
    for (const b of molecule.bonds) {
      const p = new THREE.Vector3(...b.pos).multiplyScalar(bondLength);
      addBond(centre, p, b.order);
      atom(b.el, p);
    }

    // ── Lone pairs — soft translucent lobes ──
    if (showLonePairs) {
      for (const lp of molecule.lonePairs) {
        const p = new THREE.Vector3(...lp).multiplyScalar(bondLength * 0.62);
        const geo = new THREE.SphereGeometry(0.34, 20, 20);
        const mat = new THREE.MeshBasicMaterial({ color: 0x9b8cff, transparent: true, opacity: 0.28 });
        const lobe = new THREE.Mesh(geo, mat);
        lobe.position.copy(p);
        lobe.scale.set(1, 1, 0.55);
        root.add(lobe);
      }
    }

    // Frame the molecule nicely.
    root.rotation.x = 0.35;

    // ── Drag to spin ──
    let dragging = false, lastX = 0, lastY = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.style.cursor = "grabbing"; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      root.rotation.y += (e.clientX - lastX) * 0.01;
      root.rotation.x = Math.max(-1.4, Math.min(1.4, root.rotation.x + (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
    };
    const up = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    renderer.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    const onResize = () => {
      const w = mount.clientWidth || W, h = mount.clientHeight || H;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!dragging) root.rotation.y += 0.004;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      try {
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      } catch { /* ignore */ }
    };
  }, [molecule, bondLength, showLonePairs]);

  return <div ref={mountRef} className={`w-full h-full ${className}`} style={{ minHeight: "360px" }} />;
}
