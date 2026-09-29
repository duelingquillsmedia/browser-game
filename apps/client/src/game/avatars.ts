import clericFemaleBlackHair from "../assets/avatars/cleric-female-black-hair.png";
import clericFemaleBlackHairSe from "../assets/avatars/cleric-female-black-hair-se.png";
import clericFemaleBrownHair from "../assets/avatars/cleric-female-brown-hair.png";
import clericFemaleBrownHairSe from "../assets/avatars/cleric-female-brown-hair-se.png";
import clericFemaleBlondeHair from "../assets/avatars/cleric-female-blonde-hair.png";
import clericFemaleBlondeHairSe from "../assets/avatars/cleric-female-blonde-hair-se.png";
import clericMaleBlackHair from "../assets/avatars/cleric-male-black-hair.png";
import clericMaleBlackHairSe from "../assets/avatars/cleric-male-black-hair-se.png";
import clericMaleBrownHair from "../assets/avatars/cleric-male-brown-hair.png";
import clericMaleBrownHairSe from "../assets/avatars/cleric-male-brown-hair-se.png";
import clericMaleBlondeHair from "../assets/avatars/cleric-male-blonde-hair.png";
import clericMaleBlondeHairSe from "../assets/avatars/cleric-male-blonde-hair-se.png";
import clericMaleRedHair from "../assets/avatars/cleric-male-red-hair.png";
import clericMaleRedHairSe from "../assets/avatars/cleric-male-red-hair-se.png";
import clericFemaleRedHair from "../assets/avatars/cleric-female-red-hair.png";
import clericFemaleRedHairSe from "../assets/avatars/cleric-female-red-hair-se.png";
import clericHumanFemaleBlackHair from "../assets/avatars/cleric-human-female-black-hair.png";
import clericHumanFemaleBlackHairSe from "../assets/avatars/cleric-human-female-black-hair-se.png";
import clericHumanFemaleBrownHair from "../assets/avatars/cleric-human-female-brown-hair.png";
import clericHumanFemaleBrownHairSe from "../assets/avatars/cleric-human-female-brown-hair-se.png";
import clericHumanFemaleBlondeHair from "../assets/avatars/cleric-human-female-blonde-hair.png";
import clericHumanFemaleBlondeHairSe from "../assets/avatars/cleric-human-female-blonde-hair-se.png";
import clericHumanFemaleRedHair from "../assets/avatars/cleric-human-female-red-hair.png";
import clericHumanFemaleRedHairSe from "../assets/avatars/cleric-human-female-red-hair-se.png";
import clericHumanMaleBlackHair from "../assets/avatars/cleric-human-male-black-hair.png";
import clericHumanMaleBlackHairSe from "../assets/avatars/cleric-human-male-black-hair-se.png";
import clericHumanMaleBrownHair from "../assets/avatars/cleric-human-male-brown-hair.png";
import clericHumanMaleBrownHairSe from "../assets/avatars/cleric-human-male-brown-hair-se.png";
import clericHumanMaleBlondeHair from "../assets/avatars/cleric-human-male-blonde-hair.png";
import clericHumanMaleBlondeHairSe from "../assets/avatars/cleric-human-male-blonde-hair-se.png";
import clericHumanMaleRedHair from "../assets/avatars/cleric-human-male-red-hair.png";
import clericHumanMaleRedHairSe from "../assets/avatars/cleric-human-male-red-hair-se.png";

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
 *
 * Ids are never renamed once shipped -- a saved character's `avatarId`
 * only matches by id, so an id change silently loses that character's
 * chosen look. The original Elf/Half-elf-modeled set therefore kept its
 * plain ids (`cleric-male-black-hair`, etc.) even after the visually
 * distinct Human-modeled set arrived needing its own `cleric-human-*`
 * ids and "Human "-prefixed labels to tell the two apart in the picker.
 */
export const AVATARS_BY_CLASS: Record<string, AvatarOption[]> = {
  cleric: [
    {
      id: "cleric-male-black-hair",
      label: "Elf Male Black Hair",
      image: clericMaleBlackHair,
      combatImage: clericMaleBlackHairSe,
    },
    {
      id: "cleric-male-brown-hair",
      label: "Elf Male Brown Hair",
      image: clericMaleBrownHair,
      combatImage: clericMaleBrownHairSe,
    },
    {
      id: "cleric-male-blonde-hair",
      label: "Elf Male Blonde Hair",
      image: clericMaleBlondeHair,
      combatImage: clericMaleBlondeHairSe,
    },
    {
      id: "cleric-male-red-hair",
      label: "Elf Male Red Hair",
      image: clericMaleRedHair,
      combatImage: clericMaleRedHairSe,
    },
    {
      id: "cleric-female-black-hair",
      label: "Elf Female Black Hair",
      image: clericFemaleBlackHair,
      combatImage: clericFemaleBlackHairSe,
    },
    {
      id: "cleric-female-brown-hair",
      label: "Elf Female Brown Hair",
      image: clericFemaleBrownHair,
      combatImage: clericFemaleBrownHairSe,
    },
    {
      id: "cleric-female-blonde-hair",
      label: "Elf Female Blonde Hair",
      image: clericFemaleBlondeHair,
      combatImage: clericFemaleBlondeHairSe,
    },
    {
      id: "cleric-female-red-hair",
      label: "Elf Female Red Hair",
      image: clericFemaleRedHair,
      combatImage: clericFemaleRedHairSe,
    },
    {
      id: "cleric-human-male-black-hair",
      label: "Human Male Black Hair",
      image: clericHumanMaleBlackHair,
      combatImage: clericHumanMaleBlackHairSe,
    },
    {
      id: "cleric-human-male-brown-hair",
      label: "Human Male Brown Hair",
      image: clericHumanMaleBrownHair,
      combatImage: clericHumanMaleBrownHairSe,
    },
    {
      id: "cleric-human-male-blonde-hair",
      label: "Human Male Blonde Hair",
      image: clericHumanMaleBlondeHair,
      combatImage: clericHumanMaleBlondeHairSe,
    },
    {
      id: "cleric-human-male-red-hair",
      label: "Human Male Red Hair",
      image: clericHumanMaleRedHair,
      combatImage: clericHumanMaleRedHairSe,
    },
    {
      id: "cleric-human-female-black-hair",
      label: "Human Female Black Hair",
      image: clericHumanFemaleBlackHair,
      combatImage: clericHumanFemaleBlackHairSe,
    },
    {
      id: "cleric-human-female-brown-hair",
      label: "Human Female Brown Hair",
      image: clericHumanFemaleBrownHair,
      combatImage: clericHumanFemaleBrownHairSe,
    },
    {
      id: "cleric-human-female-blonde-hair",
      label: "Human Female Blonde Hair",
      image: clericHumanFemaleBlondeHair,
      combatImage: clericHumanFemaleBlondeHairSe,
    },
    {
      id: "cleric-human-female-red-hair",
      label: "Human Female Red Hair",
      image: clericHumanFemaleRedHair,
      combatImage: clericHumanFemaleRedHairSe,
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
