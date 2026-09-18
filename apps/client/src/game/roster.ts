import type { Character } from "@eridan/engine";

const STORAGE_KEY = "eridan.roster.v1";

/**
 * A lightweight, browser-local stand-in for account/character persistence.
 * There's no backend yet, so "your characters" just means "the characters
 * saved in this browser" until the real accounts milestone lands.
 */
export function loadRoster(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Character[]) : [];
  } catch {
    return [];
  }
}

function saveRoster(roster: Character[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
  } catch {
    // Storage unavailable or full — the roster just won't persist this session.
  }
}

export function addCharacterToRoster(character: Character): void {
  saveRoster([...loadRoster(), character]);
}

export function updateCharacterInRoster(character: Character): void {
  saveRoster(loadRoster().map((c) => (c.id === character.id ? character : c)));
}

export function removeCharacterFromRoster(id: string): void {
  saveRoster(loadRoster().filter((c) => c.id !== id));
}
