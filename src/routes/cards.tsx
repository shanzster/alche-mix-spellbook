import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookMarked, Lock, ScanLine, Sparkles, X, CalendarDays, ChevronRight, Printer, FlaskConical } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { AR_ELEMENTS, type ARElement } from "../components/CrystalAR";
import { useUserProfile, logPractice } from "../lib/profile";
import { FORGED_CARDS, type ForgedCard } from "../lib/forged";

/**
 * Print a card's face (its "itsura") on its own page. Opens a minimal print
 * window with just the image so the browser's print dialog gets a clean,
 * full-bleed card — no app chrome. Triggered from a click, so pop-up blockers
 * generally allow it.
 */
function printCardImage(src: string, title = "AlcheMix Card") {
  const w = window.open("", "_blank", "width=700,height=980");
  if (!w) {
    alert("Please allow pop-ups for this site to print your card.");
    return;
  }
  w.document.write(
    `<!doctype html><html><head><title>${title}</title><style>
      @page { margin: 0; }
      html, body { margin: 0; height: 100%; background: #fff; }
      body { display: flex; align-items: center; justify-content: center; }
      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
    </style></head><body>
      <img src="${src}"
        onload="setTimeout(function(){window.focus();window.print();},60);"
        onerror="document.body.innerHTML='<p style=\\'font-family:sans-serif\\'>Could not load the card image.</p>';" />
      <script>window.onafterprint = function(){ window.close(); };</script>
    </body></html>`,
  );
  w.document.close();
}

/**
 * The Grimoire — a history/collection book, nothing more.
 * It displays the element cards claimed through the AR Scanner; tapping an
 * owned card opens its page: the element's details plus when it was obtained.
 */

export const Route = createFileRoute("/cards")({
  component: () => (
    <RequireAuth>
      <Grimoire />
    </RequireAuth>
  ),
});

const ACCENT = "var(--color-gold)";
const CARD_COLOR: Record<string, string> = { alchemix: "#d4b25a", helium: "#60a5fa" };

function Grimoire() {
  const { uid, profile } = useUserProfile();
  const collected = profile?.grimoire ?? [];
  const scans = profile?.grimoireScans ?? {};
  const forgedOwned = profile?.forged ?? [];
  const forgedAt = profile?.forgedAt ?? {};
  const [open, setOpen] = useState<ARElement | null>(null);
  const [openForged, setOpenForged] = useState<ForgedCard | null>(null);

  useEffect(() => { if (uid) void logPractice(uid, "grimoire"); }, [uid]);

  const ownedCount = AR_ELEMENTS.filter((e) => collected.includes(e.symbol)).length;
  const forgedCards = FORGED_CARDS.filter((c) => forgedOwned.includes(c.id));

  return (
    <ModuleShell
      title="Grimoire"
      eyebrow="Collection Book"
      subtitle="Every element card you've claimed with the AR Scanner, bound into your book. Tap a card to open its page."
      icon={BookMarked}
      accent={ACCENT}
    >
      {/* Count */}
      <div className="mb-5 flex items-center justify-between px-1">
        <p className="text-sm text-parchment/70">Cards collected</p>
        <p className="font-display text-gold">{ownedCount} <span className="text-parchment/50">/ {AR_ELEMENTS.length}</span></p>
      </div>

      {/* The collection */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {AR_ELEMENTS.map((el) => {
          const owned = collected.includes(el.symbol);
          const color = CARD_COLOR[el.key] ?? "var(--color-emerald-elixir)";
          return owned ? (
            <button
              key={el.key}
              onClick={() => setOpen(el)}
              className="group relative flex aspect-[3/4] flex-col items-center justify-center rounded-2xl p-4 transition-all duration-200 hover:-translate-y-1"
              style={{
                background: `radial-gradient(circle at 40% 22%, color-mix(in oklab, ${color} 30%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))`,
                border: `1.5px solid color-mix(in oklab, ${color} 45%, transparent)`,
                boxShadow: `0 10px 34px -18px ${color}`,
              }}
            >
              <span className="font-sans text-4xl font-semibold leading-none" style={{ color }}>{el.symbol}</span>
              <span className="mt-1 text-[10px] text-parchment/60">{el.number} · {el.mass}</span>
              <span className="mt-2 font-display text-sm text-spectral">{el.name}</span>
              <span className="mt-0.5 text-[10px] text-parchment/60">{el.category}</span>
              <span
                className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase"
                style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 35%, transparent)` }}
              >
                <Sparkles className="h-2.5 w-2.5" /> Collected
              </span>
            </button>
          ) : (
            <div
              key={el.key}
              className="relative flex aspect-[3/4] flex-col items-center justify-center rounded-2xl p-4 opacity-60"
              style={{
                background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
                border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)",
              }}
            >
              <Lock className="h-6 w-6 text-parchment/40" />
              <span className="mt-3 font-display text-sm text-parchment/50">Unclaimed</span>
              <span className="mt-1 text-center text-[10px] leading-snug text-parchment/40">Scan its card in the AR Scanner</span>
            </div>
          );
        })}
      </div>

      {/* ── Forged elements — new cards unlocked by Alche-mixing ── */}
      {forgedCards.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2 px-1">
            <FlaskConical className="h-4 w-4 text-wraith" />
            <h3 className="font-display text-wraith">Forged Elements</h3>
            <span className="text-xs text-parchment/50">· mixed in the AR Scanner</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {forgedCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setOpenForged(card)}
                className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1"
                style={{
                  border: "1.5px solid color-mix(in oklab, var(--color-wraith) 45%, transparent)",
                  boxShadow: "0 10px 34px -18px var(--color-wraith)",
                }}
              >
                <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                <span
                  className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase backdrop-blur"
                  style={{ color: "var(--color-wraith)", background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid color-mix(in oklab, var(--color-wraith) 35%, transparent)" }}
                >
                  <Sparkles className="h-2.5 w-2.5" /> Forged
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Nudge to the scanner */}
      {ownedCount < AR_ELEMENTS.length && (
        <Link
          to="/scanner"
          className="group mt-6 flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40"
        >
          <ScanLine className="h-4.5 w-4.5 flex-shrink-0 text-emerald-elixir" />
          <span className="flex-1 text-sm text-parchment">
            {ownedCount === 0 ? "Your book is empty — summon your first card in the " : "Claim the missing cards in the "}
            <span className="font-display text-spectral">AR Scanner</span>
          </span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
      )}

      {/* ── Card page popup ── */}
      {open && (() => {
        const color = CARD_COLOR[open.key] ?? "var(--color-emerald-elixir)";
        const stamp = scans[open.symbol];
        const obtained = stamp?.toDate
          ? stamp.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
          : null;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(null)} />
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6"
              style={{
                background: `linear-gradient(160deg, color-mix(in oklab, ${color} 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 96%, transparent))`,
                border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
                boxShadow: `0 0 70px -20px ${color}`,
              }}
            >
              <button
                onClick={() => setOpen(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-parchment transition hover:text-spectral"
                style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)", border: "1px solid var(--color-border)" }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header: big symbol + identity */}
              <div className="mb-4 flex items-end justify-between pr-10">
                <span className="font-sans text-6xl font-semibold leading-none" style={{ color }}>{open.symbol}</span>
                <div className="text-right">
                  <div className="font-display text-lg text-spectral">{open.name}</div>
                  <div className="text-xs text-parchment/60">No. {open.number} · {open.mass}</div>
                </div>
              </div>
              <div className="mb-4 text-sm" style={{ color }}>{open.category}</div>

              {/* Facts */}
              <ul className="space-y-1.5 border-t pt-4" style={{ borderColor: "color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}>
                {open.facts.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-parchment/85">
                    <span style={{ color }}>•</span> {f}
                  </li>
                ))}
              </ul>

              {/* Provenance: when it entered the book */}
              <div
                className="mt-5 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={{ background: "color-mix(in oklab, var(--color-mist) 55%, transparent)", border: "1px solid var(--color-border)" }}
              >
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
                <span className="text-parchment/80">
                  {obtained
                    ? <>Obtained on <span className="text-spectral">{obtained}</span> via the AR Scanner.</>
                    : <>Obtained via the AR Scanner — rescan the card once to record the date.</>}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Forged card page — shows the printable itsura ── */}
      {openForged && (() => {
        const stamp = forgedAt[openForged.id];
        const obtained = stamp?.toDate
          ? stamp.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
          : null;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenForged(null)} />
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6"
              style={{
                background: "linear-gradient(160deg, color-mix(in oklab, var(--color-wraith) 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 96%, transparent))",
                border: "1px solid color-mix(in oklab, var(--color-wraith) 45%, transparent)",
                boxShadow: "0 0 70px -20px var(--color-wraith)",
              }}
            >
              <button
                onClick={() => setOpenForged(null)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-parchment transition hover:text-spectral"
                style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)", border: "1px solid var(--color-border)" }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* The card face — its itsura */}
              <img
                src={openForged.image}
                alt={openForged.name}
                className="mx-auto mb-5 max-h-[52vh] w-auto rounded-xl shadow-2xl"
              />

              {/* Provenance */}
              <div
                className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={{ background: "color-mix(in oklab, var(--color-mist) 55%, transparent)", border: "1px solid var(--color-border)" }}
              >
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-wraith" />
                <span className="text-parchment/80">
                  {obtained
                    ? <>Forged on <span className="text-spectral">{obtained}</span> in the AR Scanner.</>
                    : <>Forged in the AR Scanner by Alche-mixing.</>}
                </span>
              </div>

              {/* Print the card */}
              <button
                onClick={() => printCardImage(openForged.image, openForged.name)}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-slate-sunken transition hover:brightness-110"
                style={{ background: "var(--color-wraith)" }}
              >
                <Printer className="h-4.5 w-4.5" /> Print this card
              </button>
            </div>
          </div>
        );
      })()}
    </ModuleShell>
  );
}
