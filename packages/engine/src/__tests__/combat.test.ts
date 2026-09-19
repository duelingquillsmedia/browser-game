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
    actions: [
      {
        id: "claw",
        name: "Claw",
        description: "",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "1d4",
        damageType: "slashing",
      },
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

  it("auto-resolves enemy turns and Defend imposes Disadvantage on the next attack against the defender", () => {
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

    // Hero defends (Dodge). Foe's follow-up attack rolls with Disadvantage: (13, 5) keeps
    // the lower 5, for a total of 5+0+2=7 against AC 12 -- a miss, though the 13 alone
    // (13+2=15) would have hit, proving Disadvantage is what causes it to whiff.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "defend" }, sequenceRng([0, forD20(13), forD20(5)]));
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

  it("adds the saving-throw proficiency bonus to Flee only when the actor is proficient in Dexterity saves", () => {
    // Roll 6 + dex mod 2 = 8, below the DC 10 -- fails without proficiency...
    const state = startCombat([makeHero()], [makeFoe()], sequenceRng([forD20(15), forD20(1)]));
    const failed = submitPlayerAction(state, { actorId: "hero", actionId: "flee" }, sequenceRng([forD20(6)]));
    expect(failed.combatants.find((c) => c.id === "hero")!.fled).toBe(false);

    // ...but 6 + 2 + a +2 proficiency bonus = 10 succeeds for a class (like Rogue) proficient in Dex saves.
    const proficientState = startCombat(
      [makeHero({ savingThrowProficiencies: ["dex"] })],
      [makeFoe()],
      sequenceRng([forD20(15), forD20(1)])
    );
    const fled = submitPlayerAction(proficientState, { actorId: "hero", actionId: "flee" }, sequenceRng([forD20(6)]));
    expect(fled.combatants.find((c) => c.id === "hero")!.fled).toBe(true);
  });

  it("falls unconscious at 0 HP, which alone ends the fight in defeat", () => {
    // foe (init 15) acts before hero (init 7) and its attack (roll 12 -> hits AC 12) deals
    // exactly 4 damage to hero's 4 HP -- 0 overkill, so hero falls unconscious rather than dying.
    const state = startCombat(
      [makeHero({ maxHp: 4, hp: 4 })],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, forD20(12), forDie(4, 4)])
    );

    const hero = state.combatants.find((c) => c.id === "hero")!;
    expect(state.log.some((entry) => entry.message.includes("falls unconscious"))).toBe(true);
    expect(hero.unconscious).toBe(true);
    expect(hero.dead).toBe(false);
    expect(state.status).toBe("enemies_won"); // no death saves -- Unconscious alone ends the fight
  });

  it("kills a party member outright instead of leaving them merely unconscious, on a massive overkill hit", () => {
    const massiveHit = {
      id: "smash",
      name: "Smash",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      dice: "1d20",
      damageType: "bludgeoning" as const,
    };
    const state = startCombat(
      [makeHero({ maxHp: 4, hp: 4 })],
      [makeFoe({ actions: [massiveHit] })],
      sequenceRng([forD20(5), forD20(15), 0, forD20(12), forD20(20)])
    );

    const hero = state.combatants.find((c) => c.id === "hero")!;
    // 20 damage (str mod 0) against 4 HP -- overkill (16) >= maxHp (4) -> instant death.
    expect(hero.dead).toBe(true);
    expect(hero.unconscious).toBe(false);
    expect(state.status).toBe("enemies_won");
    expect(state.log.some((entry) => entry.message.includes("dies instantly"))).toBe(true);
  });

  it("resolves an AoE save-for-half action (Fireball) against every enemy off a single damage roll", () => {
    const fireball = {
      id: "fireball",
      name: "Fireball",
      description: "",
      kind: "save" as const,
      target: "enemies" as const,
      ability: "int" as const,
      saveAbility: "dex" as const,
      dice: "3d6",
      damageType: "fire" as const,
      usesPerCombat: 1,
    };
    const caster = makeHero({
      abilityScores: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
      actions: [fireball],
      actionUses: { fireball: 1 },
    });
    // DC = 8 + proficiency(2) + int mod(3) = 13.
    const failer = makeFoe({ id: "foe1", name: "Foe1", maxHp: 10, hp: 10 });
    const succeeder = makeFoe({ id: "foe2", name: "Foe2", maxHp: 6, hp: 6 });

    const state = startCombat([caster], [failer, succeeder], sequenceRng([forD20(20), forD20(5), forD20(6)]));
    expect(state.turnOrder[0]).toBe("hero"); // highest initiative, acts first

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "fireball" },
      sequenceRng([forDie(6, 4), forDie(6, 4), forDie(6, 4), forD20(5), forD20(15)])
    );

    // Base damage 4+4+4=12, rolled once. Foe1 (roll 5, DC 13) fails -> takes 12, dies (10 HP).
    // Foe2 (roll 15, DC 13) succeeds -> takes half, 6 -> also dies (6 HP), ending the fight.
    expect(after.status).toBe("party_won");
    expect(after.combatants.find((c) => c.id === "foe1")!.hp).toBe(0);
    expect(after.combatants.find((c) => c.id === "foe2")!.hp).toBe(0);
  });

  it("adds the Alert origin feat's proficiency bonus to initiative", () => {
    const state = startCombat(
      [makeHero({ originFeatId: "alert", proficiencyBonus: 3 })],
      [makeFoe()],
      sequenceRng([forD20(10), forD20(5)])
    );
    const hero = state.combatants.find((c) => c.id === "hero")!;
    // roll 10 + dex mod (14 -> +2) + Alert's proficiency bonus (3) = 15
    expect(hero.initiative).toBe(15);
  });

  it("rerolls a natural 1 attack roll for a Halfling (Lucky trait)", () => {
    const state = startCombat([makeHero({ raceId: "halfling" })], [makeFoe()], sequenceRng([forD20(15), forD20(5)]));

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(1), forD20(15), forDie(6, 4)])
    );

    expect(after.log.some((entry) => entry.message.includes("Lucky"))).toBe(true);
    // reroll totals 15+3(str mod)+2(prof)=20 vs AC 10 -- hits for 4+3=7, exactly lethal.
    expect(after.combatants.find((c) => c.id === "foe")!.hp).toBe(0);
  });

  it("rolls damage dice twice and keeps the higher for Savage Attacker, on a non-crit hit", () => {
    const state = startCombat(
      [makeHero({ originFeatId: "savageAttacker" })],
      [makeFoe({ maxHp: 20, hp: 20 })],
      sequenceRng([forD20(15), forD20(5)])
    );

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(15), forDie(6, 2), forDie(6, 5)])
    );

    // Higher of the two damage rolls (5) + str mod (3) = 8.
    expect(after.combatants.find((c) => c.id === "foe")!.hp).toBe(20 - 8);
  });

  it("drops an Orc to 1 HP instead of unconscious the first time they'd fall (Relentless Endurance)", () => {
    const state = startCombat(
      [makeHero({ raceId: "orc", maxHp: 4, hp: 4 })],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, forD20(12), forDie(4, 4)])
    );

    const hero = state.combatants.find((c) => c.id === "hero")!;
    expect(hero.hp).toBe(1);
    expect(hero.unconscious).toBe(false);
    expect(hero.usedRelentlessEndurance).toBe(true);
    expect(state.log.some((entry) => entry.message.includes("Relentless Endurance"))).toBe(true);
  });

  it("blocks a cooldown action from reuse until enough rounds have passed, then allows it again", () => {
    const bigSwing = {
      id: "big-swing",
      name: "Big Swing",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      dice: "1d4",
      damageType: "slashing" as const,
      cooldown: 2,
    };
    const hero = makeHero({ actions: [bigSwing, BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION] });
    const foe = makeFoe({ maxHp: 50, hp: 50 }); // high HP so it survives the whole exchange

    // Round 1: hero (init 15) acts before foe (init 5).
    let state = startCombat([hero], [foe], sequenceRng([forD20(15), forD20(5)]));
    expect(state.turnOrder).toEqual(["hero", "foe"]);

    // Hero uses Big Swing: attack roll 15 hits, damage roll 3. Foe's follow-up attack (roll 5) misses.
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "big-swing", targetId: "foe" },
      sequenceRng([forD20(15), forDie(4, 3), 0, forD20(5)])
    );
    expect(state.round).toBe(2);
    expect(state.combatants.find((c) => c.id === "hero")!.actionCooldowns["big-swing"]).toBe(3);

    // Round 2: still on cooldown (ready at round 3) -- reusing it throws.
    expect(() =>
      submitPlayerAction(state, { actorId: "hero", actionId: "big-swing", targetId: "foe" }, sequenceRng([0]))
    ).toThrow();

    // Hero falls back to Strike instead, advancing to round 3 (attack roll 15 hits, damage 3; foe misses back).
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([forD20(15), forDie(6, 3), 0, forD20(5)])
    );
    expect(state.round).toBe(3);

    // Round 3: cooldown has elapsed (3 >= 3) -- Big Swing is usable again.
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "big-swing", targetId: "foe" },
      sequenceRng([forD20(15), forDie(4, 2), 0, forD20(5)])
    );
    expect(state.log.some((entry) => entry.message.includes("Big Swing"))).toBe(true);
    expect(state.combatants.find((c) => c.id === "hero")!.actionCooldowns["big-swing"]).toBe(5);
  });

  it("randomly picks among an enemy's available attacks instead of always the first one", () => {
    const jab = {
      id: "jab",
      name: "Jab",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      dice: "1d4",
      damageType: "piercing" as const,
    };
    const stab = {
      id: "stab",
      name: "Stab",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      dice: "1d4",
      damageType: "piercing" as const,
    };
    const foe = makeFoe({ actions: [jab, stab] });

    // foe (init 15) acts first; a selection roll of 0.75 against 2 choices picks index 1 (Stab).
    const state = startCombat(
      [makeHero()],
      [foe],
      sequenceRng([forD20(5), forD20(15), 0.75, 0, forD20(5)])
    );

    expect(state.log.some((entry) => entry.message.includes("Stab"))).toBe(true);
    expect(state.log.some((entry) => entry.message.includes("Jab"))).toBe(false);
  });
});
