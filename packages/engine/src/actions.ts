import type { AbilityKey } from "./abilities.js";
import type { DamageType } from "./damage.js";

export type ActionKind = "attack" | "heal" | "buff" | "defend" | "flee" | "save";
export type ActionTarget = "enemy" | "enemies" | "ally" | "self" | "none";

export interface CombatActionDef {
  id: string;
  name: string;
  description: string;
  kind: ActionKind;
  target: ActionTarget;
  /**
   * Ability score used for the to-hit roll and damage/healing modifier on
   * "attack"/"heal" actions. On a "save" action, this is the *caster's*
   * spellcasting ability, used to compute the save DC (8 + proficiency +
   * this ability's modifier), per the SRD's spell save DC formula.
   */
  ability: AbilityKey;
  /** For a "save" action, the ability the target rolls to resist it. */
  saveAbility?: AbilityKey;
  /**
   * Dice notation for damage or healing, e.g. "1d8". For attack/heal, the
   * relevant ability modifier is added on top by the combat engine,
   * matching SRD-style attack/damage rolls. For a save-based effect, the
   * dice are rolled once (even against multiple targets) with no ability
   * modifier added, matching SRD spell damage. Omitted for defend/flee.
   */
  dice?: string;
  /** The kind of damage an attack/save deals, for Resistance/Vulnerability/Immunity. */
  damageType?: DamageType;
  /** Flat magnitude for buff effects (e.g. +2 AC). */
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
}

export const BASIC_ATTACK: CombatActionDef = {
  id: "strike",
  name: "Strike",
  description: "A basic weapon attack against one enemy.",
  kind: "attack",
  target: "enemy",
  ability: "str",
  dice: "1d6",
  damageType: "slashing",
};

export const DEFEND_ACTION: CombatActionDef = {
  id: "defend",
  name: "Defend",
  description:
    "Focus on defense: until your next turn, attacks against you have Disadvantage, and you have " +
    "Advantage on attempts to flee.",
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
