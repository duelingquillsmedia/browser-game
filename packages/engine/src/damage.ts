/** The SRD's damage types (see "Damage and Healing" / Rules Glossary). */
export const DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

export interface DamageProfile {
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  damageImmunities: DamageType[];
}

/**
 * Applies Resistance/Vulnerability/Immunity to an already-computed damage
 * amount, in the SRD's specified order: immunity zeroes it out, otherwise
 * resistance halves (rounding down) and then vulnerability doubles.
 */
export function applyDamageModifiers(amount: number, type: DamageType, profile: DamageProfile): number {
  if (profile.damageImmunities.includes(type)) return 0;
  let result = amount;
  if (profile.damageResistances.includes(type)) result = Math.floor(result / 2);
  if (profile.damageVulnerabilities.includes(type)) result *= 2;
  return result;
}
