import { rolledAssignment, standardArrayAssignment } from "./abilities.js";
import type { RNG } from "./dice.js";
import { getClass } from "./classes.js";
import { createCharacter, type Character } from "./character.js";

export interface CompanionTemplate {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  bio: string;
}

/**
 * The Misfit Six — the main cast of the Ridgeton Tales. Every player character
 * adventures alongside all of them, choosing up to three (plus themselves) to
 * bring on any given mission.
 */
export const MISFIT_SIX: CompanionTemplate[] = [
  {
    id: "magnus",
    name: "Magnus",
    raceId: "dwarf",
    classId: "wizard",
    bio: "A learned wizard who studied at the Academy Arcanum in Eldrin City, Magnus reasons his way through danger alongside his hot-headed brother Magnar in the Tameless Shore.",
  },
  {
    id: "magnar",
    name: "Magnar",
    raceId: "dwarf",
    classId: "warrior",
    bio: "A hot-headed dwarf who lives for combat, charging headlong into battle without a thought for consequences. Once of the mercenary company the Rising Suns, he now adventures at his brother Magnus's side.",
  },
  {
    id: "keldos",
    name: "Kel'dos",
    raceId: "elf",
    classId: "cleric",
    bio: "An empathetic follower of Sioch, God of Wisdom, who cares for friend and stranger alike. He searches for his missing father, Cassemir, also a Cleric of Sioch.",
  },
  {
    id: "dondalian",
    name: "Dondalian",
    raceId: "elf",
    classId: "warrior",
    bio: "Courageously oblivious, Dondalian believes himself the finest swordsman in Eridan. He's on his Sojourn from the Sea of Obsidian Ice to become a Warden of the Winter Court.",
  },
  {
    id: "telerek",
    name: "Telerek",
    raceId: "elf",
    classId: "rogue",
    bio: "A cunning, suspicious rogue who trusts only the Misfit Six. He works for his uncle Varloc at Ridgeton's lumber mill, often alongside his cousin Valeriek.",
  },
  {
    id: "valeriek",
    name: "Valeriek",
    raceId: "elf",
    classId: "druid",
    bio: "Aloof yet powerful, Valeriek hails from the Bastion within the great forest of Graliel's Bulwark. She left home young and found her closest friend and cousin, Telerek.",
  },
];

export function getCompanionTemplate(id: string): CompanionTemplate {
  const template = MISFIT_SIX.find((c) => c.id === id);
  if (!template) throw new Error(`Unknown companion: "${id}"`);
  return template;
}

/** A mission party is a player plus up to three companions. */
export const MAX_PARTY_SIZE = 4;

/**
 * Builds a full Character for a Misfit Six companion. Each one offers the
 * same choice as a player at creation: the class's standard-array default,
 * or a classic 4d6-drop-lowest roll.
 */
export function createCompanion(companionId: string, options?: { useRolledStats?: boolean; rng?: RNG }): Character {
  const template = getCompanionTemplate(companionId);
  const primaryAbility = getClass(template.classId).primaryAbility;
  const abilityScores = options?.useRolledStats
    ? rolledAssignment(primaryAbility, options.rng)
    : standardArrayAssignment(primaryAbility);
  return createCharacter({
    id: template.id,
    name: template.name,
    raceId: template.raceId,
    classId: template.classId,
    baseAbilityScores: abilityScores,
  });
}

/** Generates every Misfit Six companion (with class-default stats) for a player who doesn't have them yet. A no-op past the first call. */
export function ensureCompanionRoster(character: Character): Character {
  if (character.companions) return character;
  const companions = Object.fromEntries(MISFIT_SIX.map((template) => [template.id, createCompanion(template.id)]));
  return { ...character, companions };
}

/** Re-rolls (or resets to class default) one already-generated companion's ability scores. */
export function rerollCompanion(
  character: Character,
  companionId: string,
  options?: { useRolledStats?: boolean; rng?: RNG }
): Character {
  getCompanionTemplate(companionId); // throws for an unknown id
  const companions = { ...(character.companions ?? {}), [companionId]: createCompanion(companionId, options) };
  return { ...character, companions };
}

/** Sets the mission party: up to `MAX_PARTY_SIZE - 1` companion ids, alongside the player themselves. */
export function setActiveParty(character: Character, companionIds: string[]): Character {
  if (companionIds.length > MAX_PARTY_SIZE - 1) {
    throw new Error(`A party can have at most ${MAX_PARTY_SIZE} members, including yourself.`);
  }
  const unknownId = companionIds.find((id) => !MISFIT_SIX.some((template) => template.id === id));
  if (unknownId) throw new Error(`Unknown companion: "${unknownId}"`);
  return { ...character, activePartyIds: [...companionIds] };
}
