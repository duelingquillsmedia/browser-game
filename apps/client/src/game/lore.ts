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

export interface Encounter {
  id: string;
  name: string;
  location: string;
  flavorText: string;
  monsterTemplateIds: string[];
}

/** A handful of low-level encounters on the frontier around Ridgeton. */
export const ENCOUNTERS: Encounter[] = [
  {
    id: "tameless-shore-raiders",
    name: "Raiders on the Tameless Shore",
    location: "The Tameless Shore",
    flavorText:
      "Smoke rises from a burned way-shrine along the coast road out of Ridgeton. Two goblin " +
      "raiders out of Claw Bay are still picking through the wreckage when they spot you.",
    monsterTemplateIds: ["goblin", "goblin"],
  },
  {
    id: "tiuv-forest-hunter",
    name: "The Hunter of Tiuv Forest",
    location: "Tiuv Forest",
    flavorText:
      "A low growl rolls out from beneath Tiuv Forest's tangled canopy. A dire wolf, ribs " +
      "showing beneath a matted coat, stalks out to bar your path.",
    monsterTemplateIds: ["direWolf"],
  },
  {
    id: "collmhor-wood-marauder",
    name: "A Collmhor Wood Marauder",
    location: "Collmhor Wood",
    flavorText:
      "A lone orc marauder stands over a fallen way-marker at the edge of Collmhor Wood, " +
      "greataxe resting on one shoulder, sizing you up as easy plunder.",
    monsterTemplateIds: ["orcMarauder"],
  },
];
