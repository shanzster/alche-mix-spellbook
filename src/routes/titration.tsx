import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Beaker, Droplet, FlaskConical, RotateCcw, Star, Trophy } from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { ConceptCard, DidYouKnow } from "../components/Learn";
import { useUserProfile, logPractice, recordTrial } from "../lib/profile";

export const Route = createFileRoute("/titration")({
  component: () => (
    <RequireRole role="student">
      <Titration />
    </RequireRole>
  ),
});

const ACCENT = "var(--color-wraith)";

// The cell: 25 mL of acid in the flask, titrated with 0.1 M NaOH.
const Va = 25,
  Cb = 0.1;
const KA = 1.8e-5, // ethanoic acid
  PKA = -Math.log10(KA),
  KW = 1e-14;

type AcidId = "hcl" | "acetic";
const ACIDS: Record<AcidId, { formula: string; name: string; strong: boolean }> = {
  hcl: { formula: "HCl", name: "hydrochloric acid (strong)", strong: true },
  acetic: { formula: "CH₃COOH", name: "ethanoic acid (weak, Ka 1.8×10⁻⁵)", strong: false },
};

type IndicatorId = "phen" | "methyl" | "bromo";
const INDICATORS: Record<
  IndicatorId,
  {
    name: string;
    low: number;
    high: number;
    /** null = colourless in acid form (phenolphthalein). */
    acidColor: string | null;
    baseColor: string;
    acidLabel: string;
    baseLabel: string;
  }
> = {
  phen: {
    name: "Phenolphthalein",
    low: 8.2,
    high: 10.0,
    acidColor: null,
    baseColor: "#ec4899",
    acidLabel: "colourless",
    baseLabel: "pink",
  },
  methyl: {
    name: "Methyl orange",
    low: 3.1,
    high: 4.4,
    acidColor: "#dc2626",
    baseColor: "#f59e0b",
    acidLabel: "red",
    baseLabel: "yellow",
  },
  bromo: {
    name: "Bromothymol blue",
    low: 6.0,
    high: 7.6,
    acidColor: "#eab308",
    baseColor: "#2563eb",
    acidLabel: "yellow",
    baseLabel: "blue",
  },
};

/** pH of a weak-acid solution of concentration c (quadratic, no approximation). */
function weakInitialPH(c: number): number {
  const h = (-KA + Math.sqrt(KA * KA + 4 * KA * c)) / 2;
  return -Math.log10(h);
}

/** pH at the equivalence point for the chosen acid at concentration Ca. */
function equivalencePH(acid: AcidId, Ca: number): number {
  if (ACIDS[acid].strong) return 7;
  const veq = (Ca * Va) / Cb;
  const cSalt = (Ca * Va) / (Va + veq); // A⁻ concentration (M) at equivalence
  const oh = Math.sqrt((KW / KA) * cSalt);
  return 14 + Math.log10(oh);
}

/** Full titration pH: strong/strong by mole difference; weak acid with Ka. */
function pHat(acid: AcidId, Ca: number, Vb: number): number {
  const molA = (Ca * Va) / 1000;
  const molB = (Cb * Vb) / 1000;
  const totalL = (Va + Vb) / 1000;
  let pH: number;
  if (ACIDS[acid].strong) {
    if (Math.abs(molA - molB) < 1e-12) pH = 7;
    else if (molA > molB) pH = Math.min(7, -Math.log10((molA - molB) / totalL));
    else pH = Math.max(7, 14 + Math.log10((molB - molA) / totalL));
  } else {
    const eqPH = equivalencePH(acid, Ca);
    if (molB <= 1e-12) {
      pH = weakInitialPH(Ca); // initial: HA dissociation from Ka
    } else if (molB < molA - 1e-12) {
      // Buffer region — Henderson–Hasselbalch, kept between the initial and equivalence pH.
      const hh = PKA + Math.log10(molB / (molA - molB));
      pH = Math.min(eqPH, Math.max(weakInitialPH(Ca), hh));
    } else if (Math.abs(molB - molA) < 1e-12) {
      pH = eqPH; // equivalence: hydrolysis of the conjugate base A⁻
    } else {
      pH = Math.max(eqPH, 14 + Math.log10((molB - molA) / totalL)); // excess strong base
    }
  }
  return Math.max(0, Math.min(14, pH));
}

// Universal-indicator colour by pH (educational reference bar).
function phColor(pH: number): string {
  const stops: [number, string][] = [
    [0, "#e11d48"],
    [3, "#f97316"],
    [5, "#facc15"],
    [7, "#22c55e"],
    [9, "#0ea5e9"],
    [11, "#4f46e5"],
    [14, "#7c3aed"],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i],
      [p1, c1] = stops[i + 1];
    if (pH <= p1) return mix(c0, c1, (pH - p0) / (p1 - p0));
  }
  return stops[stops.length - 1][1];
}
function mixRgb(a: string, b: string, t: number): [number, number, number] {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.max(0, Math.min(1, t));
  return [0, 1, 2].map((i) => Math.round(pa[i] + (pb[i] - pa[i]) * k)) as [number, number, number];
}
function mix(a: string, b: string, t: number): string {
  const [r, g, bl] = mixRgb(a, b, t);
  return `rgb(${r},${g},${bl})`;
}
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = mixRgb(hex, hex, 0);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
function mixRgba(a: string, b: string, t: number, alpha: number): string {
  const [r, g, bl] = mixRgb(a, b, t);
  return `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
}

/** One-line "is this the right indicator?" verdict for the chosen combination. */
function indicatorVerdict(acid: AcidId, ind: IndicatorId): { good: boolean; text: string } {
  if (ACIDS[acid].strong) {
    if (ind === "bromo")
      return {
        good: true,
        text: "Ideal here — its 6.0–7.6 range brackets pH 7, exactly where a strong–strong equivalence sits.",
      };
    if (ind === "phen")
      return {
        good: true,
        text: "Works well — the near-vertical jump at equivalence sweeps straight through 8.2–10, so the first permanent pink lands within a drop of 25 mL per 0.1 M.",
      };
    return {
      good: true,
      text: "Usable but tight — it finishes turning just before true equivalence, because the steep jump only clips its 3.1–4.4 range.",
    };
  }
  if (ind === "phen")
    return {
      good: true,
      text: "The right choice — a weak-acid equivalence sits basic (≈ pH 8.7 here), inside phenolphthalein's 8.2–10 range.",
    };
  if (ind === "bromo")
    return {
      good: false,
      text: "Slightly early — it turns below pH 7.6, but a weak-acid equivalence sits near pH 8.7. Your endpoint will undershoot a little.",
    };
  return {
    good: false,
    text: "Wrong tool — methyl orange turns deep in the buffer region, far before equivalence. The endpoint would badly undershoot the true value.",
  };
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            color: i < n ? "var(--color-gold)" : "color-mix(in oklab, var(--color-parchment) 30%, transparent)",
            fill: i < n ? "var(--color-gold)" : "none",
          }}
        />
      ))}
    </span>
  );
}

function pill(active: boolean) {
  return active
    ? {
        background: `color-mix(in oklab, ${ACCENT} 20%, transparent)`,
        color: ACCENT,
        border: `1px solid color-mix(in oklab, ${ACCENT} 45%, transparent)`,
      }
    : {
        color: "var(--color-parchment)",
        border: "1px solid color-mix(in oklab, var(--color-parchment) 18%, transparent)",
      };
}

function randomUnknown(): number {
  return +(0.05 + Math.random() * 0.2).toFixed(4); // 0.05–0.25 M, hidden from the student
}

function Titration() {
  const { uid, profile } = useUserProfile();
  useEffect(() => {
    if (uid) void logPractice(uid, "titration");
  }, [uid]);

  const [mode, setMode] = useState<"practice" | "trial">("practice");
  const [acid, setAcid] = useState<AcidId>("hcl");
  const [indicator, setIndicator] = useState<IndicatorId>("phen");
  const [pour, setPour] = useState<"precise" | "steady">("precise");
  const [Vb, setVb] = useState(0);

  // Trial ("Assay of the Unknown") state.
  const [unknown, setUnknown] = useState(randomUnknown);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<null | { stars: number; errPct: number; notes: string[] }>(
    null,
  );
  const startRef = useRef(Date.now());

  const trial = mode === "trial";
  const Ca = trial ? unknown : 0.1;
  const VMAX = trial ? 80 : 50;
  const EQUIV = (Ca * Va) / Cb;
  const pH = pHat(acid, Ca, Vb);
  const eqPH = equivalencePH(acid, Ca);

  // Steady pour: hold to open the stopcock — easy to overshoot.
  const pourRef = useRef<number | null>(null);
  const stopPour = () => {
    if (pourRef.current !== null) {
      window.clearInterval(pourRef.current);
      pourRef.current = null;
    }
  };
  const startPour = () => {
    if (pourRef.current !== null) return;
    pourRef.current = window.setInterval(() => {
      setVb((v) => Math.min(VMAX, +(v + 0.35).toFixed(2)));
    }, 80);
  };
  useEffect(() => stopPour, []);

  const curve = useMemo(() => {
    // Practice shows the full theoretical curve; the trial only traces where you've poured.
    const upTo = trial ? Vb : VMAX;
    const pts: string[] = [];
    for (let v = 0; v <= upTo + 1e-9; v += VMAX / 160)
      pts.push(`${(v / VMAX) * 300},${(1 - pHat(acid, Ca, v) / 14) * 180}`);
    return pts.join(" ");
  }, [acid, Ca, VMAX, trial, Vb]);

  // Indicator colour in the flask.
  const ind = INDICATORS[indicator];
  const t = Math.max(0, Math.min(1, (pH - ind.low) / (ind.high - ind.low)));
  const liquidBg = ind.acidColor
    ? `linear-gradient(180deg, ${mixRgba(ind.acidColor, ind.baseColor, t, 0.55)}, ${mixRgba(ind.acidColor, ind.baseColor, t, 0.8)})`
    : `linear-gradient(180deg, ${rgba(ind.baseColor, t * 0.6)}, ${rgba(ind.baseColor, t * 0.85)})`;

  const near = Math.abs(Vb - EQUIV) < 0.6;
  const note = indicatorVerdict(acid, indicator);
  const best = profile?.trials?.titration;

  const reset = () => {
    stopPour();
    setVb(0);
  };
  const newUnknown = () => {
    stopPour();
    setUnknown(randomUnknown());
    setVb(0);
    setGuess("");
    setVerdict(null);
    startRef.current = Date.now();
  };
  const switchMode = (m: "practice" | "trial") => {
    if (m === mode) return;
    setMode(m);
    reset();
    if (m === "trial") {
      setUnknown(randomUnknown());
      setGuess("");
      setVerdict(null);
      startRef.current = Date.now();
    }
  };

  const grade = () => {
    const g = parseFloat(guess);
    if (!isFinite(g) || g <= 0) return;
    const err = Math.abs(g - unknown) / unknown;
    const stars = err <= 0.05 ? 3 : err <= 0.1 ? 2 : err <= 0.2 ? 1 : 0;
    const notes: string[] = [];
    if (stars === 3) {
      notes.push("A precise assay — within 5% of the true concentration. The Guild would certify this.");
    } else if (g > unknown) {
      notes.push(
        `Your value runs high — the classic overshoot: the ${ind.baseLabel} held permanently before you recorded, meaning you poured past the endpoint and counted the excess as acid.`,
      );
    } else {
      notes.push(
        `Your value runs low — you likely recorded before the true endpoint, while the ${ind.baseLabel} flash still faded on swirling. Titrate to the first colour that persists.`,
      );
    }
    if (!note.good)
      notes.push(
        `Indicator check: ${ind.name.toLowerCase()} is a poor match for ${ACIDS[acid].formula} — ${note.text}`,
      );
    setVerdict({ stars, errPct: err * 100, notes });
    void recordTrial(uid, "titration", {
      score: stars,
      outOf: 3,
      stars,
      timeSec: Math.round((Date.now() - startRef.current) / 1000),
    });
  };

  return (
    <StudentShell title="Titration">
      <PageHeader
        eyebrow="Acid–Base Titration"
        title="Find the neutral point, drop by drop."
        subtitle="Choose your acid and indicator, then add 0.1 M sodium hydroxide to 25 mL of acid. Watch the pH climb — and jump at the equivalence point."
        icon={Beaker}
        accent={ACCENT}
      />

      {/* Configuration bar */}
      <div
        className="rounded-2xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-3 items-end"
        style={{
          background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Mode</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => switchMode("practice")}
              className="rounded-full px-3 py-1 text-xs transition"
              style={pill(!trial)}
            >
              Practice
            </button>
            <button
              onClick={() => switchMode("trial")}
              className="rounded-full px-3 py-1 text-xs transition"
              style={pill(trial)}
            >
              <Trophy className="inline h-3 w-3 mr-1 -mt-0.5" />
              Assay of the Unknown
            </button>
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Acid in the flask</div>
          <div className="flex gap-1.5">
            {(Object.keys(ACIDS) as AcidId[]).map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAcid(a);
                  reset();
                }}
                className="rounded-full px-3 py-1 text-xs transition"
                style={pill(acid === a)}
                title={ACIDS[a].name}
              >
                {ACIDS[a].formula}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Indicator</div>
          <div className="flex gap-1.5">
            {(Object.keys(INDICATORS) as IndicatorId[]).map((i) => (
              <button
                key={i}
                onClick={() => setIndicator(i)}
                className="rounded-full px-3 py-1 text-xs transition"
                style={pill(indicator === i)}
                title={`${INDICATORS[i].acidLabel} → ${INDICATORS[i].baseLabel}, pH ${INDICATORS[i].low}–${INDICATORS[i].high}`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5"
                  style={{ background: INDICATORS[i].baseColor }}
                />
                {INDICATORS[i].name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5">Burette hand</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                stopPour();
                setPour("precise");
              }}
              className="rounded-full px-3 py-1 text-xs transition"
              style={pill(pour === "precise")}
            >
              Precise
            </button>
            <button
              onClick={() => setPour("steady")}
              className="rounded-full px-3 py-1 text-xs transition"
              style={pill(pour === "steady")}
            >
              Steady pour
            </button>
          </div>
        </div>
        <div className="basis-full -mt-1">
          <p className="text-xs leading-relaxed" style={{ color: note.good ? "var(--color-emerald-elixir)" : "var(--color-gold)" }}>
            {note.good ? "✓ " : "⚠ "}
            {ind.name} with {ACIDS[acid].formula}: {note.text}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-6 items-start">
        {/* Beaker + readout */}
        <div
          className="rounded-2xl p-6 flex flex-col items-center"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="relative h-52 w-40 mb-4">
            {/* beaker body */}
            <div
              className="absolute inset-x-0 bottom-0 top-6 rounded-b-2xl rounded-t-md overflow-hidden"
              style={{
                border: "2px solid color-mix(in oklab, var(--color-parchment) 40%, transparent)",
                borderTop: "none",
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 transition-all duration-300"
                style={{
                  height: `${35 + (Vb / VMAX) * 45}%`,
                  background: liquidBg,
                  borderTop: "2px solid rgba(255,255,255,0.25)",
                }}
              />
              {!trial && near && (
                <div
                  className="absolute inset-0 animate-breathing"
                  style={{ boxShadow: `inset 0 0 30px ${rgba(ind.baseColor, 0.5)}` }}
                />
              )}
            </div>
            {/* burette drip */}
            <Droplet className="absolute left-1/2 -translate-x-1/2 top-0 h-5 w-5 text-wraith" />
          </div>

          <div className="text-center">
            <div className="font-display text-4xl" style={{ color: phColor(pH) }}>
              pH {pH.toFixed(2)}
            </div>
            <div className="text-xs text-parchment/60 mt-1">{Vb.toFixed(2)} mL NaOH added</div>
            <div
              className="text-[11px] mt-2"
              style={{
                color: !trial && near ? "var(--color-gold)" : "var(--color-parchment)",
              }}
            >
              {!trial && near
                ? `≈ Equivalence point (pH ${eqPH.toFixed(1)})`
                : pH < 7
                  ? "Still acidic"
                  : "Now basic"}
            </div>
            <div className="text-[11px] mt-1 text-parchment/50">
              Flask: {t < 0.02 ? ind.acidLabel : t > 0.98 ? ind.baseLabel : "changing…"}
            </div>
          </div>
        </div>

        {/* Curve + controls */}
        <div>
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <svg viewBox="0 0 300 180" className="w-full" style={{ height: 200 }}>
              {[0, 7, 14].map((g) => (
                <g key={g}>
                  <line
                    x1="0"
                    x2="300"
                    y1={(1 - g / 14) * 180}
                    y2={(1 - g / 14) * 180}
                    stroke="color-mix(in oklab, var(--color-parchment) 20%, transparent)"
                    strokeDasharray="3 3"
                  />
                  <text x="2" y={(1 - g / 14) * 180 - 2} fontSize="9" fill="var(--color-parchment)">
                    pH {g}
                  </text>
                </g>
              ))}
              {/* indicator transition band */}
              <rect
                x="0"
                width="300"
                y={(1 - ind.high / 14) * 180}
                height={((ind.high - ind.low) / 14) * 180}
                fill={rgba(ind.baseColor, 0.1)}
              />
              {/* equivalence marker — hidden during the trial (that's the puzzle!) */}
              {!trial && (
                <line
                  x1={(EQUIV / VMAX) * 300}
                  x2={(EQUIV / VMAX) * 300}
                  y1="0"
                  y2="180"
                  stroke="color-mix(in oklab, var(--color-gold) 45%, transparent)"
                  strokeDasharray="4 3"
                />
              )}
              {Vb > 0 || !trial ? (
                <polyline points={curve} fill="none" stroke="var(--color-wraith)" strokeWidth="2.5" />
              ) : null}
              <circle
                cx={(Vb / VMAX) * 300}
                cy={(1 - pH / 14) * 180}
                r="5"
                fill={phColor(pH)}
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>
            {trial && (
              <p className="text-[11px] text-parchment/50 mt-1">
                The curve only traces where you have poured — the equivalence point is yours to find.
              </p>
            )}
          </div>

          {/* pH colour scale with the indicator's window */}
          <div className="mb-4">
            <div
              className="h-3 rounded-full relative"
              style={{
                background:
                  "linear-gradient(90deg, #e11d48, #f97316, #facc15, #22c55e, #0ea5e9, #4f46e5, #7c3aed)",
              }}
            >
              <div
                className="absolute inset-y-0 rounded-sm"
                style={{
                  left: `${(ind.low / 14) * 100}%`,
                  width: `${((ind.high - ind.low) / 14) * 100}%`,
                  border: "1.5px solid rgba(255,255,255,0.85)",
                }}
                title={`${ind.name} changes ${ind.acidLabel} → ${ind.baseLabel} over pH ${ind.low}–${ind.high}`}
              />
            </div>
            <div className="relative h-3">
              <div
                className="absolute -top-0.5 h-4 w-1 rounded-full"
                style={{
                  left: `${(pH / 14) * 100}%`,
                  background: "#fff",
                  boxShadow: "0 0 6px rgba(0,0,0,0.5)",
                }}
              />
            </div>
            <div className="text-[10px] text-parchment/50 mt-0.5">
              White window: {ind.name.toLowerCase()} turns {ind.acidLabel} → {ind.baseLabel} across pH{" "}
              {ind.low}–{ind.high}.
            </div>
          </div>

          {/* Controls — precise vs steady pour */}
          {pour === "precise" ? (
            <>
              {!trial && (
                <>
                  <label className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mb-1.5 block">
                    Base added — {Vb.toFixed(1)} mL
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={VMAX}
                    step={0.1}
                    value={Vb}
                    onChange={(e) => setVb(Number(e.target.value))}
                    className="w-full accent-wraith"
                  />
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {[0.1, 1, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setVb((v) => Math.min(VMAX, +(v + d).toFixed(2)))}
                    className="btn-ghost-arcane text-xs"
                  >
                    <Droplet className="h-3.5 w-3.5" /> +{d} mL
                  </button>
                ))}
                {!trial && (
                  <button onClick={() => setVb(EQUIV)} className="btn-ghost-arcane text-xs">
                    Jump to equivalence
                  </button>
                )}
                <button onClick={reset} className="btn-ghost-arcane text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onPointerDown={startPour}
                onPointerUp={stopPour}
                onPointerLeave={stopPour}
                onPointerCancel={stopPour}
                className="btn-arcane btn-arcane-hover text-sm select-none touch-none"
              >
                <FlaskConical className="h-4 w-4" /> Hold to pour
              </button>
              <button
                onClick={() => setVb((v) => Math.min(VMAX, +(v + 0.05).toFixed(2)))}
                className="btn-ghost-arcane text-xs"
              >
                <Droplet className="h-3.5 w-3.5" /> Single drop
              </button>
              <button onClick={reset} className="btn-ghost-arcane text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <span className="text-[11px] text-parchment/50 basis-full">
                The stopcock runs at ~4 mL/s while held — release early and finish drop by drop, or
                you will sail past the endpoint.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Trial panel */}
      {trial && (
        <div
          className="mt-6 rounded-2xl p-5"
          style={{
            background: "color-mix(in oklab, var(--color-gold) 6%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-[10px] tracking-[0.2em] uppercase font-display text-gold">
              Assay of the Unknown
            </span>
            {best && (
              <span className="ml-auto text-xs text-parchment/60 inline-flex items-center gap-1.5">
                Best: <Stars n={best.stars} /> ({best.plays} attempt{best.plays === 1 ? "" : "s"})
              </span>
            )}
          </div>
          <p className="text-sm text-parchment leading-relaxed mb-3">
            The flask holds 25 mL of {ACIDS[acid].name} of <em>unknown</em> concentration (somewhere
            between 0.05 and 0.25 M). Titrate to the endpoint, then compute the concentration: C ={" "}
            <span className="text-gold">(0.1 M × V</span>
            <sub className="text-gold">NaOH</sub>
            <span className="text-gold"> ) / 25 mL</span>. Report it below.
          </p>
          {verdict === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.001}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="e.g. 0.125"
                className="w-32 rounded-lg px-3 py-2 text-sm text-spectral placeholder:text-parchment/40 outline-none"
                style={{
                  background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)",
                  border: "1px solid var(--color-border)",
                }}
              />
              <span className="text-xs text-parchment/60">mol/L</span>
              <button
                onClick={grade}
                disabled={!isFinite(parseFloat(guess)) || parseFloat(guess) <= 0}
                className="btn-arcane btn-arcane-hover text-sm disabled:opacity-40"
              >
                Record the assay
              </button>
              <button onClick={newUnknown} className="btn-ghost-arcane text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> New unknown
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Stars n={verdict.stars} />
                <span className="text-sm text-spectral">
                  {verdict.stars === 3
                    ? "Master assayer!"
                    : verdict.stars === 2
                      ? "Close — within 10%."
                      : verdict.stars === 1
                        ? "In the neighbourhood — within 20%."
                        : "Off the mark this time."}
                </span>
                <span className="text-xs text-parchment/60">
                  True value: {unknown.toFixed(4)} M · your error {verdict.errPct.toFixed(1)}%
                </span>
              </div>
              <ul className="text-xs text-parchment/70 leading-relaxed space-y-1 mb-3">
                {verdict.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
              <button onClick={newUnknown} className="btn-arcane btn-arcane-hover text-sm">
                <RotateCcw className="h-4 w-4" /> Assay a new unknown
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4 max-w-4xl">
        <ConceptCard title="Strong vs weak curves">
          A strong acid starts low (pH 1 for 0.1 M HCl) and its curve leaps through pH 7 at
          equivalence. A weak acid starts higher (≈ 2.9), climbs through a flat{" "}
          <em>buffer region</em> around its pKa (4.74), and its equivalence sits <em>basic</em> (≈
          8.7) because the leftover CH₃COO⁻ steals protons from water. That is why the indicator
          must be chosen to match the acid.
        </ConceptCard>
        <DidYouKnow>
          Real analysts titrate vinegar exactly like your unknown assay: pour NaOH into a measured
          sample until phenolphthalein holds pink, then compute the acidity. Food law in many
          countries requires table vinegar to assay at no less than 4% ethanoic acid.
        </DidYouKnow>
      </div>

      <p className="mt-6 text-sm text-parchment/60 max-w-2xl leading-relaxed">
        The curve is nearly flat, then leaps almost vertically near the equivalence point, where
        moles of acid exactly equal moles of base
        {!trial && (
          <>
            {" "}
            — here at <span className="text-gold">{EQUIV.toFixed(1)} mL</span>
          </>
        )}
        . A single drop there swings the pH by several units, which is why a well-chosen indicator
        changes colour so sharply.
      </p>
    </StudentShell>
  );
}
