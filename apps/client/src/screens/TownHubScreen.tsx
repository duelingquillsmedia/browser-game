import { CLASSES, RACES, type Character } from "@eridan/engine";
import { HealthBar } from "../components/HealthBar";
import { LocationBackdrop } from "../components/LocationBackdrop";
import { HOME_TOWN_BACKGROUND, HOME_TOWN_DESCRIPTION, HOME_TOWN_NAME } from "../game/lore";

export interface TownHubScreenProps {
  character: Character;
  onVentureOut: () => void;
  onRest: () => void;
  onOpenCharacterSheet: () => void;
  onSwitchCharacter: () => void;
}

export function TownHubScreen({
  character,
  onVentureOut,
  onRest,
  onOpenCharacterSheet,
  onSwitchCharacter,
}: TownHubScreenProps) {
  const canVenture = character.hp > 0;
  const canRest = character.hp < character.maxHp;

  return (
    <>
      <LocationBackdrop image={HOME_TOWN_BACKGROUND} />
      <div className="screen town-hub-screen">
        <h1>{HOME_TOWN_NAME}</h1>
        <p className="subtitle">{HOME_TOWN_DESCRIPTION}</p>

        <div className="preview-card town-hub-card">
          <h3>
            {character.name} — {RACES[character.raceId]?.name ?? character.raceId}{" "}
            {CLASSES[character.classId]?.name ?? character.classId}
          </h3>
          <HealthBar hp={character.hp} maxHp={character.maxHp} />
          <p className="combatant-meta">AC {character.armorClass}</p>
          {!canVenture && <p className="status-tag">Too wounded to venture out — rest first.</p>}
        </div>

        <div className="town-hub-actions">
          <button type="button" className="primary" disabled={!canVenture} onClick={onVentureOut}>
            Venture Out
          </button>
          <button type="button" className="action-button" disabled={!canRest} onClick={onRest}>
            Rest at the Waypost
          </button>
          <button type="button" className="action-button" onClick={onOpenCharacterSheet}>
            Character
          </button>
          <button type="button" className="ghost" onClick={onSwitchCharacter}>
            Switch Character
          </button>
        </div>
      </div>
    </>
  );
}
