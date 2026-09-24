import { useEffect, useState } from "react";
import type { ActionRequest, Character, CombatState, ItemSlot } from "@eridan/engine";
import { equipItem, submitPlayerAction, unequipItem } from "@eridan/engine";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterSelectScreen } from "./screens/CharacterSelectScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameShell } from "./components/GameShell";
import { CharacterSheetScreen } from "./screens/CharacterSheetScreen";
import { PartyScreen } from "./screens/PartyScreen";
import { EncounterSelectScreen } from "./screens/EncounterSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { GAME_NAME, WORLD_NAME, type Encounter } from "./game/lore";
import { applyCombatResults, beginEncounter, restParty } from "./game/setup";
import { addCharacterToRoster, updateCharacterInRoster } from "./game/roster";
import { isSupabaseConfigured, supabase, supabaseConfigDebug } from "./lib/supabaseClient";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "auth" }
  | { kind: "characterSelect" }
  | { kind: "creation" }
  | { kind: "home"; character: Character }
  | { kind: "characterSheet"; character: Character }
  | { kind: "party"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter; resultReady?: boolean };

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
    return <TitleScreen gameName={GAME_NAME} tagline={`A turn-based chronicle of ${WORLD_NAME}`} onContinue={handleBegin} />;
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
        onSelect={(character) => setScreen({ kind: "home", character })}
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
          setScreen({ kind: "home", character: saved });
        }}
        onBack={() => setScreen({ kind: "characterSelect" })}
      />
    );
  }

  if (screen.kind === "home") {
    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "home") return;
      if (id === "character" || id === "inventory" || id === "skills") {
        setScreen({ kind: "characterSheet", character: screen.character });
      } else if (id === "map") {
        setScreen({ kind: "encounterSelect", character: screen.character });
      }
    }

    return (
      <GameShell gameName={GAME_NAME} character={screen.character} active="home" onNavigate={handleNavigate}>
        <HomeScreen
          character={screen.character}
          onVentureOut={() => setScreen({ kind: "encounterSelect", character: screen.character })}
          onRest={async () => {
            const rested = restParty(screen.character);
            setScreen({ kind: "home", character: rested });
            try {
              await updateCharacterInRoster(rested);
            } catch (err) {
              console.error("Failed to save rest:", err);
            }
          }}
          onOpenCharacterSheet={() => setScreen({ kind: "characterSheet", character: screen.character })}
          onOpenParty={() => setScreen({ kind: "party", character: screen.character })}
          onSwitchCharacter={() => setScreen({ kind: "characterSelect" })}
        />
      </GameShell>
    );
  }

  if (screen.kind === "party") {
    async function persist(next: Character) {
      setScreen({ kind: "party", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save party:", err);
      }
    }

    return (
      <PartyScreen
        character={screen.character}
        onUpdateCharacter={persist}
        onBack={() => setScreen({ kind: "home", character: screen.character })}
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
        onBack={() => setScreen({ kind: "home", character: screen.character })}
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
        onBack={() => setScreen({ kind: "home", character: screen.character })}
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

  if (combat.status !== "active" && screen.resultReady) {
    const updatedCharacter = applyCombatResults(character, combat);

    return (
      <ResultScreen
        status={combat.status}
        onContinue={async () => {
          setScreen({ kind: "home", character: updatedCharacter });
          try {
            await updateCharacterInRoster(updatedCharacter);
          } catch (err) {
            console.error("Failed to save combat result:", err);
          }
        }}
      />
    );
  }

  return (
    <CombatScreen
      key={encounter.id}
      combat={combat}
      encounter={encounter}
      onSubmitAction={handleSubmitAction}
      onContinue={() => setScreen({ kind: "combat", character, combat, encounter, resultReady: true })}
    />
  );
}

export default App;
