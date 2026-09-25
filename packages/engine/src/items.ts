import type { AbilityKey } from "./abilities.js";
import type { DamageType } from "./damage.js";

export type ItemSlot = "weapon" | "armor" | "accessory";

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  /** Flat evasion-percentage bonus while equipped (armor and accessory slots). */
  evasionBonus?: number;
  /** Flat damage bonus added on top of the basic Strike's ability-scaled damage while this weapon is equipped. */
  damageBonus?: number;
  /** Ability score used for Strike's damage with this weapon; defaults to Strike's own (str). */
  ability?: AbilityKey;
  /** Damage type for Strike while this weapon is equipped; defaults to Strike's own (slashing). */
  damageType?: DamageType;
  /** Reference value in gold pieces, for flavor (there's no wallet/shop yet). */
  value: number;
}

/**
 * A small starter catalog of gear, enough to give each class a sensible
 * starting loadout and something to swap in the accessory slot.
 */
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  ironLongsword: {
    id: "ironLongsword",
    name: "Iron Longsword",
    description: "A well-balanced blade, standard issue for Ridgeton's watch.",
    slot: "weapon",
    damageBonus: 8,
    value: 15,
  },
  huntersShortbow: {
    id: "huntersShortbow",
    name: "Hunter's Shortbow",
    description: "A simple recurve bow favored by scouts along the Tameless Shore.",
    slot: "weapon",
    damageBonus: 5,
    ability: "dex",
    damageType: "piercing",
    value: 12,
  },
  oakenStaff: {
    id: "oakenStaff",
    name: "Oaken Staff",
    description: "A gnarled staff that channels arcane focus as well as it strikes.",
    slot: "weapon",
    damageBonus: 5,
    ability: "int",
    damageType: "bludgeoning",
    value: 12,
  },
  ashenMace: {
    id: "ashenMace",
    name: "Ashen Mace",
    description: "A temple mace, blessed for both battle and ritual.",
    slot: "weapon",
    damageBonus: 5,
    ability: "wis",
    damageType: "bludgeoning",
    value: 12,
  },
  practicedKnuckles: {
    id: "practicedKnuckles",
    name: "Practiced Knuckles",
    description: "Wrapped hands and years of drilling — a trained unarmed strike is a weapon in its own right.",
    slot: "weapon",
    damageBonus: 3,
    ability: "dex",
    damageType: "bludgeoning",
    value: 5,
  },
  ritualDagger: {
    id: "ritualDagger",
    name: "Ritual Dagger",
    description: "A light blade carried more for ceremony and backup than for war.",
    slot: "weapon",
    damageBonus: 3,
    damageType: "piercing",
    value: 6,
  },
  shortsword: {
    id: "shortsword",
    name: "Shortsword",
    description: "A quick, double-edged blade light enough for a fencer's grip.",
    slot: "weapon",
    damageBonus: 5,
    ability: "dex",
    damageType: "piercing",
    value: 10,
  },
  leatherArmor: {
    id: "leatherArmor",
    name: "Leather Armor",
    description: "Boiled leather, light enough not to slow a rogue down.",
    slot: "armor",
    evasionBonus: 3,
    value: 10,
  },
  studdedLeather: {
    id: "studdedLeather",
    name: "Studded Leather",
    description: "Leather reinforced with iron studs at the joints.",
    slot: "armor",
    evasionBonus: 6,
    value: 20,
  },
  chainShirt: {
    id: "chainShirt",
    name: "Chain Shirt",
    description: "A shirt of fine riveted mail, heavier but reliable.",
    slot: "armor",
    evasionBonus: 9,
    value: 35,
  },
  travelersRobe: {
    id: "travelersRobe",
    name: "Traveler's Robe",
    description: "Warded cloth that turns a glancing blow without hampering spellcraft.",
    slot: "armor",
    evasionBonus: 3,
    value: 8,
  },
  luckyCharm: {
    id: "luckyCharm",
    name: "Lucky Charm",
    description: "A worn coin on a leather cord — probably does nothing. Probably.",
    slot: "accessory",
    evasionBonus: 3,
    value: 8,
  },
  ringOfWarding: {
    id: "ringOfWarding",
    name: "Ring of Warding",
    description: "A plain silver band, faintly warm to the touch.",
    slot: "accessory",
    evasionBonus: 6,
    value: 25,
  },
};

export function getItem(id: string): ItemTemplate {
  const item = ITEM_TEMPLATES[id];
  if (!item) throw new Error(`Unknown item: "${id}"`);
  return item;
}
