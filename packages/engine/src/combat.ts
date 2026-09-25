import type { AbilityKey, AbilityScores } from "./abilities.js";
import { abilityModifier, rollD20, rollD20WithEdge, type RNG } from "./dice.js";
import { DEFEND_ACTION, type CombatActionDef } from "./actions.js";
import type { Character } from "./character.js";
import { getClass } from "./classes.js";
import type { Monster } from "./monsters.js";
import { applyDamageModifiers, type DamageType } from "./damage.js";
import type { OriginFeatId } from "./feats.js";
import { getClassResource } from "./resources.js";
import {
  BASE_HIT_CHANCE,
  CRIT_MULTIPLIER,
  MAX_HIT_CHANCE,
  MIN_HIT_CHANCE,
  computeAttackPower,
  computeAttackPowerBonusDamage,
  computeCritChance,
  computeEvasion,
  computeResourceMax,
  computeResourceStart,
  computeSaveChance,
  randomVariance,
} from "./stats.js";
import {
  STATUS_EFFECT_DEFS,
  absorbDamage,
  activeBuffAmount,
  applyStatusEffect,
  consumeStatusStack,
  hasActiveEffectOfKind,
  hasCrowdControl,
  tickStatusEffects,
  type StatusEffect,
  type StatusTickEvent,
} from "./status.js";

export type Side = "party" | "enemy";
export type Rank = "front" | "back";

/** Flat evasion-percentage bonus from using Defend, on top of the target's own Dexterity-based evasion. */
const DEFEND_EVASION_BONUS = 25;

/** Every party member's Action Points refill to this at the start of each of their own turns. Monsters never use the AP economy — they act via a single free action each turn, as before. */
export const PLAYER_AP_PER_TURN = 4;

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  /** A party member's species (for race-specific mechanics like Elf's Silverleaf Step); monsters have none. */
  raceId?: string;
  /** A party member's class (for UI purposes, e.g. picking a combat sprite); monsters have none. */
  classId?: string;
  /** A monster's template (for UI purposes, e.g. picking a combat sprite); party members have none. */
  templateId?: string;
  /** A party member's Origin feat (for feat-specific mechanics like Alert or Savage Attacker); monsters have none. */
  originFeatId?: OriginFeatId;
  /** A party member's character level (for UI display, e.g. the Combat screen's "LV n"); monsters have no level concept. */
  level?: number;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  /** Flat evasion-percentage bonus from gear (party) or natural armor (monsters), plus any class passive (e.g. a Soldier's Parry), on top of the Dexterity-based base (see stats.ts). */
  evasionBonus: number;
  /** The equipped melee/ranged weapon's own min-max damage range, rolled for whichever Basic Attack variant (or `weaponDamageSource` ability) uses it; monsters and an unarmed party member have neither, falling back to an ability-scaled default. */
  meleeWeaponDamageMin?: number;
  meleeWeaponDamageMax?: number;
  rangedWeaponDamageMin?: number;
  rangedWeaponDamageMax?: number;
  /** Used only for the Alert origin feat's initiative bonus and the Flee saving throw; monsters have none. */
  proficiencyBonus?: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
  /** For actions with a `cooldown`: the round each one next becomes available again. */
  actionCooldowns: Record<string, number>;
  /** Ability scores this combatant is proficient in saving throws with (party only; monsters default to none). */
  savingThrowProficiencies: AbilityKey[];
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  damageImmunities: DamageType[];
  /** Current value in this combatant's class resource pool (Fury/Expertise/Prayer/Focus/Cunning/Wylde/Arcana); undefined if their class has none. */
  resource?: number;
  /** From buff actions (e.g. Arcane Shield) and Defend; cleared at the start of this combatant's own next turn. */
  tempEvasionBonus: number;
  /** From Defend: gives Advantage on this combatant's own Flee attempts until their next turn. */
  dodging: boolean;
  initiative: number;
  fled: boolean;
  /** Dropped to 0 HP — knocked out of the fight. For the party, this alone ends combat in defeat. */
  unconscious: boolean;
  /** Only from an instant-death overkill hit; otherwise a party member simply goes Unconscious. */
  dead: boolean;
  /** Whether an Elf's Silverleaf Step has already discounted a resource cost this fight. */
  usedSilverleafStep: boolean;
  /** Current Action Points this turn; refills to apMax at the start of each of this combatant's own turns. Undefined for monsters — they're AP-exempt. */
  ap?: number;
  apMax?: number;
  /** Front/back battlefield rank, for line/area attack shapes. Party members are always "front" this pass — no party-side rank mechanic yet. */
  rank: Rank;
  /** Every crowd-control/DoT/HoT/shield effect currently affecting this combatant. */
  statusEffects: StatusEffect[];
}

export function toCombatant(source: Character | Monster, side: Side): Combatant {
  return {
    id: source.id,
    name: source.name,
    side,
    raceId: "raceId" in source ? source.raceId : undefined,
    classId: "classId" in source ? source.classId : undefined,
    templateId: "templateId" in source ? source.templateId : undefined,
    originFeatId: "originFeatId" in source ? source.originFeatId : undefined,
    level: "classId" in source ? source.level : undefined,
    abilityScores: source.abilityScores,
    maxHp: source.maxHp,
    hp: source.hp,
    evasionBonus: "gearEvasionBonus" in source ? source.gearEvasionBonus : source.evasionBonus,
    meleeWeaponDamageMin: "meleeWeaponDamageMin" in source ? source.meleeWeaponDamageMin : undefined,
    meleeWeaponDamageMax: "meleeWeaponDamageMax" in source ? source.meleeWeaponDamageMax : undefined,
    rangedWeaponDamageMin: "rangedWeaponDamageMin" in source ? source.rangedWeaponDamageMin : undefined,
    rangedWeaponDamageMax: "rangedWeaponDamageMax" in source ? source.rangedWeaponDamageMax : undefined,
    proficiencyBonus: "classId" in source ? source.proficiencyBonus : undefined,
    actions: source.actions,
    actionUses: { ...source.actionUses },
    actionCooldowns: {},
    resource:
      "classId" in source ? (source.resource ?? computeResourceStart(source.abilityScores, source.classId)) : undefined,
    savingThrowProficiencies: "classId" in source ? getClass(source.classId).savingThrowProficiencies : [],
    damageResistances: source.damageResistances ?? [],
    damageVulnerabilities: source.damageVulnerabilities ?? [],
    damageImmunities: source.damageImmunities ?? [],
    tempEvasionBonus: 0,
    dodging: false,
    initiative: 0,
    fled: false,
    // A party member who enters a fight already at 0 HP (e.g. a companion left
    // unhealed since their last mission) starts Unconscious rather than "up" —
    // monsters have no equivalent state, so this never applies to them.
    unconscious: side === "party" && source.hp <= 0,
    dead: false,
    usedSilverleafStep: false,
    ap: side === "party" ? PLAYER_AP_PER_TURN : undefined,
    apMax: side === "party" ? PLAYER_AP_PER_TURN : undefined,
    rank: side === "party" ? "front" : (source as Monster).rank,
    statusEffects: [],
  };
}

/**
 * What kind of thing happened, for a UI to key an animation off of —
 * distinct from the human-readable `message`, which is for the log panel.
 */
export type CombatEventKind =
  | "info"
  | "round"
  | "hit"
  | "miss"
  | "save-fail"
  | "save-succeed"
  | "heal"
  | "buff"
  | "defend"
  | "flee-success"
  | "flee-fail"
  | "down";

export interface CombatLogEntry {
  round: number;
  message: string;
  /** The combatant who caused this event, if any (for a UI to animate an "attacking" pose). */
  actorId?: string;
  /** The combatant this event happened to, if any (for a UI to animate a hit/heal reaction). */
  targetId?: string;
  kind?: CombatEventKind;
  /** Damage dealt or HP restored by this event, if any. */
  amount?: number;
  crit?: boolean;
}

export type CombatStatus = "active" | "party_won" | "enemies_won" | "party_fled";

export interface CombatState {
  combatants: Combatant[];
  turnOrder: string[];
  turnIndex: number;
  round: number;
  log: CombatLogEntry[];
  status: CombatStatus;
  /** Each combatant's HP the moment the fight started, before any turns (including a bad initiative roll's) resolved. Lets a UI replay the whole fight from the top, not just from whenever it first rendered. */
  initialHp: Record<string, number>;
}

const FLEE_DC = 10;

/** Can act normally this turn (attack, cast, defend, flee...). */
function isUp(c: Combatant): boolean {
  return c.hp > 0 && !c.fled;
}

/**
 * A valid target for an attack/heal/save — up, or helpless (Unconscious) rather than gone
 * (fled/dead) or already defeated. Monsters have no Unconscious state of their own (per the
 * SRD they simply die at 0 HP), so `hp > 0` alone excludes a defeated one; a party member at
 * 0 HP is still targetable because `unconscious` is set the moment they drop.
 */
export function isTargetable(c: Combatant): boolean {
  return !c.fled && !c.dead && (c.hp > 0 || c.unconscious);
}

function abilityMod(c: Combatant, key: AbilityKey): number {
  return abilityModifier(c.abilityScores[key]);
}

/** A uniform integer roll in [min, max], inclusive -- a weapon's own advertised damage range. */
function rollUniform(min: number, max: number, rng: RNG): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * The min-max damage range for whichever weapon slot `source` names, or
 * undefined if that slot is empty -- or if the action never asked for
 * weapon-scaled damage at all (`source` undefined). That last case matters:
 * an action with no `weaponDamageSource` (Radiant Beam, Wylde Wrath,
 * Elemental Shard, every pre-existing power-scaled ability, ...) must never
 * pick up an actor's equipped melee weapon's range just because they happen
 * to have one equipped.
 */
function weaponDamageRange(actor: Combatant, source: "melee" | "ranged" | undefined): { min: number; max: number } | undefined {
  if (source === "ranged") {
    if (actor.rangedWeaponDamageMin === undefined || actor.rangedWeaponDamageMax === undefined) return undefined;
    return { min: actor.rangedWeaponDamageMin, max: actor.rangedWeaponDamageMax };
  }
  if (source !== "melee") return undefined;
  if (actor.meleeWeaponDamageMin === undefined || actor.meleeWeaponDamageMax === undefined) return undefined;
  return { min: actor.meleeWeaponDamageMin, max: actor.meleeWeaponDamageMax };
}

/** Total flat evasion: gear/passives, Defend's temporary bonus, and any active "buff"-kind status (Enrage, Arcane Barrier). */
function effectiveEvasionBonus(c: Combatant): number {
  return c.evasionBonus + c.tempEvasionBonus + activeBuffAmount(c);
}

/** Ranger's Sharpshooter-style flat hit/crit bonus while swinging their ranged weapon (see classes.ts's `rangedAttackHitBonus`/`rangedAttackCritBonus`). This engine only tracks melee-vs-ranged, not weapon sub-types, so it applies to any ranged Basic Attack or weapon-scaled ability. */
function rangedAttackBonuses(actor: Combatant, action: CombatActionDef): { hit: number; crit: number } {
  if (action.weaponDamageSource !== "ranged" || !actor.classId) return { hit: 0, crit: 0 };
  const cls = getClass(actor.classId);
  return { hit: cls.rangedAttackHitBonus ?? 0, crit: cls.rangedAttackCritBonus ?? 0 };
}

/** Soldier's Readied / Rogue's Evasive Jab: a flat hit-chance reduction for one incoming attack. Doesn't consume the stack itself — see `consumeStatusStack`. */
function guardHitChanceReduction(target: Combatant): number {
  return hasActiveEffectOfKind(target, "guard") ? 50 : 0;
}

/** Warrior's Furious passive: a fraction of damage taken converted to resource, in place of a flat per-hit amount. */
function beingStruckResourceGain(target: Combatant, damageTaken: number): number | undefined {
  const percent = getClassResource(target.classId)?.gainOnBeingStruckPercent;
  if (!percent) return undefined;
  return Math.round(damageTaken * percent);
}

/**
 * An action's base damage/healing before crit/variance-band-on-top -- the
 * single formula both `previewAttack` and `resolveAttack` share. Three
 * shapes coexist:
 *  - no `weaponDamageSource`/`flatBase`/`percentOfAbility` at all: the
 *    original `ability * power * variance` formula, byte-identical to
 *    before this pass (every pre-existing action keeps using this).
 *  - `weaponDamageSource` set: rolls that weapon's own min-max range plus
 *    a flat Attack Power bonus (every Basic Attack, plus a few abilities
 *    the Style Sheet describes as "weapon damage" -- Cleave, Serrated
 *    Blade, Evasive Jab, ...).
 *  - `flatBase`/`percentOfAbility` set (with no weapon): the Style
 *    Sheet's "50 + 10% of WIS" shape (Mend, Wylde Healing, ...), which does
 *    pass through the same 0.85-1.15 variance band as the original formula.
 * The weapon and flat/percent shapes can combine (Evasive Jab: weapon roll
 * + 20% of DEX) -- when a weapon roll is involved, there's no additional
 * variance band on top of it (matching the original Basic-Attack-only
 * formula this generalizes): the weapon's own min-max range already is the
 * randomness.
 */
function computeBaseDamage(actor: Combatant, action: CombatActionDef, rng: RNG): number {
  const weaponRange = weaponDamageRange(actor, action.weaponDamageSource);
  const canSavage = actor.originFeatId === "savageAttacker";
  const usesNewFormula = weaponRange !== undefined || action.flatBase !== undefined || action.percentOfAbility !== undefined;

  if (!usesNewFormula) {
    let variance = randomVariance(rng);
    if (canSavage) variance = Math.max(variance, randomVariance(rng));
    return Math.max(0, Math.round(actor.abilityScores[action.ability] * (action.power ?? 1) * variance));
  }

  if (weaponRange) {
    // A weapon roll is its own source of randomness (MMO-tooltip style) -- no extra variance
    // band on top, same as the original Basic-Attack-only formula this generalizes.
    let roll = rollUniform(weaponRange.min, weaponRange.max, rng);
    // Savage Attacker: roll the weapon's damage twice and keep the higher result, once per turn.
    if (canSavage) roll = Math.max(roll, rollUniform(weaponRange.min, weaponRange.max, rng));
    let base = roll + computeAttackPowerBonusDamage(computeAttackPower(actor.abilityScores[action.ability]));
    if (action.percentOfAbility !== undefined) {
      base += Math.round(actor.abilityScores[action.ability] * action.percentOfAbility);
    }
    return Math.max(0, base);
  }

  // flatBase/percentOfAbility with no weapon roll: the same variance band as every power-scaled action.
  const base = action.flatBase ?? 0;
  const withPercent = base + Math.round(actor.abilityScores[action.ability] * (action.percentOfAbility ?? 0));
  const variance = randomVariance(rng);
  return Math.max(0, Math.round(withPercent * variance));
}

/** Same shape as `computeBaseDamage`, deterministic bounds instead of a roll -- for `previewAttack`'s hover tooltip. */
function previewBaseDamageRange(actor: Combatant, action: CombatActionDef): { min: number; max: number } {
  const weaponRange = weaponDamageRange(actor, action.weaponDamageSource);
  const usesNewFormula = weaponRange !== undefined || action.flatBase !== undefined || action.percentOfAbility !== undefined;

  if (!usesNewFormula) {
    const base = actor.abilityScores[action.ability] * (action.power ?? 1);
    return { min: Math.max(0, Math.round(base * 0.85)), max: Math.max(0, Math.round(base * 1.15)) };
  }

  if (weaponRange) {
    // No variance band on a weapon roll (see computeBaseDamage) -- the weapon's own range already is the spread.
    const bonus = computeAttackPowerBonusDamage(computeAttackPower(actor.abilityScores[action.ability]));
    const percentAdd =
      action.percentOfAbility !== undefined ? Math.round(actor.abilityScores[action.ability] * action.percentOfAbility) : 0;
    return { min: weaponRange.min + bonus + percentAdd, max: weaponRange.max + bonus + percentAdd };
  }

  const flatWithPercent =
    (action.flatBase ?? 0) +
    (action.percentOfAbility !== undefined ? Math.round(actor.abilityScores[action.ability] * action.percentOfAbility) : 0);
  return { min: Math.max(0, Math.round(flatWithPercent * 0.85)), max: Math.max(0, Math.round(flatWithPercent * 1.15)) };
}

/**
 * Expands a single clicked target into the full set an attack actually
 * hits, per its `targetShape`. "line" hits every living member of the
 * target's rank; "area" hits the target plus its immediate rank-neighbors.
 * "Neighbor" is adjacency by index among the currently-living members of
 * that rank, in encounter-authoring order — there's no 2D grid, so this is
 * a deliberate simplification that still gives stable, predictable results.
 */
function resolveTargetsForShape(state: CombatState, primary: Combatant, action: CombatActionDef): Combatant[] {
  const shape = action.targetShape ?? "single";
  if (shape === "single") return [primary];
  const rankMates = state.combatants.filter((c) => c.side === primary.side && c.rank === primary.rank && isTargetable(c));
  if (shape === "line") return rankMates;
  const index = rankMates.findIndex((c) => c.id === primary.id);
  return rankMates.filter((_, i) => Math.abs(i - index) <= 1);
}

/** Exported so the UI's hover preview can compute the exact same affected set as actual resolution, before a target is clicked. */
export function previewTargetsForShape(state: CombatState, action: CombatActionDef, primaryTargetId: string): string[] {
  return resolveTargetsForShape(state, findCombatant(state, primaryTargetId), action).map((c) => c.id);
}

export interface AttackPreview {
  hitChance: number;
  critChance: number;
  minDamage: number;
  maxDamage: number;
  /** The minimum possible roll alone would drop the target to 0 HP. */
  isLethal: boolean;
  /** The maximum possible roll (no crit) would drop the target to 0 HP. */
  canKill: boolean;
  /** Only a critical hit on the maximum roll would drop the target to 0 HP. */
  killsOnCrit: boolean;
  /** How many combatants this action's target shape would actually hit. */
  hitsCount: number;
  statusName?: string;
  statusTurns?: number;
}

/**
 * A non-mutating preview of what casting `action` at `targetId` would do
 * right now, for the UI's hover tooltip. Mirrors `resolveAttack`'s own
 * formulas (same hit/crit math, same weapon-strike-vs-ability-scaled damage
 * branch, same damage-modifier application) without rolling any dice or
 * touching state -- the same relationship `previewTargetsForShape` already
 * has to its own resolution counterpart.
 */
export function previewAttack(
  state: CombatState,
  actorId: string,
  action: CombatActionDef,
  targetId: string
): AttackPreview {
  const actor = findCombatant(state, actorId);
  const target = findCombatant(state, targetId);

  const evasion = computeEvasion(target.abilityScores.dex) + effectiveEvasionBonus(target);
  const guardReduction = action.kind === "attack" ? guardHitChanceReduction(target) : 0;
  const rangedBonus = rangedAttackBonuses(actor, action);
  const hitChance = target.unconscious
    ? 100
    : Math.max(MIN_HIT_CHANCE, Math.min(MAX_HIT_CHANCE, BASE_HIT_CHANCE - evasion - guardReduction + rangedBonus.hit));
  const critChance = target.unconscious
    ? 100
    : Math.max(0, Math.min(100, computeCritChance(actor.abilityScores.dex) + rangedBonus.crit));

  const { min: rawMin, max: rawMax } = previewBaseDamageRange(actor, action);

  // A random-damage-type action (Elemental Shard) can't know its roll ahead of time -- the first
  // listed type is shown as a representative approximation for the preview tooltip.
  const damageType = action.randomDamageTypes?.[0] ?? action.damageType ?? "bludgeoning";
  const minDamage = applyDamageModifiers(rawMin, damageType, target);
  const maxDamage = applyDamageModifiers(rawMax, damageType, target);
  const hitsCount = resolveTargetsForShape(state, target, action).length;

  return {
    hitChance,
    critChance,
    minDamage,
    maxDamage,
    isLethal: minDamage >= target.hp,
    canKill: maxDamage >= target.hp,
    killsOnCrit: maxDamage < target.hp && Math.round(maxDamage * CRIT_MULTIPLIER) >= target.hp,
    hitsCount,
    statusName: action.applyStatus ? STATUS_EFFECT_DEFS[action.applyStatus.defId].name : undefined,
    statusTurns: action.applyStatus?.turns,
  };
}

/** AP cost from the actor's per-turn budget; omitted defaults to 1 for a party actor. Monsters never spend AP. */
function effectiveApCost(action: CombatActionDef): number {
  return action.apCost ?? 1;
}

function hasEnoughAp(actor: Combatant, action: CombatActionDef): boolean {
  return actor.side !== "party" || actor.ap === undefined || actor.ap >= effectiveApCost(action);
}

/** Whether `actor` can use `action` right now — respects usesPerCombat, cooldown, resource cost, and AP. */
export function isActionReady(actor: Combatant, action: CombatActionDef, round: number): boolean {
  if (action.usesPerCombat !== undefined && (actor.actionUses[action.id] ?? 0) <= 0) return false;
  if (action.cooldown !== undefined && round < (actor.actionCooldowns[action.id] ?? 0)) return false;
  if (action.resourceCost !== undefined && (actor.resource ?? 0) < action.resourceCost) return false;
  if (!hasEnoughAp(actor, action)) return false;
  return true;
}

/** Applies a resource pool gain, clamped to that resource's Spirit/Intellect-derived max. A no-op if `combatant`'s class has no such pool. */
function gainResource(combatant: Combatant, amount: number | undefined): void {
  if (!amount) return;
  const max = computeResourceMax(combatant.abilityScores, combatant.classId ?? "");
  if (max === undefined) return;
  combatant.resource = Math.min(max, (combatant.resource ?? 0) + amount);
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

  if (party.every((c) => c.dead || c.unconscious)) return "enemies_won";
  if (enemies.every((c) => c.hp <= 0)) return "party_won";
  if (party.every((c) => c.fled)) return "party_fled";
  return "active";
}

function log(state: CombatState, message: string, event?: Omit<CombatLogEntry, "round" | "message">): void {
  state.log.push({ round: state.round, message, ...event });
}

export function startCombat(
  partySource: Combatant[],
  enemySource: Combatant[],
  rng: RNG = Math.random
): CombatState {
  const combatants = [...partySource, ...enemySource].map((c) => ({ ...c }));

  for (const c of combatants) {
    const alertBonus = c.originFeatId === "alert" ? (c.proficiencyBonus ?? 0) : 0;
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
    initialHp: Object.fromEntries(combatants.map((c) => [c.id, c.hp])),
  };

  log(state, "The battle begins!", { kind: "info" });
  for (const id of turnOrder) {
    const c = findCombatant(state, id);
    log(state, `${c.name} rolls initiative: ${c.initiative}.`, { kind: "info", actorId: c.id });
  }

  // Deliberately no settleTurnStart pass for the very first actor: they enter
  // combat already fully initialized (toCombatant sets ap/apMax and starting
  // resource), so a synthetic "turn start" tick here would apply a resource
  // regen before they've taken a single turn. advancePastDeadOrEnemies's own
  // skip loop already covers a combatant who starts down or CC'd.
  return advancePastDeadOrEnemies(state, rng);
}

/**
 * Handles what a party member's own drop to 0 HP does: falling unconscious
 * (which alone ends the fight in defeat), or an instant death from massive
 * damage. Monsters have no equivalent — per the SRD, a monster simply dies
 * at 0 HP. A no-op if they're already down, or this hit didn't finish them.
 */
function handlePartyDamageOutcome(state: CombatState, target: Combatant, damage: number, hpBefore: number): void {
  if (target.hp > 0 || target.dead || target.unconscious) return;

  const overkill = damage - hpBefore;
  if (overkill >= target.maxHp) {
    target.dead = true;
    log(state, `${target.name} takes a devastating blow and dies instantly!`, { kind: "down", targetId: target.id });
    return;
  }
  target.unconscious = true;
  log(state, `${target.name} drops to 0 HP and falls unconscious!`, { kind: "down", targetId: target.id });
}

/** Rolls to see if `actor`'s attack/spell against `target` connects, then how hard it hits. Returns whether it landed and whether it crit, so the caller (a Basic Attack) can award the right amount of resource. */
function resolveAttack(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  action: CombatActionDef,
  rng: RNG
): { hit: boolean; crit: boolean } {
  // An attack that also buffs its own caster (Defensive Flourish, Evasive Jab) does so
  // unconditionally, whether or not the attack itself connects -- it's the stance taken
  // by using the ability, not a reward for landing it.
  if (action.applySelfStatus) {
    resolveApplyStatus(state, actor, actor, { ...action, applyStatus: action.applySelfStatus }, rng);
  }

  let isCrit: boolean;

  // Any hit against an Unconscious target is an automatic Critical Hit.
  if (target.unconscious) {
    isCrit = true;
  } else {
    const evasion = computeEvasion(target.abilityScores.dex) + effectiveEvasionBonus(target);
    const guardReduction = guardHitChanceReduction(target);
    const rangedBonus = rangedAttackBonuses(actor, action);
    const hitChance = Math.max(
      MIN_HIT_CHANCE,
      Math.min(MAX_HIT_CHANCE, BASE_HIT_CHANCE - evasion - guardReduction + rangedBonus.hit)
    );
    const hits = rng() * 100 < hitChance;
    // Readied/Evasive Jab's guard is spent by the incoming attack whether it lands or not.
    consumeStatusStack(target, "guard");
    if (!hits) {
      log(state, `${actor.name} attacks ${target.name} with ${action.name} — misses!`, {
        kind: "miss",
        actorId: actor.id,
        targetId: target.id,
      });
      return { hit: false, crit: false };
    }
    const critChance = Math.max(0, Math.min(100, computeCritChance(actor.abilityScores.dex) + rangedBonus.crit));
    isCrit = rng() * 100 < critChance;
  }

  let damage = computeBaseDamage(actor, action, rng);
  if (isCrit) damage = Math.round(damage * CRIT_MULTIPLIER);
  const damageType = action.randomDamageTypes
    ? action.randomDamageTypes[Math.floor(rng() * action.randomDamageTypes.length)]
    : (action.damageType ?? "bludgeoning");
  damage = applyDamageModifiers(damage, damageType, target);
  const { damage: finalDamage, absorbed } = absorbDamage(target, damage);

  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - finalDamage);
  gainResource(target, beingStruckResourceGain(target, finalDamage));

  const crit = isCrit ? " Critical hit!" : "";
  const shieldNote = absorbed > 0 ? ` (${absorbed} absorbed by its Ward)` : "";
  const fell = target.side === "enemy" && target.hp === 0 ? ` ${target.name} falls!` : "";
  log(
    state,
    `${actor.name} hits ${target.name} with ${action.name} for ${finalDamage} ${damageType} damage.${shieldNote}${crit}${fell}`,
    { kind: "hit", actorId: actor.id, targetId: target.id, amount: finalDamage, crit: isCrit }
  );

  if (target.side === "party") handlePartyDamageOutcome(state, target, finalDamage, hpBefore);
  if (target.hp > 0) {
    resolveApplyStatus(state, actor, target, action, rng);
    resolveProc(state, actor, target);
  }
  return { hit: true, crit: isCrit };
}

/** Ranger's Barbed Arrow: consumes one "primed" stack on `actor` and, if one was spent, applies a weapon-damage-scaled bleed to the target they just hit. */
function resolveProc(state: CombatState, actor: Combatant, target: Combatant): void {
  if (!consumeStatusStack(actor, "proc")) return;
  const range = weaponDamageRange(actor, "ranged") ?? weaponDamageRange(actor, "melee");
  const amount = range ? Math.max(1, Math.round(((range.min + range.max) / 2) * 0.05)) : 1;
  applyStatusEffect(target, { defId: "bleeding", turnsRemaining: 3, amount });
  log(state, `${target.name} begins bleeding from ${actor.name}'s barbed shot.`, {
    kind: "info",
    actorId: actor.id,
    targetId: target.id,
  });
}

/** Resolves a saving-throw effect (e.g. Fireball) against every opposing combatant, one damage roll for all. */
function resolveSave(state: CombatState, actor: Combatant, action: CombatActionDef, rng: RNG): void {
  const targets = state.combatants.filter((c) => c.side !== actor.side && isTargetable(c));
  if (targets.length === 0) return;

  const damageType = action.damageType ?? "force";
  const saveAbility = action.saveAbility ?? action.ability;
  const casterScore = actor.abilityScores[action.ability];
  const baseDamage = Math.max(0, Math.round(casterScore * (action.power ?? 1) * randomVariance(rng)));

  for (const target of targets) {
    let saveChance = computeSaveChance(target.abilityScores[saveAbility], casterScore);
    if (target.savingThrowProficiencies.includes(saveAbility)) saveChance += 10;
    if (target.dodging && saveAbility === "dex") saveChance += 15;
    saveChance = Math.max(0, Math.min(100, saveChance));
    const succeeded = rng() * 100 < saveChance;

    let damage = succeeded ? Math.floor(baseDamage / 2) : baseDamage;
    damage = applyDamageModifiers(damage, damageType, target);
    const { damage: finalDamage, absorbed } = absorbDamage(target, damage);

    const hpBefore = target.hp;
    target.hp = Math.max(0, target.hp - finalDamage);
    gainResource(target, beingStruckResourceGain(target, finalDamage));
    const shieldNote = absorbed > 0 ? ` (${absorbed} absorbed by its Ward)` : "";
    log(
      state,
      `${target.name} ${succeeded ? "partially resists" : "fails to resist"} ${actor.name}'s ${action.name} ` +
        `(${saveChance}% chance) and takes ${finalDamage} ${damageType} damage.${shieldNote}`,
      {
        kind: succeeded ? "save-succeed" : "save-fail",
        actorId: actor.id,
        targetId: target.id,
        amount: finalDamage,
      }
    );
    if (target.side === "party") handlePartyDamageOutcome(state, target, finalDamage, hpBefore);
    if (target.hp > 0) resolveApplyStatus(state, actor, target, action, rng);
  }
}

function resolveHeal(state: CombatState, actor: Combatant, target: Combatant, action: CombatActionDef, rng: RNG): void {
  let base: number;
  if (action.flatBase !== undefined || action.percentOfAbility !== undefined) {
    base = action.flatBase ?? 0;
    if (action.percentOfAbility !== undefined) {
      base += Math.round(actor.abilityScores[action.ability] * action.percentOfAbility);
    }
  } else {
    base = actor.abilityScores[action.ability] * (action.power ?? 1);
  }
  const amount = Math.max(1, Math.round(base * randomVariance(rng)));
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (target.hp > 0 && target.unconscious) {
    // Regaining any HP ends the Unconscious condition.
    target.unconscious = false;
  }
  log(state, `${actor.name} uses ${action.name} on ${target.name}, restoring ${healed} HP.`, {
    kind: "heal",
    actorId: actor.id,
    targetId: target.id,
    amount: healed,
  });
}

function resolveBuff(state: CombatState, actor: Combatant, action: CombatActionDef, rng: RNG): void {
  if (action.effectValue) {
    actor.tempEvasionBonus += action.effectValue;
    log(state, `${actor.name} uses ${action.name}, gaining +${action.effectValue} evasion until their next turn.`, {
      kind: "buff",
      actorId: actor.id,
    });
  } else {
    log(state, `${actor.name} uses ${action.name}.`, { kind: "buff", actorId: actor.id });
  }
  resolveApplyStatus(state, actor, actor, action, rng);
}

/**
 * Applies an action's `applyStatus` spec (if any) to `target` — used by
 * attacks/saves against an opponent and by self buffs/heals alike. Rolls
 * `chance` independently of the action's own hit/save resolution, and
 * computes a DoT/HoT amount or shield capacity from the actor's scaling
 * ability score, once, at application time.
 */
function resolveApplyStatus(state: CombatState, actor: Combatant, target: Combatant, action: CombatActionDef, rng: RNG): void {
  const spec = action.applyStatus;
  if (!spec) return;
  if (spec.chance !== undefined && rng() * 100 >= spec.chance) return;

  let amount: number | undefined;
  if (spec.weaponPercent !== undefined) {
    // Bleed/poison-style ticks scaled off the acting weapon's average damage, not the ability score.
    const range = weaponDamageRange(actor, action.weaponDamageSource);
    amount = range ? Math.max(1, Math.round(((range.min + range.max) / 2) * spec.weaponPercent)) : undefined;
  } else if (spec.power !== undefined) {
    amount = Math.max(1, Math.round(actor.abilityScores[action.ability] * spec.power * randomVariance(rng)));
  }

  applyStatusEffect(target, { defId: spec.defId, turnsRemaining: spec.turns, amount, stacksRemaining: spec.stacks });
  const def = STATUS_EFFECT_DEFS[spec.defId];
  // A guard/proc effect actually expires by stack count, not turn count (see StatusEffect.turnsRemaining's
  // own comment) -- so its detail note names the stacks applied instead of a meaningless turn count.
  const detail =
    def.kind === "guard" || def.kind === "proc"
      ? spec.stacks && spec.stacks > 1
        ? ` (${spec.stacks} stacks)`
        : ""
      : spec.turns > 1
        ? ` (${spec.turns} turns)`
        : "";
  const verb = target.id === actor.id ? "gains" : "is afflicted with";
  log(state, `${target.name} ${verb} ${def.name}${detail}.`, {
    kind: "info",
    actorId: actor.id,
    targetId: target.id,
  });
}

function resolveDefend(state: CombatState, actor: Combatant): void {
  actor.dodging = true;
  actor.tempEvasionBonus += DEFEND_EVASION_BONUS;
  log(
    state,
    `${actor.name} uses ${DEFEND_ACTION.name}: much harder to hit until their next turn.`,
    { kind: "defend", actorId: actor.id }
  );
}

function resolveFlee(state: CombatState, actor: Combatant, rng: RNG): void {
  const edge = actor.dodging ? "advantage" : "none";
  const roll = rollD20WithEdge(edge, rng);
  const proficient = actor.savingThrowProficiencies.includes("dex");
  const total = roll + abilityMod(actor, "dex") + (proficient ? (actor.proficiencyBonus ?? 0) : 0);
  if (total >= FLEE_DC) {
    actor.fled = true;
    log(state, `${actor.name} flees the battle!`, { kind: "flee-success", actorId: actor.id });
  } else {
    log(state, `${actor.name} tries to flee but can't get away!`, { kind: "flee-fail", actorId: actor.id });
  }
}

/**
 * Analytic (not simulated) percent chance `resolveFlee` would succeed for
 * this actor right now: the same d20 + Dexterity modifier (+ proficiency
 * bonus if proficient, + Advantage if `dodging`) vs. DC 10 it actually
 * rolls, expressed as odds instead of rolled.
 */
export function fleeChancePercent(actor: Combatant): number {
  const proficient = actor.savingThrowProficiencies.includes("dex");
  const mod = abilityMod(actor, "dex") + (proficient ? (actor.proficiencyBonus ?? 0) : 0);
  const needed = Math.max(1, Math.min(21, FLEE_DC - mod));
  const singleRollChance = (21 - needed) / 20;
  const chance = actor.dodging ? 1 - (1 - singleRollChance) ** 2 : singleRollChance;
  return Math.round(Math.max(0, Math.min(100, chance * 100)));
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

  if (action.cooldown !== undefined) {
    const readyAtRound = actor.actionCooldowns[action.id] ?? 0;
    if (state.round < readyAtRound) throw new Error(`${action.name} is still recharging for ${actor.name}.`);
    actor.actionCooldowns[action.id] = state.round + action.cooldown;
  }

  if (action.resourceCost !== undefined) {
    const resourceConfig = getClassResource(actor.classId);
    let cost = action.resourceCost;
    if (actor.raceId === "elf" && !actor.usedSilverleafStep) {
      actor.usedSilverleafStep = true;
      cost = Math.max(0, cost - 1);
      log(state, `${actor.name}'s Silverleaf Step discounts the cost of ${action.name}.`, { kind: "info", actorId: actor.id });
    }
    const available = actor.resource ?? 0;
    if (available < cost) {
      throw new Error(`${actor.name} doesn't have enough ${resourceConfig?.name ?? "resource"} to use ${action.name}.`);
    }
    actor.resource = available - cost;
  }
  if (actor.side === "party" && actor.ap !== undefined) {
    const apCost = effectiveApCost(action);
    if (actor.ap < apCost) throw new Error(`${actor.name} doesn't have enough AP to use ${action.name}.`);
    actor.ap -= apCost;
  }
  switch (action.kind) {
    case "attack": {
      if (!request.targetId) throw new Error(`${action.name} requires a target.`);
      const primary = findCombatant(state, request.targetId);
      if (!isTargetable(primary)) throw new Error(`${primary.name} is not a valid target.`);
      let anyCrit = false;
      for (const target of resolveTargetsForShape(state, primary, action)) {
        const result = resolveAttack(state, actor, target, action, rng);
        anyCrit = anyCrit || result.crit;
      }
      // The Basic Attack builds its class's resource on use, hit or miss (more on a crit) --
      // a class without a matching pool is unaffected. Moved to after resolution (rather than
      // before, like the old flat-Rage-only version) so the crit-scaled amount is accurate.
      if (action.isBasicAttack) {
        const resourceConfig = getClassResource(actor.classId);
        gainResource(actor, anyCrit ? resourceConfig?.gainOnBasicAttackCrit : resourceConfig?.gainOnBasicAttack);
      }
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
      resolveBuff(state, actor, action, rng);
      break;
    case "defend":
      resolveDefend(state, actor);
      break;
    case "flee":
      resolveFlee(state, actor, rng);
      break;
    case "endTurn":
      log(state, `${actor.name} ends their turn.`, { kind: "info", actorId: actor.id });
      break;
  }
}

function logStatusTickEvent(state: CombatState, c: Combatant, e: StatusTickEvent): void {
  const def = STATUS_EFFECT_DEFS[e.defId];
  if (e.kind === "dot") {
    log(state, `${c.name} takes ${e.amount} damage from ${def.name}.`, { kind: "hit", targetId: c.id, amount: e.amount });
  } else if (e.kind === "hot") {
    log(state, `${c.name} recovers ${e.amount} HP from ${def.name}.`, { kind: "heal", targetId: c.id, amount: e.amount });
  } else if (e.kind === "shield-expire" || e.kind === "buff-expire") {
    log(state, `${c.name}'s ${def.name} fades.`, { kind: "info", targetId: c.id });
  } else if (e.kind === "cc-expire" || e.kind === "guard-expire" || e.kind === "proc-expire") {
    log(state, `${c.name} is no longer ${def.name}.`, { kind: "info", targetId: c.id });
  }
}

/**
 * Ticks status effects and decides whether `combatant` can act this turn —
 * called exactly once, right as their turn begins. Returns false when
 * they're down/fled, a DoT tick just finished off a monster, or they're
 * under an active crowd-control effect (which still ticks its own duration
 * down while skipping the turn it causes).
 */
function settleTurnStart(state: CombatState, combatant: Combatant): boolean {
  if (!isUp(combatant)) return false;
  // Read BEFORE ticking, so a 2-turn CC skips 2 full turns, and so the
  // skip message below can name the actual effect (Rooted, Stunned, ...).
  const ccEffect = combatant.statusEffects.find((e) => STATUS_EFFECT_DEFS[e.defId].kind === "cc");
  const events = tickStatusEffects(combatant);
  // cc-expire is logged after the "cannot act" message below (not here), so
  // a CC that expires on its own final skipped turn reads as "Rooted and
  // cannot act this turn. X is no longer Rooted." rather than the reverse.
  for (const e of events) {
    if (e.kind !== "cc-expire") logStatusTickEvent(state, combatant, e);
  }
  if (!isUp(combatant)) return false; // a DoT tick just finished off a monster (no 1-HP floor for them)
  if (ccEffect) {
    const def = STATUS_EFFECT_DEFS[ccEffect.defId];
    log(state, `${combatant.name} is ${def.name} and cannot act this turn.`, { kind: "info", actorId: combatant.id });
    for (const e of events) {
      if (e.kind === "cc-expire") logStatusTickEvent(state, combatant, e);
    }
    return false;
  }
  combatant.tempEvasionBonus = 0;
  combatant.dodging = false;
  if (combatant.apMax !== undefined) combatant.ap = combatant.apMax;
  return true;
}

/** Moves turnIndex forward to the next combatant with a turn to take, advancing rounds as needed. */
function advanceTurn(state: CombatState): void {
  const total = state.turnOrder.length;
  for (let steps = 0; steps < total; steps++) {
    state.turnIndex += 1;
    if (state.turnIndex >= total) {
      state.turnIndex = 0;
      state.round += 1;
      log(state, `— Round ${state.round} —`, { kind: "round" });
    }
    const next = findCombatant(state, state.turnOrder[state.turnIndex]);
    if (settleTurnStart(state, next)) return;
  }
}

/**
 * Picks one of the enemy's currently-available attacks at random, rather
 * than always the first — so a monster with more than one attack doesn't
 * use the exact same move every single turn. Only spends an rng() draw
 * when there's an actual choice to make, so a one-attack monster's turn
 * doesn't consume randomness the rest of combat depends on.
 */
function pickEnemyAction(state: CombatState, actor: Combatant, rng: RNG): CombatActionDef {
  const attacks = actor.actions.filter((a) => a.kind === "attack" && isActionReady(actor, a, state.round));
  if (attacks.length === 0) return actor.actions[0];
  if (attacks.length === 1) return attacks[0];
  const index = Math.min(attacks.length - 1, Math.floor(rng() * attacks.length));
  return attacks[index];
}

function runEnemyTurn(state: CombatState, rng: RNG): void {
  const actor = currentCombatant(state);
  const action = pickEnemyAction(state, actor, rng);
  // Unconscious-but-not-dead party members are still valid (and helpless) targets.
  const targetableParty = state.combatants.filter((c) => c.side === "party" && isTargetable(c));
  const target = targetableParty[Math.floor(rng() * targetableParty.length)];
  if (action.kind === "attack" && target) {
    performAction(state, { actorId: actor.id, actionId: action.id, targetId: target.id }, rng);
  }
}

/**
 * After state mutation, refreshes status and auto-resolves anything that
 * doesn't need player input (enemy turns and any party member who can't act),
 * stopping the moment a party member is ready to act. A party member who
 * drops to 0 HP goes Unconscious, which alone ends the fight in defeat, so
 * there's nothing left to auto-resolve for them mid-fight — but one CAN
 * start a fight already Unconscious (e.g. an unhealed companion) and land
 * first in turn order, so this has to skip a not-up party member too, not
 * just hand them the ability bar and wait forever.
 */
function advancePastDeadOrEnemies(state: CombatState, rng: RNG): CombatState {
  state.status = computeStatus(state);
  while (state.status === "active") {
    const actor = currentCombatant(state);
    if (!isUp(actor) || hasCrowdControl(actor)) {
      advanceTurn(state);
      state.status = computeStatus(state);
      continue;
    }
    if (actor.side === "enemy") {
      runEnemyTurn(state, rng);
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

  const action = actor.actions.find((a) => a.id === request.actionId);
  if (!action) throw new Error(`${actor.name} does not know action "${request.actionId}".`);

  performAction(next, request, rng);
  next.status = computeStatus(next);
  if (next.status !== "active") return next;

  // With an AP economy, a turn can hold multiple actions: only advance once
  // the actor explicitly ends their turn, fails to flee, or runs out of AP.
  const actorAfter = findCombatant(next, request.actorId);
  const outOfAp = actorAfter.ap !== undefined && actorAfter.ap <= 0;
  const forcesTurnEnd = action.kind === "endTurn" || action.kind === "flee" || outOfAp;
  if (!forcesTurnEnd) return next;

  advanceTurn(next);
  return advancePastDeadOrEnemies(next, rng);
}
