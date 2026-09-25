import type { AbilityKey, AbilityScores } from "./abilities.js";

/**
 * Homebrew attribute -> derived-stat ratios, replacing the old SRD hit-die/
 * ability-modifier math. None of this comes from the Aetherwyn design
 * handoffs -- their own numbers (Health = 100 + VIT*10 + class bonus, a
 * caster's mana = 80 + SPI*8 + INT*4) are explicitly marked as placeholders
 * in those handoffs' own READMEs ("Data (placeholders)... Move them into
 * the game's data definitions"). We kept the two formulas that *are*
 * spelled out there (Health, caster mana) and invented the rest ourselves
 * to fit the same big, MMO-scale numbers.
 */

/** Bonus max HP each class adds on top of the shared Vitality-based baseline. */
export const CLASS_HEALTH_BONUS: Record<string, number> = {
  cleric: 30,
  warrior: 60,
  rogue: 20,
  mage: 0,
  druid: 30,
};

/** Health = 100 base + 10 per point of Vitality + a class's own bonus (per the Character Creation handoff). */
export function computeMaxHealth(abilityScores: AbilityScores, classId: string): number {
  return 100 + abilityScores.vit * 10 + (CLASS_HEALTH_BONUS[classId] ?? 0);
}

/**
 * Fixed resource pool sizes per the Class Style Sheet, for the five classes
 * whose pool is a small generator/spender integer (built almost entirely by
 * landing Basic Attacks -- see resources.ts) rather than an ability-scaled
 * mana bar.
 */
const FIXED_RESOURCE_POOL: Record<string, number> = {
  warrior: 100,
  soldier: 10,
  cleric: 5,
  ranger: 5,
  rogue: 30,
};

/**
 * Wylde and Arcana are the sheet's two exceptions: "100 point base pool,
 * scales with Wisdom/Intellect" -- still mana-like (full at the start of a
 * fight), just also topped up by Basic Attacks like every other pool now.
 * The sheet gives no scaling formula, so the +6-per-point coefficient here
 * is homebrew, sized to land in the same big MMO-scale range as the old
 * caster-mana formula this replaces.
 */
const SCALING_RESOURCE_ABILITY: Record<string, AbilityKey> = {
  druid: "wis",
  wizard: "int",
};
const SCALING_RESOURCE_BASE = 100;
const SCALING_RESOURCE_PER_POINT = 6;

/** A class's resource pool ceiling, or undefined for a class with no pool. */
export function computeResourceMax(abilityScores: AbilityScores, classId: string): number | undefined {
  if (classId in FIXED_RESOURCE_POOL) return FIXED_RESOURCE_POOL[classId];
  const scalingAbility = SCALING_RESOURCE_ABILITY[classId];
  if (scalingAbility) return SCALING_RESOURCE_BASE + abilityScores[scalingAbility] * SCALING_RESOURCE_PER_POINT;
  return undefined;
}

/** A fresh combatant's resource pool: full for a mana-like pool (Wylde/Arcana), empty for a generator/spender pool (everyone else). */
export function computeResourceStart(abilityScores: AbilityScores, classId: string): number | undefined {
  const max = computeResourceMax(abilityScores, classId);
  if (max === undefined) return undefined;
  return classId in FIXED_RESOURCE_POOL ? 0 : max;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Percent chance an incoming hit is dodged outright, from the defender's own Dexterity (per "DEX: Evasion and critical strikes"). */
export function computeEvasion(dexScore: number): number {
  return clampPercent(dexScore * 1.5);
}

/** Percent chance an attacker's hit lands as a critical, from their own Dexterity. */
export function computeCritChance(dexScore: number): number {
  return clampPercent(5 + dexScore * 1.2);
}

/** Baseline chance an attack connects before the defender's evasion is subtracted. */
export const BASE_HIT_CHANCE = 90;

/** Floor/ceiling so evasion or a buff can never make a hit either guaranteed or impossible. */
export const MIN_HIT_CHANCE = 10;
export const MAX_HIT_CHANCE = 99;

/** Damage/healing multiplier on a critical hit (per the Combat handoff: "×1.5 on a crit"). */
export const CRIT_MULTIPLIER = 1.5;

/** Random variance band applied to every damage/heal roll, replacing dice: 85%-115% of the ability-scaled base. */
export function randomVariance(rng: () => number): number {
  return 0.85 + rng() * 0.3;
}

/**
 * A save's percent chance of succeeding: an opposed check between the
 * target's save-ability score and the caster's own casting-ability score,
 * centered on 50% when they're equal. Replaces the SRD's d20-vs-DC roll.
 */
export function computeSaveChance(targetScore: number, casterScore: number): number {
  return clampPercent(50 + (targetScore - casterScore) * 2);
}

/**
 * Attack Power: a WoW-style headline combat stat converted from whichever
 * ability score governs the equipped weapon, shown on the character sheet.
 * It only ever feeds a flat bonus onto that weapon's own damage roll (see
 * `computeAttackPowerBonusDamage`) -- class abilities (Slash, Firebolt...)
 * scale off the raw ability score directly via their own `power`
 * coefficient and are untouched by this.
 */
export function computeAttackPower(abilityScore: number): number {
  return abilityScore * 2;
}

/** How much of a point of Attack Power becomes a point of flat bonus damage per hit. */
const ATTACK_POWER_DAMAGE_COEFFICIENT = 0.15;

/** Converts Attack Power into the flat bonus damage added on top of a weapon's own min-max roll. */
export function computeAttackPowerBonusDamage(attackPower: number): number {
  return Math.round(attackPower * ATTACK_POWER_DAMAGE_COEFFICIENT);
}
