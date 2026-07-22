import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Atom, Zap } from "lucide-react";
import { FloatingNav } from "../components/FloatingNav";

// ── Bohr Model SVG ────────────────────────────────────────────────────────────
function BohrModel({ electrons, color }: { electrons: string; color: string }) {
  const shells = electrons.split(",").map(Number);
  const cx = 100;
  const cy = 100;
  const nucleusR = 14;
  const shellGap = 18;

  return (
    <svg
      viewBox="0 0 200 200"
      width="200"
      height="200"
      aria-label="Electron shell diagram"
    >
      {/* Orbit rings */}
      {shells.map((_, i) => {
        const r = nucleusR + (i + 1) * shellGap;
        return (
          <circle
            key={`orbit-${i}`}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.25"
          />
        );
      })}

      {/* Animated electrons on each shell */}
      {shells.map((count, shellIdx) => {
        const r = nucleusR + (shellIdx + 1) * shellGap;
        return Array.from({ length: count }).map((_, eIdx) => {
          const baseAngle = (2 * Math.PI * eIdx) / count;
          // stagger animation start per shell + electron
          const delay = -(shellIdx * 1.3 + eIdx * (6 / Math.max(count, 1)));
          const duration = 4 + shellIdx * 1.8;
          const ex = cx + r * Math.cos(baseAngle);
          const ey = cy + r * Math.sin(baseAngle);
          return (
            <g key={`e-${shellIdx}-${eIdx}`}>
              {/* Glow */}
              <circle cx={ex} cy={ey} r="4" fill={color} opacity="0.15">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${cx} ${cy}`}
                  to={`360 ${cx} ${cy}`}
                  dur={`${duration}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Core dot */}
              <circle cx={ex} cy={ey} r="2.2" fill={color} opacity="0.9">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${cx} ${cy}`}
                  to={`360 ${cx} ${cy}`}
                  dur={`${duration}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        });
      })}

      {/* Nucleus */}
      <circle
        cx={cx} cy={cy} r={nucleusR}
        fill={`color-mix(in oklab, ${color} 30%, transparent)`}
        stroke={color}
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Nucleus glow pulse */}
      <circle cx={cx} cy={cy} r={nucleusR} fill={color} opacity="0.12">
        <animate attributeName="r" values={`${nucleusR};${nucleusR + 4};${nucleusR}`} dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.22;0.12" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export const Route = createFileRoute("/elements")({
  component: ElementsPage,
});

type Category =
  | "Alkali Metal" | "Alkaline Earth Metal" | "Transition Metal"
  | "Post-transition Metal" | "Metalloid" | "Nonmetal"
  | "Halogen" | "Noble Gas" | "Lanthanide" | "Actinide";

type Tier = "Core" | "Common" | "Expert";

interface Element {
  number: number; symbol: string; name: string;
  mass: string; category: Category; group: string;
  period: number; electrons: string; fact: string;
  tier: Tier;
}

const CATEGORY_COLORS: Record<Category, string> = {
  "Alkali Metal":           "#f87171",
  "Alkaline Earth Metal":   "#fb923c",
  "Transition Metal":       "#a78bfa",
  "Post-transition Metal":  "#60a5fa",
  "Metalloid":              "#4ade80",
  "Nonmetal":               "#facc15",
  "Halogen":                "#34d399",
  "Noble Gas":              "#38bdf8",
  "Lanthanide":             "#f472b6",
  "Actinide":               "#fb7185",
};

const ELEMENTS: Element[] = [
  // ── Tier 1: Core Elements (Atomic Numbers 1–20) ─────────────────────────────
  { tier:"Core", number:1,  symbol:"H",  name:"Hydrogen",      mass:"1.008",   category:"Nonmetal",            group:"1",  period:1, electrons:"1",     fact:"Most abundant element in the universe — makes up ~75% of all normal matter by mass." },
  { tier:"Core", number:2,  symbol:"He", name:"Helium",         mass:"4.003",   category:"Noble Gas",           group:"18", period:1, electrons:"2",     fact:"Chemically inert noble gas; second most abundant in the universe. Used in balloons and MRI cooling." },
  { tier:"Core", number:3,  symbol:"Li", name:"Lithium",        mass:"6.941",   category:"Alkali Metal",        group:"1",  period:2, electrons:"2,1",   fact:"Lightest metal; used in rechargeable batteries and as a mood-stabilising medication." },
  { tier:"Core", number:4,  symbol:"Be", name:"Beryllium",      mass:"9.012",   category:"Alkaline Earth Metal",group:"2",  period:2, electrons:"2,2",   fact:"Extremely stiff, lightweight metal; used in aerospace components and X-ray windows." },
  { tier:"Core", number:5,  symbol:"B",  name:"Boron",          mass:"10.811",  category:"Metalloid",           group:"13", period:2, electrons:"2,3",   fact:"Essential trace element for plants; used in borosilicate glass, ceramics, and detergents." },
  { tier:"Core", number:6,  symbol:"C",  name:"Carbon",         mass:"12.011",  category:"Nonmetal",            group:"14", period:2, electrons:"2,4",   fact:"Basis of all known life. Exists as diamond (hardest natural material), graphite, and fullerenes." },
  { tier:"Core", number:7,  symbol:"N",  name:"Nitrogen",       mass:"14.007",  category:"Nonmetal",            group:"15", period:2, electrons:"2,5",   fact:"Makes up 78% of Earth's atmosphere. Essential component of amino acids, proteins, and DNA." },
  { tier:"Core", number:8,  symbol:"O",  name:"Oxygen",         mass:"15.999",  category:"Nonmetal",            group:"16", period:2, electrons:"2,6",   fact:"Third most abundant element in the universe. Essential for cellular respiration and combustion." },
  { tier:"Core", number:9,  symbol:"F",  name:"Fluorine",       mass:"18.998",  category:"Halogen",             group:"17", period:2, electrons:"2,7",   fact:"Most electronegative element. Highly reactive; forms strong bonds with nearly every other element." },
  { tier:"Core", number:10, symbol:"Ne", name:"Neon",           mass:"20.180",  category:"Noble Gas",           group:"18", period:2, electrons:"2,8",   fact:"Produces the familiar red-orange glow in neon signs. Completely chemically inert." },
  { tier:"Core", number:11, symbol:"Na", name:"Sodium",         mass:"22.990",  category:"Alkali Metal",        group:"1",  period:3, electrons:"2,8,1", fact:"Highly reactive metal. Combined with chlorine it forms table salt (NaCl), essential for life." },
  { tier:"Core", number:12, symbol:"Mg", name:"Magnesium",      mass:"24.305",  category:"Alkaline Earth Metal",group:"2",  period:3, electrons:"2,8,2", fact:"Burns with a brilliant white flame. Central atom in chlorophyll — essential for photosynthesis." },
  { tier:"Core", number:13, symbol:"Al", name:"Aluminium",      mass:"26.982",  category:"Post-transition Metal",group:"13",period:3, electrons:"2,8,3", fact:"Most abundant metal in Earth's crust. Lightweight, corrosion-resistant, and infinitely recyclable." },
  { tier:"Core", number:14, symbol:"Si", name:"Silicon",        mass:"28.086",  category:"Metalloid",           group:"14", period:3, electrons:"2,8,4", fact:"Second most abundant element in Earth's crust. The backbone of modern electronics and solar cells." },
  { tier:"Core", number:15, symbol:"P",  name:"Phosphorus",     mass:"30.974",  category:"Nonmetal",            group:"15", period:3, electrons:"2,8,5", fact:"Essential for DNA, RNA, and ATP (the cell's energy currency). White phosphorus is extremely toxic." },
  { tier:"Core", number:16, symbol:"S",  name:"Sulfur",         mass:"32.06",   category:"Nonmetal",            group:"16", period:3, electrons:"2,8,6", fact:"Bright yellow solid with a distinct smell. Used in gunpowder, matches, vulcanising rubber, and fertilisers." },
  { tier:"Core", number:17, symbol:"Cl", name:"Chlorine",       mass:"35.45",   category:"Halogen",             group:"17", period:3, electrons:"2,8,7", fact:"Yellow-green toxic gas used to disinfect water. Forms salts (like NaCl) readily with metals." },
  { tier:"Core", number:18, symbol:"Ar", name:"Argon",          mass:"39.948",  category:"Noble Gas",           group:"18", period:3, electrons:"2,8,8", fact:"Third most abundant gas in Earth's atmosphere (~1%). Used in welding and incandescent light bulbs." },
  { tier:"Core", number:19, symbol:"K",  name:"Potassium",      mass:"39.098",  category:"Alkali Metal",        group:"1",  period:4, electrons:"2,8,8,1", fact:"Essential for nerve impulse transmission and muscle contraction. Symbol K comes from 'Kalium'." },
  { tier:"Core", number:20, symbol:"Ca", name:"Calcium",        mass:"40.078",  category:"Alkaline Earth Metal",group:"2",  period:4, electrons:"2,8,8,2", fact:"Most abundant metal in the human body. Essential for bones, teeth, blood clotting, and muscle function." },

  // ── Tier 2: Common Transition & Heavy Metals ────────────────────────────────
  { tier:"Common", number:24, symbol:"Cr", name:"Chromium",     mass:"51.996",  category:"Transition Metal",    group:"6",  period:4, electrons:"2,8,13,1",  fact:"Gives stainless steel its corrosion resistance. Used in chrome plating and as a green pigment in glass." },
  { tier:"Common", number:25, symbol:"Mn", name:"Manganese",    mass:"54.938",  category:"Transition Metal",    group:"7",  period:4, electrons:"2,8,13,2",  fact:"Essential enzyme cofactor; used in steel production to improve strength and hardness." },
  { tier:"Common", number:26, symbol:"Fe", name:"Iron",         mass:"55.845",  category:"Transition Metal",    group:"8",  period:4, electrons:"2,8,14,2",  fact:"Most common element on Earth by mass. Backbone of the steel industry; Fe²⁺ and Fe³⁺ are its main ionic forms." },
  { tier:"Common", number:28, symbol:"Ni", name:"Nickel",       mass:"58.693",  category:"Transition Metal",    group:"10", period:4, electrons:"2,8,16,2",  fact:"Used in alloys, nickel-cadmium batteries, and as a catalyst for hydrogenation reactions." },
  { tier:"Common", number:29, symbol:"Cu", name:"Copper",       mass:"63.546",  category:"Transition Metal",    group:"11", period:4, electrons:"2,8,18,1",  fact:"Excellent electrical and thermal conductor. One of the first metals used by humans (Bronze Age)." },
  { tier:"Common", number:30, symbol:"Zn", name:"Zinc",         mass:"65.38",   category:"Transition Metal",    group:"12", period:4, electrons:"2,8,18,2",  fact:"Essential trace element. Used to galvanise steel, in sunscreen (ZnO), and in Zn-C batteries." },
  { tier:"Common", number:47, symbol:"Ag", name:"Silver",       mass:"107.868", category:"Transition Metal",    group:"11", period:5, electrons:"2,8,18,18,1", fact:"Best electrical conductor of all metals. Has strong antibacterial properties; used in jewellery and photography." },
  { tier:"Common", number:50, symbol:"Sn", name:"Tin",          mass:"118.710", category:"Post-transition Metal",group:"14",period:5, electrons:"2,8,18,18,4", fact:"Used since antiquity in bronze alloys (Cu+Sn). Key component of solder and tin-plated steel cans." },
  { tier:"Common", number:56, symbol:"Ba", name:"Barium",       mass:"137.327", category:"Alkaline Earth Metal",group:"2",  period:6, electrons:"2,8,18,18,8,2", fact:"Used in barium sulfate 'meals' for X-ray imaging of the digestive tract. Burns with a green flame." },
  { tier:"Common", number:78, symbol:"Pt", name:"Platinum",     mass:"195.084", category:"Transition Metal",    group:"10", period:6, electrons:"2,8,18,32,17,1", fact:"Precious, corrosion-resistant metal used in catalytic converters, jewellery, and cancer treatment drugs." },
  { tier:"Common", number:79, symbol:"Au", name:"Gold",         mass:"196.967", category:"Transition Metal",    group:"11", period:6, electrons:"2,8,18,32,18,1", fact:"Most malleable metal; does not tarnish or corrode. Monetary standard for millennia; used in electronics." },
  { tier:"Common", number:82, symbol:"Pb", name:"Lead",         mass:"207.2",   category:"Post-transition Metal",group:"14",period:6, electrons:"2,8,18,32,18,4", fact:"Dense, toxic metal. Used in batteries, radiation shielding. Banned from paints and pipes due to neurotoxicity." },

  // ── Tier 3: Expert / Occasional Elements ────────────────────────────────────
  { tier:"Expert", number:33, symbol:"As", name:"Arsenic",      mass:"74.922",  category:"Metalloid",           group:"15", period:4, electrons:"2,8,18,5",  fact:"Highly toxic metalloid historically used as a poison. Now used in semiconductors and wood preservatives." },
  { tier:"Expert", number:35, symbol:"Br", name:"Bromine",      mass:"79.904",  category:"Halogen",             group:"17", period:4, electrons:"2,8,18,7",  fact:"One of only two liquid non-metal elements at room temperature. Used in flame retardants and photography." },
  { tier:"Expert", number:36, symbol:"Kr", name:"Krypton",      mass:"83.798",  category:"Noble Gas",           group:"18", period:4, electrons:"2,8,18,8",  fact:"Used in high-power flash lamps and certain lasers. Named from Greek 'kryptos' meaning hidden." },
  { tier:"Expert", number:48, symbol:"Cd", name:"Cadmium",      mass:"112.411", category:"Transition Metal",    group:"12", period:5, electrons:"2,8,18,18,2", fact:"Toxic heavy metal used in Ni-Cd rechargeable batteries. Accumulates in kidneys — a major environmental concern." },
  { tier:"Expert", number:53, symbol:"I",  name:"Iodine",       mass:"126.904", category:"Halogen",             group:"17", period:5, electrons:"2,8,18,18,7", fact:"Essential for thyroid hormone synthesis. Used as an antiseptic (iodine solution) and in photography." },
  { tier:"Expert", number:54, symbol:"Xe", name:"Xenon",        mass:"131.293", category:"Noble Gas",           group:"18", period:5, electrons:"2,8,18,18,8", fact:"Used in high-intensity arc lamps, medical imaging, and ion propulsion engines for spacecraft." },
  { tier:"Expert", number:80, symbol:"Hg", name:"Mercury",      mass:"200.59",  category:"Transition Metal",    group:"12", period:6, electrons:"2,8,18,32,18,2", fact:"Only metal liquid at standard conditions. Highly toxic — accumulates in food chains. Once used in thermometers." },
  { tier:"Expert", number:90, symbol:"Th", name:"Thorium",      mass:"232.038", category:"Actinide",            group:"—",  period:7, electrons:"2,8,18,32,18,10,2", fact:"Naturally radioactive; potential alternative nuclear fuel. More abundant in Earth's crust than uranium." },
  { tier:"Expert", number:92, symbol:"U",  name:"Uranium",      mass:"238.029", category:"Actinide",            group:"—",  period:7, electrons:"2,8,18,32,21,9,2", fact:"Heaviest naturally occurring element. Fuel for nuclear reactors; U-235 undergoes fission to release energy." },
  { tier:"Expert", number:94, symbol:"Pu", name:"Plutonium",    mass:"[244]",   category:"Actinide",            group:"—",  period:7, electrons:"2,8,18,32,24,8,2", fact:"Synthetic element used in nuclear weapons and reactors. Highly radioactive; Pu-239 has a 24,100-year half-life." },
];
const CATEGORIES = Array.from(new Set(ELEMENTS.map(e => e.category)));

function ElementBlob({ el, onClick }: { el: Element; onClick: () => void }) {
  const color = CATEGORY_COLORS[el.category];
  const size = 52 + (el.number % 5) * 6;
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center rounded-full transition-all duration-300 hover:scale-110 group animate-breathing"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 38% 32%, color-mix(in oklab, ${color} 70%, white 20%), color-mix(in oklab, ${color} 40%, transparent))`,
        border: `2px solid color-mix(in oklab, ${color} 55%, transparent)`,
        boxShadow: `0 0 16px -4px ${color}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        animationDelay: `${(el.number * 0.17) % 3}s`,
        animationDuration: `${2.8 + (el.number % 5) * 0.4}s`,
      }}
    >
      <span className="font-display text-xs font-bold text-white drop-shadow-sm leading-none"
        style={{ fontSize: size < 62 ? "10px" : "12px" }}>
        {el.symbol}
      </span>
      <span className="text-white/60 leading-none mt-0.5" style={{ fontSize: "8px" }}>{el.number}</span>
      {/* Hover glow ring */}
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ boxShadow: `0 0 28px 4px ${color}` }} />
    </button>
  );
}

function ElementModal({ el, onClose }: { el: Element; onClose: () => void }) {
  const color = CATEGORY_COLORS[el.category];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div
        className="relative max-w-md w-full rounded-2xl p-8 text-spectral overflow-y-auto"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 95%, transparent)",
          border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
          boxShadow: `0 0 60px -12px ${color}`,
          maxHeight: "90vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 text-parchment/60 hover:text-spectral transition">
          <X className="h-5 w-5" />
        </button>

        {/* Symbol + Bohr model header */}
        <div className="text-center mb-6">
          {/* Bohr model with symbol nucleus overlay */}
          <div className="relative inline-flex items-center justify-center mb-2">
            <BohrModel electrons={el.electrons} color={color} />
            {/* Symbol sits at the nucleus */}
            <div
              className="absolute flex flex-col items-center justify-center rounded-full"
              style={{
                width: 48, height: 48,
                background: `radial-gradient(circle at 38% 32%, color-mix(in oklab, ${color} 70%, white 20%), color-mix(in oklab, ${color} 30%, transparent))`,
                border: `2.5px solid color-mix(in oklab, ${color} 65%, transparent)`,
                boxShadow: `0 0 24px -4px ${color}`,
              }}
            >
              <span className="font-display text-xl text-white drop-shadow leading-none">{el.symbol}</span>
              <span className="text-white/60 leading-none" style={{ fontSize: "9px" }}>{el.number}</span>
            </div>
          </div>

          <h2 className="font-display text-3xl">{el.name}</h2>
          <p className="text-xs tracking-[0.3em] uppercase mt-1" style={{ color }}>{el.category}</p>
          <span className={`inline-block mt-2 rounded-full px-3 py-0.5 text-[10px] tracking-[0.25em] uppercase font-display ${el.tier === "Core" ? "bg-wraith/20 text-wraith border border-wraith/40" : el.tier === "Common" ? "bg-gold/20 text-gold border border-gold/40" : "bg-crimson/20 text-crimson border border-crimson/40"}`}>
            Tier {el.tier === "Core" ? "1 — Core" : el.tier === "Common" ? "2 — Common" : "3 — Expert"}
          </span>
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Atomic Number", value: el.number },
            { label: "Atomic Mass", value: el.mass },
            { label: "Group", value: el.group },
            { label: "Period", value: el.period },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-3 text-center"
              style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}>
              <div className="text-[10px] tracking-[0.25em] text-parchment/60 uppercase mb-1">{label}</div>
              <div className="font-display text-sm text-spectral">{value}</div>
            </div>
          ))}
        </div>

        {/* Electron shell breakdown */}
        <div className="rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-2"
          style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 15%, transparent)" }}>
          <span className="text-[10px] tracking-[0.25em] text-parchment/60 uppercase mr-1 flex-shrink-0">Shells</span>
          {el.electrons.split(",").map((count, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-parchment/30 text-xs">›</span>}
              <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                style={{
                  background: `color-mix(in oklab, ${color} 15%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                }}>
                <span className="font-display text-xs" style={{ color }}>{count}</span>
                <span className="text-[9px] text-parchment/50 uppercase tracking-wide">e⁻</span>
              </div>
            </div>
          ))}
        </div>

        {/* Fact */}
        <div className="rounded-lg p-4"
          style={{ background: `color-mix(in oklab, ${color} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 25%, transparent)` }}>
          <div className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color }}>Did you know?</div>
          <p className="text-parchment text-sm leading-relaxed">{el.fact}</p>
        </div>
      </div>
    </div>
  );
}

function ElementsPage() {
  const [selected, setSelected] = useState<Element | null>(null);
  const [filter, setFilter] = useState<Category | "All">("All");
  const [tierFilter, setTierFilter] = useState<Tier | "All">("All");
  const [search, setSearch] = useState("");

  const visible = ELEMENTS.filter(e => {
    const matchCat  = filter === "All" || e.category === filter;
    const matchTier = tierFilter === "All" || e.tier === tierFilter;
    const matchSearch = search === "" ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.symbol.toLowerCase().includes(search.toLowerCase()) ||
      String(e.number).includes(search);
    return matchCat && matchTier && matchSearch;
  });

  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <FloatingNav />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-wraith/30 bg-wraith/10 px-4 py-1.5 text-xs tracking-[0.3em] text-wraith uppercase mb-4">
            <Atom className="h-3 w-3" /> All 118 Elements
          </div>
          <h1 className="font-display text-4xl md:text-5xl mb-4">The Periodic Table</h1>
          <p className="text-parchment max-w-xl mx-auto">Click any element to learn more. Each blob represents a unique element — colour-coded by category.</p>
        </div>

        {/* Search + Tier Filter + Category Filter */}
        <div className="flex flex-col gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by name, symbol, or atomic number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-full px-5 py-2.5 text-sm text-spectral placeholder:text-parchment/40 outline-none"
            style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-parchment) 22%, transparent)" }}
          />
          {/* Tier filter row */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] tracking-[0.3em] text-parchment/50 uppercase mr-1">Tier</span>
            {(["All", "Core", "Common", "Expert"] as const).map(t => (
              <button key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded-full px-3 py-1 text-xs transition border ${tierFilter === t ? "text-spectral" : "text-parchment/70 border-parchment/20 hover:border-parchment/40"}`}
                style={tierFilter === t && t !== "All" ? {
                  background: t === "Core" ? "color-mix(in oklab, var(--color-wraith) 20%, transparent)" : t === "Common" ? "color-mix(in oklab, var(--color-gold) 20%, transparent)" : "color-mix(in oklab, var(--color-crimson) 20%, transparent)",
                  borderColor: t === "Core" ? "var(--color-wraith)" : t === "Common" ? "var(--color-gold)" : "var(--color-crimson)",
                  color: t === "Core" ? "var(--color-wraith)" : t === "Common" ? "var(--color-gold)" : "var(--color-crimson)",
                } : tierFilter === t ? { background: "color-mix(in oklab, var(--color-wraith) 15%, transparent)", borderColor: "var(--color-wraith)" } : {}}>
                {t === "All" ? "All Tiers" : t === "Core" ? "1 — Core (1–20)" : t === "Common" ? "2 — Common Metals" : "3 — Expert"}
              </button>
            ))}
          </div>
          {/* Category filter row */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("All")}
              className={`rounded-full px-3 py-1.5 text-xs transition border ${filter === "All" ? "bg-wraith/20 text-wraith border-wraith/50" : "text-parchment border-parchment/20 hover:border-parchment/40"}`}>
              All Categories
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat}
                onClick={() => setFilter(cat as Category)}
                className={`rounded-full px-3 py-1.5 text-xs transition border ${filter === cat ? "text-spectral" : "text-parchment border-parchment/20 hover:border-parchment/40"}`}
                style={filter === cat ? { background: `color-mix(in oklab, ${CATEGORY_COLORS[cat as Category]} 25%, transparent)`, borderColor: `color-mix(in oklab, ${CATEGORY_COLORS[cat as Category]} 60%, transparent)`, color: CATEGORY_COLORS[cat as Category] } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-parchment/60 mb-6 tracking-[0.2em] uppercase">{visible.length} element{visible.length !== 1 ? "s" : ""} shown</p>

        {/* Blob grid */}
        <div className="flex flex-wrap gap-4 justify-center">
          {visible.map(el => (
            <ElementBlob key={el.number} el={el} onClick={() => setSelected(el)} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-16 border-t border-parchment/15 pt-8">
          <p className="text-xs tracking-[0.3em] text-parchment/50 uppercase mb-4 text-center">Category Legend</p>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat as Category] }} />
                <span className="text-xs text-parchment/70">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center parchment-border rounded-2xl p-10">
          <h2 className="font-display text-2xl mb-3">Explore them in 3D.</h2>
          <p className="text-parchment mb-6 max-w-sm mx-auto text-sm">Open the platform to interact with elements in augmented reality and run simulated reactions.</p>
          <Link to="/app" className="btn-arcane btn-arcane-hover">
            <Zap className="h-4 w-4" /> Open Platform
          </Link>
        </div>
      </div>

      {selected && <ElementModal el={selected} onClose={() => setSelected(null)} />}

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase relative z-10">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
