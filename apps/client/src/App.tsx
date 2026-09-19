import { useEffect, useState } from "react";
import type { ActionRequest, Character, CombatState, ItemSlot } from "@eridan/engine";
import { equipItem, submitPlayerAction, unequipItem } from "@eridan/engine";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterSelectScreen } from "./screens/CharacterSelectScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { TownHubScreen } from "./screens/TownHubScreen";
import { CharacterSheetScreen } from "./screens/CharacterSheetScreen";
import { EncounterSelectScreen } from "./screens/EncounterSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { WORLD_INTRO, WORLD_NAME, type Encounter } from "./game/lore";
import { beginEncounter } from "./game/setup";
import { addCharacterToRoster, updateCharacterInRoster } from "./game/roster";
import { isSupabaseConfigured, supabase, supabaseConfigDebug } from "./lib/supabaseClient";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "auth" }
  | { kind: "characterSelect" }
  | { kind: "creation" }
  | { kind: "townHub"; character: Character }
  | { kind: "characterSheet"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter };

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });

  // Picks up sign-ins that complete via a full-page redirect (Google OAuth,
  // email confirmation links) — those land back here with no in-memory
  // screen state, so without this the user would be stuck looking at
  // whatever screen the page happened to load on.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setScreen((prev) => (prev.kind === "intro" || prev.kind === "auth" ? { kind: "characterSelect" } : prev));
      }
      if (event === "SIGNED_OUT") {
        setScreen({ kind: "intro" });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
        <div className="preview-card">
          <h3>Diagnostics</h3>
          <p className="combatant-meta">Build mode: {supabaseConfigDebug.mode}</p>
          <p className="combatant-meta">
            VITE_SUPABASE_URL: {supabaseConfigDebug.urlPresent ? supabaseConfigDebug.urlPreview : "not set"}
          </p>
          <p className="combatant-meta">
            VITE_SUPABASE_PUBLISHABLE_KEY:{" "}
            {supabaseConfigDebug.publishableKeyPresent ? supabaseConfigDebug.publishableKeyPreview : "not set"}
          </p>
        </div>
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
    return (
      <AuthScreen
        onAuthenticated={() => setScreen({ kind: "characterSelect" })}
        onBack={() => setScreen({ kind: "intro" })}
      />
    );
  }

  if (screen.kind === "characterSelect") {
    return (
      <CharacterSelectScreen
        onSelect={(character) => setScreen({ kind: "townHub", character })}
        onCreateNew={() => setScreen({ kind: "creation" })}
        onSignedOut={() => setScreen({ kind: "intro" })}
        onBack={() => setScreen({ kind: "intro" })}
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
        onBack={() => setScreen({ kind: "characterSelect" })}
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
        onOpenCharacterSheet={() => setScreen({ kind: "characterSheet", character: screen.character })}
        onSwitchCharacter={() => setScreen({ kind: "characterSelect" })}
        onBack={() => setScreen({ kind: "characterSelect" })}
      />
    );
  }

  if (screen.kind === "characterSheet") {
    async function persist(next: Character) {
      setScreen({ kind: "characterSheet", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save equipment change:", err);
      }
    }

    return (
      <CharacterSheetScreen
        character={screen.character}
        onEquip={(itemId) => persist(equipItem(screen.character, itemId))}
        onUnequip={(slot: ItemSlot) => persist(unequipItem(screen.character, slot))}
        onBack={() => setScreen({ kind: "townHub", character: screen.character })}
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
        onBack={() => setScreen({ kind: "townHub", character: screen.character })}
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
