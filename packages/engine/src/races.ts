import type { AbilityKey } from "./abilities.js";
import type { CombatActionDef } from "./actions.js";
import type { DamageType } from "./damage.js";

export interface RaceTrait {
  name: string;
  description: string;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  speed: number;
  /**
   * Per the Race Style Sheet: all races start every attribute at 10, then
   * this race's own attributes grow by this much on every odd level (1, 3,
   * 5, 7, ...) -- see character.ts's `computeAbilityScores`. Empty for
   * Half-elf, whose growth is chosen by the player at creation instead (see
   * `HalfElfChoice`).
   */
  oddLevelAbilityGrowth: Partial<Record<AbilityKey, number>>;
  traits: RaceTrait[];
  /** Innate resistances from species traits. */
  damageResistances?: DamageType[];
  /** A granted combat action from a species trait. */
  actions?: CombatActionDef[];
}

/**
 * A Half-elf's own pick at character creation, standing in for a fixed
 * `oddLevelAbilityGrowth` table: one ability doubles its racial growth (+2
 * per odd level), two others get the ordinary +1, and the player borrows
 * either Human's or Elf's passive outright ("Of Two Bloodlines"). See
 * character.ts's `computeAbilityScores`/`resolveRacePassiveId`.
 */
export interface HalfElfChoice {
  doubleAbility: AbilityKey;
  singleAbilities: [AbilityKey, AbilityKey];
  passiveSource: "human" | "elf";
}

/**
 * A character's resolved racial passive -- Human/Elf/Dwarf's own, or
 * whichever a Half-elf chose. Kept as its own id (rather than switching on
 * `raceId` everywhere) so a Half-elf's choice only has to be resolved once,
 * in `resolveRacePassiveId`.
 */
export type RacePassiveId = "adaptable" | "spellcasters" | "axeWielders";

export function resolveRacePassiveId(raceId: string, raceChoice?: HalfElfChoice): RacePassiveId | undefined {
  if (raceId === "human") return "adaptable";
  if (raceId === "elf") return "spellcasters";
  if (raceId === "dwarf") return "axeWielders";
  if (raceId === "halfElf") return raceChoice?.passiveSource === "elf" ? "spellcasters" : "adaptable";
  return undefined;
}

/**
 * The four playable species from the Race Style Sheet (Google Drive, "Race
 * Information/Race Style Sheet"): every odd-level growth rate and passive
 * below is transcribed directly from it, replacing this file's previous
 * one-time flat "10 + race bonus" model.
 */
export const RACES: Record<string, Race> = {
  elf: {
    id: "elf",
    name: "Elf",
    description:
      "Keepers of the old groves of Eridan — quick of hand and deep of spirit, though slighter in frame than " +
      "their neighbours.",
    speed: 30,
    oddLevelAbilityGrowth: { dex: 2, wis: 2 },
    traits: [
      {
        name: "Spellcasters",
        description: "All spell damage is increased by 5%.",
      },
    ],
  },
  human: {
    id: "human",
    name: "Human",
    description:
      "The most numerous folk of Eridan, found in every port and hill-town from Ashvale to Praldosta.",
    speed: 30,
    oddLevelAbilityGrowth: { str: 1, dex: 1, vit: 1, int: 1, wis: 1 },
    traits: [
      {
        name: "Adaptable",
        description: "Gain 10% more experience from all sources.",
      },
    ],
  },
  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    description: "Delvers and smiths of the grey peaks — slow to move, and slower to fall.",
    speed: 25,
    oddLevelAbilityGrowth: { str: 2, vit: 2 },
    traits: [
      {
        name: "Axe-wielders",
        description: "Attacks with an axe deal 5 bonus damage.",
      },
    ],
  },
  halfElf: {
    id: "halfElf",
    name: "Half-elf",
    description:
      "Walking two worlds and settled fully in neither, half-elves draw on whichever bloodline serves the moment.",
    speed: 30,
    // A Half-elf's real growth comes from their own HalfElfChoice, not this table -- see its doc comment.
    oddLevelAbilityGrowth: {},
    traits: [
      {
        name: "Of Two Bloodlines",
        description: "Choose Human's Adaptable or Elf's Spellcasters as your passive at creation.",
      },
    ],
  },
};

export function getRace(id: string): Race {
  const race = RACES[id];
  if (!race) throw new Error(`Unknown race: "${id}"`);
  return race;
}
