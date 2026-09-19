export interface SpriteAnimationSet {
  idle: string[];
  attack: string[];
  hurt: string[];
  die: string[];
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
 * art so far (craftpix elf sprite sheets, contributed to the repo) — every
 * other race/class combination falls back to the generic portrait frame.
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
