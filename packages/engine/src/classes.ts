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
 * assignment (see resources.ts) all follow that handoff; each action's
 * `power` coefficient (see stats.ts), AP cost, cooldown, and status-effect
 * action are homebrew, sized to feel right against the new Vitality-scaled
 * HP pools and the AP economy (see combat.ts/status.ts).
 */
export const CLASSES: Record<string, CharacterClass> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Steel and stubbornness. Warriors build Rage by dealing and taking blows, then spend it on crushing strikes.",
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
        power: 1.8,
        damageType: "slashing",
        resourceCost: 6,
        apCost: 2,
        schoolId: "martial",
      },
      {
        id: "second-wind",
        name: "Second Wind",
        description: "Draw on grit and training to recover a burst of health. Costs Rage.",
        kind: "heal",
        target: "self",
        ability: "vit",
        power: 3,
        resourceCost: 8,
        apCost: 2,
        cooldown: 3,
        schoolId: "martial",
      },
      {
        id: "shield-bash",
        name: "Shield Bash",
        description: "A stunning blow with the flat of a shield, leaving the target reeling. Costs Rage.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 0.8,
        damageType: "bludgeoning",
        resourceCost: 10,
        apCost: 2,
        cooldown: 3,
        schoolId: "martial",
        applyStatus: { defId: "stunned", turns: 1 },
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
        power: 1.4,
        damageType: "piercing",
        apCost: 2,
        schoolId: "shadow",
      },
      {
        id: "dagger-throw",
        name: "Dagger Throw",
        description: "A thrown blade, quick but light.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 0.9,
        damageType: "piercing",
        apCost: 1,
        schoolId: "shadow",
      },
      {
        id: "venomous-strike",
        name: "Venomous Strike",
        description: "A blade slicked with a slow-acting toxin, poisoning the target.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.0,
        damageType: "piercing",
        apCost: 2,
        cooldown: 2,
        schoolId: "shadow",
        applyStatus: { defId: "poisoned", turns: 2, power: 0.4 },
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
        power: 1.8,
        damageType: "fire",
        resourceCost: 4,
        apCost: 2,
        schoolId: "arcane",
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
        power: 1.3,
        damageType: "fire",
        resourceCost: 10,
        apCost: 3,
        cooldown: 2,
        schoolId: "arcane",
      },
      {
        id: "arcane-shield",
        name: "Arcane Shield",
        description: "A shimmering barrier of force that absorbs incoming damage until your next turn. Costs Arcane.",
        kind: "buff",
        target: "self",
        ability: "int",
        resourceCost: 5,
        apCost: 1,
        cooldown: 2,
        schoolId: "arcane",
        applyStatus: { defId: "ward", turns: 1, power: 1.0 },
      },
      {
        id: "chain-lightning",
        name: "Chain Lightning",
        description: "A crackling arc of lightning that leaps across every enemy in the target's rank. Costs Arcane.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "int",
        power: 1.0,
        damageType: "lightning",
        resourceCost: 6,
        apCost: 2,
        cooldown: 2,
        schoolId: "arcane",
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
        power: 1.8,
        damageType: "radiant",
        resourceCost: 4,
        apCost: 2,
        schoolId: "radiant",
      },
      {
        id: "heal",
        name: "Heal",
        description: "Channel divine energy to mend an ally's wounds. Costs Divinity.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        power: 3.2,
        resourceCost: 6,
        apCost: 2,
        schoolId: "radiant",
      },
      {
        id: "renewal",
        name: "Renewal",
        description: "A blessing of steady restoration, mending your wounds turn after turn. Costs Divinity.",
        kind: "buff",
        target: "self",
        ability: "wis",
        resourceCost: 5,
        apCost: 1,
        cooldown: 1,
        schoolId: "radiant",
        applyStatus: { defId: "bloom", turns: 3, power: 0.5 },
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
        power: 1.6,
        damageType: "piercing",
        resourceCost: 4,
        apCost: 2,
        schoolId: "nature",
      },
      {
        id: "cure-wounds",
        name: "Cure Wounds",
        description: "Nature's magic knits an ally's wounds closed. Costs Wylde.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        power: 3,
        resourceCost: 6,
        apCost: 2,
        schoolId: "nature",
      },
      {
        id: "entangling-roots",
        name: "Entangling Roots",
        description: "Grasping roots burst from the earth, rooting the target in place. Costs Wylde.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        power: 0.7,
        damageType: "piercing",
        resourceCost: 7,
        apCost: 2,
        cooldown: 3,
        schoolId: "nature",
        applyStatus: { defId: "rooted", turns: 2, chance: 85 },
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
