import { describe, expect, it } from "vitest";
import {
  ACTION_BAR_SLOT_COUNT,
  assignActionBarSlot,
  clearActionBarSlot,
  createCharacter,
  equipItem,
  ownsItem,
  unequipItem,
  withStartingGearIfMissing,
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
    expect(character.originFeatId).toBe("alert");

    // Rogue: 100 + vit*10 + class health bonus (20) = 100 + 120 + 20 = 240
    expect(character.maxHp).toBe(240);
    expect(character.hp).toBe(character.maxHp);

    // Starting gear: Hunter's Shortbow (no evasion bonus) + Leather Armor (+3)
    expect(character.gearEvasionBonus).toBe(3);

    expect(character.proficiencyBonus).toBe(2);
    expect(character.actions.some((a) => a.id === "sneak-strike")).toBe(true);
    expect(character.actions.some((a) => a.id === "defend")).toBe(true);
    expect(character.actions.some((a) => a.id === "flee")).toBe(true);
  });

  it("grants a Magic Initiate cantrip from the Acolyte background", () => {
    const character = createCharacter({
      id: "pc-1b",
      name: "Rowan",
      raceId: "human",
      classId: "cleric",
      backgroundId: "acolyte",
      baseAbilityScores: { str: 10, dex: 10, vit: 12, int: 10, wis: 15, spi: 8 },
    });

    expect(character.originFeatId).toBe("magicInitiate");
    const cantrip = character.actions.find((a) => a.id === "minor-cantrip");
    expect(cantrip).toBeDefined();
    expect(cantrip?.ability).toBe("wis");
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

    expect(character.equipment.weapon).toBe("ironLongsword");
    expect(character.equipment.armor).toBe("chainShirt");
    expect(character.equipment.accessory).toBeUndefined();
    expect(ownsItem(character, "luckyCharm")).toBe(true);

    // The equipped weapon contributes a flat damage bonus to the shared Strike action.
    expect(character.weaponDamageBonus).toBe(8);
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
    expect(chosenGear.equipment.weapon).toBe("ironLongsword");
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

  it("reflects the equipped weapon's ability on Strike, and reverts when unequipped", () => {
    const rogue = createCharacter({
      id: "pc-5",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      backgroundId: "criminal",
      baseAbilityScores: { str: 10, dex: 15, vit: 12, int: 10, wis: 10, spi: 8 },
    });

    // Rogue starts with a Hunter's Shortbow (dex-based) equipped.
    const equippedStrike = rogue.actions.find((a) => a.id === "strike");
    expect(equippedStrike?.ability).toBe("dex");
    expect(rogue.weaponDamageBonus).toBe(5);

    // Unequipping the weapon falls back to the default fists-and-steel Strike.
    const disarmed = unequipItem(rogue, "weapon");
    const disarmedStrike = disarmed.actions.find((a) => a.id === "strike");
    expect(disarmedStrike?.ability).toBe("str");
    expect(disarmed.weaponDamageBonus).toBe(0);
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

    expect(migrated.equipment.weapon).toBe("ironLongsword");
    expect(migrated.equipment.armor).toBe("chainShirt");
    expect(migrated.inventory.length).toBeGreaterThan(0);
    expect(migrated.gearEvasionBonus).toBe(legacy.gearEvasionBonus);
  });

  it("backfills background and origin feat on a character saved before those fields existed", () => {
    const legacy = createCharacter({
      id: "pc-6b",
      name: "Ancient",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });
    const { backgroundId: _bg, originFeatId: _feat, ...withoutBackground } = legacy;
    const stripped = withoutBackground as Character;

    const migrated = withStartingGearIfMissing(stripped);

    expect(migrated.backgroundId).toBe("acolyte");
    expect(migrated.originFeatId).toBe("magicInitiate");
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
