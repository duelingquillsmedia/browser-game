import { createMonster, startCombat, toCombatant, type Character, type CombatState } from "@eridan/engine";
import type { Encounter } from "./lore";

export function beginEncounter(character: Character, encounter: Encounter): CombatState {
  const party = [toCombatant(character, "party")];
  const enemies = encounter.monsterTemplateIds.map((templateId, index) =>
    toCombatant(createMonster(templateId, `${encounter.id}-${index}`), "enemy")
  );
  return startCombat(party, enemies);
}
