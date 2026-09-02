// Duel the Alchemist — pure battle engine (no React). Deterministic given an
// injected RNG, so matches can be replayed/animated and unit-tested, and so a
// future online-duel layer can drive it from serialized state.
//
// Every battle stat is DERIVED FROM REAL CHEMISTRY (see DUEL_STATS below):
//   HP    — 6 + 2×(occupied electron shells) + (valence electrons), hand-tuned
//           into an ~9–20 spread. More electrons around a bigger core = more
//           "substance" to wear down. (Fe is tuned up: iron is the structural
//           metal — but see its Rusts drawback.)
//   ATK   — |common oxidation state| × 2. The charge an atom takes in its
//           everyday compounds is its real chemical "combining violence":
//           H +1, C ±4, N −3, O −2, S −2, Cl −1, Na +1, Mg +2, Al +3,
//           K +1, Ca +2, Fe +3 (iron(III), as in rust Fe₂O₃).
//   SPEED — state of matter at room temperature. Gases (H₂, N₂, O₂, Cl₂) act
//           first; solids act last; ties broken by atomic number, lighter
//           first. (No liquids among these 12 — bromine and mercury are the
//           only liquid elements at room temperature.)
//   ABILITY — one per element, each justified by a real property.
//
// The Forge move is the chemistry lesson AS the power move: two held element
// cards whose real `combine()` result is a documented compound can be fused
// into a single compound card (summed HP, atk = sum + 1) with the "stable"
// trait — a stable compound shrugs off lingering effects like burns.
// Exception: compounds the combiner marks `unstable` (e.g. NCl₃) do NOT gain
// stability — honest chemistry, honest gameplay.

import { BASE_CARDS, cardBySymbol, combineCards, type Card } from "./cards";

// ── RNG ─────────────────────────────────────────────────────────────────────
/** Any function returning uniform [0, 1). Inject a seeded one for replays. */
export type Rng = () => number;

/** Small seeded RNG (mulberry32) so the UI can create reproducible matches. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Abilities ───────────────────────────────────────────────────────────────
export type AbilityId =
  | "combust" // H  (active)
  | "bonds" // C  (passive)
  | "tripleBond" // N  (active)
  | "oxidise" // O  (active)
  | "acidRain" // S  (active)
  | "electronThief" // Cl (active)
  | "waterFury" // Na (passive)
  | "oxideSkin" // Al (passive)
  | "blindingFlare" // Mg (active)
  | "waterWrath" // K  (passive)
  | "boneWard" // Ca (active)
  | "rusts"; // Fe (passive)

export interface AbilityInfo {
  id: AbilityId;
  name: string;
  kind: "active" | "passive";
  /** What it does, in game terms. */
  effect: string;
  /** The one-line REAL-chemistry justification, shown on the card face. */
  chemistry: string;
}

/** Active abilities are limited so a healer can't stall forever. */
export const ABILITY_USES = 3;

export const ABILITIES: Record<AbilityId, AbilityInfo> = {
  combust: {
    id: "combust",
    name: "Combustion Rush",
    kind: "active",
    effect: `Pay 2 HP to strike for ATK + 4. ${ABILITY_USES} uses.`,
    chemistry: "Hydrogen releases more energy per gram than any other fuel: 2H₂ + O₂ → 2H₂O.",
  },
  bonds: {
    id: "bonds",
    name: "Versatile Bonds",
    kind: "passive",
    effect: "+1 ATK for every other allied card still standing.",
    chemistry: "Carbon's four valence electrons form four bonds — the backbone of every chain of life.",
  },
  tripleBond: {
    id: "tripleBond",
    name: "Triple-Bond Shield",
    kind: "active",
    effect: `Halve the next hit this card takes. ${ABILITY_USES} uses.`,
    chemistry: "The N≡N triple bond is among the strongest in chemistry — nitrogen gas is nearly inert.",
  },
  oxidise: {
    id: "oxidise",
    name: "Oxidise",
    kind: "active",
    effect: `Deal 2 now and set a 1-damage-per-turn burn. ${ABILITY_USES} uses.`,
    chemistry: "Oxygen strips electrons from almost everything — rust and fire are the same slow burn.",
  },
  acidRain: {
    id: "acidRain",
    name: "Acid Rain",
    kind: "active",
    effect: `Deal 2 damage to EVERY enemy card, bench included. ${ABILITY_USES} uses.`,
    chemistry: "Sulfur burns to SO₂, which dissolves in rain as acid and falls on the whole field.",
  },
  electronThief: {
    id: "electronThief",
    name: "Electron Thief",
    kind: "active",
    effect: `Deal 3 damage and drink 2 HP back. ${ABILITY_USES} uses.`,
    chemistry: "Chlorine has one of the highest electron affinities of any element — a born thief.",
  },
  waterFury: {
    id: "waterFury",
    name: "Violent With Water",
    kind: "passive",
    effect: "Attacks deal DOUBLE damage to H and O (the water-formers), but cost 2 recoil.",
    chemistry: "Sodium erupts on contact with water — 2Na + 2H₂O → 2NaOH + H₂, plus flame.",
  },
  oxideSkin: {
    id: "oxideSkin",
    name: "Oxide Skin",
    kind: "passive",
    effect: "Every hit taken is reduced by 1 (never below 1).",
    chemistry: "Aluminium instantly grows a thin Al₂O₃ armour that seals the metal from attack.",
  },
  blindingFlare: {
    id: "blindingFlare",
    name: "Blinding Flare",
    kind: "active",
    effect: `Deal 2 and halve the target's next attack. ${ABILITY_USES} uses.`,
    chemistry: "Burning magnesium is a brilliant white — bright enough to damage eyes that stare.",
  },
  waterWrath: {
    id: "waterWrath",
    name: "Wrathful With Water",
    kind: "passive",
    effect: "Attacks deal DOUBLE damage to H and O, but cost 3 recoil.",
    chemistry: "Potassium reacts with water even more violently than sodium — it ignites with a lilac flame.",
  },
  boneWard: {
    id: "boneWard",
    name: "Bone Ward",
    kind: "active",
    effect: `Restore 3 HP (up to full). ${ABILITY_USES} uses.`,
    chemistry: "Bones, shells and limestone are calcium compounds — the body's structural mineral.",
  },
  rusts: {
    id: "rusts",
    name: "Rusts",
    kind: "passive",
    effect: "Highest HP in the deck, but loses 1 HP after each of its turns while an enemy Oxygen lives.",
    chemistry: "Iron is strong yet slowly corrodes in air: 4Fe + 3O₂ → 2Fe₂O₃ (rust).",
  },
};

// ── Battle stats per element ────────────────────────────────────────────────
export interface DuelStat {
  hp: number;
  atk: number;
  /** 2 = gas at room temperature (acts first), 1 = solid (acts last). */
  speedTier: 1 | 2;
  ability: AbilityId;
  /** |common oxidation state| — shown in the explainer table. */
  oxState: number;
}

/**
 * Rule of derivation (hand-tuned afterwards for balance):
 *   HP  = 6 + 2×shells + valence electrons  (H 1sh/1v → 9 … Cl 3sh/7v → 19;
 *         Fe tuned to 20 — structural metal, offset by its Rusts drawback).
 *   ATK = |common oxidation state| × 2.
 *   speedTier from room-temperature state: H₂, N₂, O₂, Cl₂ are gases (2);
 *   the rest are solids (1). Ties break by atomic number, lighter first.
 */
export const DUEL_STATS: Record<string, DuelStat> = {
  H: { hp: 9, atk: 2, speedTier: 2, ability: "combust", oxState: 1 },
  C: { hp: 14, atk: 8, speedTier: 1, ability: "bonds", oxState: 4 },
  N: { hp: 15, atk: 6, speedTier: 2, ability: "tripleBond", oxState: 3 },
  O: { hp: 16, atk: 4, speedTier: 2, ability: "oxidise", oxState: 2 },
  S: { hp: 18, atk: 4, speedTier: 1, ability: "acidRain", oxState: 2 },
  Cl: { hp: 19, atk: 2, speedTier: 2, ability: "electronThief", oxState: 1 },
  Na: { hp: 13, atk: 2, speedTier: 1, ability: "waterFury", oxState: 1 },
  Mg: { hp: 14, atk: 4, speedTier: 1, ability: "blindingFlare", oxState: 2 },
  Al: { hp: 15, atk: 6, speedTier: 1, ability: "oxideSkin", oxState: 3 },
  K: { hp: 15, atk: 2, speedTier: 1, ability: "waterWrath", oxState: 1 },
  Ca: { hp: 16, atk: 4, speedTier: 1, ability: "boneWard", oxState: 2 },
  Fe: { hp: 20, atk: 6, speedTier: 1, ability: "rusts", oxState: 3 },
};

// ── Fighters ────────────────────────────────────────────────────────────────
export interface Fighter {
  /** Unique per match instance, e.g. "p-Na" / "e-H2O". */
  id: string;
  /** Element symbol ("Na") or compound formula ("NaCl"). */
  symbol: string;
  name: string;
  color: string;
  hp: number;
  maxHp: number;
  atk: number;
  speedTier: 1 | 2;
  /** Atomic number (compounds: sum of the pair) — the speed tie-breaker. */
  number: number;
  /** null for compound cards — their power IS their stats + stability. */
  ability: AbilityId | null;
  abilityUsesLeft: number;
  isCompound: boolean;
  /** Stable compound: immune to lingering effects (burn, dazzle). */
  stable: boolean;
  /** Formula of a forged compound, for display ("H2O"). */
  formula?: string;
  /** Lingering burn damage per turn (from Oxidise). */
  burn: number;
  /** Next incoming hit is halved (Triple-Bond Shield). */
  guard: boolean;
  /** Next outgoing attack is halved (Blinding Flare). */
  dazzled: boolean;
  /** Set once when the card reaches 0 HP (so the faint is narrated once). */
  fainted: boolean;
}

export function makeFighter(card: Card, owner: "p" | "e"): Fighter {
  const s = DUEL_STATS[card.symbol];
  if (!s) throw new Error(`No duel stats for ${card.symbol}`);
  return {
    id: `${owner}-${card.symbol}`,
    symbol: card.symbol,
    name: card.name,
    color: card.color,
    hp: s.hp,
    maxHp: s.hp,
    atk: s.atk,
    speedTier: s.speedTier,
    number: card.number,
    ability: s.ability,
    abilityUsesLeft: ABILITIES[s.ability].kind === "active" ? ABILITY_USES : 0,
    isCompound: false,
    stable: false,
    burn: 0,
    guard: false,
    dazzled: false,
    fainted: false,
  };
}

// ── Match state ─────────────────────────────────────────────────────────────
export type SideId = 0 | 1; // 0 = player, 1 = enemy (AI)

export interface SideState {
  cards: Fighter[];
  /** Index into `cards` of the active fighter. */
  active: number;
}

export type LogKind =
  | "start"
  | "round"
  | "attack"
  | "ability"
  | "swap"
  | "forge"
  | "tick"
  | "faint"
  | "promote"
  | "win";

export interface LogEvent {
  kind: LogKind;
  /** Which side caused the event (attacker/actor). */
  side: SideId;
  text: string;
  /** Damage dealt, when applicable — lets the UI flash the right card. */
  damage?: number;
  /** id of the fighter that took damage / fainted / was promoted. */
  targetId?: string;
}

export interface DuelState {
  sides: [SideState, SideState];
  /** Whose action is next. */
  turn: SideId;
  round: number;
  acted: [boolean, boolean];
  winner: SideId | null;
  log: LogEvent[];
}

/** Matches end by judgement (total HP) if they somehow reach this round. */
export const MAX_ROUNDS = 50;

export type Move =
  | { type: "attack" }
  | { type: "ability" }
  | { type: "swap"; index: number }
  | { type: "forge"; a: number; b: number };

// ── Setup ───────────────────────────────────────────────────────────────────
function shuffled<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function faster(state: DuelState): SideId {
  const a = state.sides[0].cards[state.sides[0].active];
  const b = state.sides[1].cards[state.sides[1].active];
  if (a.speedTier !== b.speedTier) return a.speedTier > b.speedTier ? 0 : 1;
  if (a.number !== b.number) return a.number < b.number ? 0 : 1;
  return 0; // deterministic: challenger moves on a dead tie
}

/**
 * Deal a match. The 12 cards are shuffled; the player takes 4 (or the 4
 * symbols they drafted), the enemy draws 4 from the remainder — one physical
 * card set, no duplicates on the table.
 */
export function createDuel(rng: Rng, playerDraft?: string[]): DuelState {
  const deck = shuffled(BASE_CARDS, rng);
  let playerCards: Card[];
  if (playerDraft && playerDraft.length === 4) {
    playerCards = playerDraft.map((s) => {
      const c = cardBySymbol(s);
      if (!c) throw new Error(`Unknown card ${s}`);
      return c;
    });
  } else {
    playerCards = deck.slice(0, 4);
  }
  const taken = new Set(playerCards.map((c) => c.symbol));
  const enemyCards = deck.filter((c) => !taken.has(c.symbol)).slice(0, 4);

  const state: DuelState = {
    sides: [
      { cards: playerCards.map((c) => makeFighter(c, "p")), active: 0 },
      { cards: enemyCards.map((c) => makeFighter(c, "e")), active: 0 },
    ],
    turn: 0,
    round: 1,
    acted: [false, false],
    winner: null,
    log: [],
  };
  state.turn = faster(state);
  state.log.push({
    kind: "start",
    side: state.turn,
    text:
      state.turn === 0
        ? `${activeOf(state, 0).name} is a swifter reagent — you strike first.`
        : `${activeOf(state, 1).name} is the swifter reagent — the rival strikes first.`,
  });
  return state;
}

export function activeOf(state: DuelState, side: SideId): Fighter {
  return state.sides[side].cards[state.sides[side].active];
}

export function aliveCards(state: DuelState, side: SideId): Fighter[] {
  return state.sides[side].cards.filter((c) => c.hp > 0);
}

// ── Forge discovery ─────────────────────────────────────────────────────────
export interface ForgeOption {
  a: number;
  b: number;
  formula: string;
  name: string;
  /** e.g. "Water", "Table salt" — from the compound codex enrichment. */
  commonName?: string;
  unstable: boolean;
}

/** All pairs of a side's living element cards that fuse into a REAL, documented compound. */
export function forgeOptions(state: DuelState, side: SideId): ForgeOption[] {
  const cards = state.sides[side].cards;
  const out: ForgeOption[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];
      if (a.hp <= 0 || b.hp <= 0 || a.isCompound || b.isCompound) continue;
      const ca = cardBySymbol(a.symbol);
      const cb = cardBySymbol(b.symbol);
      if (!ca || !cb) continue;
      const res = combineCards(ca, cb);
      // Only enriched (documented, real) compounds are forgeable — the lesson.
      if (!res.valid || !res.formula || !res.commonName) continue;
      out.push({
        a: i,
        b: j,
        formula: res.formula,
        name: res.name ?? res.formula,
        commonName: res.commonName,
        unstable: res.unstable === true,
      });
    }
  }
  return out;
}

// ── Legal moves ─────────────────────────────────────────────────────────────
export function legalMoves(state: DuelState, side: SideId): Move[] {
  if (state.winner !== null) return [];
  const s = state.sides[side];
  const act = s.cards[s.active];
  const moves: Move[] = [{ type: "attack" }];
  if (
    act.ability &&
    ABILITIES[act.ability].kind === "active" &&
    act.abilityUsesLeft > 0
  ) {
    moves.push({ type: "ability" });
  }
  s.cards.forEach((c, i) => {
    if (i !== s.active && c.hp > 0) moves.push({ type: "swap", index: i });
  });
  for (const f of forgeOptions(state, side)) {
    moves.push({ type: "forge", a: f.a, b: f.b });
  }
  return moves;
}

// ── Damage pipeline ─────────────────────────────────────────────────────────
const WATER_FORMERS = new Set(["H", "O"]);

interface HitResult {
  damage: number;
  recoil: number;
  doubled: boolean;
}

/**
 * Full damage pipeline for a standard hit:
 * base → Carbon bond bonus → water-fury doubling → dazzle → guard → oxide skin.
 * Pure; consumes no flags (the caller clears guard/dazzle after applying).
 */
export function computeHit(
  attacker: Fighter,
  attackerAllies: Fighter[],
  defender: Fighter,
  bonus = 0,
): HitResult {
  let dmg = attacker.atk + bonus;
  if (attacker.ability === "bonds") {
    dmg += attackerAllies.filter((c) => c.hp > 0 && c.id !== attacker.id).length;
  }
  let recoil = 0;
  let doubled = false;
  if (
    (attacker.ability === "waterFury" || attacker.ability === "waterWrath") &&
    !defender.isCompound &&
    WATER_FORMERS.has(defender.symbol)
  ) {
    dmg *= 2;
    doubled = true;
    recoil = attacker.ability === "waterFury" ? 2 : 3;
  }
  if (attacker.dazzled) dmg = Math.ceil(dmg / 2);
  if (defender.guard) dmg = Math.ceil(dmg / 2);
  if (defender.ability === "oxideSkin") dmg = Math.max(1, dmg - 1);
  return { damage: Math.max(1, dmg), recoil, doubled };
}

// ── Applying moves ──────────────────────────────────────────────────────────
function clone(state: DuelState): DuelState {
  return {
    sides: [
      { cards: state.sides[0].cards.map((c) => ({ ...c })), active: state.sides[0].active },
      { cards: state.sides[1].cards.map((c) => ({ ...c })), active: state.sides[1].active },
    ],
    turn: state.turn,
    round: state.round,
    acted: [state.acted[0], state.acted[1]],
    winner: state.winner,
    log: [...state.log],
  };
}

function sideName(side: SideId): string {
  return side === 0 ? "Your" : "The rival's";
}

function hurt(st: DuelState, side: SideId, cardIndex: number, dmg: number): void {
  const c = st.sides[side].cards[cardIndex];
  c.hp = Math.max(0, c.hp - dmg);
}

function checkFaints(st: DuelState, actorSide: SideId): void {
  for (const side of [0, 1] as const) {
    const s = st.sides[side];
    // Log newly fainted cards (hp 0 but still marked active/benched normally).
    for (const c of s.cards) {
      if (c.hp === 0 && !c.fainted) {
        c.fainted = true;
        st.log.push({
          kind: "faint",
          side,
          targetId: c.id,
          text: `${sideName(side)} ${c.name} is spent — its essence returns to the aether.`,
        });
      }
    }
    // Promote a bench card if the active one fell.
    if (s.cards[s.active].hp <= 0) {
      const next = s.cards.findIndex((c) => c.hp > 0);
      if (next >= 0) {
        s.active = next;
        st.log.push({
          kind: "promote",
          side,
          targetId: s.cards[next].id,
          text: `${sideName(side)} ${s.cards[next].name} steps into the circle.`,
        });
      }
    }
  }
  // Winner?
  const alive0 = st.sides[0].cards.some((c) => c.hp > 0);
  const alive1 = st.sides[1].cards.some((c) => c.hp > 0);
  if (!alive0 || !alive1) {
    st.winner = !alive0 && !alive1 ? actorSide : alive0 ? 0 : 1;
    st.log.push({
      kind: "win",
      side: st.winner,
      text:
        st.winner === 0
          ? "The rival's cauldron falls silent. Victory is yours, alchemist!"
          : "Your last reagent is spent. The rival claims the duel.",
    });
  }
}

/** End-of-turn lingering effects for the side that just acted. */
function endOfTurnTicks(st: DuelState, side: SideId): void {
  const s = st.sides[side];
  const act = s.cards[s.active];
  if (act.hp > 0 && act.burn > 0) {
    hurt(st, side, s.active, act.burn);
    st.log.push({
      kind: "tick",
      side,
      damage: act.burn,
      targetId: act.id,
      text: `${sideName(side)} ${act.name} smoulders under oxidation — ${act.burn} damage.`,
    });
  }
  if (
    act.hp > 0 &&
    act.ability === "rusts" &&
    st.sides[side === 0 ? 1 : 0].cards.some((c) => c.hp > 0 && c.symbol === "O")
  ) {
    hurt(st, side, s.active, 1);
    st.log.push({
      kind: "tick",
      side,
      damage: 1,
      targetId: act.id,
      text: `${sideName(side)} Iron flakes to rust in Oxygen's presence — 1 damage.`,
    });
  }
}

function advanceTurn(st: DuelState): void {
  if (st.winner !== null) return;
  st.acted[st.turn] = true;
  const other: SideId = st.turn === 0 ? 1 : 0;
  if (!st.acted[other]) {
    st.turn = other;
    return;
  }
  // New round.
  st.round += 1;
  st.acted = [false, false];
  if (st.round > MAX_ROUNDS) {
    const hp0 = st.sides[0].cards.reduce((n, c) => n + c.hp, 0);
    const hp1 = st.sides[1].cards.reduce((n, c) => n + c.hp, 0);
    st.winner = hp0 === hp1 ? (aliveCards(st, 0).length >= aliveCards(st, 1).length ? 0 : 1) : hp0 > hp1 ? 0 : 1;
    st.log.push({
      kind: "win",
      side: st.winner,
      text: `The candles gutter out — the judges weigh both cauldrons. ${
        st.winner === 0 ? "Yours holds more essence: victory!" : "The rival's holds more essence."
      }`,
    });
    return;
  }
  st.turn = faster(st);
  st.log.push({ kind: "round", side: st.turn, text: `— Round ${st.round} —` });
}

/**
 * Apply the current side's move. Pure: returns a NEW state with narration
 * appended to `log` (the UI can diff by log length to animate).
 */
export function applyMove(state: DuelState, move: Move): DuelState {
  if (state.winner !== null) return state;
  const st = clone(state);
  const side = st.turn;
  const foe: SideId = side === 0 ? 1 : 0;
  const mine = st.sides[side];
  const theirs = st.sides[foe];
  const me = mine.cards[mine.active];
  const enemy = theirs.cards[theirs.active];

  switch (move.type) {
    case "attack": {
      const hit = computeHit(me, mine.cards, enemy, 0);
      hurt(st, foe, theirs.active, hit.damage);
      if (me.dazzled) me.dazzled = false;
      if (enemy.guard) enemy.guard = false;
      let text = hit.doubled
        ? `${me.name} erupts on contact with the water-former! ${hit.damage} damage to ${enemy.name}`
        : `${me.name} strikes ${enemy.name} for ${hit.damage} damage`;
      if (hit.recoil > 0) {
        hurt(st, side, mine.active, hit.recoil);
        text += `, ${hit.recoil} recoil`;
      }
      st.log.push({ kind: "attack", side, damage: hit.damage, targetId: enemy.id, text: `${text}.` });
      break;
    }

    case "ability": {
      if (!me.ability || ABILITIES[me.ability].kind !== "active" || me.abilityUsesLeft <= 0) {
        // Illegal — treat as a fumbled attack of 1 to keep the engine total.
        st.log.push({ kind: "ability", side, text: `${me.name} fumbles its incantation.` });
        break;
      }
      me.abilityUsesLeft -= 1;
      switch (me.ability) {
        case "combust": {
          hurt(st, side, mine.active, 2);
          const hit = computeHit(me, mine.cards, enemy, 4);
          hurt(st, foe, theirs.active, hit.damage);
          if (me.dazzled) me.dazzled = false;
          if (enemy.guard) enemy.guard = false;
          if (hit.recoil > 0) hurt(st, side, mine.active, hit.recoil);
          st.log.push({
            kind: "ability",
            side,
            damage: hit.damage,
            targetId: enemy.id,
            text: `${me.name} ignites like rocket fuel — ${hit.damage} damage to ${enemy.name}, 2 HP spent as propellant.`,
          });
          break;
        }
        case "tripleBond": {
          me.guard = true;
          st.log.push({
            kind: "ability",
            side,
            text: `${me.name} locks into its triple bond — the next blow will be halved.`,
          });
          break;
        }
        case "oxidise": {
          const dmg = Math.max(1, enemy.ability === "oxideSkin" ? 1 : 2);
          hurt(st, foe, theirs.active, dmg);
          let text = `${me.name} oxidises ${enemy.name} — ${dmg} damage`;
          if (enemy.stable) {
            text += ", but the stable compound refuses to keep burning.";
          } else {
            enemy.burn = 1;
            text += ", and a slow burn takes hold.";
          }
          st.log.push({ kind: "ability", side, damage: dmg, targetId: enemy.id, text });
          break;
        }
        case "acidRain": {
          theirs.cards.forEach((c, i) => {
            if (c.hp > 0) hurt(st, foe, i, 2);
          });
          st.log.push({
            kind: "ability",
            side,
            damage: 2,
            targetId: enemy.id,
            text: `${me.name} sends up choking fumes — acid rain falls on the whole enemy field for 2.`,
          });
          break;
        }
        case "electronThief": {
          const dmg = Math.max(1, enemy.ability === "oxideSkin" ? 2 : 3);
          hurt(st, foe, theirs.active, dmg);
          me.hp = Math.min(me.maxHp, me.hp + 2);
          st.log.push({
            kind: "ability",
            side,
            damage: dmg,
            targetId: enemy.id,
            text: `${me.name} rips electrons from ${enemy.name} — ${dmg} damage, and drinks 2 HP back.`,
          });
          break;
        }
        case "blindingFlare": {
          hurt(st, foe, theirs.active, 2);
          let text = `${me.name} flares blinding white — 2 damage`;
          if (enemy.stable) {
            text += "; the stable compound does not blink.";
          } else {
            enemy.dazzled = true;
            text += `, and ${enemy.name} is dazzled — its next attack is halved.`;
          }
          st.log.push({ kind: "ability", side, damage: 2, targetId: enemy.id, text });
          break;
        }
        case "boneWard": {
          const healed = Math.min(3, me.maxHp - me.hp);
          me.hp += healed;
          st.log.push({
            kind: "ability",
            side,
            targetId: me.id,
            text: `${me.name} raises a fortress of bone-mineral — ${healed} HP restored.`,
          });
          break;
        }
        default:
          break;
      }
      break;
    }

    case "swap": {
      const target = mine.cards[move.index];
      if (!target || target.hp <= 0 || move.index === mine.active) break;
      me.guard = false; // shields don't survive leaving the circle
      mine.active = move.index;
      st.log.push({
        kind: "swap",
        side,
        targetId: target.id,
        text: `${sideName(side)} ${me.name} withdraws; ${target.name} takes the circle.`,
      });
      break;
    }

    case "forge": {
      const opt = forgeOptions(st, side).find((f) => f.a === move.a && f.b === move.b);
      if (!opt) break;
      const a = mine.cards[move.a];
      const b = mine.cards[move.b];
      const fused: Fighter = {
        id: `${side === 0 ? "p" : "e"}-${opt.formula}`,
        symbol: opt.formula,
        name: opt.commonName ?? opt.name,
        color: "var(--color-gold)",
        hp: a.hp + b.hp,
        maxHp: a.maxHp + b.maxHp,
        atk: a.atk + b.atk + 1,
        speedTier: 1, // compounds are heavier — they act at solid speed
        number: a.number + b.number,
        ability: null,
        abilityUsesLeft: 0,
        isCompound: true,
        stable: !opt.unstable, // unstable compounds (NCl₃…) gain no stability
        formula: opt.formula,
        burn: 0,
        guard: false,
        dazzled: false,
        fainted: false,
      };
      const wasActive = mine.active === move.a || mine.active === move.b;
      const keep = Math.min(move.a, move.b);
      const drop = Math.max(move.a, move.b);
      mine.cards[keep] = fused;
      mine.cards.splice(drop, 1);
      if (wasActive) mine.active = keep;
      else if (mine.active > drop) mine.active -= 1;
      st.log.push({
        kind: "forge",
        side,
        targetId: fused.id,
        text: `${sideName(side)} cauldron blazes — ${a.name} + ${b.name} fuse into ${opt.formula} (${fused.name})${
          fused.stable ? ", a STABLE compound immune to lingering harm" : " — an UNSTABLE compound, forged at its own risk"
        }!`,
      });
      break;
    }
  }

  endOfTurnTicks(st, side);
  checkFaints(st, side);
  advanceTurn(st);
  return st;
}

// ── AI ──────────────────────────────────────────────────────────────────────
export type Difficulty = "easy" | "medium" | "hard";

/** Immediate damage a side's best plain option deals to the enemy active card. */
function bestImmediateDamage(state: DuelState, side: SideId): number {
  const s = state.sides[side];
  const me = s.cards[s.active];
  const foe: SideId = side === 0 ? 1 : 0;
  const enemy = state.sides[foe].cards[state.sides[foe].active];
  if (me.hp <= 0) return 0;
  let best = computeHit(me, s.cards, enemy).damage;
  if (me.ability && ABILITIES[me.ability].kind === "active" && me.abilityUsesLeft > 0) {
    const abilityDmg =
      me.ability === "combust"
        ? computeHit(me, s.cards, enemy, 4).damage
        : me.ability === "oxidise"
          ? 2
          : me.ability === "electronThief"
            ? 3
            : me.ability === "acidRain" || me.ability === "blindingFlare"
              ? 2
              : 0;
    best = Math.max(best, abilityDmg);
  }
  return best;
}

/** Immediate damage (to the enemy active) that a given move produces, by simulation. */
function moveDamage(state: DuelState, move: Move): number {
  const foe: SideId = state.turn === 0 ? 1 : 0;
  const before = state.sides[foe].cards.reduce((n, c) => n + c.hp, 0);
  const after = applyMove(state, move);
  const now = after.sides[foe].cards.reduce((n, c) => n + c.hp, 0);
  return before - now;
}

function pickWeighted<T>(rng: Rng, entries: [T, number][]): T {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

/**
 * The three rivals:
 *  - easy   ("Novice Rival"): random legal move, weighted toward attacking so
 *           duels stay lively; never forges.
 *  - medium ("Journeyman Rival"): greedy — the move dealing the most immediate
 *           damage; retreats a badly wounded active card. Never forges.
 *  - hard   ("The Grand Alchemist"): 1-ply lookahead — scores damage dealt,
 *           kills, the counter-blow it expects to take, and next-turn threat
 *           (so it swaps its water-reactive metals in against H and O and
 *           forges when the fused card out-values the pair).
 */
export function chooseAiMove(state: DuelState, difficulty: Difficulty, rng: Rng): Move {
  const side = state.turn;
  const moves = legalMoves(state, side);
  if (moves.length === 0) return { type: "attack" };
  const attackish = moves.filter((m) => m.type === "attack" || m.type === "ability");
  const swaps = moves.filter((m) => m.type === "swap");
  const forges = moves.filter((m) => m.type === "forge");

  if (difficulty === "easy") {
    const entries: [Move, number][] = [];
    for (const m of attackish) entries.push([m, m.type === "attack" ? 6 : 2]);
    for (const m of swaps) entries.push([m, 1]);
    return pickWeighted(rng, entries);
  }

  if (difficulty === "medium") {
    const s = state.sides[side];
    const me = s.cards[s.active];
    // Retreat when badly hurt and a healthier bench card exists.
    if (me.hp <= Math.max(3, Math.floor(me.maxHp * 0.25))) {
      let bestSwap: Move | null = null;
      let bestHp = me.hp;
      for (const m of swaps) {
        if (m.type !== "swap") continue;
        const c = s.cards[m.index];
        if (c.hp > bestHp) {
          bestHp = c.hp;
          bestSwap = m;
        }
      }
      if (bestSwap) return bestSwap;
    }
    // Otherwise: greedy damage.
    let best = attackish[0];
    let bestDmg = -1;
    for (const m of attackish) {
      const d = moveDamage(state, m);
      if (d > bestDmg) {
        bestDmg = d;
        best = m;
      }
    }
    return best;
  }

  // hard — score every legal move with a 1-ply lookahead.
  const foe: SideId = side === 0 ? 1 : 0;
  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const after = applyMove(state, m);
    const enemyHpBefore = state.sides[foe].cards.reduce((n, c) => n + c.hp, 0);
    const enemyHpAfter = after.sides[foe].cards.reduce((n, c) => n + c.hp, 0);
    const myHpBefore = state.sides[side].cards.reduce((n, c) => n + c.hp, 0);
    const myHpAfter = after.sides[side].cards.reduce((n, c) => n + c.hp, 0);
    const kills =
      aliveCards(state, foe).length - after.sides[foe].cards.filter((c) => c.hp > 0).length;

    let score = (enemyHpBefore - enemyHpAfter) + 8 * kills - 0.6 * (myHpBefore - myHpAfter);
    if (after.winner === side) score += 1000;
    if (after.winner === foe) score -= 1000;

    if (after.winner === null) {
      // Counter-blow we expect to take before we act again.
      const incoming = bestImmediateDamage(after, foe);
      const myActive = after.sides[side].cards[after.sides[side].active];
      score -= 0.9 * incoming;
      if (incoming >= myActive.hp) score -= 6; // our champion would fall
      // Next-turn threat: what our resulting active can do afterwards. This is
      // what makes it swap Na/K in against H/O and value a forged compound.
      score += 0.8 * bestImmediateDamage(after, side);
      // Slight preference for keeping stable compounds when burning.
      if (myActive.stable) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
