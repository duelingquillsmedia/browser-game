import {
  createMonster,
  gainExperience,
  getMonsterTemplate,
  startCombat,
  toCombatant,
  type Character,
  type CombatActionDef,
  type CombatState,
} from "@eridan/engine";
import type { Encounter } from "./lore";
import { PARTY_START_HEX, hexDisk } from "./eridanMap";

/**
 * Backfills a fresh or pre-map-update character's World Map progress: party
 * starts at Ridgeton (day 1), with fog of war pre-revealed for a radius-5
 * disk around it — matching the design handoff's own starting reveal.
 */
export function withWorldMapStateIfMissing(character: Character): Character {
  if (character.worldMapState) return character;
  return {
    ...character,
    worldMapState: {
      day: 1,
      partyHexKey: PARTY_START_HEX,
      exploredHexKeys: [...hexDisk(PARTY_START_HEX, 5)],
    },
  };
}

/**
 * Solo play for now: the Misfit Six companion system (packages/engine's
 * companions.ts) is intentionally not wired up here. Any companions/
 * activePartyIds already saved on a character are left untouched below,
 * not read from and not written to, so the data survives if that system
 * comes back later.
 */
export function beginEncounter(character: Character, encounter: Encounter): CombatState {
  const party = [toCombatant(character, "party")];
  const enemies = encounter.monsters.map((m, index) =>
    toCombatant(createMonster(m.templateId, `${encounter.id}-${index}`, m.rank), "enemy")
  );
  return startCombat(party, enemies);
}

export interface CombatResult {
  character: Character;
  xpGained: number;
  levelsGained: number;
  newlyUnlockedActions: CombatActionDef[];
}

/**
 * Carries the player's ending HP back onto the persisted character, and on
 * a clean victory (a full party_won, not a flee or defeat) awards XP for
 * every enemy defeated in the fight.
 */
export function applyCombatResults(character: Character, combat: CombatState): CombatResult {
  const endingHp = new Map(combat.combatants.map((c) => [c.id, c.hp]));
  const woundedCharacter: Character = {
    ...character,
    hp: endingHp.get(character.id) ?? character.hp,
  };

  if (combat.status !== "party_won") {
    return { character: woundedCharacter, xpGained: 0, levelsGained: 0, newlyUnlockedActions: [] };
  }

  const baseXp = combat.combatants
    .filter((c) => c.side === "enemy" && c.templateId)
    .reduce((sum, c) => sum + getMonsterTemplate(c.templateId!).xpValue, 0);

  const {
    character: leveledCharacter,
    levelsGained,
    xpAwarded,
    newlyUnlockedActions,
  } = gainExperience(woundedCharacter, baseXp);

  return { character: leveledCharacter, xpGained: xpAwarded, levelsGained, newlyUnlockedActions };
}

/** Fully heals the player — used when resting at the town hub. */
export function restCharacter(character: Character): Character {
  return {
    ...character,
    hp: character.maxHp,
  };
}
