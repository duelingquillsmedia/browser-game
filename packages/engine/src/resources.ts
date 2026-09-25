export const RESOURCE_KEYS = ["arcane", "divinity", "wylde", "rage"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export interface ResourceConfig {
  key: ResourceKey;
  name: string;
  max: number;
  /** What a fresh combatant's pool is set to at the start of a fight. */
  start: number;
  /** Restored at the start of each of this combatant's own turns — a mana-style trickle. 0 for a builder resource like Rage. */
  regenPerTurn: number;
  /** Gained whenever this combatant uses their basic weapon Strike (a Warrior's Rage) — not their class's other actions. */
  gainOnBasicAttack?: number;
  /** Gained whenever this combatant is hit by an enemy's attack or save (a Warrior's Rage only). */
  gainOnBeingStruck?: number;
}

/**
 * The four class resource pools. Arcane/Divinity/Wylde behave like a classic
 * MMO mana pool: full at the start of a fight, spent on spells, trickling
 * back a little each turn. Rage is a builder resource instead — it starts
 * empty and is earned by dealing or taking blows, then spent on a Warrior's
 * stronger moves.
 */
export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  arcane: { key: "arcane", name: "Arcane", max: 20, start: 20, regenPerTurn: 2 },
  divinity: { key: "divinity", name: "Divinity", max: 20, start: 20, regenPerTurn: 2 },
  wylde: { key: "wylde", name: "Wylde", max: 20, start: 20, regenPerTurn: 2 },
  rage: { key: "rage", name: "Rage", max: 20, start: 0, regenPerTurn: 0, gainOnBasicAttack: 3, gainOnBeingStruck: 3 },
};

/** Which resource pool (if any) a class draws its abilities from. */
export const CLASS_RESOURCE: Partial<Record<string, ResourceKey>> = {
  mage: "arcane",
  cleric: "divinity",
  druid: "wylde",
  warrior: "rage",
};

/** The resource config for a class, or undefined if that class doesn't use one (yet). */
export function getClassResource(classId: string | undefined): ResourceConfig | undefined {
  if (!classId) return undefined;
  const key = CLASS_RESOURCE[classId];
  return key ? RESOURCE_CONFIGS[key] : undefined;
}
