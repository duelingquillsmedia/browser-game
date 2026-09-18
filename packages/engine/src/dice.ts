/**
 * Dice notation like "1d8", "2d6+3". RNG is injectable so combat is
 * deterministic and testable, and so a future server can seed it per-fight.
 */
export type RNG = () => number; // returns a float in [0, 1)

export function rollDie(sides: number, rng: RNG = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  notation: string;
}

const DICE_PATTERN = /^(\d+)d(\d+)([+-]\d+)?$/i;

export function rollDice(notation: string, rng: RNG = Math.random): RollResult {
  const match = DICE_PATTERN.exec(notation.trim());
  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}"`);
  }
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  const rolls = Array.from({ length: count }, () => rollDie(sides, rng));
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return { total, rolls, modifier, notation };
}

export function rollD20(rng: RNG = Math.random): number {
  return rollDie(20, rng);
}

/** Rolls a d20 twice and keeps the higher (advantage) or lower (disadvantage). */
export function rollD20WithEdge(
  edge: "advantage" | "disadvantage" | "none",
  rng: RNG = Math.random
): number {
  if (edge === "none") return rollD20(rng);
  const a = rollD20(rng);
  const b = rollD20(rng);
  return edge === "advantage" ? Math.max(a, b) : Math.min(a, b);
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
