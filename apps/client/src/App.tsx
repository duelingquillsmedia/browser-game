import { useState } from "react";
import type { ActionRequest, Character, CombatState } from "@eridan/engine";
import { submitPlayerAction } from "@eridan/engine";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { EncounterSelectScreen } from "./screens/EncounterSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { WORLD_INTRO, WORLD_NAME, type Encounter } from "./game/lore";
import { beginEncounter } from "./game/setup";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "creation" }
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
        <button type="button" className="primary" onClick={() => setScreen({ kind: "creation" })}>
          Begin
        </button>
      </div>
    );
  }

  if (screen.kind === "creation") {
    return (
      <CharacterCreationScreen
        onComplete={(character) => setScreen({ kind: "encounterSelect", character })}
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
    return (
      <ResultScreen
        status={combat.status}
        onContinue={() => setScreen({ kind: "encounterSelect", character })}
      />
    );
  }

  return <CombatScreen combat={combat} encounter={encounter} onSubmitAction={handleSubmitAction} />;
}

export default App;
