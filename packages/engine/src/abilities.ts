import { rollDie, type RNG } from "./dice.js";

export const ABILITY_KEYS = [
  "str",
  "dex",
  "vit",
  "int",
  "wis",
] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export type AbilityScores = Record<AbilityKey, number>;

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  vit: "Vitality",
  int: "Intellect",
  wis: "Wisdom",
};

/** The SRD "standard array", assignable freely across the five abilities. Still used to roll companion stats. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10] as const;

export function baseAbilityScores(): AbilityScores {
  return { str: 10, dex: 10, vit: 10, int: 10, wis: 10 };
}

/** Assigns the standard array to the five abilities, giving the highest score to `primaryAbility`. */
export function standardArrayAssignment(primaryAbility: AbilityKey): AbilityScores {
  const order: AbilityKey[] = [primaryAbility, ...ABILITY_KEYS.filter((k) => k !== primaryAbility)];
  const scores = {} as AbilityScores;
  order.forEach((key, i) => {
    scores[key] = STANDARD_ARRAY[i];
  });
  return scores;
}

/** Classic "4d6, drop the lowest die" ability score roll. */
export function rollAbilityScore(rng: RNG = Math.random): number {
  const rolls = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

/** Rolls one 4d6-drop-lowest score per ability and assigns the highest to `primaryAbility`, same priority order as the standard array. */
export function rolledAssignment(primaryAbility: AbilityKey, rng: RNG = Math.random): AbilityScores {
  const rolled = Array.from({ length: ABILITY_KEYS.length }, () => rollAbilityScore(rng)).sort((a, b) => b - a);
  const order: AbilityKey[] = [primaryAbility, ...ABILITY_KEYS.filter((k) => k !== primaryAbility)];
  const scores = {} as AbilityScores;
  order.forEach((key, i) => {
    scores[key] = rolled[i];
  });
  return scores;
}
