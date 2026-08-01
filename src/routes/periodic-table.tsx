import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Grid3x3, Search, Orbit, Box, Check, FlaskConical } from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice } from "../lib/profile";

export const Route = createFileRoute("/periodic-table")({
  component: () => (
    <RequireAuth>
      <PeriodicTable />
    </RequireAuth>
  ),
});

// ── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Alkali Metal": "#f87171",
  "Alkaline Earth Metal": "#fb923c",
  "Transition Metal": "#a78bfa",
  "Post-transition Metal": "#60a5fa",
  "Metalloid": "#4ade80",
  "Nonmetal": "#facc15",
  "Halogen": "#34d399",
  "Noble Gas": "#38bdf8",
};

interface El {
  number: number; symbol: string; name: string; mass: string;
  category: string; electrons: string; state: "Solid" | "Liquid" | "Gas";
  uses: string[]; examples: string; note: string;
}

// ── Rich, education-first dataset ───────────────────────────────────────────
const ELEMENTS: El[] = [
  { number: 1, symbol: "H", name: "Hydrogen", mass: "1.008", category: "Nonmetal", electrons: "1", state: "Gas",
    uses: ["Rocket fuel", "Making ammonia for fertiliser", "Hydrogen fuel cells"],
    examples: "Bonded with oxygen it makes every drop of water (H₂O).",
    note: "The lightest and most abundant element in the universe — stars are mostly hydrogen." },
  { number: 2, symbol: "He", name: "Helium", mass: "4.003", category: "Noble Gas", electrons: "2", state: "Gas",
    uses: ["Filling balloons & airships", "Cooling MRI magnets", "Deep-sea diving gas mixes"],
    examples: "The gas that makes party balloons float and your voice go squeaky.",
    note: "So light it escapes Earth's gravity — and it was first discovered in the Sun, not on Earth." },
  { number: 3, symbol: "Li", name: "Lithium", mass: "6.94", category: "Alkali Metal", electrons: "2,1", state: "Solid",
    uses: ["Rechargeable batteries", "Mood-stabilising medicine", "Heat-resistant glass"],
    examples: "Powers your phone, laptop and electric cars.",
    note: "The lightest metal — soft enough to cut with a knife and light enough to float on water." },
  { number: 6, symbol: "C", name: "Carbon", mass: "12.011", category: "Nonmetal", electrons: "2,4", state: "Solid",
    uses: ["Making steel", "Diamonds & pencil 'lead'", "The backbone of all living things"],
    examples: "Every living thing — you included — is built around carbon.",
    note: "The same element forms both diamond (hardest natural material) and soft, slippery graphite." },
  { number: 7, symbol: "N", name: "Nitrogen", mass: "14.007", category: "Nonmetal", electrons: "2,5", state: "Gas",
    uses: ["Fertilisers", "Preserving packaged food", "Liquid nitrogen for freezing"],
    examples: "Makes up 78% of the air you breathe.",
    note: "Its molecules are so unreactive it's pumped into crisp packets to keep them fresh." },
  { number: 8, symbol: "O", name: "Oxygen", mass: "15.999", category: "Nonmetal", electrons: "2,6", state: "Gas",
    uses: ["Breathing & hospital medicine", "Making steel", "Rocket propellant"],
    examples: "Every breath you take and every fire that burns needs it.",
    note: "Reactive enough to rust iron and power your cells — about 21% of the air is oxygen." },
  { number: 9, symbol: "F", name: "Fluorine", mass: "18.998", category: "Halogen", electrons: "2,7", state: "Gas",
    uses: ["Fluoride in toothpaste", "Non-stick coatings (Teflon)", "Refrigerant gases"],
    examples: "Added to toothpaste and tap water to protect your teeth.",
    note: "The most reactive element of all — it reacts with almost everything, even glass." },
  { number: 10, symbol: "Ne", name: "Neon", mass: "20.180", category: "Noble Gas", electrons: "2,8", state: "Gas",
    uses: ["Glowing signs", "High-voltage indicators", "Some lasers"],
    examples: "The red-orange glow of classic 'neon' signs.",
    note: "A full outer shell makes it completely unreactive — it simply glows when electrified." },
  { number: 11, symbol: "Na", name: "Sodium", mass: "22.990", category: "Alkali Metal", electrons: "2,8,1", state: "Solid",
    uses: ["Table salt (with chlorine)", "Orange street lamps", "Soap making"],
    examples: "Half of the salt on your food is sodium.",
    note: "So reactive that pure sodium bursts into flame in water — yet it's essential for your nerves." },
  { number: 12, symbol: "Mg", name: "Magnesium", mass: "24.305", category: "Alkaline Earth Metal", electrons: "2,8,2", state: "Solid",
    uses: ["Lightweight alloys", "Fireworks & flares", "Dietary supplements"],
    examples: "Burns with a brilliant white light in fireworks and flares.",
    note: "It sits at the centre of chlorophyll — without it, plants couldn't photosynthesise." },
  { number: 13, symbol: "Al", name: "Aluminium", mass: "26.982", category: "Post-transition Metal", electrons: "2,8,3", state: "Solid",
    uses: ["Drink cans & foil", "Aircraft bodies", "Power lines"],
    examples: "Drink cans, kitchen foil and aeroplane fuselages.",
    note: "The most abundant metal in Earth's crust — light, strong and endlessly recyclable." },
  { number: 14, symbol: "Si", name: "Silicon", mass: "28.086", category: "Metalloid", electrons: "2,8,4", state: "Solid",
    uses: ["Computer chips", "Solar panels", "Glass & ceramics"],
    examples: "The 'silicon' in Silicon Valley — it runs every computer.",
    note: "A semiconductor: it conducts electricity just enough to switch signals on and off." },
  { number: 16, symbol: "S", name: "Sulfur", mass: "32.06", category: "Nonmetal", electrons: "2,8,6", state: "Solid",
    uses: ["Making sulfuric acid", "Vulcanising rubber for tyres", "Gunpowder & matches"],
    examples: "The yellow crust around volcanoes and hot springs.",
    note: "It gives rotten eggs their smell — and the acid made from it is the world's most-produced chemical." },
  { number: 17, symbol: "Cl", name: "Chlorine", mass: "35.45", category: "Halogen", electrons: "2,8,7", state: "Gas",
    uses: ["Disinfecting water & pools", "Household bleach", "Making PVC plastic"],
    examples: "Keeps swimming pools and drinking water safe.",
    note: "A toxic green gas on its own, but bonded with sodium it becomes harmless table salt." },
  { number: 19, symbol: "K", name: "Potassium", mass: "39.098", category: "Alkali Metal", electrons: "2,8,8,1", state: "Solid",
    uses: ["Fertilisers", "Salt substitutes", "Nerve & muscle signals"],
    examples: "Bananas are famous for being rich in it.",
    note: "Vital for your heartbeat and nerves — its symbol K comes from the Latin 'kalium'." },
  { number: 20, symbol: "Ca", name: "Calcium", mass: "40.078", category: "Alkaline Earth Metal", electrons: "2,8,8,2", state: "Solid",
    uses: ["Cement & concrete", "Building bones & teeth", "Antacid tablets"],
    examples: "Builds your bones and teeth; found in milk and cheese.",
    note: "The most abundant metal in your body — and the main ingredient of chalk, marble and seashells." },
  { number: 26, symbol: "Fe", name: "Iron", mass: "55.845", category: "Transition Metal", electrons: "2,8,14,2", state: "Solid",
    uses: ["Steel for buildings & cars", "Tools & machinery", "Carrying oxygen in your blood"],
    examples: "Steel skyscrapers, cars — and the haemoglobin in your blood.",
    note: "The most common element on Earth by mass, and the reason your blood is red." },
  { number: 29, symbol: "Cu", name: "Copper", mass: "63.546", category: "Transition Metal", electrons: "2,8,18,1", state: "Solid",
    uses: ["Electrical wiring", "Water pipes", "Coins & bronze"],
    examples: "The wires in your walls and the pipes under your sink.",
    note: "One of the first metals humans used — it slowly turns green as it weathers, like the Statue of Liberty." },
  { number: 79, symbol: "Au", name: "Gold", mass: "196.967", category: "Transition Metal", electrons: "2,8,18,32,18,1", state: "Solid",
    uses: ["Jewellery", "Electronics connectors", "Dentistry"],
    examples: "Rings, medals and the gold contacts inside phones.",
    note: "So unreactive it never tarnishes — gold buried for thousands of years comes out still shining." },
];

// ── 2D Bohr diagram (SVG, self-animating) ───────────────────────────────────
function BohrSVG({ el }: { el: El }) {
  const color = CATEGORY_COLORS[el.category];
  const shells = el.electrons.split(",").map(Number);
  const size = 260, cx = size / 2, cy = size / 2, nucleusR = 22;
  const maxR = size / 2 - 16;
  const step = shells.length ? (maxR - nucleusR - 6) / shells.length : 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" aria-label={`Bohr diagram of ${el.name}`}>
      {shells.map((count, i) => {
        const r = nucleusR + 6 + step * (i + 1);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
            <g>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${i % 2 ? -360 : 360} ${cx} ${cy}`} dur={`${9 + i * 3}s`} repeatCount="indefinite" />
              {Array.from({ length: count }).map((_, e) => {
                const a = (2 * Math.PI * e) / count;
                return <circle key={e} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
              })}
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={nucleusR} fill={`color-mix(in oklab, ${color} 35%, transparent)`} stroke={color} strokeWidth="2" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-sans)" fontSize="20" fontWeight="600" fill="var(--color-spectral)">{el.symbol}</text>
    </svg>
  );
}

function ElementRow({ el, active, onClick }: { el: El; active: boolean; onClick: () => void }) {
  const color = CATEGORY_COLORS[el.category];
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150"
      style={{
        background: active ? `color-mix(in oklab, ${color} 16%, transparent)` : "transparent",
        boxShadow: active ? `inset 3px 0 0 ${color}` : "none",
      }}>
      <span className="flex h-9 w-9 flex-col items-center justify-center rounded-md flex-shrink-0 font-sans"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`, color }}>
        <span className="text-sm leading-none font-semibold">{el.symbol}</span>
        <span className="text-[8px] leading-none opacity-70">{el.number}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-spectral">{el.name}</span>
        <span className="block text-[10px] tracking-[0.1em] uppercase text-parchment/50 truncate">{el.category}</span>
      </span>
    </button>
  );
}

function PeriodicTable() {
  const { uid } = useUserProfile();
  const [selected, setSelected] = useState<El>(ELEMENTS[3]); // Carbon
  const [view, setView] = useState<"bohr" | "3d">("3d");
  const [search, setSearch] = useState("");

  useEffect(() => { if (uid) logPractice(uid, "periodic-table"); }, [uid]);

  const filtered = useMemo(() => ELEMENTS.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.symbol.toLowerCase().includes(search.toLowerCase()) ||
    String(e.number).includes(search),
  ), [search]);

  const color = CATEGORY_COLORS[selected.category];

  return (
    <ModuleShell
      title="Periodic Table"
      eyebrow="Element Codex"
      icon={Grid3x3}
      accent="var(--color-wraith)"
      subtitle="Choose an element to study it — see it in 3D or as a Bohr diagram, and learn what it's really used for."
    >
      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        {/* Column 1 — element list */}
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search element…"
              className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none"
              style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }} />
          </div>
          <div className="space-y-1 max-h-[42vh] lg:max-h-[64vh] overflow-y-auto pr-1">
            {filtered.map((el) => (
              <ElementRow key={el.number} el={el} active={el.number === selected.number} onClick={() => setSelected(el)} />
            ))}
            {filtered.length === 0 && <p className="text-sm text-parchment/50 px-3 py-4">No element found.</p>}
          </div>
        </div>

        {/* Column 2 — detail */}
        <div>
          {/* Identity */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl flex-shrink-0 font-sans"
              style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`, boxShadow: `0 0 24px -8px ${color}`, color }}>
              <span className="text-2xl leading-none font-semibold">{selected.symbol}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{selected.number}</span>
            </div>
            <div>
              <h2 className="font-display text-2xl">{selected.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] tracking-[0.12em] uppercase">
                <span className="rounded-full px-2 py-0.5" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>{selected.category}</span>
                <span className="text-parchment/60">{selected.state}</span>
                <span className="text-parchment/60">{selected.mass} u</span>
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="inline-flex rounded-full p-1 mb-3" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
            {([["3d", "3D View", Box], ["bohr", "Bohr Model", Orbit]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setView(key)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs tracking-[0.1em] uppercase transition"
                style={view === key ? { background: `color-mix(in oklab, ${color} 20%, transparent)`, color } : { color: "var(--color-parchment)" }}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Viewer */}
          <div className="relative rounded-2xl overflow-hidden h-[380px]"
            style={{ background: `radial-gradient(ellipse at 50% 40%, color-mix(in oklab, ${color} 20%, transparent), color-mix(in oklab, var(--color-slate-sunken) 82%, transparent))`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
            {view === "3d" ? (
              <BohrModel3D key={selected.symbol} interactive electrons={selected.electrons} color={color} nucleusColor="#fbbf24" label={selected.symbol} />
            ) : (
              <div className="flex h-full items-center justify-center p-6"><BohrSVG el={selected} /></div>
            )}
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] uppercase text-parchment/50">
              {view === "3d" ? "drag to spin ⟳" : `Shells: ${selected.electrons}`}
            </span>
          </div>

          {/* Educational content */}
          <div className="mt-5 space-y-4">
            <div className="rounded-xl p-4" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2 mb-3 text-teal">
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="text-[10px] tracking-[0.2em] uppercase font-display">What it's used for</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {selected.uses.map((u) => (
                  <li key={u} className="flex items-start gap-2 text-sm text-parchment">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-teal" /> {u}
                  </li>
                ))}
              </ul>
            </div>

            <DidYouKnow>{selected.examples}</DidYouKnow>
            <ConceptCard title={selected.name}>{selected.note}</ConceptCard>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
