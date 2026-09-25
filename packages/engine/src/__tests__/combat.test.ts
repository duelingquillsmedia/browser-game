import { describe, expect, it } from "vitest";
import { currentCombatant, startCombat, submitPlayerAction, toCombatant, type Combatant } from "../combat.js";
import { BASIC_ATTACK, DEFEND_ACTION, END_TURN_ACTION, FLEE_ACTION, type CombatActionDef } from "../actions.js";
import { createCharacter } from "../character.js";
import {
  GUARANTEED_FAILURE,
  GUARANTEED_SUCCESS,
  forD20,
  forPercentRoll,
  forVariance,
  sequenceRng,
} from "./testUtils.js";

function makeHero(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "hero",
    name: "Hero",
    side: "party",
    abilityScores: { str: 16, dex: 14, vit: 14, int: 10, wis: 10, spi: 10 },
    maxHp: 20,
    hp: 20,
    evasionBonus: 0,
    proficiencyBonus: 2,
    actions: [BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION, END_TURN_ACTION],
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
    // A 1-AP budget means any default-cost (1 AP) action immediately
    // exhausts it, reproducing "exactly one action per turn" for every
    // existing test below without touching their bodies. Tests exercising
    // the real multi-action AP economy override this explicitly.
    ap: 1,
    apMax: 1,
    rank: "front",
    statusEffects: [],
    ...overrides,
  };
}

function makeFoe(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "foe",
    name: "Foe",
    side: "enemy",
    abilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
    maxHp: 7,
    hp: 7,
    evasionBonus: 0,
    actions: [
      {
        id: "claw",
        name: "Claw",
        description: "",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1,
        damageType: "slashing",
      },
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

describe("combat engine", () => {
  it("orders turns by initiative and ends combat when the last enemy falls", () => {
    // hero rolls 15+2=17, foe rolls 5+0=5 -> hero acts first.
    const rng = sequenceRng([forD20(15), forD20(5)]);
    const state = startCombat([makeHero()], [makeFoe({ maxHp: 16, hp: 16 })], rng);

    expect(state.turnOrder).toEqual(["hero", "foe"]);
    expect(state.turnIndex).toBe(0);
    expect(state.status).toBe("active");

    // hero attacks: guaranteed non-crit hit, damage = str(16) * power(1) * variance(1.0) = 16, exactly lethal.
    const afterAttack = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
    );

    const foe = afterAttack.combatants.find((c) => c.id === "foe")!;
    expect(foe.hp).toBe(0);
    expect(afterAttack.status).toBe("party_won");
    expect(afterAttack.log.some((entry) => entry.message.includes("falls"))).toBe(true);
  });

  it("auto-resolves enemy turns and Defend raises evasion against the next attack", () => {
    // foe rolls 15+0=15, hero rolls 5+2=7 -> foe acts first, auto-resolved inside startCombat
    // with a guaranteed non-crit hit for a clean 10 damage (str 10 * power 1 * variance 1.0).
    let state = startCombat(
      [makeHero()],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
    );
    expect(state.turnOrder).toEqual(["foe", "hero"]);
    expect(state.turnIndex).toBe(1); // back to hero after foe's auto turn
    const heroAfterHit = state.combatants.find((c) => c.id === "hero")!;
    expect(heroAfterHit.hp).toBe(10);

    // Hero defends, gaining +25 evasion until their next turn. Foe's hit chance against
    // hero is normally 90 - 21 (dex-based evasion) = 69%, so a roll of 50 would connect --
    // but Defend drops it to 90 - 46 = 44%, so that same roll of 50 now misses.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "defend" }, sequenceRng([0, forPercentRoll(50)]));
    const heroAfterDefend = state.combatants.find((c) => c.id === "hero")!;
    expect(heroAfterDefend.hp).toBe(10); // unchanged: the follow-up attack missed
    expect(state.round).toBe(2);
    expect(state.turnIndex).toBe(1); // hero's turn again

    // Hero finishes the foe off (foe's 7 HP is well within a guaranteed hit's 16 damage).
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
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
    // foe (init 15) acts before hero (init 7) and lands a guaranteed non-crit hit for exactly
    // 10 damage (str 10 * power 1 * variance 1.0) against hero's 10 HP -- 0 overkill, so hero
    // falls unconscious rather than dying.
    const state = startCombat(
      [makeHero({ maxHp: 10, hp: 10 })],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
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
      power: 5,
      damageType: "bludgeoning" as const,
    };
    const state = startCombat(
      [makeHero({ maxHp: 10, hp: 10 })],
      [makeFoe({ actions: [massiveHit] })],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
    );

    const hero = state.combatants.find((c) => c.id === "hero")!;
    // 50 damage (str 10 * power 5 * variance 1.0) against 10 HP -- overkill (40) >= maxHp (10) -> instant death.
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
      power: 1,
      damageType: "fire" as const,
      usesPerCombat: 1,
    };
    const caster = makeHero({
      abilityScores: { str: 10, dex: 10, vit: 10, int: 16, wis: 10, spi: 10 },
      actions: [fireball],
      actionUses: { fireball: 1 },
    });
    // Save chance = 50 + (target dex 10 - caster int 16) * 2 = 38% for both foes.
    const failer = makeFoe({ id: "foe1", name: "Foe1", maxHp: 16, hp: 16 });
    const succeeder = makeFoe({ id: "foe2", name: "Foe2", maxHp: 8, hp: 8 });

    const state = startCombat([caster], [failer, succeeder], sequenceRng([forD20(20), forD20(5), forD20(6)]));
    expect(state.turnOrder[0]).toBe("hero"); // highest initiative, acts first

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "fireball" },
      sequenceRng([forVariance(1), forPercentRoll(50), forPercentRoll(20)])
    );

    // Base damage = int(16) * power(1) * variance(1.0) = 16, rolled once.
    // Foe1 (roll 50, needs < 38% to succeed) fails its save -> takes 16, dies (16 HP).
    // Foe2 (roll 20 < 38%) succeeds -> takes half, 8 -> also dies (8 HP), ending the fight.
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

  it("discounts an Elf's first resource-costing action each combat by 1 (Silverleaf Step)", () => {
    const firebolt = {
      id: "firebolt",
      name: "Firebolt",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "int" as const,
      power: 1,
      damageType: "fire" as const,
      resourceCost: 4,
    };
    const state = startCombat(
      [makeHero({ raceId: "elf", actions: [firebolt], resource: 4 })],
      [makeFoe()],
      sequenceRng([forD20(15), forD20(5)])
    );

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "firebolt", targetId: "foe" },
      sequenceRng([GUARANTEED_FAILURE]) // guaranteed miss -- only the resource spend matters here
    );

    expect(after.log.some((entry) => entry.message.includes("Silverleaf Step"))).toBe(true);
    // 4 resource, discounted to a cost of 3 -- 1 left over instead of running out.
    expect(after.combatants.find((c) => c.id === "hero")!.resource).toBe(1);
  });

  it("rolls damage twice and keeps the higher variance for Savage Attacker, on a non-crit hit", () => {
    const state = startCombat(
      [makeHero({ originFeatId: "savageAttacker" })],
      [makeFoe({ maxHp: 20, hp: 20 })],
      sequenceRng([forD20(15), forD20(5)])
    );

    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(0.9), forVariance(1.1)])
    );

    // Keeps the higher of the two variance rolls: str(16) * power(1) * 1.1 = 17.6 -> 18.
    expect(after.combatants.find((c) => c.id === "foe")!.hp).toBe(20 - 18);
  });

  it("blocks a cooldown action from reuse until enough rounds have passed, then allows it again", () => {
    const bigSwing = {
      id: "big-swing",
      name: "Big Swing",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      power: 1.5,
      damageType: "slashing" as const,
      cooldown: 2,
    };
    const hero = makeHero({ actions: [bigSwing, BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION] });
    const foe = makeFoe({ maxHp: 50, hp: 50 }); // high HP so it survives the whole exchange

    // Round 1: hero (init 15) acts before foe (init 5).
    let state = startCombat([hero], [foe], sequenceRng([forD20(15), forD20(5)]));
    expect(state.turnOrder).toEqual(["hero", "foe"]);

    // Hero uses Big Swing: guaranteed hit. Foe's follow-up attack misses.
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "big-swing", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1), 0, GUARANTEED_FAILURE])
    );
    expect(state.round).toBe(2);
    expect(state.combatants.find((c) => c.id === "hero")!.actionCooldowns["big-swing"]).toBe(3);

    // Round 2: still on cooldown (ready at round 3) -- reusing it throws.
    expect(() =>
      submitPlayerAction(state, { actorId: "hero", actionId: "big-swing", targetId: "foe" }, sequenceRng([0]))
    ).toThrow();

    // Hero falls back to Strike instead, advancing to round 3 (guaranteed hit; foe misses back).
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "strike", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1), 0, GUARANTEED_FAILURE])
    );
    expect(state.round).toBe(3);

    // Round 3: cooldown has elapsed (3 >= 3) -- Big Swing is usable again.
    state = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "big-swing", targetId: "foe" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1), 0, GUARANTEED_FAILURE])
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
      power: 1,
      damageType: "piercing" as const,
    };
    const stab = {
      id: "stab",
      name: "Stab",
      description: "",
      kind: "attack" as const,
      target: "enemy" as const,
      ability: "str" as const,
      power: 1,
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

describe("toCombatant", () => {
  function makeWarrior(hp?: number) {
    const character = createCharacter({
      id: "pc-1",
      name: "Bram",
      raceId: "human",
      classId: "warrior",
      backgroundId: "soldier",
      baseAbilityScores: { str: 15, dex: 14, vit: 13, int: 12, wis: 10, spi: 8 },
    });
    return hp === undefined ? character : { ...character, hp };
  }

  it("starts a party member Unconscious if they're already at 0 HP", () => {
    const combatant = toCombatant(makeWarrior(0), "party");
    expect(combatant.unconscious).toBe(true);
  });

  it("starts a party member up normally when they have HP left", () => {
    const combatant = toCombatant(makeWarrior(), "party");
    expect(combatant.unconscious).toBe(false);
  });

  it("never marks a monster Unconscious, even at 0 HP", () => {
    const combatant = toCombatant(makeWarrior(0), "enemy");
    expect(combatant.unconscious).toBe(false);
  });
});

describe("multi-member party", () => {
  it("skips straight past a downed party member who wins initiative, instead of stalling on their turn", () => {
    const up = makeHero({ id: "up", name: "Up" });
    const down = makeHero({ id: "down", name: "Down", hp: 0, unconscious: true });
    // down (init 17) would go first, but can't act; foe (init 10) auto-resolves
    // (targets up, and misses); up (init 7) is left waiting for input.
    const state = startCombat(
      [up, down],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), forD20(10), 0, GUARANTEED_FAILURE])
    );
    expect(state.turnOrder).toEqual(["down", "foe", "up"]);
    expect(state.turnIndex).toBe(2);
    expect(state.status).toBe("active");
    expect(state.combatants.find((c) => c.id === "up")!.hp).toBe(20);
  });

  it("ends in defeat only once every party member is down, not just one", () => {
    const down = makeHero({ id: "down", name: "Down", hp: 0, unconscious: true });
    const state = startCombat([down], [makeFoe()], sequenceRng([forD20(5), forD20(15)]));
    expect(state.status).toBe("enemies_won");
  });

  it("lets an enemy target and auto-crit an Unconscious party member even when others are still up", () => {
    const up = makeHero({ id: "up", name: "Up" });
    const down = makeHero({ id: "down", name: "Down", hp: 0, unconscious: true });
    const state = startCombat(
      [up, down],
      [makeFoe()],
      sequenceRng([
        forD20(5), // up init
        forD20(5), // down init
        forD20(15), // foe init -> foe goes first
        0.75, // enemy AI target pick -> index 1 of [up, down] = down
        forVariance(1), // any hit against an Unconscious target auto-crits, skipping the hit/crit rolls
      ])
    );
    const hit = state.log.find((entry) => entry.targetId === "down" && entry.kind === "hit");
    expect(hit?.crit).toBe(true);
    expect(state.status).toBe("active");
    expect(state.combatants.find((c) => c.id === "up")!.hp).toBe(20);
  });
});

describe("AP economy", () => {
  it("holds the turn across multiple actions until AP runs out or End Turn is submitted", () => {
    let state = startCombat(
      [makeHero({ ap: 4, apMax: 4 })],
      [makeFoe({ maxHp: 100, hp: 100 })],
      sequenceRng([forD20(15), forD20(5)])
    );
    expect(currentCombatant(state).id).toBe("hero");

    // First Strike (1 AP, default cost): still the hero's turn.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "strike", targetId: "foe" }, sequenceRng([GUARANTEED_FAILURE]));
    expect(currentCombatant(state).id).toBe("hero");
    expect(state.combatants.find((c) => c.id === "hero")!.ap).toBe(3);

    // Second Strike: still the hero's turn, AP keeps draining.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "strike", targetId: "foe" }, sequenceRng([GUARANTEED_FAILURE]));
    expect(currentCombatant(state).id).toBe("hero");
    expect(state.combatants.find((c) => c.id === "hero")!.ap).toBe(2);

    // End Turn hands control to the foe (target pick + a guaranteed miss), then
    // back to the hero next round with AP refilled to max.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "end-turn" }, sequenceRng([0, GUARANTEED_FAILURE]));
    expect(currentCombatant(state).id).toBe("hero");
    expect(state.combatants.find((c) => c.id === "hero")!.ap).toBe(4);
  });

  it("auto-ends the turn once an action exhausts all remaining AP", () => {
    const costlyStrike: CombatActionDef = { ...BASIC_ATTACK, apCost: 2 };
    const hero = makeHero({ ap: 2, apMax: 2, actions: [costlyStrike, DEFEND_ACTION, FLEE_ACTION, END_TURN_ACTION] });
    let state = startCombat([hero], [makeFoe({ maxHp: 100, hp: 100 })], sequenceRng([forD20(15), forD20(5)]));
    expect(currentCombatant(state).id).toBe("hero");

    state = submitPlayerAction(state, { actorId: "hero", actionId: "strike", targetId: "foe" }, sequenceRng([GUARANTEED_FAILURE, 0, GUARANTEED_FAILURE]));
    // 2 AP spent by a single 2-AP action -> turn advances with no explicit End Turn.
    expect(currentCombatant(state).id).toBe("hero");
    expect(state.combatants.find((c) => c.id === "hero")!.ap).toBe(2); // refilled for the new turn
  });

  it("always ends the turn on Flee, even with AP left over", () => {
    let state = startCombat(
      [makeHero({ ap: 4, apMax: 4 })],
      [makeFoe({ maxHp: 100, hp: 100 })],
      sequenceRng([forD20(15), forD20(5)])
    );
    // hero dex mod +2, roll 3 -> total 5, fails the DC-10 flee check.
    state = submitPlayerAction(state, { actorId: "hero", actionId: "flee" }, sequenceRng([forD20(3), 0, GUARANTEED_FAILURE]));
    expect(state.combatants.find((c) => c.id === "hero")!.fled).toBe(false);
    // Only 1 AP was spent on the failed Flee, but the turn still ended and came
    // back around with AP refilled -- not left sitting at 3.
    expect(currentCombatant(state).id).toBe("hero");
    expect(state.combatants.find((c) => c.id === "hero")!.ap).toBe(4);
  });
});

describe("status effects", () => {
  it("skips a Rooted combatant's turn for its full duration, then lets them act again", () => {
    // Foe (higher initiative) acts first every round; hero starts Rooted for 2
    // of their own turns and always misses back, so this whole cascade auto-
    // resolves inside startCombat with zero player actions submitted.
    const hero = makeHero({ statusEffects: [{ defId: "rooted", turnsRemaining: 2 }] });
    const state = startCombat(
      [hero],
      [makeFoe()],
      sequenceRng([
        forD20(5), // hero init
        forD20(15), // foe init -> foe goes first
        0, // foe targets hero (only option)
        GUARANTEED_FAILURE, // foe misses (round 1)
        0,
        GUARANTEED_FAILURE, // foe misses (round 2, hero still Rooted)
        0,
        GUARANTEED_FAILURE, // foe misses (round 3, hero finally free)
      ])
    );
    const skips = state.log.filter((e) => e.message.includes("Rooted and cannot act"));
    expect(skips).toHaveLength(2);
    expect(state.status).toBe("active");
    expect(state.round).toBe(3);
    expect(currentCombatant(state).id).toBe("hero"); // finally able to act
    expect(state.combatants.find((c) => c.id === "hero")!.statusEffects).toEqual([]);
  });

  it("never drops a party member below 1 HP from a DoT tick", () => {
    const hero = makeHero({ hp: 5, maxHp: 20, statusEffects: [{ defId: "burning", turnsRemaining: 2, amount: 20 }] });
    const state = startCombat(
      [hero],
      [makeFoe()],
      sequenceRng([forD20(5), forD20(15), 0, GUARANTEED_FAILURE]) // foe goes first and misses; hero's turn starts, ticking Burning
    );
    expect(state.combatants.find((c) => c.id === "hero")!.hp).toBe(1);
    expect(state.status).toBe("active");
  });

  it("can kill an enemy outright with a DoT tick (no floor), ending the fight", () => {
    const foe = makeFoe({ hp: 5, maxHp: 5, statusEffects: [{ defId: "poisoned", turnsRemaining: 1, amount: 999 }] });
    // hero (higher initiative) acts first with Defend, which exhausts their
    // 1-AP budget and hands the turn to the foe -- whose fatal DoT tick fires
    // before they can act.
    let state = startCombat([makeHero()], [foe], sequenceRng([forD20(15), forD20(5)]));
    state = submitPlayerAction(state, { actorId: "hero", actionId: "defend" }, sequenceRng([]));
    expect(state.status).toBe("party_won");
    expect(state.combatants.find((c) => c.id === "foe")!.hp).toBe(0);
  });

  it("absorbs incoming damage with a Ward until it's exhausted", () => {
    const hero = makeHero({
      hp: 100,
      maxHp: 100,
      statusEffects: [{ defId: "ward", turnsRemaining: 1, amount: 6 }],
    });
    const state = startCombat(
      [hero],
      [makeFoe()],
      sequenceRng([
        forD20(5), // hero init
        forD20(15), // foe init -> foe goes first
        0, // foe targets hero
        GUARANTEED_SUCCESS, // guaranteed hit
        GUARANTEED_FAILURE, // no crit
        forVariance(1), // exact damage: 10 str * 1 power * 1.0 variance = 10
      ])
    );
    // 10 raw damage, 6 absorbed by the Ward, 4 gets through.
    expect(state.combatants.find((c) => c.id === "hero")!.hp).toBe(96);
    const hit = state.log.find((e) => e.kind === "hit" && e.targetId === "hero");
    expect(hit?.amount).toBe(4);
    expect(hit?.message).toContain("absorbed by its Ward");
  });
});

describe("multi-enemy ranks", () => {
  function makeLineAction(): CombatActionDef {
    return { ...BASIC_ATTACK, id: "line-attack", targetShape: "line" };
  }
  function makeAreaAction(): CombatActionDef {
    return { ...BASIC_ATTACK, id: "area-attack", targetShape: "area" };
  }

  it("hits every living member of the target's rank with a line attack, and nobody else", () => {
    const front1 = makeFoe({ id: "front1", name: "Front1", rank: "front" });
    const front2 = makeFoe({ id: "front2", name: "Front2", rank: "front" });
    const back = makeFoe({ id: "back", name: "Back", rank: "back" });
    const hero = makeHero({ ap: 4, apMax: 4, actions: [makeLineAction(), DEFEND_ACTION, FLEE_ACTION, END_TURN_ACTION] });
    const state = startCombat(
      [hero],
      [front1, front2, back],
      sequenceRng([forD20(20), forD20(1), forD20(1), forD20(1)])
    );
    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "line-attack", targetId: "front1" },
      sequenceRng([GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1), GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1)])
    );
    expect(after.combatants.find((c) => c.id === "front1")!.hp).toBeLessThan(front1.hp);
    expect(after.combatants.find((c) => c.id === "front2")!.hp).toBeLessThan(front2.hp);
    expect(after.combatants.find((c) => c.id === "back")!.hp).toBe(back.hp);
  });

  it("hits only the target's immediate rank-neighbors with an area attack", () => {
    const a = makeFoe({ id: "a", name: "A", rank: "front" });
    const b = makeFoe({ id: "b", name: "B", rank: "front" });
    const c = makeFoe({ id: "c", name: "C", rank: "front" });
    const d = makeFoe({ id: "d", name: "D", rank: "front" });
    const hero = makeHero({ ap: 4, apMax: 4, actions: [makeAreaAction(), DEFEND_ACTION, FLEE_ACTION, END_TURN_ACTION] });
    const state = startCombat(
      [hero],
      [a, b, c, d],
      sequenceRng([forD20(20), forD20(1), forD20(1), forD20(1), forD20(1)])
    );
    // Targeting b (index 1 of [a,b,c,d]) hits a, b, c (indices 0-2) but not d.
    const after = submitPlayerAction(
      state,
      { actorId: "hero", actionId: "area-attack", targetId: "b" },
      sequenceRng([
        GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1),
        GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1),
        GUARANTEED_SUCCESS, GUARANTEED_FAILURE, forVariance(1),
      ])
    );
    expect(after.combatants.find((x) => x.id === "a")!.hp).toBeLessThan(a.hp);
    expect(after.combatants.find((x) => x.id === "b")!.hp).toBeLessThan(b.hp);
    expect(after.combatants.find((x) => x.id === "c")!.hp).toBeLessThan(c.hp);
    expect(after.combatants.find((x) => x.id === "d")!.hp).toBe(d.hp);
  });
});
