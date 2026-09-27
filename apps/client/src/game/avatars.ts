import clericMaleBlackHair from "../assets/avatars/cleric-male-black-hair.png";

export interface AvatarOption {
  id: string;
  label: string;
  image: string;
}

/**
 * Player-selectable pixel-art portraits, offered on Character Creation's
 * Appearance step -- keyed by class id, independent of the character's
 * chosen race (the source art may depict a specific race, but the avatar
 * itself is just a look any player of that class can pick). Sourced from
 * the Google Drive "Character and NPC Sprites" folder; only Cleric has an
 * option so far, with more classes/options to follow as more art arrives.
 */
export const AVATARS_BY_CLASS: Record<string, AvatarOption[]> = {
  cleric: [{ id: "cleric-male-black-hair", label: "Black Hair", image: clericMaleBlackHair }],
};

export function getAvatarsForClass(classId: string): AvatarOption[] {
  return AVATARS_BY_CLASS[classId] ?? [];
}

export function getAvatarById(avatarId: string | undefined): AvatarOption | undefined {
  if (!avatarId) return undefined;
  for (const options of Object.values(AVATARS_BY_CLASS)) {
    const found = options.find((o) => o.id === avatarId);
    if (found) return found;
  }
  return undefined;
}
