import { useEffect, useRef, useState } from "react";
import type { ActionRequest, Character, CombatState } from "@eridan/engine";
import { submitPlayerAction } from "@eridan/engine";
import { AuthScreen } from "./screens/AuthScreen";
import { CharacterCreationScreen } from "./screens/CharacterCreationScreen";
import { CharacterSelectScreen } from "./screens/CharacterSelectScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GameShell } from "./components/GameShell";
import { CharacterScreen } from "./screens/CharacterScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { SkillsScreen } from "./screens/SkillsScreen";
import { WorldMapScreen } from "./screens/WorldMapScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { GAME_NAME, WORLD_NAME, type Encounter } from "./game/lore";
import { applyCombatResults, beginEncounter, restCharacter } from "./game/setup";
import { addCharacterToRoster, updateCharacterInRoster } from "./game/roster";
import { isSupabaseConfigured, supabase, supabaseConfigDebug } from "./lib/supabaseClient";
import "./App.css";

type Screen =
  | { kind: "intro" }
  | { kind: "auth" }
  | { kind: "characterSelect" }
  | { kind: "creation" }
  | { kind: "home"; character: Character }
  | { kind: "character"; character: Character }
  | { kind: "inventory"; character: Character }
  | { kind: "skills"; character: Character }
  | { kind: "encounterSelect"; character: Character }
  | { kind: "combat"; character: Character; combat: CombatState; encounter: Encounter };

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "intro" });
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Drives the Title screen's primary button: "Continue" for a returning
  // (already signed-in) player, "New Game" otherwise. Checked once up front
  // and kept in sync by the auth listener below.
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  // Picks up sign-ins that complete via a full-page redirect (Google OAuth,
  // email confirmation links) — those land back here with no in-memory
  // screen state, so without this the user would be stuck looking at
  // whatever screen the page happened to load on.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setHasSession(true);
        if (screenRef.current.kind === "intro" || screenRef.current.kind === "auth") {
          setScreen({ kind: "characterSelect" });
        }
      }
      if (event === "SIGNED_OUT") {
        setHasSession(false);
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

  // The Title screen's one button lands on Character Select now -- there's
  // no path that skips it, so the account's three-slot cap holds
  // structurally (Character Creation is only reachable from an empty slot
  // there).
  async function goToCharacterSelectOrAuth() {
    const { data } = await supabase.auth.getSession();
    setScreen({ kind: data.session ? "characterSelect" : "auth" });
  }

  if (screen.kind === "intro") {
    return (
      <TitleScreen
        gameName={GAME_NAME}
        tagline={`A turn-based RPG in the world of ${WORLD_NAME}`}
        isReturningPlayer={hasSession}
        onContinue={goToCharacterSelectOrAuth}
      />
    );
  }

  if (screen.kind === "auth") {
    return (
      <AuthScreen onAuthenticated={() => setScreen({ kind: "characterSelect" })} onBack={() => setScreen({ kind: "intro" })} />
    );
  }

  if (screen.kind === "characterSelect") {
    return (
      <CharacterSelectScreen
        onEnterWorld={(character) => setScreen({ kind: "home", character })}
        onCreateNew={() => setScreen({ kind: "creation" })}
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
          onOpenCharacterSelect={() => setScreen({ kind: "characterSelect" })}
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

  // Computed as soon as the fight ends so the in-battle result popup can show
  // XP/level-up/new-ability info immediately, rather than waiting for a
  // separate screen after "Continue". Pure and cheap, so recomputing across
  // re-renders (including mid-animation ones) is harmless -- it's only
  // persisted once, when the popup's Continue button is actually clicked.
  const combatResult = combat.status !== "active" ? applyCombatResults(character, combat) : null;

  async function handleCombatContinue() {
    if (!combatResult) return;
    setScreen({ kind: "home", character: combatResult.character });
    try {
      await updateCharacterInRoster(combatResult.character);
    } catch (err) {
      console.error("Failed to save combat result:", err);
    }
  }

  return (
    <CombatScreen
      key={encounter.id}
      combat={combat}
      encounter={encounter}
      actionBarIds={character.actionBarIds}
      combatResult={combatResult}
      onSubmitAction={handleSubmitAction}
      onContinue={handleCombatContinue}
    />
  );
}

export default App;
