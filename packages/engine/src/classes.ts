import { isMagicalAbility, type AbilityKey } from "./abilities.js";
import type { CombatActionDef } from "./actions.js";
import type { ItemSlot } from "./items.js";

export interface StartingEquipmentOption {
  id: string;
  /** Short label shown at character creation, e.g. "Longsword & Chain Shirt". */
  label: string;
  equipment: Partial<Record<ItemSlot, string>>;
}

/**
 * One of a class's two named Basic Attack variants (melee/ranged), per the
 * Class Style Sheet's own explicit per-slot name/ability/modifier (e.g.
 * Warrior's "Wild Swing (20% of attack power)"). `ability` is ignored in
 * favor of `basicAttackAbilityMode` for a class that has one (Soldier,
 * Rogue) -- see character.ts's `generateBasicAttacks`.
 *
 * `percentOfAbility` is stored as **double** the sheet's own stated
 * percentage (e.g. Wild Swing's sheet-stated "20% of attack power" is
 * stored as `0.4`, not `0.2`). Attack Power/Spell Power (see the Character
 * Stats Style Sheet) are simply `ability score × 2`, and combat.ts's damage
 * formula multiplies the RAW ability score directly rather than computing
 * Attack/Spell Power first -- doubling the stored coefficient here produces
 * numerically identical results to "X% of Attack/Spell Power" without any
 * engine-side formula change. Keep player-facing `description` text quoting
 * the sheet's own (undoubled) percentage against "Attack Power"/"Spell
 * Power", not this doubled internal value.
 */
export interface BasicAttackVariant {
  name: string;
  ability: AbilityKey;
  percentOfAbility: number;
}

/** A class's own passive ability, shown on the Character screen's Traits panel alongside race traits. */
export interface ClassPassive {
  name: string;
  description: string;
  /** The character level this passive requires (default 1) -- filtered at display time only (see CharacterScreen.tsx); the test covering every class's passive list reads `cls.passives` directly, unfiltered. */
  unlockLevel?: number;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  primaryAbility: AbilityKey;
  savingThrowProficiencies: AbilityKey[];
  /**
   * Per the Class Style Sheet: this class's own attributes grow by this much
   * on every even level (2, 4, 6, 8, ...) -- see character.ts's
   * `computeAbilityScores`. Replaces the old one-time flat "class bonus"
   * model.
   */
  evenLevelAbilityGrowth: Partial<Record<AbilityKey, number>>;
  /** This class's free, resource-building Basic Attack, one named variant per weapon slot -- the actual action(s) are generated per equipped weapon slot in character.ts's `generateBasicAttacks`, not listed here. */
  basicAttackMelee: BasicAttackVariant;
  basicAttackRanged: BasicAttackVariant;
  /** Soldier only: both Basic Attack variants scale off whichever of STR/DEX is higher, instead of their own listed `ability`. */
  basicAttackAbilityMode?: "highestOfStrDex";
  /**
   * The class's 2 leveled active abilities (Basic Attack and Defend/Flee/End
   * Turn are added separately — see character.ts). Each is filtered by its
   * own `unlockLevel` against `character.level` at action-list assembly
   * time; see actions.ts's `unlockLevel` doc for why this mostly gates
   * everything past a level-1 kit until a leveling system exists.
   */
  actions: CombatActionDef[];
  /** This class's own Class Style Sheet passive(s), for the Character screen's Traits panel. Empty for Rogue, whose passive the sheet itself still just calls "Placeholder". */
  passives: ClassPassive[];
  /** Soldier's "Experience with a blade" passive (+5% parry chance) — modeled as flat Armor Rating, since this engine has no separate parry/riposte roll to hang it on (see README). */
  passiveArmorRating?: number;
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
 * resource pool, resource cost, AP cost, and ability description below is
 * transcribed directly from it. Cooldowns (there are none — the sheet's own
 * resource/AP costs are the limiting factor), damage types where unstated,
 * and each ability's `schoolId` are homebrew, sized to feel right against
 * the existing AP economy and Vitality-scaled HP pools — same precedent as
 * this file's own numbers before this pass.
 *
 * A few mechanics don't have a real equivalent in this engine and are
 * deliberately reinterpreted rather than fabricated wholesale — see
 * `passiveArmorRating`/`rangedAttackHitBonus`'s own comments above, and
 * README's "Class Style Sheet reforge" section for the full list
 * (parry-as-evasion, armor-as-evasion, the flat+percent heal/damage
 * formula, and Rogue's still-"Placeholder" passive, left unimplemented
 * because the sheet itself hasn't decided it yet).
 *
 * A later revision of the sheet reworded every ability's damage/healing
 * scaling to be explicit about Attack Power vs. Spell Power (the Character
 * Stats Style Sheet's two headline offense stats, each `ability score × 2`)
 * rather than a raw ability score -- see `BasicAttackVariant`'s own doc
 * comment for how `percentOfAbility` encodes that without an engine-side
 * formula change. Soldier's and Rogue's "Attack Power = whichever of
 * STR/DEX is higher" both use `basicAttackAbilityMode`. Enrage and Arcane
 * Barrier's buffs stayed a direct Evasion bonus (not real Armor Rating)
 * even though their sheet text now says "armor" -- confirmed with the user
 * this was wording, not a mechanic change.
 */
export const CLASSES: Record<string, CharacterClass> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    description: "Steel and stubbornness. Warriors build Fury by dealing and taking blows, then spend it on crushing strikes.",
    primaryAbility: "str",
    savingThrowProficiencies: ["str", "vit"],
    evenLevelAbilityGrowth: { str: 2, vit: 2, dex: 1 },
    basicAttackMelee: { name: "Wild Swing", ability: "str", percentOfAbility: 0.4 },
    basicAttackRanged: { name: "Wild Shot", ability: "dex", percentOfAbility: 0.3 },
    /**
     * The Warrior's full kit is online by level 10 (6 actives across levels
     * 1-10, using odd levels too -- not every class's own unlocks need to
     * line up with even-level stat growth); from 11-30 no new abilities
     * arrive, only new ranks of these same six, one rank-up landing almost
     * every level all the way to 30 (see README's dated entry for the full
     * per-ability table this was planned from). Each rank is its own entry
     * sharing a `familyId`; `applyEquipmentEffects` keeps only the highest
     * one a character's level qualifies for. Furious Strike and Warlord's
     * Reckoning both carry `requiresStatusDefId: "fortified"` -- Enrage's
     * own buff -- finally paying off Enrage's long-dangling "you can use
     * abilities that require Enraged" line from the original lvl 1-4 kit.
     */
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
        familyId: "enrage",
        rank: 1,
      },
      {
        id: "enrage-r2",
        name: "Enrage (Rank 2)",
        description:
          "A furious battle-cry: for 5 turns, evasion increases by 65% of your Vitality score and you can use abilities that require Enraged. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 20,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "fortified", turns: 5, power: 0.65 },
        familyId: "enrage",
        rank: 2,
        unlockLevel: 11,
      },
      {
        id: "enrage-r3",
        name: "Enrage (Rank 3)",
        description:
          "A furious battle-cry: for 5 turns, evasion increases by 80% of your Vitality score and you can use abilities that require Enraged. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 20,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "fortified", turns: 5, power: 0.8 },
        familyId: "enrage",
        rank: 3,
        unlockLevel: 18,
      },
      {
        id: "enrage-r4",
        name: "Enrage (Rank 4)",
        description:
          "A furious battle-cry: for 5 turns, evasion increases by 100% of your Vitality score and you can use abilities that require Enraged. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 20,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "fortified", turns: 5, power: 1.0 },
        familyId: "enrage",
        rank: 4,
        unlockLevel: 25,
      },
      {
        id: "cleave",
        name: "Cleave",
        description: "A wide arcing attack that strikes every enemy in the target's row. Weapon damage + 20% of your Attack Power. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 0.4,
        resourceCost: 50,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 2,
        familyId: "cleave",
        rank: 1,
      },
      {
        id: "cleave-r2",
        name: "Cleave (Rank 2)",
        description: "A wide arcing attack that strikes every enemy in the target's row. Weapon damage + 26% of your Attack Power. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 0.52,
        resourceCost: 55,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 13,
        familyId: "cleave",
        rank: 2,
      },
      {
        id: "cleave-r3",
        name: "Cleave (Rank 3)",
        description: "A wide arcing attack that strikes every enemy in the target's row. Weapon damage + 33% of your Attack Power. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 0.66,
        resourceCost: 60,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 20,
        familyId: "cleave",
        rank: 3,
      },
      {
        id: "cleave-r4",
        name: "Cleave (Rank 4)",
        description: "A wide arcing attack that strikes every enemy in the target's row. Weapon damage + 40% of your Attack Power. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 0.8,
        resourceCost: 65,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 27,
        familyId: "cleave",
        rank: 4,
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
        applyStatus: { defId: "bleeding", turns: 3, weaponPercent: 0.1 },
        unlockLevel: 4,
        familyId: "serrated-blade",
        rank: 1,
      },
      {
        id: "serrated-blade-r2",
        name: "Serrated Blade (Rank 2)",
        description: "A vicious slashing attack that wounds the target, causing them to bleed for 3 turns for 13% Attack Power. Weapon damage. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 33,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "bleeding", turns: 3, weaponPercent: 0.13 },
        unlockLevel: 12,
        familyId: "serrated-blade",
        rank: 2,
      },
      {
        id: "serrated-blade-r3",
        name: "Serrated Blade (Rank 3)",
        description: "A vicious slashing attack that wounds the target, causing them to bleed for 3 turns for 16% Attack Power. Weapon damage. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 36,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "bleeding", turns: 3, weaponPercent: 0.16 },
        unlockLevel: 19,
        familyId: "serrated-blade",
        rank: 3,
      },
      {
        id: "serrated-blade-r4",
        name: "Serrated Blade (Rank 4)",
        description: "A vicious slashing attack that wounds the target, causing them to bleed for 3 turns for 20% Attack Power. Weapon damage. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        resourceCost: 40,
        apCost: 2,
        schoolId: "martial",
        applyStatus: { defId: "bleeding", turns: 3, weaponPercent: 0.2 },
        unlockLevel: 26,
        familyId: "serrated-blade",
        rank: 4,
      },
      {
        id: "furious-strike",
        name: "Furious Strike",
        description:
          "A single devastating blow fueled by rage. Weapon damage + 40% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 0.8,
        resourceCost: 40,
        apCost: 2,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 6,
        familyId: "furious-strike",
        rank: 1,
      },
      {
        id: "furious-strike-r2",
        name: "Furious Strike (Rank 2)",
        description:
          "A single devastating blow fueled by rage. Weapon damage + 50% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.0,
        resourceCost: 45,
        apCost: 2,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 21,
        familyId: "furious-strike",
        rank: 2,
      },
      {
        id: "furious-strike-r3",
        name: "Furious Strike (Rank 3)",
        description:
          "A single devastating blow fueled by rage. Weapon damage + 60% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.2,
        resourceCost: 50,
        apCost: 2,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 28,
        familyId: "furious-strike",
        rank: 3,
      },
      {
        id: "bulwark-stance",
        name: "Bulwark Stance",
        description:
          "Plants firm and braces for the next blow: for 1 turn, evasion increases by 100% of your Vitality score. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 25,
        apCost: 1,
        schoolId: "martial",
        applyStatus: { defId: "braced", turns: 1, power: 1.0 },
        unlockLevel: 8,
        familyId: "bulwark-stance",
        rank: 1,
      },
      {
        id: "bulwark-stance-r2",
        name: "Bulwark Stance (Rank 2)",
        description:
          "Plants firm and braces for the next blow: for 1 turn, evasion increases by 120% of your Vitality score. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 25,
        apCost: 1,
        schoolId: "martial",
        applyStatus: { defId: "braced", turns: 1, power: 1.2 },
        unlockLevel: 15,
        familyId: "bulwark-stance",
        rank: 2,
      },
      {
        id: "bulwark-stance-r3",
        name: "Bulwark Stance (Rank 3)",
        description:
          "Plants firm and braces for the next blows: for 2 turns, evasion increases by 140% of your Vitality score. Costs Fury.",
        kind: "buff",
        target: "self",
        ability: "vit",
        resourceCost: 25,
        apCost: 1,
        schoolId: "martial",
        applyStatus: { defId: "braced", turns: 2, power: 1.4 },
        unlockLevel: 22,
        familyId: "bulwark-stance",
        rank: 3,
      },
      {
        id: "warlords-reckoning",
        name: "Warlord's Reckoning",
        description:
          "A devastating cleave fueled by rage, striking every enemy in the target's row. Weapon damage + 50% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.0,
        resourceCost: 60,
        apCost: 3,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 10,
        familyId: "warlords-reckoning",
        rank: 1,
      },
      {
        id: "warlords-reckoning-r2",
        name: "Warlord's Reckoning (Rank 2)",
        description:
          "A devastating cleave fueled by rage, striking every enemy in the target's row. Weapon damage + 60% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.2,
        resourceCost: 65,
        apCost: 3,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 17,
        familyId: "warlords-reckoning",
        rank: 2,
      },
      {
        id: "warlords-reckoning-r3",
        name: "Warlord's Reckoning (Rank 3)",
        description:
          "A devastating cleave fueled by rage, striking every enemy in the target's row. Weapon damage + 70% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.4,
        resourceCost: 70,
        apCost: 3,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 24,
        familyId: "warlords-reckoning",
        rank: 3,
      },
      {
        id: "warlords-reckoning-r4",
        name: "Warlord's Reckoning (Rank 4)",
        description:
          "A devastating cleave fueled by rage, striking every enemy in the target's row. Weapon damage + 85% of your Attack Power. Requires Enraged. Costs Fury.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "slashing",
        percentOfAbility: 1.7,
        resourceCost: 75,
        apCost: 3,
        schoolId: "martial",
        requiresStatusDefId: "fortified",
        unlockLevel: 30,
        familyId: "warlords-reckoning",
        rank: 4,
      },
    ],
    // Furious and Reckless's actual numbers are ranked by level (see combat.ts's
    // `furiousPercent`/`recklessMultiplier`) but described generically here rather than
    // listing one specific rank's figure that would go stale the moment a character ranks
    // up -- passives aren't modeled with the same familyId/rank mechanism active abilities
    // use above, since nothing else needs to resolve "the current rank of a passive" structurally.
    passives: [
      {
        name: "Furious",
        description:
          "Generates Fury when struck by an enemy, equal to a percentage of the damage taken -- 25% to start, growing as you gain experience.",
      },
      {
        name: "Reckless",
        description:
          "While below half HP, Fury gained from Furious and from landing your Basic Attack is increased -- more so, and at an even higher HP threshold, as you gain experience.",
        unlockLevel: 5,
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
    evenLevelAbilityGrowth: { str: 2, dex: 2, vit: 1 },
    basicAttackMelee: { name: "Practiced Strike", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Steady Shot", ability: "dex", percentOfAbility: 0.3 },
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
        description: "Hooks the target's leg for weapon damage + 20% of your Attack Power, knocking them down for 1 turn. Costs Expertise.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        weaponDamageSource: "melee",
        damageType: "bludgeoning",
        percentOfAbility: 0.4,
        resourceCost: 5,
        apCost: 3,
        schoolId: "martial",
        applyStatus: { defId: "knockedDown", turns: 1 },
        unlockLevel: 4,
      },
    ],
    passives: [{ name: "Experience with a Blade", description: "Parry chance increased by 5%." }],
    // "Experience with a blade": +5% parry chance -- see passiveArmorRating's own doc comment.
    passiveArmorRating: 100,
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
    evenLevelAbilityGrowth: { wis: 2, str: 1, vit: 1 },
    basicAttackMelee: { name: "Swinging Smite", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Radiance", ability: "wis", percentOfAbility: 0.3 },
    actions: [
      {
        id: "mend",
        name: "Mend",
        description: "Calls upon your deity to restore health: heals an ally for 40 + 10% of your Spell Power. Costs Prayer.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        flatBase: 40,
        percentOfAbility: 0.2,
        resourceCost: 1,
        apCost: 2,
        schoolId: "radiant",
        unlockLevel: 2,
      },
      {
        id: "radiant-beam",
        name: "Radiant Beam",
        description:
          "Calls down a divine beam, damaging the target and adjacent enemies in their row for 40 + 20% of your Spell Power. Costs Prayer.",
        kind: "attack",
        target: "enemy",
        targetShape: "area",
        ability: "wis",
        damageType: "radiant",
        flatBase: 40,
        percentOfAbility: 0.4,
        resourceCost: 4,
        apCost: 3,
        schoolId: "radiant",
        unlockLevel: 4,
      },
    ],
    passives: [
      { name: "Spellcasting", description: "Your spells' damage and healing scale off your Spell Power." },
    ],
    startingEquipmentOptions: [
      {
        id: "mace-and-leather",
        label: "Ashen Mace, Radiance & Studded Leather",
        equipment: { meleeWeapon: "ashenMace", rangedWeapon: "radiance", armor: "studdedLeather" },
      },
      {
        id: "mace-and-mail",
        label: "Ashen Mace, Radiance & Chain Shirt",
        equipment: { meleeWeapon: "ashenMace", rangedWeapon: "radiance", armor: "chainShirt" },
      },
    ],
    startingInventory: ["ringOfWarding"],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    description: "A sharpshooting scout, favoring the bow but never without a blade close at hand.",
    primaryAbility: "dex",
    savingThrowProficiencies: ["dex", "wis"],
    evenLevelAbilityGrowth: { dex: 2, wis: 1, vit: 1 },
    basicAttackMelee: { name: "Blade Slash", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Quick Shot", ability: "dex", percentOfAbility: 0.4 },
    actions: [
      {
        id: "barbed-arrow",
        name: "Barbed Arrow",
        description: "Arms your next 2 attacks with barbed arrowheads, causing the target to bleed for 5% of your Attack Power. Costs Focus.",
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
        description: "Forages for herbs to mend a wound: heals you for 30 + 20% of your Spell Power. Costs Focus.",
        kind: "heal",
        target: "self",
        ability: "wis",
        flatBase: 30,
        percentOfAbility: 0.4,
        resourceCost: 2,
        apCost: 2,
        schoolId: "martial",
        unlockLevel: 4,
      },
    ],
    passives: [
      {
        name: "Sharpshooter",
        description: "Increases hit chance and critical chance by 5% while attacking with a ranged weapon.",
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
    evenLevelAbilityGrowth: { dex: 3 },
    // "Attack Power = Dexterity * 2 or Strength * 2 (whichever is higher)" -- same rule as Soldier.
    basicAttackAbilityMode: "highestOfStrDex",
    basicAttackMelee: { name: "Subtle Slash", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Quick Strike", ability: "dex", percentOfAbility: 0.3 },
    actions: [
      {
        id: "evasive-jab",
        name: "Evasive Jab",
        description:
          "A quick strike through your foe's guard: weapon damage + 20% of your Attack Power, then Readied (1 stack, -50% chance to be hit) until spent. Costs Cunning.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        weaponDamageSource: "melee",
        damageType: "piercing",
        percentOfAbility: 0.4,
        resourceCost: 20,
        apCost: 3,
        schoolId: "shadow",
        applySelfStatus: { defId: "readied", turns: 99, stacks: 1 },
        unlockLevel: 2,
      },
      {
        id: "poisoned-throw",
        name: "Poisoned Throw",
        description:
          "A blade dipped in poison: weapon damage + 15% of your Attack Power, poisoning the target for 3 turns (10% Attack Power per turn). Costs Cunning.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        weaponDamageSource: "melee",
        damageType: "piercing",
        percentOfAbility: 0.3,
        resourceCost: 15,
        apCost: 2,
        schoolId: "shadow",
        applyStatus: { defId: "poisoned", turns: 3, power: 0.2 },
        unlockLevel: 4,
      },
    ],
    // The Class Style Sheet itself just says "Placeholder" for Rogue's passive -- left unimplemented
    // rather than invented, so `passives` stays empty (no card shows on the Character screen).
    passives: [],
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
    evenLevelAbilityGrowth: { wis: 2, vit: 1, dex: 1 },
    basicAttackMelee: { name: "Nature's Strike", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Nature's Blast", ability: "wis", percentOfAbility: 0.3 },
    actions: [
      {
        id: "wylde-healing",
        name: "Wylde Healing",
        description: "Summons the will of the Wylde to heal yourself or an ally for 40 + 20% of your Spell Power. Costs Wylde.",
        kind: "heal",
        target: "ally",
        ability: "wis",
        flatBase: 40,
        percentOfAbility: 0.4,
        resourceCost: 30,
        apCost: 2,
        schoolId: "nature",
        unlockLevel: 2,
      },
      {
        id: "wylde-wrath",
        name: "Wylde Wrath",
        description: "A massive vine whips in a wide arc, striking an entire row of enemies for 60 + 25% of your Spell Power. Costs Wylde.",
        kind: "attack",
        target: "enemy",
        targetShape: "line",
        ability: "wis",
        damageType: "piercing",
        flatBase: 60,
        percentOfAbility: 0.5,
        resourceCost: 70,
        apCost: 3,
        schoolId: "nature",
        unlockLevel: 4,
      },
    ],
    passives: [
      { name: "Spellcasting", description: "Your spells' damage and healing scale off your Spell Power." },
    ],
    startingEquipmentOptions: [
      {
        id: "mace",
        label: "Ashen Mace, Nature's Blast & Leather Armor",
        equipment: { meleeWeapon: "ashenMace", rangedWeapon: "naturesBlast", armor: "leatherArmor" },
      },
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
    evenLevelAbilityGrowth: { int: 3 },
    basicAttackMelee: { name: "Arcane Smash", ability: "str", percentOfAbility: 0.3 },
    basicAttackRanged: { name: "Arcane Bolt", ability: "int", percentOfAbility: 0.4 },
    actions: [
      {
        id: "elemental-shard",
        name: "Elemental Shard",
        description:
          "Invokes the Arcane, creating a shard of elemental power -- fire, ice, or force at random -- for 35 + 20% of your Spell Power. Costs Arcana.",
        kind: "attack",
        target: "enemy",
        ability: "int",
        randomDamageTypes: ["fire", "cold", "force"],
        flatBase: 35,
        percentOfAbility: 0.4,
        resourceCost: 50,
        apCost: 2,
        schoolId: "arcane",
        unlockLevel: 2,
      },
      {
        id: "arcane-barrier",
        name: "Arcane Barrier",
        description: "Conjures a protective shield: evasion increases by 50% of your Spell Power for 3 turns. Costs Arcana.",
        kind: "buff",
        target: "self",
        ability: "int",
        resourceCost: 30,
        apCost: 2,
        schoolId: "arcane",
        applyStatus: { defId: "fortified", turns: 3, power: 1.0 },
        unlockLevel: 4,
      },
    ],
    passives: [
      { name: "Spellcasting", description: "Your spells' damage and healing scale off your Spell Power." },
    ],
    startingEquipmentOptions: [
      {
        id: "staff",
        label: "Oaken Staff, Arcane Bolt & Traveler's Robe",
        equipment: { meleeWeapon: "oakenStaff", rangedWeapon: "arcaneBolt", armor: "travelersRobe" },
      },
      {
        id: "dagger",
        label: "Ritual Dagger, Arcane Bolt & Traveler's Robe",
        equipment: { meleeWeapon: "ritualDagger", rangedWeapon: "arcaneBolt", armor: "travelersRobe" },
      },
    ],
    startingInventory: ["luckyCharm"],
  },
};

export function getClass(id: string): CharacterClass {
  const cls = CLASSES[id];
  if (!cls) throw new Error(`Unknown class: "${id}"`);
  return cls;
}

/**
 * The ability governing this class's magical attacks (its basic ranged
 * attack, or any damaging spell), or undefined if it has none -- Cleric and
 * Druid (Wisdom) and Wizard (Intellect) today. Used to decide whether the
 * Character screen's Magical Offense section applies, and which score
 * powers it (Character Stats Style Sheet's Spell Power/Magical Critical
 * Chance/Magical Critical Damage).
 */
export function magicalAttackAbility(cls: CharacterClass): AbilityKey | undefined {
  const candidates: AbilityKey[] = [
    cls.basicAttackMelee.ability,
    cls.basicAttackRanged.ability,
    ...cls.actions.filter((a) => a.kind === "attack").map((a) => a.ability),
  ];
  return candidates.find(isMagicalAbility);
}
