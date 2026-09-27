import { getAvatarById } from "./avatars";
import goblinSwBlackHair from "../assets/sprites/goblin-mannequin/south-west-black-hair.png";
import goblinSwRedHair from "../assets/sprites/goblin-mannequin/south-west-red-hair.png";
import direWolfSwDarkGrey from "../assets/sprites/direwolf-mannequin/south-west-dark-grey.png";
import goblinSlingerSwGreyHair from "../assets/sprites/goblin-slinger-mannequin/south-west-grey-hair-crossbow.png";

export interface SpriteAnimationSet {
  idle: string[];
  attack: string[];
  hurt: string[];
  die: string[];
  /**
   * Marks art that's already drawn facing south-west -- toward the party's
   * side of the stage from an enemy's position on the right -- so `UnitArt`
   * skips the usual "drawn facing right, mirror to face left" treatment
   * every other enemy sprite gets (see CombatScreen.css's `.cbt-unit-art-enemy`
   * rule). Undefined/false for every pre-existing monster sprite sheet.
   */
  preOriented?: boolean;
}

function sortedFrames(modules: Record<string, string>): string[] {
  return Object.keys(modules)
    .sort((a, b) => {
      const na = Number(a.match(/-(\d+)\.png$/)?.[1] ?? 0);
      const nb = Number(b.match(/-(\d+)\.png$/)?.[1] ?? 0);
      return na - nb;
    })
    .map((key) => modules[key]);
}

const elfWizardIdle = import.meta.glob("../assets/sprites/elf-wizard/idle-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const elfWizardAttack = import.meta.glob("../assets/sprites/elf-wizard/attack-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const elfWizardHurt = import.meta.glob("../assets/sprites/elf-wizard/hurt-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const elfWizardDie = import.meta.glob("../assets/sprites/elf-wizard/die-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/**
 * Party combat sprites, keyed by "raceId:classId". Only Elf Wizard has real
 * art so far (craftpix elf sprite sheets, contributed to the repo under
 * their original "elf-wizard" asset names, which is also this class's name
 * again after the Class Style Sheet reforge) — every other race/class
 * combination falls back to the generic portrait frame.
 */
const PARTY_SPRITES: Record<string, SpriteAnimationSet> = {
  "elf:wizard": {
    idle: sortedFrames(elfWizardIdle),
    attack: sortedFrames(elfWizardAttack),
    hurt: sortedFrames(elfWizardHurt),
    die: sortedFrames(elfWizardDie),
  },
};

export function getPartySprite(raceId?: string, classId?: string): SpriteAnimationSet | undefined {
  if (!raceId || !classId) return undefined;
  return PARTY_SPRITES[`${raceId}:${classId}`];
}

/**
 * A party member's own chosen Character Creation avatar (see game/avatars.ts),
 * wrapped as a single-frame "animation" set -- there's only ever one combat
 * pose per avatar today, no real attack/hurt/die art yet, so every state
 * just holds on that same frame (`CharacterSprite` already renders a
 * length-1 sequence statically, no looping). Uses the avatar's south-east
 * `combatImage` rather than its south-facing `image`, so the party member
 * visibly faces the enemies (to their right on the stage) instead of the
 * camera. Takes priority over `getPartySprite`'s raceId/classId table when a
 * combatant has both, since it's the player's own deliberate pick.
 */
export function getAvatarSprite(avatarId?: string): SpriteAnimationSet | undefined {
  const avatar = getAvatarById(avatarId);
  if (!avatar) return undefined;
  const frame = [avatar.combatImage ?? avatar.image];
  return { idle: frame, attack: frame, hurt: frame, die: frame };
}

/**
 * Wraps a single south-west-facing pose from the Drive's mannequin export
 * (Character/NPC Sprites) as a monster's combat sprite -- same pipeline and
 * single-static-frame treatment as a player's Character Creation avatar
 * (see `getAvatarSprite`): every state just holds on the one frame, since
 * there's no real attack/hurt/die art for these yet. South-west is the
 * correct native facing for an enemy standing on the stage's right side to
 * look toward the party on the left, so (unlike a "drawn facing right,
 * meant to be mirrored" sheet) these are marked `preOriented` to skip that
 * mirror -- see `SpriteAnimationSet.preOriented`'s own comment.
 */
function mannequinSet(image: string): SpriteAnimationSet {
  return { idle: [image], attack: [image], hurt: [image], die: [image], preOriented: true };
}

/**
 * Monster combat sprites, keyed by template id, with one or more visual
 * variants per template so multiple instances of the same monster in a
 * fight (e.g. two Goblin Raiders) don't look identical. Falls back to the
 * generic portrait frame for any template without art yet.
 *
 * `goblin` replaced the previous craftpix goblin-1/goblin-2 animated sprite
 * sheets outright with two mannequin poses, per the user's own call -- see
 * "Goblin South-West Poses" in the README and its own follow-up entry for
 * that pass. `direWolf` and `goblinSlinger` are both new: only one color/gear
 * variant exists in the Drive for each so far (Dark Grey; Grey Hair with a
 * crossbow).
 */
const MONSTER_SPRITE_VARIANTS: Record<string, SpriteAnimationSet[]> = {
  goblin: [mannequinSet(goblinSwBlackHair), mannequinSet(goblinSwRedHair)],
  direWolf: [mannequinSet(direWolfSwDarkGrey)],
  goblinSlinger: [mannequinSet(goblinSlingerSwGreyHair)],
};

/** Picks a variant deterministically from a combatant's own id, so it stays the same across re-renders. */
function pickVariant<T>(variants: T[], instanceId: string): T {
  const hash = [...instanceId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return variants[hash % variants.length];
}

export function getMonsterSprite(templateId?: string, instanceId?: string): SpriteAnimationSet | undefined {
  if (!templateId || !instanceId) return undefined;
  const variants = MONSTER_SPRITE_VARIANTS[templateId];
  if (!variants || variants.length === 0) return undefined;
  return pickVariant(variants, instanceId);
}
