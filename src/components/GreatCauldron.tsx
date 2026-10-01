import { useEffect, useRef, useState } from "react";
import { Flame, Gift } from "lucide-react";
import { Cauldron, cauldronMood, localDayKey } from "./Cauldron";
import { addCauldronTaps, type StudentProfile } from "../lib/profile";

/**
 * The Great Cauldron — the Bench's tap toy, TikTok-streak flavoured.
 * Tap to stir; every 10 stirs ladle one measure of elixir into the pot.
 * The brew tops out at 1000 stirs — a full cauldron earns the Alchemist's
 * surprise. Its mood mirrors the Daily Starters streak: bubbling while the
 * streak lives, cracked when it lapses.
 */
const MAX_TAPS = 1000;
const FLUSH_EVERY = 10; // persist in ladles, not per tap

export function GreatCauldron({
  uid,
  profile,
}: {
  uid: string | null;
  profile: StudentProfile | null;
}) {
  // Local optimistic total: seeded from the profile once, then tap-driven —
  // flushes land in Firestore in batches of 10 so taps stay instant.
  const [total, setTotal] = useState<number | null>(null);
  const pending = useRef(0);
  useEffect(() => {
    if (total === null && profile) {
      setTotal(Math.min(MAX_TAPS, profile.cauldronTaps ?? 0));
    }
  }, [profile, total]);

  // Bank any unflushed stirs when the student leaves the Bench.
  const uidRef = useRef(uid);
  uidRef.current = uid;
  useEffect(
    () => () => {
      if (pending.current > 0) {
        void addCauldronTaps(uidRef.current, pending.current);
        pending.current = 0;
      }
    },
    [],
  );

  const shown = total ?? Math.min(MAX_TAPS, profile?.cauldronTaps ?? 0);
  const full = shown >= MAX_TAPS;
  // The level rises one visible step per 10 stirs — a ladle at a time.
  const fill = Math.floor(shown / FLUSH_EVERY) / (MAX_TAPS / FLUSH_EVERY);
  const mood = full ? "warm" : cauldronMood(profile?.starterStreak, localDayKey()).state;
  const streakCount = profile?.starterStreak?.count ?? 0;

  const [pop, setPop] = useState(0); // keys the little +1 float
  const stir = () => {
    if (full || total === null) return;
    const next = Math.min(MAX_TAPS, (total ?? 0) + 1);
    setTotal(next);
    setPop((p) => p + 1);
    pending.current += 1;
    if (pending.current >= FLUSH_EVERY || next >= MAX_TAPS) {
      void addCauldronTaps(uid, pending.current);
      pending.current = 0;
    }
  };

  return (
    <div className="glass relative flex items-center gap-4 rounded-2xl p-4 lg:w-72 lg:flex-shrink-0">
      <button
        onClick={stir}
        disabled={full}
        aria-label={full ? "The Great Cauldron is full" : "Stir the Great Cauldron"}
        className="relative flex-shrink-0 select-none rounded-full transition-transform duration-100 active:scale-90 disabled:cursor-default"
      >
        <Cauldron state={mood} size={84} fill={fill} />
        {pop > 0 && !full && (
          <span
            key={pop}
            className="animate-card-pop pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 font-ui text-xs font-bold text-emerald-elixir"
          >
            +1
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/55">The Great Cauldron</p>
        {full ? (
          <p className="mt-1 text-sm leading-snug text-spectral">
            <Gift className="mr-1 inline h-4 w-4 text-gold" />
            <span className="font-ui font-semibold text-gold">Full to the brim!</span>{" "}
            Send us your account details — the Alchemist has a surprise for you.
          </p>
        ) : (
          <>
            <p className="mt-0.5 font-ui text-sm font-semibold text-spectral">
              {shown.toLocaleString()} / {MAX_TAPS.toLocaleString()} stirs
            </p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ background: "color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(1, fill * 100)}%`,
                  background: "var(--color-emerald-elixir)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-parchment/60">
              Tap to stir — every 10 stirs ladles in more elixir.
              {streakCount > 0 && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-gold">
                  <Flame className="h-3 w-3" /> Day {streakCount}
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
