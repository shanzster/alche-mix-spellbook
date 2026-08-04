import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BookMarked, Camera, ScanLine, Sparkles, Lock, Check, FlaskConical, Combine, X,
  Skull, Droplets, Flame, FlameKindling, AlertTriangle, ShieldCheck, Zap,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { BohrModel3D } from "../components/BohrModel3D";
import { useUserProfile, scanCard, recordCompound, logPractice } from "../lib/profile";
import {
  BASE_CARDS, combine, POLYATOMIC_IONS, isIon,
  type Card, type MixResult, type Reagent, type Hazard,
} from "../lib/cards";

// Hazard badge styling (reuses the GHS language from the Lab Safety module).
const HAZARD_STYLE: Record<Hazard, { label: string; color: string; icon: typeof Flame }> = {
  toxic:     { label: "Toxic",     color: "var(--color-crimson)",         icon: Skull },
  corrosive: { label: "Corrosive", color: "#fb923c",                      icon: Droplets },
  flammable: { label: "Flammable", color: "#f97316",                      icon: Flame },
  oxidiser:  { label: "Oxidiser",  color: "#eab308",                      icon: FlameKindling },
  harmful:   { label: "Harmful",   color: "var(--color-gold)",            icon: AlertTriangle },
  none:      { label: "Safe",      color: "var(--color-emerald-elixir)",  icon: ShieldCheck },
};

export const Route = createFileRoute("/cards")({
  component: () => (
    <RequireAuth>
      <Grimoire />
    </RequireAuth>
  ),
});

function Sub({ text }: { text: string }) {
  return <>{text.split(/(\d+)/).map((p, i) => (/\d+/.test(p) ? <sub key={i} className="text-[0.7em]">{p}</sub> : <span key={i}>{p}</span>))}</>;
}

// ── A single element card face ──────────────────────────────────────────────
function CardFace({ card, locked, active, onClick, size = "md" }: {
  card: Card; locked?: boolean; active?: boolean; onClick?: () => void; size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-16 w-14" : "h-24 w-[4.5rem]";
  const color = card.color;
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`relative flex ${dim} flex-col items-center justify-center rounded-xl flex-shrink-0 transition-all duration-200 ${onClick ? "hover:scale-105" : ""}`}
      style={{
        background: locked
          ? "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)"
          : `radial-gradient(circle at 40% 25%, color-mix(in oklab, ${color} 30%, transparent), color-mix(in oklab, var(--color-slate-sunken) 78%, transparent))`,
        border: `1.5px solid color-mix(in oklab, ${locked ? "var(--color-parchment)" : color} ${active ? 85 : 40}%, transparent)`,
        boxShadow: active ? `0 0 18px -4px ${color}` : locked ? "none" : `0 0 14px -8px ${color}`,
        opacity: locked ? 0.55 : 1,
      }}>
      {locked ? (
        <Lock className="h-4 w-4 text-parchment/50" />
      ) : (
        <>
          <span className="font-sans font-semibold leading-none" style={{ color, fontSize: size === "sm" ? 16 : 22 }}>{card.symbol}</span>
          <span className="text-[8px] text-parchment/60 mt-0.5">{card.number}</span>
          {size === "md" && <span className="text-[9px] text-parchment/70 mt-1 truncate max-w-full px-1">{card.name}</span>}
        </>
      )}
    </button>
  );
}

// ── Tab 1: AR Scanner ───────────────────────────────────────────────────────
function Scanner({ collected, onScan }: { collected: string[]; onScan: (c: Card) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState(false);
  const [active, setActive] = useState<Card | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setCamError(true); return; }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
      } catch { setCamError(true); }
    })();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const scan = (card: Card) => { setActive(card); onScan(card); };

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden h-[440px]" style={{ background: "#05070d", border: "1px solid var(--color-border)" }}>
        {!camError && <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />}
        {camError && (
          <div className="bg-arcane-stars absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Camera className="h-8 w-8 text-parchment/40 mb-3" />
            <p className="text-sm text-parchment/70 max-w-xs">Camera unavailable. You can still tap a card below to reveal it and add it to your Grimoire.</p>
          </div>
        )}

        {/* scanning frame */}
        {!active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-52 w-40 rounded-xl" style={{ boxShadow: "0 0 0 2px color-mix(in oklab, var(--color-emerald-elixir) 45%, transparent)" }}>
              <div className="absolute left-0 right-0 h-0.5 animate-drift" style={{ background: "var(--color-emerald-elixir)", boxShadow: "0 0 10px var(--color-emerald-elixir)", top: "50%" }} />
            </div>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.2em] uppercase text-spectral/80">Align a Grimoire card</span>
          </div>
        )}

        {/* AR overlay — the element materialises over the feed */}
        {active && (
          <div className="absolute inset-0">
            <BohrModel3D key={active.symbol} tumble electrons={active.electrons} color={active.color} nucleusColor={active.nucleus} label={active.symbol} />
            <button onClick={() => setActive(null)} className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-mist) 70%, transparent)", border: "1px solid var(--color-border)" }} aria-label="Close">
              <X className="h-4 w-4 text-parchment" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: `1px solid color-mix(in oklab, ${active.color} 45%, transparent)` }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: active.color }} />
              <span className="font-display text-sm tracking-[0.1em]">{active.name} scanned</span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-parchment/60">
        Point your camera at a Grimoire card, then tap it below to scan it into your collection.
      </p>

      {/* Cards to scan */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {BASE_CARDS.map((card) => (
          <div key={card.symbol} className="relative">
            <CardFace card={card} size="sm" active={active?.symbol === card.symbol} onClick={() => scan(card)} />
            {collected.includes(card.symbol) && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--color-emerald-elixir)" }}>
                <Check className="h-2.5 w-2.5 text-mist" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Collection ───────────────────────────────────────────────────────
function Collection({ collected, compounds }: { collected: string[]; compounds: string[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-parchment">Cards scanned</p>
        <p className="font-display text-teal">{collected.length} <span className="text-parchment/50">/ {BASE_CARDS.length}</span></p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {BASE_CARDS.map((card) => (
          <div key={card.symbol} className="flex justify-center">
            <CardFace card={card} locked={!collected.includes(card.symbol)} />
          </div>
        ))}
      </div>

      {compounds.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-gold" />
            <h3 className="font-display text-sm tracking-[0.2em] uppercase text-parchment/70">Forged Compounds</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {compounds.map((f) => (
              <span key={f} className="rounded-lg px-3 py-1.5 font-display" style={{ background: "color-mix(in oklab, var(--color-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 30%, transparent)", color: "var(--color-gold)" }}>
                <Sub text={f} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Mix & Match ──────────────────────────────────────────────────────
function Mixer({ collected, discovered, onDiscover }: { collected: string[]; discovered: string[]; onDiscover: (f: string) => void }) {
  const cards = BASE_CARDS.filter((c) => collected.includes(c.symbol));
  const [a, setA] = useState<Reagent | null>(null);
  const [b, setB] = useState<Reagent | null>(null);
  const [saved, setSaved] = useState(false);

  const result: MixResult | null = a && b ? combine(a, b) : null;
  const isNew = result?.valid && result.formula ? !discovered.includes(result.formula) : false;

  const pick = (r: Reagent) => {
    setSaved(false);
    if (a?.symbol === r.symbol) { setA(b); setB(null); return; }
    if (b?.symbol === r.symbol) { setB(null); return; }
    if (!a) setA(r);
    else if (!b) setB(r);
    else { setA(r); setB(null); }
  };

  const save = () => { if (result?.valid && result.formula) { onDiscover(result.formula); setSaved(true); } };

  if (cards.length < 2) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px dashed color-mix(in oklab, var(--color-parchment) 30%, transparent)" }}>
        <ScanLine className="h-8 w-8 text-parchment/50 mx-auto mb-3" />
        <p className="font-display text-base mb-1">Scan more cards first</p>
        <p className="text-sm text-parchment/60 max-w-sm mx-auto">You need at least two element cards in your Grimoire before you can mix. Head to the Scan tab — then try adding a compound ion.</p>
      </div>
    );
  }

  const active = (r: Reagent) => a?.symbol === r.symbol || b?.symbol === r.symbol;
  const Slot = ({ r }: { r: Reagent | null }) => (
    <div className="flex h-24 w-[4.5rem] items-center justify-center rounded-xl"
      style={{ border: `1.5px dashed color-mix(in oklab, ${r ? r.color : "var(--color-parchment)"} 45%, transparent)`, background: r ? `color-mix(in oklab, ${r.color} 10%, transparent)` : "transparent" }}>
      {r ? <span className="font-sans font-semibold text-xl" style={{ color: r.color }}><Sub text={r.symbol} /></span> : <span className="text-parchment/40 text-2xl">+</span>}
    </div>
  );

  const hz = result?.valid ? HAZARD_STYLE[result.hazard ?? "none"] : null;
  const tone = result?.unstable ? "var(--color-crimson)" : hz ? hz.color : "var(--color-parchment)";

  return (
    <div>
      {/* Slots + result */}
      <div className="flex flex-col items-center gap-5 rounded-2xl p-6 transition-colors"
        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 62%, transparent)", border: `1px solid color-mix(in oklab, ${result?.valid ? tone : "var(--color-parchment)"} 30%, transparent)`, boxShadow: result?.valid ? `0 0 50px -28px ${tone}` : "none" }}>
        <div className="flex items-center gap-4">
          <Slot r={a} />
          <Combine className="h-5 w-5 text-gold" />
          <Slot r={b} />
        </div>

        {result && (result.valid ? (
          <div className="text-center max-w-sm">
            <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: result.bond === "ionic" ? "var(--color-gold)" : "var(--color-emerald-elixir)" }}>{result.bond} bond</span>
            <div className={`font-display text-5xl my-1 ${result.unstable ? "animate-hazard-shake" : ""}`} style={result.unstable ? { color: "var(--color-crimson)" } : undefined}>
              <Sub text={result.formula!} />
            </div>
            <p className="font-display text-base">{result.commonName ?? result.name}</p>

            {/* Hazard + unstable badges */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {result.unstable && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] tracking-[0.15em] uppercase animate-hazard-shake"
                  style={{ background: "color-mix(in oklab, var(--color-crimson) 18%, transparent)", color: "var(--color-crimson)", border: "1px solid color-mix(in oklab, var(--color-crimson) 45%, transparent)" }}>
                  <Zap className="h-3 w-3" /> Unstable
                </span>
              )}
              {hz && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] tracking-[0.15em] uppercase"
                  style={{ background: `color-mix(in oklab, ${hz.color} 14%, transparent)`, color: hz.color, border: `1px solid color-mix(in oklab, ${hz.color} 40%, transparent)` }}>
                  <hz.icon className="h-3 w-3" /> {hz.label}
                </span>
              )}
            </div>

            {result.uses && <p className="mt-3 text-xs text-parchment/70 leading-relaxed">{result.uses}</p>}
            {result.note && <p className="mt-1.5 text-xs leading-relaxed" style={{ color: tone }}>{result.note}</p>}

            <button onClick={save} disabled={saved} className="btn-arcane btn-arcane-hover mt-4 disabled:opacity-60">
              {saved ? <><Check className="h-4 w-4" /> Added to Grimoire</> : isNew ? <><Sparkles className="h-4 w-4" /> Forge & save</> : <><FlaskConical className="h-4 w-4" /> Already forged</>}
            </button>
          </div>
        ) : (
          <p className="text-sm text-parchment/70 text-center max-w-xs">{result.reason}</p>
        ))}
        {!result && <p className="text-sm text-parchment/50">Pick two things below to mix them.</p>}
      </div>

      {/* Palette of collected element cards */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mt-6 mb-3">Your element cards</p>
      <div className="flex flex-wrap gap-2">
        {cards.map((card) => (
          <CardFace key={card.symbol} card={card} size="sm" active={active(card)} onClick={() => pick(card)} />
        ))}
      </div>

      {/* Palette of polyatomic ions — always available */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-parchment/50 mt-6 mb-3">Compound ions <span className="text-parchment/35 normal-case tracking-normal">· groups that act as one</span></p>
      <div className="flex flex-wrap gap-2">
        {POLYATOMIC_IONS.map((ion) => (
          <button key={ion.symbol} onClick={() => pick(ion)}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-xl flex-shrink-0 transition-all duration-200 hover:scale-105"
            style={{
              background: `radial-gradient(circle at 40% 25%, color-mix(in oklab, ${ion.color} 26%, transparent), color-mix(in oklab, var(--color-slate-sunken) 78%, transparent))`,
              border: `1.5px solid color-mix(in oklab, ${ion.color} ${active(ion) ? 85 : 40}%, transparent)`,
              boxShadow: active(ion) ? `0 0 18px -4px ${ion.color}` : `0 0 14px -8px ${ion.color}`,
            }}>
            <span className="font-sans font-semibold text-sm leading-none" style={{ color: ion.color }}>{ion.display}</span>
            <span className="text-[8px] text-parchment/60 mt-1 truncate max-w-full px-1">{ion.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Grimoire() {
  const { uid, profile } = useUserProfile();
  const [tab, setTab] = useState<"scan" | "collection" | "mix">("scan");
  const collected = profile?.grimoire ?? [];
  const compounds = profile?.compounds ?? [];

  useEffect(() => { if (uid) logPractice(uid, "grimoire"); }, [uid]);

  const TABS = [
    { key: "scan", label: "Scan", icon: Camera },
    { key: "collection", label: "Collection", icon: BookMarked },
    { key: "mix", label: "Mix", icon: Combine },
  ] as const;

  const TabToggle = (
    <div className="inline-flex rounded-full p-1" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 70%, transparent)", border: "1px solid var(--color-border)" }}>
      {TABS.map((t) => (
        <button key={t.key} onClick={() => setTab(t.key)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs tracking-[0.1em] uppercase transition"
          style={tab === t.key ? { background: "color-mix(in oklab, var(--color-gold) 20%, transparent)", color: "var(--color-gold)" } : { color: "var(--color-parchment)" }}>
          <t.icon className="h-3.5 w-3.5" /> {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <ModuleShell
      title="Grimoire"
      eyebrow="Cards & AR"
      icon={BookMarked}
      accent="var(--color-gold)"
      subtitle="Scan your element cards to reveal them in AR, collect them in your Grimoire, then mix cards to forge new compounds."
      right={TabToggle}
    >
      {tab === "scan" && <Scanner collected={collected} onScan={(c) => scanCard(uid, c.symbol)} />}
      {tab === "collection" && <Collection collected={collected} compounds={compounds} />}
      {tab === "mix" && <Mixer collected={collected} discovered={compounds} onDiscover={(f) => recordCompound(uid, f)} />}
    </ModuleShell>
  );
}
