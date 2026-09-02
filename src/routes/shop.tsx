import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import {
  CalendarCheck,
  Check,
  Coins,
  Crown,
  Frame,
  Gem,
  Loader2,
  ScrollText,
  Sparkles,
  Star,
  Store,
  Swords,
} from "lucide-react";
import { StudentShell } from "../components/StudentShell";
import { PageHeader } from "../components/PageHeader";
import { RequireRole } from "../components/RequireRole";
import { equipItem, spendAurum, useUserProfile } from "../lib/profile";

export const Route = createFileRoute("/shop")({
  component: () => (
    <RequireRole role="student">
      <Emporium />
    </RequireRole>
  ),
});

const GOLD = "var(--color-gold)";
const ACCENT = "var(--color-amber-scry)";

// ════════════════════════════════════════════════════════════════════════════
//  The catalogue — every ware the Emporium stocks. Ids are permanent: they are
//  written into `profile.inventory` / `profile.equipped`, so never rename them.
// ════════════════════════════════════════════════════════════════════════════
export type ShopSlot = "frame" | "title" | "charm";

interface ShopItem {
  id: string;
  slot: ShopSlot;
  name: string;
  cost: number;
  /** One line of shopkeeper's patter. */
  blurb: string;
  /** Charms only — the talisman glyph itself. */
  emoji?: string;
}

const CATALOG: readonly ShopItem[] = [
  // ── Card frames ────────────────────────────────────────────────────────────
  {
    id: "frame-gilded",
    slot: "frame",
    name: "Gilded",
    cost: 30,
    blurb: "A clean band of true aurum. The classic — never out of fashion.",
  },
  {
    id: "frame-emerald",
    slot: "frame",
    name: "Emerald Elixir",
    cost: 60,
    blurb: "Bottled green fire from the elixir bench, still faintly warm.",
  },
  {
    id: "frame-wraithbound",
    slot: "frame",
    name: "Wraithbound",
    cost: 90,
    blurb: "Twin spectral bindings that hum with cold violet light.",
  },
  {
    id: "frame-crimson",
    slot: "frame",
    name: "Crimson Seal",
    cost: 120,
    blurb: "Wax of the old guild, pressed while the reaction still smoked.",
  },
  {
    id: "frame-celestial",
    slot: "frame",
    name: "Celestial",
    cost: 150,
    blurb: "Forged from a sliver of night sky. Every colour at once.",
  },
  // ── Titles ─────────────────────────────────────────────────────────────────
  {
    id: "title-apprentice-of-ash",
    slot: "title",
    name: "Apprentice of Ash",
    cost: 20,
    blurb: "Every great alchemist's first burn. Wear it proudly.",
  },
  {
    id: "title-saltbinder",
    slot: "title",
    name: "Saltbinder",
    cost: 40,
    blurb: "For those who have made ions swear loyalty to one another.",
  },
  {
    id: "title-keeper-of-the-codex",
    slot: "title",
    name: "Keeper of the Codex",
    cost: 75,
    blurb: "Granted to apprentices who fill the Codex page by page.",
  },
  {
    id: "title-master-of-trials",
    slot: "title",
    name: "Master of Trials",
    cost: 110,
    blurb: "Stars beyond counting. The trial masters speak your name.",
  },
  {
    id: "title-the-unrusted",
    slot: "title",
    name: "The Unrusted",
    cost: 150,
    blurb: "Time and oxygen have tried. Both failed.",
  },
  {
    id: "title-grand-alchemist",
    slot: "title",
    name: "Grand Alchemist",
    cost: 200,
    blurb: "The highest honour aurum can buy. The rest must be earned.",
  },
  // ── Bench charms ───────────────────────────────────────────────────────────
  {
    id: "charm-alembic",
    slot: "charm",
    name: "Alembic Charm",
    cost: 50,
    emoji: "⚗️",
    blurb: "A tiny still that never stops distilling good fortune.",
  },
  {
    id: "charm-moonstone",
    slot: "charm",
    name: "Moonstone",
    cost: 75,
    emoji: "🌙",
    blurb: "Cool to the touch. Whispers the answers you almost knew.",
  },
  {
    id: "charm-dragons-ember",
    slot: "charm",
    name: "Dragon's Ember",
    cost: 100,
    emoji: "🐉",
    blurb: "A scale-wrapped coal that refuses, on principle, to go out.",
  },
] as const;

const SLOT_META: Record<ShopSlot, { heading: string; sub: string; Icon: typeof Frame }> = {
  frame: {
    heading: "Card Frames",
    sub: "Dress the border of your grimoire cards",
    Icon: Frame,
  },
  title: {
    heading: "Titles",
    sub: "An honorific inscribed beneath your name",
    Icon: Crown,
  },
  charm: {
    heading: "Bench Charms",
    sub: "A small talisman that sits beside your title",
    Icon: Gem,
  },
};

const SLOT_ORDER: readonly ShopSlot[] = ["frame", "title", "charm"];

function itemById(id: string | undefined): ShopItem | undefined {
  return id ? CATALOG.find((i) => i.id === id) : undefined;
}

// ── Frame treatments — each id gets a distinct border / glow / gradient ──────
function frameStyle(frameId: string | undefined): CSSProperties {
  const base: CSSProperties = {
    background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)",
  };
  switch (frameId) {
    case "frame-gilded":
      return {
        ...base,
        border: `2px solid ${GOLD}`,
        boxShadow: `0 0 22px -8px ${GOLD}, inset 0 0 14px -8px ${GOLD}`,
      };
    case "frame-emerald":
      return {
        border: "2px solid var(--color-emerald-elixir)",
        background: `radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--color-emerald-elixir) 22%, transparent), color-mix(in oklab, var(--color-slate-sunken) 85%, transparent))`,
        boxShadow: "0 0 26px -10px var(--color-emerald-elixir)",
      };
    case "frame-wraithbound":
      return {
        ...base,
        border: "3px double var(--color-wraith)",
        outline: "1px solid color-mix(in oklab, var(--color-wraith) 40%, transparent)",
        outlineOffset: "2px",
        boxShadow:
          "0 0 26px -8px var(--color-wraith), inset 0 0 18px -10px var(--color-wraith)",
      };
    case "frame-crimson":
      return {
        border: "2px solid var(--color-crimson)",
        background: `linear-gradient(160deg, color-mix(in oklab, var(--color-crimson) 18%, transparent), color-mix(in oklab, var(--color-slate-sunken) 88%, transparent))`,
        boxShadow: `0 0 24px -8px var(--color-crimson), inset 0 -10px 22px -16px ${ACCENT}`,
      };
    case "frame-celestial":
      return {
        border: "2px solid transparent",
        background: `linear-gradient(color-mix(in oklab, var(--color-slate-sunken) 92%, transparent), color-mix(in oklab, var(--color-slate-sunken) 92%, transparent)) padding-box, linear-gradient(135deg, ${GOLD}, var(--color-wraith), var(--color-emerald-elixir), ${GOLD}) border-box`,
        boxShadow:
          "0 0 30px -10px var(--color-wraith), 0 0 18px -10px var(--color-emerald-elixir)",
      };
    default:
      return { ...base, border: "1.5px solid var(--color-border)" };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Mock element card — the canvas every cosmetic is previewed on.
// ════════════════════════════════════════════════════════════════════════════
function MockCard({
  frameId,
  titleId,
  charmId,
  compact = false,
}: {
  frameId?: string;
  titleId?: string;
  charmId?: string;
  compact?: boolean;
}) {
  const title = itemById(titleId);
  const charm = itemById(charmId);
  return (
    <div
      className={`mx-auto flex flex-col items-center rounded-2xl text-center ${
        compact ? "w-32 px-2 py-3" : "w-44 px-3 py-4"
      }`}
      style={frameStyle(frameId)}
    >
      <span className="text-[9px] tracking-[0.2em] uppercase text-parchment/50">79</span>
      <span
        className={`font-sans font-semibold text-spectral ${compact ? "text-3xl" : "text-4xl"}`}
      >
        Au
      </span>
      <span className={`font-display text-parchment/85 ${compact ? "text-xs" : "text-sm"}`}>
        Aurum
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-parchment/45">
        the apprentice's card
      </span>
      {(title || charm) && (
        <span
          className={`mt-2 inline-flex items-center gap-1 font-display ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={{ color: GOLD }}
        >
          {charm?.emoji && <span aria-hidden>{charm.emoji}</span>}
          {title ? title.name : null}
        </span>
      )}
    </div>
  );
}

// ── Price tag ────────────────────────────────────────────────────────────────
function Price({ cost, dim = false }: { cost: number; dim?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-display text-sm ${dim ? "opacity-45" : ""}`}
      style={{ color: GOLD }}
    >
      <Coins className="h-3.5 w-3.5" /> {cost}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  The page
// ════════════════════════════════════════════════════════════════════════════
function Emporium() {
  const { uid, profile, loading } = useUserProfile();
  const aurum = profile?.aurum ?? 0;
  const inventory = useMemo(() => new Set(profile?.inventory ?? []), [profile?.inventory]);
  const equipped = profile?.equipped ?? {};

  /** Item id currently mid-purchase/equip, to lock its button. */
  const [busy, setBusy] = useState<string | null>(null);
  /** Gentle shopkeeper feedback after a purchase attempt. */
  const [notice, setNotice] = useState<string | null>(null);

  const buy = async (item: ShopItem) => {
    if (busy) return;
    setBusy(item.id);
    setNotice(null);
    try {
      const ok = await spendAurum(uid, item.cost, item.id);
      if (ok) {
        // Auto-equip when the slot is bare — the first purchase should show.
        if (!equipped[item.slot]) await equipItem(uid, item.slot, item.id);
        setNotice(`${item.name} is yours. The shopkeeper bites your coin, nods, and wraps it up.`);
      } else {
        setNotice("The shopkeeper shakes his head — the coin didn't clear. Try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  const equip = async (item: ShopItem) => {
    if (busy) return;
    setBusy(item.id);
    setNotice(null);
    try {
      await equipItem(uid, item.slot, item.id);
    } finally {
      setBusy(null);
    }
  };

  const ownedCount = CATALOG.filter((i) => inventory.has(i.id)).length;

  return (
    <StudentShell title="The Emporium">
      <PageHeader
        eyebrow="Spend Your Aurum"
        title="The Emporium"
        subtitle="Every star, streak and duel filled your purse — here is where it opens. Frames, titles and charms change how the realm sees you; the chemistry stays free."
        icon={Store}
        accent={ACCENT}
        right={
          <div
            className="rounded-xl px-4 py-2.5 text-center"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 65%, transparent)",
              border: `1px solid color-mix(in oklab, ${GOLD} 35%, transparent)`,
            }}
          >
            <div className="flex items-center justify-center gap-1.5 font-display text-xl" style={{ color: GOLD }}>
              <Coins className="h-4.5 w-4.5" />
              {loading ? "…" : aurum}
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-parchment/60">
              aurum in purse
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-parchment/60">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
          <span className="font-display text-sm">The shopkeeper is counting your coins…</span>
        </div>
      ) : (
        <>
          {/* ── Empty purse encouragement ── */}
          {aurum === 0 && (
            <div
              className="mb-6 rounded-2xl px-4 py-3.5"
              style={{
                background: `color-mix(in oklab, ${ACCENT} 8%, transparent)`,
                borderLeft: `3px solid color-mix(in oklab, ${ACCENT} 60%, transparent)`,
              }}
            >
              <p className="mb-1 flex items-center gap-2 font-display text-sm" style={{ color: ACCENT }}>
                <ScrollText className="h-4 w-4" /> An empty purse is a full to-do list
              </p>
              <p className="text-sm leading-relaxed text-parchment/85">
                No aurum yet — but the shopkeeper keeps your favourites on the shelf. Win stars in
                any module's Trial, keep your daily Starters streak alive, or best the Alchemist in
                a duel, and come back jingling. Browse freely meanwhile; window-shopping is free.
              </p>
            </div>
          )}

          {/* ── Shopkeeper's notice after an action ── */}
          {notice && (
            <div
              className="mb-6 rounded-xl px-4 py-3 text-sm leading-relaxed text-parchment/85"
              style={{
                background: `color-mix(in oklab, ${GOLD} 8%, transparent)`,
                borderLeft: `3px solid color-mix(in oklab, ${GOLD} 60%, transparent)`,
              }}
            >
              {notice}
            </div>
          )}

          {/* ════════ Your equipped look ════════ */}
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
              <Sparkles className="h-4 w-4" style={{ color: GOLD }} /> Your Equipped Look
            </h2>
            <div
              className="flex flex-col items-center gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-8"
              style={{
                background: `linear-gradient(150deg, color-mix(in oklab, ${GOLD} 8%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))`,
                border: "1px solid var(--color-border)",
              }}
            >
              <MockCard
                frameId={equipped.frame}
                titleId={equipped.title}
                charmId={equipped.charm}
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="font-display text-spectral">
                  {ownedCount === 0
                    ? "The plain look of an honest apprentice."
                    : "This is how the realm sees your cards."}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-parchment/70">
                  {ownedCount === 0
                    ? "Nothing equipped yet — every ware below previews on this very card, so you can see exactly what your aurum buys before you part with it."
                    : "Change any piece below and this card updates the moment you equip it."}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center sm:max-w-sm">
                  {SLOT_ORDER.map((slot) => {
                    const it = itemById(equipped[slot]);
                    return (
                      <div
                        key={slot}
                        className="rounded-xl px-2 py-2"
                        style={{
                          background:
                            "color-mix(in oklab, var(--color-mist) 40%, transparent)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <dt className="text-[9px] tracking-[0.2em] uppercase text-parchment/50">
                          {slot}
                        </dt>
                        <dd className="mt-0.5 truncate font-display text-xs text-spectral">
                          {it ? `${it.emoji ? `${it.emoji} ` : ""}${it.name}` : "—"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          </section>

          {/* ════════ The shelves ════════ */}
          {SLOT_ORDER.map((slot) => {
            const meta = SLOT_META[slot];
            const items = CATALOG.filter((i) => i.slot === slot);
            return (
              <section key={slot} className="mb-10">
                <h2 className="mb-1 flex items-center gap-2 px-1 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
                  <meta.Icon className="h-4 w-4" style={{ color: ACCENT }} /> {meta.heading}
                </h2>
                <p className="mb-3 px-1 text-xs text-parchment/50">{meta.sub}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      aurum={aurum}
                      owned={inventory.has(item.id)}
                      isEquipped={equipped[item.slot] === item.id}
                      busy={busy === item.id}
                      anyBusy={busy !== null}
                      onBuy={() => void buy(item)}
                      onEquip={() => void equip(item)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* ════════ How to earn aurum ════════ */}
          <footer
            className="rounded-2xl p-5"
            style={{
              background: "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm tracking-[0.2em] uppercase text-parchment/70">
              <Coins className="h-4 w-4" style={{ color: GOLD }} /> How to Earn Aurum
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-parchment/80">
                <Star className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
                <span>
                  <span className="font-display text-spectral">Trial stars.</span> Every module
                  Trial pays 5 aurum per star, with a 5-aurum bonus for a perfect run.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-parchment/80">
                <CalendarCheck
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--color-emerald-elixir)" }}
                />
                <span>
                  <span className="font-display text-spectral">Daily Starters.</span> Your morning
                  ten pays aurum for every correct answer — and keeps your streak burning.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-parchment/80">
                <Swords
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--color-crimson)" }}
                />
                <span>
                  <span className="font-display text-spectral">Duel victories.</span> Best the
                  Alchemist for 10 / 20 / 40 aurum on easy, medium and hard.
                </span>
              </li>
            </ul>
          </footer>
        </>
      )}
    </StudentShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  One shelf item
// ════════════════════════════════════════════════════════════════════════════
function ItemCard({
  item,
  aurum,
  owned,
  isEquipped,
  busy,
  anyBusy,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  aurum: number;
  owned: boolean;
  isEquipped: boolean;
  busy: boolean;
  anyBusy: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const affordable = aurum >= item.cost;
  const shortBy = item.cost - aurum;

  return (
    <div
      className="flex flex-col rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: isEquipped
          ? `radial-gradient(circle at 35% 0%, color-mix(in oklab, ${GOLD} 12%, transparent), color-mix(in oklab, var(--color-slate-sunken) 80%, transparent))`
          : "color-mix(in oklab, var(--color-slate-sunken) 55%, transparent)",
        border: isEquipped
          ? `1px solid color-mix(in oklab, ${GOLD} 50%, transparent)`
          : "1px solid var(--color-border)",
        boxShadow: isEquipped ? `0 8px 26px -18px ${GOLD}` : "none",
      }}
    >
      {/* ── Live preview ── */}
      <div className="mb-3 flex min-h-[9.5rem] items-center justify-center">
        {item.slot === "frame" ? (
          <MockCard frameId={item.id} compact />
        ) : item.slot === "title" ? (
          <div className="text-center">
            <p className="text-[9px] tracking-[0.25em] uppercase text-parchment/45">
              inscribed beneath your name
            </p>
            <p className="mt-1.5 font-display text-lg" style={{ color: GOLD }}>
              {item.name}
            </p>
            <p className="mt-1 text-xs text-parchment/55">— Apprentice, {item.name}</p>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-5xl" aria-hidden>
              {item.emoji}
            </span>
            <p className="mt-2 inline-flex items-center gap-1 font-display text-xs" style={{ color: GOLD }}>
              <span aria-hidden>{item.emoji}</span> Grand Alchemist
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-parchment/45">
              shown beside your title
            </p>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm text-spectral">{item.name}</p>
        {!owned && <Price cost={item.cost} dim={!affordable} />}
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-parchment/60">{item.blurb}</p>

      {/* ── Action ── */}
      <div className="mt-3">
        {isEquipped ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs"
            style={{
              color: GOLD,
              background: `color-mix(in oklab, ${GOLD} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${GOLD} 45%, transparent)`,
            }}
          >
            <Check className="h-3.5 w-3.5" /> Equipped
          </span>
        ) : owned ? (
          <button
            onClick={onEquip}
            disabled={anyBusy}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs tracking-wide transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              color: "var(--color-emerald-elixir)",
              background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
              border:
                "1px solid color-mix(in oklab, var(--color-emerald-elixir) 45%, transparent)",
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Equip
          </button>
        ) : affordable ? (
          <button
            onClick={onBuy}
            disabled={anyBusy}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs tracking-wide transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              color: "var(--color-slate-sunken)",
              background: `linear-gradient(135deg, ${GOLD}, color-mix(in oklab, ${GOLD} 70%, ${ACCENT}))`,
              boxShadow: `0 6px 20px -10px ${GOLD}`,
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
            Buy · {item.cost}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-parchment/45">
            <Coins className="h-3.5 w-3.5 opacity-50" /> {shortBy} more aurum needed
          </span>
        )}
      </div>
    </div>
  );
}
