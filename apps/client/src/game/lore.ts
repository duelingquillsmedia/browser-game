import tamelessShoreBg from "../assets/backgrounds/tameless-shore.jpg";
import tiuvForestBg from "../assets/backgrounds/tiuv-forest.jpg";
import collmhorWoodBg from "../assets/backgrounds/collmhor-wood.jpg";
import ridgetonBg from "../assets/backgrounds/ridgeton.jpg";

/** The game's own title/branding — distinct from Eridan, the continent it's set on. */
export const GAME_NAME = "Age of Broken Wings";

export const WORLD_NAME = "Eridan";

export const WORLD_INTRO = [
  "Eridan is the only continent yet charted in this world — a land of ancient forests, " +
    "frozen seas, and cities raised by dwarven forge and elven grove alike.",
  "You are one of countless wanderers testing their steel and their spellcraft " +
    "against its wilder reaches — the first step of a much longer road.",
];

export const HOME_TOWN_NAME = "Ridgeton";

export const HOME_TOWN_DESCRIPTION =
  "A logging town on the wild Tameless Shore, southwest of Eldrin City. Ridgeton has long " +
  "since outlawed the slavers who once built it and welcomes anyone willing to work — though " +
  "the shore around it still isn't safe after dark.";

export const HOME_TOWN_BACKGROUND = ridgetonBg;

export interface EncounterMonster {
  templateId: string;
  /** Overrides the template's default rank for this specific encounter; falls back to the template's own default. */
  rank?: "front" | "back";
}

export interface Encounter {
  id: string;
  name: string;
  location: string;
  flavorText: string;
  monsters: EncounterMonster[];
  backgroundImage: string;
}

/** A handful of low-level encounters on the frontier around Ridgeton. */
export const ENCOUNTERS: Encounter[] = [
  {
    id: "tameless-shore-raiders",
    name: "Raiders on the Tameless Shore",
    location: "The Tameless Shore",
    flavorText:
      "Smoke rises from a burned way-shrine along the coast road out of Ridgeton. Two goblin " +
      "raiders out of Claw Bay are picking through the wreckage while a third keeps back, " +
      "already winding up a sling.",
    monsters: [{ templateId: "goblin" }, { templateId: "goblin" }, { templateId: "goblinSlinger" }],
    backgroundImage: tamelessShoreBg,
  },
  {
    id: "tiuv-forest-hunter",
    name: "The Hunters of Tiuv Forest",
    location: "Tiuv Forest",
    flavorText:
      "A low growl rolls out from beneath Tiuv Forest's tangled canopy. A pair of dire wolves, " +
      "ribs showing beneath matted coats, stalk out together to bar your path.",
    monsters: [{ templateId: "direWolf" }, { templateId: "direWolf" }],
    backgroundImage: tiuvForestBg,
  },
  {
    id: "collmhor-wood-marauder",
    name: "A Collmhor Wood Warband",
    location: "Collmhor Wood",
    flavorText:
      "An orc marauder stands over a fallen way-marker at the edge of Collmhor Wood, greataxe " +
      "resting on one shoulder, while a bone-adorned shaman mutters curses from behind him.",
    monsters: [{ templateId: "orcMarauder" }, { templateId: "orcShaman" }],
    backgroundImage: collmhorWoodBg,
  },
];
