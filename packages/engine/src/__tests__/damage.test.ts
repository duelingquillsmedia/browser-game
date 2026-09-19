import { describe, expect, it } from "vitest";
import { applyDamageModifiers, type DamageProfile } from "../damage.js";

function profile(overrides: Partial<DamageProfile> = {}): DamageProfile {
  return { damageResistances: [], damageVulnerabilities: [], damageImmunities: [], ...overrides };
}

describe("applyDamageModifiers", () => {
  it("halves (rounding down) damage of a resisted type", () => {
    expect(applyDamageModifiers(23, "fire", profile({ damageResistances: ["fire"] }))).toBe(11);
  });

  it("doubles damage of a type the target is vulnerable to", () => {
    expect(applyDamageModifiers(11, "fire", profile({ damageVulnerabilities: ["fire"] }))).toBe(22);
  });

  it("zeroes out damage of an immune type, ignoring resistance/vulnerability", () => {
    expect(
      applyDamageModifiers(
        50,
        "poison",
        profile({ damageImmunities: ["poison"], damageResistances: ["poison"], damageVulnerabilities: ["poison"] })
      )
    ).toBe(0);
  });

  it("leaves an unrelated damage type untouched", () => {
    expect(applyDamageModifiers(9, "slashing", profile({ damageResistances: ["fire"] }))).toBe(9);
  });

  it("replicates the SRD's own worked example: -5 flat, then Resistance, then Vulnerability", () => {
    // "a creature has Resistance to all damage and Vulnerability to Fire... it takes 28 Fire
    // damage, [already reduced by an aura to 23,] then halved for Resistance (11), then
    // doubled for Vulnerability (22)."
    const allResistantFireVulnerable = profile({
      damageResistances: ["fire", "slashing", "piercing", "bludgeoning", "cold", "acid", "poison", "lightning", "necrotic", "psychic", "radiant", "force", "thunder"],
      damageVulnerabilities: ["fire"],
    });
    const afterAuraReduction = 28 - 5; // adjustments (the aura) are applied before this function is called
    expect(applyDamageModifiers(afterAuraReduction, "fire", allResistantFireVulnerable)).toBe(22);
  });
});
