import type { CharacterAppearance } from "@eridan/engine";

/** Cosmetic-only appearance presets from the Aetherwyn character creation handoff's `LOOKS` data. */
export const APPEARANCE_PRESETS: Record<string, CharacterAppearance[]> = {
  elf: [
    { presetName: "Silverwood", skin: "#e9d8c6", hair: "#d9d4cc", eyes: "#86c46f" },
    { presetName: "Duskbark", skin: "#8a6a58", hair: "#1e1a1c", eyes: "#d9b865" },
    { presetName: "Moonpale", skin: "#f1e6dc", hair: "#f3ece4", eyes: "#8fc6e6" },
    { presetName: "Emberleaf", skin: "#d8b49a", hair: "#b85c4a", eyes: "#86c46f" },
    { presetName: "Thornveil", skin: "#b8977c", hair: "#3a2d2a", eyes: "#b287e6" },
    { presetName: "Frostglade", skin: "#e6dccf", hair: "#9fb8c6", eyes: "#5fc4d6" },
  ],
  human: [
    { presetName: "Highland", skin: "#e2c1a4", hair: "#6b4a32", eyes: "#6aa7e6" },
    { presetName: "Coastborn", skin: "#c79a78", hair: "#2a211c", eyes: "#86c46f" },
    { presetName: "Sunreach", skin: "#a8704f", hair: "#141012", eyes: "#d9b865" },
    { presetName: "Ashvale", skin: "#d9b89c", hair: "#8a3a22", eyes: "#a39a93" },
    { presetName: "Marchwarden", skin: "#b88a68", hair: "#4a3a2e", eyes: "#6aa7e6" },
    { presetName: "Praldosta", skin: "#8a5a3e", hair: "#1a1416", eyes: "#d9b865" },
  ],
  dwarf: [
    { presetName: "Ironhearth", skin: "#d6a888", hair: "#8a3a22", eyes: "#6aa7e6" },
    { presetName: "Deepstone", skin: "#b88a6c", hair: "#2a2320", eyes: "#d9b865" },
    { presetName: "Greybeard", skin: "#e0bfa4", hair: "#b8b2aa", eyes: "#8fc6e6" },
    { presetName: "Coppervein", skin: "#c89878", hair: "#c8703a", eyes: "#86c46f" },
    { presetName: "Ashforge", skin: "#a87a5c", hair: "#1a1618", eyes: "#e08a72" },
    { presetName: "Frostpeak", skin: "#e6ccb4", hair: "#e6dcd0", eyes: "#5fc4d6" },
  ],
  halfElf: [
    { presetName: "Duskborn", skin: "#dcb99e", hair: "#5a3d2a", eyes: "#86c46f" },
    { presetName: "Wanderhome", skin: "#c79a78", hair: "#2a2118", eyes: "#6aa7e6" },
    { presetName: "Gladewalker", skin: "#e9d8c6", hair: "#8a6a4a", eyes: "#5fc4d6" },
    { presetName: "Farsight", skin: "#b8977c", hair: "#1e1a1c", eyes: "#d9b865" },
    { presetName: "Twinbough", skin: "#e2c1a4", hair: "#b85c4a", eyes: "#8fc6e6" },
    { presetName: "Evenmere", skin: "#8a6a58", hair: "#9fb8c6", eyes: "#a39a93" },
  ],
};

/** Name pools from the same handoff's `NAMES` data, used by the Random name button. */
export const NAME_POOLS: Record<string, string[]> = {
  elf: ["Kel'hos", "Aelira", "Thaelis", "Sylvaren", "Iriel", "Faelan", "Naeris", "Loriath"],
  human: ["Aldric", "Maren", "Corwin", "Isolde", "Tobias", "Wren", "Edda", "Garrick"],
  dwarf: ["Thrain", "Dagna", "Borin", "Helga", "Kazrik", "Runa", "Gorrim", "Brenna"],
  halfElf: ["Elyan", "Marisel", "Corentha", "Bevan", "Isolwen", "Tamlin", "Sorcha", "Aldeth"],
};

/** Which existing Background best fits a class's flavor, since the new creation flow no longer asks for one. */
export const DEFAULT_BACKGROUND_BY_CLASS: Record<string, string> = {
  warrior: "soldier",
  soldier: "soldier",
  rogue: "criminal",
  ranger: "criminal",
  wizard: "sage",
  cleric: "acolyte",
  druid: "sage",
};
