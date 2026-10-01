import type { AbilityScores } from "./abilities.js";
import type { CombatActionDef } from "./actions.js";
import { BASIC_ATTACK } from "./actions.js";
import type { DamageType } from "./damage.js";

export interface MonsterTemplate {
  id: string;
  name: string;
  description: string;
  /** Feeds the level-gap term of `computeLevelGapMissChance` (see stats.ts) on both sides of an attack roll -- a badly under-leveled party misses this monster far more, and vice versa. Hand-tuned against the encounters this monster actually appears in, not derived from any other stat. */
  level: number;
  abilityScores: AbilityScores;
  /** A curated stat-block number, sized to the same Vitality-scaled economy as player characters (see stats.ts). */
  maxHp: number;
  /** Armor rating from natural hide/scales; monsters carry no gear. 5% of it becomes Evasion (see stats.ts's ARMOR_EVASION_RATIO). */
  armorRating: number;
  /** XP awarded to the party on defeating one of these, hand-tuned against its relative HP/threat -- same curated-stat-block precedent as maxHp. */
  xpValue: number;
  /** Gold awarded to the party on defeating one of these -- 0 for a wild animal that carries no coin (see direWolf). */
  goldValue: number;
  actions: CombatActionDef[];
  /** None of Eridan's current frontier threats have any — reserved for future undead/elemental monsters. */
  damageResistances?: DamageType[];
  damageVulnerabilities?: DamageType[];
  damageImmunities?: DamageType[];
  /** Default battlefield rank when spawned; "front" if omitted (every pre-existing template keeps today's behavior). */
  rank?: "front" | "back";
}

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  level: number;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorRating: number;
  actions: CombatActionDef[];
  actionUses: Record<string, number>;
  damageResistances: DamageType[];
  damageVulnerabilities: DamageType[];
  damageImmunities: DamageType[];
  rank: "front" | "back";
}

/**
 * A handful of low-level threats found around Eridan's frontier, enough to
 * populate an early single-player combat encounter. HP and action `power`
 * values are homebrew, hand-tuned against the new Vitality-scaled player
 * HP pools (roughly 150-250 at level 1) rather than derived from a formula
 * — monsters are curated stat blocks, not player character sheets.
 */
export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  goblin: {
    id: "goblin",
    name: "Goblin Raider",
    description: "A wiry raider out of the goblin port towns of Claw Bay, preying on travelers along the Tameless Shore.",
    level: 1,
    abilityScores: { str: 8, dex: 14, vit: 10, int: 10, wis: 8 },
    maxHp: 75,
    armorRating: 0,
    xpValue: 45,
    goldValue: 12,
    actions: [
      {
        id: "shortsword",
        name: "Shortsword",
        description: "A quick, stabbing strike.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.3,
        damageType: "piercing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  direWolf: {
    id: "direWolf",
    name: "Dire Wolf",
    description: "A pack hunter grown huge on the game trails of Tiuv Forest.",
    // Re-leveled from 2 -> 8 when Tiuv Forest's region level was set (see eridanMap.ts's
    // REGIONS) -- Tameless Shore is now the game's only level-1 starting region, so Tiuv
    // Forest's own wolves needed to actually feel like a step up from Ridgeton's goblins.
    level: 8,
    abilityScores: { str: 26, dex: 24, vit: 20, int: 3, wis: 14 },
    maxHp: 220,
    armorRating: 20,
    xpValue: 320,
    goldValue: 0,
    actions: [
      {
        id: "bite",
        name: "Bite",
        description: "Powerful jaws snap at a single foe.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "piercing",
      },
      {
        id: "claws",
        name: "Claws",
        description: "A raking swipe of the wolf's foreclaws.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.0,
        damageType: "slashing",
      },
    ],
  },
  orcMarauder: {
    id: "orcMarauder",
    name: "Orc Marauder",
    description: "A blooded warrior out of Collmhor Wood, where orcs and bugbears have fought over the old ruins for generations.",
    // Re-leveled from 3 -> 20 alongside orcShaman when Collmhor Wood's region level was set
    // (see eridanMap.ts's REGIONS) -- with Tameless Shore now the only level-1 starting
    // region, Collmhor's own warbands needed to actually feel like a mid-game destination.
    level: 20,
    abilityScores: { str: 46, dex: 24, vit: 34, int: 12, wis: 12 },
    maxHp: 560,
    armorRating: 40,
    xpValue: 1250,
    goldValue: 140,
    actions: [
      {
        id: "greataxe",
        name: "Greataxe",
        description: "A brutal two-handed swing.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.9,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  goblinSlinger: {
    id: "goblinSlinger",
    name: "Goblin Slinger",
    description: "A goblin skirmisher lobbing stones from behind its kin's shields, out of Claw Bay.",
    level: 1,
    abilityScores: { str: 7, dex: 15, vit: 8, int: 9, wis: 9 },
    maxHp: 55,
    armorRating: 100,
    xpValue: 35,
    goldValue: 8,
    rank: "back",
    actions: [
      {
        id: "sling-stone",
        name: "Sling Stone",
        description: "A stone flung from a leather sling.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.1,
        damageType: "bludgeoning",
      },
    ],
  },
  orcShaman: {
    id: "orcShaman",
    name: "Orc Shaman",
    description: "A bone-adorned spellcaster chanting curses from behind Collmhor Wood's warbands.",
    // Re-leveled from 3 -> 20 alongside orcMarauder -- see that template's own comment.
    level: 20,
    abilityScores: { str: 14, dex: 16, vit: 22, int: 16, wis: 45 },
    maxHp: 420,
    armorRating: 20,
    xpValue: 1100,
    goldValue: 110,
    rank: "back",
    actions: [
      {
        id: "cursed-bolt",
        name: "Cursed Bolt",
        description: "A crackling bolt of dark energy.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        power: 1.4,
        damageType: "necrotic",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  banditThug: {
    id: "banditThug",
    name: "Bandit Thug",
    description: "One of the brigands and slave traders who still stalk the Tameless Shore after dark, long after Ridgeton outlawed their trade.",
    level: 2,
    abilityScores: { str: 14, dex: 12, vit: 12, int: 8, wis: 8 },
    maxHp: 110,
    armorRating: 20,
    xpValue: 60,
    goldValue: 15,
    actions: [
      {
        id: "club",
        name: "Club",
        description: "A heavy overhand blow.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.2,
        damageType: "bludgeoning",
      },
      BASIC_ATTACK,
    ],
  },
  brigandArcher: {
    id: "brigandArcher",
    name: "Brigand Archer",
    description: "A bowman lurking at the treeline along the coast road out of Ridgeton, waiting for an easy mark.",
    level: 3,
    abilityScores: { str: 9, dex: 16, vit: 10, int: 9, wis: 10 },
    maxHp: 80,
    armorRating: 10,
    xpValue: 80,
    goldValue: 18,
    rank: "back",
    actions: [
      {
        id: "hunting-bow",
        name: "Hunting Bow",
        description: "A loosed arrow, aimed to wound.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.3,
        damageType: "piercing",
      },
    ],
  },
  slaverEnforcer: {
    id: "slaverEnforcer",
    name: "Slaver Enforcer",
    description: "Muscle for one of the slaving rings Ridgeton's Trident Guard hasn't yet stamped out -- a rare, tougher find along the Tameless Shore.",
    level: 5,
    abilityScores: { str: 18, dex: 13, vit: 16, int: 9, wis: 9 },
    maxHp: 220,
    armorRating: 40,
    xpValue: 180,
    goldValue: 45,
    actions: [
      {
        id: "chain-whip",
        name: "Chain Whip",
        description: "A weighted length of chain, cracked like a lash.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "bludgeoning",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  giantSpider: {
    id: "giantSpider",
    name: "Giant Spider",
    description: "A venomous horror grown fat in Tiuv Forest's tangled, lightless canopy.",
    level: 8,
    abilityScores: { str: 20, dex: 28, vit: 18, int: 4, wis: 12 },
    maxHp: 180,
    armorRating: 20,
    xpValue: 300,
    goldValue: 0,
    actions: [
      {
        id: "venomous-bite",
        name: "Venomous Bite",
        description: "Dripping fangs sink into the target.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.5,
        damageType: "poison",
      },
      BASIC_ATTACK,
    ],
  },
  ironwoodEnforcer: {
    id: "ironwoodEnforcer",
    name: "Ironwood Enforcer",
    description: "Hired muscle for Varlon's Ironwood Consortium, pressuring Tiuv Forest's last holdouts to sell their claims.",
    level: 9,
    abilityScores: { str: 29, dex: 18, vit: 22, int: 10, wis: 10 },
    maxHp: 300,
    armorRating: 60,
    xpValue: 350,
    goldValue: 70,
    actions: [
      {
        id: "truncheon",
        name: "Truncheon",
        description: "A merciless, practiced blow.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "bludgeoning",
      },
      BASIC_ATTACK,
    ],
  },
  hobgoblinRaider: {
    id: "hobgoblinRaider",
    name: "Hobgoblin Raider",
    description: "A disciplined raider out of Claw Pointe's goblin-run docks, drilled far better than their smaller Claw Bay cousins.",
    level: 11,
    abilityScores: { str: 32, dex: 22, vit: 24, int: 11, wis: 10 },
    maxHp: 340,
    armorRating: 60,
    xpValue: 450,
    goldValue: 90,
    actions: [
      {
        id: "cutlass",
        name: "Cutlass",
        description: "A quick, curved slash.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "slashing",
      },
      BASIC_ATTACK,
    ],
  },
  bogLurker: {
    id: "bogLurker",
    name: "Bog Lurker",
    description: "Something ancient and bloated, dragged up from the silt of the Great Glacial Fen's rumored lost treasures.",
    level: 12,
    abilityScores: { str: 34, dex: 12, vit: 30, int: 4, wis: 14 },
    maxHp: 420,
    armorRating: 40,
    xpValue: 500,
    goldValue: 0,
    actions: [
      {
        id: "tendril-grasp",
        name: "Tendril Grasp",
        description: "A slime-slick tendril lashes out, dripping bog-rot.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "poison",
      },
      BASIC_ATTACK,
    ],
  },
  cairnWight: {
    id: "cairnWight",
    name: "Cairn Wight",
    description: "A restless guardian of the Sepulcher Hills' cairns, risen to drive off anyone who disturbs its dead.",
    level: 13,
    abilityScores: { str: 30, dex: 16, vit: 26, int: 10, wis: 20 },
    maxHp: 440,
    armorRating: 40,
    xpValue: 550,
    goldValue: 0,
    actions: [
      {
        id: "withering-touch",
        name: "Withering Touch",
        description: "A grip that saps warmth and life alike.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "necrotic",
      },
      BASIC_ATTACK,
    ],
  },
  siochsFallen: {
    id: "siochsFallen",
    name: "Sioch's Fallen",
    description: "Once a Herald of Sioch training in the Sepulcher Hills' great temple, now a corrupted thing that only remembers how to fight.",
    level: 14,
    abilityScores: { str: 36, dex: 14, vit: 28, int: 10, wis: 22 },
    maxHp: 480,
    armorRating: 80,
    xpValue: 620,
    goldValue: 60,
    actions: [
      {
        id: "broken-oath",
        name: "Broken Oath",
        description: "A mace-blow once meant to defend the peace, now swung in rage.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.6,
        damageType: "necrotic",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  aonruMerrow: {
    id: "aonruMerrow",
    name: "Aonru Merrow",
    description: "A territorial lake-dweller surfacing from Lake Aonru's island depths to drag trespassers under.",
    level: 14,
    abilityScores: { str: 33, dex: 24, vit: 26, int: 8, wis: 16 },
    maxHp: 440,
    armorRating: 30,
    xpValue: 600,
    goldValue: 20,
    actions: [
      {
        id: "crushing-grip",
        name: "Crushing Grip",
        description: "Webbed claws close like a vice.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.5,
        damageType: "bludgeoning",
      },
      BASIC_ATTACK,
    ],
  },
  eaomaiWarden: {
    id: "eaomaiWarden",
    name: "Eaomai Warden",
    description: "A wood elf of Graef's Bulwark, sworn to attack any foreign creature that ventures into the Eaomai's forest unwelcomed.",
    level: 16,
    abilityScores: { str: 30, dex: 38, vit: 26, int: 14, wis: 20 },
    maxHp: 520,
    armorRating: 60,
    xpValue: 750,
    goldValue: 50,
    actions: [
      {
        id: "warden-spear",
        name: "Warden's Spear",
        description: "A trained, precise thrust.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.6,
        damageType: "piercing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  corranThornguard: {
    id: "corranThornguard",
    name: "Corran Thornguard",
    description: "A gnome ranger of Corran Woodland's golden-leafed canopy, loosing thorned bolts at anything that doesn't belong.",
    level: 18,
    abilityScores: { str: 16, dex: 44, vit: 24, int: 16, wis: 20 },
    maxHp: 480,
    armorRating: 40,
    xpValue: 900,
    goldValue: 60,
    rank: "back",
    actions: [
      {
        id: "thorned-bolt",
        name: "Thorned Bolt",
        description: "A barbed, poison-slicked bolt.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.6,
        damageType: "poison",
      },
      BASIC_ATTACK,
    ],
  },
  blightTouchedWretch: {
    id: "blightTouchedWretch",
    name: "Blight-Touched Wretch",
    description: "A thing warped by the ancient blight that ate away the Sands of Decay millennia ago, still shambling through the ruin it made.",
    level: 19,
    abilityScores: { str: 40, dex: 14, vit: 34, int: 4, wis: 10 },
    maxHp: 640,
    armorRating: 40,
    xpValue: 1000,
    goldValue: 0,
    actions: [
      {
        id: "decaying-claw",
        name: "Decaying Claw",
        description: "A rotten, blight-black claw rakes for flesh.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.6,
        damageType: "poison",
      },
      BASIC_ATTACK,
    ],
  },
  orcWarchief: {
    id: "orcWarchief",
    name: "Orc Warchief",
    description: "The warlord holding Collmhor Wood's warring clans together by main force, rarely seen without a marauder at each shoulder.",
    level: 21,
    abilityScores: { str: 50, dex: 26, vit: 38, int: 13, wis: 13 },
    maxHp: 700,
    armorRating: 60,
    xpValue: 1350,
    goldValue: 160,
    actions: [
      {
        id: "warchiefs-cleave",
        name: "Warchief's Cleave",
        description: "A massive, two-handed cleaving blow.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.0,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  marshHag: {
    id: "marshHag",
    name: "Marsh Hag",
    description: "An old, bitter witch of the Tririver Marsh, cursing travelers who wander too close to her reed-choked hovel.",
    level: 21,
    abilityScores: { str: 16, dex: 20, vit: 30, int: 24, wis: 46 },
    maxHp: 620,
    armorRating: 30,
    xpValue: 1300,
    goldValue: 90,
    rank: "back",
    actions: [
      {
        id: "withering-curse",
        name: "Withering Curse",
        description: "A muttered hex, aimed to rot from within.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        power: 1.7,
        damageType: "poison",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  renegadeDwarfMiner: {
    id: "renegadeDwarfMiner",
    name: "Renegade Dwarf Miner",
    description: "A claim-jumper cast out of the Bronze Hills' forge-clans, striking at anyone who comes near the vein they still call their own.",
    level: 22,
    abilityScores: { str: 48, dex: 18, vit: 42, int: 12, wis: 14 },
    maxHp: 760,
    armorRating: 80,
    xpValue: 1400,
    goldValue: 150,
    actions: [
      {
        id: "mining-pick",
        name: "Mining Pick",
        description: "A swing meant for stone, aimed at flesh instead.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.7,
        damageType: "bludgeoning",
      },
      BASIC_ATTACK,
    ],
  },
  basinNomadRaider: {
    id: "basinNomadRaider",
    name: "Basin Nomad Raider",
    description: "A fur-clad rider out of the Freyil Basin's isolated north, as hostile to outsiders as the mountains that wall the basin off.",
    level: 22,
    abilityScores: { str: 38, dex: 40, vit: 30, int: 12, wis: 14 },
    maxHp: 680,
    armorRating: 50,
    xpValue: 1400,
    goldValue: 130,
    actions: [
      {
        id: "basin-lance",
        name: "Basin Lance",
        description: "A long lance, couched and driven home.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.7,
        damageType: "piercing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  sandElfReaver: {
    id: "sandElfReaver",
    name: "Sand Elf Reaver",
    description: "A martial sand elf out of the Bloody Dunes, raised on the old blood feuds and proud of it.",
    level: 23,
    abilityScores: { str: 44, dex: 48, vit: 32, int: 14, wis: 14 },
    maxHp: 720,
    armorRating: 60,
    xpValue: 1500,
    goldValue: 120,
    actions: [
      {
        id: "twin-blades",
        name: "Twin Blades",
        description: "A whirling double slash, left and right.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 1.8,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  thrandirDrake: {
    id: "thrandirDrake",
    name: "Thrandir Drake",
    description: "A lesser dragon-kin nesting in Thrandir Ridge's foothills -- not one of the true dragons the peaks are named for, but fearsome enough.",
    level: 24,
    abilityScores: { str: 52, dex: 30, vit: 44, int: 16, wis: 18 },
    maxHp: 820,
    armorRating: 80,
    xpValue: 1650,
    goldValue: 100,
    actions: [
      {
        id: "cinder-breath",
        name: "Cinder Breath",
        description: "A gout of smoldering embers.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 1.8,
        damageType: "fire",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  ylestreaLurker: {
    id: "ylestreaLurker",
    name: "Ylestrea Lurker",
    description: "One of the reptilian horrors long claimed extinct, surviving in Ylestrea Valley -- those who return from its depths speak of it, when they can still speak at all.",
    level: 24,
    abilityScores: { str: 40, dex: 34, vit: 36, int: 18, wis: 30 },
    maxHp: 800,
    armorRating: 60,
    xpValue: 1700,
    goldValue: 0,
    actions: [
      {
        id: "maddening-gaze",
        name: "Maddening Gaze",
        description: "A gaze that unravels the mind before the claws ever land.",
        kind: "attack",
        target: "enemy",
        ability: "wis",
        power: 1.7,
        damageType: "psychic",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  ruinStalker: {
    id: "ruinStalker",
    name: "Ruin-Stalker",
    description: "Whatever took Mhistana Detritus's lost coastal folk, still stalking the ruins where their town once stood.",
    level: 29,
    abilityScores: { str: 50, dex: 46, vit: 48, int: 24, wis: 34 },
    maxHp: 1000,
    armorRating: 80,
    xpValue: 2700,
    goldValue: 0,
    actions: [
      {
        id: "ruin-rend",
        name: "Ruin-Rend",
        description: "Claws that have had centuries to learn exactly where to strike.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.0,
        damageType: "psychic",
      },
      BASIC_ATTACK,
    ],
  },
  drownedWarden: {
    id: "drownedWarden",
    name: "Drowned Warden",
    description: "A guardian of Mhistana Detritus's sunken ruins, bound to its post long after the coastal town it once protected sank to rock and rubble.",
    level: 30,
    abilityScores: { str: 54, dex: 38, vit: 54, int: 20, wis: 32 },
    maxHp: 1100,
    armorRating: 100,
    xpValue: 3000,
    goldValue: 0,
    actions: [
      {
        id: "drowning-grasp",
        name: "Drowning Grasp",
        description: "A grip from the depths that doesn't let go.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.0,
        damageType: "necrotic",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  wastelandRaider: {
    id: "wastelandRaider",
    name: "Wasteland Raider",
    description: "One of the Wasteland Raiders who've scoured the Windshear Peaks for generations, thrown climbers and all.",
    level: 29,
    abilityScores: { str: 56, dex: 44, vit: 46, int: 16, wis: 18 },
    maxHp: 980,
    armorRating: 90,
    xpValue: 2650,
    goldValue: 220,
    actions: [
      {
        id: "wasteland-greatsword",
        name: "Wasteland Greatsword",
        description: "A storm-scarred blade, swung with practiced brutality.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.1,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  windshearHarpy: {
    id: "windshearHarpy",
    name: "Windshear Harpy",
    description: "A shrieking predator riding the Windshear Peaks' killing gusts, strong enough to throw a climber from the cliffs outright.",
    level: 30,
    abilityScores: { str: 44, dex: 56, vit: 40, int: 14, wis: 20 },
    maxHp: 940,
    armorRating: 60,
    xpValue: 2800,
    goldValue: 0,
    actions: [
      {
        id: "gale-talons",
        name: "Gale Talons",
        description: "Diving talons, driven by the force of the wind itself.",
        kind: "attack",
        target: "enemy",
        ability: "dex",
        power: 2.0,
        damageType: "slashing",
      },
      BASIC_ATTACK,
    ],
  },
  slaybear: {
    id: "slaybear",
    name: "Slaybear",
    description: "A cave-dwelling horror of the Frostbound Wastes, hunted by Winter Court wardens and feared by everyone else.",
    level: 29,
    abilityScores: { str: 58, dex: 30, vit: 52, int: 6, wis: 20 },
    maxHp: 1080,
    armorRating: 80,
    xpValue: 2750,
    goldValue: 0,
    actions: [
      {
        id: "slaying-claws",
        name: "Slaying Claws",
        description: "A single swipe, sized to end a fight outright.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.1,
        damageType: "slashing",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
  flightlessHorror: {
    id: "flightlessHorror",
    name: "Flightless Horror",
    description: "A wingless, hulking thing stalking the Frostbound Wastes' ice sheets -- tracking it is one thing; surviving the encounter is another.",
    level: 30,
    abilityScores: { str: 52, dex: 34, vit: 56, int: 10, wis: 24 },
    maxHp: 1140,
    armorRating: 100,
    xpValue: 3000,
    goldValue: 0,
    actions: [
      {
        id: "rime-maw",
        name: "Rime Maw",
        description: "A frost-rimed bite that numbs flesh on contact.",
        kind: "attack",
        target: "enemy",
        ability: "str",
        power: 2.1,
        damageType: "cold",
        cooldown: 2,
      },
      BASIC_ATTACK,
    ],
  },
};

/** Matches the getClass/getItem/getRace pattern; throws on an unknown id. */
export function getMonsterTemplate(id: string): MonsterTemplate {
  const template = MONSTER_TEMPLATES[id];
  if (!template) throw new Error(`Unknown monster template: "${id}"`);
  return template;
}

export function createMonster(templateId: string, instanceId: string, rankOverride?: "front" | "back"): Monster {
  const template = MONSTER_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown monster template: "${templateId}"`);

  return {
    id: instanceId,
    templateId: template.id,
    name: template.name,
    level: template.level,
    abilityScores: template.abilityScores,
    maxHp: template.maxHp,
    hp: template.maxHp,
    armorRating: template.armorRating,
    actions: template.actions,
    actionUses: Object.fromEntries(
      template.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
    ),
    damageResistances: template.damageResistances ?? [],
    damageVulnerabilities: template.damageVulnerabilities ?? [],
    damageImmunities: template.damageImmunities ?? [],
    rank: rankOverride ?? template.rank ?? "front",
  };
}
