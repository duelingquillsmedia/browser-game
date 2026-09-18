import { useState, type MouseEvent } from "react";
import { CLASSES, RACES, type Character } from "@eridan/engine";
import { loadRoster, removeCharacterFromRoster } from "../game/roster";

export interface CharacterSelectScreenProps {
  onSelect: (character: Character) => void;
  onCreateNew: () => void;
}

export function CharacterSelectScreen({ onSelect, onCreateNew }: CharacterSelectScreenProps) {
  const [roster, setRoster] = useState<Character[]>(() => loadRoster());

  function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    removeCharacterFromRoster(id);
    setRoster((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="screen">
      <h1>Choose Your Hero</h1>
      <p className="subtitle">
        {roster.length > 0
          ? "Pick up where you left off, or forge someone new."
          : "No heroes yet — forge your first one to set out into Eridan."}
      </p>

      <div className="character-roster">
        {roster.map((character) => (
          <div
            key={character.id}
            role="button"
            tabIndex={0}
            className="character-card"
            onClick={() => onSelect(character)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(character)}
          >
            <button
              type="button"
              className="character-card-delete"
              aria-label={`Delete ${character.name}`}
              onClick={(e) => handleDelete(character.id, e)}
            >
              ×
            </button>
            <h3>{character.name}</h3>
            <p className="location">
              {RACES[character.raceId]?.name ?? character.raceId} {CLASSES[character.classId]?.name ?? character.classId}
            </p>
            <p className="flavor">
              HP {character.hp} / {character.maxHp} · AC {character.armorClass}
            </p>
          </div>
        ))}

        <button type="button" className="character-card character-card-new" onClick={onCreateNew}>
          <span className="character-card-new-plus">+</span>
          <span>Create New Character</span>
        </button>
      </div>
    </div>
  );
}
