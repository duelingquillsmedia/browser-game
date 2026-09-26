import { describe, expect, it } from "vitest";
import {
  ACTION_BAR_SLOT_COUNT,
  LEVEL_CAP,
  STARTING_GOLD,
  SELL_PRICE_RATIO,
  assignActionBarSlot,
  buyItem,
  clearActionBarSlot,
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
import { RACES } from "../races.js";
import { CLASSES } from "../classes.js";
import { BACKGROUNDS } from "../backgrounds.js";

describe("createCharacter", () => {
  it("applies background ability bonuses and derives HP/AC for a level 1 character", () => {
    const character = createCharacter({
      id: "pc-1",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      backgroundId: "criminal",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10, spi: 8 },
    });

    // Base scores + Criminal background (+1 dex/vit/int) + Elf (dex+2,wis+2,int+1,vit-1) + Rogue (dex+5,int+2,str+1)
    expect(character.abilityScores.str).toBe(11);
    expect(character.abilityScores.dex).toBe(20); // 15 +1 +2 +5 = 23, clamped to 20
    expect(character.abilityScores.vit).toBe(12); // 12 +1 -1 = 12
    expect(character.abilityScores.int).toBe(14); // 10 +1 +1 +2 = 14
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

  it("grants a Dwarf's Stoneblood poison resistance and applies its ability bonuses", () => {
    const character = createCharacter({
      id: "pc-1c",
      name: "Vex",
      raceId: "dwarf",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });

    expect(character.damageResistances).toContain("poison");
    // Soldier background (+1 str/dex/vit), then Dwarf (vit+3,str+2,dex-1), then Warrior (str+4,vit+3,dex+1)
    expect(character.abilityScores.str).toBe(20); // 15 +1 +2 +4 = 22, clamped to 20
    expect(character.abilityScores.vit).toBe(20); // 13 +1 +3 +3 = 20
    expect(character.abilityScores.dex).toBe(15); // 14 +1 -1 +1 = 15
  });

  it("starts with class-appropriate equipped gear and a spare accessory", () => {
    const character = createCharacter({
      id: "pc-3",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });
    expect(defaultGear.equipment.armor).toBe("chainShirt");

    const chosenGear = createCharacter({
      id: "pc-3c",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
          backgroundId: "acolyte",
          baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
          equipmentOptionId: option.id,
        });
        expect(character.equipment).toEqual(option.equipment);
      }
    }
  });

  it("throws for an unknown race, class, or background", () => {
    const base = {
      id: "pc-2",
      name: "Nobody",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
    };
    expect(() => createCharacter({ ...base, raceId: "nope", classId: "warrior", backgroundId: "acolyte" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "nope", backgroundId: "acolyte" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "warrior", backgroundId: "nope" })).toThrow();
  });

  it("creates a sane character for every combination of race, class, and background", () => {
    for (const race of Object.values(RACES)) {
      for (const cls of Object.values(CLASSES)) {
        for (const background of Object.values(BACKGROUNDS)) {
          const character = createCharacter({
            id: `${race.id}-${cls.id}-${background.id}`,
            name: "Test",
            raceId: race.id,
            classId: cls.id,
            backgroundId: background.id,
            baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
          });
          expect(character.maxHp).toBeGreaterThan(0);
          expect(character.gearEvasionBonus).toBeGreaterThan(0);
          expect(character.actions.length).toBeGreaterThan(0);
        }
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "criminal",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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

  it("backfills background on a character saved before it existed", () => {
    const legacy = createCharacter({
      id: "pc-6b",
      name: "Ancient",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });
    const { backgroundId: _bg, ...withoutBackground } = legacy;
    const stripped = withoutBackground as Character;

    const migrated = withStartingGearIfMissing(stripped);

    expect(migrated.backgroundId).toBe("acolyte");
  });

  it("is a no-op for a character that already has inventory and equipment", () => {
    const character = createCharacter({
      id: "pc-7",
      name: "Fresh",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });
    expect(withStartingGearIfMissing(character)).toEqual(character);
  });

  it("backfills an empty action bar on a character saved before it existed", () => {
    const legacy = createCharacter({
      id: "pc-8",
      name: "Pre-Bar",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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

    expect(result.levelsGained).toBe(1);
    expect(result.character.level).toBe(2);
    expect(result.character.xp).toBe(0);
    expect(result.character.maxHp).toBe(before + 12);
    expect(result.character.hp).toBe(result.character.maxHp); // was already full, stays full
    expect(result.newlyUnlockedActions.map((a) => a.id)).toEqual(["cleave"]);
    expect(result.character.actions.some((a) => a.id === "cleave")).toBe(true);
  });

  it("heals by the exact HP delta rather than fully, when not already at full HP", () => {
    const character = { ...warriorAtLevel(1), hp: 10 };
    const result = gainExperience(character, xpToNextLevel(1));
    expect(result.character.hp).toBe(22); // 10 + 12 HP_PER_LEVEL delta, not a full heal
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

  it("grants a Human's Many Roads trait +10% XP from every source, rounded", () => {
    const human = createCharacter({
      id: "pc-xp-human",
      name: "Elowen",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "sage",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10, spi: 10 },
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
        backgroundId: "sage",
        baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10, spi: 10 },
      }),
      classId: "mage",
      equipment: { weapon: "ritualDagger" },
    } as unknown as Character;

    const player = createCharacter({
      id: "pc-legacy-2",
      name: "Player",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
      backgroundId: "sage",
      baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 15, wis: 10, spi: 10 },
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
    backgroundId: "soldier",
    baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
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
