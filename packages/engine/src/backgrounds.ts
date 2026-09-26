import type { AbilityKey } from "./abilities.js";

export interface Background {
  id: string;
  name: string;
  description: string;
  /**
   * The abilities this background grants +1 to (three, except Acolyte's two
   * -- one of its three named Spirit before that attribute was removed).
   * Loosely descended from the SRD 5.2.1's Background ability-score-increase
   * rule (the "increase all three by 1" option), kept as a small flavor-tied
   * stat bonus after the Origin feat system it came bundled with was removed.
   */
  abilityScores: AbilityKey[];
}

/**
 * A small set of backgrounds, each granting a flat +1 to a few named
 * abilities. Every class auto-picks a thematically fitting one at creation
 * (see game/appearance.ts's DEFAULT_BACKGROUND_BY_CLASS) purely for that
 * stat bonus; there's no player-facing choice or other mechanical effect.
 */
export const BACKGROUNDS: Record<string, Background> = {
  acolyte: {
    id: "acolyte",
    name: "Acolyte",
    description:
      "Raised in temple service, more comfortable with scripture and ritual than with a blade — though " +
      "Eridan's frontier has a way of putting both to use.",
    abilityScores: ["int", "wis"],
  },
  criminal: {
    id: "criminal",
    name: "Criminal",
    description: "A former thief, smuggler, or worse, who learned to read a room before reading anything else.",
    abilityScores: ["dex", "vit", "int"],
  },
  sage: {
    id: "sage",
    name: "Sage",
    description: "Years spent among books and archives, chasing knowledge that Eridan's libraries rarely give up easily.",
    abilityScores: ["vit", "int", "wis"],
  },
  soldier: {
    id: "soldier",
    name: "Soldier",
    description: "Drilled in formation and discipline, whether in a border garrison or a mercenary company.",
    abilityScores: ["str", "dex", "vit"],
  },
};

export function getBackground(id: string): Background {
  const background = BACKGROUNDS[id];
  if (!background) throw new Error(`Unknown background: "${id}"`);
  return background;
}
