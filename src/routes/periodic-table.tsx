import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Grid3x3, Search, Orbit, Box, Check, FlaskConical } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice } from "../lib/profile";
import {
  PERIODIC_ELEMENTS, FBLOCK_MARKERS, type TableElement, type ElementCategory,
} from "../lib/periodic-table-data";

export const Route = createFileRoute("/periodic-table")({
  component: () => (
    <RequireAuth>
      <PeriodicTable />
    </RequireAuth>
  ),
});

// ── Category colours (family key, as on the classic wall chart) ─────────────
const CATEGORY_COLORS: Record<ElementCategory, string> = {
  "Alkali Metal": "#f87171",
  "Alkaline Earth Metal": "#fb923c",
  "Transition Metal": "#a78bfa",
  "Post-transition Metal": "#60a5fa",
  "Metalloid": "#4ade80",
  "Nonmetal": "#facc15",
  "Halogen": "#34d399",
  "Noble Gas": "#38bdf8",
  "Lanthanide": "#f0abfc",
  "Actinide": "#fda4af",
};

// Order the legend the way the chart groups them.
const LEGEND: ElementCategory[] = [
  "Alkali Metal", "Alkaline Earth Metal", "Transition Metal", "Post-transition Metal",
  "Metalloid", "Nonmetal", "Halogen", "Noble Gas", "Lanthanide", "Actinide",
];

// ── Rich, education-first content (the curated elements get a full study page) ─
interface RichInfo {
  state: "Solid" | "Liquid" | "Gas";
  uses: string[];
  examples: string;
  note: string;
}
const RICH: Record<number, RichInfo> = {
  1: { state: "Gas", uses: ["Rocket fuel", "Making ammonia for fertiliser", "Hydrogen fuel cells"],
    examples: "Bonded with oxygen it makes every drop of water (H₂O).",
    note: "The lightest and most abundant element in the universe — stars are mostly hydrogen." },
  2: { state: "Gas", uses: ["Filling balloons & airships", "Cooling MRI magnets", "Deep-sea diving gas mixes"],
    examples: "The gas that makes party balloons float and your voice go squeaky.",
    note: "So light it escapes Earth's gravity — and it was first discovered in the Sun, not on Earth." },
  3: { state: "Solid", uses: ["Rechargeable batteries", "Mood-stabilising medicine", "Heat-resistant glass"],
    examples: "Powers your phone, laptop and electric cars.",
    note: "The lightest metal — soft enough to cut with a knife and light enough to float on water." },
  6: { state: "Solid", uses: ["Making steel", "Diamonds & pencil 'lead'", "The backbone of all living things"],
    examples: "Every living thing — you included — is built around carbon.",
    note: "The same element forms both diamond (hardest natural material) and soft, slippery graphite." },
  7: { state: "Gas", uses: ["Fertilisers", "Preserving packaged food", "Liquid nitrogen for freezing"],
    examples: "Makes up 78% of the air you breathe.",
    note: "Its molecules are so unreactive it's pumped into crisp packets to keep them fresh." },
  8: { state: "Gas", uses: ["Breathing & hospital medicine", "Making steel", "Rocket propellant"],
    examples: "Every breath you take and every fire that burns needs it.",
    note: "Reactive enough to rust iron and power your cells — about 21% of the air is oxygen." },
  9: { state: "Gas", uses: ["Fluoride in toothpaste", "Non-stick coatings (Teflon)", "Refrigerant gases"],
    examples: "Added to toothpaste and tap water to protect your teeth.",
    note: "The most reactive element of all — it reacts with almost everything, even glass." },
  10: { state: "Gas", uses: ["Glowing signs", "High-voltage indicators", "Some lasers"],
    examples: "The red-orange glow of classic 'neon' signs.",
    note: "A full outer shell makes it completely unreactive — it simply glows when electrified." },
  11: { state: "Solid", uses: ["Table salt (with chlorine)", "Orange street lamps", "Soap making"],
    examples: "Half of the salt on your food is sodium.",
    note: "So reactive that pure sodium bursts into flame in water — yet it's essential for your nerves." },
  12: { state: "Solid", uses: ["Lightweight alloys", "Fireworks & flares", "Dietary supplements"],
    examples: "Burns with a brilliant white light in fireworks and flares.",
    note: "It sits at the centre of chlorophyll — without it, plants couldn't photosynthesise." },
  13: { state: "Solid", uses: ["Drink cans & foil", "Aircraft bodies", "Power lines"],
    examples: "Drink cans, kitchen foil and aeroplane fuselages.",
    note: "The most abundant metal in Earth's crust — light, strong and endlessly recyclable." },
  14: { state: "Solid", uses: ["Computer chips", "Solar panels", "Glass & ceramics"],
    examples: "The 'silicon' in Silicon Valley — it runs every computer.",
    note: "A semiconductor: it conducts electricity just enough to switch signals on and off." },
  16: { state: "Solid", uses: ["Making sulfuric acid", "Vulcanising rubber for tyres", "Gunpowder & matches"],
    examples: "The yellow crust around volcanoes and hot springs.",
    note: "It gives rotten eggs their smell — and the acid made from it is the world's most-produced chemical." },
  17: { state: "Gas", uses: ["Disinfecting water & pools", "Household bleach", "Making PVC plastic"],
    examples: "Keeps swimming pools and drinking water safe.",
    note: "A toxic green gas on its own, but bonded with sodium it becomes harmless table salt." },
  19: { state: "Solid", uses: ["Fertilisers", "Salt substitutes", "Nerve & muscle signals"],
    examples: "Bananas are famous for being rich in it.",
    note: "Vital for your heartbeat and nerves — its symbol K comes from the Latin 'kalium'." },
  20: { state: "Solid", uses: ["Cement & concrete", "Building bones & teeth", "Antacid tablets"],
    examples: "Builds your bones and teeth; found in milk and cheese.",
    note: "The most abundant metal in your body — and the main ingredient of chalk, marble and seashells." },
  26: { state: "Solid", uses: ["Steel for buildings & cars", "Tools & machinery", "Carrying oxygen in your blood"],
    examples: "Steel skyscrapers, cars — and the haemoglobin in your blood.",
    note: "The most common element on Earth by mass, and the reason your blood is red." },
  29: { state: "Solid", uses: ["Electrical wiring", "Water pipes", "Coins & bronze"],
    examples: "The wires in your walls and the pipes under your sink.",
    note: "One of the first metals humans used — it slowly turns green as it weathers, like the Statue of Liberty." },
  79: { state: "Solid", uses: ["Jewellery", "Electronics connectors", "Dentistry"],
    examples: "Rings, medals and the gold contacts inside phones.",
    note: "So unreactive it never tarnishes — gold buried for thousands of years comes out still shining." },
};

// ── 2D Bohr diagram (SVG, self-animating) ───────────────────────────────────
function BohrSVG({ shells, color, symbol, name }: { shells: string; color: string; symbol: string; name: string }) {
  const rings = shells.split(",").map(Number);
  const size = 260, cx = size / 2, cy = size / 2, nucleusR = 22;
  const maxR = size / 2 - 16;
  const step = rings.length ? (maxR - nucleusR - 6) / rings.length : 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" aria-label={`Bohr diagram of ${name}`}>
      {rings.map((count, i) => {
        const r = nucleusR + 6 + step * (i + 1);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
            <g>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${i % 2 ? -360 : 360} ${cx} ${cy}`} dur={`${9 + i * 3}s`} repeatCount="indefinite" />
              {Array.from({ length: Math.min(count, 32) }).map((_, e) => {
                const a = (2 * Math.PI * e) / Math.min(count, 32);
                return <circle key={e} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
              })}
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={nucleusR} fill={`color-mix(in oklab, ${color} 35%, transparent)`} stroke={color} strokeWidth="2" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-sans)" fontSize="20" fontWeight="600" fill="var(--color-spectral)">{symbol}</text>
    </svg>
  );
}

// ── One cell in the grid ────────────────────────────────────────────────────
function Cell({ el, active, dim, onClick }: { el: TableElement; active: boolean; dim: boolean; onClick: () => void }) {
  const color = CATEGORY_COLORS[el.category];
  return (
    <button
      onClick={onClick}
      title={`${el.number} · ${el.name}`}
      style={{
        gridColumn: el.xpos,
        gridRow: el.ypos,
        background: `color-mix(in oklab, ${color} ${active ? 30 : 15}%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} ${active ? 90 : 45}%, transparent)`,
        boxShadow: active ? `0 0 0 2px ${color}, 0 0 18px -4px ${color}` : "none",
        opacity: dim ? 0.2 : 1,
        color,
      }}
      className="group relative flex aspect-square min-w-[30px] flex-col items-center justify-center rounded-[5px] leading-none transition-all duration-150 hover:z-10 hover:brightness-125"
    >
      <span className="absolute left-[3px] top-[2px] text-[7px] font-medium text-parchment/60 sm:text-[8px]">{el.number}</span>
      <span className="font-sans text-[11px] font-semibold sm:text-sm">{el.symbol}</span>
      <span className="hidden max-w-full truncate px-0.5 text-[6px] text-parchment/55 lg:block">{el.name}</span>
    </button>
  );
}

function PeriodicTable() {
  const { uid } = useUserProfile();
  const [selectedNum, setSelectedNum] = useState(6); // Carbon
  const [view, setView] = useState<"bohr" | "3d">("3d");
  const [search, setSearch] = useState("");

  useEffect(() => { if (uid) logPractice(uid, "periodic-table"); }, [uid]);

  const selected = useMemo(
    () => PERIODIC_ELEMENTS.find((e) => e.number === selectedNum)!,
    [selectedNum],
  );
  const rich = RICH[selected.number];
  const color = CATEGORY_COLORS[selected.category];

  // Search dims non-matching cells (keeps the grid's spatial layout intact).
  const q = search.trim().toLowerCase();
  const matches = (el: TableElement) =>
    !q ||
    el.name.toLowerCase().includes(q) ||
    el.symbol.toLowerCase().includes(q) ||
    String(el.number) === q ||
    el.category.toLowerCase().includes(q);

  return (
    <ModuleShell
      title="Periodic Table"
      eyebrow="Element Codex"
      icon={Grid3x3}
      accent="var(--color-wraith)"
      subtitle="The Modern Periodic Table of the Elements. Tap any element to study it — see it in 3D or as a Bohr diagram."
    >
      {/* Search + family legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an element…"
            className="w-full rounded-lg py-2 pl-9 pr-3 text-sm text-spectral outline-none placeholder:text-parchment/40"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {LEGEND.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1.5 text-[10px] text-parchment/70">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CATEGORY_COLORS[cat], boxShadow: `0 0 6px -1px ${CATEGORY_COLORS[cat]}` }} />
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* ── The grid (scrolls horizontally on small screens, like a wall chart) ── */}
      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div
          className="grid min-w-[640px] gap-[3px]"
          style={{ gridTemplateColumns: "repeat(18, minmax(30px, 1fr))" }}
        >
          {PERIODIC_ELEMENTS.map((el) => (
            <Cell
              key={el.number}
              el={el}
              active={el.number === selectedNum}
              dim={!matches(el)}
              onClick={() => setSelectedNum(el.number)}
            />
          ))}

          {/* Group-3 markers pointing to the f-block rows below. */}
          {FBLOCK_MARKERS.map((m) => (
            <div
              key={m.label}
              style={{ gridColumn: m.xpos, gridRow: m.ypos, border: `1px dashed color-mix(in oklab, ${CATEGORY_COLORS[m.category]} 55%, transparent)` }}
              className="flex aspect-square items-center justify-center rounded-[5px] text-[7px] text-parchment/60 sm:text-[9px]"
            >
              {m.label}
            </div>
          ))}

          {/* Spacer between the main block and the f-block rows. */}
          <div style={{ gridColumn: "1 / span 18", gridRow: 8, height: 10 }} />
        </div>
      </div>

      {/* ── Detail panel for the selected element ── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Viewer */}
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl font-sans"
              style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`, boxShadow: `0 0 24px -8px ${color}`, color }}>
              <span className="text-2xl font-semibold leading-none">{selected.symbol}</span>
              <span className="mt-0.5 text-[10px] opacity-70">{selected.number}</span>
            </div>
            <div>
              <h2 className="font-display text-2xl">{selected.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
                <span className="rounded-full px-2 py-0.5" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>{selected.category}</span>
                {rich && <span className="text-parchment/60">{rich.state}</span>}
                <span className="text-parchment/60">{selected.mass} u</span>
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="mb-3 inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
            {([["3d", "3D View", Box], ["bohr", "Bohr Model", Orbit]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setView(key)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.1em] transition"
                style={view === key ? { background: `color-mix(in oklab, ${color} 20%, transparent)`, color } : { color: "var(--color-parchment)" }}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="relative h-[340px] overflow-hidden rounded-2xl"
            style={{ background: `radial-gradient(ellipse at 50% 40%, color-mix(in oklab, ${color} 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
            {view === "3d" ? (
              <BohrModel3D key={selected.symbol} interactive electrons={selected.shells} color={color} nucleusColor="#fbbf24" label={selected.symbol} />
            ) : (
              <div className="flex h-full items-center justify-center p-6"><BohrSVG shells={selected.shells} color={color} symbol={selected.symbol} name={selected.name} /></div>
            )}
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-parchment/50">
              {view === "3d" ? "drag to spin ⟳" : `Shells: ${selected.shells}`}
            </span>
          </div>
        </div>

        {/* Educational content */}
        <div className="space-y-4">
          {rich ? (
            <>
              <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
                <div className="mb-3 flex items-center gap-2 text-teal">
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span className="font-display text-[10px] uppercase tracking-[0.2em]">What it's used for</span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {rich.uses.map((u) => (
                    <li key={u} className="flex items-start gap-2 text-sm text-parchment">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal" /> {u}
                    </li>
                  ))}
                </ul>
              </div>
              <DidYouKnow>{rich.examples}</DidYouKnow>
              <ConceptCard title={selected.name}>{rich.note}</ConceptCard>
            </>
          ) : (
            <div className="rounded-xl p-5" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Atomic number" value={String(selected.number)} />
                <Stat label="Atomic mass" value={`${selected.mass} u`} />
                <Stat label="Family" value={selected.category} />
                <Stat label="Electron shells" value={selected.shells} />
              </div>
              <p className="text-sm leading-relaxed text-parchment/70">
                Spin the model to explore {selected.name}'s {selected.shells.split(",").length} electron shells.
                A full study page for {selected.name} is on its way.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-parchment/45">{label}</div>
      <div className="mt-0.5 text-spectral">{value}</div>
    </div>
  );
}
