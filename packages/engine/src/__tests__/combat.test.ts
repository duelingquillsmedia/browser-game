import { describe, expect, it } from "vitest";
import { startCombat, submitPlayerAction, type Combatant } from "../combat.js";
import { BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION } from "../actions.js";
import { forD20, forDie, sequenceRng } from "./testUtils.js";

function makeHero(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "hero",
    name: "Hero",
    side: "party",
    abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    maxHp: 20,
    hp: 20,
    armorClass: 12,
    proficiencyBonus: 2,
    actions: [BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION],
    actionUses: {},
    tempArmorClassBonus: 0,
    initiative: 0,
    fled: false,
    ...overrides,
  };
}

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    maxHp: 7,
    hp: 7,
    armorClass: 10,
    proficiencyBonus: 2,
    actions: [{ id: "claw", name: "Claw", description: "", kind: "attack", target: "enemy", ability: "str", dice: "1d4" }],
    actionUses: {},
    tempArmorClassBonus: 0,
    initiative: 0,
    fled: false,
    ...overrides,
  };
}

describe("combat engine", () => {
  it("orders turns by initiative and ends combat when the last enemy falls", () => {
    // hero rolls 15+2=17, foe rolls 5+0=5 -> hero acts first.
    const rng = sequenceRng([forD20(15), forD20(5)]);
    const state = startCombat([makeHero()], [makeFoe()], rng);

    expect(state.turnOrder).toEqual(["hero", "foe"]);
    expect(state.turnIndex).toBe(0);
    expect(state.status).toBe("active");

    // hero attacks: d20=15 (hit), damage d6=4 -> 4+3(str mod)=7, exactly lethal.
    const afterAttack = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(15), forDie(6, 4)])
    );

    const foe = afterAttack.combatants.find((c) => c.id === "foe")!;
    expect(foe.hp).toBe(0);
    expect(afterAttack.status).toBe("party_won");
    expect(afterAttack.log.some((entry) => entry.message.includes("falls"))).toBe(true);
  });

  it("auto-resolves enemy turns and applies the Defend AC bonus against the next attack", () => {
    // foe rolls 15+0=15, hero rolls 5+2=7 -> foe acts first, auto-resolved inside startCombat
    // (attack roll 15 hits, damage roll 3 -> 3 dmg since foe's str mod is 0).
    // (the 0 is the enemy AI's target-pick roll, irrelevant with a single target)
    let state = startCombat(
      [makeHero()],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, forD20(15), forDie(4, 3)])
    );
    expect(state.turnOrder).toEqual(["foe", "hero"]);
    expect(state.turnIndex).toBe(1); // back to hero after foe's auto turn
    const heroAfterHit = state.combatants.find((c) => c.id === "hero")!;
    expect(heroAfterHit.hp).toBe(17);

    // Hero defends (+2 AC); foe's follow-up attack (11+0+2=13) now misses vs AC 14.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "defend" }, sequenceRng([0, forD20(11)]));
    const heroAfterDefend = state.combatants.find((c) => c.id === "hero")!;
    expect(heroAfterDefend.hp).toBe(17); // unchanged: the follow-up attack missed
    expect(state.round).toBe(2);
    expect(state.turnIndex).toBe(1); // hero's turn again

    // Hero finishes the foe off.
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(15), forDie(6, 4)])
    );
    expect(state.status).toBe("party_won");
  });

  it("lets a lone party member flee, ending the fight as party_fled", () => {
    const state = startCombat([makeHero()], [makeFoe()], sequenceRng([forD20(15), forD20(1)]));
    expect(state.turnIndex).toBe(0); // hero acts first

    const fled = submitPlayerAction(state, { actorId: "hero", actionId: "flee" }, sequenceRng([forD20(15)]));
    const hero = fled.combatants.find((c) => c.id === "hero")!;
    expect(hero.fled).toBe(true);
    expect(fled.status).toBe("party_fled");
  });

  it("rejects an action submitted for a combatant whose turn it isn't", () => {
    const state = startCombat([makeHero()], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));
    expect(state.turnOrder[state.turnIndex]).toBe("hero");

    expect(() =>
      submitPlayerAction(state, { actorId: "foe", actionId: "claw", targetId: "hero" }, sequenceRng([forD20(10)]))
    ).toThrow();
  });
});
