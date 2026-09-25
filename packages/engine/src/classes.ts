import type { AbilityKey } from "./abilities.js";
import { BASIC_ATTACK, type CombatActionDef } from "./actions.js";
import type { ItemSlot } from "./items.js";

export interface StartingEquipmentOption {
  id: string;
  /** Short label shown at character creation, e.g. "Longsword & Chain Shirt". */
  label: string;
  equipment: Partial<Record<ItemSlot, string>>;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  hitDie: number; // e.g. 10 for a d10 hit die
  primaryAbility: AbilityKey;
  savingThrowProficiencies: AbilityKey[];
  /** Flat ability score bonuses granted just for picking this class (design handoff's "10 + race bonus + class bonus" model). */
  abilityScoreBonuses: Partial<Record<AbilityKey, number>>;
  actions: CombatActionDef[];
  /**
   * SRD-style "choose (a) or (b)" starting gear, respecting the class's weapon/armor
   * restrictions.
   */
  startingEquipmentOptions: StartingEquipmentOption[];
  /** Extra item ids owned but not equipped at creation (e.g. a spare accessory to try). */
  startingInventory: string[];
}

/**
 * The five playable classes carried over from the Aetherwyn character
 * creation handoff. The class flavor, ability bonuses, and resource pool
 * assignment (see resources.ts) all follow that handoff; each class's
 * actual combat moves stay within what the current (still D&D-derived)
 * combat engine can resolve today -- multi-target cleaves, damage-over-time
 * poison, evasion buffs, and stuns described in the handoff's skill list
 * are the AP-based combat system's job, not this pass's.
 */
export const CLASSES: Record<string, CharacterClass> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Steel and stubbornness. Warriors build Rage by dealing and taking blows, then spend it on crushing strikes.",
    hitDie: 10,
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "vit"],
    abilityScoreBonuses: { str: 4, vit: 3, dex: 1 },
    actions: [
      {
        id: "slash",
        name: "Slash",
        description: "A powerful melee strike with a sword or axe. Costs Rage, built up by dealing or taking blows.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "1d8",
        damageType: "slashing",
        resourceCost: 6,
      },
      {
        id: "second-wind",
        name: "Second Wind",
        description: "Draw on grit and training to recover a burst of health. Costs Rage.",
        kind: "heal",
        target: "self",
        ability: "vit",
        dice: "1d10",
        resourceCost: 8,
      },
      BASIC_ATTACK,
    ],
    startingEquipmentOptions: [
      { id: "sword-and-mail", label: "Longsword & Chain Shirt", equipment: { weapon: "ironLongsword", armor: "chainShirt" } },
      { id: "sword-and-leather", label: "Longsword & Studded Leather", equipment: { weapon: "ironLongsword", armor: "studdedLeather" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "Quick blades from the shadows. Rogues win by striking first and striking smart.",
    hitDie: 8,
    primaryAbility: "dex",
    savingThrowProficiencies: ["dex", "int"],
    abilityScoreBonuses: { dex: 5, int: 2, str: 1 },
    actions: [
      {
        id: "sneak-strike",
        name: "Sneak Strike",
        description: "A precise strike that deals extra damage against an already-wounded foe.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        dice: "1d6",
        damageType: "piercing",
      },
      {
        id: "dagger-throw",
        name: "Dagger Throw",
        description: "A thrown blade, quick but light.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        dice: "1d4",
        damageType: "piercing",
      },
    ],
    startingEquipmentOptions: [
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { weapon: "huntersShortbow", armor: "leatherArmor" } },
      { id: "shortsword", label: "Shortsword & Leather Armor", equipment: { weapon: "shortsword", armor: "leatherArmor" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Scholars of the arcane, channeling raw magic through years of study.",
    hitDie: 6,
    primaryAbility: "int",
    savingThrowProficiencies: ["int", "wis"],
    abilityScoreBonuses: { int: 5, spi: 3 },
    actions: [
      {
        id: "firebolt",
        name: "Firebolt",
        description: "A mote of fire hurled at a single enemy. Costs Arcane.",
        kind: "attack",
        target: "enemy",
        ability: "int",
        dice: "1d10",
        damageType: "fire",
        resourceCost: 4,
      },
      {
        id: "fireball",
        name: "Fireball",
        description:
          "A roaring blast of fire engulfs every enemy. Each must succeed on a Dexterity saving throw or " +
          "take fire damage (half as much on a success). Costs Arcane.",
        kind: "save",
        target: "enemies",
        ability: "int",
        saveAbility: "dex",
        dice: "3d6",
        damageType: "fire",
        resourceCost: 10,
      },
      {
        id: "arcane-shield",
        name: "Arcane Shield",
        description: "A shimmering barrier of force, granting +3 AC until your next turn. Costs Arcane.",
        kind: "buff",
        target: "self",
        ability: "int",
        effectValue: 3,
        resourceCost: 5,
      },
    ],
    startingEquipmentOptions: [
      { id: "staff", label: "Oaken Staff & Traveler's Robe", equipment: { weapon: "oakenStaff", armor: "travelersRobe" } },
      { id: "dagger", label: "Ritual Dagger & Traveler's Robe", equipment: { weapon: "ritualDagger", armor: "travelersRobe" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "A vessel of the dawn. Clerics mend wounds and lash out with radiant judgment.",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrowProficiencies: ["wis", "spi"],
    abilityScoreBonuses: { wis: 4, spi: 3, vit: 1 },
    actions: [
      {
        id: "smite",
        name: "Smite",
        description: "Divine energy lashes out at an enemy. Costs Divinity.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        dice: "1d8",
        damageType: "radiant",
        resourceCost: 4,
      },
      {
        id: "heal",
        name: "Heal",
        description: "Channel divine energy to mend an ally's wounds. Costs Divinity.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        dice: "1d8",
        resourceCost: 6,
      },
    ],
    startingEquipmentOptions: [
      { id: "mace-and-leather", label: "Ashen Mace & Studded Leather", equipment: { weapon: "ashenMace", armor: "studdedLeather" } },
      { id: "mace-and-mail", label: "Ashen Mace & Chain Shirt", equipment: { weapon: "ashenMace", armor: "chainShirt" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  druid: {
    id: "druid",
    name: "Druid",
    description: "Wardens of root and bloom, drawing on nature's own magic in battle.",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrowProficiencies: ["int", "wis"],
    abilityScoreBonuses: { wis: 3, spi: 2, vit: 2, dex: 1 },
    actions: [
      {
        id: "thorn-whip",
        name: "Thorn Whip",
        description: "Vines lash out to drag and wound a foe. Costs Wylde.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        dice: "1d8",
        damageType: "piercing",
        resourceCost: 4,
      },
      {
        id: "cure-wounds",
        name: "Cure Wounds",
        description: "Nature's magic knits an ally's wounds closed. Costs Wylde.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        dice: "1d8",
        resourceCost: 6,
      },
    ],
    startingEquipmentOptions: [
      { id: "mace", label: "Ashen Mace & Leather Armor", equipment: { weapon: "ashenMace", armor: "leatherArmor" } },
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { weapon: "huntersShortbow", armor: "leatherArmor" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
};

export function getClass(id: string): CharacterClass {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`Unknown class: "${id}"`);
  return cls;
}
