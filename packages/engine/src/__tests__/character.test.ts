import { describe, expect, it } from "vitest";
import {
  ACTION_BAR_SLOT_COUNT,
  LEVEL_CAP,
  STARTING_GOLD,
  SELL_PRICE_RATIO,
  assignActionBarSlot,
  buyItem,
  clearActionBarSlot,
  computeAbilityScores,
  createCharacter,
  equipItem,
  equipmentAbilityBonuses,
  gainExperience,
  ownsItem,
  sellItem,
  setCharacterLevel,
  unequipItem,
  useConsumable,
  withClassMigrationIfMissing,
  withStartingGearIfMissing,
  xpToNextLevel,
} from "../character.js";
import type { Character } from "../character.js";
import { RACES, type HalfElfChoice } from "../races.js";
import { CLASSES } from "../classes.js";
import { isActionReady, startCombat, submitPlayerAction, toCombatant, type Combatant } from "../combat.js";
import { GUARANTEED_SUCCESS, forD20, forVariance, sequenceRng } from "./testUtils.js";

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
    maxHp: 20,
    hp: 20,
    armorRating: 0,
    actions: [
      { id: "claw", name: "Claw", description: "", kind: "attack", target: "enemy", ability: "str", power: 1, damageType: "slashing" },
    ],
    actionUses: {},
    actionCooldowns: {},
    savingThrowProficiencies: [],
    damageResistances: [],
    damageVulnerabilities: [],
    damageImmunities: [],
    tempEvasionBonus: 0,
    dodging: false,
    initiative: 0,
    fled: false,
    unconscious: false,
    dead: false,
    rank: "front",
    statusEffects: [],
    ...overrides,
  };
}

describe("createCharacter", () => {
  it("derives ability scores and HP/AC for a level 1 character from race/class growth", () => {
    const character = createCharacter({
      id: "pc-1",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10 },
    });

    // Base scores + Elf's own growth at level 1 (odd: dex+2,wis+2) + Rogue's own growth
    // at even levels up to 1 (none yet -- starts at level 2).
    expect(character.abilityScores.str).toBe(10);
    expect(character.abilityScores.dex).toBe(17); // 15 +2 = 17
    expect(character.abilityScores.vit).toBe(12);
    expect(character.abilityScores.int).toBe(10);
    expect(character.abilityScores.wis).toBe(12); // 10 +2 = 12

    // Rogue: 100 + vit*10 + class health bonus (20) = 100 + 120 + 20 = 240
    expect(character.maxHp).toBe(240);
    expect(character.hp).toBe(character.maxHp);

    // Starting gear: Hunter's Shortbow (no armor rating) + Leather Armor (+5)
    expect(character.armorRating).toBe(5);

    expect(character.proficiencyBonus).toBe(2);
    // At level 1, only the generated Basic Attack (Rogue's own leveled abilities start at lvl 2) plus Defend/Flee are known.
    expect(character.actions.some((a) => a.isBasicAttack)).toBe(true);
    expect(character.actions.some((a) => a.id === "defend")).toBe(true);
    expect(character.actions.some((a) => a.id === "flee")).toBe(true);
  });

  it("grants a Dwarf's Axe-wielders passive and applies its odd-level ability growth", () => {
    const character = createCharacter({
      id: "pc-1c",
      name: "Vex",
      raceId: "dwarf",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });

    expect(character.racePassiveId).toBe("axeWielders");
    expect(character.damageResistances).not.toContain("poison"); // Stoneblood was replaced by Axe-wielders, not kept alongside it
    // Dwarf's own growth at level 1 (odd: str+2,vit+2); Warrior's own growth doesn't apply yet (starts at level 2).
    expect(character.abilityScores.str).toBe(17); // 15 +2 = 17
    expect(character.abilityScores.vit).toBe(15); // 13 +2 = 15
    expect(character.abilityScores.dex).toBe(14);
  });

  it("starts with class-appropriate equipped gear and a spare accessory", () => {
    const character = createCharacter({
      id: "pc-3",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });

    expect(character.equipment.meleeWeapon).toBe("ironLongsword");
    expect(character.equipment.armor).toBe("chainShirt");
    expect(character.equipment.accessory).toBeUndefined();
    expect(ownsItem(character, "luckyCharm")).toBe(true);

    // The equipped weapon contributes its own min-max damage range to the generated melee Basic Attack.
    expect(character.meleeWeaponDamageMin).toBe(14);
    expect(character.meleeWeaponDamageMax).toBe(20);
  });

  it("equips the chosen startingEquipmentOptions package instead of the default", () => {
    const defaultGear = createCharacter({
      id: "pc-3b",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    expect(defaultGear.equipment.armor).toBe("chainShirt");

    const chosenGear = createCharacter({
      id: "pc-3c",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      equipmentOptionId: "sword-and-leather",
    });
    expect(chosenGear.equipment.meleeWeapon).toBe("ironLongsword");
    expect(chosenGear.equipment.armor).toBe("studdedLeather");
    expect(ownsItem(chosenGear, "studdedLeather")).toBe(true);

    // An unrecognized option id falls back to the class's first (default) option rather than throwing.
    const unknownOption = createCharacter({
      id: "pc-3d",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      equipmentOptionId: "nonexistent",
    });
    expect(unknownOption.equipment).toEqual(defaultGear.equipment);
  });

  it("gives every class's every starting equipment option valid, equippable items", () => {
    for (const cls of Object.values(CLASSES)) {
      expect(cls.startingEquipmentOptions.length).toBeGreaterThan(0);
      for (const option of cls.startingEquipmentOptions) {
        const character = createCharacter({
          id: `${cls.id}-${option.id}`,
          name: "Test",
          raceId: "human",
          classId: cls.id,
          baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
          equipmentOptionId: option.id,
        });
        expect(character.equipment).toEqual(option.equipment);
      }
    }
  });

  it("throws for an unknown race or class", () => {
    const base = {
      id: "pc-2",
      name: "Nobody",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
    };
    expect(() => createCharacter({ ...base, raceId: "nope", classId: "warrior" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "nope" })).toThrow();
  });

  it("creates a sane character for every combination of race and class", () => {
    for (const race of Object.values(RACES)) {
      for (const cls of Object.values(CLASSES)) {
        const character = createCharacter({
          id: `${race.id}-${cls.id}`,
          name: "Test",
          raceId: race.id,
          classId: cls.id,
          baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
        });
        expect(character.maxHp).toBeGreaterThan(0);
        expect(character.armorRating).toBeGreaterThan(0);
        expect(character.actions.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("equipItem / unequipItem", () => {
  function warrior() {
    return createCharacter({
      id: "pc-4",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
  }

  it("equips an owned accessory and applies its armor rating", () => {
    const before = warrior();
    const after = equipItem(before, "luckyCharm");

    expect(after.equipment.accessory).toBe("luckyCharm");
    expect(after.armorRating).toBe(before.armorRating + 3);
    // Equipping doesn't consume the item from inventory.
    expect(ownsItem(after, "luckyCharm")).toBe(true);
  });

  it("unequips a slot and removes its armor rating", () => {
    const equipped = equipItem(warrior(), "luckyCharm");
    const unequipped = unequipItem(equipped, "accessory");

    expect(unequipped.equipment.accessory).toBeUndefined();
    expect(unequipped.armorRating).toBe(equipped.armorRating - 3);
  });

  it("names and scales each Basic Attack variant from the class's own definition, and reverts when unequipped", () => {
    const rogue = createCharacter({
      id: "pc-5",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10 },
    });

    // Rogue starts with a Hunter's Shortbow equipped in the ranged slot, no melee weapon. Rogue's
    // named variants (Class Style Sheet): ranged "Quick Strike", melee "Subtle Slash" -- neither
    // depends on the equipped weapon's own `ability` field anymore, or on Rogue's primaryAbility
    // (dex). Rogue's own "Attack Power = whichever of STR/DEX is higher" rule (basicAttackAbilityMode)
    // overrides both variants' own listed ability -- this Elf's DEX (15+growth) beats STR (10), so
    // both resolve to "dex", same as Soldier's own tie-break test below.
    const rangedStrike = rogue.actions.find((a) => a.id === "strike-ranged");
    expect(rangedStrike?.name).toBe("Quick Strike");
    expect(rangedStrike?.ability).toBe("dex");
    expect(rogue.rangedWeaponDamageMin).toBe(7);
    expect(rogue.rangedWeaponDamageMax).toBe(10);
    // The unarmed melee variant is still offered (Subtle Slash), also resolving to DEX here.
    const meleeStrike = rogue.actions.find((a) => a.id === "strike-melee");
    expect(meleeStrike?.name).toBe("Subtle Slash");
    expect(meleeStrike?.ability).toBe("dex");
    expect(rogue.meleeWeaponDamageMin).toBeUndefined();

    // Unequipping the ranged weapon removes the ranged Basic Attack variant entirely.
    const disarmed = unequipItem(rogue, "rangedWeapon");
    expect(disarmed.actions.some((a) => a.id === "strike-ranged")).toBe(false);
    expect(disarmed.rangedWeaponDamageMin).toBeUndefined();
    expect(disarmed.rangedWeaponDamageMax).toBeUndefined();
  });

  it("a Soldier's Basic Attack uses whichever of Strength/Dexterity is higher, regardless of the named variant's own listed ability", () => {
    // Practiced Strike/Steady Shot are both defined with a fixed ability in classes.ts, but a
    // Soldier's own class rule ("strength or dexterity, whichever is higher") must override that
    // -- otherwise a Soldier built for Strength would be silently locked onto whatever ability
    // happened to be listed instead.
    const strSoldier = createCharacter({
      id: "pc-soldier-str",
      name: "Bram",
      raceId: "human",
      classId: "soldier",
      baseAbilityScores: { str: 18, dex: 10, vit: 12, int: 10, wis: 10 },
    });
    expect(strSoldier.equipment.meleeWeapon).toBe("shortsword");
    expect(strSoldier.actions.find((a) => a.id === "strike-melee")?.ability).toBe("str");

    const dexSoldier = createCharacter({
      id: "pc-soldier-dex",
      name: "Vex",
      raceId: "human",
      classId: "soldier",
      baseAbilityScores: { str: 10, dex: 18, vit: 12, int: 10, wis: 10 },
    });
    expect(dexSoldier.actions.find((a) => a.id === "strike-melee")?.ability).toBe("dex");
  });

  it("names and scales every class's Basic Attack variants exactly per the Class Style Sheet", () => {
    // Melee/ranged variant name, ability, and percentOfAbility for every class -- transcribed
    // directly from the sheet's highlighted update (see classes.ts's own BasicAttackVariant entries).
    // percentOfAbility is double the sheet's stated "X% of Attack/Spell Power" (see BasicAttackVariant's
    // own doc comment): e.g. Wild Swing's sheet-stated 20% is stored/expected here as 0.4.
    const expected: Record<
      string,
      { melee: [string, string, number]; ranged: [string, string, number] }
    > = {
      warrior: { melee: ["Wild Swing", "str", 0.4], ranged: ["Wild Shot", "dex", 0.3] },
      soldier: { melee: ["Practiced Strike", "str", 0.3], ranged: ["Steady Shot", "str", 0.3] },
      cleric: { melee: ["Swinging Smite", "str", 0.3], ranged: ["Radiance", "wis", 0.3] },
      ranger: { melee: ["Blade Slash", "str", 0.3], ranged: ["Quick Shot", "dex", 0.4] },
      // Rogue now also uses "highest of STR/DEX" (basicAttackAbilityMode) like Soldier -- str/dex
      // are equal (both 12 + growth) here, and the tie-break picks str for both variants.
      rogue: { melee: ["Subtle Slash", "str", 0.3], ranged: ["Quick Strike", "str", 0.3] },
      druid: { melee: ["Nature's Strike", "str", 0.3], ranged: ["Nature's Blast", "wis", 0.3] },
      wizard: { melee: ["Arcane Smash", "str", 0.3], ranged: ["Arcane Bolt", "int", 0.4] },
    };

    for (const cls of Object.values(CLASSES)) {
      const [meleeName, meleeAbility, meleePercent] = expected[cls.id].melee;
      const [rangedName, rangedAbility, rangedPercent] = expected[cls.id].ranged;
      // Give every class both a melee and a ranged weapon (bought fresh, so equipItem's
      // ownership check passes regardless of that class's own default starting loadout) so
      // both Basic Attack variants are actually generated.
      const fresh = createCharacter({
        id: `pc-basic-${cls.id}`,
        name: "Test",
        raceId: "human",
        classId: cls.id,
        baseAbilityScores: { str: 12, dex: 12, vit: 10, int: 10, wis: 10 },
      });
      const withBothWeapons = equipItem(
        equipItem(buyItem(buyItem(fresh, "ironLongsword"), "huntersShortbow"), "ironLongsword"),
        "huntersShortbow"
      );

      const melee = withBothWeapons.actions.find((a) => a.id === "strike-melee");
      expect(melee?.name, `${cls.id} melee name`).toBe(meleeName);
      // Soldier's and Rogue's own "highest of STR/DEX" mode overrides their variants' listed
      // ability; str/dex are equal (both 12 + growth) here, and the tie-break picks str -- matching
      // the table above.
      expect(melee?.ability, `${cls.id} melee ability`).toBe(meleeAbility);
      expect(melee?.percentOfAbility, `${cls.id} melee percentOfAbility`).toBe(meleePercent);

      const ranged = withBothWeapons.actions.find((a) => a.id === "strike-ranged");
      expect(ranged?.name, `${cls.id} ranged name`).toBe(rangedName);
      expect(ranged?.ability, `${cls.id} ranged ability`).toBe(rangedAbility);
      expect(ranged?.percentOfAbility, `${cls.id} ranged percentOfAbility`).toBe(rangedPercent);
    }
  });

  it("gives every class its own Class Style Sheet passive(s), for the Character screen's Traits panel", () => {
    const named: Record<string, string[]> = {
      warrior: ["Furious", "Reckless"],
      soldier: ["Experience with a Blade"],
      cleric: ["Spellcasting"],
      ranger: ["Sharpshooter"],
      rogue: [], // the sheet itself just says "Placeholder" -- nothing to show, not invented.
      druid: ["Spellcasting"],
      wizard: ["Spellcasting"],
    };
    for (const cls of Object.values(CLASSES)) {
      expect(cls.passives.map((p) => p.name), cls.id).toEqual(named[cls.id]);
      for (const passive of cls.passives) {
        expect(passive.description.length, `${cls.id}'s ${passive.name} description`).toBeGreaterThan(0);
      }
    }
  });

  it("throws when equipping an item the character doesn't own", () => {
    expect(() => equipItem(warrior(), "oakenStaff")).toThrow();
  });
});

describe("gear ability bonuses (Ring of Warding, Lucky Charm)", () => {
  function cleric() {
    return createCharacter({
      id: "pc-gear-1",
      name: "Test Cleric",
      raceId: "human",
      classId: "cleric",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
    });
  }

  it("equipping an accessory with abilityBonuses raises the matching ability score", () => {
    const before = cleric();
    const beforeWis = before.abilityScores.wis;
    const equipped = equipItem(buyItem(before, "ringOfWarding"), "ringOfWarding");
    expect(equipped.abilityScores.wis).toBe(beforeWis + 3); // Ring of Warding: +3 Wisdom
    expect(equipmentAbilityBonuses(equipped.equipment)).toEqual({ wis: 3 });
  });

  it("unequipping removes the bonus again, with no compounding across repeated equip/unequip cycles", () => {
    const base = cleric();
    const equipped = equipItem(buyItem(base, "ringOfWarding"), "ringOfWarding");
    const unequipped = unequipItem(equipped, "accessory");
    expect(unequipped.abilityScores.wis).toBe(base.abilityScores.wis);

    // Equip/unequip twice more -- a bug that re-adds the bonus on top of itself instead of
    // recomputing from scratch would only show up after more than one cycle.
    const reequipped = equipItem(unequipItem(equipItem(unequipped, "ringOfWarding"), "accessory"), "ringOfWarding");
    expect(reequipped.abilityScores.wis).toBe(base.abilityScores.wis + 3);
  });

  it("sums bonuses across multiple equipped items", () => {
    const withRing = equipItem(buyItem(cleric(), "ringOfWarding"), "ringOfWarding");
    // Lucky Charm also wants the accessory slot -- swap in a melee weapon slot bonus item isn't
    // available, so instead verify the sum via equipmentAbilityBonuses directly against a
    // synthetic equipment map (both items "equipped" in different slots isn't possible in this
    // engine today since they're both accessories, but the summing logic itself is slot-agnostic).
    expect(equipmentAbilityBonuses({ accessory: "ringOfWarding", meleeWeapon: "ironLongsword" })).toEqual({ wis: 3 });
    expect(withRing.abilityScores.wis).toBe(cleric().abilityScores.wis + 3);
  });

  it("survives a level-up: gainExperience doesn't drop a previously-applied gear bonus", () => {
    const equipped = equipItem(buyItem(cleric(), "ringOfWarding"), "ringOfWarding");
    expect(equipped.abilityScores.wis).toBe(cleric().abilityScores.wis + 3);

    const { character: leveled } = gainExperience(equipped, xpToNextLevel(1));
    expect(leveled.level).toBe(2);
    // Cleric's own even-level growth (+2 Wis at level 2) stacks on top of the still-present +3 gear bonus.
    expect(leveled.abilityScores.wis).toBe(cleric().abilityScores.wis + 2 + 3);
  });
});

describe("withStartingGearIfMissing", () => {
  it("backfills inventory and equipment on a character saved before those fields existed", () => {
    const legacy = createCharacter({
      id: "pc-6",
      name: "Old Timer",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    // Simulate a row persisted before inventory/equipment were added.
    const { inventory: _inv, equipment: _equip, ...withoutGear } = legacy;
    const stripped = withoutGear as Character;

    const migrated = withStartingGearIfMissing(stripped);

    expect(migrated.equipment.meleeWeapon).toBe("ironLongsword");
    expect(migrated.equipment.armor).toBe("chainShirt");
    expect(migrated.inventory.length).toBeGreaterThan(0);
    expect(migrated.armorRating).toBe(legacy.armorRating);
  });

  it("is a no-op for a character that already has inventory and equipment", () => {
    const character = createCharacter({
      id: "pc-7",
      name: "Fresh",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    expect(withStartingGearIfMissing(character)).toEqual(character);
  });

  it("backfills an empty action bar on a character saved before it existed", () => {
    const legacy = createCharacter({
      id: "pc-8",
      name: "Pre-Bar",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    const { actionBarIds: _bar, ...withoutBar } = legacy;
    const migrated = withStartingGearIfMissing(withoutBar as Character);
    expect(migrated.actionBarIds).toEqual(Array(ACTION_BAR_SLOT_COUNT).fill(null));
  });

  it("backfills gold at 0 (not the creation-time seed) for a character saved before it existed", () => {
    const legacy = createCharacter({
      id: "pc-gold-backfill",
      name: "Penniless",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    const { gold: _gold, ...withoutGold } = legacy;
    expect(withStartingGearIfMissing(withoutGold as Character).gold).toBe(0);
  });

  it("leaves worldMapState untouched, whether present or absent (its default is built client-side)", () => {
    const legacy = createCharacter({
      id: "pc-worldmap",
      name: "Pre-Map",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    expect(withStartingGearIfMissing(legacy).worldMapState).toBeUndefined();

    const withState: Character = {
      ...legacy,
      worldMapState: { day: 7, partyHexKey: "16,25", exploredHexKeys: ["16,25"] },
    };
    expect(withStartingGearIfMissing(withState).worldMapState).toEqual(withState.worldMapState);
  });
});

describe("level-gating (Class Style Sheet reforge)", () => {
  function warriorAtLevel(level: number) {
    return createCharacter({
      id: `pc-lvl-${level}`,
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level,
    });
  }

  it("knows only the Basic Attack, Enrage (lvl 1), and Defend/Flee/End Turn at level 1", () => {
    const character = warriorAtLevel(1);
    expect(character.actions.some((a) => a.id === "enrage")).toBe(true);
    expect(character.actions.some((a) => a.id === "cleave")).toBe(false);
    expect(character.actions.some((a) => a.id === "serrated-blade")).toBe(false);
  });

  it("knows Cleave once at level 2, but not Serrated Blade until level 4", () => {
    const level2 = warriorAtLevel(2);
    expect(level2.actions.some((a) => a.id === "cleave")).toBe(true);
    expect(level2.actions.some((a) => a.id === "serrated-blade")).toBe(false);

    const level4 = warriorAtLevel(4);
    expect(level4.actions.some((a) => a.id === "cleave")).toBe(true);
    expect(level4.actions.some((a) => a.id === "serrated-blade")).toBe(true);
  });
});

describe("ranked abilities (levels 6-30 Warrior build-out)", () => {
  function warriorAtLevel(level: number) {
    return createCharacter({
      id: `pc-rank-${level}`,
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level,
    });
  }

  it("resolves a ranked family down to exactly one entry: the highest rank the level qualifies for", () => {
    expect(warriorAtLevel(2).actions.filter((a) => a.familyId === "cleave")).toHaveLength(1);
    expect(warriorAtLevel(2).actions.find((a) => a.familyId === "cleave")?.id).toBe("cleave");
    expect(warriorAtLevel(12).actions.find((a) => a.familyId === "cleave")?.id).toBe("cleave"); // rank 2 unlocks at 13
    expect(warriorAtLevel(13).actions.find((a) => a.familyId === "cleave")?.id).toBe("cleave-r2");
    expect(warriorAtLevel(20).actions.find((a) => a.familyId === "cleave")?.id).toBe("cleave-r3");
    expect(warriorAtLevel(30).actions.find((a) => a.familyId === "cleave")?.id).toBe("cleave-r4");
  });

  it("has the full 6-ability kit by level 10, with nothing further added through level 30", () => {
    const familyIds = (c: Character) =>
      new Set(c.actions.filter((a) => a.familyId).map((a) => a.familyId));
    const atTen = familyIds(warriorAtLevel(10));
    expect(atTen).toEqual(
      new Set(["enrage", "cleave", "serrated-blade", "furious-strike", "bulwark-stance", "warlords-reckoning"])
    );
    expect(familyIds(warriorAtLevel(30))).toEqual(atTen);
  });

  it("gates Furious Strike and Warlord's Reckoning behind an active Enrage", () => {
    const warrior = { ...toCombatant(warriorAtLevel(10), "party"), resource: 100 };
    const furiousStrike = warrior.actions.find((a) => a.id === "furious-strike")!;
    // Not ready yet even with plenty of Fury -- Enrage's own "fortified" buff isn't up.
    expect(isActionReady(warrior, furiousStrike, 1)).toBe(false);

    const enraged = { ...warrior, statusEffects: [{ defId: "fortified" as const, turnsRemaining: 5 }] };
    expect(isActionReady(enraged, furiousStrike, 1)).toBe(true);
  });

  it("throws when submitting a requires-Enraged ability without the buff active", () => {
    const warrior = { ...toCombatant(warriorAtLevel(10), "party"), resource: 100 };
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(5), forD20(15)]));
    expect(() =>
      submitPlayerAction(state, { actorId: warrior.id, actionId: "furious-strike", targetId: "foe" })
    ).toThrow();
  });
});

describe("ranked abilities (levels 5-30 Soldier build-out)", () => {
  function soldierAtLevel(level: number) {
    return createCharacter({
      id: `pc-soldier-rank-${level}`,
      name: "Garrick",
      raceId: "human",
      classId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level,
    });
  }

  it("resolves a ranked family down to exactly one entry: the highest rank the level qualifies for", () => {
    expect(soldierAtLevel(4).actions.find((a) => a.familyId === "topple")?.id).toBe("topple");
    expect(soldierAtLevel(11).actions.find((a) => a.familyId === "topple")?.id).toBe("topple"); // rank 2 unlocks at 12
    expect(soldierAtLevel(12).actions.find((a) => a.familyId === "topple")?.id).toBe("topple-r2");
    expect(soldierAtLevel(19).actions.find((a) => a.familyId === "topple")?.id).toBe("topple-r3");
    expect(soldierAtLevel(26).actions.find((a) => a.familyId === "topple")?.id).toBe("topple-r4");
  });

  it("has the full 5-ability kit by level 10, with nothing further added through level 30", () => {
    const familyIds = (c: Character) =>
      new Set(c.actions.filter((a) => a.familyId).map((a) => a.familyId));
    const atTen = familyIds(soldierAtLevel(10));
    expect(atTen).toEqual(
      new Set(["defensive-flourish", "topple", "riposte-stance", "counter-strike", "shield-sweep"])
    );
    expect(familyIds(soldierAtLevel(30))).toEqual(atTen);
  });

  it("gates Counter-Strike behind an active Riposte Stance (Parrying)", () => {
    const soldier = { ...toCombatant(soldierAtLevel(10), "party"), resource: 10 };
    const counterStrike = soldier.actions.find((a) => a.id === "counter-strike")!;
    expect(isActionReady(soldier, counterStrike, 1)).toBe(false);

    const parrying = { ...soldier, statusEffects: [{ defId: "parrying" as const, turnsRemaining: 3 }] };
    expect(isActionReady(parrying, counterStrike, 1)).toBe(true);
  });

  it("throws when submitting a requires-Parrying ability without the buff active", () => {
    const soldier = { ...toCombatant(soldierAtLevel(10), "party"), resource: 10 };
    const state = startCombat([soldier], [makeFoe()], sequenceRng([forD20(5), forD20(15)]));
    expect(() =>
      submitPlayerAction(state, { actorId: soldier.id, actionId: "counter-strike", targetId: "foe" })
    ).toThrow();
  });
});

describe("ranked abilities (levels 5-30 Cleric build-out)", () => {
  function clericAtLevel(level: number) {
    return createCharacter({
      id: `pc-cleric-rank-${level}`,
      name: "Sister Elena",
      raceId: "human",
      classId: "cleric",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 15 },
      level,
    });
  }

  it("resolves a ranked family down to exactly one entry: the highest rank the level qualifies for", () => {
    expect(clericAtLevel(4).actions.find((a) => a.familyId === "mend")?.id).toBe("mend");
    expect(clericAtLevel(10).actions.find((a) => a.familyId === "mend")?.id).toBe("mend"); // rank 2 unlocks at 11
    expect(clericAtLevel(11).actions.find((a) => a.familyId === "mend")?.id).toBe("mend-r2");
    expect(clericAtLevel(18).actions.find((a) => a.familyId === "mend")?.id).toBe("mend-r3");
    expect(clericAtLevel(25).actions.find((a) => a.familyId === "mend")?.id).toBe("mend-r4");
  });

  it("has the full 5-ability kit by level 10, with nothing further added through level 30", () => {
    const familyIds = (c: Character) =>
      new Set(c.actions.filter((a) => a.familyId).map((a) => a.familyId));
    const atTen = familyIds(clericAtLevel(10));
    expect(atTen).toEqual(new Set(["mend", "radiant-beam", "ward", "grace", "sanctuary"]));
    expect(familyIds(clericAtLevel(30))).toEqual(atTen);
  });

  it("Ward shields the ally it heals -- the heal-kind applyStatus wiring lands on the same target", () => {
    const cleric = { ...toCombatant(clericAtLevel(10), "party"), resource: 10 };
    const ally = { ...toCombatant(clericAtLevel(10), "party"), id: "ally" };
    // Lopsided initiative so the cleric acts first regardless of Dex growth.
    const state = startCombat([cleric, ally], [makeFoe()], sequenceRng([forD20(20), forD20(1), forD20(10)]));
    const after = submitPlayerAction(
      state,
      { actorId: cleric.id, actionId: "ward", targetId: "ally" },
      sequenceRng([forVariance(1), forVariance(1)]) // one roll for the (flatBase: 0) heal, one for the shield
    );
    const shielded = after.combatants.find((c) => c.id === "ally")!;
    const ward = shielded.statusEffects.find((e) => e.defId === "ward");
    expect(ward).toBeDefined();
    expect(ward!.amount).toBe(Math.round(cleric.abilityScores.wis * 0.6)); // rank 1 power
  });

  it("Sanctuary heals and shields the same ally in one cast", () => {
    const cleric = { ...toCombatant(clericAtLevel(10), "party"), resource: 10 };
    const ally = { ...toCombatant(clericAtLevel(10), "party"), id: "ally", hp: 1 };
    const state = startCombat([cleric, ally], [makeFoe()], sequenceRng([forD20(20), forD20(1), forD20(10)]));
    const after = submitPlayerAction(
      state,
      { actorId: cleric.id, actionId: "sanctuary", targetId: "ally" },
      sequenceRng([forVariance(1), forVariance(1)])
    );
    const target = after.combatants.find((c) => c.id === "ally")!;
    const expectedHeal = 60 + Math.round(cleric.abilityScores.wis * 0.3);
    expect(target.hp).toBe(Math.min(target.maxHp, 1 + expectedHeal));
    const ward = target.statusEffects.find((e) => e.defId === "ward");
    expect(ward).toBeDefined();
    expect(ward!.amount).toBe(Math.round(cleric.abilityScores.wis * 0.8)); // rank 1 power
  });
});

describe("ranked abilities (levels 5-30 Ranger build-out)", () => {
  function rangerAtLevel(level: number) {
    return createCharacter({
      id: `pc-ranger-rank-${level}`,
      name: "Wren",
      raceId: "human",
      classId: "ranger",
      baseAbilityScores: { str: 10, dex: 15, vit: 10, int: 10, wis: 12 },
      level,
    });
  }

  it("resolves a ranked family down to exactly one entry: the highest rank the level qualifies for", () => {
    expect(rangerAtLevel(4).actions.find((a) => a.familyId === "natures-remedy")?.id).toBe("natures-remedy");
    expect(rangerAtLevel(10).actions.find((a) => a.familyId === "natures-remedy")?.id).toBe("natures-remedy"); // rank 2 unlocks at 11
    expect(rangerAtLevel(11).actions.find((a) => a.familyId === "natures-remedy")?.id).toBe("natures-remedy-r2");
    expect(rangerAtLevel(18).actions.find((a) => a.familyId === "natures-remedy")?.id).toBe("natures-remedy-r3");
    expect(rangerAtLevel(25).actions.find((a) => a.familyId === "natures-remedy")?.id).toBe("natures-remedy-r4");
  });

  it("has the full 5-ability kit by level 10, with nothing further added through level 30", () => {
    const familyIds = (c: Character) =>
      new Set(c.actions.filter((a) => a.familyId).map((a) => a.familyId));
    const atTen = familyIds(rangerAtLevel(10));
    expect(atTen).toEqual(
      new Set(["barbed-arrow", "natures-remedy", "pinning-shot", "evasive-maneuvers", "kill-shot"])
    );
    expect(familyIds(rangerAtLevel(30))).toEqual(atTen);
  });

  it("gates Kill Shot behind an active Evasive Maneuvers buff", () => {
    const ranger = { ...toCombatant(rangerAtLevel(10), "party"), resource: 5 };
    const killShot = ranger.actions.find((a) => a.id === "kill-shot")!;
    expect(isActionReady(ranger, killShot, 1)).toBe(false);

    const evasive = { ...ranger, statusEffects: [{ defId: "evasive" as const, turnsRemaining: 3 }] };
    expect(isActionReady(evasive, killShot, 1)).toBe(true);
  });

  it("throws when submitting a requires-Evasive ability without the buff active", () => {
    const ranger = { ...toCombatant(rangerAtLevel(10), "party"), resource: 5 };
    const state = startCombat([ranger], [makeFoe()], sequenceRng([forD20(5), forD20(15)]));
    expect(() =>
      submitPlayerAction(state, { actorId: ranger.id, actionId: "kill-shot", targetId: "foe" })
    ).toThrow();
  });

  it("Pinning Shot roots its target via the existing, previously-unclaimed 'rooted' CC status", () => {
    const ranger = { ...toCombatant(rangerAtLevel(10), "party"), resource: 5 };
    // Tanky foe so the hit doesn't kill it outright -- a dead target never reaches
    // resolveApplyStatus, which would otherwise make this test about overkill, not rooting.
    const state = startCombat([ranger], [makeFoe({ maxHp: 500, hp: 500 })], sequenceRng([forD20(20), forD20(1)]));
    const after = submitPlayerAction(
      state,
      { actorId: ranger.id, actionId: "pinning-shot", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, 0, forVariance(1)])
    );
    const foe = after.combatants.find((c) => c.id === "foe")!;
    expect(foe.statusEffects.some((e) => e.defId === "rooted")).toBe(true);
  });
});

describe("gainExperience / xpToNextLevel", () => {
  // Dwarf, not Human -- Human's "Many Roads" trait adds +10% XP from every
  // source (tested separately below), which would throw off these tests'
  // exact XP-boundary arithmetic.
  function warriorAtLevel(level: number) {
    return createCharacter({
      id: `pc-xp-${level}`,
      name: "Bram",
      raceId: "dwarf",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level,
    });
  }

  it("xpToNextLevel grows quadratically with level", () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(5)).toBe(2500);
    expect(xpToNextLevel(10)).toBe(10000);
  });

  it("advances exactly one level on exactly enough XP, unlocking Cleave and growing HP", () => {
    const character = warriorAtLevel(1);
    const before = character.maxHp;
    const result = gainExperience(character, xpToNextLevel(1));

    // Level 2 also crosses Warrior's first even-level growth threshold, so Vitality itself grows too
    // (+2 at level 2), stacking with the flat HP_PER_LEVEL: 20 (10 HP/point * 2 VIT) + 12 = 32.
    expect(result.levelsGained).toBe(1);
    expect(result.character.level).toBe(2);
    expect(result.character.xp).toBe(0);
    expect(result.character.maxHp).toBe(before + 32);
    expect(result.character.hp).toBe(result.character.maxHp); // was already full, stays full
    expect(result.newlyUnlockedActions.map((a) => a.id)).toEqual(["cleave"]);
    expect(result.character.actions.some((a) => a.id === "cleave")).toBe(true);
  });

  it("heals by the exact HP delta rather than fully, when not already at full HP", () => {
    const character = { ...warriorAtLevel(1), hp: 10 };
    const result = gainExperience(character, xpToNextLevel(1));
    expect(result.character.hp).toBe(42); // 10 + 32 HP delta (see the test above), not a full heal
  });

  it("advances multiple levels from one large XP grant, landing on the exact boundary", () => {
    const character = warriorAtLevel(1);
    const totalForFourLevels = xpToNextLevel(1) + xpToNextLevel(2) + xpToNextLevel(3) + xpToNextLevel(4);
    const result = gainExperience(character, totalForFourLevels);

    expect(result.levelsGained).toBe(4);
    expect(result.character.level).toBe(5);
    expect(result.character.xp).toBe(0);
    expect(result.newlyUnlockedActions.map((a) => a.id).sort()).toEqual(["cleave", "serrated-blade"]);
  });

  it("carries leftover XP past a level-up threshold", () => {
    const character = warriorAtLevel(1);
    const result = gainExperience(character, xpToNextLevel(1) + 37);
    expect(result.character.level).toBe(2);
    expect(result.character.xp).toBe(37);
  });

  it("does not grow a fixed resource pool (Fury) with level", () => {
    const character = { ...warriorAtLevel(1), resource: 0 };
    const result = gainExperience(character, xpToNextLevel(1));
    expect(result.character.resource).toBe(0); // Fury's cap (100) never changes with level, so no delta to add
  });

  it("recomputes proficiency bonus on level-up", () => {
    const character = warriorAtLevel(1);
    expect(character.proficiencyBonus).toBe(2);
    const totalToLevel5 = [1, 2, 3, 4].reduce((sum, lvl) => sum + xpToNextLevel(lvl), 0);
    const result = gainExperience(character, totalToLevel5);
    expect(result.character.level).toBe(5);
    expect(result.character.proficiencyBonus).toBe(3); // 2 + floor((5-1)/4)
  });

  it("stops at the level cap and discards overflow XP", () => {
    const capped = { ...warriorAtLevel(1), level: LEVEL_CAP, xp: 0 };
    const result = gainExperience(capped, 999999);
    expect(result.levelsGained).toBe(0);
    expect(result.character).toBe(capped); // untouched, not even xp incremented
  });

  it("is a no-op for zero or negative XP", () => {
    const character = warriorAtLevel(1);
    expect(gainExperience(character, 0).character).toBe(character);
    expect(gainExperience(character, -5).character).toBe(character);
  });

  it("reports the exact XP amount applied via xpAwarded", () => {
    const character = warriorAtLevel(1);
    expect(gainExperience(character, 40).xpAwarded).toBe(40);
    expect(gainExperience(character, xpToNextLevel(1)).xpAwarded).toBe(xpToNextLevel(1));
  });

  it("grants a Human's Adaptable trait +10% XP from every source, rounded", () => {
    const human = createCharacter({
      id: "pc-xp-human",
      name: "Elowen",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level: 1,
    });

    const small = gainExperience(human, 45);
    expect(small.xpAwarded).toBe(50); // round(45 * 1.1) = 50 -- not enough to level, so it lands straight in xp
    expect(small.character.xp).toBe(50);

    const exact = gainExperience(human, xpToNextLevel(1));
    expect(exact.xpAwarded).toBe(110); // round(100 * 1.1)
    expect(exact.levelsGained).toBe(1);
    expect(exact.character.level).toBe(2);
    expect(exact.character.xp).toBe(10); // 110 - 100 threshold, carried over
  });
});

describe("setCharacterLevel (admin/debug level set)", () => {
  function warriorAtLevel(level: number) {
    return createCharacter({
      id: `pc-set-level-${level}`,
      name: "Bram",
      raceId: "dwarf",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      level,
    });
  }

  it("jumps straight to a higher level, matching a character created at that level", () => {
    const jumped = setCharacterLevel(warriorAtLevel(1), 13);
    const createdDirectly = warriorAtLevel(13);
    expect(jumped.level).toBe(13);
    expect(jumped.abilityScores).toEqual(createdDirectly.abilityScores);
    expect(jumped.maxHp).toBe(createdDirectly.maxHp);
    expect(jumped.actions.map((a) => a.id).sort()).toEqual(createdDirectly.actions.map((a) => a.id).sort());
  });

  it("can move a character backward in level, not just forward", () => {
    const lowered = setCharacterLevel(warriorAtLevel(20), 3);
    expect(lowered.level).toBe(3);
    expect(lowered.actions.some((a) => a.id === "cleave-r2")).toBe(false); // Cleave rank 2 unlocks at 13
  });

  it("tops HP and resource back up to full rather than healing by a delta", () => {
    const wounded = { ...warriorAtLevel(5), hp: 1, resource: 0 };
    const leveled = setCharacterLevel(wounded, 10);
    expect(leveled.hp).toBe(leveled.maxHp);
  });

  it("resets xp to 0 and recomputes proficiency bonus", () => {
    const character = { ...warriorAtLevel(1), xp: 55 };
    const leveled = setCharacterLevel(character, 9);
    expect(leveled.xp).toBe(0);
    expect(leveled.proficiencyBonus).toBe(4); // 2 + floor((9-1)/4)
  });

  it("clamps below 1 and above LEVEL_CAP instead of producing an invalid level", () => {
    expect(setCharacterLevel(warriorAtLevel(5), 0).level).toBe(1);
    expect(setCharacterLevel(warriorAtLevel(5), -10).level).toBe(1);
    expect(setCharacterLevel(warriorAtLevel(5), 9999).level).toBe(LEVEL_CAP);
  });

  it("is a no-op (same reference) when already at the requested level", () => {
    const character = warriorAtLevel(7);
    expect(setCharacterLevel(character, 7)).toBe(character);
  });

  it("preserves an equipped gear bonus through the level change", () => {
    const equipped = equipItem(warriorAtLevel(5), "ironLongsword");
    const leveled = setCharacterLevel(equipped, 15);
    expect(leveled.equipment.meleeWeapon).toBe("ironLongsword");
  });
});

describe("economy: buyItem / sellItem / useConsumable", () => {
  function warrior() {
    return createCharacter({
      id: "pc-economy",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
  }

  it("starts a new character with STARTING_GOLD", () => {
    expect(warrior().gold).toBe(STARTING_GOLD);
  });

  it("buyItem deducts the item's value and adds it to inventory", () => {
    const before = warrior();
    const after = buyItem(before, "minorHealingPotion");
    expect(after.gold).toBe(before.gold - 15);
    expect(after.inventory.find((s) => s.itemId === "minorHealingPotion")?.quantity).toBe(1);
  });

  it("buyItem stacks a second purchase of the same item onto the existing quantity", () => {
    const twice = buyItem(buyItem(warrior(), "minorHealingPotion"), "minorHealingPotion");
    expect(twice.inventory.find((s) => s.itemId === "minorHealingPotion")?.quantity).toBe(2);
  });

  it("buyItem throws when the character can't afford it", () => {
    const poor = { ...warrior(), gold: 0 };
    expect(() => buyItem(poor, "minorHealingPotion")).toThrow();
  });

  it("sellItem refunds half the item's value (SELL_PRICE_RATIO) and removes it from inventory", () => {
    const bought = buyItem(warrior(), "minorHealingPotion");
    const sold = sellItem(bought, "minorHealingPotion");
    expect(sold.gold).toBe(bought.gold + Math.round(15 * SELL_PRICE_RATIO));
    expect(ownsItem(sold, "minorHealingPotion")).toBe(false);
  });

  it("sellItem throws when the item isn't owned", () => {
    expect(() => sellItem(warrior(), "ringOfWarding")).toThrow();
  });

  it("sellItem throws when the item is currently equipped", () => {
    expect(() => sellItem(warrior(), "ironLongsword")).toThrow(); // Warrior's starting melee weapon
  });

  it("useConsumable heals HP and consumes the potion", () => {
    const wounded = { ...buyItem(warrior(), "minorHealingPotion"), hp: 10 };
    const healed = useConsumable(wounded, "minorHealingPotion");
    expect(healed.hp).toBe(90); // 10 + 80, well under maxHp
    expect(ownsItem(healed, "minorHealingPotion")).toBe(false);
  });

  it("useConsumable never heals past maxHp", () => {
    const base = warrior();
    const nearlyFull = { ...buyItem(base, "minorHealingPotion"), hp: base.maxHp - 5 };
    const healed = useConsumable(nearlyFull, "minorHealingPotion");
    expect(healed.hp).toBe(base.maxHp);
  });

  it("useConsumable restores resource, capped at the pool's max", () => {
    const empty = { ...buyItem(warrior(), "minorResourceDraught"), resource: 0 };
    const restored = useConsumable(empty, "minorResourceDraught");
    expect(restored.resource).toBe(40); // Fury's fixed cap is 100, well above the 40 restored

    const almostFull = { ...buyItem(warrior(), "minorResourceDraught"), resource: 90 };
    expect(useConsumable(almostFull, "minorResourceDraught").resource).toBe(100); // capped, not 130
  });

  it("useConsumable throws for a non-consumable item", () => {
    expect(() => useConsumable(warrior(), "ironLongsword")).toThrow();
  });

  it("useConsumable throws when the potion isn't owned", () => {
    expect(() => useConsumable(warrior(), "minorHealingPotion")).toThrow();
  });
});

describe("withClassMigrationIfMissing", () => {
  it("renames a pre-reforge \"mage\" character to \"wizard\" and re-keys its old single weapon slot", () => {
    const modern = createCharacter({
      id: "pc-legacy",
      name: "Old Mage",
      raceId: "human",
      classId: "wizard",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10 },
    });
    // Simulate a row persisted before this reforge: classId "mage", a single `weapon` slot.
    const legacy: Character = {
      ...modern,
      classId: "mage",
      equipment: { weapon: "oakenStaff", armor: modern.equipment.armor },
    } as unknown as Character;

    const migrated = withClassMigrationIfMissing(legacy);

    expect(migrated.classId).toBe("wizard");
    expect(migrated.equipment.meleeWeapon).toBe("oakenStaff");
    expect(migrated.equipment.armor).toBe(modern.equipment.armor);
    expect((migrated.equipment as { weapon?: string }).weapon).toBeUndefined();
  });

  it("renames a pre-reforge \"fighter\" character to \"warrior\"", () => {
    const modern = createCharacter({
      id: "pc-legacy-fighter",
      name: "Old Fighter",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 10, wis: 10 },
    });
    // Simulate a row persisted before even the Mage/Wizard-era rename: classId "fighter".
    const legacy: Character = { ...modern, classId: "fighter" } as unknown as Character;

    const migrated = withClassMigrationIfMissing(legacy);

    expect(migrated.classId).toBe("warrior");
  });

  it("recurses into nested companions, which carry the same pre-reforge shape", () => {
    const companion: Character = {
      ...createCharacter({
        id: "companion-1",
        name: "Magnus",
        raceId: "dwarf",
        classId: "wizard",
        baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10 },
      }),
      classId: "mage",
      equipment: { weapon: "ritualDagger" },
    } as unknown as Character;

    const player = createCharacter({
      id: "pc-legacy-2",
      name: "Player",
      raceId: "human",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    const withLegacyCompanion: Character = { ...player, companions: { magnus: companion } };

    const migrated = withClassMigrationIfMissing(withLegacyCompanion);

    expect(migrated.companions?.magnus.classId).toBe("wizard");
    expect(migrated.companions?.magnus.equipment.meleeWeapon).toBe("ritualDagger");
  });

  it("is a no-op for an already-migrated character", () => {
    const character = createCharacter({
      id: "pc-fresh",
      name: "Fresh",
      raceId: "human",
      classId: "wizard",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10 },
    });
    expect(withClassMigrationIfMissing(character)).toEqual(character);
  });
});

describe("action bar", () => {
  const character = createCharacter({
    id: "pc-9",
    name: "Slotter",
    raceId: "human",
    classId: "warrior",
    baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
  });

  it("starts empty on a freshly created character", () => {
    expect(character.actionBarIds).toEqual(Array(ACTION_BAR_SLOT_COUNT).fill(null));
  });

  it("assigns a skill to a slot", () => {
    const next = assignActionBarSlot(character, 2, "slash");
    expect(next.actionBarIds?.[2]).toBe("slash");
    expect(next.actionBarIds?.filter((id) => id !== null)).toEqual(["slash"]);
  });

  it("moves a skill rather than duplicating it when re-assigned to a different slot", () => {
    const placed = assignActionBarSlot(character, 0, "slash");
    const moved = assignActionBarSlot(placed, 3, "slash");
    expect(moved.actionBarIds?.[0]).toBeNull();
    expect(moved.actionBarIds?.[3]).toBe("slash");
    expect(moved.actionBarIds?.filter((id) => id !== null)).toEqual(["slash"]);
  });

  it("clears a slot", () => {
    const placed = assignActionBarSlot(character, 1, "second-wind");
    const cleared = clearActionBarSlot(placed, 1);
    expect(cleared.actionBarIds).toEqual(Array(ACTION_BAR_SLOT_COUNT).fill(null));
  });
});

describe("computeAbilityScores (Race/Class Style Sheet growth)", () => {
  it("applies only the race's odd-level growth at level 1, with no class growth yet", () => {
    const scores = computeAbilityScores(
      { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
      RACES.dwarf,
      undefined,
      CLASSES.warrior,
      1
    );
    expect(scores).toEqual({ str: 12, dex: 10, vit: 12, int: 10, wis: 10 }); // +2 str/vit from Dwarf's level-1 growth
  });

  it("accumulates both race (odd) and class (even) growth across multiple levels", () => {
    const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10 };
    // Dwarf (str+2,vit+2 per odd level) + Warrior (str+2,vit+2,dex+1 per even level).
    const level4 = computeAbilityScores(base, RACES.dwarf, undefined, CLASSES.warrior, 4);
    // Odd levels <= 4: 1, 3 (2 hits). Even levels <= 4: 2, 4 (2 hits).
    expect(level4.str).toBe(10 + 2 * 2 + 2 * 2); // 18
    expect(level4.vit).toBe(10 + 2 * 2 + 2 * 2); // 18
    expect(level4.dex).toBe(10 + 1 * 2); // 12, Warrior-only growth
  });

  it("a Half-elf's HalfElfChoice substitutes for the race's own (empty) growth table", () => {
    const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10 };
    const choice: HalfElfChoice = { doubleAbility: "dex", singleAbilities: ["str", "wis"], passiveSource: "elf" };
    const scores = computeAbilityScores(base, RACES.halfElf, choice, CLASSES.warrior, 1);
    expect(scores.dex).toBe(12); // +2, the doubled ability
    expect(scores.str).toBe(11); // +1, a singled ability
    expect(scores.wis).toBe(11); // +1, a singled ability
  });
});

describe("Half-elf: player-chosen ability growth and passive", () => {
  it("grows the doubled and singled abilities and resolves the chosen passive", () => {
    const halfElf = createCharacter({
      id: "pc-halfelf",
      name: "Vaenor",
      raceId: "halfElf",
      classId: "wizard",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10 },
      raceChoice: { doubleAbility: "int", singleAbilities: ["dex", "wis"], passiveSource: "elf" },
    });

    expect(halfElf.racePassiveId).toBe("spellcasters");
    // Half-elf's own choice at level 1 (int+2, dex+1, wis+1).
    expect(halfElf.abilityScores.int).toBe(17); // 15 +2
    expect(halfElf.abilityScores.dex).toBe(11); // 10 +1
    expect(halfElf.abilityScores.wis).toBe(11); // 10 +1
  });

  it("resolves the Human-flavored passive when chosen instead", () => {
    const halfElf = createCharacter({
      id: "pc-halfelf-2",
      name: "Bevan",
      raceId: "halfElf",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
      raceChoice: { doubleAbility: "str", singleAbilities: ["vit", "dex"], passiveSource: "human" },
    });
    expect(halfElf.racePassiveId).toBe("adaptable");
  });
});

describe("legacy ability score migration", () => {
  it("recovers a pre-reforge character's true baseAbilityScores from its already-bonused abilityScores", () => {
    const modern = createCharacter({
      id: "pc-legacy-abilities",
      name: "Old Guard",
      raceId: "dwarf",
      classId: "warrior",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10 },
    });
    // Simulate a row persisted before baseAbilityScores existed, with abilityScores computed under the
    // OLD flat one-time model instead of the new per-level growth this character actually has.
    const { baseAbilityScores: _base, ...withoutBase } = modern;
    const legacy = {
      ...withoutBase,
      abilityScores: { str: 21, dex: 14, vit: 19, int: 12, wis: 10 }, // str 15+2+4, dex 14-1+1, vit 13+3+3, int/wis untouched
    } as unknown as Character;

    const migrated = withStartingGearIfMissing(legacy);

    expect(migrated.baseAbilityScores).toEqual({ str: 15, dex: 14, vit: 13, int: 12, wis: 10 });
    // abilityScores is then recomputed fresh from the recovered base under the new growth formula.
    expect(migrated.abilityScores).toEqual(modern.abilityScores);
  });
});
