import { describe, expect, it } from "vitest";
import { isActionReady, startCombat, submitPlayerAction, toCombatant, type Combatant } from "../combat.js";
import { createCharacter } from "../character.js";
import { GUARANTEED_FAILURE, GUARANTEED_SUCCESS, forD20, forVariance, sequenceRng } from "./testUtils.js";

/**
 * A character built from flat 10s, so its final ability scores are just
 * "10 + Human's own growth at every odd level up to `level` (+1 all) +
 * this class's own growth at every even level up to `level`" -- easy to
 * hand-trace for each class. `level` defaults to 4 so every class's
 * lvl-2/lvl-4 abilities (the only ones with a resource cost -- the Basic
 * Attack is always free) are actually present to exercise; see actions.ts's
 * `unlockLevel`.
 */
function makeCharacter(classId: string, raceId = "human", level = 4) {
  return createCharacter({
    id: classId,
    name: classId,
    raceId,
    classId,
    baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
    level,
  });
}

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10 },
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
    rank: "front",
    statusEffects: [],
    ...overrides,
  };
}

describe("class resource pools", () => {
  it("gives each class the starting value of its resource pool", () => {
    // Warrior/Soldier/Cleric/Ranger/Rogue: fixed pools that start empty, built almost entirely by fighting.
    expect(makeCharacter("warrior").resource).toBe(0);
    expect(makeCharacter("soldier").resource).toBe(0);
    expect(makeCharacter("cleric").resource).toBe(0);
    expect(makeCharacter("ranger").resource).toBe(0);
    expect(makeCharacter("rogue").resource).toBe(0);
    // Druid/Wizard: still mana-like -- full at creation, scaling with an ability score and level (default level here is 4).
    // Wizard: base int 10, Human's own growth at odd levels 1/3 (+1 each) = +2,
    // Wizard's own growth at even levels 2/4 (+3 each) = +6 -> int 18 -> 100 + 18*6 + (4-1)*8 = 232.
    expect(makeCharacter("wizard").resource).toBe(232);
    // Druid: base wis 10, Human's own growth at odd levels 1/3 (+1 each) = +2,
    // Druid's own growth at even levels 2/4 (+2 each) = +4 -> wis 16 -> 100 + 16*6 + (4-1)*8 = 220.
    expect(makeCharacter("druid").resource).toBe(220);
  });

  it("carries a character's resource value into their Combatant", () => {
    const combatant = toCombatant(makeCharacter("wizard"), "party");
    expect(combatant.resource).toBe(232);
  });

  it("marks an action not-ready when the actor can't pay its resource cost", () => {
    const wizard = { ...toCombatant(makeCharacter("wizard"), "party"), resource: 2 };
    const shard = wizard.actions.find((a) => a.id === "elemental-shard")!;
    expect(isActionReady(wizard, shard, 1)).toBe(false);
  });

  it("refuses to use an action the actor can't afford", () => {
    const wizard = { ...toCombatant(makeCharacter("wizard"), "party"), resource: 0 };
    const state = startCombat([wizard], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    expect(() =>
      submitPlayerAction(state, { actorId: wizard.id, actionId: "elemental-shard", targetId: "foe" }, sequenceRng([0]))
    ).toThrow();
  });

  it("spends resource on cast regardless of hit or miss", () => {
    const wizard = toCombatant(makeCharacter("wizard"), "party");
    const state = startCombat([wizard], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: wizard.id, actionId: "elemental-shard", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === wizard.id)!.resource).toBe(202); // 232 - 30, spent even on a miss
  });

  it("builds Fury when a Warrior uses their melee Basic Attack, hit or miss", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike-melee", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(15); // 0 start + 15 gain
  });

  it("caps a builder resource at its max instead of overflowing", () => {
    const warrior = { ...toCombatant(makeCharacter("warrior"), "party"), resource: 90 };
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike-melee", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss; Strike still grants +15 (would be 105 uncapped)
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(100);
  });

  it("builds Fury (Furious) when a Warrior is struck by an enemy attack, scaled off damage taken", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    // foe (init 15) goes first and lands a guaranteed critical hit on the warrior.
    const state = startCombat(
      [warrior],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_SUCCESS, 0, forVariance(1)])
    );
    // foe str 10 * power 1 * variance 1.0 = 10, doubled to 15 on the crit -> round(15 * 0.25) = 4 Fury.
    expect(state.combatants.find((c) => c.id === warrior.id)!.resource).toBe(4);
  });
});
