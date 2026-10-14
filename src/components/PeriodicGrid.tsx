import {
  PERIODIC_ELEMENTS, FBLOCK_MARKERS, type TableElement, type ElementCategory,
} from "../lib/periodic-table-data";

/**
 * THE periodic table grid — one component for every surface (adviser item 19:
 * the module table and the public page must be the same chart).
 *
 * Standard IUPAC arrangement from the data's xpos/ypos: 18 groups, 7 periods,
 * lanthanides and actinides detached below. `detailed` renders the classic
 * classroom cell (number top-left, mass opposite, big symbol, name).
 */

export const CATEGORY_COLORS: Record<ElementCategory, string> = {
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

export const CATEGORY_LEGEND: ElementCategory[] = [
  "Alkali Metal", "Alkaline Earth Metal", "Transition Metal", "Post-transition Metal",
  "Metalloid", "Nonmetal", "Halogen", "Noble Gas", "Lanthanide", "Actinide",
];

/** Atomic mass, rounded the way wall charts print it. */
export function fmtMass(mass: string): string {
  const m = parseFloat(mass);
  if (Number.isNaN(m)) return mass;
  return m % 1 ? m.toFixed(2) : String(m);
}

export interface CellLook {
  color: string;
  opacity: number;
  /** Small always-visible value line (trend lenses). */
  value?: string;
}

export function familyLook(el: TableElement, dim = 1): CellLook {
  return { color: CATEGORY_COLORS[el.category], opacity: dim };
}

function GridCell({ el, active, look, onClick, detailed }: {
  el: TableElement; active: boolean; look: CellLook; onClick: () => void; detailed: boolean;
}) {
  const { color, opacity, value } = look;
  const frame: React.CSSProperties = {
    gridColumn: el.xpos,
    gridRow: el.ypos,
    background: `color-mix(in oklab, ${color} ${active ? 30 : 15}%, transparent)`,
    border: `1px solid color-mix(in oklab, ${color} ${active ? 90 : 45}%, transparent)`,
    boxShadow: active ? `0 0 0 2px ${color}, 0 0 18px -4px ${color}` : "none",
    opacity,
    color,
  };
  if (detailed) {
    return (
      <button
        onClick={onClick}
        title={`${el.number} · ${el.name}`}
        style={frame}
        className="group relative flex aspect-[13/15] min-w-[52px] flex-col items-center justify-center rounded-[5px] leading-none transition-all duration-150 hover:z-10 hover:brightness-125"
      >
        <span className="absolute left-1 top-1 text-[9px] font-semibold tabular-nums text-parchment/75">{el.number}</span>
        <span className="absolute right-1 top-1 max-w-[58%] truncate text-right text-[8px] tabular-nums text-parchment/60">{fmtMass(el.mass)}</span>
        <span className="mt-2 font-sans text-base font-bold sm:text-lg">{el.symbol}</span>
        <span className="mt-0.5 w-full truncate px-0.5 text-center text-[7px] text-parchment/70 sm:text-[8px]">{el.name}</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      title={`${el.number} · ${el.name}`}
      style={frame}
      className="group relative flex aspect-square min-w-[30px] flex-col items-center justify-center rounded-[5px] leading-none transition-all duration-150 hover:z-10 hover:brightness-125"
    >
      <span className="absolute left-[3px] top-[2px] text-[7px] font-medium text-parchment/60 sm:text-[8px]">{el.number}</span>
      <span className="font-sans text-[11px] font-semibold sm:text-sm">{el.symbol}</span>
      {value !== undefined ? (
        <span className="max-w-full truncate px-0.5 text-[6px] tabular-nums text-parchment/70 sm:text-[7px]">{value}</span>
      ) : (
        <span className="hidden max-w-full truncate px-0.5 text-[6px] text-parchment/55 lg:block">{el.name}</span>
      )}
    </button>
  );
}

export function PeriodicGrid({ selectedNum, onSelect, detailed = true, look }: {
  selectedNum?: number | null;
  onSelect: (el: TableElement) => void;
  /** Classic classroom cells (default) vs the compact lens cells. */
  detailed?: boolean;
  /** How to paint a cell; defaults to the family colours. */
  look?: (el: TableElement) => CellLook;
}) {
  const paint = look ?? ((el: TableElement) => familyLook(el));
  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <div
        className={`grid gap-[3px] ${detailed ? "min-w-[1060px]" : "min-w-[640px]"}`}
        style={{ gridTemplateColumns: `repeat(18, minmax(${detailed ? 52 : 30}px, 1fr))` }}
      >
        {PERIODIC_ELEMENTS.map((el) => (
          <GridCell
            key={el.number}
            el={el}
            active={el.number === selectedNum}
            look={paint(el)}
            onClick={() => onSelect(el)}
            detailed={detailed}
          />
        ))}

        {/* Group-3 markers pointing to the f-block rows below. */}
        {FBLOCK_MARKERS.map((m) => (
          <div
            key={m.label}
            style={{ gridColumn: m.xpos, gridRow: m.ypos, border: `1px dashed color-mix(in oklab, ${CATEGORY_COLORS[m.category]} 55%, transparent)` }}
            className={`flex items-center justify-center rounded-[5px] text-parchment/60 ${detailed ? "aspect-[13/15] text-[9px]" : "aspect-square text-[7px] sm:text-[9px]"}`}
          >
            {m.label}
          </div>
        ))}

        {/* Spacer between the main block and the f-block rows. */}
        <div style={{ gridColumn: "1 / span 18", gridRow: 8, height: 10 }} />
      </div>
    </div>
  );
}
