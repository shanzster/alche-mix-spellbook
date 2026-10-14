import { useState } from "react";
import { BASE_CARDS, combine, type Card, type MixResult } from "../lib/cards";

/**
 * A compact, REAL forge demo for the marketing pages — tap two base elements and
 * the actual `combine()` valence engine decides what forges (DESIGN_DIRECTION §7:
 * chemistry interactions stay real). Impossible mixes get the Alchemist's counsel.
 */
export function MiniForge({ className = "" }: { className?: string }) {
  const [a, setA] = useState<Card | null>(null);
  const [b, setB] = useState<Card | null>(null);
  const [result, setResult] = useState<MixResult | null>(null);

  const pick = (c: Card) => {
    if (a && b) { setA(c); setB(null); setResult(null); return; }
    if (!a) { setA(c); return; }
    if (c.symbol === a.symbol) return;
    setB(c);
    setResult(combine(a, c));
  };
  const reset = () => { setA(null); setB(null); setResult(null); };

  const Slot = ({ card }: { card: Card | null }) => (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg font-serif text-lg font-semibold"
      style={card
        ? { color: `color-mix(in oklab, ${card.color} 70%, var(--color-spectral))`, background: `color-mix(in oklab, ${card.color} 14%, var(--color-card))`, border: `1px solid color-mix(in oklab, ${card.color} 45%, transparent)` }
        : { color: "var(--color-parchment)", background: "color-mix(in oklab, var(--color-spectral) 5%, var(--color-card))", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
      {card?.symbol ?? "·"}
    </div>
  );

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* The altar line */}
      <div className="flex items-center justify-center gap-2.5">
        <Slot card={a} />
        <span className="font-display text-xl text-gold">+</span>
        <Slot card={b} />
        <span className="font-display text-xl text-gold">→</span>
        <div className="min-h-[3rem] min-w-[7rem] flex-1 rounded-lg px-3 py-2 text-center"
          style={{ background: "color-mix(in oklab, var(--color-spectral) 5%, var(--color-card))", border: "1px solid color-mix(in oklab, var(--color-gold) 25%, transparent)" }}>
          {result?.valid ? (
            <>
              <div className="font-serif text-lg font-semibold text-gold">{result.formula}</div>
              <div className="text-[11px] text-parchment">{result.name}</div>
            </>
          ) : result ? (
            <div className="flex h-full items-center justify-center text-[11px] italic leading-snug text-parchment/80">{result.reason}</div>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-parchment/50">Tap two elements</div>
          )}
        </div>
      </div>

      {/* The deck */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {BASE_CARDS.map((c) => {
          const chosen = a?.symbol === c.symbol || b?.symbol === c.symbol;
          return (
            <button key={c.symbol} onClick={() => pick(c)}
              className="h-8 w-8 rounded-md font-serif text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                color: `color-mix(in oklab, ${c.color} 72%, var(--color-spectral))`,
                background: `color-mix(in oklab, ${c.color} ${chosen ? 22 : 10}%, var(--color-card))`,
                border: `1px solid color-mix(in oklab, ${c.color} ${chosen ? 60 : 30}%, transparent)`,
              }}
              aria-label={`Pick ${c.name}`}>
              {c.symbol}
            </button>
          );
        })}
      </div>

      {(a || b) && (
        <button onClick={reset} className="self-center text-[11px] uppercase tracking-[0.15em] text-parchment/55 transition hover:text-spectral">
          Reset
        </button>
      )}
    </div>
  );
}
