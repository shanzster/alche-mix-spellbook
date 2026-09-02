import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Droplets,
  Flame,
  FlaskConical,
  ScrollText,
  ShieldCheck,
  Skull,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import {
  BASE_CARDS,
  POLYATOMIC_IONS,
  combine,
  isIon,
  type Hazard,
  type MixResult,
  type Reagent,
} from "../lib/cards";
import { useUserProfile, logPractice, recordCompound } from "../lib/profile";

export const Route = createFileRoute("/codex")({
  component: () => (
    <RequireRole role="student">
      <CompoundCodex />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-wraith)";
const GOLD = "var(--color-gold)";

// ════════════════════════════════════════════════════════════════════════════
//  The discoverable universe — every enriched compound `combine` can produce,
//  enumerated ONCE at module load from all reagent pairs.
// ════════════════════════════════════════════════════════════════════════════
const ALL_REAGENTS: Reagent[] = [...BASE_CARDS, ...POLYATOMIC_IONS];

interface CodexEntry {
  formula: string;
  /** Systematic name from the combiner. */
  name: string;
  commonName: string;
  uses: string;
  hazard: Hazard;
  bond: "ionic" | "covalent";
  unstable?: boolean;
  note?: string;
  family: string;
  /** The pair of reagents that forges it (first found). */
  ingredients: [Reagent, Reagent];
}

/** Derive a teaching family for a forged compound. Order of checks matters. */
function familyOf(res: MixResult, ingredients: [Reagent, Reagent]): string {
  const f = res.formula ?? "";
  const names = `${res.name ?? ""} ${res.commonName ?? ""}`.toLowerCase();
  if (names.includes("acid")) return "Acids";
  if (f.includes("OH") || names.includes("ammonia")) return "Bases & Hydroxides";
  if (f.includes("CO3")) return "Carbonates";
  if (f.includes("SO4") || f.includes("NO3") || f.includes("PO4"))
    return "Salts of Polyatomic Ions";
  if (ingredients.some((r) => r.symbol === "O")) return "Oxides";
  return "Salts & Binary Compounds";
}

const FAMILY_ORDER = [
  "Oxides",
  "Acids",
  "Bases & Hydroxides",
  "Carbonates",
  "Salts of Polyatomic Ions",
  "Salts & Binary Compounds",
];

function buildCodex(): CodexEntry[] {
  const seen = new Set<string>();
  const entries: CodexEntry[] = [];
  for (let i = 0; i < ALL_REAGENTS.length; i++) {
    for (let j = i + 1; j < ALL_REAGENTS.length; j++) {
      const a = ALL_REAGENTS[i];
      const b = ALL_REAGENTS[j];
      const res = combine(a, b);
      // Only enriched (real, documented) compounds enter the Codex.
      if (!res.valid || !res.formula || !res.commonName || seen.has(res.formula)) continue;
      seen.add(res.formula);
      entries.push({
        formula: res.formula,
        name: res.name ?? res.formula,
        commonName: res.commonName,
        uses: res.uses ?? "",
        hazard: res.hazard ?? "none",
        bond: res.bond ?? "ionic",
        unstable: res.unstable,
        note: res.note,
        family: familyOf(res, [a, b]),
        ingredients: [a, b],
      });
    }
  }
  entries.sort(
    (x, y) =>
      FAMILY_ORDER.indexOf(x.family) - FAMILY_ORDER.indexOf(y.family) ||
      x.formula.localeCompare(y.formula),
  );
  return entries;
}

/** Computed once at module load. */
const CODEX: CodexEntry[] = buildCodex();

// ── Hazard presentation ──────────────────────────────────────────────────────
const HAZARD_META: Record<Hazard, { label: string; color: string; Icon: typeof Skull }> = {
  toxic: { label: "Toxic", color: "var(--color-crimson)", Icon: Skull },
  corrosive: { label: "Corrosive", color: "var(--color-amber-scry)", Icon: Droplets },
  flammable: { label: "Flammable", color: "var(--color-amber-scry)", Icon: Flame },
  oxidiser: { label: "Oxidiser", color: "var(--color-amber-scry)", Icon: Flame },
  harmful: { label: "Harmful", color: "var(--color-gold)", Icon: AlertTriangle },
  none: { label: "Benign", color: "var(--color-emerald-elixir)", Icon: ShieldCheck },
};

/** Render a chemical formula with real subscripts (H2O → H₂O). */
function Formula({ f, className }: { f: string; className?: string }) {
  return (
    <span className={className}>
      {f.split(/(\d+)/).map((part, i) =>
        /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : <span key={i}>{part}</span>,
      )}
    </span>
  );
}

function reagentColor(r: Reagent): string {
  return r.color;
}
function reagentLabel(r: Reagent): string {
  return isIon(r) ? r.display : r.symbol;
}

// ════════════════════════════════════════════════════════════════════════════
//  The page
// ════════════════════════════════════════════════════════════════════════════
function CompoundCodex() {
  const { uid, profile } = useUserProfile();
  const discovered = useMemo(() => new Set(profile?.compounds ?? []), [profile?.compounds]);

  // Mixing bench state
  const [slots, setSlots] = useState<[Reagent | null, Reagent | null]>([null, null]);
  const [result, setResult] = useState<MixResult | null>(null);
  const loggedForge = useRef(false);

  // Metered hint — once per page visit
  const [hint, setHint] = useState<CodexEntry | null>(null);
  const hintSpent = hint !== null;

  // First-visit intro
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("alchemix-codex-intro")) setShowIntro(true);
    } catch {
      /* storage unavailable — skip the intro */
    }
  }, []);
  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem("alchemix-codex-intro", "1");
    } catch {
      /* ignore */
    }
  };

  const [a, b] = slots;
  const inSlots = (r: Reagent) => a?.symbol === r.symbol || b?.symbol === r.symbol;

  const pick = (r: Reagent) => {
    setResult(null);
    setSlots(([sa, sb]) => {
      // Tapping a reagent already on the bench removes it again.
      if (sa?.symbol === r.symbol) return [sb, null];
      if (sb?.symbol === r.symbol) return [sa, null];
      if (!sa) return [r, sb];
      if (!sb) return [sa, r];
      return [sa, r]; // both full — swap the second
    });
  };

  const clearSlot = (idx: 0 | 1) => {
    setResult(null);
    setSlots(([sa, sb]) => (idx === 0 ? [sb, null] : [sa, null]));
  };

  const forge = () => {
    if (!a || !b) return;
    const res = combine(a, b);
    setResult(res);
    if (!loggedForge.current) {
      loggedForge.current = true;
      void logPractice(uid, "codex");
    }
    if (res.valid && res.formula) void recordCompound(uid, res.formula);
  };

  const consultGrimoire = () => {
    if (hintSpent) return;
    // Deterministic: the first undiscovered entry in Codex order.
    const target = CODEX.find((e) => !discovered.has(e.formula));
    if (target) setHint(target);
  };

  // Grouping + progress
  const groups = useMemo(() => {
    const map = new Map<string, CodexEntry[]>();
    for (const e of CODEX) {
      const list = map.get(e.family) ?? [];
      list.push(e);
      map.set(e.family, list);
    }
    return FAMILY_ORDER.filter((f) => map.has(f)).map((f) => ({
      family: f,
      entries: map.get(f)!,
    }));
  }, []);
  const discoveredCount = CODEX.filter((e) => discovered.has(e.formula)).length;

  return (
    <StudentShell title="Compound Codex">
      <PageHeader
        eyebrow="The Alchemist's Life Work"
        title="The Compound Codex"
        subtitle="Mix two reagents on the bench and see what real chemistry allows. Every genuine compound you forge is inscribed forever in the Codex below."
        icon={BookOpen}
        accent={ACCENT}
        right={
          <div
            className="rounded-xl px-4 py-2.5 text-center"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
              border: `1px solid color-mix(in oklab, ${GOLD} 35%, transparent)`,
            }}
          >
            <div className="font-display text-xl" style={{ color: GOLD }}>
              {discoveredCount} <span className="text-parchment/50">/ {CODEX.length}</span>
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-parchment/60">
              discovered
            </div>
          </div>
        }
      />

      {/* ── First-visit intro ── */}
      {showIntro && (
        <div
          className="relative mb-6 rounded-2xl p-5 pr-12"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${ACCENT} 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))`,
            border: `1px solid color-mix(in oklab, ${ACCENT} 40%, transparent)`,
          }}
        >
          <button
            onClick={dismissIntro}
            aria-label="Dismiss introduction"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-parchment transition hover:text-spectral"
            style={{
              background: "color-mix(in oklab, var(--color-mist) 70%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <ScrollText className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: ACCENT }} />
            <div>
              <p className="font-display text-spectral mb-1">
                Welcome to your life's work, alchemist.
              </p>
              <p className="text-sm leading-relaxed text-parchment/80">
                Before you lie {CODEX.length} true compounds, hidden behind question marks. Old
                alchemists guessed; you will <span className="text-spectral">reason</span>. Metals
                give electrons, non-metals take them, and only pairings that balance will bind.
                Choose two reagents, press Forge, and let real valence rules decide. Fill every
                page of this Codex and you will have done what no medieval alchemist ever could.
              </p>
              <button
                onClick={dismissIntro}
                className="mt-3 rounded-lg px-3.5 py-1.5 text-xs font-display tracking-wide transition hover:brightness-110"
                style={{
                  color: ACCENT,
                  background: `color-mix(in oklab, ${ACCENT} 15%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)`,
                }}
              >
                Begin the work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ The Mixing Bench ════════ */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
          <FlaskConical className="h-4 w-4" style={{ color: ACCENT }} /> The Mixing Bench
        </h2>

        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Slots + forge */}
          <div className="mb-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {([0, 1] as const).map((idx) => {
              const r = slots[idx];
              return (
                <button
                  key={idx}
                  onClick={() => r && clearSlot(idx)}
                  aria-label={r ? `Remove ${r.name} from the bench` : `Empty reagent slot ${idx + 1}`}
                  className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl transition-all duration-150"
                  style={
                    r
                      ? {
                          background: `radial-gradient(circle at 40% 25%, color-mix(in oklab, ${reagentColor(r)} 30%, transparent), color-mix(in oklab, var(--color-slate-sunken) 85%, transparent))`,
                          border: `1.5px solid color-mix(in oklab, ${reagentColor(r)} 55%, transparent)`,
                          boxShadow: `0 0 26px -10px ${reagentColor(r)}`,
                        }
                      : {
                          background: "color-mix(in oklab, var(--color-mist) 40%, transparent)",
                          border:
                            "1.5px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)",
                        }
                  }
                >
                  {r ? (
                    <>
                      <span
                        className="font-sans text-2xl font-semibold leading-none"
                        style={{ color: reagentColor(r) }}
                      >
                        {reagentLabel(r)}
                      </span>
                      <span className="mt-1.5 px-1 text-center text-[10px] leading-tight text-parchment/70">
                        {r.name}
                      </span>
                      <span className="mt-1 text-[8px] uppercase tracking-[0.15em] text-parchment/40">
                        tap to remove
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-3xl text-parchment/30">?</span>
                  )}
                </button>
              );
            })}

            <span className="font-display text-2xl text-parchment/40">+</span>

            <button
              onClick={forge}
              disabled={!a || !b}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-display text-base tracking-wide transition-all duration-150 enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                color: "var(--color-slate-sunken)",
                background: `linear-gradient(135deg, ${GOLD}, color-mix(in oklab, ${GOLD} 70%, ${ACCENT}))`,
                boxShadow: a && b ? `0 8px 30px -12px ${GOLD}` : "none",
              }}
            >
              <Sparkles className="h-4.5 w-4.5" /> Forge
            </button>
          </div>

          {/* Palette — elements */}
          <p className="mb-1.5 px-1 text-[10px] tracking-[0.25em] uppercase text-parchment/45">
            Element cards
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {BASE_CARDS.map((c) => (
              <PaletteChip key={c.symbol} r={c} active={inSlots(c)} onPick={pick} />
            ))}
          </div>

          {/* Palette — polyatomic ions */}
          <p className="mb-1.5 px-1 text-[10px] tracking-[0.25em] uppercase text-parchment/45">
            Polyatomic ions — atom groups that travel as one
          </p>
          <div className="flex flex-wrap gap-2">
            {POLYATOMIC_IONS.map((p) => (
              <PaletteChip key={p.symbol} r={p} active={inSlots(p)} onPick={pick} />
            ))}
          </div>

          {/* ── Result: success reveal ── */}
          {result?.valid && result.formula && (
            <RevealCard result={result} known={result.commonName !== undefined} />
          )}

          {/* ── Result: the Alchemist's counsel (failure) ── */}
          {result && !result.valid && (
            <div
              className="mt-5 rounded-xl px-4 py-3.5"
              style={{
                background: "color-mix(in oklab, var(--color-amber-scry) 8%, transparent)",
                borderLeft: "3px solid color-mix(in oklab, var(--color-amber-scry) 60%, transparent)",
              }}
            >
              <p className="mb-1 flex items-center gap-2 font-display text-sm text-amber-scry">
                <ScrollText className="h-4 w-4" /> The Alchemist's Counsel
              </p>
              <p className="text-sm leading-relaxed text-parchment/85">
                No compound forms — and that is a discovery too. {result.reason} Nature refuses
                nothing out of spite; the electrons simply have nowhere sensible to go. Adjust
                your pairing and try again.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ════════ Consult the Grimoire — one hint per visit ════════ */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={consultGrimoire}
            disabled={hintSpent || discoveredCount >= CODEX.length}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              color: ACCENT,
              background: `color-mix(in oklab, ${ACCENT} 12%, transparent)`,
              border: `1px solid color-mix(in oklab, ${ACCENT} 40%, transparent)`,
            }}
          >
            <Wand2 className="h-4 w-4" /> Consult the Grimoire
          </button>
          <span className="text-xs text-parchment/55">
            {discoveredCount >= CODEX.length
              ? "The Codex is complete — the Grimoire has nothing left to whisper."
              : hintSpent
                ? "The Grimoire has spoken. It will speak again on your next visit."
                : "One whisper per visit — it will name a single ingredient of a hidden compound."}
          </span>
        </div>
        {hint && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed text-parchment/85"
            style={{
              background: `color-mix(in oklab, ${ACCENT} 8%, transparent)`,
              borderLeft: `3px solid color-mix(in oklab, ${ACCENT} 60%, transparent)`,
            }}
          >
            The Grimoire whispers: <span className="text-spectral">a hidden {hint.family.toLowerCase().replace(/s$/, "")}</span>{" "}
            calls for <span className="font-display" style={{ color: reagentColor(hint.ingredients[0]) }}>
              {hint.ingredients[0].name}
            </span>
            . What would balance it? Bring the second reagent yourself.
          </div>
        )}
      </section>

      {/* ════════ The Codex ════════ */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
          <BookOpen className="h-4 w-4" style={{ color: GOLD }} /> The Codex
          <span className="ml-auto font-display text-xs normal-case tracking-normal text-parchment/60">
            {discoveredCount} / {CODEX.length} discovered
          </span>
        </h2>

        {groups.map(({ family, entries }) => {
          const got = entries.filter((e) => discovered.has(e.formula)).length;
          const pct = Math.round((got / entries.length) * 100);
          return (
            <div key={family} className="mb-8">
              <div className="mb-2 flex items-center gap-3 px-1">
                <h3 className="font-display text-sm text-spectral">{family}</h3>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--color-parchment) 15%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`,
                    }}
                  />
                </div>
                <span className="text-xs text-parchment/55">
                  {got}/{entries.length} · {pct}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {entries.map((e) =>
                  discovered.has(e.formula) ? (
                    <DiscoveredTile key={e.formula} entry={e} />
                  ) : (
                    <UndiscoveredTile key={e.formula} entry={e} />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </section>
    </StudentShell>
  );
}

// ── Bench palette chip ───────────────────────────────────────────────────────
function PaletteChip({
  r,
  active,
  onPick,
}: {
  r: Reagent;
  active: boolean;
  onPick: (r: Reagent) => void;
}) {
  const color = reagentColor(r);
  return (
    <button
      onClick={() => onPick(r)}
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-all duration-150 hover:-translate-y-0.5"
      style={
        active
          ? {
              color,
              background: `color-mix(in oklab, ${color} 20%, transparent)`,
              border: `1px solid color-mix(in oklab, ${color} 55%, transparent)`,
              boxShadow: `0 0 18px -8px ${color}`,
            }
          : {
              color: "var(--color-parchment)",
              border: "1px solid var(--color-border)",
              background: "color-mix(in oklab, var(--color-mist) 35%, transparent)",
            }
      }
    >
      <span className="font-sans font-semibold" style={{ color }}>
        {reagentLabel(r)}
      </span>
      <span className="text-xs opacity-70">{r.name}</span>
    </button>
  );
}

// ── Success reveal card ──────────────────────────────────────────────────────
function RevealCard({ result, known }: { result: MixResult; known: boolean }) {
  const hz = HAZARD_META[result.hazard ?? "none"];
  const bondColor = result.bond === "ionic" ? "var(--color-amber-scry)" : "var(--color-emerald-elixir)";
  return (
    <div
      className="mt-5 rounded-2xl p-5"
      style={{
        background: `linear-gradient(150deg, color-mix(in oklab, ${GOLD} 12%, transparent), color-mix(in oklab, var(--color-slate-sunken) 90%, transparent))`,
        border: `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`,
        boxShadow: `0 0 50px -22px ${GOLD}`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] tracking-[0.25em] uppercase" style={{ color: GOLD }}>
            Compound forged
          </p>
          <Formula
            f={result.formula!}
            className="font-sans text-4xl font-semibold text-spectral"
          />
          <p className="mt-1.5 font-display text-lg text-spectral">{result.name}</p>
          {known && result.commonName && (
            <p className="text-sm text-parchment/70">{result.commonName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Bond-type badge */}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase"
            style={{
              color: bondColor,
              background: `color-mix(in oklab, ${bondColor} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${bondColor} 40%, transparent)`,
            }}
          >
            {result.bond} bond
          </span>
          {/* Hazard badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase"
            style={{
              color: hz.color,
              background: `color-mix(in oklab, ${hz.color} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${hz.color} 40%, transparent)`,
            }}
          >
            <hz.Icon className="h-3 w-3" /> {hz.label}
          </span>
          {result.unstable && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase"
              style={{
                color: "var(--color-crimson)",
                background: "color-mix(in oklab, var(--color-crimson) 14%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-crimson) 40%, transparent)",
              }}
            >
              <Flame className="h-3 w-3" /> Unstable
            </span>
          )}
        </div>
      </div>

      {known && result.uses && (
        <p className="mt-3 text-sm leading-relaxed text-parchment/85">
          <span className="font-display text-parchment">Uses:</span> {result.uses}
        </p>
      )}
      {result.note && (
        <p className="mt-1.5 text-xs leading-relaxed text-parchment/65">{result.note}</p>
      )}
      {!known && (
        <p className="mt-3 text-sm leading-relaxed text-parchment/70">
          The rules of valence allow this pairing, but it is too obscure for the Codex — only
          famed compounds earn a page. It is still recorded in your ledger of forgings.
        </p>
      )}
    </div>
  );
}

// ── Codex tiles ──────────────────────────────────────────────────────────────
function DiscoveredTile({ entry }: { entry: CodexEntry }) {
  const hz = HAZARD_META[entry.hazard];
  const bondColor =
    entry.bond === "ionic" ? "var(--color-amber-scry)" : "var(--color-emerald-elixir)";
  return (
    <div
      className="flex flex-col rounded-2xl p-3.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: `radial-gradient(circle at 35% 15%, color-mix(in oklab, ${GOLD} 14%, transparent), color-mix(in oklab, var(--color-slate-sunken) 85%, transparent))`,
        border: `1px solid color-mix(in oklab, ${GOLD} 35%, transparent)`,
        boxShadow: `0 8px 26px -18px ${GOLD}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <Formula f={entry.formula} className="font-sans text-xl font-semibold text-spectral" />
        <hz.Icon className="h-4 w-4 flex-shrink-0" style={{ color: hz.color }} aria-label={hz.label} />
      </div>
      <p className="mt-1 font-display text-sm leading-snug text-spectral">{entry.name}</p>
      <p className="text-[11px] leading-snug text-parchment/65">{entry.commonName}</p>
      <p className="mt-2 flex-1 text-[11px] leading-snug text-parchment/55">{entry.uses}</p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[8px] tracking-[0.12em] uppercase"
          style={{
            color: bondColor,
            background: `color-mix(in oklab, ${bondColor} 14%, transparent)`,
            border: `1px solid color-mix(in oklab, ${bondColor} 35%, transparent)`,
          }}
        >
          {entry.bond}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[9px] text-parchment/50">
          <Sparkles className="h-2.5 w-2.5" style={{ color: GOLD }} /> discovered
        </span>
      </div>
    </div>
  );
}

function UndiscoveredTile({ entry }: { entry: CodexEntry }) {
  return (
    <div
      className="flex min-h-[124px] flex-col items-center justify-center rounded-2xl p-3.5 opacity-70"
      style={{
        background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
        border: "1.5px dashed color-mix(in oklab, var(--color-parchment) 28%, transparent)",
      }}
    >
      <span className="font-display text-3xl text-parchment/30">?</span>
      <span className="mt-2 text-[10px] tracking-[0.15em] uppercase text-parchment/45">
        {entry.family}
      </span>
      <span className="mt-1 text-center text-[10px] leading-snug text-parchment/35">
        Forge it on the bench above
      </span>
    </div>
  );
}
