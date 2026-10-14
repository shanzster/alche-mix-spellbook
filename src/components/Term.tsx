import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { lexiconById } from "../lib/lexicon";

/**
 * A chemistry term with a Wikipedia-STYLE hover preview (adviser item 15) —
 * but sourced from the in-house Lexicon pages, never Wikipedia. Hover (or
 * focus) shows the short preview; clicking opens the full page with its
 * named reference.
 */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const entry = lexiconById(id);
  const [open, setOpen] = useState(false);
  if (!entry) return <>{children ?? id}</>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        to="/lexicon"
        search={{ term: id }}
        className="underline decoration-dotted underline-offset-2 transition-colors"
        style={{
          color: "var(--color-emerald-elixir)",
          textDecorationColor: "color-mix(in oklab, var(--color-emerald-elixir) 55%, transparent)",
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children ?? entry.term}
      </Link>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 block w-72 -translate-x-1/2 rounded-xl p-3.5 text-left"
          style={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 16px 40px -16px rgb(0 0 0 / 0.5)",
          }}
        >
          <span className="block font-ui text-sm font-semibold text-spectral">{entry.term}</span>
          <span className="mt-1 block text-xs font-normal leading-relaxed text-parchment normal-case tracking-normal">{entry.preview}</span>
          <span className="mt-2 block text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--color-emerald-elixir)" }}>
            Open the full page →
          </span>
        </span>
      )}
    </span>
  );
}
