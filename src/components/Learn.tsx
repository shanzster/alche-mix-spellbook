import type { ReactNode } from "react";
import { ScrollText, Sparkles, Swords, Check } from "lucide-react";

/*
  The teaching layer, written in the alchemy world's voice — but the science
  inside stays plain and accurate. Fantasy framing + clear content = balance.

  One quiet card recipe throughout: flat low-alpha tinted surface, 1px border,
  no glows or gradients — the accent lives in the small icon + label only.
*/

function quietCard(accent: string) {
  return {
    background: `color-mix(in oklab, ${accent} 5%, color-mix(in oklab, var(--color-mist) 30%, transparent))`,
    border: `1px solid color-mix(in oklab, ${accent} 20%, transparent)`,
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
  };
}

/** A concept explainer, framed as a note from the alchemist. Topic stays visible. */
export function ConceptCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3" style={quietCard("var(--color-wraith)")}>
      <div className="flex items-center gap-2 mb-1 text-wraith">
        <ScrollText className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium">Alchemist's Note</span>
        <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/50">· {title}</span>
      </div>
      <div className="text-sm text-parchment leading-relaxed">{children}</div>
    </div>
  );
}

/** Real-world context, framed as knowledge that reaches beyond the Grimoire. */
export function DidYouKnow({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3" style={quietCard("var(--color-gold)")}>
      <div className="flex items-center gap-2 mb-1 text-gold">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium">In the Mortal World</span>
      </div>
      <div className="text-sm text-parchment leading-relaxed">{children}</div>
    </div>
  );
}

/** A guided challenge, framed as a trial — turns emerald when passed. */
export function ChallengeBanner({ prompt, solved, hint }: { prompt: ReactNode; solved: boolean; hint?: ReactNode }) {
  const color = solved ? "var(--color-emerald-elixir)" : "var(--color-gold)";
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3 transition-colors duration-300"
      style={quietCard(color)}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
      >
        {solved ? <Check className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.2em] uppercase font-ui font-medium mb-0.5" style={{ color }}>
          {solved ? "Trial passed" : "Trial"}
        </div>
        <div className="text-sm text-spectral leading-snug">{prompt}</div>
        {!solved && hint && <div className="text-xs text-parchment/60 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
