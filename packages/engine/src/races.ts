import type { AbilityKey } from "./abilities.js";

export interface RaceTrait {
  name: string;
  description: string;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
  speed: number;
  traits: RaceTrait[];
}

/**
 * The playable fantasy races of Eridan. Mechanics follow SRD-style ability
 * bonuses and traits; flavor text is Eridan-specific.
 */
export const RACES: Record<string, Race> = {
  human: {
    id: "human",
    name: "Human",
    description:
      "The most numerous folk of Eridan, spread from the farmlands of the Arnweyal Plains to the trade halls of Eldrin City.",
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    traits: [
      {
        name: "Adaptable",
        description: "Gains proficiency in one additional skill of choice.",
      },
    ],
  },
  elf: {
    id: "elf",
    name: "Elf",
    description:
      "Long-lived kin of the Corran Woodland's golden-leafed forests, wood elves keep watch over the old " +
      "trees and older grudges — kin of theirs elsewhere on the continent have grown into peoples all their own.",
    abilityBonuses: { dex: 2, int: 1 },
    speed: 30,
    traits: [
      {
        name: "Keen Senses",
        description: "Advantage on rolls to detect hidden creatures or objects.",
      },
      {
        name: "Fey Ancestry",
        description: "Advantage on saving throws against being charmed.",
      },
    ],
  },
  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    description:
      "Descendants of the clanholds carved into the Bronze Hills, dwarves of Eridan mine and forge some of " +
      "the finest weapons on the continent.",
    abilityBonuses: { con: 2, str: 1 },
    speed: 25,
    traits: [
      {
        name: "Stonecunning",
        description: "Advantage on checks related to the history or origin of stonework.",
      },
      {
        name: "Dwarven Resilience",
        description: "Advantage on saving throws against poison; resistance to poison damage.",
      },
    ],
  },
  orc: {
    id: "orc",
    name: "Orc",
    description:
      "From the war-bands of Collmhor Wood to the peaceful clans of frozen Raduna, orcs of Eridan have built " +
      "warrior societies out of some of the continent's hardest, most unforgiving land.",
    abilityBonuses: { str: 2, con: 1 },
    speed: 30,
    traits: [
      {
        name: "Relentless Endurance",
        description: "Once per long rest, drop to 1 HP instead of 0 when reduced to 0.",
      },
    ],
  },
  halfling: {
    id: "halfling",
    name: "Halfling",
    description:
      "River-folk of Prakov's Gift, halflings favor the quiet life among the tobacco fields and are far " +
      "harder to pin down than they look.",
    abilityBonuses: { dex: 2, cha: 1 },
    speed: 25,
    traits: [
      {
        name: "Lucky",
        description: "May reroll a natural 1 on an attack roll, ability check, or saving throw.",
      },
      {
        name: "Brave",
        description: "Advantage on saving throws against being frightened.",
      },
    ],
  },
};

export function getRace(id: string): Race {
  const race = RACES[id];
  if (!race) throw new Error(`Unknown race: "${id}"`);
  return race;
}
