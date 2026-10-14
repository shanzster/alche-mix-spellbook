import { useEffect, useState, type ReactNode } from "react";

/**
 * A scripture-scroll modal: an ornate roller rod at each end of a parchment
 * body that UNROLLS open — horizontally on desktop, vertically on phones — with
 * a matching roll-up on close. Reduced-motion safe (opens instantly). Textures
 * live in public/Modal-Texture.
 */
const ROLLER = "/Modal-Texture/roller.png";
const PARCHMENT = "/Modal-Texture/parchment.jpg";
const ROLLER_ASPECT = 6.4; // rod height : width

export function ScriptureModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const reduce = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)[0];
  const vertical = useState(() => typeof window !== "undefined" && window.innerWidth < 768)[0];
  const [open, setOpen] = useState(reduce);

  const dims = useState(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    if (vertical) {
      const W = Math.min(vw * 0.94, 460);
      const H = Math.min(vh * 0.9, 780);
      const rod = Math.max(42, W / ROLLER_ASPECT);
      return { W, H, rod, main: H - rod * 2 }; // main = animated height
    }
    const H = Math.min(vh * 0.84, 680);
    const rod = Math.max(46, H / ROLLER_ASPECT);
    const W = Math.min(vw * 0.95, 960);
    return { W, H, rod, main: W - rod * 2 }; // main = animated width
  })[0];

  const close = () => {
    if (reduce) { onClose(); return; }
    setOpen(false);
    window.setTimeout(onClose, 500);
  };

  useEffect(() => {
    let raf = 0;
    if (!reduce) raf = requestAnimationFrame(() => setOpen(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ease = "cubic-bezier(.16,1,.3,1)";
  const revealTransition = reduce ? "none" : `${vertical ? "height" : "width"} 520ms ${ease}`;
  const reveal = open ? dims.main : 0;

  const rod = vertical ? (
    <div className="relative flex-shrink-0" style={{ width: dims.W, height: dims.rod }} aria-hidden>
      <img src={ROLLER} alt="" className="absolute left-1/2 top-1/2 w-auto max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 select-none" style={{ height: dims.W }} />
    </div>
  ) : (
    <img src={ROLLER} alt="" aria-hidden className="block w-auto max-w-none flex-shrink-0 select-none" style={{ height: dims.H }} />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={close}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()}
        className={`relative flex items-center ${vertical ? "flex-col" : "flex-row"}`}
        style={{ filter: "drop-shadow(0 34px 64px rgba(0,0,0,0.6))" }}>
        {rod}

        {/* Parchment body — reveals as it unrolls. */}
        <div className="relative overflow-hidden"
          style={vertical
            ? { width: dims.W, height: reveal, transition: revealTransition }
            : { height: dims.H, width: reveal, transition: revealTransition }}>
          <div className="absolute inset-0" style={{ backgroundImage: `url(${PARCHMENT})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 44px rgba(60,40,15,0.35)" }} />
          {/* Content at fixed size so it's revealed, not squished. */}
          <div className="relative overflow-y-auto"
            style={vertical ? { width: dims.W, height: dims.main } : { width: dims.main, height: dims.H }}>
            <div className="transition-opacity duration-300" style={{ opacity: open ? 1 : 0, transitionDelay: open && !reduce ? "200ms" : "0ms" }}>
              {children}
            </div>
          </div>
        </div>

        {rod}

        <button onClick={close} aria-label="Close"
          className="absolute -right-3 -top-3 z-10 h-12 w-12 transition hover:scale-110 active:scale-95">
          <img src="/ui/close-button.png" alt="" className="h-full w-full object-contain" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }} />
        </button>
      </div>
    </div>
  );
}
