import type { AbilityKey } from "./abilities.js";

export type ActionKind = "attack" | "heal" | "buff" | "defend" | "flee";
export type ActionTarget = "enemy" | "ally" | "self" | "none";

export interface CombatActionDef {
  id: string;
  name: string;
  description: string;
  kind: ActionKind;
  target: ActionTarget;
  /** Ability score used for the to-hit roll and damage/healing modifier. */
  ability: AbilityKey;
  /**
   * Dice notation for damage or healing, e.g. "1d8". The relevant ability
   * modifier is added on top by the combat engine, matching SRD-style
   * attack/damage rolls. Omitted for defend/flee/buff.
   */
  dice?: string;
  /** Flat magnitude for buff/defend effects (e.g. +2 AC). */
  effectValue?: number;
  /** Once-per-combat actions (e.g. Second Wind) are marked with a cooldown. */
  usesPerCombat?: number;
}

export const BASIC_ATTACK: CombatActionDef = {
  id: "strike",
  name: "Strike",
  description: "A basic weapon attack against one enemy.",
  kind: "attack",
  target: "enemy",
  ability: "str",
  dice: "1d6",
};

export const DEFEND_ACTION: CombatActionDef = {
  id: "defend",
  name: "Defend",
  description: "Brace for the enemy's turn, gaining +2 AC until your next turn.",
  kind: "defend",
  target: "self",
  ability: "str",
  effectValue: 2,
};

export const FLEE_ACTION: CombatActionDef = {
  id: "flee",
  name: "Flee",
  description: "Attempt to escape the fight (a DEX check against a moderate DC).",
  kind: "flee",
  target: "none",
  ability: "dex",
};
