import { useRef } from "react";

/**
 * A rotary hand-wheel control — the apparatus answer to a slider. Drag the
 * wheel (or use arrow keys) to turn it through 270° of travel between `min`
 * and `max`. Used for the burner valve in Equilibrium; generic enough for
 * any "turn the wheel" control (gas taps, piston cranks, hot plates …).
 */
export function ValveWheel({
  value,
  min,
  max,
  step = 1,
  onChange,
  size = 116,
  color = "var(--color-gold)",
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  size?: number;
  color?: string;
  /** Accessible name, e.g. "Burner valve — flask temperature in kelvin". */
  label: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const SWEEP = 270; // degrees of travel: -135° (closed) … +135° (wide open)
  const frac = (value - min) / (max - min);
  const angle = -SWEEP / 2 + frac * SWEEP;

  // Angles measured from 12 o'clock, clockwise positive.
  const polar = (r: number, deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)];
  };
  const arc = (r: number, a0: number, a1: number): string => {
    const [x0, y0] = polar(r, a0);
    const [x1, y1] = polar(r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  const setFromPoint = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    deg = Math.max(-SWEEP / 2, Math.min(SWEEP / 2, deg));
    const raw = min + ((deg + SWEEP / 2) / SWEEP) * (max - min);
    const stepped = Math.max(min, Math.min(max, Math.round(raw / step) * step));
    if (stepped !== value) onChange(stepped);
  };

  const dragging = useRef(false);
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromPoint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging.current) setFromPoint(e.clientX, e.clientY);
  };
  const endDrag = () => { dragging.current = false; };

  const nudge = (delta: number) =>
    onChange(Math.max(min, Math.min(max, value + delta)));
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const big = step * 10;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); nudge(step); }
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); nudge(-step); }
    else if (e.key === "PageUp") { e.preventDefault(); nudge(big); }
    else if (e.key === "PageDown") { e.preventDefault(); nudge(-big); }
    else if (e.key === "Home") { e.preventDefault(); onChange(min); }
    else if (e.key === "End") { e.preventDefault(); onChange(max); }
  };

  const track = "color-mix(in oklab, var(--color-parchment) 22%, transparent)";
  const metal = "color-mix(in oklab, var(--color-parchment) 55%, transparent)";

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="cursor-grab touch-none select-none rounded-full outline-none focus-visible:ring-2"
      style={{ ["--tw-ring-color" as string]: color }}
    >
      {/* Travel track + how far the valve is open */}
      <path d={arc(46, -SWEEP / 2, SWEEP / 2)} fill="none" stroke={track} strokeWidth="3" strokeLinecap="round" />
      <path d={arc(46, -SWEEP / 2, angle)} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      {/* End stops */}
      {[-SWEEP / 2, SWEEP / 2].map((a) => {
        const [x, y] = polar(41, a);
        return <circle key={a} cx={x} cy={y} r="1.6" fill={track} />;
      })}

      {/* The hand-wheel itself — rotates with the value */}
      <g transform={`rotate(${angle} 50 50)`}>
        <circle cx="50" cy="50" r="34" fill="color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)" stroke={metal} strokeWidth="4" />
        {[0, 60, 120].map((a) => (
          <line
            key={a}
            x1={polar(31, a)[0]} y1={polar(31, a)[1]}
            x2={polar(31, a + 180)[0]} y2={polar(31, a + 180)[1]}
            stroke={metal} strokeWidth="4" strokeLinecap="round"
          />
        ))}
        <circle cx="50" cy="50" r="9" fill={metal} />
        {/* Pointer notch at the wheel's 12 o'clock */}
        <circle cx="50" cy="19.5" r="3.4" fill={color} />
      </g>
    </svg>
  );
}
