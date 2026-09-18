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
