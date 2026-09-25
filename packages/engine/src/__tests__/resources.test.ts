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
    usedSilverleafStep: false,
    ...overrides,
  };
}

describe("class resource pools", () => {
  it("gives each class the starting value of its resource pool, or none for a class without one", () => {
    expect(makeCharacter("warrior").resource).toBe(0);
    expect(makeCharacter("mage").resource).toBe(20);
    expect(makeCharacter("cleric").resource).toBe(20);
    expect(makeCharacter("druid").resource).toBe(20);
    expect(makeCharacter("rogue").resource).toBeUndefined();
  });

  it("carries a character's resource value into their Combatant", () => {
    const combatant = toCombatant(makeCharacter("mage"), "party");
    expect(combatant.resource).toBe(20);
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
      sequenceRng([forD20(1)]) // a natural 1 -- guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === mage.id)!.resource).toBe(16); // 20 - 4, spent even on a miss
  });

  it("builds Rage when a Warrior uses their basic Strike, hit or miss", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(1)]) // guaranteed miss
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(3); // 0 start + 3 gain
  });

  it("caps a builder resource at its max instead of overflowing", () => {
    const warrior = { ...toCombatant(makeCharacter("warrior"), "party"), resource: 19 };
    const state = startCombat([warrior], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    const after = submitPlayerAction(
      state,
      { actorId: warrior.id, actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(1)]) // guaranteed miss; Strike still grants +3 (would be 22 uncapped)
    );
    expect(after.combatants.find((c) => c.id === warrior.id)!.resource).toBe(20);
  });

  it("builds Rage when a Warrior is struck by an enemy attack", () => {
    const warrior = toCombatant(makeCharacter("warrior"), "party");
    // foe (init 15) goes first and rolls a natural 20 -- an automatic hit and crit,
    // regardless of the warrior's armor class.
    const state = startCombat(
      [warrior],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, forD20(20), forDie(4, 3), forDie(4, 3)])
    );
    expect(state.combatants.find((c) => c.id === warrior.id)!.resource).toBe(3);
  });

  it("regenerates a mana-type resource at the start of the caster's own next turn", () => {
    const mage = toCombatant(makeCharacter("mage"), "party");
    const state = startCombat([mage], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    // Mage casts Firebolt (misses, -4 Arcane); foe's turn auto-resolves (targets
    // mage, rolls a 2, misses); back on the mage, their turn start regens +2 Arcane.
    const after = submitPlayerAction(
      state,
      { actorId: mage.id, actionId: "firebolt", targetId: "foe" },
      sequenceRng([forD20(1), 0, forD20(2)])
    );
    expect(after.combatants.find((c) => c.id === mage.id)!.resource).toBe(18); // 20 - 4 + 2
  });
});
