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

// import.meta.glob patterns must be static string literals (wildcards are fine, JS
// variables aren't), so each monster's frames are globbed together across every
// variant folder and then split apart below by which folder they came from.
const goblinIdle = import.meta.glob("../assets/sprites/goblin-*/idle-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const goblinAttack = import.meta.glob("../assets/sprites/goblin-*/attack-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const goblinHurt = import.meta.glob("../assets/sprites/goblin-*/hurt-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const goblinDie = import.meta.glob("../assets/sprites/goblin-*/die-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Splits a glob result keyed by full path into one bucket per immediate parent folder. */
function groupByDir(modules: Record<string, string>): Record<string, Record<string, string>> {
  const groups: Record<string, Record<string, string>> = {};
  for (const [path, url] of Object.entries(modules)) {
    const dir = path.match(/\/([^/]+)\/[^/]+$/)?.[1];
    if (!dir) continue;
    (groups[dir] ??= {})[path] = url;
  }
  return groups;
}

const goblinIdleByDir = groupByDir(goblinIdle);
const goblinAttackByDir = groupByDir(goblinAttack);
const goblinHurtByDir = groupByDir(goblinHurt);
const goblinDieByDir = groupByDir(goblinDie);

function goblinSet(dir: string): SpriteAnimationSet {
  return {
    idle: sortedFrames(goblinIdleByDir[dir] ?? {}),
    attack: sortedFrames(goblinAttackByDir[dir] ?? {}),
    hurt: sortedFrames(goblinHurtByDir[dir] ?? {}),
    die: sortedFrames(goblinDieByDir[dir] ?? {}),
  };
}

/**
 * Monster combat sprites, keyed by template id, with one or more visual
 * variants per template so multiple instances of the same monster in a
 * fight (e.g. two Goblin Raiders) don't look identical. Falls back to the
 * generic portrait frame for any template without art yet.
 */
const MONSTER_SPRITE_VARIANTS: Record<string, SpriteAnimationSet[]> = {
  goblin: [goblinSet("goblin-1"), goblinSet("goblin-2")],
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
