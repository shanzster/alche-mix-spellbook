import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Grid3x3, Search, Palette, Thermometer, TrendingUp, History,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { useUserProfile, logPractice } from "../lib/profile";
import {
  PERIODIC_ELEMENTS, type TableElement,
} from "../lib/periodic-table-data";
import {
  PeriodicGrid, CATEGORY_COLORS, CATEGORY_LEGEND, type CellLook,
} from "../components/PeriodicGrid";

interface PeriodicTableSearch {
  /** Deep link: element symbol, e.g. ?element=Fe (case-insensitive). */
  element?: string;
}

export const Route = createFileRoute("/periodic-table")({
  validateSearch: (search: Record<string, unknown>): PeriodicTableSearch =>
    typeof search.element === "string" && search.element.length > 0
      ? { element: search.element }
      : {},
  component: () => (
    <RequireAuth>
      <PeriodicTable />
    </RequireAuth>
  ),
});

function numberForSymbol(symbol: string | undefined): number | undefined {
  if (!symbol) return undefined;
  const q = symbol.toLowerCase();
  return PERIODIC_ELEMENTS.find((e) => e.symbol.toLowerCase() === q)?.number;
}

// Category colours + legend order live in the shared grid component now
// (adviser item 19: one table everywhere).
const LEGEND = CATEGORY_LEGEND;

// ── Data lenses (Ptable-style: same grid, different colour stories) ──────────
type Lens = "family" | "state" | "trend" | "timeline";

const LENSES = [
  ["family", "Family", Palette],
  ["state", "State of Matter", Thermometer],
  ["trend", "Trend Heat-map", TrendingUp],
  ["timeline", "Discovery Timeline", History],
] as const;

const MISSING_COLOR = "#64748b";

// State-of-matter colours + phase logic driven by melt/boil points.
const STATE_COLORS = {
  Solid: "#60a5fa",
  Liquid: "#34d399",
  Gas: "#f87171",
  Unknown: MISSING_COLOR,
} as const;
type Matter = keyof typeof STATE_COLORS;

function matterAt(el: TableElement, tempK: number): Matter {
  // Gas first: sublimers (arsenic) list a "boiling" point below their melting point.
  if (el.boilK !== undefined && tempK >= el.boilK) return "Gas";
  if (el.meltK !== undefined && tempK < el.meltK) return "Solid";
  if (el.meltK !== undefined || el.boilK !== undefined) return "Liquid";
  return "Unknown";
}

// Trend heat-map properties.
interface TrendProp {
  label: string;
  get: (el: TableElement) => number | undefined;
  fmt: (v: number) => string;
}
const TREND_PROPS = {
  electronegativity: {
    label: "Electronegativity",
    get: (el) => el.electronegativity,
    fmt: (v) => v.toFixed(2),
  },
  mass: {
    label: "Atomic mass",
    get: (el) => parseFloat(el.mass),
    fmt: (v) => (v < 100 ? v.toFixed(1) : String(Math.round(v))),
  },
  melt: {
    label: "Melting point",
    get: (el) => el.meltK,
    fmt: (v) => `${Math.round(v)}K`,
  },
  boil: {
    label: "Boiling point",
    get: (el) => el.boilK,
    fmt: (v) => `${Math.round(v)}K`,
  },
} satisfies Record<string, TrendProp>;
type TrendKey = keyof typeof TREND_PROPS;

/** Proportional colour ramp: cool blue (low) → hot red-orange (high). */
function rampColor(t: number): string {
  return `hsl(${Math.round(215 - t * 200)} 85% ${Math.round(55 + t * 8)}%)`;
}

function isKnownBy(el: TableElement, year: number): boolean {
  return el.ancient === true || (el.discoveryYear !== undefined && el.discoveryYear <= year);
}

function PeriodicTable() {
  const { uid } = useUserProfile();
  const { element: elementParam } = Route.useSearch();
  const navigate = useNavigate();

  // Deep-link highlight only: ?element=Fe lights up that tile. There is NO
  // modal any more — tapping an element opens its own page (/element/$symbol).
  const [selectedNum, setSelectedNum] = useState<number | null>(
    () => numberForSymbol(elementParam) ?? null,
  );
  const [search, setSearch] = useState("");

  // Simplified (the familiar classroom chart, default) vs Interactive (the
  // lensed exploration) — adviser P0 item 3: "Pwede siyang pagpiliin."
  const [mode, setMode] = useState<"traditional" | "interactive">("traditional");

  // Lens state (Interactive mode only).
  const [lens, setLens] = useState<Lens>("family");
  const [tempK, setTempK] = useState(293); // ~room temperature
  const [trendKey, setTrendKey] = useState<TrendKey>("electronegativity");
  const [year, setYear] = useState(2016);

  useEffect(() => { if (uid) logPractice(uid, "periodic-table"); }, [uid]);

  // Keep the highlight in sync if the URL changes underneath us.
  useEffect(() => {
    setSelectedNum(numberForSymbol(elementParam) ?? null);
  }, [elementParam]);

  // A tap opens the element's dedicated study page — no modal.
  const selectElement = (el: TableElement) => {
    navigate({ to: "/element/$symbol", params: { symbol: el.symbol } });
  };

  // Search dims non-matching cells (keeps the grid's spatial layout intact).
  const q = search.trim().toLowerCase();
  const matches = (el: TableElement) =>
    !q ||
    el.name.toLowerCase().includes(q) ||
    el.symbol.toLowerCase().includes(q) ||
    String(el.number) === q ||
    el.category.toLowerCase().includes(q);

  const trend = TREND_PROPS[trendKey];
  const [trendMin, trendMax] = useMemo(() => {
    const vals = PERIODIC_ELEMENTS
      .map(trend.get)
      .filter((v): v is number => v !== undefined);
    return [Math.min(...vals), Math.max(...vals)];
  }, [trend]);

  const knownCount = useMemo(
    () => PERIODIC_ELEMENTS.filter((el) => isKnownBy(el, year)).length,
    [year],
  );

  // How the active lens paints one tile (search dimming applies in every lens).
  // Traditional mode always paints by family — the chart students recognise.
  const look = (el: TableElement): CellLook => {
    const searchDim = matches(el) ? 1 : 0.2;
    if (mode === "traditional") {
      return { color: CATEGORY_COLORS[el.category], opacity: searchDim };
    }
    switch (lens) {
      case "state":
        return { color: STATE_COLORS[matterAt(el, tempK)], opacity: searchDim };
      case "trend": {
        const v = trend.get(el);
        if (v === undefined) return { color: MISSING_COLOR, opacity: 0.55 * searchDim, value: "—" };
        const t = (v - trendMin) / (trendMax - trendMin || 1);
        return { color: rampColor(t), opacity: searchDim, value: trend.fmt(v) };
      }
      case "timeline":
        return {
          color: CATEGORY_COLORS[el.category],
          opacity: isKnownBy(el, year) ? searchDim : 0.12,
        };
      default:
        return { color: CATEGORY_COLORS[el.category], opacity: searchDim };
    }
  };

  return (
    <ModuleShell
      title="Periodic Table"
      eyebrow="Element Codex"
      icon={Grid3x3}
      accent="var(--color-wraith)"
      subtitle="The Modern Periodic Table of the Elements. Tap any element to open its own study page — atom in 3D, properties, lore and the things it's found in."
    >
      {/* Traditional ⇄ Interactive — defaults to the chart students know */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {([["traditional", "Simplified"], ["interactive", "Interactive"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition sm:px-5"
              style={mode === key ? { background: "color-mix(in oklab, var(--color-wraith) 25%, transparent)", color: "var(--color-wraith)" } : { color: "var(--color-parchment)" }}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-parchment/60">
          {mode === "traditional"
            ? "The standard IUPAC arrangement, exactly as in class."
            : "Lenses: colour the same chart by family, state, trends or discovery."}
        </span>
      </div>

      {/* Lens control bar — four ways to colour the same chart */}
      {mode === "interactive" && (
      <div className="mb-4 space-y-3">
        <div className="inline-flex max-w-full flex-wrap rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
          {LENSES.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setLens(key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition sm:px-4 sm:text-xs"
              style={lens === key ? { background: "color-mix(in oklab, var(--color-wraith) 22%, transparent)", color: "var(--color-wraith)" } : { color: "var(--color-parchment)" }}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {lens === "state" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <input type="range" min={0} max={6000} step={1} value={tempK}
              onChange={(e) => setTempK(Number(e.target.value))}
              className="w-full max-w-xs" style={{ accentColor: "var(--color-wraith)" }}
              aria-label="Temperature in kelvin" />
            <span className="text-sm tabular-nums text-spectral">
              {tempK} K <span className="text-parchment/60">({Math.round(tempK - 273.15)} °C)</span>
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {(Object.entries(STATE_COLORS) as [Matter, string][]).map(([state, c]) => (
                <span key={state} className="inline-flex items-center gap-1.5 text-[10px] text-parchment/70">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c, boxShadow: `0 0 6px -1px ${c}` }} />
                  {state}
                </span>
              ))}
            </div>
          </div>
        )}

        {lens === "trend" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <select value={trendKey} onChange={(e) => setTrendKey(e.target.value as TrendKey)}
              className="rounded-lg px-3 py-2 text-sm text-spectral outline-none"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}
              aria-label="Heat-map property">
              {(Object.entries(TREND_PROPS) as [TrendKey, typeof trend][]).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-[10px] tabular-nums text-parchment/70">
              <span>{trend.fmt(trendMin)}</span>
              <span className="h-2.5 w-28 rounded-full sm:w-40"
                style={{ background: `linear-gradient(to right, ${rampColor(0)}, ${rampColor(0.5)}, ${rampColor(1)})` }} />
              <span>{trend.fmt(trendMax)}</span>
              <span className="ml-2 inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: MISSING_COLOR }} /> no data
              </span>
            </div>
          </div>
        )}

        {lens === "timeline" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <input type="range" min={1650} max={2016} step={1} value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full max-w-xs" style={{ accentColor: "var(--color-wraith)" }}
              aria-label="Discovery year" />
            <span className="text-sm tabular-nums text-spectral">{year}</span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-parchment/70">
              {knownCount} elements known
            </span>
            <span className="text-[10px] text-parchment/50">
              Elements known since antiquity always shine.
            </span>
          </div>
        )}
      </div>
      )}

      {/* Search + family legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an element…"
            className="w-full rounded-lg py-2 pl-9 pr-3 text-sm text-spectral outline-none placeholder:text-parchment/40"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }} />
        </div>
        {(mode === "traditional" || lens === "family") && (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGEND.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-parchment/80">
                <span className="h-3 w-3 rounded-[3px]" style={{ background: CATEGORY_COLORS[cat], boxShadow: `0 0 6px -1px ${CATEGORY_COLORS[cat]}` }} />
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── The grid — the one shared chart (scrolls sideways on phones) ── */}
      <PeriodicGrid
        selectedNum={selectedNum}
        onSelect={selectElement}
        detailed={mode === "traditional"}
        look={look}
      />

    </ModuleShell>
  );
}
