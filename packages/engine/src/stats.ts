import type { AbilityScores } from "./abilities.js";

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

/** Classes whose resource pool is a caster-style mana bar, scaling with Spirit and Intellect. */
const CASTER_RESOURCE_CLASSES = new Set(["mage", "cleric", "druid"]);

/** A class's resource pool ceiling, or undefined for a class with no pool (Rogue). */
export function computeResourceMax(abilityScores: AbilityScores, classId: string): number | undefined {
  if (CASTER_RESOURCE_CLASSES.has(classId)) {
    return 80 + abilityScores.spi * 8 + abilityScores.int * 4;
  }
  // Warrior's Rage is a flat builder/spender pool (per the Combat handoff's own
  // placeholder, which shows Rage/Energy simply as "100" with no formula).
  if (classId === "warrior") return 100;
  return undefined;
}

/** A fresh combatant's resource pool: full for a mana-style caster, empty for a builder like Rage. */
export function computeResourceStart(abilityScores: AbilityScores, classId: string): number | undefined {
  const max = computeResourceMax(abilityScores, classId);
  if (max === undefined) return undefined;
  return classId === "warrior" ? 0 : max;
}

/** A caster's mana trickles back at roughly this fraction of its ceiling each of their own turns. */
const RESOURCE_REGEN_FRACTION = 0.08;

/** Per-turn resource regen: a percentage of the ceiling for mana-style pools, 0 for a builder like Rage (which only grows by fighting). */
export function computeResourceRegenPerTurn(abilityScores: AbilityScores, classId: string): number {
  if (!CASTER_RESOURCE_CLASSES.has(classId)) return 0;
  const max = computeResourceMax(abilityScores, classId) ?? 0;
  return Math.round(max * RESOURCE_REGEN_FRACTION);
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
