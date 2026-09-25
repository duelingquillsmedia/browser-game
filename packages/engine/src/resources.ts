export const RESOURCE_KEYS = ["fury", "expertise", "prayer", "focus", "cunning", "wylde", "arcana"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export interface ResourceConfig {
  key: ResourceKey;
  name: string;
  /** Gained whenever this combatant lands their Basic Attack (hit or miss). */
  gainOnBasicAttack: number;
  /** Gained instead of `gainOnBasicAttack` when the Basic Attack crits. */
  gainOnBasicAttackCrit: number;
  /** Warrior's Furious passive only: fraction of incoming damage taken converted to resource. */
  gainOnBeingStruckPercent?: number;
}

/**
 * Per the Class Style Sheet, every class's resource is now a generator/
 * spender pool: the Basic Attack costs nothing and builds it (more on a
 * crit), and every other action spends it. Five of the seven pools are
 * small fixed integers that start empty each fight (Fury, Expertise,
 * Prayer, Focus, Cunning) -- a sharp departure from the old "big mana pool"
 * feel. Wylde and Arcana are the two exceptions: they're still "like mana
 * from traditional MMOs" per the sheet's own wording, so they start full
 * and scale with an ability score (see stats.ts's computeResourceMax) --
 * they just *also* pick up extra resource from landing the Basic Attack,
 * same as everyone else.
 */
export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  fury: { key: "fury", name: "Fury", gainOnBasicAttack: 15, gainOnBasicAttackCrit: 30, gainOnBeingStruckPercent: 0.25 },
  expertise: { key: "expertise", name: "Expertise", gainOnBasicAttack: 1, gainOnBasicAttackCrit: 2 },
  prayer: { key: "prayer", name: "Prayer", gainOnBasicAttack: 1, gainOnBasicAttackCrit: 2 },
  focus: { key: "focus", name: "Focus", gainOnBasicAttack: 1, gainOnBasicAttackCrit: 2 },
  cunning: { key: "cunning", name: "Cunning", gainOnBasicAttack: 5, gainOnBasicAttackCrit: 15 },
  wylde: { key: "wylde", name: "Wylde", gainOnBasicAttack: 10, gainOnBasicAttackCrit: 20 },
  arcana: { key: "arcana", name: "Arcana", gainOnBasicAttack: 10, gainOnBasicAttackCrit: 20 },
};

/** Which resource pool a class draws its abilities from. Every class has exactly one now. */
export const CLASS_RESOURCE: Partial<Record<string, ResourceKey>> = {
  warrior: "fury",
  soldier: "expertise",
  cleric: "prayer",
  ranger: "focus",
  rogue: "cunning",
  druid: "wylde",
  wizard: "arcana",
};

/** The resource config for a class, or undefined if that class doesn't use one (yet). */
export function getClassResource(classId: string | undefined): ResourceConfig | undefined {
  if (!classId) return undefined;
  const key = CLASS_RESOURCE[classId];
  return key ? RESOURCE_CONFIGS[key] : undefined;
}
