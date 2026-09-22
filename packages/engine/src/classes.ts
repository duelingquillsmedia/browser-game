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
  actions: CombatActionDef[];
  /**
   * SRD-style "choose (a) or (b)" starting gear, respecting the class's weapon/armor
   * restrictions (e.g. a Monk stays unarmored; a Wizard carries no martial weapon).
   * The first option is the default when none is explicitly chosen.
   */
  startingEquipmentOptions: StartingEquipmentOption[];
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
        description: "A powerful melee strike with a sword or axe. Costs Prowess, built up by your basic Strike.",
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
        description: "Draw on grit and training to recover a burst of health. Costs Prowess.",
        kind: "heal",
        target: "self",
        ability: "con",
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
    startingEquipmentOptions: [
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { weapon: "huntersShortbow", armor: "leatherArmor" } },
      { id: "shortsword", label: "Shortsword & Leather Armor", equipment: { weapon: "shortsword", armor: "leatherArmor" } },
    ],
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
    description: "A devoted channel for divine power, able to mend wounds as easily as smite foes.",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrowProficiencies: ["wis", "cha"],
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
  barbarian: {
    id: "barbarian",
    name: "Barbarian",
    description: "A primal warrior who channels fury into devastating, reckless blows.",
    hitDie: 12,
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "con"],
    actions: [
      {
        id: "reckless-slam",
        name: "Reckless Slam",
        description:
          "A wild, all-or-nothing swing that leaves you exposed but hits like a landslide. Costs Rage, " +
          "built up by attacking or being struck.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "2d6",
        damageType: "slashing",
        resourceCost: 10,
      },
      {
        id: "furious-resilience",
        name: "Furious Resilience",
        description: "Push through pain on sheer rage and grit. Costs Rage.",
        kind: "heal",
        target: "self",
        ability: "con",
        dice: "1d10",
        resourceCost: 10,
      },
      BASIC_ATTACK,
    ],
    startingEquipmentOptions: [
      { id: "sword-and-leather", label: "Longsword & Studded Leather", equipment: { weapon: "ironLongsword", armor: "studdedLeather" } },
      { id: "sword-unburdened", label: "Longsword & Leather Armor", equipment: { weapon: "ironLongsword", armor: "leatherArmor" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  bard: {
    id: "bard",
    name: "Bard",
    description: "A performer whose words and music carry real magic — as sharp a weapon as any blade.",
    hitDie: 8,
    primaryAbility: "cha",
    savingThrowProficiencies: ["dex", "cha"],
    actions: [
      {
        id: "vicious-mockery",
        name: "Vicious Mockery",
        description: "A cutting insult laced with subtle magic.",
        kind: "attack",
        target: "enemy",
        ability: "cha",
        dice: "1d8",
        damageType: "psychic",
      },
      {
        id: "healing-word",
        name: "Healing Word",
        description: "A quick word of encouragement mends an ally's wounds at a distance.",
        kind: "heal",
        target: "ally",
        ability: "cha",
        dice: "1d6",
      },
    ],
    startingEquipmentOptions: [
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { weapon: "huntersShortbow", armor: "leatherArmor" } },
      { id: "shortsword", label: "Shortsword & Leather Armor", equipment: { weapon: "shortsword", armor: "leatherArmor" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  druid: {
    id: "druid",
    name: "Druid",
    description: "A keeper of the old, wild places, drawing on nature's own magic in battle.",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrowProficiencies: ["int", "wis"],
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
  monk: {
    id: "monk",
    name: "Monk",
    description: "A martial artist who channels disciplined ki into a flurry of precise strikes.",
    hitDie: 8,
    primaryAbility: "dex",
    savingThrowProficiencies: ["str", "dex"],
    actions: [
      {
        id: "flurry-of-blows",
        name: "Flurry of Blows",
        description: "A rapid volley of unarmed strikes.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        dice: "2d4",
        damageType: "bludgeoning",
      },
      {
        id: "stunning-strike",
        name: "Stunning Strike",
        description: "A precise blow aimed at the body's vital points.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        dice: "1d6",
        damageType: "bludgeoning",
      },
      BASIC_ATTACK,
    ],
    startingEquipmentOptions: [
      { id: "knuckles", label: "Practiced Knuckles (Unarmed)", equipment: { weapon: "practicedKnuckles" } },
      { id: "shortsword", label: "Shortsword (Unarmored)", equipment: { weapon: "shortsword" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  paladin: {
    id: "paladin",
    name: "Paladin",
    description: "A holy warrior bound by oath, mixing martial steel with divine favor.",
    hitDie: 10,
    primaryAbility: "str",
    savingThrowProficiencies: ["wis", "cha"],
    actions: [
      {
        id: "holy-strike",
        name: "Holy Strike",
        description: "A blade wreathed in righteous light. Costs Wylde.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "1d10",
        damageType: "radiant",
        resourceCost: 4,
      },
      {
        id: "lay-on-hands",
        name: "Lay on Hands",
        description: "A healing touch drawn from a pool of divine favor. Costs Wylde.",
        kind: "heal",
        target: "ally",
        ability: "cha",
        dice: "1d10",
        resourceCost: 6,
      },
    ],
    startingEquipmentOptions: [
      { id: "sword-and-mail", label: "Longsword & Chain Shirt", equipment: { weapon: "ironLongsword", armor: "chainShirt" } },
      { id: "sword-and-leather", label: "Longsword & Studded Leather", equipment: { weapon: "ironLongsword", armor: "studdedLeather" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "A hunter of Eridan's wilder reaches, as deadly with a bow as with woodcraft.",
    hitDie: 10,
    primaryAbility: "dex",
    savingThrowProficiencies: ["str", "dex"],
    actions: [
      {
        id: "longbow-shot",
        name: "Longbow Shot",
        description: "A well-placed arrow from a practiced hand.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        dice: "1d8",
        damageType: "piercing",
      },
      {
        id: "goodberry",
        name: "Goodberry",
        description: "A handful of enchanted berries mend minor wounds.",
        kind: "heal",
        target: "self",
        ability: "wis",
        dice: "1d4",
      },
    ],
    startingEquipmentOptions: [
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { weapon: "huntersShortbow", armor: "leatherArmor" } },
      { id: "shortsword", label: "Shortsword & Leather Armor", equipment: { weapon: "shortsword", armor: "leatherArmor" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    description: "A wielder of magic born into the blood rather than learned from books.",
    hitDie: 6,
    primaryAbility: "cha",
    savingThrowProficiencies: ["con", "cha"],
    actions: [
      {
        id: "chromatic-orb",
        name: "Chromatic Orb",
        description: "A crackling mote of raw elemental power.",
        kind: "attack",
        target: "enemy",
        ability: "cha",
        dice: "1d8",
        damageType: "fire",
      },
      {
        id: "shield",
        name: "Shield",
        description: "A shimmering, instinctive ward of force, granting +5 AC until your next turn.",
        kind: "buff",
        target: "self",
        ability: "cha",
        effectValue: 5,
        cooldown: 2,
      },
    ],
    startingEquipmentOptions: [
      { id: "dagger", label: "Ritual Dagger & Traveler's Robe", equipment: { weapon: "ritualDagger", armor: "travelersRobe" } },
      { id: "shortbow", label: "Shortbow & Traveler's Robe", equipment: { weapon: "huntersShortbow", armor: "travelersRobe" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  warlock: {
    id: "warlock",
    name: "Warlock",
    description: "A spellcaster whose power comes from a bargain struck with something far older and stranger.",
    hitDie: 8,
    primaryAbility: "cha",
    savingThrowProficiencies: ["wis", "cha"],
    actions: [
      {
        id: "eldritch-blast",
        name: "Eldritch Blast",
        description: "A crackling beam of eldritch energy — a warlock's signature attack.",
        kind: "attack",
        target: "enemy",
        ability: "cha",
        dice: "1d10",
        damageType: "force",
      },
      {
        id: "armor-of-agathys",
        name: "Armor of Agathys",
        description: "A frigid, spectral ward drawn from a dark pact.",
        kind: "buff",
        target: "self",
        ability: "cha",
        effectValue: 2,
        cooldown: 2,
      },
    ],
    startingEquipmentOptions: [
      { id: "dagger", label: "Ritual Dagger & Traveler's Robe", equipment: { weapon: "ritualDagger", armor: "travelersRobe" } },
      { id: "shortbow", label: "Shortbow & Traveler's Robe", equipment: { weapon: "huntersShortbow", armor: "travelersRobe" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
};

export function getClass(id: string): CharacterClass {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`Unknown class: "${id}"`);
  return cls;
}
