import { describe, expect, it } from "vitest";
import { abilityModifier, rollDice, rollDie } from "../dice.js";
import { forDie, sequenceRng } from "./testUtils.js";

describe("dice", () => {
  it("rolls a die deterministically for a given RNG value", () => {
    const rng = sequenceRng([forDie(6, 4)]);
    expect(rollDie(6, rng)).toBe(4);
  });

  it("parses dice notation with a flat modifier", () => {
    const rng = sequenceRng([forDie(8, 3), forDie(8, 6)]);
    const result = rollDice("2d8+1", rng);
    expect(result.rolls).toEqual([3, 6]);
    expect(result.modifier).toBe(1);
    expect(result.total).toBe(10);
  });

  it("rejects invalid dice notation", () => {
    expect(() => rollDice("banana")).toThrow();
  });

  it("computes ability modifiers per SRD rounding", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(20)).toBe(5);
  });
});
