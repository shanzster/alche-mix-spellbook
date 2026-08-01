import type { ReactNode } from "react";
import { ScrollText, Sparkles, Swords, Check } from "lucide-react";

/*
  The teaching layer, written in the alchemy world's voice — but the science
  inside stays plain and accurate. Fantasy framing + clear content = balance.
*/

/** A concept explainer, framed as a note from the alchemist. Topic stays visible. */
export function ConceptCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-r-lg pl-4 pr-3 py-3" style={{ borderLeft: "3px solid color-mix(in oklab, var(--color-wraith) 60%, transparent)", background: "color-mix(in oklab, var(--color-wraith) 7%, transparent)" }}>
      <div className="flex items-center gap-2 mb-1 text-wraith">
        <ScrollText className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-display">Alchemist's Note</span>
        <span className="text-[10px] tracking-[0.15em] uppercase text-parchment/50">· {title}</span>
      </div>
      <div className="text-sm text-parchment leading-relaxed">{children}</div>
    </div>
  );
}

/** Real-world context, framed as knowledge that reaches beyond the Grimoire. */
export function DidYouKnow({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-r-lg pl-4 pr-3 py-3" style={{ borderLeft: "3px solid color-mix(in oklab, var(--color-gold) 60%, transparent)", background: "color-mix(in oklab, var(--color-gold) 7%, transparent)" }}>
      <div className="flex items-center gap-2 mb-1 text-gold">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-display">In the Mortal World</span>
      </div>
      <div className="text-sm text-parchment leading-relaxed">{children}</div>
    </div>
  );
}

/** A guided challenge, framed as a trial — glows to life when passed. */
export function ChallengeBanner({ prompt, solved, hint }: { prompt: ReactNode; solved: boolean; hint?: ReactNode }) {
  const color = solved ? "var(--color-emerald-elixir)" : "var(--color-gold)";
  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3 transition-all duration-300"
      style={{
        background: `color-mix(in oklab, ${color} ${solved ? 14 : 10}%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} ${solved ? 50 : 35}%, transparent)`,
        boxShadow: solved ? `0 0 26px -10px ${color}` : "none",
      }}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${solved ? "animate-breathing" : ""}`}
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        {solved ? <Check className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] tracking-[0.2em] uppercase font-display mb-0.5" style={{ color }}>
          {solved ? "✦ Trial passed" : "Trial"}
        </div>
        <div className="text-sm text-spectral leading-snug">{prompt}</div>
        {!solved && hint && <div className="text-xs text-parchment/60 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
