import { useId } from "react";
import type { StudentProfile } from "../lib/profile";

/**
 * The streak's mascot, shared by Daily Starters and the Bench's Great
 * Cauldron. Warm: bubbling over a flame. Cold: unlit, waiting. Broken:
 * cracked and dim — the look of a lapsed streak.
 *
 * `fill` (0..1) draws the elixir level inside the pot — the Great Cauldron
 * rises as it is stirred. Omit it for the classic brim-full look.
 */
export type CauldronState = "warm" | "cold" | "broken";

/** Local date as YYYY-MM-DD — the streak day-key. */
export function localDayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const MEND_WINDOW_MS = 7 * 24 * 3600 * 1000;

/** The cauldron's mood for a Daily Starters streak (warm / cold / broken). */
export function cauldronMood(
  prev: StudentProfile["starterStreak"],
  dayKey: string,
): { state: CauldronState; lostStreak: number; mendable: boolean } {
  if (!prev || prev.count === 0) return { state: "cold", lostStreak: 0, mendable: false };
  if (prev.lastDay === dayKey) return { state: "warm", lostStreak: 0, mendable: false };
  const ms = Date.parse(dayKey) - Date.parse(prev.lastDay);
  if (ms <= 36 * 3600 * 1000) return { state: "warm", lostStreak: 0, mendable: false };
  // A 1-day streak isn't worth a trial — and a week-old break is too cold.
  return {
    state: "broken",
    lostStreak: prev.count,
    mendable: prev.count >= 2 && ms <= MEND_WINDOW_MS,
  };
}

export function Cauldron({
  state,
  size = 96,
  fill,
}: {
  state: CauldronState;
  size?: number;
  /** Elixir level 0..1; undefined = classic brim-full brew. */
  fill?: number;
}) {
  const clipId = useId();
  const body =
    state === "broken"
      ? "color-mix(in oklab, var(--color-parchment) 28%, var(--color-slate-sunken))"
      : "color-mix(in oklab, var(--color-parchment) 18%, var(--color-slate-sunken))";
  const brew =
    state === "warm"
      ? "var(--color-emerald-elixir)"
      : "color-mix(in oklab, var(--color-parchment) 30%, transparent)";

  // Pot interior spans y ≈ 42 (rim) … 70 (floor); the elixir surface sits
  // proportionally between them, and the pot narrows toward the floor.
  const leveled = fill !== undefined;
  const f = Math.max(0, Math.min(1, fill ?? 1));
  const surfaceY = leveled ? 70 - 28 * f : 40;
  const surfaceRx = leveled ? 25 - 8 * ((surfaceY - 40) / 30) : 25;

  return (
    <div
      className={state === "warm" ? "animate-breathing" : undefined}
      style={{ width: size, height: size, opacity: state === "broken" ? 0.85 : 1 }}
      role="img"
      aria-label={
        state === "warm" ? "A warm, bubbling cauldron"
        : state === "broken" ? "A cracked, cold cauldron"
        : "An unlit cauldron"
      }
    >
      <svg viewBox="0 0 96 96" width={size} height={size}>
        <defs>
          {/* The pot's interior — the elixir is clipped to it. */}
          <clipPath id={clipId}>
            <path d="M23 40 Q23 66 36 72 L60 72 Q73 66 73 40 Z" />
          </clipPath>
        </defs>
        {/* Flame (warm only) */}
        {state === "warm" && (
          <g>
            <path
              d="M40 86 Q48 74 44 68 Q54 72 52 80 Q58 76 56 70 Q64 78 56 86 Z"
              fill="var(--color-gold)"
              opacity="0.9"
            >
              <animate attributeName="opacity" values="0.9;0.55;0.9" dur="1.6s" repeatCount="indefinite" />
            </path>
          </g>
        )}
        {/* Bubbles (warm only) — rising off the brew's surface */}
        {state === "warm" &&
          [
            { cx: 38, d: "2.2s", delay: "0s" },
            { cx: 50, d: "1.8s", delay: "0.5s" },
            { cx: 60, d: "2.6s", delay: "1s" },
          ].map((b, i) => (
            <circle key={i} cx={b.cx} cy={surfaceY - 4} r="3" fill={brew} opacity="0.8">
              <animate
                attributeName="cy"
                values={`${surfaceY - 2};${Math.max(16, surfaceY - 16)}`}
                dur={b.d}
                begin={b.delay}
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.8;0" dur={b.d} begin={b.delay} repeatCount="indefinite" />
            </circle>
          ))}
        {/* Pot body */}
        <path
          d="M23 40 Q23 66 36 72 L60 72 Q73 66 73 40 Z"
          fill={body}
          stroke="color-mix(in oklab, var(--color-parchment) 45%, transparent)"
          strokeWidth="2"
        />
        {/* Elixir inside the pot (level mode) */}
        {leveled && f > 0.02 && (
          <g clipPath={`url(#${clipId})`}>
            <rect x="20" y={surfaceY} width="56" height={72 - surfaceY} fill={brew} opacity={state === "warm" ? 0.75 : 0.45} />
          </g>
        )}
        {/* Brew surface */}
        {(!leveled || f > 0.02) && (
          <ellipse
            cx="48"
            cy={surfaceY}
            rx={surfaceRx}
            ry={leveled ? 4.5 : 6}
            fill={brew}
            opacity={state === "warm" ? 0.9 : 0.5}
          />
        )}
        {/* Rim */}
        <ellipse
          cx="48" cy="40" rx="27" ry="7.5"
          fill="none"
          stroke="color-mix(in oklab, var(--color-parchment) 55%, transparent)"
          strokeWidth="3"
        />
        {/* Legs */}
        <path d="M34 72 L30 82 M62 72 L66 82" stroke={body} strokeWidth="4" strokeLinecap="round" />
        {/* Crack + escaped drip (broken only) */}
        {state === "broken" && (
          <g stroke="var(--color-crimson)" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M44 46 L50 54 L45 60 L51 68" opacity="0.9" />
            <path d="M51 68 Q52 74 50 78" opacity="0.5" strokeDasharray="2 3" />
          </g>
        )}
      </svg>
    </div>
  );
}
