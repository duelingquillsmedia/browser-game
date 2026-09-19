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
  traits: RaceTrait[];
  /** Innate resistances from species traits (e.g. a Dwarf's Dwarven Resilience). */
  damageResistances?: DamageType[];
  /** A granted combat action from a species trait (e.g. a Dragonborn's Breath Weapon). */
  actions?: CombatActionDef[];
}

const BREATH_WEAPON: CombatActionDef = {
  id: "breath-weapon",
  name: "Breath Weapon",
  description:
    "Exhale a cone of searing flame. Each enemy makes a Dexterity saving throw, taking fire damage on a " +
    "failure or half as much on a success.",
  kind: "save",
  target: "enemies",
  ability: "con",
  saveAbility: "dex",
  dice: "1d10",
  damageType: "fire",
  usesPerCombat: 1,
};

/**
 * The playable species of Eridan. Following the SRD 5.2.1, a species grants
 * speed and flavor/mechanical traits but no ability score bonuses — those
 * come from a character's Background instead (see backgrounds.ts).
 */
export const RACES: Record<string, Race> = {
  human: {
    id: "human",
    name: "Human",
    description:
      "The most numerous folk of Eridan, spread from the farmlands of the Arnweyal Plains to the trade halls of Eldrin City.",
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
    speed: 25,
    traits: [
      {
        name: "Stonecunning",
        description: "Advantage on checks related to the history or origin of stonework.",
      },
      {
        name: "Dwarven Resilience",
        description: "Resistance to poison damage.",
      },
    ],
    damageResistances: ["poison"],
  },
  orc: {
    id: "orc",
    name: "Orc",
    description:
      "From the war-bands of Collmhor Wood to the peaceful clans of frozen Raduna, orcs of Eridan have built " +
      "warrior societies out of some of the continent's hardest, most unforgiving land.",
    speed: 30,
    traits: [
      {
        name: "Relentless Endurance",
        description: "Once per fight, when you'd drop to 0 HP but aren't killed outright, drop to 1 HP instead.",
      },
    ],
  },
  halfling: {
    id: "halfling",
    name: "Halfling",
    description:
      "River-folk of Prakov's Gift, halflings favor the quiet life among the tobacco fields and are far " +
      "harder to pin down than they look.",
    speed: 25,
    traits: [
      {
        name: "Lucky",
        description: "When you roll a natural 1 on an attack roll, you reroll it once.",
      },
      {
        name: "Brave",
        description: "Advantage on saving throws against being frightened.",
      },
    ],
  },
  dragonborn: {
    id: "dragonborn",
    name: "Dragonborn",
    description:
      "Rare in Eridan but not unheard of, dragonborn trace their bloodline to elder wyrms and carry a spark " +
      "of draconic fire wherever they wander.",
    speed: 30,
    traits: [
      {
        name: "Draconic Ancestry",
        description: "Resistance to fire damage.",
      },
      {
        name: "Breath Weapon",
        description: "Once per fight, exhale a cone of fire; every enemy saves or takes damage.",
      },
    ],
    damageResistances: ["fire"],
    actions: [BREATH_WEAPON],
  },
  gnome: {
    id: "gnome",
    name: "Gnome",
    description:
      "Small, quick-witted tinkerers found in Eldrin City's workshops and the quieter corners of the frontier " +
      "alike, as fascinated by a puzzle as by the road ahead.",
    speed: 30,
    traits: [
      {
        name: "Gnomish Cunning",
        description: "Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.",
      },
    ],
  },
  goliath: {
    id: "goliath",
    name: "Goliath",
    description:
      "Descended from the hardy mountain-clans said to carry giant-blood, goliaths are drawn to Eridan's " +
      "harshest, highest frontiers — the Bronze Hills chief among them.",
    speed: 35,
    traits: [
      {
        name: "Giant Ancestry",
        description: "Counts as one size larger when determining carrying capacity.",
      },
    ],
  },
  tiefling: {
    id: "tiefling",
    name: "Tiefling",
    description:
      "Marked by a distant infernal bloodline, tieflings meet plenty of stares along Eridan's roads and have " +
      "mostly stopped noticing.",
    speed: 30,
    traits: [
      {
        name: "Infernal Legacy",
        description: "Resistance to fire damage.",
      },
    ],
    damageResistances: ["fire"],
  },
};

export function getRace(id: string): Race {
  const race = RACES[id];
  if (!race) throw new Error(`Unknown race: "${id}"`);
  return race;
}
