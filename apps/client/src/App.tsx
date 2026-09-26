import { useEffect, useRef, useState } from "react";
import type { ActionRequest, Character, CombatState } from "@eridan/engine";
import { submitPlayerAction } from "@eridan/engine";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameShell } from "./components/GameShell";
import { CharacterScreen } from "./screens/CharacterScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { SkillsScreen } from "./screens/SkillsScreen";
import { WorldMapScreen } from "./screens/WorldMapScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { GAME_NAME, WORLD_NAME, type Encounter } from "./game/lore";
import { applyCombatResults, beginEncounter, restCharacter } from "./game/setup";
import { addCharacterToRoster, loadMostRecentCharacter, updateCharacterInRoster } from "./game/roster";
import { isSupabaseConfigured, supabase, supabaseConfigDebug } from "./lib/supabaseClient";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "auth" }
  | { kind: "creation" }
  | { kind: "home"; character: Character }
  | { kind: "character"; character: Character }
  | { kind: "inventory"; character: Character }
  | { kind: "skills"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter; resultReady?: boolean };

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Jumps straight to the player's most recently played character (or
  // creation, for an account with none yet) -- there's no character-select
  // step to land on in between.
  async function goToCharacterOrCreation() {
    try {
      const character = await loadMostRecentCharacter();
      setScreen(character ? { kind: "home", character } : { kind: "creation" });
    } catch (err) {
      console.error("Failed to load your character:", err);
      setScreen({ kind: "creation" });
    }
  }

  // Picks up sign-ins that complete via a full-page redirect (Google OAuth,
  // email confirmation links) — those land back here with no in-memory
  // screen state, so without this the user would be stuck looking at
  // whatever screen the page happened to load on.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && (screenRef.current.kind === "intro" || screenRef.current.kind === "auth")) {
        goToCharacterOrCreation();
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
    if (!data.session) {
      setScreen({ kind: "auth" });
      return;
    }
    await goToCharacterOrCreation();
  }

  async function handleNewGame() {
    const { data } = await supabase.auth.getSession();
    setScreen({ kind: data.session ? "creation" : "auth" });
  }

  if (screen.kind === "intro") {
    return (
      <TitleScreen
        gameName={GAME_NAME}
        tagline={`A turn-based chronicle of ${WORLD_NAME}`}
        onContinue={handleBegin}
        onNewGame={handleNewGame}
      />
    );
  }

  if (screen.kind === "auth") {
    return <AuthScreen onAuthenticated={goToCharacterOrCreation} onBack={() => setScreen({ kind: "intro" })} />;
  }

  if (screen.kind === "creation") {
    return (
      <CharacterCreationScreen
        onComplete={async (character) => {
          const saved = await addCharacterToRoster(character);
          setScreen({ kind: "home", character: saved });
        }}
        onBack={() => setScreen({ kind: "intro" })}
      />
    );
  }

  if (screen.kind === "home") {
    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "home") return;
      if (id === "inventory") {
        setScreen({ kind: "inventory", character: screen.character });
      } else if (id === "skills") {
        setScreen({ kind: "skills", character: screen.character });
      } else if (id === "character") {
        setScreen({ kind: "character", character: screen.character });
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
            const rested = restCharacter(screen.character);
            setScreen({ kind: "home", character: rested });
            try {
              await updateCharacterInRoster(rested);
            } catch (err) {
              console.error("Failed to save rest:", err);
            }
          }}
          onOpenCharacterSheet={() => setScreen({ kind: "character", character: screen.character })}
          onOpenInventory={() => setScreen({ kind: "inventory", character: screen.character })}
          onOpenSkills={() => setScreen({ kind: "skills", character: screen.character })}
          onSignOut={async () => {
            await supabase.auth.signOut();
            setScreen({ kind: "intro" });
          }}
        />
      </GameShell>
    );
  }

  if (screen.kind === "character") {
    async function persist(next: Character) {
      setScreen({ kind: "character", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save equipment change:", err);
      }
    }

    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "character") return;
      if (id === "home") setScreen({ kind: "home", character: screen.character });
      else if (id === "inventory") setScreen({ kind: "inventory", character: screen.character });
      else if (id === "skills") setScreen({ kind: "skills", character: screen.character });
      else if (id === "map") setScreen({ kind: "encounterSelect", character: screen.character });
    }

    return (
      <GameShell gameName={GAME_NAME} character={screen.character} active="character" onNavigate={handleNavigate}>
        <CharacterScreen character={screen.character} onUpdateCharacter={persist} />
      </GameShell>
    );
  }

  if (screen.kind === "inventory") {
    async function persist(next: Character) {
      setScreen({ kind: "inventory", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save equipment change:", err);
      }
    }

    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "inventory") return;
      if (id === "home") setScreen({ kind: "home", character: screen.character });
      else if (id === "character") setScreen({ kind: "character", character: screen.character });
      else if (id === "skills") setScreen({ kind: "skills", character: screen.character });
      else if (id === "map") setScreen({ kind: "encounterSelect", character: screen.character });
    }

    return (
      <GameShell gameName={GAME_NAME} character={screen.character} active="inventory" onNavigate={handleNavigate}>
        <InventoryScreen character={screen.character} onUpdateCharacter={persist} />
      </GameShell>
    );
  }

  if (screen.kind === "skills") {
    async function persist(next: Character) {
      setScreen({ kind: "skills", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save action bar change:", err);
      }
    }

    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "skills") return;
      if (id === "home") setScreen({ kind: "home", character: screen.character });
      else if (id === "character") setScreen({ kind: "character", character: screen.character });
      else if (id === "inventory") setScreen({ kind: "inventory", character: screen.character });
      else if (id === "map") setScreen({ kind: "encounterSelect", character: screen.character });
    }

    return (
      <GameShell gameName={GAME_NAME} character={screen.character} active="skills" onNavigate={handleNavigate}>
        <SkillsScreen character={screen.character} onUpdateCharacter={persist} />
      </GameShell>
    );
  }

  if (screen.kind === "encounterSelect") {
    async function persist(next: Character) {
      setScreen({ kind: "encounterSelect", character: next });
      try {
        await updateCharacterInRoster(next);
      } catch (err) {
        console.error("Failed to save world map progress:", err);
      }
    }

    function handleNavigate(id: "home" | "character" | "inventory" | "skills" | "talents" | "map") {
      if (screen.kind !== "encounterSelect") return;
      if (id === "home") setScreen({ kind: "home", character: screen.character });
      else if (id === "character") setScreen({ kind: "character", character: screen.character });
      else if (id === "inventory") setScreen({ kind: "inventory", character: screen.character });
      else if (id === "skills") setScreen({ kind: "skills", character: screen.character });
    }

    return (
      <GameShell gameName={GAME_NAME} character={screen.character} active="map" onNavigate={handleNavigate}>
        <WorldMapScreen
          character={screen.character}
          onUpdateCharacter={persist}
          onChooseEncounter={(encounter) =>
            setScreen({
              kind: "combat",
              character: screen.character,
              encounter,
              combat: beginEncounter(screen.character, encounter),
            })
          }
        />
      </GameShell>
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
    const { character: updatedCharacter, xpGained, levelsGained, newlyUnlockedActions } = applyCombatResults(
      character,
      combat
    );

    return (
      <ResultScreen
        status={combat.status}
        xpGained={xpGained}
        levelsGained={levelsGained}
        newLevel={updatedCharacter.level}
        newlyUnlockedActions={newlyUnlockedActions}
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
