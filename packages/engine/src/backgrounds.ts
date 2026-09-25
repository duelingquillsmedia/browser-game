import type { AbilityKey } from "./abilities.js";
import type { OriginFeatId } from "./feats.js";

export interface Background {
  id: string;
  name: string;
  description: string;
  /**
   * The three abilities the SRD ties to this background. This engine grants
   * +1 to all three (the SRD's "increase all three by 1" option), skipping
   * the alternate "+2 to one, +1 to another" split to keep creation to a
   * single choice.
   */
  abilityScores: [AbilityKey, AbilityKey, AbilityKey];
  originFeatId: OriginFeatId;
}

/**
 * The SRD 5.2.1's four fully-detailed backgrounds. In the 2024 rules, a
 * background — not a character's species — is what grants ability score
 * increases and an Origin feat.
 */
export const BACKGROUNDS: Record<string, Background> = {
  acolyte: {
    id: "acolyte",
    name: "Acolyte",
    description:
      "Raised in temple service, more comfortable with scripture and ritual than with a blade — though " +
      "Eridan's frontier has a way of putting both to use.",
    abilityScores: ["int", "wis", "spi"],
    originFeatId: "magicInitiate",
  },
  criminal: {
    id: "criminal",
    name: "Criminal",
    description: "A former thief, smuggler, or worse, who learned to read a room before reading anything else.",
    abilityScores: ["dex", "vit", "int"],
    originFeatId: "alert",
  },
  sage: {
    id: "sage",
    name: "Sage",
    description: "Years spent among books and archives, chasing knowledge that Eridan's libraries rarely give up easily.",
    abilityScores: ["vit", "int", "wis"],
    originFeatId: "magicInitiate",
  },
  soldier: {
    id: "soldier",
    name: "Soldier",
    description: "Drilled in formation and discipline, whether in a border garrison or a mercenary company.",
    abilityScores: ["str", "dex", "vit"],
    originFeatId: "savageAttacker",
  },
};

export function getBackground(id: string): Background {
  const background = BACKGROUNDS[id];
  if (!background) throw new Error(`Unknown background: "${id}"`);
  return background;
}
