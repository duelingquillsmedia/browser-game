import type { RNG } from "../dice.js";

/**
 * Builds a deterministic RNG from a sequence of floats in [0, 1). Values are
 * cycled if the sequence runs out, so a short list can drive a longer combat.
 */
export function sequenceRng(values: number[]): RNG {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

/** Maps a desired 1-20 d20 result to the [0,1) float that produces it. */
export function forD20(result: number): number {
  return forDie(20, result);
}

/** Maps a desired 1..sides die result to the [0,1) float that produces it via rollDie. */
export function forDie(sides: number, result: number): number {
  return (result - 1) / sides + 0.5 / sides;
}

/**
 * Maps a percent-chance roll's desired result to the [0,1) float that
 * produces it, for combat.ts's `rng() * 100 < chance` checks (hit, crit,
 * save). Pass the value the "roll" should come up as: a roll of 0 beats
 * any positive chance (guaranteed success), a roll of 99.9 beats nothing
 * up to the engine's 99% hit-chance ceiling (guaranteed failure).
 */
export function forPercentRoll(roll: number): number {
  return roll / 100;
}

export const GUARANTEED_SUCCESS = forPercentRoll(0);
export const GUARANTEED_FAILURE = forPercentRoll(99.9);

/**
 * Maps a desired damage/heal variance multiplier (0.85-1.15) to the [0,1)
 * float that produces it via stats.ts's `randomVariance`. 1.0 (the
 * midpoint) keeps damage numbers clean and easy to hand-trace.
 */
export function forVariance(multiplier: number): number {
  return (multiplier - 0.85) / 0.3;
}
