import { rollDie, type RNG } from "./dice.js";

export const ABILITY_KEYS = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export type AbilityScores = Record<AbilityKey, number>;

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** The SRD "standard array", assignable freely across the six abilities. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export function baseAbilityScores(): AbilityScores {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
}

/** Assigns the standard array to the six abilities, giving the highest score to `primaryAbility`. */
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

/** Rolls six 4d6-drop-lowest scores and assigns the highest to `primaryAbility`, same priority order as the standard array. */
export function rolledAssignment(primaryAbility: AbilityKey, rng: RNG = Math.random): AbilityScores {
  const rolled = Array.from({ length: 6 }, () => rollAbilityScore(rng)).sort((a, b) => b - a);
  const order: AbilityKey[] = [primaryAbility, ...ABILITY_KEYS.filter((k) => k !== primaryAbility)];
  const scores = {} as AbilityScores;
  order.forEach((key, i) => {
    scores[key] = rolled[i];
  });
  return scores;
}
