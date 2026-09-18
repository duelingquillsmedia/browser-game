import { ABILITY_KEYS, type AbilityKey, type AbilityScores } from "./abilities.js";
import { abilityModifier } from "./dice.js";
import { getRace } from "./races.js";
import { getClass } from "./classes.js";
import { BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION, type CombatActionDef } from "./actions.js";

export interface Character {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorClass: number;
  proficiencyBonus: number;
  actions: CombatActionDef[];
  /** Tracks remaining uses for actions with `usesPerCombat`; reset at combat start. */
  actionUses: Record<string, number>;
}

export function abilityMod(character: Character, key: AbilityKey): number {
  return abilityModifier(character.abilityScores[key]);
}

export function initiativeModifier(character: Character): number {
  return abilityMod(character, "dex");
}

export interface CreateCharacterOptions {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  baseAbilityScores: AbilityScores;
  level?: number;
}

export function createCharacter(options: CreateCharacterOptions): Character {
  const race = getRace(options.raceId);
  const cls = getClass(options.classId);
  const level = options.level ?? 1;

  const abilityScores = { ...options.baseAbilityScores };
  for (const key of ABILITY_KEYS) {
    abilityScores[key] += race.abilityBonuses[key] ?? 0;
  }

  const conMod = abilityModifier(abilityScores.con);
  const maxHp = cls.hitDie + conMod + (level - 1) * (Math.ceil(cls.hitDie / 2) + 1 + conMod);
  const dexMod = abilityModifier(abilityScores.dex);

  const actions = [...cls.actions, BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION].filter(
    (action, index, all) => all.findIndex((a) => a.id === action.id) === index
  );

  return {
    id: options.id,
    name: options.name,
    raceId: race.id,
    classId: cls.id,
    level,
    abilityScores,
    maxHp,
    hp: maxHp,
    armorClass: 10 + dexMod,
    proficiencyBonus: 2 + Math.floor((level - 1) / 4),
    actions,
    actionUses: Object.fromEntries(
      actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
    ),
  };
}
