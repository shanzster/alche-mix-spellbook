// Forged cards — NEW elements introduced by Alche-mixing two cards together in
// the AR scanner. Unlike the 12 physical base cards, these are earned digitally:
// the mix ceremony reveals the card, and it gets registered to the student's
// Grimoire (see profile.registerForged). Each forged card carries its own
// printable face — its "itsura" — that the student can print from the Grimoire.

export interface ForgedCard {
  /** Stable id stored in the profile's `forged` array. */
  id: string;
  name: string;
  /** Public path to the printable card face (the itsura). */
  image: string;
}

export const FORGED_CARDS: ForgedCard[] = [
  // Sample forged card. Swap the image for the real art per new element.
  { id: "3rd_card", name: "Forged Element", image: "/other_cards/3rd_card.png" },
];

export function forgedById(id: string): ForgedCard | undefined {
  return FORGED_CARDS.find((c) => c.id === id);
}
