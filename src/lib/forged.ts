// Forged cards — NEW cards introduced by Alche-mixing two cards together in
// the AR scanner. Unlike the 12 physical base cards, these are earned digitally:
// the mix ceremony reveals the card, and it gets registered to the student's
// Grimoire (see profile.registerForged). Each forged card carries its own
// printable face — its "itsura" — that the student can print from the Grimoire.
//
// Two flavours live in the registry:
//   • Hand-authored cards with PNG art (the mythic sample below).
//   • Dynamic compound cards forged from a real `combine()` result
//     (lib/cards.ts). Their id is `mix:<formula>` and their face is a styled
//     data card generated as an inline SVG — no PNG asset needed, and the
//     Grimoire's existing `<img src>` / print flow renders it unchanged.

import { BASE_CARDS, combine, type MixResult } from "./cards";

export interface ForgedCard {
  /** Stable id stored in the profile's `forged` array. */
  id: string;
  name: string;
  /** Public path (or data: URI) to the printable card face (the itsura). */
  image: string;
  /** Present only on dynamic compound cards (id `mix:<formula>`). */
  formula?: string;
  bond?: "ionic" | "covalent";
  uses?: string;
  hazard?: string;
}

export const FORGED_CARDS: ForgedCard[] = [
  // Sample forged card. Swap the image for the real art per new element.
  { id: "3rd_card", name: "Forged Element", image: "/other_cards/3rd_card.png" },
];

export function forgedById(id: string): ForgedCard | undefined {
  return FORGED_CARDS.find((c) => c.id === id);
}

/** "H2O" → "H₂O" — pretty subscripts for on-screen formulas. */
export function formulaDisplay(formula: string): string {
  return formula.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
}

// ── SVG data-card face for mix-forged compounds ─────────────────────────────
const BOND_ACCENT: Record<"ionic" | "covalent", string> = {
  ionic: "#d4b25a", // gold — electrons handed over
  covalent: "#34d399", // emerald — electrons shared
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Greedy word-wrap, capped at `maxLines` (last line gets an ellipsis). */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] += "…";
  }
  return lines;
}

function mixCardImage(card: {
  name: string;
  formula: string;
  bond: "ionic" | "covalent";
  uses?: string;
  hazard?: string;
}): string {
  const accent = BOND_ACCENT[card.bond];
  const badge = card.bond === "ionic" ? "IONIC BOND" : "COVALENT BOND";
  const nameLines = wrapText(card.name, 24, 2);
  const usesLines = card.uses ? wrapText(card.uses, 38, 3) : [];

  const nameSvg = nameLines
    .map((l, i) => `<text x="300" y="${470 + i * 52}" text-anchor="middle" fill="#e8dcc0" font-family="Georgia, serif" font-size="42">${escapeXml(l)}</text>`)
    .join("");
  const usesSvg = usesLines
    .map((l, i) => `<text x="300" y="${628 + i * 36}" text-anchor="middle" fill="#e8dcc0" fill-opacity="0.75" font-family="system-ui, sans-serif" font-size="25">${escapeXml(l)}</text>`)
    .join("");
  const hazardSvg = card.hazard
    ? `<text x="300" y="742" text-anchor="middle" fill="#f87171" font-family="system-ui, sans-serif" font-size="22" letter-spacing="3">⚠ ${escapeXml(card.hazard.toUpperCase())}</text>`
    : `<text x="300" y="742" text-anchor="middle" fill="#e8dcc0" fill-opacity="0.4" font-family="system-ui, sans-serif" font-size="20" font-style="italic">Forged by Alche-mix</text>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">` +
    `<rect width="600" height="800" fill="#0b1120"/>` +
    `<rect x="16" y="16" width="568" height="768" rx="30" fill="#101a2b" stroke="${accent}" stroke-width="3"/>` +
    `<circle cx="300" cy="300" r="170" fill="${accent}" fill-opacity="0.08"/>` +
    `<rect x="185" y="60" width="230" height="46" rx="23" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-opacity="0.5"/>` +
    `<text x="300" y="91" text-anchor="middle" fill="${accent}" font-family="system-ui, sans-serif" font-size="20" letter-spacing="3">${badge}</text>` +
    `<text x="300" y="345" text-anchor="middle" fill="${accent}" font-family="system-ui, sans-serif" font-weight="bold" font-size="112">${escapeXml(formulaDisplay(card.formula))}</text>` +
    nameSvg +
    `<line x1="90" y1="576" x2="510" y2="576" stroke="#e8dcc0" stroke-opacity="0.18" stroke-width="2"/>` +
    usesSvg +
    hazardSvg +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Build a forged-card record from a SUCCESSFUL MixResult. Returns undefined
 * for invalid mixes. The id is `mix:<formula>` — the same id the ceremony
 * registers via profile.registerForged.
 */
export function forgedFromMix(mix: MixResult): ForgedCard | undefined {
  if (!mix.valid || !mix.formula || !mix.bond) return undefined;
  const name = mix.commonName ?? mix.name ?? mix.formula;
  const hazard = mix.hazard && mix.hazard !== "none" ? mix.hazard : undefined;
  return {
    id: `mix:${mix.formula}`,
    name,
    formula: mix.formula,
    bond: mix.bond,
    uses: mix.uses,
    hazard,
    image: mixCardImage({ name, formula: mix.formula, bond: mix.bond, uses: mix.uses, hazard }),
  };
}

// Pre-register every compound two of the 12 base cards can legally form, so a
// `mix:<formula>` id read back from a student's profile ALWAYS resolves — the
// Grimoire renders straight off FORGED_CARDS and needs no code changes.
for (let i = 0; i < BASE_CARDS.length; i++) {
  for (let j = i + 1; j < BASE_CARDS.length; j++) {
    const forged = forgedFromMix(combine(BASE_CARDS[i], BASE_CARDS[j]));
    if (forged && !FORGED_CARDS.some((c) => c.id === forged.id)) FORGED_CARDS.push(forged);
  }
}
