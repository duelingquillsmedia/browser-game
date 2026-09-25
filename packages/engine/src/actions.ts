import type { AbilityKey } from "./abilities.js";
import type { DamageType } from "./damage.js";
import type { SchoolId } from "./schools.js";
import type { StatusApplication } from "./status.js";

export type ActionKind = "attack" | "heal" | "buff" | "defend" | "flee" | "save" | "endTurn";
export type ActionTarget = "enemy" | "enemies" | "ally" | "self" | "none";
/** Enemy-targeted attacks only: "single" hits just the chosen target, "line" hits every living enemy in its rank, "area" hits it plus its immediate rank-neighbors. */
export type TargetShape = "single" | "line" | "area";

export interface CombatActionDef {
  id: string;
  name: string;
  description: string;
  kind: ActionKind;
  target: ActionTarget;
  /**
   * Ability score this action scales off of. On "attack"/"heal", damage or
   * healing is `round(abilityScore * power * variance)` (see stats.ts). On
   * a "save" action, this is the *caster's* casting ability, weighed
   * against the target's `saveAbility` score to find the save's percent
   * chance of succeeding (see `computeSaveChance`).
   */
  ability: AbilityKey;
  /** For a "save" action, the ability the target's resistance is based on. */
  saveAbility?: AbilityKey;
  /**
   * Coefficient the scaling ability score is multiplied by to get this
   * action's damage or healing, before the random variance band is
   * applied. Omitted for defend/flee/buff.
   */
  power?: number;
  /** The kind of damage an attack/save deals, for Resistance/Vulnerability/Immunity. */
  damageType?: DamageType;
  /** Percentage-point magnitude for buff effects (e.g. +20 evasion). */
  effectValue?: number;
  /** A hard cap on total uses for the whole fight (e.g. Second Wind, Fireball). */
  usesPerCombat?: number;
  /**
   * Rounds that must pass after use before this action is available again
   * (independent of usesPerCombat, and reusable across multiple combats).
   * Keeps a strong attack from being every turn's obvious best pick —
   * without it, most classes only have 1-2 truly distinct choices before
   * combat degenerates into repeating the same action.
   */
  cooldown?: number;
  /** Resource cost (from the actor's class resource pool — Arcane, Divinity, Wylde, or Rage) to use this action. */
  resourceCost?: number;
  /**
   * Action Points spent from the actor's per-turn AP budget. Applies only to
   * `side: "party"` actors — monsters never consume AP, so their turns stay
   * single-action as before. Omitted defaults to 1 AP for a party actor; set
   * explicitly to 0 to make an action free (only END_TURN_ACTION does this).
   */
  apCost?: number;
  /** Flavor-only skill school (see schools.ts); never gates usability. */
  schoolId?: SchoolId;
  /** Enemy-targeted attacks only. Unused on "save" (already hits every enemy) and on ally/self targets. */
  targetShape?: TargetShape;
  /** A status effect this action additionally applies — to the attack/save target(s), or to the actor itself for a self buff/heal. */
  applyStatus?: StatusApplication;
}

export const BASIC_ATTACK: CombatActionDef = {
  id: "strike",
  name: "Strike",
  description: "A basic weapon attack against one enemy.",
  kind: "attack",
  target: "enemy",
  ability: "str",
  power: 1,
  damageType: "slashing",
};

export const DEFEND_ACTION: CombatActionDef = {
  id: "defend",
  name: "Defend",
  description: "Focus on defense: until your next turn, you're much harder to hit, and easier to flee with.",
  kind: "defend",
  target: "self",
  ability: "str",
};

export const FLEE_ACTION: CombatActionDef = {
  id: "flee",
  name: "Flee",
  description: "Attempt to escape the fight (a DEX saving throw against a moderate DC).",
  kind: "flee",
  target: "none",
  ability: "dex",
};

export const END_TURN_ACTION: CombatActionDef = {
  id: "end-turn",
  name: "End Turn",
  description: "Pass the rest of your turn, ending it immediately regardless of remaining AP.",
  kind: "endTurn",
  target: "none",
  ability: "str",
  apCost: 0,
};
