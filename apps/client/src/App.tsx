import { useState } from "react";
import type { ActionRequest, Character, CombatState } from "@eridan/engine";
import { submitPlayerAction } from "@eridan/engine";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterSelectScreen } from "./screens/CharacterSelectScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { TownHubScreen } from "./screens/TownHubScreen";
import { EncounterSelectScreen } from "./screens/EncounterSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { WORLD_INTRO, WORLD_NAME, type Encounter } from "./game/lore";
import { beginEncounter } from "./game/setup";
import { addCharacterToRoster, updateCharacterInRoster } from "./game/roster";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "auth" }
  | { kind: "characterSelect" }
  | { kind: "creation" }
  | { kind: "townHub"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter };

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });

  if (!isSupabaseConfigured) {
    return (
      <div className="screen intro-screen">
        <h1>Configuration Needed</h1>
        <p className="subtitle">
          This app can't reach its database yet. Copy <code>apps/client/.env.example</code> to{" "}
          <code>apps/client/.env</code> and fill in your Supabase project's URL and publishable key
          (or set <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your
          hosting provider's environment variables), then reload.
        </p>
      </div>
    );
  }

  async function handleBegin() {
    const { data } = await supabase.auth.getSession();
    setScreen({ kind: data.session ? "characterSelect" : "auth" });
  }

  if (screen.kind === "intro") {
    return (
      <div className="screen intro-screen">
        <h1>{WORLD_NAME}</h1>
        {WORLD_INTRO.map((paragraph, i) => (
          <p key={i} className="subtitle">
            {paragraph}
          </p>
        ))}
        <button type="button" className="primary" onClick={handleBegin}>
          Begin
        </button>
      </div>
    );
  }

  if (screen.kind === "auth") {
    return <AuthScreen onAuthenticated={() => setScreen({ kind: "characterSelect" })} />;
  }

  if (screen.kind === "characterSelect") {
    return (
      <CharacterSelectScreen
        onSelect={(character) => setScreen({ kind: "townHub", character })}
        onCreateNew={() => setScreen({ kind: "creation" })}
        onSignedOut={() => setScreen({ kind: "intro" })}
      />
    );
  }

  if (screen.kind === "creation") {
    return (
      <CharacterCreationScreen
        onComplete={async (character) => {
          const saved = await addCharacterToRoster(character);
          setScreen({ kind: "townHub", character: saved });
        }}
      />
    );
  }

  if (screen.kind === "townHub") {
    return (
      <TownHubScreen
        character={screen.character}
        onVentureOut={() => setScreen({ kind: "encounterSelect", character: screen.character })}
        onRest={async () => {
          const rested = { ...screen.character, hp: screen.character.maxHp };
          setScreen({ kind: "townHub", character: rested });
          try {
            await updateCharacterInRoster(rested);
          } catch (err) {
            console.error("Failed to save rest:", err);
          }
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
        onContinue={async () => {
          setScreen({ kind: "townHub", character: updatedCharacter });
          try {
            await updateCharacterInRoster(updatedCharacter);
          } catch (err) {
            console.error("Failed to save combat result:", err);
          }
        }}
      />
    );
  }

  return <CombatScreen combat={combat} encounter={encounter} onSubmitAction={handleSubmitAction} />;
}

export default App;
