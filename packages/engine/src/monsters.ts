import type { AbilityScores } from "./abilities.js";
import type { CombatActionDef } from "./actions.js";
import { BASIC_ATTACK } from "./actions.js";
import type { DamageType } from "./damage.js";

export interface MonsterTemplate {
  id: string;
  name: string;
  description: string;
  abilityScores: AbilityScores;
  /** A curated stat-block number, sized to the same Vitality-scaled economy as player characters (see stats.ts). */
  maxHp: number;
  /** Flat evasion-percentage bonus from natural armor/hide; monsters carry no gear. */
  evasionBonus: number;
  /** XP awarded to the party on defeating one of these, hand-tuned against its relative HP/threat -- same curated-stat-block precedent as maxHp. */
  xpValue: number;
  actions: CombatActionDef[];
  /** None of Eridan's current frontier threats have any — reserved for future undead/elemental monsters. */
  damageResistances?: DamageType[];
  damageVulnerabilities?: DamageType[];
  damageImmunities?: DamageType[];
  /** Default battlefield rank when spawned; "front" if omitted (every pre-existing template keeps today's behavior). */
  rank?: "front" | "back";
}

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  evasionBonus: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  damageImmunities: DamageType[];
  rank: "front" | "back";
}

/**
 * A handful of low-level threats found around Eridan's frontier, enough to
 * populate an early single-player combat encounter. HP and action `power`
 * values are homebrew, hand-tuned against the new Vitality-scaled player
 * HP pools (roughly 150-250 at level 1) rather than derived from a formula
 * — monsters are curated stat blocks, not player character sheets.
 */
export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  goblin: {
    id: "goblin",
    name: "Goblin Raider",
    description: "A wiry raider out of the goblin port towns of Claw Bay, preying on travelers along the Tameless Shore.",
    abilityScores: { str: 8, dex: 14, vit: 10, int: 10, wis: 8, spi: 8 },
    maxHp: 75,
    evasionBonus: 0,
    xpValue: 45,
    actions: [
      {
        id: "shortsword",
        name: "Shortsword",
        description: "A quick, stabbing strike.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.3,
        damageType: "piercing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  direWolf: {
    id: "direWolf",
    name: "Dire Wolf",
    description: "A pack hunter grown huge on the game trails of Tiuv Forest.",
    abilityScores: { str: 15, dex: 15, vit: 13, int: 3, wis: 12, spi: 7 },
    maxHp: 120,
    evasionBonus: 0,
    xpValue: 70,
    actions: [
      {
        id: "bite",
        name: "Bite",
        description: "Powerful jaws snap at a single foe.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.4,
        damageType: "piercing",
      },
      {
        id: "claws",
        name: "Claws",
        description: "A raking swipe of the wolf's foreclaws.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 0.9,
        damageType: "slashing",
      },
    ],
  },
  orcMarauder: {
    id: "orcMarauder",
    name: "Orc Marauder",
    description: "A blooded warrior out of Collmhor Wood, where orcs and bugbears have fought over the old ruins for generations.",
    abilityScores: { str: 16, dex: 12, vit: 14, int: 9, wis: 9, spi: 10 },
    maxHp: 160,
    evasionBonus: 0,
    xpValue: 90,
    actions: [
      {
        id: "greataxe",
        name: "Greataxe",
        description: "A brutal two-handed swing.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.8,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  goblinSlinger: {
    id: "goblinSlinger",
    name: "Goblin Slinger",
    description: "A goblin skirmisher lobbing stones from behind its kin's shields, out of Claw Bay.",
    abilityScores: { str: 7, dex: 15, vit: 8, int: 9, wis: 9, spi: 8 },
    maxHp: 55,
    evasionBonus: 5,
    xpValue: 35,
    rank: "back",
    actions: [
      {
        id: "sling-stone",
        name: "Sling Stone",
        description: "A stone flung from a leather sling.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.1,
        damageType: "bludgeoning",
      },
    ],
  },
  orcShaman: {
    id: "orcShaman",
    name: "Orc Shaman",
    description: "A bone-adorned spellcaster chanting curses from behind Collmhor Wood's warbands.",
    abilityScores: { str: 9, dex: 10, vit: 11, int: 10, wis: 15, spi: 13 },
    maxHp: 110,
    evasionBonus: 0,
    xpValue: 65,
    rank: "back",
    actions: [
      {
        id: "cursed-bolt",
        name: "Cursed Bolt",
        description: "A crackling bolt of dark energy.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        power: 1.3,
        damageType: "necrotic",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
};

/** Matches the getClass/getItem/getRace pattern; throws on an unknown id. */
export function getMonsterTemplate(id: string): MonsterTemplate {
  const template = MONSTER_TEMPLATES[id];
  if (!template) throw new Error(`Unknown monster template: "${id}"`);
  return template;
}

export function createMonster(templateId: string, instanceId: string, rankOverride?: "front" | "back"): Monster {
  const template = MONSTER_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown monster template: "${templateId}"`);

  return {
    id: instanceId,
    templateId: template.id,
    name: template.name,
    abilityScores: template.abilityScores,
    maxHp: template.maxHp,
    hp: template.maxHp,
    evasionBonus: template.evasionBonus,
    actions: template.actions,
    actionUses: Object.fromEntries(
      template.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
    ),
    damageResistances: template.damageResistances ?? [],
    damageVulnerabilities: template.damageVulnerabilities ?? [],
    damageImmunities: template.damageImmunities ?? [],
    rank: rankOverride ?? template.rank ?? "front",
  };
}
