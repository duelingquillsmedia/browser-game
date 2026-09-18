import { describe, expect, it } from "vitest";
import { createCharacter } from "../character.js";

describe("createCharacter", () => {
  it("applies race ability bonuses and derives HP/AC for a level 1 character", () => {
    const character = createCharacter({
      id: "pc-1",
      name: "Kessa",
      raceId: "elf",
      classId: "rogue",
      baseAbilityScores: { str: 10, dex: 15, con: 12, int: 10, wis: 10, cha: 8 },
    });

    // Elf: +2 dex, +1 int
    expect(character.abilityScores.dex).toBe(17);
    expect(character.abilityScores.int).toBe(11);

    // Rogue hit die 8, con mod = 1 (con 12) -> maxHp = 8 + 1 = 9
    expect(character.maxHp).toBe(9);
    expect(character.hp).toBe(character.maxHp);

    // AC = 10 + dex mod (17 -> +3)
    expect(character.armorClass).toBe(13);

    expect(character.proficiencyBonus).toBe(2);
    expect(character.actions.some((a) => a.id === "sneak-strike")).toBe(true);
    expect(character.actions.some((a) => a.id === "defend")).toBe(true);
    expect(character.actions.some((a) => a.id === "flee")).toBe(true);
  });

  it("throws for an unknown race or class", () => {
    const base = {
      id: "pc-2",
      name: "Nobody",
      baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    };
    expect(() => createCharacter({ ...base, raceId: "nope", classId: "fighter" })).toThrow();
    expect(() => createCharacter({ ...base, raceId: "human", classId: "nope" })).toThrow();
  });
});
