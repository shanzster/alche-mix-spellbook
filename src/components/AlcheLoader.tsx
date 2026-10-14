/**
 * AlcheLoader — the app's loading state. A round-bottom flask drawn in gold
 * filigree, its teal elixir breathing while bubbles rise from the base. Replaces
 * the old `<FlaskConical className="animate-spin" />` spin on every gate/loader.
 *
 * On-brand per DESIGN_DIRECTION: gold = ornament, teal (`--emerald-elixir`) =
 * the arcane glow. All motion is paused under `prefers-reduced-motion`
 * (see `.alche-loader` rules in styles.css) — the flask just sits full.
 */
export function AlcheLoader({
  label = "Preparing…",
  className = "",
}: {
  label?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`bg-arcane min-h-screen flex flex-col items-center justify-center gap-5 text-parchment ${className}`}
      role="status"
      aria-live="polite"
    >
      <FlaskMark />
      {label ? (
        <p className="text-xs tracking-[0.3em] uppercase text-parchment/70">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}

/** The flask glyph on its own — reuse inside a shell that already has a bg. */
export function FlaskMark({ size = 72 }: { size?: number }) {
  return (
    <span className="alche-loader relative inline-flex" style={{ width: size, height: size }}>
      {/* soft teal halo that breathes behind the glass */}
      <span className="alche-loader-halo" aria-hidden />
      <svg
        viewBox="0 0 64 72"
        width={size}
        height={size}
        fill="none"
        aria-hidden
        className="relative"
      >
        <defs>
          {/* keep the elixir + bubbles inside the glass */}
          <clipPath id="alche-bulb">
            <path d="M24 30 A18 18 0 1 0 40 30 Z" />
          </clipPath>
        </defs>

        {/* elixir + bubbles, clipped to the bulb */}
        <g clipPath="url(#alche-bulb)">
          <rect
            className="alche-loader-fill"
            x="10"
            y="44"
            width="44"
            height="30"
            fill="var(--color-teal)"
            opacity="0.85"
          />
          <circle className="alche-bubble alche-bubble-1" cx="27" cy="58" r="2.2" fill="var(--color-parchment, #f6f3ec)" />
          <circle className="alche-bubble alche-bubble-2" cx="34" cy="58" r="1.6" fill="var(--color-parchment, #f6f3ec)" />
          <circle className="alche-bubble alche-bubble-3" cx="31" cy="58" r="1.2" fill="var(--color-parchment, #f6f3ec)" />
        </g>

        {/* glass outline in gold */}
        <g stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* neck */}
          <path d="M26 6 L26 28" />
          <path d="M38 6 L38 28" />
          {/* rim */}
          <path d="M23 6 L41 6" />
          {/* bulb — neck shoulders curving into a round bottom */}
          <path d="M26 28 A18 18 0 1 0 38 28" />
        </g>
      </svg>
    </span>
  );
}
