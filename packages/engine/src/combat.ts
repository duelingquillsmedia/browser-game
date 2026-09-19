import type { AbilityKey, AbilityScores } from "./abilities.js";
import { abilityModifier, rollD20, rollD20WithEdge, rollDice, type RNG } from "./dice.js";
import { DEFEND_ACTION, type CombatActionDef } from "./actions.js";
import type { Character } from "./character.js";
import { getClass } from "./classes.js";
import type { Monster } from "./monsters.js";
import { applyDamageModifiers, type DamageType } from "./damage.js";
import type { OriginFeatId } from "./feats.js";

export type Side = "party" | "enemy";

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  /** A party member's species (for race-specific mechanics like Orc's Relentless Endurance); monsters have none. */
  raceId?: string;
  /** A party member's Origin feat (for feat-specific mechanics like Alert or Savage Attacker); monsters have none. */
  originFeatId?: OriginFeatId;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorClass: number;
  proficiencyBonus: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
  /** Ability scores this combatant is proficient in saving throws with (party only; monsters default to none). */
  savingThrowProficiencies: AbilityKey[];
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  damageImmunities: DamageType[];
  /** From buff actions (e.g. Arcane Shield); cleared at the start of this combatant's own next turn. */
  tempArmorClassBonus: number;
  /** From Defend (SRD's Dodge): attacks against this combatant have Disadvantage until their next turn. */
  dodging: boolean;
  initiative: number;
  fled: boolean;
  /** Dropped to 0 HP but not (yet) dead — rolling Death Saving Throws each of their turns. */
  unconscious: boolean;
  /** Stopped rolling Death Saving Throws after 3 successes; still Unconscious until healed. */
  stable: boolean;
  dead: boolean;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  /** Whether an Orc's Relentless Endurance has already saved this combatant once this fight. */
  usedRelentlessEndurance: boolean;
}

export function toCombatant(source: Character | Monster, side: Side): Combatant {
  return {
    id: source.id,
    name: source.name,
    side,
    raceId: "raceId" in source ? source.raceId : undefined,
    originFeatId: "originFeatId" in source ? source.originFeatId : undefined,
    abilityScores: source.abilityScores,
    maxHp: source.maxHp,
    hp: source.hp,
    armorClass: source.armorClass,
    proficiencyBonus: source.proficiencyBonus,
    actions: source.actions,
    actionUses: { ...source.actionUses },
    savingThrowProficiencies: "classId" in source ? getClass(source.classId).savingThrowProficiencies : [],
    damageResistances: source.damageResistances ?? [],
    damageVulnerabilities: source.damageVulnerabilities ?? [],
    damageImmunities: source.damageImmunities ?? [],
    tempArmorClassBonus: 0,
    dodging: false,
    initiative: 0,
    fled: false,
    unconscious: false,
    stable: false,
    dead: false,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    usedRelentlessEndurance: false,
  };
}

export interface CombatLogEntry {
  round: number;
  message: string;
}

export type CombatStatus = "active" | "party_won" | "enemies_won" | "party_fled";

export interface CombatState {
  combatants: Combatant[];
  turnOrder: string[];
  turnIndex: number;
  round: number;
  log: CombatLogEntry[];
  status: CombatStatus;
}

const FLEE_DC = 10;

/** Can act normally this turn (attack, cast, defend, flee...). */
function isUp(c: Combatant): boolean {
  return c.hp > 0 && !c.fled;
}

/** Occupies a turn at all — either able to act, or unconscious and rolling death saves. */
function hasATurn(c: Combatant): boolean {
  return isUp(c) || (c.side === "party" && c.unconscious && !c.dead);
}

/** A valid target for an attack/heal/save — up, or helpless (Unconscious) rather than gone (fled/dead). */
function isTargetable(c: Combatant): boolean {
  return !c.fled && !c.dead;
}

function abilityMod(c: Combatant, key: AbilityKey): number {
  return abilityModifier(c.abilityScores[key]);
}

function findCombatant(state: CombatState, id: string): Combatant {
  const combatant = state.combatants.find((c) => c.id === id);
  if (!combatant) throw new Error(`No combatant with id "${id}"`);
  return combatant;
}

export function currentCombatant(state: CombatState): Combatant {
  return findCombatant(state, state.turnOrder[state.turnIndex]);
}

function computeStatus(state: CombatState): CombatStatus {
  const party = state.combatants.filter((c) => c.side === "party");
  const enemies = state.combatants.filter((c) => c.side === "enemy");

  if (party.every((c) => c.dead)) return "enemies_won";
  if (enemies.every((c) => c.hp <= 0)) return "party_won";
  if (party.every((c) => c.fled)) return "party_fled";
  return "active";
}

function log(state: CombatState, message: string): void {
  state.log.push({ round: state.round, message });
}

export function startCombat(
  partySource: Combatant[],
  enemySource: Combatant[],
  rng: RNG = Math.random
): CombatState {
  const combatants = [...partySource, ...enemySource].map((c) => ({ ...c }));

  for (const c of combatants) {
    const alertBonus = c.originFeatId === "alert" ? c.proficiencyBonus : 0;
    c.initiative = rollD20(rng) + abilityMod(c, "dex") + alertBonus;
  }

  const turnOrder = [...combatants]
    .sort((a, b) => b.initiative - a.initiative || abilityMod(b, "dex") - abilityMod(a, "dex"))
    .map((c) => c.id);

  const state: CombatState = {
    combatants,
    turnOrder,
    turnIndex: 0,
    round: 1,
    log: [],
    status: "active",
  };

  log(state, "The battle begins!");
  for (const id of turnOrder) {
    const c = findCombatant(state, id);
    log(state, `${c.name} rolls initiative: ${c.initiative}.`);
  }

  return advancePastDeadOrEnemies(state, rng);
}

/**
 * Handles what a party member's own 0-HP transition or further damage does:
 * falling unconscious, an instant death from massive damage, or a death
 * saving throw failure from being hit again while already down. Monsters
 * have no equivalent — per the SRD, a monster simply dies at 0 HP.
 */
function handlePartyDamageOutcome(state: CombatState, target: Combatant, damage: number, isCrit: boolean, hpBefore: number): void {
  if (target.hp > 0 || target.dead) return;

  if (hpBefore === 0) {
    // Already at 0 HP (unconscious or stable) and took more damage.
    if (damage <= 0) return;
    target.stable = false;
    const failures = isCrit ? 2 : 1;
    target.deathSaveFailures += failures;
    log(
      state,
      `${target.name} takes damage at 0 HP and suffers ${failures} death saving throw failure${failures > 1 ? "s" : ""}.`
    );
    if (target.deathSaveFailures >= 3) {
      target.dead = true;
      log(state, `${target.name} dies.`);
    }
    return;
  }

  // Just dropped to 0 HP this hit.
  const overkill = damage - hpBefore;
  if (overkill >= target.maxHp) {
    target.dead = true;
    log(state, `${target.name} takes a devastating blow and dies instantly!`);
    return;
  }
  if (target.raceId === "orc" && !target.usedRelentlessEndurance) {
    target.usedRelentlessEndurance = true;
    target.hp = 1;
    log(state, `${target.name}'s Relentless Endurance kicks in — they stay on their feet at 1 HP!`);
    return;
  }
  target.unconscious = true;
  target.stable = false;
  target.deathSaveSuccesses = 0;
  target.deathSaveFailures = 0;
  log(state, `${target.name} drops to 0 HP and falls unconscious!`);
}

/** Rolls to see if `actor`'s attack/spell against `target` connects. */
function resolveAttack(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  action: CombatActionDef,
  rng: RNG
): void {
  const disadvantaged = target.dodging;
  const advantaged = target.unconscious;
  const edge = advantaged && disadvantaged ? "none" : advantaged ? "advantage" : disadvantaged ? "disadvantage" : "none";
  let attackRoll = rollD20WithEdge(edge, rng);
  if (attackRoll === 1 && actor.raceId === "halfling") {
    log(state, `${actor.name}'s Lucky trait rerolls a natural 1!`);
    attackRoll = rollD20WithEdge(edge, rng);
  }
  const mod = abilityMod(actor, action.ability) + actor.proficiencyBonus;
  const total = attackRoll + mod;
  const targetAc = target.armorClass + target.tempArmorClassBonus;

  const isFumble = attackRoll === 1;
  const hits = attackRoll === 20 || (!isFumble && total >= targetAc);

  if (!hits) {
    log(state, `${actor.name} attacks ${target.name} with ${action.name} (${total} vs AC ${targetAc}) — misses!`);
    return;
  }

  // Any hit against an Unconscious target is an automatic Critical Hit.
  const isCrit = attackRoll === 20 || target.unconscious;

  let diceTotal = rollDice(action.dice!, rng).total;
  if (!isCrit && actor.originFeatId === "savageAttacker") {
    // Savage Attacker: roll the damage dice twice and keep the higher single result, once per turn.
    const reroll = rollDice(action.dice!, rng).total;
    diceTotal = Math.max(diceTotal, reroll);
  }
  let damage = Math.max(0, diceTotal + abilityMod(actor, action.ability));
  if (isCrit) damage += rollDice(action.dice!, rng).total;
  const damageType = action.damageType ?? "bludgeoning";
  damage = applyDamageModifiers(damage, damageType, target);

  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - damage);

  const crit = isCrit ? " Critical hit!" : "";
  const fell = target.side === "enemy" && target.hp === 0 ? ` ${target.name} falls!` : "";
  log(state, `${actor.name} hits ${target.name} with ${action.name} for ${damage} ${damageType} damage.${crit}${fell}`);

  if (target.side === "party") handlePartyDamageOutcome(state, target, damage, isCrit, hpBefore);
}

/** Resolves a saving-throw effect (e.g. Fireball) against every opposing combatant, one damage roll for all. */
function resolveSave(state: CombatState, actor: Combatant, action: CombatActionDef, rng: RNG): void {
  const targets = state.combatants.filter((c) => c.side !== actor.side && isTargetable(c));
  if (targets.length === 0) return;

  const dc = 8 + actor.proficiencyBonus + abilityMod(actor, action.ability);
  const damageType = action.damageType ?? "force";
  const saveAbility = action.saveAbility ?? action.ability;
  const baseDamage = rollDice(action.dice!, rng).total;

  for (const target of targets) {
    const edge = target.dodging && saveAbility === "dex" ? "advantage" : "none";
    const saveRoll = rollD20WithEdge(edge, rng);
    const proficient = target.savingThrowProficiencies.includes(saveAbility);
    const saveTotal = saveRoll + abilityMod(target, saveAbility) + (proficient ? target.proficiencyBonus : 0);
    const succeeded = saveTotal >= dc;

    let damage = succeeded ? Math.floor(baseDamage / 2) : baseDamage;
    damage = applyDamageModifiers(damage, damageType, target);

    const hpBefore = target.hp;
    target.hp = Math.max(0, target.hp - damage);
    log(
      state,
      `${target.name} ${succeeded ? "partially resists" : "fails to resist"} ${actor.name}'s ${action.name} ` +
        `(${saveTotal} vs DC ${dc}) and takes ${damage} ${damageType} damage.`
    );
    if (target.side === "party") handlePartyDamageOutcome(state, target, damage, false, hpBefore);
  }
}

function resolveHeal(state: CombatState, actor: Combatant, target: Combatant, action: CombatActionDef, rng: RNG): void {
  const amount = Math.max(1, rollDice(action.dice!, rng).total + abilityMod(actor, action.ability));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (target.hp > 0 && target.unconscious) {
    // Regaining any HP ends the Unconscious condition (and the death saves that came with it).
    target.unconscious = false;
    target.stable = false;
    target.deathSaveSuccesses = 0;
    target.deathSaveFailures = 0;
  }
  log(state, `${actor.name} uses ${action.name} on ${target.name}, restoring ${healed} HP.`);
}

function resolveBuff(state: CombatState, actor: Combatant, action: CombatActionDef): void {
  actor.tempArmorClassBonus += action.effectValue ?? 0;
  log(state, `${actor.name} uses ${action.name}, gaining +${action.effectValue ?? 0} AC until their next turn.`);
}

function resolveDefend(state: CombatState, actor: Combatant): void {
  actor.dodging = true;
  log(
    state,
    `${actor.name} uses ${DEFEND_ACTION.name}: attacks against them have Disadvantage until their next turn.`
  );
}

function resolveFlee(state: CombatState, actor: Combatant, rng: RNG): void {
  const edge = actor.dodging ? "advantage" : "none";
  const roll = rollD20WithEdge(edge, rng);
  const proficient = actor.savingThrowProficiencies.includes("dex");
  const total = roll + abilityMod(actor, "dex") + (proficient ? actor.proficiencyBonus : 0);
  if (total >= FLEE_DC) {
    actor.fled = true;
    log(state, `${actor.name} flees the battle!`);
  } else {
    log(state, `${actor.name} tries to flee but can't get away!`);
  }
}

/** A party member who starts their turn at 0 HP rolls a Death Saving Throw instead of acting. */
function runDeathSave(state: CombatState, actor: Combatant, rng: RNG): void {
  const roll = rollD20(rng);

  if (roll === 20) {
    actor.unconscious = false;
    actor.stable = false;
    actor.deathSaveSuccesses = 0;
    actor.deathSaveFailures = 0;
    actor.hp = 1;
    log(state, `${actor.name} rolls a natural 20 on a death saving throw and springs back up with 1 HP!`);
    return;
  }

  if (roll === 1) {
    actor.deathSaveFailures += 2;
  } else if (roll >= 10) {
    actor.deathSaveSuccesses += 1;
  } else {
    actor.deathSaveFailures += 1;
  }

  log(
    state,
    `${actor.name} rolls ${roll} on a death saving throw ` +
      `(${actor.deathSaveSuccesses} success${actor.deathSaveSuccesses === 1 ? "" : "es"}, ` +
      `${actor.deathSaveFailures} failure${actor.deathSaveFailures === 1 ? "" : "s"}).`
  );

  if (actor.deathSaveFailures >= 3) {
    actor.dead = true;
    log(state, `${actor.name} dies.`);
  } else if (actor.deathSaveSuccesses >= 3) {
    actor.stable = true;
    log(state, `${actor.name} stabilizes.`);
  }
}

export interface ActionRequest {
  actorId: string;
  actionId: string;
  targetId?: string;
}

function performAction(state: CombatState, request: ActionRequest, rng: RNG): void {
  const actor = findCombatant(state, request.actorId);
  if (!isUp(actor)) throw new Error(`${actor.name} cannot act.`);

  const action = actor.actions.find((a) => a.id === request.actionId);
  if (!action) throw new Error(`${actor.name} does not know action "${request.actionId}".`);

  if (action.usesPerCombat !== undefined) {
    const remaining = actor.actionUses[action.id] ?? 0;
    if (remaining <= 0) throw new Error(`${actor.name} has no uses of ${action.name} left.`);
    actor.actionUses[action.id] = remaining - 1;
  }

  switch (action.kind) {
    case "attack": {
      if (!request.targetId) throw new Error(`${action.name} requires a target.`);
      const target = findCombatant(state, request.targetId);
      if (!isTargetable(target)) throw new Error(`${target.name} is not a valid target.`);
      resolveAttack(state, actor, target, action, rng);
      break;
    }
    case "save":
      resolveSave(state, actor, action, rng);
      break;
    case "heal": {
      const targetId = action.target === "self" ? actor.id : request.targetId;
      if (!targetId) throw new Error(`${action.name} requires a target.`);
      const target = findCombatant(state, targetId);
      if (!isTargetable(target)) throw new Error(`${target.name} is not a valid target.`);
      resolveHeal(state, actor, target, action, rng);
      break;
    }
    case "buff":
      resolveBuff(state, actor, action);
      break;
    case "defend":
      resolveDefend(state, actor);
      break;
    case "flee":
      resolveFlee(state, actor, rng);
      break;
  }
}

/** Moves turnIndex forward to the next combatant with a turn to take, advancing rounds as needed. */
function advanceTurn(state: CombatState): void {
  const total = state.turnOrder.length;
  for (let steps = 0; steps < total; steps++) {
    state.turnIndex += 1;
    if (state.turnIndex >= total) {
      state.turnIndex = 0;
      state.round += 1;
      log(state, `— Round ${state.round} —`);
    }
    const next = findCombatant(state, state.turnOrder[state.turnIndex]);
    if (hasATurn(next)) {
      next.tempArmorClassBonus = 0;
      next.dodging = false;
      return;
    }
  }
}

function pickEnemyAction(actor: Combatant): CombatActionDef {
  const attacks = actor.actions.filter(
    (a) => a.kind === "attack" && (a.usesPerCombat === undefined || (actor.actionUses[a.id] ?? 0) > 0)
  );
  return attacks[0] ?? actor.actions[0];
}

function runEnemyTurn(state: CombatState, rng: RNG): void {
  const actor = currentCombatant(state);
  const action = pickEnemyAction(actor);
  // Unconscious-but-not-dead party members are still valid (and helpless) targets.
  const targetableParty = state.combatants.filter((c) => c.side === "party" && isTargetable(c));
  const target = targetableParty[Math.floor(rng() * targetableParty.length)];
  if (action.kind === "attack" && target) {
    performAction(state, { actorId: actor.id, actionId: action.id, targetId: target.id }, rng);
  }
}

/**
 * After state mutation, refreshes status and auto-resolves anything that
 * doesn't need player input: enemy turns, and a downed party member's
 * automatic death saving throw. Stops (without advancing further) the
 * moment a party member is ready to act — including a party member who
 * just clawed back to consciousness via a natural 20.
 */
function advancePastDeadOrEnemies(state: CombatState, rng: RNG): CombatState {
  state.status = computeStatus(state);
  while (state.status === "active") {
    const actor = currentCombatant(state);
    if (actor.side === "enemy") {
      runEnemyTurn(state, rng);
    } else if (actor.unconscious && !actor.dead) {
      if (!actor.stable) {
        runDeathSave(state, actor, rng);
        if (!actor.unconscious) {
          // Revived mid-turn (natural 20) — let them act now instead of auto-advancing.
          state.status = computeStatus(state);
          break;
        }
      }
      // Stable and still unconscious: nothing happens on their turn.
    } else {
      break; // a party member who can act normally — wait for player input
    }
    state.status = computeStatus(state);
    if (state.status !== "active") break;
    advanceTurn(state);
    state.status = computeStatus(state);
  }
  return state;
}

/**
 * Applies a party member's chosen action, then auto-resolves any following
 * enemy turns, returning a new state ready for the next player decision (or
 * a terminal status if the fight is over).
 */
export function submitPlayerAction(state: CombatState, request: ActionRequest, rng: RNG = Math.random): CombatState {
  const next: CombatState = structuredClone(state);
  const actor = currentCombatant(next);
  if (actor.side !== "party") throw new Error("It is not the party's turn.");
  if (actor.id !== request.actorId) throw new Error(`It is ${actor.name}'s turn, not this actor's.`);

  performAction(next, request, rng);
  next.status = computeStatus(next);
  if (next.status !== "active") return next;

  advanceTurn(next);
  return advancePastDeadOrEnemies(next, rng);
}
