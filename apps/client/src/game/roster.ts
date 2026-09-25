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

/**
 * The character the player most recently played, by `updated_at` (bumped on
 * every save -- rest, equip, combat results, action bar changes, ...). Used
 * to jump straight into a returning player's hero with no selection step;
 * `null` for an account that hasn't created one yet.
 */
export async function loadMostRecentCharacter(): Promise<Character | null> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, data")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = data as CharacterRow[];
  return rows.length > 0 ? rowToCharacter(rows[0]) : null;
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

