import { withClassMigrationIfMissing, withStartingGearIfMissing, type Character } from "@eridan/engine";
import { supabase } from "../lib/supabaseClient";
import { withWorldMapStateIfMissing } from "./setup";

interface CharacterRow {
  id: string;
  data: Omit<Character, "id">;
}

function rowToCharacter(row: CharacterRow): Character {
  // Characters saved before inventory/equipment (or the World Map) existed
  // won't have them in their stored jsonb — backfill so older rows don't
  // crash the UI. The class migration must run first: it renames "mage" to
  // "wizard" and re-keys the old single weapon slot, both of which
  // withStartingGearIfMissing assumes are already in the new shape.
  return withWorldMapStateIfMissing(withStartingGearIfMissing(withClassMigrationIfMissing({ ...row.data, id: row.id })));
}

export interface RosterEntry {
  character: Character;
  /** When this character was last saved -- rest, equip, combat results, action bar changes, ... Drives Character Select's "LAST PLAYED" line. */
  updatedAt: string;
}

/**
 * Every character on the account, oldest-created first -- Character Select
 * assigns these to its three slots in that order, so a player's first hero
 * always lands in Slot 1. There's no server-side cap at 3; the UI enforces
 * it structurally by only offering Character Creation from an empty slot.
 */
export async function loadRoster(): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, data, updated_at")
    .order("created_at", { ascending: true })
    .limit(3);
  if (error) throw error;
  const rows = data as (CharacterRow & { updated_at: string })[];
  return rows.map((row) => ({ character: rowToCharacter(row), updatedAt: row.updated_at }));
}

export async function deleteCharacterFromRoster(id: string): Promise<void> {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}

export async function addCharacterToRoster(character: Character): Promise<Character> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to create a character.");

  const { id: _discarded, ...rest } = character;
  const { data, error } = await supabase
    .from("characters")
    .insert({ user_id: user.id, data: rest })
    .select("id, data")
    .single();
  if (error) throw error;
  return rowToCharacter(data as CharacterRow);
}

export async function updateCharacterInRoster(character: Character): Promise<void> {
  const { id, ...rest } = character;
  const { error } = await supabase.from("characters").update({ data: rest }).eq("id", id);
  if (error) throw error;
}

