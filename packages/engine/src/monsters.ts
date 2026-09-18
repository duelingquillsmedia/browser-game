import type { AbilityScores } from "./abilities.js";
import { abilityModifier } from "./dice.js";
import type { CombatActionDef } from "./actions.js";
import { BASIC_ATTACK } from "./actions.js";

export interface MonsterTemplate {
  id: string;
  name: string;
  description: string;
  abilityScores: AbilityScores;
  hitDie: number;
  hitDiceCount: number;
  baseArmorClass: number;
  actions: CombatActionDef[];
}

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorClass: number;
  proficiencyBonus: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
}

/**
 * A handful of low-level threats found around Eridan's frontier, enough to
 * populate an early single-player combat encounter.
 */
export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  goblin: {
    id: "goblin",
    name: "Goblin Raider",
    description: "A wiry raider from the warrens beneath the Ashen Coast cliffs.",
    abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    hitDie: 6,
    hitDiceCount: 2,
    baseArmorClass: 13,
    actions: [
      {
        id: "shortsword",
        name: "Shortsword",
        description: "A quick, stabbing strike.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        dice: "1d6",
      },
      BASIC_ATTACK,
    ],
  },
  direWolf: {
    id: "direWolf",
    name: "Dire Wolf",
    description: "A pack hunter grown huge on the game trails of the Silverwood.",
    abilityScores: { str: 15, dex: 15, con: 13, int: 3, wis: 12, cha: 7 },
    hitDie: 8,
    hitDiceCount: 3,
    baseArmorClass: 13,
    actions: [
      {
        id: "bite",
        name: "Bite",
        description: "Powerful jaws snap at a single foe.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "2d4",
      },
    ],
  },
  orcMarauder: {
    id: "orcMarauder",
    name: "Orc Marauder",
    description: "A blooded warrior of the Bloodmere clans, out for plunder.",
    abilityScores: { str: 16, dex: 12, con: 14, int: 9, wis: 9, cha: 10 },
    hitDie: 8,
    hitDiceCount: 4,
    baseArmorClass: 14,
    actions: [
      {
        id: "greataxe",
        name: "Greataxe",
        description: "A brutal two-handed swing.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        dice: "1d12",
      },
      BASIC_ATTACK,
    ],
  },
};

export function createMonster(templateId: string, instanceId: string): Monster {
  const template = MONSTER_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown monster template: "${templateId}"`);

  const conMod = abilityModifier(template.abilityScores.con);
  const maxHp = (template.hitDie / 2 + 0.5 + conMod) * template.hitDiceCount;

  return {
    id: instanceId,
    templateId: template.id,
    name: template.name,
    abilityScores: template.abilityScores,
    maxHp: Math.max(1, Math.round(maxHp)),
    hp: Math.max(1, Math.round(maxHp)),
    armorClass: template.baseArmorClass,
    proficiencyBonus: 2,
    actions: template.actions,
    actionUses: Object.fromEntries(
      template.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
    ),
  };
}
