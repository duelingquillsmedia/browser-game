import { createMonster, startCombat, toCombatant, type Character, type CombatState } from "@eridan/engine";
import type { Encounter } from "./lore";

/** The player plus whichever companions they've set as their active mission party. */
export function activePartyMembers(character: Character): Character[] {
  const companions = character.companions ?? {};
  const activeCompanions = (character.activePartyIds ?? [])
    .map((id) => companions[id])
    .filter((companion): companion is Character => Boolean(companion));
  return [character, ...activeCompanions];
}

export function beginEncounter(character: Character, encounter: Encounter): CombatState {
  const party = activePartyMembers(character).map((member) => toCombatant(member, "party"));
  const enemies = encounter.monsterTemplateIds.map((templateId, index) =>
    toCombatant(createMonster(templateId, `${encounter.id}-${index}`), "enemy")
  );
  return startCombat(party, enemies);
}

/**
 * Carries each fighter's ending HP back onto the persisted character: the
 * player's own HP, plus every companion who fought this mission (any
 * companion NOT in the active party — or not generated yet — simply keeps
 * whatever HP they already had).
 */
export function applyCombatResults(character: Character, combat: CombatState): Character {
  const endingHp = new Map(combat.combatants.map((c) => [c.id, c.hp]));
  const companions = character.companions;
  return {
    ...character,
    hp: endingHp.get(character.id) ?? character.hp,
    companions: companions
      ? Object.fromEntries(
          Object.entries(companions).map(([id, companion]) => [
            id,
            { ...companion, hp: endingHp.get(id) ?? companion.hp },
          ])
        )
      : companions,
  };
}

/** Fully heals the player and every generated companion — used when resting at the town hub. */
export function restParty(character: Character): Character {
  const companions = character.companions;
  return {
    ...character,
    hp: character.maxHp,
    companions: companions
      ? Object.fromEntries(
          Object.entries(companions).map(([id, companion]) => [id, { ...companion, hp: companion.maxHp }])
        )
      : companions,
  };
}
