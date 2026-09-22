import { describe, expect, it } from "vitest";
import { isActionReady, startCombat, submitPlayerAction, toCombatant, type Combatant } from "../combat.js";
import { createCharacter } from "../character.js";
import { forD20, forDie, sequenceRng } from "./testUtils.js";

/** A level-1 character with flat (mod +0) ability scores, so attack/damage math is easy to hand-trace. */
function makeCharacter(classId: string, raceId = "human") {
  return createCharacter({
    id: classId,
    name: classId,
    raceId,
    classId,
    backgroundId: "soldier",
    baseAbilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
}

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    maxHp: 20,
    hp: 20,
    armorClass: 10,
    proficiencyBonus: 2,
    actions: [
      { id: "claw", name: "Claw", description: "", kind: "attack", target: "enemy", ability: "str", dice: "1d4", damageType: "slashing" },
    ],
    actionUses: {},
    actionCooldowns: {},
    savingThrowProficiencies: [],
    damageResistances: [],
    damageVulnerabilities: [],
    damageImmunities: [],
    tempArmorClassBonus: 0,
    dodging: false,
    initiative: 0,
    fled: false,
    unconscious: false,
    dead: false,
    usedRelentlessEndurance: false,
    ...overrides,
  };
}

describe("class resource pools", () => {
  it("gives each class the starting value of its resource pool, or none for a class without one", () => {
    expect(makeCharacter("fighter").resource).toBe(10);
    expect(makeCharacter("wizard").resource).toBe(20);
    expect(makeCharacter("cleric").resource).toBe(20);
    expect(makeCharacter("druid").resource).toBe(20);
    expect(makeCharacter("paladin").resource).toBe(20);
    expect(makeCharacter("barbarian").resource).toBe(0);
    expect(makeCharacter("rogue").resource).toBeUndefined();
  });

  it("carries a character's resource value into their Combatant", () => {
    const combatant = toCombatant(makeCharacter("wizard"), "party");
    expect(combatant.resource).toBe(20);
  });

  it("marks an action not-ready when the actor can't pay its resource cost", () => {
    const wizard = { ...toCombatant(makeCharacter("wizard"), "party"), resource: 2 };
    const firebolt = wizard.actions.find((a) => a.id === "firebolt")!;
    expect(isActionReady(wizard, firebolt, 1)).toBe(false);
  });

  it("refuses to use an action the actor can't afford", () => {
    const wizard = { ...toCombatant(makeCharacter("wizard"), "party"), resource: 0 };
    const state = startCombat([wizard], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    expect(() =>
      submitPlayerAction(state, { actorId: wizard.id, actionId: "firebolt", targetId: "foe" }, sequenceRng([0]))
    ).toThrow();
  });

  it("spends resource on cast regardless of hit or miss", () => {
    const wizard = toCombatant(makeCharacter("wizard"), "party");
    // A second, unrelated party member goes right after the wizard so this check
    // lands before the wizard's turn (and its mana regen) comes back around.
    const dummy = toCombatant(makeCharacter("rogue"), "party");
    const state = startCombat([wizard, dummy], [makeFoe()], sequenceRng([forD20(15), forD20(10), forD20(1)]));
    const after = submitPlayerAction(
      state,
      { actorId: wizard.id, actionId: "firebolt", targetId: "foe" },
      sequenceRng([forD20(1)]) // a natural 1 -- guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === wizard.id)!.resource).toBe(16); // 20 - 4, spent even on a miss
  });

  it("builds Prowess when a Fighter uses their basic Strike, hit or miss", () => {
    const fighter = toCombatant(makeCharacter("fighter"), "party");
    const state = startCombat([fighter], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: fighter.id, actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(1)]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === fighter.id)!.resource).toBe(14); // 10 start + 4 gain
  });

  it("caps a builder resource at its max instead of overflowing", () => {
    const barbarian = { ...toCombatant(makeCharacter("barbarian"), "party"), resource: 19 };
    const state = startCombat([barbarian], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: barbarian.id, actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(1)]) // guaranteed miss; Strike still grants +3 (would be 22 uncapped)
    );
    expect(after.combatants.find((c) => c.id === barbarian.id)!.resource).toBe(20);
  });

  it("builds Rage when a Barbarian is struck by an enemy attack", () => {
    const barbarian = toCombatant(makeCharacter("barbarian"), "party");
    // foe (init 15) goes first and rolls a natural 20 -- an automatic hit and crit,
    // regardless of the barbarian's armor class.
    const state = startCombat(
      [barbarian],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, forD20(20), forDie(4, 3), forDie(4, 3)])
    );
    expect(state.combatants.find((c) => c.id === barbarian.id)!.resource).toBe(3);
  });

  it("regenerates a mana-type resource at the start of the caster's own next turn", () => {
    const wizard = toCombatant(makeCharacter("wizard"), "party");
    const state = startCombat([wizard], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    // Wizard casts Firebolt (misses, -4 Arcane); foe's turn auto-resolves (targets
    // wizard, rolls a 2, misses); back on the wizard, their turn start regens +2 Arcane.
    const after = submitPlayerAction(
      state,
      { actorId: wizard.id, actionId: "firebolt", targetId: "foe" },
      sequenceRng([forD20(1), 0, forD20(2)])
    );
    expect(after.combatants.find((c) => c.id === wizard.id)!.resource).toBe(18); // 20 - 4 + 2
  });
});
