import { useEffect, useState } from "react";
import type { SpriteAnimationSet } from "../game/sprites";

// A literal union, not `keyof SpriteAnimationSet` -- that interface also carries the
// non-sequence `preOriented` flag, which isn't a playable animation state.
export type SpriteState = "idle" | "attack" | "hurt" | "die";

export interface CharacterSpriteProps {
  frames: SpriteAnimationSet;
  state: SpriteState;
}

const FPS = 12;

/**
 * Plays one frame sequence of a character's sprite sheet. "idle" loops
 * continuously; every other state plays once and holds on its last frame
 * (a held "die" pose, or a hit/attack pose until the next state change).
 */
export function CharacterSprite({ frames, state }: CharacterSpriteProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const sequence = frames[state];
    const loop = state === "idle";
    if (sequence.length <= 1) return;

    const id = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= sequence.length) return loop ? 0 : sequence.length - 1;
        return next;
      });
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, [frames, state]);

  const sequence = frames[state];
  const src = sequence[Math.min(index, sequence.length - 1)];
  return <img src={src} alt="" className="combatant-sprite-frame" />;
}
