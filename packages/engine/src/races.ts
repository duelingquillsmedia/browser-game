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
  /** Flat ability score bonuses granted just for being this race (design handoff's "10 + race bonus + class bonus" model). */
  abilityScoreBonuses: Partial<Record<AbilityKey, number>>;
  traits: RaceTrait[];
  /** Innate resistances from species traits (e.g. a Dwarf's Stoneblood). */
  damageResistances?: DamageType[];
  /** A granted combat action from a species trait. */
  actions?: CombatActionDef[];
}

/**
 * The three playable species carried over from the Aetherwyn character
 * creation handoff. Unlike the old SRD roster, race itself grants a flat
 * ability score bonus (on top of the class's own) rather than leaving all
 * bonuses to a chosen Background.
 */
export const RACES: Record<string, Race> = {
  elf: {
    id: "elf",
    name: "Elf",
    description:
      "Keepers of the old groves of Eridan — quick of hand and deep of spirit, though slighter in frame than " +
      "their neighbours.",
    speed: 30,
    abilityScoreBonuses: { dex: 2, wis: 2, int: 1, vit: -1 },
    traits: [
      {
        name: "Silverleaf Step",
        description: "Once per combat, the first ability you spend a resource on costs 1 less.",
      },
    ],
  },
  human: {
    id: "human",
    name: "Human",
    description:
      "The most numerous folk of Eridan, found in every port and hill-town from Ashvale to Praldosta.",
    speed: 30,
    abilityScoreBonuses: { str: 1, dex: 1, int: 1, wis: 1, vit: 1 },
    traits: [
      {
        name: "Many Roads",
        description: "Earn 10% more experience from all sources.",
      },
    ],
  },
  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    description: "Delvers and smiths of the grey peaks — slow to move, and slower to fall.",
    speed: 25,
    abilityScoreBonuses: { vit: 3, str: 2, dex: -1 },
    traits: [
      {
        name: "Stoneblood",
        description: "Resistance to poison damage.",
      },
    ],
    damageResistances: ["poison"],
  },
};

export function getRace(id: string): Race {
  const race = RACES[id];
  if (!race) throw new Error(`Unknown race: "${id}"`);
  return race;
}
