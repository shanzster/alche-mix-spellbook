import { useEffect, useId, useState } from "react";
import { Check, Gift } from "lucide-react";
import { localDayKey } from "./Cauldron";
import { collectDailyDrop, type StudentProfile } from "../lib/profile";

/**
 * A module's daily drop vessel — the Great Cauldron's slower cousin.
 * Tap once a day and ONE drop falls into the glassware; it fills toward
 * 300 drops (so a full vessel is ~300 days of showing up). Tapping again
 * the same day just earns a gentle "come back tomorrow".
 *
 * Variants: "alembic" (a dropper over a conical flask — Molecule Shapes)
 * and "phial" (a round-bottom test tube — Atomic Builder).
 */
const MAX_DROPS = 300;

export function DropVessel({
  uid,
  profile,
  vesselId,
  variant,
  title,
  accent,
}: {
  uid: string | null;
  profile: StudentProfile | null;
  /** Storage key under profile.dropVessels, e.g. "molecules". */
  vesselId: string;
  variant: "alembic" | "phial";
  title: string;
  accent: string;
}) {
  const dayKey = localDayKey();
  // Optimistic local copy, seeded from the profile once.
  const [local, setLocal] = useState<{ drops: number; lastDay: string } | null>(null);
  useEffect(() => {
    if (local === null && profile) {
      const v = profile.dropVessels?.[vesselId];
      setLocal({ drops: Math.min(MAX_DROPS, v?.drops ?? 0), lastDay: v?.lastDay ?? "" });
    }
  }, [profile, local, vesselId]);

  const v = local ?? {
    drops: Math.min(MAX_DROPS, profile?.dropVessels?.[vesselId]?.drops ?? 0),
    lastDay: profile?.dropVessels?.[vesselId]?.lastDay ?? "",
  };
  const full = v.drops >= MAX_DROPS;
  const doneToday = v.lastDay === dayKey;
  const fill = v.drops / MAX_DROPS;

  const [dropAnim, setDropAnim] = useState(0); // keys the falling drop
  const [nudge, setNudge] = useState<string | null>(null);

  const tap = () => {
    if (full || local === null) return;
    if (doneToday) {
      setNudge("One drop a day — the glass condenses slowly. Return tomorrow.");
      window.setTimeout(() => setNudge(null), 3500);
      return;
    }
    const next = { drops: Math.min(MAX_DROPS, v.drops + 1), lastDay: dayKey };
    setLocal(next);
    setDropAnim((n) => n + 1);
    void collectDailyDrop(uid, vesselId, next.drops, dayKey);
  };

  return (
    <div className="glass relative flex items-center gap-4 rounded-2xl p-4">
      <button
        onClick={tap}
        disabled={full}
        aria-label={
          full ? `${title} is full`
          : doneToday ? `${title} — today's drop already collected`
          : `Collect today's drop into ${title}`
        }
        className="relative flex-shrink-0 select-none rounded-full transition-transform duration-100 active:scale-90 disabled:cursor-default"
      >
        {variant === "alembic" ? (
          <AlembicGlyph fill={fill} accent={accent} dropKey={dropAnim} />
        ) : (
          <PhialGlyph fill={fill} accent={accent} dropKey={dropAnim} />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/55">{title}</p>
        {full ? (
          <p className="mt-1 text-sm leading-snug text-spectral">
            <Gift className="mr-1 inline h-4 w-4 text-gold" />
            <span className="font-ui font-semibold text-gold">Full to the brim!</span>{" "}
            Send us your account details — the Alchemist has a surprise for you.
          </p>
        ) : (
          <>
            <p className="mt-0.5 font-ui text-sm font-semibold text-spectral">
              {v.drops} / {MAX_DROPS} drops
            </p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ background: "color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1, fill * 100)}%`, background: accent }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-parchment/60">
              {nudge ? (
                nudge
              ) : doneToday ? (
                <span className="inline-flex items-center gap-1" style={{ color: accent }}>
                  <Check className="h-3 w-3" /> Today's drop collected — back tomorrow.
                </span>
              ) : (
                "Tap for today's drop — one a day, every day."
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Glassware ────────────────────────────────────────────────────────────────
/** A falling drop, replayed whenever `dropKey` changes. */
function FallingDrop({ dropKey, x, fromY, toY, accent }: {
  dropKey: number; x: number; fromY: number; toY: number; accent: string;
}) {
  if (dropKey === 0) return null;
  return (
    <circle key={dropKey} cx={x} cy={fromY} r="2.6" fill={accent}>
      <animate attributeName="cy" from={fromY} to={toY} dur="0.45s" fill="freeze" />
      <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.8;1" dur="0.6s" fill="freeze" />
    </circle>
  );
}

/** Dropper over a conical flask — the Molecule Shapes vessel. */
function AlembicGlyph({ fill, accent, dropKey }: { fill: number; accent: string; dropKey: number }) {
  const clipId = useId();
  const glass = "color-mix(in oklab, var(--color-parchment) 50%, transparent)";
  // Flask interior: neck y 30…44, cone widening to the base at y 80.
  const surfaceY = 78 - fill * 40; // 78 (empty) … 38 (brim)
  return (
    <svg viewBox="0 0 96 96" width={84} height={84} role="img" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d="M43 30 L43 46 L27 76 Q25 80 30 80 L66 80 Q71 80 69 76 L53 46 L53 30 Z" />
        </clipPath>
      </defs>
      {/* Dropper */}
      <path d="M44 6 L52 6 L50 12 L46 12 Z" fill={glass} />
      <path d="M46 12 L50 12 L48 20 Z" fill={glass} />
      <FallingDrop dropKey={dropKey} x={48} fromY={22} toY={surfaceY} accent={accent} />
      {/* Liquid */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="20" y={surfaceY} width="56" height={82 - surfaceY} fill={accent} opacity="0.55" />
        <ellipse cx="48" cy={surfaceY} rx={10 + (78 - surfaceY) * 0.38} ry="2.8" fill={accent} opacity="0.85" />
      </g>
      {/* Flask outline */}
      <path
        d="M43 30 L43 46 L27 76 Q25 80 30 80 L66 80 Q71 80 69 76 L53 46 L53 30"
        fill="none" stroke={glass} strokeWidth="2.5" strokeLinecap="round"
      />
      <line x1="40" y1="30" x2="56" y2="30" stroke={glass} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A round-bottom phial (test tube in a stand) — the Atomic Builder vessel. */
function PhialGlyph({ fill, accent, dropKey }: { fill: number; accent: string; dropKey: number }) {
  const clipId = useId();
  const glass = "color-mix(in oklab, var(--color-parchment) 50%, transparent)";
  // Tube interior: x 40…56, y 18 down to the rounded bottom at 80.
  const surfaceY = 76 - fill * 50; // 76 (empty) … 26 (brim)
  return (
    <svg viewBox="0 0 96 96" width={84} height={84} role="img" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d="M40 18 L40 72 Q40 80 48 80 Q56 80 56 72 L56 18 Z" />
        </clipPath>
      </defs>
      <FallingDrop dropKey={dropKey} x={48} fromY={14} toY={surfaceY} accent={accent} />
      {/* Liquid */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="38" y={surfaceY} width="20" height={84 - surfaceY} fill={accent} opacity="0.55" />
        <ellipse cx="48" cy={surfaceY} rx="8" ry="2.4" fill={accent} opacity="0.85" />
      </g>
      {/* Tube outline + rim */}
      <path
        d="M40 18 L40 72 Q40 80 48 80 Q56 80 56 72 L56 18"
        fill="none" stroke={glass} strokeWidth="2.5" strokeLinecap="round"
      />
      <line x1="37" y1="18" x2="59" y2="18" stroke={glass} strokeWidth="3" strokeLinecap="round" />
      {/* Stand */}
      <path d="M34 86 L62 86 M48 80 L48 86" stroke={glass} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
