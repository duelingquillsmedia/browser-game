import { withStartingGearIfMissing, type Character } from "@eridan/engine";
import { supabase } from "../lib/supabaseClient";

interface CharacterRow {
  id: string;
  data: Omit<Character, "id">;
}

function rowToCharacter(row: CharacterRow): Character {
  // Characters saved before inventory/equipment existed won't have them in
  // their stored jsonb — backfill so older rows don't crash the UI.
  return withStartingGearIfMissing({ ...row.data, id: row.id });
}

export async function loadRoster(): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, data")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CharacterRow[]).map(rowToCharacter);
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

export async function removeCharacterFromRoster(id: string): Promise<void> {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}
