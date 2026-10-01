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

/**
 * Encounters spanning the frontier around Ridgeton -- the only level-1
 * starting region -- out through Tiuv Forest and Collmhor Wood as those
 * regions' own level climbs (see eridanMap.ts's REGIONS). Only 4 background
 * images exist today (Ridgeton, Tameless Shore, Tiuv Forest, Collmhor Wood),
 * so every encounter here reuses one of those three combat backdrops rather
 * than the full `MONSTER_TEMPLATES` roster built for the whole 1-30 curve --
 * the ~20 other monsters (Sepulcher Hills, Bronze Hills, the three level-30
 * endgame regions, ...) are ready in the engine but have no clickable World
 * Map encounter yet, since those regions have no art of their own.
 */
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
    id: "tameless-shore-bandits",
    name: "Bandits on the Coast Road",
    location: "The Tameless Shore",
    flavorText:
      "A felled cart blocks the coast road, its driver nowhere in sight. A bandit thug steps out " +
      "from behind it swinging a club, while an archer draws back from the treeline.",
    monsters: [{ templateId: "banditThug" }, { templateId: "brigandArcher" }],
    backgroundImage: tamelessShoreBg,
  },
  {
    id: "tiuv-forest-hunter",
    name: "The Hunters of Tiuv Forest",
    location: "Tiuv Forest",
    flavorText:
      "A low growl rolls out from beneath Tiuv Forest's tangled canopy. A pair of dire wolves, " +
      "grown huge on the forest's game trails, stalk out together to bar your path.",
    monsters: [{ templateId: "direWolf" }, { templateId: "direWolf" }],
    backgroundImage: tiuvForestBg,
  },
  {
    id: "tiuv-forest-ironwood",
    name: "The Ironwood Consortium's Reach",
    location: "Tiuv Forest",
    flavorText:
      "An Ironwood Enforcer paces before a freshly staked claim-marker, cudgel in hand, while " +
      "something many-legged shifts in the canopy overhead -- Varlon's business has stirred up " +
      "more than just the locals.",
    monsters: [{ templateId: "ironwoodEnforcer" }, { templateId: "giantSpider" }],
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
  {
    id: "collmhor-wood-warchief",
    name: "The Warchief's Vanguard",
    location: "Collmhor Wood",
    flavorText:
      "Deeper into Collmhor Wood, the warchief holding the clans together stands before the old " +
      "ruins at the forest's heart, flanked by a pair of marauders loyal only to him.",
    monsters: [{ templateId: "orcWarchief" }, { templateId: "orcMarauder" }],
    backgroundImage: collmhorWoodBg,
  },
];
