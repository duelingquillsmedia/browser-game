import type { AbilityKey } from "./abilities.js";
import type { DamageType } from "./damage.js";

export type ItemSlot = "meleeWeapon" | "rangedWeapon" | "armor" | "accessory";

export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  /** Absent for a consumable (see `consumable` below) -- it occupies no equipment slot. */
  slot?: ItemSlot;
  /** Flat evasion-percentage bonus while equipped (armor and accessory slots). */
  evasionBonus?: number;
  /**
   * The weapon's own intrinsic damage range for Strike (e.g. a Hunter's
   * Shortbow's 7-10), MMO-tooltip style -- rolled directly rather than
   * derived from the wielder's ability score. Both set together, or
   * neither (non-weapon items, or a weapon that's a pure spellcasting
   * focus with no physical damage of its own).
   */
  damageMin?: number;
  damageMax?: number;
  /** Ability score used for Strike's damage with this weapon; defaults to Strike's own (str). */
  ability?: AbilityKey;
  /** Damage type for Strike while this weapon is equipped; defaults to Strike's own (slashing). */
  damageType?: DamageType;
  /** Price in gold pieces: what the General Store/Blacksmith charge to buy it (see character.ts's buyItem/sellItem). */
  value: number;
  /** Present only on a drinkable/usable item (a potion); see character.ts's useConsumable. Absent on equipment. */
  consumable?: { restores: "hp" | "resource"; amount: number };
}

/**
 * A small starter catalog of gear, enough to give each class a sensible
 * starting loadout and something to swap in the accessory slot.
 */
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  ironLongsword: {
    id: "ironLongsword",
    name: "Hunter's Longsword",
    description: "A well-balanced blade, standard issue for Ridgeton's watch.",
    slot: "meleeWeapon",
    damageMin: 14,
    damageMax: 20,
    damageType: "slashing",
    value: 15,
  },
  huntersShortbow: {
    id: "huntersShortbow",
    name: "Hunter's Shortbow",
    description: "A simple recurve bow favored by scouts along the Tameless Shore.",
    slot: "rangedWeapon",
    damageMin: 7,
    damageMax: 10,
    ability: "dex",
    damageType: "piercing",
    value: 12,
  },
  oakenStaff: {
    id: "oakenStaff",
    name: "Hunter's Staff",
    description: "A gnarled staff that channels arcane focus as well as it strikes.",
    slot: "meleeWeapon",
    damageMin: 8,
    damageMax: 12,
    ability: "int",
    damageType: "bludgeoning",
    value: 12,
  },
  ashenMace: {
    id: "ashenMace",
    name: "Hunter's Mace",
    description: "A temple mace, blessed for both battle and ritual.",
    slot: "meleeWeapon",
    damageMin: 9,
    damageMax: 13,
    ability: "wis",
    damageType: "bludgeoning",
    value: 12,
  },
  practicedKnuckles: {
    id: "practicedKnuckles",
    name: "Hunter's Knuckles",
    description: "Wrapped hands and years of drilling — a trained unarmed strike is a weapon in its own right.",
    slot: "meleeWeapon",
    damageMin: 4,
    damageMax: 6,
    ability: "dex",
    damageType: "bludgeoning",
    value: 5,
  },
  ritualDagger: {
    id: "ritualDagger",
    name: "Hunter's Dagger",
    description: "A light blade carried more for ceremony and backup than for war.",
    slot: "meleeWeapon",
    damageMin: 6,
    damageMax: 9,
    damageType: "piercing",
    value: 6,
  },
  shortsword: {
    id: "shortsword",
    name: "Hunter's Shortsword",
    description: "A quick, double-edged blade light enough for a fencer's grip.",
    slot: "meleeWeapon",
    damageMin: 9,
    damageMax: 13,
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
  minorHealingPotion: {
    id: "minorHealingPotion",
    name: "Minor Healing Potion",
    description: "A ruby draught, warm to the touch. Restores a modest amount of HP when drunk.",
    value: 15,
    consumable: { restores: "hp", amount: 80 },
  },
  minorResourceDraught: {
    id: "minorResourceDraught",
    name: "Minor Resource Draught",
    description: "A bitter tonic that renews a fighter's Fury, a caster's Arcana, or whatever else their training draws on.",
    value: 20,
    consumable: { restores: "resource", amount: 40 },
  },
};

export function getItem(id: string): ItemTemplate {
  const item = ITEM_TEMPLATES[id];
  if (!item) throw new Error(`Unknown item: "${id}"`);
  return item;
}
