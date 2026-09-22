import type { Character } from "@eridan/engine";
import { BackButton } from "../components/BackButton";
import { ENCOUNTERS, type Encounter } from "../game/lore";
import { activePartyMembers } from "../game/setup";

export interface EncounterSelectScreenProps {
  character: Character;
  onChoose: (encounter: Encounter) => void;
  onBack: () => void;
}

export function EncounterSelectScreen({ character, onChoose, onBack }: EncounterSelectScreenProps) {
  const party = activePartyMembers(character);

  return (
    <div className="screen">
      <BackButton onClick={onBack} />
      <h1>The Road Ahead</h1>
      <p className="subtitle">
        {character.name} sets out with {character.hp} HP and AC {character.armorClass}.
      </p>

      {party.length > 1 && (
        <p className="combatant-meta party-manifest">
          Riding out with: {party.map((member) => `${member.name} (${member.hp}/${member.maxHp} HP)`).join(", ")}
        </p>
      )}

      <div className="encounter-list">
        {ENCOUNTERS.map((encounter) => (
          <button
            key={encounter.id}
            type="button"
            className="encounter-card"
            style={{
              backgroundImage:
                `linear-gradient(rgba(28, 21, 36, 0.78), rgba(28, 21, 36, 0.9)), url(${encounter.backgroundImage})`,
            }}
            onClick={() => onChoose(encounter)}
          >
            <h3>{encounter.name}</h3>
            <p className="location">{encounter.location}</p>
            <p className="flavor">{encounter.flavorText}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
