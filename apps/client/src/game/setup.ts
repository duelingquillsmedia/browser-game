import {
  computeResourceStart,
  createMonster,
  gainExperience,
  getMonsterTemplate,
  startCombat,
  toCombatant,
  type Character,
  type CombatActionDef,
  type CombatState,
} from "@eridan/engine";
import { HOME_TOWN_NAME, type Encounter } from "./lore";
import { PARTY_START_HEX, hexDisk, POI_BY_HEX } from "./eridanMap";

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

/** The named town/landmark at a character's current World Map hex, for display (e.g. Character Select's Location tile). Falls back to the home town for a character standing on an un-named hex. */
export function currentLocationName(character: Character): string {
  const hexKey = character.worldMapState?.partyHexKey ?? PARTY_START_HEX;
  return POI_BY_HEX[hexKey]?.name ?? HOME_TOWN_NAME;
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
  goldGained: number;
  levelsGained: number;
  newlyUnlockedActions: CombatActionDef[];
}

/**
 * Carries the player's ending HP back onto the persisted character, and on
 * a clean victory (a full party_won, not a flee or defeat) awards XP and
 * gold for every enemy defeated in the fight.
 */
export function applyCombatResults(character: Character, combat: CombatState): CombatResult {
  const endingHp = new Map(combat.combatants.map((c) => [c.id, c.hp]));
  const woundedCharacter: Character = {
    ...character,
    hp: endingHp.get(character.id) ?? character.hp,
  };

  if (combat.status !== "party_won") {
    return { character: woundedCharacter, xpGained: 0, goldGained: 0, levelsGained: 0, newlyUnlockedActions: [] };
  }

  const defeated = combat.combatants
    .filter((c) => c.side === "enemy" && c.templateId)
    .map((c) => getMonsterTemplate(c.templateId!));
  const baseXp = defeated.reduce((sum, t) => sum + t.xpValue, 0);
  const goldGained = defeated.reduce((sum, t) => sum + t.goldValue, 0);

  const {
    character: leveledCharacter,
    levelsGained,
    xpAwarded,
    newlyUnlockedActions,
  } = gainExperience(woundedCharacter, baseXp);

  const rewardedCharacter: Character = { ...leveledCharacter, gold: leveledCharacter.gold + goldGained };

  return { character: rewardedCharacter, xpGained: xpAwarded, goldGained, levelsGained, newlyUnlockedActions };
}

/**
 * Fully restores HP, and resets the resource pool to its own fresh-fight
 * starting value — used when resting at a settlement's Inn (see
 * WorldMapScreen's Town Hub) or the Home screen. That's a full refill for a
 * mana-like pool (Wylde/Arcana: Druid/Wizard), but zero for a generator/
 * spender pool (Fury/Expertise/Prayer/Focus/Cunning: Warrior/Soldier/
 * Cleric/Ranger/Rogue) — those are meant to start every fight empty and get
 * built up by Basic Attacks, not banked between fights via rest (see
 * `computeResourceStart`'s own doc comment).
 */
export function restCharacter(character: Character): Character {
  const resourceStart = computeResourceStart(character.abilityScores, character.classId, character.level);
  return {
    ...character,
    hp: character.maxHp,
    resource: resourceStart ?? character.resource,
  };
}
