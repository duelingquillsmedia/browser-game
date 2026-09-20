import { useEffect, useState } from "react";
import {
  CLASSES,
  MAX_PARTY_SIZE,
  MISFIT_SIX,
  RACES,
  ensureCompanionRoster,
  rerollCompanion,
  setActiveParty,
  type Character,
} from "@eridan/engine";
import { HealthBar } from "../components/HealthBar";
import { BackButton } from "../components/BackButton";

export interface PartyScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
  onBack: () => void;
}

/** The player always fills one slot themselves, leaving this many for companions. */
const MAX_COMPANIONS = MAX_PARTY_SIZE - 1;

export function PartyScreen({ character, onUpdateCharacter, onBack }: PartyScreenProps) {
  // Companions are generated once, the first time a player opens this screen.
  useEffect(() => {
    if (!character.companions) {
      onUpdateCharacter(ensureCompanionRoster(character));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.companions]);

  const [selectedIds, setSelectedIds] = useState<string[]>(character.activePartyIds ?? []);
  const dirty = selectedIds.join(",") !== (character.activePartyIds ?? []).join(",");

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id);
      if (prev.length >= MAX_COMPANIONS) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="screen party-screen">
      <BackButton onClick={onBack} />
      <h1>The Misfit Six</h1>
      <p className="subtitle">
        Choose up to {MAX_COMPANIONS} companions to bring on your next mission — {MAX_PARTY_SIZE} in the field at
        once, counting yourself.
      </p>

      <div className="preview-card party-member-card party-member-you">
        <h3>{character.name} (You)</h3>
        <p className="combatant-meta">
          {RACES[character.raceId]?.name ?? character.raceId} {CLASSES[character.classId]?.name ?? character.classId}
        </p>
        <HealthBar hp={character.hp} maxHp={character.maxHp} />
      </div>

      <div className="party-roster-grid">
        {MISFIT_SIX.map((template) => {
          const companion = character.companions?.[template.id];
          const isSelected = selectedIds.includes(template.id);
          const cardClassName = isSelected
            ? "preview-card party-member-card selected"
            : "preview-card party-member-card";
          return (
            <div key={template.id} className={cardClassName}>
              <h3>{template.name}</h3>
              <p className="combatant-meta">
                {RACES[template.raceId]?.name ?? template.raceId}{" "}
                {CLASSES[template.classId]?.name ?? template.classId}
              </p>
              <p className="flavor">{template.bio}</p>
              {companion && (
                <>
                  <HealthBar hp={companion.hp} maxHp={companion.maxHp} />
                  <p className="combatant-meta">AC {companion.armorClass}</p>
                </>
              )}
              <div className="party-member-actions">
                <button
                  type="button"
                  className="action-button"
                  onClick={() => onUpdateCharacter(rerollCompanion(character, template.id, { useRolledStats: false }))}
                >
                  Standard Array
                </button>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => onUpdateCharacter(rerollCompanion(character, template.id, { useRolledStats: true }))}
                >
                  Roll 4d6
                </button>
                <button
                  type="button"
                  className={isSelected ? "party-toggle-button selected" : "party-toggle-button"}
                  disabled={!isSelected && selectedIds.length >= MAX_COMPANIONS}
                  onClick={() => toggleSelected(template.id)}
                >
                  {isSelected ? "In Party" : "Add to Party"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="primary"
        disabled={!dirty}
        onClick={() => onUpdateCharacter(setActiveParty(character, selectedIds))}
      >
        Save Party
      </button>
    </div>
  );
}
