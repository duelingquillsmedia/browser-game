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
  gainExperience,
  ownsItem,
  sellItem,
  unequipItem,
  useConsumable,
  withClassMigrationIfMissing,
  withStartingGearIfMissing,
  xpToNextLevel,
} from "../character.js";
import type { Character } from "../character.js";
import { RACES, type HalfElfChoice } from "../races.js";
import { CLASSES } from "../classes.js";

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

    // Starting gear: Hunter's Shortbow (no evasion bonus) + Leather Armor (+3)
    expect(character.gearEvasionBonus).toBe(3);

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
        expect(character.gearEvasionBonus).toBeGreaterThan(0);
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

  it("equips an owned accessory and applies its evasion bonus", () => {
    const before = warrior();
    const after = equipItem(before, "luckyCharm");

    expect(after.equipment.accessory).toBe("luckyCharm");
    expect(after.gearEvasionBonus).toBe(before.gearEvasionBonus + 3);
    // Equipping doesn't consume the item from inventory.
    expect(ownsItem(after, "luckyCharm")).toBe(true);
  });

  it("unequips a slot and removes its evasion bonus", () => {
    const equipped = equipItem(warrior(), "luckyCharm");
    const unequipped = unequipItem(equipped, "accessory");

    expect(unequipped.equipment.accessory).toBeUndefined();
    expect(unequipped.gearEvasionBonus).toBe(equipped.gearEvasionBonus - 3);
  });

  it("reflects the equipped weapon's ability on the Basic Attack, and reverts when unequipped", () => {
    const rogue = createCharacter({
      id: "pc-5",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10 },
    });

    // Rogue starts with a Hunter's Shortbow (dex-based) equipped in the ranged slot, no melee weapon.
    const rangedStrike = rogue.actions.find((a) => a.id === "strike-ranged");
    expect(rangedStrike?.ability).toBe("dex");
    expect(rogue.rangedWeaponDamageMin).toBe(7);
    expect(rogue.rangedWeaponDamageMax).toBe(10);
    // The unarmed melee variant is still offered, scaling off Rogue's primary ability (dex).
    const meleeStrike = rogue.actions.find((a) => a.id === "strike-melee");
    expect(meleeStrike?.ability).toBe("dex");
    expect(rogue.meleeWeaponDamageMin).toBeUndefined();

    // Unequipping the ranged weapon removes the ranged Basic Attack variant entirely.
    const disarmed = unequipItem(rogue, "rangedWeapon");
    expect(disarmed.actions.some((a) => a.id === "strike-ranged")).toBe(false);
    expect(disarmed.rangedWeaponDamageMin).toBeUndefined();
    expect(disarmed.rangedWeaponDamageMax).toBeUndefined();
  });

  it("a Soldier's Basic Attack uses whichever of Strength/Dexterity is higher, even when the equipped weapon has its own default scaling ability", () => {
    // The starting shortsword is tagged ability: "dex" (its default for a generic wielder), but a
    // Soldier's own class rule ("strength or dexterity, whichever is higher") must win over that --
    // otherwise a Soldier built for Strength would be silently locked onto Dexterity instead.
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

  it("throws when equipping an item the character doesn't own", () => {
    expect(() => equipItem(warrior(), "oakenStaff")).toThrow();
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
    expect(migrated.gearEvasionBonus).toBe(legacy.gearEvasionBonus);
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
