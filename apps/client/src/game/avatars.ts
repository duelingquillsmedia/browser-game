import clericFemaleBlackHair from "../assets/avatars/cleric-female-black-hair.png";
import clericFemaleBlackHairSe from "../assets/avatars/cleric-female-black-hair-se.png";
import clericFemaleBrownHair from "../assets/avatars/cleric-female-brown-hair.png";
import clericFemaleBrownHairSe from "../assets/avatars/cleric-female-brown-hair-se.png";
import clericFemaleBlondeHair from "../assets/avatars/cleric-female-blonde-hair.png";
import clericMaleBlackHair from "../assets/avatars/cleric-male-black-hair.png";
import clericMaleBlackHairSe from "../assets/avatars/cleric-male-black-hair-se.png";
import clericMaleBrownHair from "../assets/avatars/cleric-male-brown-hair.png";
import clericMaleBrownHairSe from "../assets/avatars/cleric-male-brown-hair-se.png";
import clericMaleBlondeHair from "../assets/avatars/cleric-male-blonde-hair.png";
import clericMaleBlondeHairSe from "../assets/avatars/cleric-male-blonde-hair-se.png";
import clericMaleRedHair from "../assets/avatars/cleric-male-red-hair.png";
import clericMaleRedHairSe from "../assets/avatars/cleric-male-red-hair-se.png";

export interface AvatarOption {
  id: string;
  label: string;
  /** The south (front-facing) portrait -- used for Character Creation and the Character screen. */
  image: string;
  /** A south-east facing pose, used in combat instead of `image` so the party member visibly faces the enemies to their right. Falls back to `image` when a variant doesn't have one. */
  combatImage?: string;
}

/**
 * Player-selectable pixel-art portraits, offered on Character Creation's
 * Appearance step -- keyed by class id, independent of the character's
 * chosen race (the source art may depict a specific race, but the avatar
 * itself is just a look any player of that class can pick). Sourced from
 * the Google Drive "Character and NPC Sprites" folder; only Cleric has
 * options so far, with more classes/options to follow as more art arrives.
 */
export const AVATARS_BY_CLASS: Record<string, AvatarOption[]> = {
  cleric: [
    {
      id: "cleric-male-black-hair",
      label: "Male Black Hair",
      image: clericMaleBlackHair,
      combatImage: clericMaleBlackHairSe,
    },
    {
      id: "cleric-male-brown-hair",
      label: "Male Brown Hair",
      image: clericMaleBrownHair,
      combatImage: clericMaleBrownHairSe,
    },
    {
      id: "cleric-male-blonde-hair",
      label: "Male Blonde Hair",
      image: clericMaleBlondeHair,
      combatImage: clericMaleBlondeHairSe,
    },
    {
      id: "cleric-male-red-hair",
      label: "Male Red Hair",
      image: clericMaleRedHair,
      combatImage: clericMaleRedHairSe,
    },
    {
      id: "cleric-female-black-hair",
      label: "Female Black Hair",
      image: clericFemaleBlackHair,
      combatImage: clericFemaleBlackHairSe,
    },
    {
      id: "cleric-female-brown-hair",
      label: "Female Brown Hair",
      image: clericFemaleBrownHair,
      combatImage: clericFemaleBrownHairSe,
    },
    {
      id: "cleric-female-blonde-hair",
      label: "Female Blonde Hair",
      image: clericFemaleBlondeHair,
    },
  ],
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
