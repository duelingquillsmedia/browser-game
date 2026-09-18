import type { AbilityKey, AbilityScores } from "./abilities.js";
import { abilityModifier, rollD20, rollDice, type RNG } from "./dice.js";
import type { CombatActionDef } from "./actions.js";
import type { Character } from "./character.js";
import type { Monster } from "./monsters.js";

export type Side = "party" | "enemy";

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorClass: number;
  proficiencyBonus: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
  /** From Defend/buff actions; cleared at the start of this combatant's own next turn. */
  tempArmorClassBonus: number;
  initiative: number;
  fled: boolean;
}

export function toCombatant(source: Character | Monster, side: Side): Combatant {
  return {
    id: source.id,
    name: source.name,
    side,
    abilityScores: source.abilityScores,
    maxHp: source.maxHp,
    hp: source.hp,
    armorClass: source.armorClass,
    proficiencyBonus: source.proficiencyBonus,
    actions: source.actions,
    actionUses: { ...source.actionUses },
    tempArmorClassBonus: 0,
    initiative: 0,
    fled: false,
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

function isUp(c: Combatant): boolean {
  return c.hp > 0 && !c.fled;
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

  if (party.every((c) => c.hp <= 0)) return "enemies_won";
  if (enemies.every((c) => c.hp <= 0)) return "party_won";
  if (party.every((c) => !isUp(c))) return "party_fled";
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
    c.initiative = rollD20(rng) + abilityMod(c, "dex");
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

/** Rolls to see if `actor`'s attack/spell against `target` connects. */
function resolveAttack(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  action: CombatActionDef,
  rng: RNG
): void {
  const attackRoll = rollD20(rng);
  const mod = abilityMod(actor, action.ability) + actor.proficiencyBonus;
  const total = attackRoll + mod;
  const targetAc = target.armorClass + target.tempArmorClassBonus;

  const isCrit = attackRoll === 20;
  const isFumble = attackRoll === 1;
  const hits = isCrit || (!isFumble && total >= targetAc);

  if (!hits) {
    log(state, `${actor.name} attacks ${target.name} with ${action.name} (${total} vs AC ${targetAc}) — misses!`);
    return;
  }

  let damage = rollDice(action.dice!, rng).total + abilityMod(actor, action.ability);
  if (isCrit) damage += rollDice(action.dice!, rng).total;
  damage = Math.max(1, damage);

  target.hp = Math.max(0, target.hp - damage);

  const crit = isCrit ? " Critical hit!" : "";
  log(
    state,
    `${actor.name} hits ${target.name} with ${action.name} for ${damage} damage.${crit}${
      target.hp === 0 ? ` ${target.name} falls!` : ""
    }`
  );
}

function resolveHeal(state: CombatState, actor: Combatant, target: Combatant, action: CombatActionDef, rng: RNG): void {
  const amount = Math.max(1, rollDice(action.dice!, rng).total + abilityMod(actor, action.ability));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  log(state, `${actor.name} uses ${action.name} on ${target.name}, restoring ${healed} HP.`);
}

function resolveBuff(state: CombatState, actor: Combatant, action: CombatActionDef): void {
  actor.tempArmorClassBonus += action.effectValue ?? 0;
  log(state, `${actor.name} uses ${action.name}, gaining +${action.effectValue ?? 0} AC until their next turn.`);
}

function resolveFlee(state: CombatState, actor: Combatant, rng: RNG): void {
  const roll = rollD20(rng) + abilityMod(actor, "dex");
  if (roll >= FLEE_DC) {
    actor.fled = true;
    log(state, `${actor.name} flees the battle!`);
  } else {
    log(state, `${actor.name} tries to flee but can't get away!`);
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
      if (!isUp(target)) throw new Error(`${target.name} is not a valid target.`);
      resolveAttack(state, actor, target, action, rng);
      break;
    }
    case "heal": {
      const targetId = action.target === "self" ? actor.id : request.targetId;
      if (!targetId) throw new Error(`${action.name} requires a target.`);
      const target = findCombatant(state, targetId);
      if (!isUp(target)) throw new Error(`${target.name} is not a valid target.`);
      resolveHeal(state, actor, target, action, rng);
      break;
    }
    case "buff":
    case "defend":
      resolveBuff(state, actor, action);
      break;
    case "flee":
      resolveFlee(state, actor, rng);
      break;
  }
}

/** Moves turnIndex forward to the next living combatant, advancing rounds as needed. */
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
    if (isUp(next)) {
      next.tempArmorClassBonus = 0;
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
  const livingParty = state.combatants.filter((c) => c.side === "party" && isUp(c));
  const target = livingParty[Math.floor(rng() * livingParty.length)];
  if (action.kind === "attack" && target) {
    performAction(state, { actorId: actor.id, actionId: action.id, targetId: target.id }, rng);
  }
}

/** After state mutation, refreshes status and, while it's an enemy's turn, auto-resolves it. */
function advancePastDeadOrEnemies(state: CombatState, rng: RNG): CombatState {
  state.status = computeStatus(state);
  while (state.status === "active" && currentCombatant(state).side === "enemy") {
    runEnemyTurn(state, rng);
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
