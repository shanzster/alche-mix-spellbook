import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid3x3, Check, FlaskConical, ScrollText, Link2, ChevronLeft, Package, Sparkles,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { ElementViewer } from "../components/ElementViewer";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice } from "../lib/profile";
import { loreFor } from "../lib/element-lore";
import { electronConfig } from "../lib/electron-config";
import { richFor } from "../lib/element-rich";
import { PERIODIC_ELEMENTS } from "../lib/periodic-table-data";
import { CATEGORY_COLORS, fmtMass } from "../components/PeriodicGrid";

export const Route = createFileRoute("/element/$symbol")({
  component: () => (
    <RequireAuth>
      <ElementDetail />
    </RequireAuth>
  ),
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-parchment/45">{label}</div>
      <div className="mt-0.5 text-spectral">{value}</div>
    </div>
  );
}

function ElementDetail() {
  const { symbol } = Route.useParams();
  const { uid } = useUserProfile();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const el = useMemo(
    () => PERIODIC_ELEMENTS.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase()),
    [symbol],
  );

  useEffect(() => { if (uid) logPractice(uid, "periodic-table"); }, [uid]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  if (!el) {
    return (
      <ModuleShell title="Element not found" eyebrow="Element Codex" icon={Grid3x3} accent="var(--color-wraith)">
        <div className="glass rounded-2xl px-5 py-12 text-center">
          <p className="mb-4 text-sm text-parchment/70">No element matches “{symbol}”.</p>
          <Link to="/periodic-table" className="btn-arcane btn-arcane-hover inline-flex">
            <Grid3x3 className="h-4 w-4" /> Back to the Periodic Table
          </Link>
        </div>
      </ModuleShell>
    );
  }

  const color = CATEGORY_COLORS[el.category];
  const rich = richFor(el.number);
  const lore = loreFor(el.symbol);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/element/${el.symbol}`);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const neighbour = (dir: -1 | 1) => {
    const next = PERIODIC_ELEMENTS.find((e) => e.number === el.number + dir);
    if (next) navigate({ to: "/element/$symbol", params: { symbol: next.symbol } });
  };

  return (
    <ModuleShell
      title={el.name}
      eyebrow="Element Codex"
      icon={Grid3x3}
      accent={color}
      subtitle={`Element ${el.number} — ${el.category}. Everything about ${el.name}, from its atom to the things it's found in.`}
      right={
        <button onClick={copyLink}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition hover:brightness-125"
          style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)", color: copied ? "var(--color-teal)" : "var(--color-parchment)" }}
          title={`Copy a link to ${el.name}`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
        </button>
      }
    >
      {/* Back + prev/next pager */}
      <div className="-mt-2 mb-6 flex items-center justify-between">
        <Link to="/periodic-table" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-parchment/60 transition hover:text-spectral">
          <ChevronLeft className="h-3.5 w-3.5" /> Periodic Table
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => neighbour(-1)} disabled={el.number <= 1}
            className="rounded-full px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-30" style={{ border: "1px solid var(--color-border)" }}>← Prev</button>
          <button onClick={() => neighbour(1)} disabled={el.number >= PERIODIC_ELEMENTS.length}
            className="rounded-full px-3 py-1.5 text-xs text-parchment/70 transition hover:text-spectral disabled:opacity-30" style={{ border: "1px solid var(--color-border)" }}>Next →</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: the big reference tile + atom viewer */}
        <div>
          <div className="mb-4 flex items-start gap-4">
            {/* Reference-style tile — number, symbol, name, mass, family colour */}
            <div className="relative flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center rounded-2xl font-sans"
              style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, border: `2px solid color-mix(in oklab, ${color} 60%, transparent)`, boxShadow: `0 0 30px -8px ${color}` }}>
              <span className="absolute left-2 top-2 text-xs font-semibold tabular-nums text-parchment/75">{el.number}</span>
              <span className="absolute right-2 top-2 text-[10px] tabular-nums text-parchment/60">{fmtMass(el.mass)}</span>
              <span className="text-5xl font-bold" style={{ color }}>{el.symbol}</span>
              <span className="mt-1 max-w-full truncate px-1 text-[11px] text-parchment/80">{el.name}</span>
            </div>
            <div className="min-w-0 pt-1">
              <h2 className="flex items-center gap-3 font-display text-3xl leading-tight">
                {el.name}
                {lore?.alchemySymbol && (
                  <span className="text-3xl leading-none" style={{ color: "var(--color-gold)", textShadow: "0 0 14px color-mix(in oklab, var(--color-gold) 55%, transparent)" }} title="Alchemical symbol">
                    {lore.alchemySymbol}
                  </span>
                )}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
                <span className="rounded-full px-2 py-0.5" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>{el.category}</span>
                {rich && <span className="text-parchment/60">{rich.state}</span>}
                <span className="text-parchment/60">{el.mass} u</span>
              </div>
            </div>
          </div>

          <ElementViewer shells={el.shells} color={color} symbol={el.symbol} name={el.name} />
        </div>

        {/* Right: the data + stories */}
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Atomic number" value={String(el.number)} />
              <Stat label="Atomic mass" value={`${el.mass} u`} />
              <Stat label="Family" value={el.category} />
              <Stat label="Electron shells" value={el.shells} />
              <Stat label="Melting point" value={el.meltK !== undefined ? `${Math.round(el.meltK)} K · ${Math.round(el.meltK - 273.15)} °C` : "Not established"} />
              <Stat label="Boiling point" value={el.boilK !== undefined ? `${Math.round(el.boilK)} K · ${Math.round(el.boilK - 273.15)} °C` : "Not established"} />
              <Stat label="Electronegativity" value={el.electronegativity !== undefined ? el.electronegativity.toFixed(2) : "No accepted value"} />
              <Stat label="Discovered" value={el.ancient ? "Known since antiquity" : String(el.discoveryYear ?? "—")} />
              <div className="col-span-2"><Stat label="Electron configuration" value={electronConfig(el.number)} /></div>
            </div>
          </div>

          {/* ── Sample items — where you'll find it (real applications) ── */}
          <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="mb-3 flex items-center gap-2 text-teal">
              <Package className="h-3.5 w-3.5" />
              <span className="font-ui text-[10px] font-medium uppercase tracking-[0.2em]">Sample items — where you'll find it</span>
            </div>
            {rich ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rich.uses.map((u) => (
                    <div key={u} className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-parchment"
                      style={{ background: "color-mix(in oklab, var(--color-mist) 45%, transparent)", border: "1px solid var(--color-border)" }}>
                      <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal" /> {u}
                    </div>
                  ))}
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm italic text-parchment/80">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gold" /> {rich.examples}
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-parchment/75">
                {el.name} ({el.symbol}) is a {el.category.toLowerCase()}. Curated sample items for this
                element are still being written — its properties and story are below.
              </p>
            )}
          </div>

          {rich ? (
            <>
              <DidYouKnow>{rich.examples}</DidYouKnow>
              <ConceptCard title={el.name}>{rich.note}</ConceptCard>
            </>
          ) : (
            <ConceptCard title={`About ${el.name}`}>
              {`${el.name} (${el.symbol}) is a ${el.category.toLowerCase()} — element ${el.number} of the periodic table${el.ypos <= 7 ? `, in period ${el.ypos}` : ""}, with an atomic mass of ${el.mass} u.`}
            </ConceptCard>
          )}

          {/* ── Lore ── */}
          {lore && (
            <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="mb-3 flex items-center gap-2" style={{ color }}>
                <ScrollText className="h-3.5 w-3.5" />
                <span className="font-ui text-[10px] font-medium uppercase tracking-[0.2em]">Lore</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-parchment/60">The Name</div>
                  <p className="text-sm leading-relaxed text-parchment">{lore.etymology}</p>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-parchment/60">The History</div>
                  <p className="text-sm leading-relaxed text-parchment">{lore.history}</p>
                </div>
                {lore.alchemy && (
                  <div className="flex items-start gap-3 rounded-lg p-3" style={{ background: "color-mix(in oklab, var(--color-gold) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)" }}>
                    {lore.alchemySymbol && <span className="mt-0.5 flex-shrink-0 text-2xl leading-none" style={{ color: "var(--color-gold)" }} aria-hidden>{lore.alchemySymbol}</span>}
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-gold">The Alchemist's Eye</div>
                      <p className="text-sm leading-relaxed text-parchment">{lore.alchemy}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}
