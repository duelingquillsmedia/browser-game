import { describe, expect, it } from "vitest";
import {
  MISFIT_SIX,
  MAX_PARTY_SIZE,
  createCompanion,
  ensureCompanionRoster,
  getCompanionTemplate,
  rerollCompanion,
  setActiveParty,
} from "../companions.js";
import { createCharacter } from "../character.js";
import { getClass } from "../classes.js";
import { abilityModifier } from "../dice.js";

function samplePlayer() {
  return createCharacter({
    id: "pc-1",
    name: "Hero",
    raceId: "human",
    classId: "warrior",
    backgroundId: "soldier",
    baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
  });
}

describe("MISFIT_SIX", () => {
  it("has six distinct companions with valid race/class/background ids", () => {
    expect(MISFIT_SIX).toHaveLength(6);
    const ids = new Set(MISFIT_SIX.map((c) => c.id));
    expect(ids.size).toBe(6);
    for (const template of MISFIT_SIX) {
      expect(() => createCompanion(template.id)).not.toThrow();
    }
  });

  it("throws for an unknown companion id", () => {
    expect(() => getCompanionTemplate("nope")).toThrow();
  });
});

describe("createCompanion", () => {
  it("gives the class-default (standard array) stats by default, with the highest score on the primary ability", () => {
    const magnus = createCompanion("magnus");
    const primary = getClass("wizard").primaryAbility;
    expect(magnus.abilityScores[primary]).toBeGreaterThanOrEqual(
      Math.max(...Object.values(magnus.abilityScores))
    );
    expect(magnus.name).toBe("Magnus");
    expect(magnus.raceId).toBe("dwarf");
    expect(magnus.classId).toBe("wizard");
  });

  it("rolls ability scores instead when useRolledStats is set, using the provided RNG deterministically", () => {
    let calls = 0;
    const rng = () => {
      // Deterministic sequence in [0, 1) so 4d6 rolls are reproducible.
      calls += 1;
      return ((calls * 37) % 100) / 100;
    };
    const a = createCompanion("magnar", { useRolledStats: true, rng });
    calls = 0;
    const b = createCompanion("magnar", { useRolledStats: true, rng });
    expect(a.abilityScores).toEqual(b.abilityScores);
    // 4d6-drop-lowest rolls 3-18 before race/class/background bonuses stack on top
    // (Magnar's Dwarf/Warrior/Soldier combination can add up to +7, or -1 on dex),
    // and every score is clamped to a ceiling of 20.
    for (const score of Object.values(a.abilityScores)) {
      expect(score).toBeGreaterThanOrEqual(2);
      expect(score).toBeLessThanOrEqual(20);
    }
  });
});

describe("ensureCompanionRoster", () => {
  it("generates all six companions once, and is a no-op afterward", () => {
    const withRoster = ensureCompanionRoster(samplePlayer());
    expect(Object.keys(withRoster.companions ?? {})).toHaveLength(6);
    for (const template of MISFIT_SIX) {
      expect(withRoster.companions?.[template.id]?.name).toBe(template.name);
    }

    // A second call doesn't regenerate (and thus doesn't re-roll) existing companions.
    const again = ensureCompanionRoster(withRoster);
    expect(again.companions).toBe(withRoster.companions);
  });
});

describe("rerollCompanion", () => {
  it("replaces a single companion's stats without touching the rest of the roster", () => {
    const withRoster = ensureCompanionRoster(samplePlayer());
    const originalOther = withRoster.companions!["magnar"];

    const rerolled = rerollCompanion(withRoster, "magnus", { useRolledStats: true, rng: () => 0.5 });
    expect(rerolled.companions!["magnus"]).not.toBe(withRoster.companions!["magnus"]);
    expect(rerolled.companions!["magnar"]).toBe(originalOther);
  });

  it("throws for an unknown companion id", () => {
    expect(() => rerollCompanion(samplePlayer(), "nope")).toThrow();
  });
});

describe("setActiveParty", () => {
  it("accepts up to MAX_PARTY_SIZE - 1 companion ids", () => {
    const ids = MISFIT_SIX.slice(0, MAX_PARTY_SIZE - 1).map((c) => c.id);
    const player = setActiveParty(samplePlayer(), ids);
    expect(player.activePartyIds).toEqual(ids);
  });

  it("rejects more than MAX_PARTY_SIZE - 1 companions", () => {
    const ids = MISFIT_SIX.map((c) => c.id);
    expect(() => setActiveParty(samplePlayer(), ids)).toThrow();
  });

  it("rejects an unknown companion id", () => {
    expect(() => setActiveParty(samplePlayer(), ["nope"])).toThrow();
  });
});
