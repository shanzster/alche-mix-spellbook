import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Molecule } from "../lib/molecules";

// three.js (~550 KB) is heavy for a marketing page — load it only when the
// viewer scrolls near, so /learn and /schools stay light on first paint.
const Molecule3D = lazy(() => import("./Molecule3D").then((m) => ({ default: m.Molecule3D })));

export function LazyMolecule3D(props: { molecule: Molecule; bondLength?: number; className?: string; showLonePairs?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } },
      { rootMargin: "250px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {show && <Suspense fallback={null}><Molecule3D {...props} /></Suspense>}
    </div>
  );
}
