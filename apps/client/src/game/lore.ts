export const WORLD_NAME = "Eridan";

export const WORLD_INTRO = [
  "The world of Eridan has weathered ages of drifting empires, buried magic, and " +
    "quiet wars fought between things older than any crown.",
  "You are one of countless wanderers testing their steel and their spellcraft " +
    "against the frontier — the first step of a much longer road.",
];

export interface Encounter {
  id: string;
  name: string;
  location: string;
  flavorText: string;
  monsterTemplateIds: string[];
}

/** A handful of low-level encounters for the frontier around Eridan's Ashen Coast. */
export const ENCOUNTERS: Encounter[] = [
  {
    id: "ashen-coast-raiders",
    name: "Raiders on the Ashen Road",
    location: "The Ashen Coast",
    flavorText:
      "Smoke rises from a burned way-shrine along the coast road. Two goblin raiders are still " +
      "picking through the wreckage when they spot you.",
    monsterTemplateIds: ["goblin", "goblin"],
  },
  {
    id: "silverwood-hunter",
    name: "The Silverwood's Hunter",
    location: "The Silverwood",
    flavorText:
      "A low growl rolls out from beneath the silver-barked trees. A dire wolf, ribs showing " +
      "beneath a matted coat, stalks out to bar your path.",
    monsterTemplateIds: ["direWolf"],
  },
  {
    id: "bloodmere-marauder",
    name: "A Bloodmere Marauder",
    location: "The Bloodmere Plains",
    flavorText:
      "A lone orc marauder stands over a fallen way-marker, greataxe resting on one shoulder, " +
      "sizing you up as easy plunder.",
    monsterTemplateIds: ["orcMarauder"],
  },
];
