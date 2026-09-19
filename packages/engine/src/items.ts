import type { AbilityKey } from "./abilities.js";

export type ItemSlot = "weapon" | "armor" | "accessory";

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  /** Flat AC bonus while equipped (armor and accessory slots). */
  armorClassBonus?: number;
  /** Damage dice that replaces the basic Strike attack while this weapon is equipped. */
  damageDice?: string;
  /** Ability score used for Strike's to-hit/damage roll with this weapon; defaults to Strike's own (str). */
  ability?: AbilityKey;
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
    damageDice: "1d8",
    value: 15,
  },
  huntersShortbow: {
    id: "huntersShortbow",
    name: "Hunter's Shortbow",
    description: "A simple recurve bow favored by scouts along the Tameless Shore.",
    slot: "weapon",
    damageDice: "1d6",
    ability: "dex",
    value: 12,
  },
  oakenStaff: {
    id: "oakenStaff",
    name: "Oaken Staff",
    description: "A gnarled staff that channels arcane focus as well as it strikes.",
    slot: "weapon",
    damageDice: "1d6",
    ability: "int",
    value: 12,
  },
  ashenMace: {
    id: "ashenMace",
    name: "Ashen Mace",
    description: "A temple mace, blessed for both battle and ritual.",
    slot: "weapon",
    damageDice: "1d6",
    ability: "wis",
    value: 12,
  },
  leatherArmor: {
    id: "leatherArmor",
    name: "Leather Armor",
    description: "Boiled leather, light enough not to slow a rogue down.",
    slot: "armor",
    armorClassBonus: 1,
    value: 10,
  },
  studdedLeather: {
    id: "studdedLeather",
    name: "Studded Leather",
    description: "Leather reinforced with iron studs at the joints.",
    slot: "armor",
    armorClassBonus: 2,
    value: 20,
  },
  chainShirt: {
    id: "chainShirt",
    name: "Chain Shirt",
    description: "A shirt of fine riveted mail, heavier but reliable.",
    slot: "armor",
    armorClassBonus: 3,
    value: 35,
  },
  travelersRobe: {
    id: "travelersRobe",
    name: "Traveler's Robe",
    description: "Warded cloth that turns a glancing blow without hampering spellcraft.",
    slot: "armor",
    armorClassBonus: 1,
    value: 8,
  },
  luckyCharm: {
    id: "luckyCharm",
    name: "Lucky Charm",
    description: "A worn coin on a leather cord — probably does nothing. Probably.",
    slot: "accessory",
    armorClassBonus: 1,
    value: 8,
  },
  ringOfWarding: {
    id: "ringOfWarding",
    name: "Ring of Warding",
    description: "A plain silver band, faintly warm to the touch.",
    slot: "accessory",
    armorClassBonus: 2,
    value: 25,
  },
};

export function getItem(id: string): ItemTemplate {
  const item = ITEM_TEMPLATES[id];
  if (!item) throw new Error(`Unknown item: "${id}"`);
  return item;
}
