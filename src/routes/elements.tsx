import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { loreFor } from "../lib/element-lore";
import { electronConfig } from "../lib/electron-config";
import { PERIODIC_ELEMENTS, type TableElement, type ElementCategory } from "../lib/periodic-table-data";
import { PeriodicGrid, CATEGORY_COLORS, CATEGORY_LEGEND, familyLook, fmtMass } from "../components/PeriodicGrid";
import { Term } from "../components/Term";
import { ScriptureModal } from "../components/ScriptureModal";

/**
 * The public element explorer — the SAME standard periodic table as the
 * in-app module (adviser item 19), free to browse without an account.
 * All 118 elements, the conventional IUPAC arrangement, full detail cards.
 */

export const Route = createFileRoute("/elements")({
  component: ElementsPage,
});

// ── Bohr Model SVG (animated electron shells) ───────────────────────────────
function BohrModel({ electrons, color }: { electrons: string; color: string }) {
  const shells = electrons.split(",").map(Number);
  const cx = 100, cy = 100, nucleusR = 14;
  const shellGap = Math.min(18, (86 - nucleusR) / Math.max(shells.length, 1));

  return (
    <svg viewBox="0 0 200 200" width="200" height="200" aria-label="Electron shell diagram">
      {shells.map((_, i) => {
        const r = nucleusR + (i + 1) * shellGap;
        return <circle key={`orbit-${i}`} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="0.8" opacity="0.25" />;
      })}
      {shells.map((count, shellIdx) => {
        const r = nucleusR + (shellIdx + 1) * shellGap;
        const shown = Math.min(count, 18);
        return Array.from({ length: shown }).map((_, eIdx) => {
          const baseAngle = (2 * Math.PI * eIdx) / shown;
          const delay = -(shellIdx * 1.3 + eIdx * (6 / Math.max(shown, 1)));
          const duration = 4 + shellIdx * 1.8;
          const ex = cx + r * Math.cos(baseAngle);
          const ey = cy + r * Math.sin(baseAngle);
          return (
            <g key={`e-${shellIdx}-${eIdx}`}>
              <circle cx={ex} cy={ey} r="2.2" fill={color} opacity="0.9">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        });
      })}
      <circle cx={cx} cy={cy} r={nucleusR} fill={`color-mix(in oklab, ${color} 30%, transparent)`} stroke={color} strokeWidth="1.5" opacity="0.9" />
    </svg>
  );
}

// ── Curated "did you know?" facts (the study set) ───────────────────────────
const FACTS: Record<number, string> = {
  1: "Most abundant element in the universe — makes up ~75% of all normal matter by mass.",
  2: "Chemically inert noble gas; second most abundant in the universe. Used in balloons and MRI cooling.",
  3: "Lightest metal; used in rechargeable batteries and as a mood-stabilising medication.",
  4: "Extremely stiff, lightweight metal; used in aerospace components and X-ray windows.",
  5: "Essential trace element for plants; used in borosilicate glass, ceramics, and detergents.",
  6: "Basis of all known life. Exists as diamond (hardest natural material), graphite, and fullerenes.",
  7: "Makes up 78% of Earth's atmosphere. Essential component of amino acids, proteins, and DNA.",
  8: "Third most abundant element in the universe. Essential for cellular respiration and combustion.",
  9: "Most electronegative element. Highly reactive; forms strong bonds with nearly every other element.",
  10: "Produces the familiar red-orange glow in neon signs. Completely chemically inert.",
  11: "Highly reactive metal. Combined with chlorine it forms table salt (NaCl), essential for life.",
  12: "Burns with a brilliant white flame. Central atom in chlorophyll — essential for photosynthesis.",
  13: "Most abundant metal in Earth's crust. Lightweight, corrosion-resistant, and infinitely recyclable.",
  14: "Second most abundant element in Earth's crust. The backbone of modern electronics and solar cells.",
  15: "Essential for DNA, RNA, and ATP (the cell's energy currency). White phosphorus is extremely toxic.",
  16: "Bright yellow solid with a distinct smell. Used in gunpowder, matches, vulcanising rubber, and fertilisers.",
  17: "Yellow-green toxic gas used to disinfect water. Forms salts (like NaCl) readily with metals.",
  18: "Third most abundant gas in Earth's atmosphere (~1%). Used in welding and incandescent light bulbs.",
  19: "Essential for nerve impulse transmission and muscle contraction. Symbol K comes from 'Kalium'.",
  20: "Most abundant metal in the human body. Essential for bones, teeth, blood clotting, and muscle function.",
  24: "Gives stainless steel its corrosion resistance. Used in chrome plating and as a green pigment in glass.",
  25: "Essential enzyme cofactor; used in steel production to improve strength and hardness.",
  26: "Most common element on Earth by mass. Backbone of the steel industry; Fe²⁺ and Fe³⁺ are its main ionic forms.",
  28: "Used in alloys, nickel-cadmium batteries, and as a catalyst for hydrogenation reactions.",
  29: "Excellent electrical and thermal conductor. One of the first metals used by humans (Bronze Age).",
  30: "Essential trace element. Used to galvanise steel, in sunscreen (ZnO), and in Zn-C batteries.",
  33: "Highly toxic metalloid historically used as a poison. Now used in semiconductors and wood preservatives.",
  35: "One of only two liquid non-metal elements at room temperature. Used in flame retardants and photography.",
  36: "Used in high-power flash lamps and certain lasers. Named from Greek 'kryptos' meaning hidden.",
  47: "Best electrical conductor of all metals. Has strong antibacterial properties; used in jewellery and photography.",
  48: "Toxic heavy metal used in Ni-Cd rechargeable batteries. Accumulates in kidneys — a major environmental concern.",
  50: "Used since antiquity in bronze alloys (Cu+Sn). Key component of solder and tin-plated steel cans.",
  53: "Essential for thyroid hormone synthesis. Used as an antiseptic (iodine solution) and in photography.",
  54: "Used in high-intensity arc lamps, medical imaging, and ion propulsion engines for spacecraft.",
  56: "Used in barium sulfate 'meals' for X-ray imaging of the digestive tract. Burns with a green flame.",
  78: "Precious, corrosion-resistant metal used in catalytic converters, jewellery, and cancer treatment drugs.",
  79: "Most malleable metal; does not tarnish or corrode. Monetary standard for millennia; used in electronics.",
  80: "Only metal liquid at standard conditions. Highly toxic — accumulates in food chains. Once used in thermometers.",
  82: "Dense, toxic metal. Used in batteries, radiation shielding. Banned from paints and pipes due to neurotoxicity.",
  90: "Naturally radioactive; potential alternative nuclear fuel. More abundant in Earth's crust than uranium.",
  92: "Heaviest naturally occurring element. Fuel for nuclear reactors; U-235 undergoes fission to release energy.",
  94: "Synthetic element used in nuclear weapons and reactors. Highly radioactive; Pu-239 has a 24,100-year half-life.",
};

// Scroll ("scripture") ink palette — the ElementModal renders on an always-cream
// parchment surface, so colours are fixed dark ink + deep gold (not theme tokens).
const INK = "#2c1f0e";
const INK_SOFT = "#6b5231";
const SCROLL_GOLD = "#8a5a12";

function SStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "rgba(44,31,14,0.05)", border: "1px solid rgba(138,90,18,0.28)" }}>
      <div className="text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: INK_SOFT }}>{label}</div>
      <div className="font-sans text-sm font-semibold" style={{ color: INK }}>{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: INK_SOFT }}>{sub}</div>}
    </div>
  );
}

function STier({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-[10px] tracking-[0.35em] uppercase font-semibold" style={{ color }}>{children}</span>
      <span className="h-px flex-1" style={{ background: "rgba(138,90,18,0.35)" }} />
    </div>
  );
}

// State at 25 °C (298 K), derived honestly from melting/boiling points.
function stateAtRoomTemp(meltK?: number, boilK?: number): string {
  const RT = 298.15;
  if (meltK === undefined) return "—";
  if (meltK > RT) return "Solid";
  if (boilK !== undefined && boilK <= RT) return "Gas";
  return "Liquid";
}

function ElementModal({ el, onClose }: { el: TableElement; onClose: () => void }) {
  const color = CATEGORY_COLORS[el.category];
  const lore = loreFor(el.symbol);
  const fact = FACTS[el.number];
  const shellCounts = el.shells.split(",");
  const valence = Number(shellCounts[shellCounts.length - 1]);
  const state = stateAtRoomTemp(el.meltK, el.boilK);
  const discovery = el.ancient ? "Antiquity" : el.discoveryYear ? String(el.discoveryYear) : "—";
  // Category colour pulled hard toward dark ink so it reads on cream parchment.
  const catInk = `color-mix(in oklab, ${color} 52%, ${INK})`;

  return (
    <ScriptureModal onClose={onClose}>
      <div className="px-6 py-7 md:px-10 md:py-9" style={{ color: INK }}>
        {/* ── Identity ── */}
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-7 md:text-left">
          <div className="relative inline-flex flex-shrink-0 items-center justify-center">
            <img src="/ui/frame-round-zodiac.png" alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[128%] w-[128%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-95" />
            <BohrModel electrons={el.shells} color={catInk} />
            <div className="absolute flex flex-col items-center justify-center rounded-full"
              style={{
                width: 52, height: 52,
                background: `radial-gradient(circle at 38% 32%, color-mix(in oklab, ${color} 72%, white 16%), color-mix(in oklab, ${color} 42%, ${INK}))`,
                border: `2.5px solid ${catInk}`,
                boxShadow: `0 0 18px -4px ${catInk}`,
              }}>
              <span className="font-sans text-xl font-bold text-white leading-none drop-shadow">{el.symbol}</span>
              <span className="text-white/70 leading-none" style={{ fontSize: "9px" }}>{el.number}</span>
            </div>
          </div>

          <div className="md:flex-1">
            <h2 className="font-display text-4xl md:text-5xl flex items-center justify-center md:justify-start gap-3" style={{ color: INK }}>
              {el.name}
              {lore?.alchemySymbol && (
                <span className="text-4xl leading-none" style={{ color: SCROLL_GOLD }} title="Alchemical symbol" aria-label="Alchemical symbol">
                  {lore.alchemySymbol}
                </span>
              )}
            </h2>
            <p className="mt-1.5 text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: catInk }}>{el.category}</p>
            <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
              {[
                ["State at 25 °C", state],
                ["Valence e⁻", Number.isFinite(valence) ? String(valence) : "—"],
                ["Discovered", discovery],
              ].map(([k, v]) => (
                <span key={k} className="rounded-full px-3 py-1 text-[11px]"
                  style={{ background: "rgba(44,31,14,0.05)", border: `1px solid ${catInk}`, color: INK_SOFT }}>
                  {k}: <span className="font-semibold" style={{ color: INK }}>{v}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="my-6 h-px" style={{ background: "rgba(138,90,18,0.4)" }} />

        <div className="md:grid md:grid-cols-5 md:gap-7">
          {/* The Numbers */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <STier color={catInk}>The Numbers</STier>
              <div className="grid grid-cols-2 gap-3">
                <SStat label="Atomic Number" value={String(el.number)} />
                <SStat label="Atomic Mass" value={`${fmtMass(el.mass)} u`} />
                <SStat label="Group" value={el.ypos <= 7 ? String(el.xpos) : el.category} />
                <SStat label="Period" value={el.ypos <= 7 ? String(el.ypos) : el.ypos === 9 ? "6" : "7"} />
                <SStat label="Melting Point" value={el.meltK !== undefined ? `${Math.round(el.meltK)} K` : "—"} sub={el.meltK !== undefined ? `${Math.round(el.meltK - 273.15)} °C` : undefined} />
                <SStat label="Boiling Point" value={el.boilK !== undefined ? `${Math.round(el.boilK)} K` : "—"} sub={el.boilK !== undefined ? `${Math.round(el.boilK - 273.15)} °C` : undefined} />
                <SStat label="Electronegativity" value={el.electronegativity !== undefined ? el.electronegativity.toFixed(2) : "—"} sub={el.electronegativity !== undefined ? "Pauling" : undefined} />
                <SStat label="State · 25 °C" value={state} />
              </div>
            </div>
          </div>

          {/* Structure, then the Story */}
          <div className="md:col-span-3 space-y-5 mt-6 md:mt-0">
            <div>
              <STier color={catInk}>Atomic Structure</STier>
              <div className="rounded-lg px-4 py-3 mb-3" style={{ background: "rgba(44,31,14,0.05)", border: "1px solid rgba(138,90,18,0.28)" }}>
                <div className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: INK_SOFT }}>Electron Configuration</div>
                <div className="font-sans text-sm font-semibold" style={{ color: INK }}>{electronConfig(el.number)}</div>
              </div>
              <div className="rounded-lg px-4 py-3 flex flex-wrap items-center gap-2" style={{ background: "rgba(44,31,14,0.05)", border: "1px solid rgba(138,90,18,0.28)" }}>
                <span className="text-[10px] uppercase tracking-[0.25em] mr-1 flex-shrink-0" style={{ color: INK_SOFT }}>Shells</span>
                {shellCounts.map((count, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-xs" style={{ color: INK_SOFT }}>›</span>}
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                      style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, border: `1px solid ${catInk}` }}>
                      <span className="font-sans text-xs font-semibold" style={{ color: catInk }}>{count}</span>
                      <span className="text-[9px] uppercase tracking-wide" style={{ color: INK_SOFT }}>e⁻</span>
                    </div>
                  </div>
                ))}
                {Number.isFinite(valence) && (
                  <span className="ml-auto text-[11px]" style={{ color: INK_SOFT }}>
                    <span className="font-semibold" style={{ color: catInk }}>{valence}</span> valence
                  </span>
                )}
              </div>
            </div>

            <div>
              <STier color={catInk}>Why It Matters</STier>
              <div className="rounded-lg p-4" style={{ background: `color-mix(in oklab, ${color} 10%, transparent)`, border: `1px solid ${catInk}` }}>
                <p className="text-sm leading-relaxed" style={{ color: INK }}>
                  {fact ?? `${el.name} is a ${el.category.toLowerCase()} — element ${el.number} of the periodic table, ${el.ancient ? "known since antiquity" : el.discoveryYear ? `discovered in ${el.discoveryYear}` : "a modern synthetic element"}.`}
                </p>
              </div>
            </div>

            {lore && (
              <div>
                <STier color={SCROLL_GOLD}>The Story</STier>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: INK_SOFT }}>The Name</div>
                    <p className="font-serif text-sm leading-relaxed" style={{ color: INK }}>{lore.etymology}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: INK_SOFT }}>The History</div>
                    <p className="font-serif text-sm leading-relaxed" style={{ color: INK }}>{lore.history}</p>
                  </div>
                  {lore.alchemy && (
                    <div className="rounded-lg p-3 flex gap-3 items-start" style={{ background: "rgba(138,90,18,0.08)", border: `1px solid ${SCROLL_GOLD}` }}>
                      {lore.alchemySymbol && (
                        <span className="text-2xl leading-none flex-shrink-0 mt-0.5" style={{ color: SCROLL_GOLD }} aria-hidden="true">{lore.alchemySymbol}</span>
                      )}
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: SCROLL_GOLD }}>The Alchemist's Eye</div>
                        <p className="font-serif text-sm leading-relaxed" style={{ color: INK }}>{lore.alchemy}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScriptureModal>
  );
}

function ElementsPage() {
  const [selected, setSelected] = useState<TableElement | null>(null);
  const [filter, setFilter] = useState<ElementCategory | "All">("All");
  const [search, setSearch] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  // Live filtering dims non-matching cells; the chart keeps its shape so
  // students never lose the spatial layout they know from class.
  const q = search.trim().toLowerCase();
  const matches = (el: TableElement) => {
    const matchCat = filter === "All" || el.category === filter;
    const matchSearch = !q ||
      el.name.toLowerCase().includes(q) ||
      el.symbol.toLowerCase().includes(q) ||
      String(el.number) === q;
    return matchCat && matchSearch;
  };
  const shown = PERIODIC_ELEMENTS.filter(matches).length;

  const runSearch = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const hits = PERIODIC_ELEMENTS.filter(matches);
    if (hits.length === 1) setSelected(hits[0]);
  };

  return (
    <div className="elements-readable grimoire-skin min-h-screen overflow-x-hidden text-spectral">
      {/* Theme-aware page backdrop (parchment by day, engraved night sky) — the
          same art the landing wears; its gradient quiets the lower page so the
          dense grid still reads. */}
      <div className="bg-grimoire-fixed" aria-hidden />

      <FloatingNav />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Plain typographic eyebrow — no pill badge (DESIGN_DIRECTION §11). */}
          <p className="text-xs tracking-[0.35em] text-wraith/80 uppercase mb-3">All 118 Elements</p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">The Periodic Table</h1>
          <p className="text-parchment max-w-xl mx-auto">
            The standard arrangement, exactly as in class. Tap any element for
            its full card — <Term id="atomic-mass">atomic mass</Term>, melting
            and boiling points, <Term id="electron-configuration">electron
            configuration</Term>, and its story.
          </p>
        </div>

        {/* Search — live as you type, one unified control with a visible
            button folded into the field (adviser item 11). */}
        <div className="mx-auto mb-6 max-w-2xl">
          <div
            className="flex items-center gap-2 rounded-2xl py-1.5 pl-4 pr-1.5 transition-colors"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)",
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 text-parchment/40"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, symbol, or atomic number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
              className="flex-1 bg-transparent py-1.5 text-base text-spectral placeholder:text-parchment/40 outline-none"
              aria-label="Search elements"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search"
                className="flex-shrink-0 px-1.5 text-xl leading-none text-parchment/40 transition hover:text-spectral">
                ×
              </button>
            )}
            <button
              onClick={runSearch}
              className="flex-shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: "var(--color-emerald-elixir)" }}
            >
              Search
            </button>
          </div>
          <div className="mt-2 px-1 text-right text-xs tabular-nums text-parchment/55">
            {shown === PERIODIC_ELEMENTS.length
              ? `Showing all ${PERIODIC_ELEMENTS.length} elements`
              : `${shown} of ${PERIODIC_ELEMENTS.length} match`}
          </div>
        </div>

        {/* Category filter — readable labels (adviser item 13) */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setFilter("All")}
            className={`rounded-full px-4 py-2 text-sm transition border ${filter === "All" ? "bg-wraith/20 text-wraith border-wraith/50" : "text-parchment border-parchment/20 hover:border-parchment/40"}`}>
            All Categories
          </button>
          {CATEGORY_LEGEND.map(cat => (
            <button key={cat}
              onClick={() => setFilter(filter === cat ? "All" : cat)}
              className={`rounded-full px-4 py-2 text-sm transition border ${filter === cat ? "text-spectral" : "text-parchment border-parchment/20 hover:border-parchment/40"}`}
              style={filter === cat ? { background: `color-mix(in oklab, ${CATEGORY_COLORS[cat]} 25%, transparent)`, borderColor: `color-mix(in oklab, ${CATEGORY_COLORS[cat]} 60%, transparent)`, color: CATEGORY_COLORS[cat] } : {}}>
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: CATEGORY_COLORS[cat] }} />
              {cat}
            </button>
          ))}
        </div>

        {/* The one true chart */}
        <div ref={gridRef} className="scroll-mt-28">
          <PeriodicGrid
            selectedNum={selected?.number ?? null}
            onSelect={setSelected}
            detailed
            look={(el) => familyLook(el, matches(el) ? 1 : 0.15)}
          />
        </div>

        {/* Legend */}
        <div className="mt-14 border-t border-parchment/15 pt-8">
          <p className="text-sm tracking-[0.3em] text-parchment/60 uppercase mb-4 text-center">Category Legend</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {CATEGORY_LEGEND.map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                <span className="text-sm text-parchment/80">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center parchment-border rounded-2xl p-10">
          <h2 className="font-display text-2xl mb-3">Explore them in 3D.</h2>
          <p className="text-parchment mb-6 max-w-sm mx-auto text-sm">Open the platform to interact with elements in augmented reality and run simulated reactions.</p>
          <Link to="/app" className="btn-arcane btn-arcane-hover">
            Open Platform
          </Link>
        </div>
      </div>

      {selected && <ElementModal el={selected} onClose={() => setSelected(null)} />}

      {/* The alchemist's workbench closes every guest page (DESIGN_DIRECTION §4). */}
      <div className="relative z-10" aria-hidden>
        <img src="/dark-alchemy-vibe/band-workbench.webp" alt=""
          className="h-44 w-full object-cover md:h-56"
          style={{ maskImage: "linear-gradient(180deg, transparent, black 38%)", WebkitMaskImage: "linear-gradient(180deg, transparent, black 38%)" }} />
      </div>
      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase relative z-10">
        ✦ AlcheMix — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
