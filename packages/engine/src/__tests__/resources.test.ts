import { describe, expect, it } from "vitest";
import { isActionReady, startCombat, submitPlayerAction, toCombatant, type Combatant } from "../combat.js";
import { createCharacter } from "../character.js";
import { GUARANTEED_FAILURE, GUARANTEED_SUCCESS, forD20, forVariance, sequenceRng } from "./testUtils.js";

/**
 * A level-1 character built from flat 10s, so its final ability scores are
 * just "10 + Soldier background (+1 str/dex/vit) + Human race (+1 all) +
 * this class's own bonuses" -- easy to hand-trace for each class.
 */
function makeCharacter(classId: string, raceId = "human") {
  return createCharacter({
    id: classId,
    name: classId,
    raceId,
    classId,
    backgroundId: "soldier",
    baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
  });
}

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
    maxHp: 20,
    hp: 20,
    evasionBonus: 0,
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
    usedSilverleafStep: false,
    rank: "front",
    statusEffects: [],
    ...overrides,
  };
}

describe("class resource pools", () => {
  it("gives each class the starting value of its resource pool, or none for a class without one", () => {
    // Warrior's Rage is a flat 100-point builder pool that starts empty.
    expect(makeCharacter("warrior").resource).toBe(0);
    // Mage: int16,spi14 -> 80 + 14*8 + 16*4 = 256, full at creation.
    expect(makeCharacter("mage").resource).toBe(256);
    // Cleric: int11,spi14 -> 80 + 14*8 + 11*4 = 236.
    expect(makeCharacter("cleric").resource).toBe(236);
    // Druid: int11,spi13 -> 80 + 13*8 + 11*4 = 228.
    expect(makeCharacter("druid").resource).toBe(228);
    expect(makeCharacter("rogue").resource).toBeUndefined();
  });

  it("carries a character's resource value into their Combatant", () => {
    const combatant = toCombatant(makeCharacter("mage"), "party");
    expect(combatant.resource).toBe(256);
  });

  it("marks an action not-ready when the actor can't pay its resource cost", () => {
    const mage = { ...toCombatant(makeCharacter("mage"), "party"), resource: 2 };
    const firebolt = mage.actions.find((a) => a.id === "firebolt")!;
    expect(isActionReady(mage, firebolt, 1)).toBe(false);
  });

  it("refuses to use an action the actor can't afford", () => {
    const mage = { ...toCombatant(makeCharacter("mage"), "party"), resource: 0 };
    const state = startCombat([mage], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    expect(() =>
      submitPlayerAction(state, { actorId: mage.id, actionId: "firebolt", targetId: "foe" }, sequenceRng([0]))
    ).toThrow();
  });

  it("spends resource on cast regardless of hit or miss", () => {
    const mage = toCombatant(makeCharacter("mage"), "party");
    // A second, unrelated party member goes right after the mage so this check
    // lands before the mage's turn (and its mana regen) comes back around.
    const dummy = toCombatant(makeCharacter("rogue"), "party");
    const state = startCombat([mage, dummy], [makeFoe()], sequenceRng([forD20(15), forD20(10), forD20(1)]));
    const after = submitPlayerAction(
      state,
      { actorId: mage.id, actionId: "firebolt", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === mage.id)!.resource).toBe(252); // 256 - 4, spent even on a miss
  });

  it("builds Rage when a Warrior uses their basic Strike, hit or miss", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(15); // 0 start + 15 gain
  });

  it("caps a builder resource at its max instead of overflowing", () => {
    const warrior = { ...toCombatant(makeCharacter("warrior"), "party"), resource: 90 };
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss; Strike still grants +15 (would be 105 uncapped)
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(100);
  });

  it("builds Rage when a Warrior is struck by an enemy attack", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    // foe (init 15) goes first and lands a guaranteed hit on the warrior.
    const state = startCombat(
      [warrior],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_SUCCESS, 0, forVariance(1)])
    );
    expect(state.combatants.find((c) => c.id === warrior.id)!.resource).toBe(15);
  });

  it("regenerates a mana-type resource at the start of the caster's own next turn", () => {
    // Started well below full so the regen tick is visible instead of just
    // topping the pool back off.
    const mage = { ...toCombatant(makeCharacter("mage"), "party"), resource: 100 };
    const state = startCombat([mage], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    // Mage casts Firebolt (misses, -4 Arcane) but still has AP left, so the
    // turn doesn't auto-advance; End Turn explicitly hands it to the foe.
    const afterFirebolt = submitPlayerAction(
      state,
      { actorId: mage.id, actionId: "firebolt", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE])
    );
    // Foe's turn auto-resolves (targets mage and also misses); back on the
    // mage, their turn start regens mana.
    const after = submitPlayerAction(
      afterFirebolt,
      { actorId: mage.id, actionId: "end-turn" },
      sequenceRng([0, GUARANTEED_FAILURE])
    );
    // 100 - 4 spent, then + round(256 * 0.08) = 20 regen = 116.
    expect(after.combatants.find((c) => c.id === mage.id)!.resource).toBe(116);
  });
});
