import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  FlaskConical,
  Eye,
  BookOpen,
  Sparkles,
  Users,
  TrendingUp,
  Zap,
  RotateCcw,
  Upload,
  ArrowLeft,
  ScrollText,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

type ModuleKey = "astrolabe" | "sandbox" | "grimoire";

function AppShell() {
  const [active, setActive] = useState<ModuleKey>("sandbox");

  return (
    <div className="bg-arcane relative flex min-h-screen text-spectral">
      {/* Starfield */}
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />
      {/* Ambient embers + sparkles */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={`e-${i}`}
            className="animate-drift absolute h-1 w-1 rounded-full"
            style={{
              top: `${(i * 53) % 100}%`,
              animationDelay: `${i * 2.2}s`,
              animationDuration: `${22 + (i % 4) * 4}s`,
              background: i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)",
              boxShadow: `0 0 10px ${i % 2 === 0 ? "var(--color-wraith)" : "var(--color-gold)"}`,
            }}
          />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <Sparkles
            key={`s-${i}`}
            className="animate-twinkle absolute"
            style={{
              top: `${(i * 61) % 95 + 2}%`,
              left: `${(i * 41) % 95 + 2}%`,
              width: `${8 + (i % 3) * 4}px`,
              height: `${8 + (i % 3) * 4}px`,
              color: i % 3 === 0 ? "var(--color-gold)" : "var(--color-wraith)",
              animationDelay: `${(i * 0.29) % 3}s`,
              animationDuration: `${2.8 + (i % 4) * 0.7}s`,
              filter: "drop-shadow(0 0 5px currentColor)",
            }}
          />
        ))}
      </div>

      <Sidebar active={active} onSelect={setActive} />

      <main className="relative z-10 flex-1 overflow-y-auto">
        <TopBar active={active} />
        <div className="mx-auto max-w-7xl px-8 py-10">
          {active === "astrolabe" && <Astrolabe />}
          {active === "sandbox" && <Sandbox />}
          {active === "grimoire" && <Grimoire />}
        </div>
      </main>
    </div>
  );
}

/* ─────────── Sidebar ─────────── */

function Sidebar({
  active,
  onSelect,
}: {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
}) {
  const items: { key: ModuleKey; label: string; sub: string; icon: React.ReactNode }[] = [
    { key: "astrolabe", label: "Astrolabe", sub: "Module I · Analytics", icon: <Eye className="h-5 w-5" /> },
    { key: "sandbox", label: "Sandbox", sub: "Module II · Mixing", icon: <FlaskConical className="h-5 w-5" /> },
    { key: "grimoire", label: "Grimoire", sub: "Module III · AI Hunt", icon: <BookOpen className="h-5 w-5" /> },
  ];

  return (
    <aside
      className="relative z-20 hidden w-72 shrink-0 flex-col border-r md:flex"
      style={{
        borderColor: "color-mix(in oklab, var(--color-parchment) 25%, transparent)",
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--color-slate-sunken) 90%, transparent), color-mix(in oklab, var(--color-mist) 95%, transparent))",
      }}
    >
      <div className="border-b border-parchment/20 px-6 py-6">
        <Link to="/" className="flex items-center gap-3 group">
          <FlaskConical className="h-6 w-6 text-wraith animate-breathing" />
          <div>
            <div className="font-display text-lg tracking-[0.25em] text-spectral">
              ALCHEMIX
            </div>
            <div className="text-[10px] tracking-[0.35em] text-gold uppercase">Ar · The Study</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        <p className="mb-3 px-3 text-[10px] tracking-[0.35em] text-parchment/60 uppercase">
          Chambers
        </p>
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 ${
                isActive
                  ? "bg-slate-sunken/80 glow-wraith-soft"
                  : "hover:bg-slate-sunken/50"
              }`}
              style={
                isActive
                  ? {
                      border: "1px solid color-mix(in oklab, var(--color-wraith) 45%, transparent)",
                    }
                  : {
                      border: "1px solid transparent",
                    }
              }
            >
              <span
                className={`transition ${
                  isActive ? "text-wraith animate-breathing" : "text-gold group-hover:text-spectral"
                }`}
              >
                {it.icon}
              </span>
              <span className="flex-1">
                <span
                  className={`block font-display text-sm tracking-[0.15em] ${
                    isActive ? "text-spectral" : "text-spectral/85"
                  }`}
                >
                  {it.label}
                </span>
                <span className="block text-[10px] tracking-[0.2em] text-parchment/70 uppercase">
                  {it.sub}
                </span>
              </span>
              {isActive && (
                <span className="absolute right-3 h-2 w-2 rounded-full bg-wraith animate-pulse-ring" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-parchment/20 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xs tracking-[0.25em] text-parchment uppercase hover:text-spectral">
          <ArrowLeft className="h-3 w-3" /> Return to Gate
        </Link>
      </div>
    </aside>
  );
}

/* ─────────── Top Bar ─────────── */

function TopBar({ active }: { active: ModuleKey }) {
  const titles: Record<ModuleKey, { name: string; sub: string }> = {
    astrolabe: { name: "The Educator's Astrolabe", sub: "Charting the arcane progress of your apprentices" },
    sandbox: { name: "The Alchemist's Sandbox", sub: "A cauldron where reagents whisper their secrets" },
    grimoire: { name: "The Scavenger Grimoire", sub: "An ocular lens upon the mortal world" },
  };
  const t = titles[active];
  return (
    <div
      className="sticky top-0 z-10 border-b px-8 py-5 backdrop-blur-md"
      style={{
        borderColor: "color-mix(in oklab, var(--color-parchment) 22%, transparent)",
        background: "color-mix(in oklab, var(--color-mist) 75%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-spectral">{t.name}</h1>
          <p className="text-xs tracking-[0.2em] text-gold uppercase mt-1">{t.sub}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-parchment/30 bg-slate-sunken/60 px-4 py-1.5 md:flex">
          <span className="h-2 w-2 rounded-full bg-wraith animate-breathing" />
          <span className="text-xs tracking-[0.25em] text-parchment uppercase">Circle Active</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Module I: Astrolabe ─────────── */

function Astrolabe() {
  const metrics = [
    { label: "Total Transmutations", value: "1,428", delta: "+124 this moon", icon: <Sparkles className="h-5 w-5" /> },
    { label: "Active Apprentices", value: "37", delta: "9 currently scrying", icon: <Users className="h-5 w-5" /> },
    { label: "Success Rate", value: "82.4%", delta: "▲ 3.1% since last cycle", icon: <TrendingUp className="h-5 w-5" /> },
  ];
  const rows = [
    { name: "Elowen Vayne", combo: "H₂ + O → H₂O", points: 240, status: "Success" },
    { name: "Cassian Rook", combo: "Na + Cl → NaCl", points: 180, status: "Success" },
    { name: "Isolde Marrow", combo: "H + Cl → HCl", points: 95, status: "Volatile" },
    { name: "Peregrin Aske", combo: "O₂ + Na → Na₂O", points: 220, status: "Success" },
    { name: "Wren Halloway", combo: "Cl + Cl → Cl₂", points: 60, status: "Scrying" },
    { name: "Thistle Ambrose", combo: "H₂ + Cl₂ → 2HCl", points: 310, status: "Success" },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="parchment-border group relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:glow-wraith-soft hover:-translate-y-0.5"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 group-hover:opacity-40 transition"
              style={{ background: "radial-gradient(circle, var(--color-wraith), transparent 65%)" }}
            />
            <div className="mb-3 flex items-center gap-2 text-wraith">
              {m.icon}
              <span className="text-[10px] tracking-[0.3em] text-gold uppercase">{m.label}</span>
            </div>
            <div className="font-display text-4xl text-spectral">{m.value}</div>
            <div className="mt-2 text-xs text-parchment">{m.delta}</div>
          </div>
        ))}
      </div>

      <div className="parchment-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-parchment/25 px-6 py-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-wraith" />
            <h3 className="font-display text-lg tracking-[0.2em]">Activity Ledger</h3>
          </div>
          <span className="text-xs tracking-[0.25em] text-parchment uppercase">Recent Inscriptions</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.3em] text-gold uppercase">
              <th className="px-6 py-3 font-normal">Apprentice</th>
              <th className="px-6 py-3 font-normal">Transmutation</th>
              <th className="px-6 py-3 font-normal">Hunt Points</th>
              <th className="px-6 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-t border-parchment/15 transition hover:bg-wraith/5"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-wraith/40 font-display text-xs text-wraith"
                      style={{ background: "color-mix(in oklab, var(--color-wraith) 12%, transparent)" }}
                    >
                      {r.name.split(" ").map((s) => s[0]).join("")}
                    </div>
                    <span className="font-display text-sm text-spectral">{r.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-parchment">{r.combo}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Trophy className="h-3 w-3" />
                    <span className="font-display">{r.points}</span>
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={r.status as any} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "Success" | "Scrying" | "Volatile" }) {
  const map = {
    Success: {
      label: "Transmutation Success",
      color: "var(--color-wraith)",
      bg: "color-mix(in oklab, var(--color-wraith) 15%, transparent)",
    },
    Scrying: {
      label: "Scrying…",
      color: "var(--color-amber-scry)",
      bg: "color-mix(in oklab, var(--color-amber-scry) 15%, transparent)",
    },
    Volatile: {
      label: "Volatile",
      color: "var(--color-crimson)",
      bg: "color-mix(in oklab, var(--color-crimson) 18%, transparent)",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase ${
        status === "Scrying" ? "animate-breathing" : ""
      }`}
      style={{ color: map.color, background: map.bg, border: `1px solid ${map.color}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: map.color }} />
      {map.label}
    </span>
  );
}

/* ─────────── Module II: Sandbox ─────────── */

const REAGENTS = [
  { symbol: "H", name: "Hydrogen", tint: "#F0FDF4", desc: "The First Breath" },
  { symbol: "O", name: "Oxygen", tint: "#DC143C", desc: "Crimson Vitae" },
  { symbol: "Na", name: "Sodium", tint: "#3E5FBF", desc: "Cobalt Salt" },
  { symbol: "Cl", name: "Chlorine", tint: "#2FA274", desc: "Emerald Vapor" },
];

function Sandbox() {
  const [selected, setSelected] = useState<string[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);

  const toggle = (s: string) =>
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const synthesize = () => {
    setSynthesizing(true);
    setTimeout(() => setSynthesizing(false), 2400);
  };

  const clear = () => {
    setSelected([]);
    setSynthesizing(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      {/* Reagent Inventory */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-wraith" />
          <h3 className="font-display text-sm tracking-[0.3em] text-gold uppercase">Reagent Inventory</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {REAGENTS.map((r) => {
            const active = selected.includes(r.symbol);
            return (
              <button
                key={r.symbol}
                onClick={() => toggle(r.symbol)}
                className={`parchment-border relative aspect-square rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-1 ${
                  active ? "glow-wraith" : "hover:glow-wraith-soft"
                }`}
                style={active ? { transform: "translateY(-4px) scale(1.02)" } : {}}
              >
                <div
                  className="absolute inset-0 rounded-xl opacity-30"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${r.tint}, transparent 65%)`,
                  }}
                />
                <div className="relative flex h-full flex-col justify-between">
                  <div
                    className="font-display text-4xl"
                    style={{ color: r.tint, textShadow: `0 0 20px ${r.tint}` }}
                  >
                    {r.symbol}
                  </div>
                  <div>
                    <div className="font-display text-sm text-spectral">{r.name}</div>
                    <div className="text-[10px] tracking-[0.2em] text-parchment uppercase">{r.desc}</div>
                  </div>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-wraith animate-pulse-ring" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg parchment-border p-4">
          <div className="text-[10px] tracking-[0.3em] text-gold uppercase mb-2">Selected Reagents</div>
          {selected.length === 0 ? (
            <div className="text-sm italic text-parchment/70">None chosen. The cauldron waits.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-wraith/40 bg-wraith/10 px-2 py-1 font-display text-sm text-wraith"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Synthesis Canvas + Actions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-wraith" />
            <h3 className="font-display text-sm tracking-[0.3em] text-gold uppercase">Synthesis Canvas</h3>
          </div>
          <span className="text-[10px] tracking-[0.25em] text-parchment/70 uppercase">3D Rune Awaits</span>
        </div>

        <div
          className={`rune-dashed relative flex aspect-[4/3] w-full items-center justify-center rounded-2xl overflow-hidden ${
            synthesizing ? "animate-breathing glow-wraith" : ""
          }`}
        >
          {/* Placeholder rune ring — R3F canvas mounts here */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <div className="h-3/4 w-3/4 rounded-full border border-wraith/25" />
          </div>
          <div className="absolute inset-8 flex items-center justify-center opacity-25">
            <div className="h-1/2 w-1/2 rounded-full border border-parchment/40 animate-float-slow" />
          </div>
          <div className="relative z-10 text-center px-8">
            {synthesizing ? (
              <>
                <Sparkles className="mx-auto h-10 w-10 text-wraith animate-breathing" />
                <div className="mt-4 font-display text-lg text-spectral">Transmuting…</div>
                <div className="mt-1 text-xs tracking-[0.25em] text-gold uppercase">
                  Bonds whisper. Filaments knit.
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-wraith/40"
                  style={{ background: "color-mix(in oklab, var(--color-wraith) 10%, transparent)" }}
                >
                  <FlaskConical className="h-7 w-7 text-wraith/70" />
                </div>
                <div className="font-display text-lg text-spectral">The Rune is Empty</div>
                <div className="mt-1 text-xs tracking-[0.25em] text-parchment/80 uppercase">
                  R3F canvas will inhabit this space
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
          <button onClick={clear} className="btn-ghost-arcane">
            <RotateCcw className="h-4 w-4" /> Clear Rune
          </button>
          <button
            onClick={synthesize}
            disabled={selected.length < 2 || synthesizing}
            className={`btn-arcane btn-arcane-hover ${
              synthesizing ? "animate-breathing" : ""
            }`}
            style={
              selected.length < 2 || synthesizing
                ? { opacity: 0.55, cursor: "not-allowed" }
                : {}
            }
          >
            <Zap className="h-4 w-4" /> Synthesize
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Module III: Grimoire ─────────── */

type Entry = { id: number; title: string; note: string; status: "Success" | "Scrying" | "Volatile" };

function Grimoire() {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, title: "Rust upon iron gate", note: "Oxide bloom confirmed — Fe₂O₃ signature.", status: "Success" },
    { id: 2, title: "Kitchen salt crystal", note: "Cubic lattice matched. NaCl inscribed.", status: "Success" },
    { id: 3, title: "Pool water sample", note: "Chlorine spectrum ambiguous, scrying…", status: "Scrying" },
    { id: 4, title: "Cracked battery cell", note: "Unstable acid vapors detected. Do not approach.", status: "Volatile" },
    { id: 5, title: "Copper leaf oxidation", note: "Verdigris patina identified — CuCO₃·Cu(OH)₂.", status: "Success" },
  ]);

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const newEntry: Entry = {
      id: Date.now(),
      title: files[0].name,
      note: "The oracle stirs. Awaiting divination…",
      status: "Scrying",
    };
    setEntries((e) => [newEntry, ...e]);
    setTimeout(() => {
      setEntries((prev) =>
        prev.map((x) => (x.id === newEntry.id ? { ...x, status: "Success", note: "Elemental signature recorded to the grimoire." } : x)),
      );
    }, 2600);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      {/* Ocular Lens */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-4 w-4 text-wraith" />
          <h3 className="font-display text-sm tracking-[0.3em] text-gold uppercase">The Ocular Lens</h3>
        </div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`rune-dashed flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl p-8 text-center transition-all duration-300 ${
            dragOver ? "glow-wraith animate-breathing" : "hover:glow-wraith-soft"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => onFiles(e.target.files)}
          />
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-wraith/40 animate-float-slow"
            style={{ background: "color-mix(in oklab, var(--color-wraith) 12%, transparent)" }}
          >
            <Upload className="h-7 w-7 text-wraith" />
          </div>
          <div className="font-display text-xl text-spectral">Upload Real-World Evidence</div>
          <div className="mt-2 max-w-sm text-sm text-parchment">
            Draw an image into the lens. The AI oracle shall scry its elemental essence and inscribe judgment.
          </div>
          <div className="mt-6 text-[10px] tracking-[0.3em] text-gold uppercase">
            Drag a phial · or click to choose
          </div>
        </label>

        <div className="mt-6 rounded-lg parchment-border p-4 text-xs text-parchment">
          <span className="font-display text-gold tracking-[0.2em]">TIP · </span>
          The lens accepts photographs of rust, salt, minerals, flames — anything with a chemical soul.
        </div>
      </div>

      {/* Journal Entries */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-wraith" />
            <h3 className="font-display text-sm tracking-[0.3em] text-gold uppercase">Journal Entries</h3>
          </div>
          <span className="text-[10px] tracking-[0.25em] text-parchment/70 uppercase">
            {entries.length} inscriptions
          </span>
        </div>
        <div
          className="parchment-border rounded-xl p-2 max-h-[560px] overflow-y-auto"
          style={{ scrollbarColor: "var(--color-wraith) transparent" }}
        >
          {entries.map((e) => (
            <div
              key={e.id}
              className="group m-2 rounded-lg border border-parchment/20 bg-slate-sunken/40 p-4 transition-all duration-200 hover:border-wraith/40 hover:bg-slate-sunken/70"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base text-spectral truncate">{e.title}</div>
                  <div className="mt-1 text-sm text-parchment leading-relaxed">{e.note}</div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
