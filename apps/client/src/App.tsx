import { useState } from "react";
import type { ActionRequest, Character, CombatState } from "@eridan/engine";
import { submitPlayerAction } from "@eridan/engine";
import { CharacterSelectScreen } from "./screens/CharacterSelectScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { TownHubScreen } from "./screens/TownHubScreen";
import { EncounterSelectScreen } from "./screens/EncounterSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { WORLD_INTRO, WORLD_NAME, type Encounter } from "./game/lore";
import { beginEncounter } from "./game/setup";
import { addCharacterToRoster, updateCharacterInRoster } from "./game/roster";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "characterSelect" }
  | { kind: "creation" }
  | { kind: "townHub"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter };

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });

  if (screen.kind === "intro") {
    return (
      <div className="screen intro-screen">
        <h1>{WORLD_NAME}</h1>
        {WORLD_INTRO.map((paragraph, i) => (
          <p key={i} className="subtitle">
            {paragraph}
          </p>
        ))}
        <button type="button" className="primary" onClick={() => setScreen({ kind: "characterSelect" })}>
          Begin
        </button>
      </div>
    );
  }

  if (screen.kind === "characterSelect") {
    return (
      <CharacterSelectScreen
        onSelect={(character) => setScreen({ kind: "townHub", character })}
        onCreateNew={() => setScreen({ kind: "creation" })}
      />
    );
  }

  if (screen.kind === "creation") {
    return (
      <CharacterCreationScreen
        onComplete={(character) => {
          addCharacterToRoster(character);
          setScreen({ kind: "townHub", character });
        }}
      />
    );
  }

  if (screen.kind === "townHub") {
    return (
      <TownHubScreen
        character={screen.character}
        onVentureOut={() => setScreen({ kind: "encounterSelect", character: screen.character })}
        onRest={() => {
          const rested = { ...screen.character, hp: screen.character.maxHp };
          updateCharacterInRoster(rested);
          setScreen({ kind: "townHub", character: rested });
        }}
        onSwitchCharacter={() => setScreen({ kind: "characterSelect" })}
      />
    );
  }

  if (screen.kind === "encounterSelect") {
    return (
      <EncounterSelectScreen
        character={screen.character}
        onChoose={(encounter) =>
          setScreen({
            kind: "combat",
            character: screen.character,
            encounter,
            combat: beginEncounter(screen.character, encounter),
          })
        }
      />
    );
  }

  const { character, combat, encounter } = screen;

  function handleSubmitAction(request: ActionRequest) {
    try {
      const next = submitPlayerAction(combat, request);
      setScreen({ kind: "combat", character, encounter, combat: next });
    } catch (err) {
      console.error(err);
    }
  }

  if (combat.status !== "active") {
    const survivor = combat.combatants.find((c) => c.side === "party");
    const updatedCharacter = survivor ? { ...character, hp: survivor.hp } : character;

    return (
      <ResultScreen
        status={combat.status}
        onContinue={() => {
          updateCharacterInRoster(updatedCharacter);
          setScreen({ kind: "townHub", character: updatedCharacter });
        }}
      />
    );
  }

  return <CombatScreen combat={combat} encounter={encounter} onSubmitAction={handleSubmitAction} />;
}

export default App;
