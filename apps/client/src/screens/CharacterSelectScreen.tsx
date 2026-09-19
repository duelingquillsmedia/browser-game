import { useEffect, useState, type MouseEvent } from "react";
import { CLASSES, RACES, type Character } from "@eridan/engine";
import { loadRoster, removeCharacterFromRoster } from "../game/roster";
import { supabase } from "../lib/supabaseClient";
import { BackButton } from "../components/BackButton";

export interface CharacterSelectScreenProps {
  onSelect: (character: Character) => void;
  onCreateNew: () => void;
  onSignedOut: () => void;
  onBack: () => void;
}

export function CharacterSelectScreen({ onSelect, onCreateNew, onSignedOut, onBack }: CharacterSelectScreenProps) {
  const [roster, setRoster] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRoster()
      .then((characters) => {
        if (!cancelled) setRoster(characters);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load your characters.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string, event: MouseEvent) {
    event.stopPropagation();
    const previous = roster;
    setRoster((prev) => prev.filter((c) => c.id !== id));
    try {
      await removeCharacterFromRoster(id);
    } catch (err) {
      setRoster(previous);
      setError(err instanceof Error ? err.message : "Couldn't delete that character.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  return (
    <div className="screen">
      <BackButton onClick={onBack} />
      <div className="screen-header-row">
        <h1>Choose Your Hero</h1>
        <button type="button" className="ghost" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
      <p className="subtitle">
        {loading
          ? "Loading your heroes…"
          : roster.length > 0
            ? "Pick up where you left off, or forge someone new."
            : "No heroes yet — forge your first one to set out into Eridan."}
      </p>
      {error && <p className="auth-error">{error}</p>}

      {!loading && (
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
                {RACES[character.raceId]?.name ?? character.raceId}{" "}
                {CLASSES[character.classId]?.name ?? character.classId}
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
      )}
    </div>
  );
}
