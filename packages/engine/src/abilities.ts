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
