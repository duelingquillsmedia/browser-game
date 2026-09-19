import { describe, expect, it } from "vitest";
import { createCharacter, equipItem, ownsItem, unequipItem, withStartingGearIfMissing } from "../character.js";
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
      baseAbilityScores: { str: 10, dex: 15, con: 12, int: 10, wis: 10, cha: 8 },
    });

    // Criminal background: +1 dex, +1 con, +1 int
    expect(character.abilityScores.dex).toBe(16);
    expect(character.abilityScores.con).toBe(13);
    expect(character.abilityScores.int).toBe(11);
    expect(character.originFeatId).toBe("alert");

    // Rogue hit die 8, con mod = 1 (con 13) -> maxHp = 8 + 1 = 9
    expect(character.maxHp).toBe(9);
    expect(character.hp).toBe(character.maxHp);

    // AC = 10 + dex mod (16 -> +3) + starting Leather Armor (+1)
    expect(character.armorClass).toBe(14);

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
      baseAbilityScores: { str: 10, dex: 10, con: 12, int: 10, wis: 15, cha: 8 },
    });

    expect(character.originFeatId).toBe("magicInitiate");
    const cantrip = character.actions.find((a) => a.id === "minor-cantrip");
    expect(cantrip).toBeDefined();
    expect(cantrip?.ability).toBe("wis");
  });

  it("grants a Dragonborn's Breath Weapon and fire resistance", () => {
    const character = createCharacter({
      id: "pc-1c",
      name: "Vex",
      raceId: "dragonborn",
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });

    expect(character.actions.some((a) => a.id === "breath-weapon")).toBe(true);
    expect(character.damageResistances).toContain("fire");
  });

  it("starts with class-appropriate equipped gear and a spare accessory", () => {
    const character = createCharacter({
      id: "pc-3",
      name: "Bram",
      raceId: "human",
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });

    expect(character.equipment.weapon).toBe("ironLongsword");
    expect(character.equipment.armor).toBe("chainShirt");
    expect(character.equipment.accessory).toBeUndefined();
    expect(ownsItem(character, "luckyCharm")).toBe(true);

    // The shared Strike action reflects the equipped weapon's damage die.
    const strike = character.actions.find((a) => a.id === "strike");
    expect(strike?.dice).toBe("1d8");
  });

  it("throws for an unknown race, class, or background", () => {
    const base = {
      id: "pc-2",
      name: "Nobody",
      baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    };
    expect(() => createCharacter({ ...base, raceId: "nope", classId: "fighter", backgroundId: "acolyte" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "nope", backgroundId: "acolyte" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "fighter", backgroundId: "nope" })).toThrow();
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
            baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          });
          expect(character.maxHp).toBeGreaterThan(0);
          expect(character.armorClass).toBeGreaterThan(0);
          expect(character.actions.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("equipItem / unequipItem", () => {
  function fighter() {
    return createCharacter({
      id: "pc-4",
      name: "Bram",
      raceId: "human",
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });
  }

  it("equips an owned accessory and applies its AC bonus", () => {
    const before = fighter();
    const after = equipItem(before, "luckyCharm");

    expect(after.equipment.accessory).toBe("luckyCharm");
    expect(after.armorClass).toBe(before.armorClass + 1);
    // Equipping doesn't consume the item from inventory.
    expect(ownsItem(after, "luckyCharm")).toBe(true);
  });

  it("unequips a slot and removes its AC bonus", () => {
    const equipped = equipItem(fighter(), "luckyCharm");
    const unequipped = unequipItem(equipped, "accessory");

    expect(unequipped.equipment.accessory).toBeUndefined();
    expect(unequipped.armorClass).toBe(equipped.armorClass - 1);
  });

  it("reflects the equipped weapon's ability on Strike, and reverts when unequipped", () => {
    const rogue = createCharacter({
      id: "pc-5",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      backgroundId: "criminal",
      baseAbilityScores: { str: 10, dex: 15, con: 12, int: 10, wis: 10, cha: 8 },
    });

    // Rogue starts with a Hunter's Shortbow (dex-based) equipped.
    const equippedStrike = rogue.actions.find((a) => a.id === "strike");
    expect(equippedStrike?.ability).toBe("dex");
    expect(equippedStrike?.dice).toBe("1d6");

    // Unequipping the weapon falls back to the default fists-and-steel Strike.
    const disarmed = unequipItem(rogue, "weapon");
    const disarmedStrike = disarmed.actions.find((a) => a.id === "strike");
    expect(disarmedStrike?.ability).toBe("str");
    expect(disarmedStrike?.dice).toBe("1d6");
  });

  it("throws when equipping an item the character doesn't own", () => {
    expect(() => equipItem(fighter(), "oakenStaff")).toThrow();
  });
});

describe("withStartingGearIfMissing", () => {
  it("backfills inventory and equipment on a character saved before those fields existed", () => {
    const legacy = createCharacter({
      id: "pc-6",
      name: "Old Timer",
      raceId: "human",
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });
    // Simulate a row persisted before inventory/equipment were added.
    const { inventory: _inv, equipment: _equip, ...withoutGear } = legacy;
    const stripped = withoutGear as Character;

    const migrated = withStartingGearIfMissing(stripped);

    expect(migrated.equipment.weapon).toBe("ironLongsword");
    expect(migrated.equipment.armor).toBe("chainShirt");
    expect(migrated.inventory.length).toBeGreaterThan(0);
    expect(migrated.armorClass).toBe(legacy.armorClass);
  });

  it("backfills background and origin feat on a character saved before those fields existed", () => {
    const legacy = createCharacter({
      id: "pc-6b",
      name: "Ancient",
      raceId: "human",
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
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
      classId: "fighter",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });
    expect(withStartingGearIfMissing(character)).toEqual(character);
  });
});
