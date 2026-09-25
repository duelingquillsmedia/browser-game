export const RESOURCE_KEYS = ["arcane", "divinity", "wylde", "rage"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export interface ResourceConfig {
  key: ResourceKey;
  name: string;
  /** Gained whenever this combatant uses their basic weapon Strike (a Warrior's Rage) — not their class's other actions. */
  gainOnBasicAttack?: number;
  /** Gained whenever this combatant is hit by an enemy's attack or save (a Warrior's Rage only). */
  gainOnBeingStruck?: number;
}

/**
 * The four class resource pools' identity and flavor name. Their actual
 * ceiling and regen rate are attribute-derived now (see stats.ts's
 * computeResourceMax/computeResourceRegenPerTurn) rather than fixed here —
 * Arcane/Divinity/Wylde behave like a classic MMO mana pool: full at the
 * start of a fight, spent on spells, trickling back a little each turn.
 * Rage is a builder resource instead — it starts empty and is earned by
 * dealing or taking blows, then spent on a Warrior's stronger moves.
 */
export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  arcane: { key: "arcane", name: "Arcane" },
  divinity: { key: "divinity", name: "Divinity" },
  wylde: { key: "wylde", name: "Wylde" },
  rage: { key: "rage", name: "Rage", gainOnBasicAttack: 15, gainOnBeingStruck: 15 },
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
