import type { AbilityKey } from "./abilities.js";
import type { CombatActionDef } from "./actions.js";
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
  /** The Class Style Sheet's name for this class's free, resource-building Basic Attack (e.g. "Wild Swing") — the actual action(s) are generated per equipped weapon slot in character.ts's `generateBasicAttacks`, not listed here. */
  basicAttackName: string;
  /** Soldier only: the Basic Attack scales off whichever of STR/DEX is higher, instead of `primaryAbility`. */
  basicAttackAbilityMode?: "highestOfStrDex";
  /**
   * The class's 2 leveled active abilities (Basic Attack and Defend/Flee/End
   * Turn are added separately — see character.ts). Each is filtered by its
   * own `unlockLevel` against `character.level` at action-list assembly
   * time; see actions.ts's `unlockLevel` doc for why this mostly gates
   * everything past a level-1 kit until a leveling system exists.
   */
  actions: CombatActionDef[];
  /** Soldier's "Experience with a blade" passive (+5% parry chance) — modeled as flat evasion, since this engine has no separate parry/riposte roll to hang it on (see README). */
  passiveEvasionBonus?: number;
  /** Ranger's Sharpshooter passive: flat hit/crit bonus while their ranged weapon is the one swinging. */
  rangedAttackHitBonus?: number;
  rangedAttackCritBonus?: number;
  /**
   * SRD-style "choose (a) or (b)" starting gear, respecting the class's weapon/armor
   * restrictions.
   */
  startingEquipmentOptions: StartingEquipmentOption[];
  /** Extra item ids owned but not equipped at creation (e.g. a spare accessory to try). */
  startingInventory: string[];
}

/**
 * The seven playable classes from the Class Style Sheet (Google Drive,
 * "Class Information/Age of Broken Wings - Class Style Sheet.docx"): every
 * resource pool, resource cost, and ability description below is
 * transcribed directly from it. AP cost, cooldowns (there are none — the
 * sheet's own resource costs are the limiting factor), damage types where
 * unstated, and each ability's `schoolId` are homebrew, sized to feel right
 * against the existing AP economy and Vitality-scaled HP pools — same
 * precedent as this file's own numbers before this pass.
 *
 * A few mechanics don't have a real equivalent in this engine and are
 * deliberately reinterpreted rather than fabricated wholesale — see
 * `passiveEvasionBonus`/`rangedAttackHitBonus`'s own comments above, and
 * README's "Class Style Sheet reforge" section for the full list
 * (parry-as-evasion, armor-as-evasion, the flat+percent heal/damage
 * formula, and Rogue's still-"Placeholder" passive, left unimplemented
 * because the sheet itself hasn't decided it yet).
 */
export const CLASSES: Record<string, CharacterClass> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Steel and stubbornness. Warriors build Fury by dealing and taking blows, then spend it on crushing strikes.",
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "vit"],
    abilityScoreBonuses: { str: 4, vit: 3, dex: 1 },
    basicAttackName: "Wild Swing",
    actions: [
      {
        id: "enrage",
        name: "Enrage",
        description:
          "A furious battle-cry: for 5 turns, evasion increases by 50% of your Vitality score and you can use abilities that require Enraged. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 20,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "fortified", turns: 5, power: 0.5 },
      },
      {
        id: "cleave",
        name: "Cleave",
        description: "A wide arcing attack that strikes every enemy in the target's row. Weapon damage, scales with Strength. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 50,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 2,
      },
      {
        id: "serrated-blade",
        name: "Serrated Blade",
        description: "A vicious slashing attack that wounds the target, causing them to bleed for 3 turns. Weapon damage. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 30,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "bleeding", turns: 3, weaponPercent: 0.05 },
        unlockLevel: 4,
      },
    ],
    startingEquipmentOptions: [
      { id: "sword-and-mail", label: "Longsword & Chain Shirt", equipment: { meleeWeapon: "ironLongsword", armor: "chainShirt" } },
      { id: "sword-and-leather", label: "Longsword & Studded Leather", equipment: { meleeWeapon: "ironLongsword", armor: "studdedLeather" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  soldier: {
    id: "soldier",
    name: "Soldier",
    description: "A disciplined blade-and-shield fighter, trading burst damage for tempo: knock foes down and punish their openings.",
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "dex"],
    abilityScoreBonuses: { str: 3, dex: 3, vit: 2 },
    basicAttackName: "Practiced Strike",
    basicAttackAbilityMode: "highestOfStrDex",
    actions: [
      {
        id: "defensive-flourish",
        name: "Defensive Flourish",
        description:
          "A slashing attack, then a defensive stance: gain 2 stacks of Readied, each reducing an attacker's chance to hit you by 50% until spent. Weapon damage. Costs Expertise.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 3,
        apCost: 2,
        schoolId: "martial",
        applySelfStatus: { defId: "readied", turns: 99, stacks: 2 },
        unlockLevel: 2,
      },
      {
        id: "topple",
        name: "Topple",
        description: "Hooks the target's leg, knocking them down for 1 turn. Weapon damage. Costs Expertise.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "bludgeoning",
        resourceCost: 5,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "knockedDown", turns: 1 },
        unlockLevel: 4,
      },
    ],
    // "Experience with a blade": +5% parry chance -- see passiveEvasionBonus's own doc comment.
    passiveEvasionBonus: 5,
    startingEquipmentOptions: [
      { id: "sword-and-mail", label: "Shortsword & Chain Shirt", equipment: { meleeWeapon: "shortsword", armor: "chainShirt" } },
      { id: "sword-and-leather", label: "Shortsword & Studded Leather", equipment: { meleeWeapon: "shortsword", armor: "studdedLeather" } },
    ],
    startingInventory: ["luckyCharm"],
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    description: "A vessel of the dawn. Clerics mend wounds and lash out with radiant judgment, husbanding a slim reserve of Prayer.",
    primaryAbility: "wis",
    savingThrowProficiencies: ["wis"],
    abilityScoreBonuses: { wis: 4, vit: 1 },
    basicAttackName: "Swinging Smite",
    actions: [
      {
        id: "mend",
        name: "Mend",
        description: "Calls upon your deity to restore health: heals an ally for 50 + 10% of your Wisdom. Costs Prayer.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        flatBase: 50,
        percentOfAbility: 0.1,
        resourceCost: 1,
        apCost: 2,
        schoolId: "radiant",
        unlockLevel: 2,
      },
      {
        id: "radiant-beam",
        name: "Radiant Beam",
        description:
          "Calls down a divine beam, damaging the target and adjacent enemies in their row for 100 + 20% of your Wisdom. Costs Prayer.",
        kind: "attack",
        target: "enemy",
        targetShape: "area",
        ability: "wis",
        damageType: "radiant",
        flatBase: 100,
        percentOfAbility: 0.2,
        resourceCost: 4,
        apCost: 2,
        schoolId: "radiant",
        unlockLevel: 4,
      },
    ],
    startingEquipmentOptions: [
      { id: "mace-and-leather", label: "Ashen Mace & Studded Leather", equipment: { meleeWeapon: "ashenMace", armor: "studdedLeather" } },
      { id: "mace-and-mail", label: "Ashen Mace & Chain Shirt", equipment: { meleeWeapon: "ashenMace", armor: "chainShirt" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "A sharpshooting scout, favoring the bow but never without a blade close at hand.",
    primaryAbility: "dex",
    savingThrowProficiencies: ["dex", "wis"],
    abilityScoreBonuses: { dex: 5, wis: 2, vit: 1 },
    basicAttackName: "Quick Shot",
    actions: [
      {
        id: "barbed-arrow",
        name: "Barbed Arrow",
        description: "Arms your next 2 attacks with barbed arrowheads, causing the target to bleed. Costs Focus.",
        kind: "buff",
        target: "self",
        ability: "dex",
        resourceCost: 2,
        apCost: 1,
        schoolId: "martial",
        applyStatus: { defId: "barbedPrimed", turns: 99, stacks: 2 },
        unlockLevel: 2,
      },
      {
        id: "natures-remedy",
        name: "Nature's Remedy",
        description: "Forages for herbs to mend a wound: heals you for 50 + 10% of your Wisdom. Costs Focus.",
        kind: "heal",
        target: "self",
        ability: "wis",
        flatBase: 50,
        percentOfAbility: 0.1,
        resourceCost: 2,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 4,
      },
    ],
    // Sharpshooter: +5% hit and crit chance with their ranged weapon (see rangedAttackHitBonus's own doc comment).
    rangedAttackHitBonus: 5,
    rangedAttackCritBonus: 5,
    startingEquipmentOptions: [
      {
        id: "bow-and-dagger",
        label: "Shortbow, Dagger & Leather Armor",
        equipment: { rangedWeapon: "huntersShortbow", meleeWeapon: "ritualDagger", armor: "leatherArmor" },
      },
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
    basicAttackName: "Subtle Slash",
    actions: [
      {
        id: "evasive-jab",
        name: "Evasive Jab",
        description:
          "A quick strike through your foe's guard: weapon damage + 20% of your Dexterity, then Readied (1 stack, -50% chance to be hit) until spent. Costs Cunning.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        weaponDamageSource: "melee",
        damageType: "piercing",
        percentOfAbility: 0.2,
        resourceCost: 20,
        apCost: 2,
        schoolId: "shadow",
        applySelfStatus: { defId: "readied", turns: 99, stacks: 1 },
        unlockLevel: 2,
      },
      {
        id: "poisoned-throw",
        name: "Poisoned Throw",
        description:
          "A blade dipped in poison: weapon damage + 15% of your Dexterity, poisoning the target for 3 turns. Costs Cunning.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        weaponDamageSource: "melee",
        damageType: "piercing",
        percentOfAbility: 0.15,
        resourceCost: 15,
        apCost: 2,
        schoolId: "shadow",
        applyStatus: { defId: "poisoned", turns: 3, weaponPercent: 0.05 },
        unlockLevel: 4,
      },
    ],
    // The Class Style Sheet itself just says "Placeholder" for Rogue's passive -- left unimplemented rather than invented.
    startingEquipmentOptions: [
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { rangedWeapon: "huntersShortbow", armor: "leatherArmor" } },
      { id: "shortsword", label: "Shortsword & Leather Armor", equipment: { meleeWeapon: "shortsword", armor: "leatherArmor" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  druid: {
    id: "druid",
    name: "Druid",
    description: "Wardens of root and bloom, drawing on nature's own magic in battle.",
    primaryAbility: "wis",
    savingThrowProficiencies: ["int", "wis"],
    abilityScoreBonuses: { wis: 3, vit: 2, dex: 1 },
    basicAttackName: "Nature's Strike",
    actions: [
      {
        id: "wylde-healing",
        name: "Wylde Healing",
        description: "Summons the will of the Wylde to heal yourself or an ally for 50 + 10% of your Wisdom. Costs Wylde.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        flatBase: 50,
        percentOfAbility: 0.1,
        resourceCost: 30,
        apCost: 2,
        schoolId: "nature",
        unlockLevel: 2,
      },
      {
        id: "wylde-wrath",
        name: "Wylde Wrath",
        description: "A massive vine whips in a wide arc, striking an entire row of enemies for 75 + 25% of your Wisdom. Costs Wylde.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "wis",
        damageType: "piercing",
        flatBase: 75,
        percentOfAbility: 0.25,
        resourceCost: 60,
        apCost: 3,
        schoolId: "nature",
        unlockLevel: 4,
      },
    ],
    startingEquipmentOptions: [
      { id: "mace", label: "Ashen Mace & Leather Armor", equipment: { meleeWeapon: "ashenMace", armor: "leatherArmor" } },
      { id: "shortbow", label: "Shortbow & Leather Armor", equipment: { rangedWeapon: "huntersShortbow", armor: "leatherArmor" } },
    ],
    startingInventory: ["ringOfWarding"],
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    description: "Scholars of the arcane, channeling raw magic through years of study.",
    primaryAbility: "int",
    savingThrowProficiencies: ["int", "wis"],
    abilityScoreBonuses: { int: 5 },
    basicAttackName: "Arcane Bolt",
    actions: [
      {
        id: "elemental-shard",
        name: "Elemental Shard",
        description:
          "Invokes the Arcane, creating a shard of elemental power -- fire, ice, or force at random -- for 65 + 20% of your Intellect. Costs Arcana.",
        kind: "attack",
        target: "enemy",
        ability: "int",
        randomDamageTypes: ["fire", "cold", "force"],
        flatBase: 65,
        percentOfAbility: 0.2,
        resourceCost: 30,
        apCost: 2,
        schoolId: "arcane",
        unlockLevel: 2,
      },
      {
        id: "arcane-barrier",
        name: "Arcane Barrier",
        description: "Conjures a protective shield: evasion increases by 50% of your Intellect for 3 turns. Costs Arcana.",
        kind: "buff",
        target: "self",
        ability: "int",
        resourceCost: 30,
        apCost: 2,
        schoolId: "arcane",
        applyStatus: { defId: "fortified", turns: 3, power: 0.5 },
        unlockLevel: 4,
      },
    ],
    startingEquipmentOptions: [
      { id: "staff", label: "Oaken Staff & Traveler's Robe", equipment: { meleeWeapon: "oakenStaff", armor: "travelersRobe" } },
      { id: "dagger", label: "Ritual Dagger & Traveler's Robe", equipment: { meleeWeapon: "ritualDagger", armor: "travelersRobe" } },
    ],
    startingInventory: ["luckyCharm"],
  },
};

export function getClass(id: string): CharacterClass {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`Unknown class: "${id}"`);
  return cls;
}
