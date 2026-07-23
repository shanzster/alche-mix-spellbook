import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Camera, Sparkles, Star, Zap, FlaskConical, CheckCircle, ShoppingCart } from "lucide-react";
import { FloatingNav } from "../components/FloatingNav";

export const Route = createFileRoute("/grimoire")({
  component: GrimoirePage,
});

const SAMPLE_CARDS = [
  { element: "H",  name: "Hydrogen",  atomic: 1,  category: "Nonmetal",             color: "#60a5fa", rarity: "Base" },
  { element: "O",  name: "Oxygen",    atomic: 8,  category: "Nonmetal",             color: "#f87171", rarity: "Base" },
  { element: "C",  name: "Carbon",    atomic: 6,  category: "Nonmetal",             color: "#a3a3a3", rarity: "Base" },
  { element: "N",  name: "Nitrogen",  atomic: 7,  category: "Nonmetal",             color: "#93c5fd", rarity: "Base" },
  { element: "Na", name: "Sodium",    atomic: 11, category: "Alkali Metal",         color: "#f87171", rarity: "Base" },
  { element: "Cl", name: "Chlorine",  atomic: 17, category: "Halogen",              color: "#4ade80", rarity: "Base" },
  { element: "Ca", name: "Calcium",   atomic: 20, category: "Alkaline Earth Metal", color: "#fb923c", rarity: "Base" },
  { element: "Fe", name: "Iron",      atomic: 26, category: "Transition Metal",     color: "#a78bfa", rarity: "Base" },
  { element: "Cu", name: "Copper",    atomic: 29, category: "Transition Metal",     color: "#fb923c", rarity: "Base" },
  { element: "Zn", name: "Zinc",      atomic: 30, category: "Transition Metal",     color: "#94a3b8", rarity: "Base" },
  { element: "Mg", name: "Magnesium", atomic: 12, category: "Alkaline Earth Metal", color: "#34d399", rarity: "Base" },
  { element: "S",  name: "Sulfur",    atomic: 16, category: "Nonmetal",             color: "#facc15", rarity: "Base" },
];

const RARITY_COLORS: Record<string, string> = {
  Base:      "var(--color-parchment)",
  Forged:    "var(--color-wraith)",
  Legendary: "var(--color-gold)",
};

function ElementCard({ element, name, atomic, category, color, rarity }: typeof SAMPLE_CARDS[0]) {
  return (
    <div className="parchment-border rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:glow-wraith-soft cursor-pointer group">
      {/* Card top band */}
      <div className="h-2" style={{ background: color }} />
      <div className="p-5">
        {/* Rarity */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: RARITY_COLORS[rarity] }}>{rarity}</span>
          <Star className="h-3 w-3" style={{ color: RARITY_COLORS[rarity] }} />
        </div>
        {/* Symbol */}
        <div className="text-center mb-4">
          <div className="font-display text-5xl mb-1" style={{ color, textShadow: `0 0 20px ${color}` }}>{element}</div>
          <div className="text-[10px] tracking-[0.3em] text-parchment/60 uppercase">Atomic No. {atomic}</div>
        </div>
        {/* Name + category */}
        <div className="text-center border-t border-parchment/15 pt-3">
          <div className="font-display text-sm text-spectral">{name}</div>
          <div className="text-[10px] tracking-[0.2em] text-parchment/60 uppercase mt-1">{category}</div>
        </div>
        {/* AR indicator */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] tracking-[0.25em] text-wraith uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          <Sparkles className="h-2.5 w-2.5" /> AR Scannable
        </div>
      </div>
    </div>
  );
}

function GrimoirePage() {
  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <FloatingNav />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-28 pb-24">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-wraith/30 bg-wraith/10 px-4 py-1.5 text-xs tracking-[0.3em] text-wraith uppercase mb-6">
            <BookOpen className="h-3 w-3" /> Physical Card Collection
          </div>
          <h1 className="font-display text-5xl md:text-6xl mb-6">
            The AlcheMix<br />
            <span className="aurora-gradient animate-aurora">Grimoire Cards.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-parchment leading-relaxed">
            A physical card collection of the 12 essential periodic elements — each card AR-scannable,
            unlocking 3D molecular visualisations directly from the real world. The rest of the periodic
            table isn't handed to you. It has to be <span className="text-wraith font-display italic">forged.</span>
          </p>
        </div>

        {/* What's in the box */}
        <section className="mb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Card Box</p>
            <h2 className="font-display text-3xl mb-6">Everything in the collection.</h2>
            <ul className="space-y-4">
              {[
                { icon: <CheckCircle className="h-5 w-5 text-wraith" />, text: "12 physical base element cards — the essential building blocks of chemistry" },
                { icon: <CheckCircle className="h-5 w-5 text-wraith" />, text: "Each card has a unique AR marker that triggers a 3D model when scanned" },
                { icon: <CheckCircle className="h-5 w-5 text-wraith" />, text: "The remaining 106 elements must be forged by combining base elements in the platform" },
                { icon: <CheckCircle className="h-5 w-5 text-wraith" />, text: "Printed element data: atomic number, mass, group, period, and electron config" },
                { icon: <CheckCircle className="h-5 w-5 text-wraith" />, text: "Companion app access included — scan, experiment, and build your digital journal" },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5">{icon}</span>
                  <span className="text-parchment leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Card box visual */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 rounded-2xl animate-breathing"
                style={{ background: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--color-wraith) 30%, transparent), transparent 70%)" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="parchment-border rounded-2xl w-56 h-64 flex flex-col items-center justify-center gap-4 glow-wraith-soft">
                  <BookOpen className="h-12 w-12 text-wraith animate-float-slow" />
                  <div className="text-center">
                    <div className="font-display text-xl text-spectral">Grimoire</div>
                    <div className="text-[10px] tracking-[0.3em] text-gold uppercase mt-1">12 Base Elements</div>
                  </div>
                  <div className="flex gap-1">
                    {["H","O","C","N","Na","Cl"].map(e => (
                      <span key={e} className="rounded border border-parchment/30 bg-slate-sunken/60 px-1.5 py-0.5 font-display text-[10px] text-parchment">{e}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample cards */}
        <section className="mb-20">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3 text-center">The Physical Cards</p>
          <h2 className="font-display text-3xl text-center mb-4">The 12 base cards.</h2>
          <p className="text-center text-parchment mb-10 max-w-xl mx-auto">
            These are the only physical cards in the box. Every other element in the periodic table
            must be discovered and forged inside the platform by combining these base elements.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {SAMPLE_CARDS.map(card => <ElementCard key={card.element} {...card} />)}
          </div>
        </section>

        {/* How AR scanning works */}
        <section className="mb-20">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3 text-center">How It Works</p>
          <h2 className="font-display text-3xl text-center mb-12">Scan. Explore. Learn.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <BookOpen className="h-6 w-6" />,
                title: "Pick a card",
                body: "Choose any element card from the Grimoire box. Each one has a unique AR marker embedded in the design.",
              },
              {
                step: "02",
                icon: <Camera className="h-6 w-6" />,
                title: "Scan with the app",
                body: "Open AlcheMix AR on your device and point the camera at the card. The app recognises the marker instantly.",
              },
              {
                step: "03",
                icon: <Sparkles className="h-6 w-6" />,
                title: "Explore in 3D",
                body: "A 3D molecular model appears above the card. Rotate it, inspect electron shells, and tap for detailed element data.",
              },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="parchment-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 font-display text-4xl text-spectral/10">{step}</div>
                <span className="text-wraith mb-4 block">{icon}</span>
                <h3 className="font-display text-lg mb-3">{title}</h3>
                <p className="text-parchment text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Card tiers — Base vs Forged */}
        <section className="mb-20">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3 text-center">Card Tiers</p>
          <h2 className="font-display text-3xl text-center mb-10">Start with 12. Forge the rest.</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                tier: "Base",
                count: "12 physical cards",
                desc: "The essential building blocks — H, O, C, N, Na, Cl, Ca, Fe, Cu, Zn, Mg, S. These are the cards that come in the box.",
                color: "var(--color-parchment)",
                badge: "Included in box",
              },
              {
                tier: "Forged",
                count: "100+ discoverable elements",
                desc: "Unlocked by combining base elements in the Reaction Sandbox. Each successful compound reveals a new element in your digital journal.",
                color: "var(--color-wraith)",
                badge: "Earned in platform",
              },
              {
                tier: "Legendary",
                count: "6 rare synthetics",
                desc: "Radioactive and superheavy elements — Uranium, Plutonium, Thorium, and more. Unlocked through advanced reaction chains and evidence submissions.",
                color: "var(--color-gold)",
                badge: "Hardest to forge",
              },
            ].map(({ tier, count, desc, color, badge }) => (
              <div key={tier} className="parchment-border rounded-xl p-5 text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-3 border-2 animate-breathing" style={{ borderColor: color, background: `color-mix(in oklab, ${color} 15%, transparent)` }} />
                <div className="font-display text-base mb-1" style={{ color }}>{tier}</div>
                <div className="text-xs mb-1" style={{ color }}>{count}</div>
                <span className="inline-block text-[9px] tracking-[0.25em] uppercase rounded-full px-2.5 py-0.5 mb-3"
                  style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
                  {badge}
                </span>
                <p className="text-xs text-parchment leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center parchment-border rounded-2xl p-12">
          <FlaskConical className="mx-auto h-10 w-10 text-wraith animate-float-slow mb-6" />
          <h2 className="font-display text-3xl mb-4">Get the Grimoire</h2>
          <p className="text-parchment mb-8 max-w-md mx-auto">
            The base card set is available now. Order yours and start forging
            the rest of the periodic table inside the platform.
          </p>

          {/* Primary buy CTA */}
          <a
            href="https://shopee.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-xl px-8 py-4 font-display text-base tracking-[0.12em] uppercase transition-all duration-300 hover:-translate-y-1 hover:scale-105 mb-6"
            style={{
              background: "linear-gradient(135deg, color-mix(in oklab, var(--color-gold) 70%, var(--color-amber-scry)), color-mix(in oklab, var(--color-gold) 85%, black))",
              border: "1px solid color-mix(in oklab, var(--color-gold) 80%, white)",
              color: "#1D1D1B",
              boxShadow: "0 0 32px -6px color-mix(in oklab, var(--color-gold) 65%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <ShoppingCart className="h-5 w-5" />
            Buy on Shopee
          </a>

          <p className="text-parchment/40 text-xs tracking-[0.2em] uppercase mb-8">
            Ships via Shopee · Secure checkout
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/elements" className="btn-arcane btn-arcane-hover">
              Explore All Elements
            </Link>
            <Link to="/app" className="btn-ghost-arcane">
              <Zap className="h-4 w-4" /> Open Platform
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase relative z-10">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
