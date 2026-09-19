import type { AbilityKey } from "./abilities.js";
import { BASIC_ATTACK, type CombatActionDef } from "./actions.js";
import type { ItemSlot } from "./items.js";

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  hitDie: number; // e.g. 10 for a d10 hit die
  primaryAbility: AbilityKey;
  savingThrowProficiencies: AbilityKey[];
  actions: CombatActionDef[];
  /** Gear a new character of this class starts equipped with. */
  startingEquipment: Partial<Record<ItemSlot, string>>;
  /** Extra item ids owned but not equipped at creation (e.g. a spare accessory to try). */
  startingInventory: string[];
}

export const CLASSES: Record<string, CharacterClass> = {
  fighter: {
    id: "fighter",
    name: "Fighter",
    description: "A trained warrior, equally at home with a blade or a shield wall.",
    hitDie: 10,
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "con"],
    actions: [
      {
        id: "slash",
        name: "Slash",
        description: "A powerful melee strike with a sword or axe.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "1d8",
        damageType: "slashing",
      },
      {
        id: "second-wind",
        name: "Second Wind",
        description: "Draw on grit and training to recover a burst of health.",
        kind: "heal",
        target: "self",
        ability: "con",
        dice: "1d10",
        usesPerCombat: 1,
      },
      BASIC_ATTACK,
    ],
    startingEquipment: { weapon: "ironLongsword", armor: "chainShirt" },
    startingInventory: ["luckyCharm"],
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    description: "A quick, precise fighter who wins by striking first and striking smart.",
    hitDie: 8,
    primaryAbility: "dex",
    savingThrowProficiencies: ["dex", "int"],
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
    startingEquipment: { weapon: "huntersShortbow", armor: "leatherArmor" },
    startingInventory: ["ringOfWarding"],
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    description: "A scholar of the arcane, channeling raw magic through years of study.",
    hitDie: 6,
    primaryAbility: "int",
    savingThrowProficiencies: ["int", "wis"],
    actions: [
      {
        id: "firebolt",
        name: "Firebolt",
        description: "A mote of fire hurled at a single enemy.",
        kind: "attack",
        target: "enemy",
        ability: "int",
        dice: "1d10",
        damageType: "fire",
      },
      {
        id: "fireball",
        name: "Fireball",
        description:
          "A roaring blast of fire engulfs every enemy. Each must succeed on a Dexterity saving throw or " +
          "take fire damage (half as much on a success).",
        kind: "save",
        target: "enemies",
        ability: "int",
        saveAbility: "dex",
        dice: "3d6",
        damageType: "fire",
        usesPerCombat: 1,
      },
      {
        id: "arcane-shield",
        name: "Arcane Shield",
        description: "A shimmering barrier of force, granting +3 AC until your next turn.",
        kind: "buff",
        target: "self",
        ability: "int",
        effectValue: 3,
        usesPerCombat: 2,
      },
    ],
    startingEquipment: { weapon: "oakenStaff", armor: "travelersRobe" },
    startingInventory: ["luckyCharm"],
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "A devoted channel for divine power, able to mend wounds as easily as smite foes.",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrowProficiencies: ["wis", "cha"],
    actions: [
      {
        id: "smite",
        name: "Smite",
        description: "Divine energy lashes out at an enemy.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        dice: "1d8",
        damageType: "radiant",
      },
      {
        id: "heal",
        name: "Heal",
        description: "Channel divine energy to mend an ally's wounds.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        dice: "1d8",
      },
    ],
    startingEquipment: { weapon: "ashenMace", armor: "studdedLeather" },
    startingInventory: ["ringOfWarding"],
  },
};

export function getClass(id: string): CharacterClass {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`Unknown class: "${id}"`);
  return cls;
}
