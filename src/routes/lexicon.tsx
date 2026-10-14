import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LEXICON, GLOSSARY, lexiconById } from "../lib/lexicon";

/**
 * The Lexicon — in-house reference pages for the chemistry terms used across
 * the platform (adviser item 15: students stay INSIDE the platform for
 * in-depth reading, every page names a reliable source — not Wikipedia),
 * plus the glossary of AlcheMix's own invented vocabulary (item 16).
 *
 * The index is a browsable dictionary — two tabs (chemistry terms vs the
 * invented words), live search, and an A–Z filter — so it never reads as one
 * long scroll.
 */

interface LexiconSearch {
  term?: string;
}

export const Route = createFileRoute("/lexicon")({
  validateSearch: (search: Record<string, unknown>): LexiconSearch =>
    typeof search.term === "string" && search.term.length > 0 ? { term: search.term } : {},
  component: LexiconPage,
});

type Tab = "terms" | "grimoire";

function LexiconIndex() {
  const [tab, setTab] = useState<Tab>("terms");
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  // Letters available in the active tab (so dead letters are disabled).
  const letters = useMemo(() => {
    const src = tab === "terms" ? LEXICON.map((e) => e.term) : GLOSSARY.map((g) => g.word);
    return new Set(src.map((s) => s[0].toUpperCase()));
  }, [tab]);

  const terms = useMemo(() => LEXICON.filter((e) =>
    (!q || e.term.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q)) &&
    (!letter || e.term[0].toUpperCase() === letter)), [q, letter]);

  const words = useMemo(() => GLOSSARY.filter((g) =>
    (!q || g.word.toLowerCase().includes(q) || g.meaning.toLowerCase().includes(q)) &&
    (!letter || g.word[0].toUpperCase() === letter)), [q, letter]);

  const count = tab === "terms" ? terms.length : words.length;
  const total = tab === "terms" ? LEXICON.length : GLOSSARY.length;

  const switchTab = (t: Tab) => { setTab(t); setLetter(null); };

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <>
      <div className="mb-8 text-center">
        {/* Astrolabe seal — reference/knowledge emblem (DESIGN_DIRECTION §4). */}
        <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full"
          style={{ border: "1px solid color-mix(in oklab, var(--color-gold) 45%, transparent)", boxShadow: "0 0 26px -6px color-mix(in oklab, var(--color-gold) 50%, transparent)" }}>
          <img src="/dark-alchemy-vibe/seal-astrolabe.webp" alt="" aria-hidden className="h-full w-full object-cover" />
        </div>
        <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">Stay in the Grimoire</p>
        <h1 className="font-display text-4xl md:text-5xl mb-4">The Lexicon</h1>
        <p className="mx-auto max-w-xl text-parchment">
          Every chemistry term the platform uses, explained in full on its own page — written
          in-house and cited to reliable references. Browse, search, or jump by letter.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {([["terms", `Chemistry Terms · ${LEXICON.length}`], ["grimoire", `Words of the Grimoire · ${GLOSSARY.length}`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => switchTab(key)}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
              style={tab === key
                ? { background: "var(--color-emerald-elixir)", color: "#fff" }
                : { color: "var(--color-parchment)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto mb-5 max-w-xl">
        <div className="flex items-center gap-2 rounded-2xl py-1.5 pl-4 pr-3"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 text-parchment/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "terms" ? "Search terms…" : "Search the grimoire's words…"}
            className="flex-1 bg-transparent py-1.5 text-base text-spectral placeholder:text-parchment/40 outline-none"
            aria-label="Search the lexicon"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="px-1 text-lg leading-none text-parchment/40 transition hover:text-spectral">×</button>
          )}
        </div>
      </div>

      {/* A–Z filter */}
      <div className="mx-auto mb-8 flex max-w-3xl flex-wrap justify-center gap-1">
        <button onClick={() => setLetter(null)}
          className="rounded-md px-2.5 py-1 text-xs font-semibold transition"
          style={letter === null
            ? { color: "var(--color-emerald-elixir)", background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)" }
            : { color: "var(--color-parchment)" }}>
          All
        </button>
        {ALPHABET.map((L) => {
          const has = letters.has(L);
          const active = letter === L;
          return (
            <button key={L} disabled={!has} onClick={() => setLetter(active ? null : L)}
              className="rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-25"
              style={active
                ? { color: "var(--color-emerald-elixir)", background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)" }
                : { color: has ? "var(--color-parchment)" : "var(--color-parchment)" }}>
              {L}
            </button>
          );
        })}
      </div>

      <p className="mb-5 text-center text-xs tracking-[0.1em] text-parchment/55 tabular-nums">
        {count === total ? `${total} entries` : `${count} of ${total}`}
      </p>

      {/* Content */}
      {count === 0 ? (
        <p className="py-12 text-center text-parchment/60">No entries match — try another letter or clear the search.</p>
      ) : tab === "terms" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((e) => (
            <Link key={e.id} to="/lexicon" search={{ term: e.id }}
              className="ink-panel ink-halftone group block p-5 transition-transform duration-200 hover:-translate-y-1">
              <h2 className="mb-1.5 text-lg font-semibold text-spectral">{e.term}</h2>
              <p className="text-sm leading-relaxed text-parchment line-clamp-3">{e.preview}</p>
              <span className="mt-3 inline-block text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--color-emerald-elixir)" }}>
                Read more →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {words.map((g) => (
            <div key={g.word} className="ink-panel p-5">
              <h3 className="mb-1.5 font-semibold text-gold">{g.word}</h3>
              <p className="text-sm leading-relaxed text-parchment">{g.meaning}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function LexiconPage() {
  const { term } = Route.useSearch();
  const navigate = useNavigate();
  const entry = term ? lexiconById(term) : undefined;

  const close = () => navigate({ to: "/lexicon", search: {}, replace: true });

  return (
    <div className="grimoire-skin bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />
      <FloatingNav />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-24">
        {entry ? (
          <article>
            <button onClick={close} className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-parchment transition hover:-translate-y-px hover:text-spectral"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
              ← All terms
            </button>
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Lexicon</p>
            <h1 className="font-display text-4xl md:text-5xl mb-6">{entry.term}</h1>
            <div className="max-w-2xl space-y-4">
              {entry.body.map((p, i) => (
                <p key={i} className="text-lg leading-relaxed text-parchment">{p}</p>
              ))}
            </div>
            {/* The citation — every page names its source (adviser rule). */}
            <div className="mt-8 max-w-2xl rounded-xl p-4"
              style={{ background: "color-mix(in oklab, var(--color-gold) 7%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
              <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-gold">Source</div>
              <p className="text-sm leading-relaxed text-parchment">{entry.source}</p>
            </div>

            {/* Keep reading */}
            <div className="mt-10">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-parchment/55">Keep reading</p>
              <div className="flex flex-wrap gap-2">
                {LEXICON.filter((e) => e.id !== entry.id).slice(0, 8).map((e) => (
                  <Link key={e.id} to="/lexicon" search={{ term: e.id }}
                    className="rounded-full px-3.5 py-1.5 text-sm text-parchment transition hover:-translate-y-px hover:text-spectral"
                    style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
                    {e.term}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ) : (
          <LexiconIndex />
        )}
      </div>

      {/* The alchemist's workbench closes every guest page (DESIGN_DIRECTION §4). */}
      <div className="relative z-10" aria-hidden>
        <img src="/dark-alchemy-vibe/band-workbench.webp" alt=""
          className="h-44 w-full object-cover md:h-56"
          style={{ maskImage: "linear-gradient(180deg, transparent, black 38%)", WebkitMaskImage: "linear-gradient(180deg, transparent, black 38%)" }} />
      </div>
      <footer className="relative z-10 border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase">
        ✦ AlcheMix — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
