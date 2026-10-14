/**
 * ArcaneField — a premium animated background of large gradient orbs that orbit
 * in slow circles behind the app's frosted glass (the "circular moving gradient"
 * look). Self-contained: no external library, pure CSS motion (see
 * `.arcane-field` / `@keyframes arcane-spin` in styles.css), token-based colours
 * so it works in both themes, and frozen under `prefers-reduced-motion`.
 *
 * Each orb sits on a zero-size pivot at screen centre; the pivot rotates and the
 * orb is offset by `radius`, so it traces a circle. Different durations/
 * directions keep the blobs drifting out of sync for an organic, living wash.
 */
interface Orb {
  color: string;
  /** Diameter in px. */
  size: number;
  /** Orbit radius in px from screen centre. */
  radius: number;
  /** Seconds per revolution. */
  dur: number;
  /** Rotation direction. */
  dir: 1 | -1;
  /** color-mix weight (%) — how saturated the orb's core is. */
  mix: number;
}

const ORBS: Orb[] = [
  { color: "var(--color-emerald-elixir)", size: 560, radius: 230, dur: 40, dir: 1, mix: 26 },
  { color: "var(--color-wraith)", size: 680, radius: 310, dur: 58, dir: -1, mix: 24 },
  { color: "var(--color-gold)", size: 460, radius: 160, dur: 48, dir: 1, mix: 22 },
];

export function ArcaneField({ className }: { className?: string }) {
  return (
    <div className={`arcane-field ${className ?? ""}`} aria-hidden>
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="arcane-orbit"
          style={{ animation: `arcane-spin ${o.dur}s linear infinite ${o.dir < 0 ? "reverse" : ""}` }}
        >
          <span
            className="arcane-orb"
            style={{
              width: o.size,
              height: o.size,
              left: o.radius,
              background: `radial-gradient(circle, color-mix(in oklab, ${o.color} ${o.mix}%, transparent), transparent 70%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
