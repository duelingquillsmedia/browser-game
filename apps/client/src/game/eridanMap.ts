/**
 * Hex-grid geometry, terrain classification, and world data for the Eridan
 * world map. Ported verbatim (same constants, same math) from the design
 * handoff's prototype (`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/
 * Aetherwyn Prototype.dc.html`), which is calibrated pixel-for-pixel against
 * `apps/client/src/assets/world/eridan-map.jpg` (confirmed byte-identical to
 * the handoff's own `assets/eridan.jpg`). Region/sea/POI names and anchor
 * points are the prototype's own data, cross-checked against the project's
 * real Encyclopedia of Eridan (Drive) rather than invented for this pass —
 * the sea names, Ridgeton, Eldrin City, Bretten, Adania, etc. all match real
 * lore.
 */

export const MAP_W = 2048;
export const MAP_H = 1536;

const HEX_W = 46.5;
const HEX_S = HEX_W / Math.sqrt(3);
const ROW_SPACING = HEX_S * 1.5;
const GRID_OFFSET_X = -9.25;
const GRID_OFFSET_Y = 5.3;
export const COLS = 46;
export const ROWS = 39;

export interface HexCoord {
  c: number;
  r: number;
}

export function hexKey(h: HexCoord): string {
  return `${h.c},${h.r}`;
}

/** Offset (odd-r) column/row -> axial [q, r]. */
function axial(c: number, r: number): [number, number] {
  return [c - (r - (r & 1)) / 2, r];
}

/** Axial cube distance between two offset-coordinate hexes. */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const [q1, r1] = axial(a.c, a.r);
  const [q2, r2] = axial(b.c, b.r);
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
}

/** Pixel-space center of hex (c, r) in the map image. */
function hexCenter(c: number, r: number): [number, number] {
  return [GRID_OFFSET_X + c * HEX_W + (r & 1 ? HEX_W / 2 : 0), GRID_OFFSET_Y + r * ROW_SPACING];
}

const HEX_CORNERS: [number, number][] = [0, 1, 2, 3, 4, 5].map((i) => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return [HEX_S * Math.cos(angle), HEX_S * Math.sin(angle)];
});

/** "x,y x,y ..." corner list for an SVG <polygon points="...">. */
export function hexPoints(c: number, r: number): string {
  const [x, y] = hexCenter(c, r);
  return HEX_CORNERS.map(([dx, dy]) => `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`).join(" ");
}

/** "Mx,yLx,y...Z" path string for an SVG <path d="...">. */
export function hexPath(c: number, r: number): string {
  return "M" + hexPoints(c, r).split(" ").join("L") + "Z";
}

/** Pixel coordinates -> nearest hex, via cube rounding. Clamped to the grid's bounds. */
export function pixelToHex(x: number, y: number): HexCoord {
  const px = x - GRID_OFFSET_X;
  const py = y - GRID_OFFSET_Y;
  const X = ((Math.sqrt(3) / 3) * px - py / 3) / HEX_S;
  const Zc = ((2 / 3) * py) / HEX_S;
  const Y = -X - Zc;
  let rx = Math.round(X);
  let ry = Math.round(Y);
  let rz = Math.round(Zc);
  const dx = Math.abs(rx - X);
  const dy = Math.abs(ry - Y);
  const dz = Math.abs(rz - Zc);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (!(dy > dz)) rz = -rx - ry;
  const r = Math.max(0, Math.min(ROWS - 1, rz));
  return { c: Math.max(0, Math.min(COLS - 1, rx + (rz - (rz & 1)) / 2)), r };
}

export interface HexRecord extends HexCoord {
  key: string;
  x: number;
  y: number;
}

/** All 46*39 = 1794 hexes on the map, row-major. */
export const ALL_HEXES: HexRecord[] = (() => {
  const hexes: HexRecord[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const [x, y] = hexCenter(c, r);
      hexes.push({ c, r, key: `${c},${r}`, x, y });
    }
  }
  return hexes;
})();

export const HEX_BY_KEY: Record<string, HexRecord> = Object.fromEntries(ALL_HEXES.map((h) => [h.key, h]));

/** One giant merged SVG path of every hex outline, for a single-<path> grid line layer. */
export const FULL_GRID_PATH = ALL_HEXES.map((h) => hexPath(h.c, h.r)).join("");

/** Every hex within `radius` hex-steps of `centerKey`, inclusive. */
export function hexDisk(centerKey: string, radius: number): Set<string> {
  const center = HEX_BY_KEY[centerKey];
  const result = new Set<string>();
  if (!center) return result;
  for (const h of ALL_HEXES) {
    if (hexDistance(h, center) <= radius) result.add(h.key);
  }
  return result;
}

export function nearest<T extends { x: number; y: number }>(list: T[], x: number, y: number): T {
  return list.reduce<{ d: number; item: T }>(
    (best, item) => {
      const d = (item.x - x) ** 2 + (item.y - y) ** 2;
      return d < best.d ? { d, item } : best;
    },
    { d: Infinity, item: list[0] }
  ).item;
}

/** Danger label + color for a region, from its minimum level. */
export function dangerTier(lo: number): [string, string] {
  if (lo <= 23) return ["Safe", "#86c46f"];
  if (lo <= 26) return ["Moderate", "#d9b865"];
  if (lo <= 31) return ["Dangerous", "#e08a72"];
  return ["Deadly", "#d0604a"];
}

/** Encounter-rate display string for a region, from its minimum level. */
export function encounterChance(lo: number): string {
  if (lo <= 23) return "10%";
  if (lo <= 26) return "15%";
  if (lo <= 31) return "25%";
  return "40%";
}

export interface RegionDef {
  id: string;
  name: string;
  x: number;
  y: number;
  lo: number;
  levelRange: string;
}

/** Land regions: id, display name, anchor point (image px), minimum level, and level-range label. */
export const REGIONS: RegionDef[] = (
  [
    ["tameless", "The Tameless Shore", 720, 1060, 20, "20–24"],
    ["tiuv", "Tiuv Forest", 660, 850, 21, "21–25"],
    ["sepulcher", "Sepulcher Hills", 960, 790, 24, "24–28"],
    ["eldrin", "Eldrin Reach", 900, 930, 22, "22–25"],
    ["arnweyal", "Arnweyal Plains", 1010, 610, 23, "23–27"],
    ["corran", "Corran Woodland", 640, 470, 25, "25–29"],
    ["aonru", "Lake Aonru", 840, 560, 24, "24–27"],
    ["bretten", "Gandireav Vale", 950, 330, 25, "25–29"],
    ["bronze", "The Bronze Hills", 450, 380, 30, "30–35"],
    ["frost", "Frostbound Wastes", 420, 90, 34, "34–40"],
    ["cristolach", "Cristolach", 120, 520, 36, "36–42"],
    ["fen", "Great Glacial Fen", 390, 770, 27, "27–31"],
    ["raonai", "Raonai Strand", 460, 990, 26, "26–30"],
    ["collmhor", "Collmhor Wood", 330, 1230, 28, "28–32"],
    ["mhistana", "Mhistana Detritus", 220, 1420, 38, "38–44"],
    ["torril", "Torril Wood", 1130, 370, 26, "26–30"],
    ["tririver", "Tririver Marsh", 1260, 470, 28, "28–32"],
    ["freyil", "The Freyil Basin", 1700, 330, 32, "32–36"],
    ["raduna", "Raduna Woodland", 1700, 90, 35, "35–40"],
    ["thrandir", "Thrandir Ridge", 1420, 560, 33, "33–38"],
    ["windshear", "Windshear Peaks", 1500, 760, 34, "34–39"],
    ["prakov", "Prakov’s Gift", 1400, 990, 28, "28–33"],
    ["solmara", "Solmara", 1000, 1110, 25, "25–29"],
    ["graliel", "Graliel’s Bulwark", 1250, 1240, 30, "30–34"],
    ["ylestrea", "Ylestrea Valley", 1700, 900, 33, "33–37"],
    ["dunes", "The Bloody Dunes", 1880, 900, 36, "36–42"],
    ["decay", "Sands of Decay", 1880, 1340, 38, "38–44"],
    ["claw", "Claw Pointe", 930, 1400, 30, "30–34"],
  ] as const
).map(([id, name, x, y, lo, levelRange]) => ({ id, name, x, y, lo, levelRange }));

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((g) => [g.id, g]));

export interface SeaDef {
  name: string;
  x: number;
  y: number;
}

/** Named water bodies: display name + anchor point (image px). */
export const SEAS: SeaDef[] = (
  [
    ["Mortas Bay", 870, 1030],
    ["Proxus Strait", 760, 1300],
    ["Claw Bay", 945, 1310],
    ["Great Sea of Morimar", 1300, 1480],
    ["Thaive Sea", 1090, 190],
    ["Sea of Rhew", 100, 110],
    ["Lake Aonru", 840, 590],
    ["Teorann Lake", 650, 185],
    ["Eastern Sea", 1850, 560],
    ["Sea of Morimar", 1700, 1200],
    ["Western Sea", 60, 1300],
  ] as const
).map(([name, x, y]) => ({ name, x, y }));

export interface PointOfInterest {
  name: string;
  type: string;
  glyph: string;
  color: string;
  description: string;
  key: string;
}

const GOLD = "#d9b865";
const INK = "#f3ece4";
const MANA = "#5fc4d6";
const HP = "#d0604a";
const VIOLET = "#b287e6";

/** Points of interest: name, pixel position (converted to a hex key below), type label, marker glyph, color, description. */
export const POINTS_OF_INTEREST: PointOfInterest[] = (
  [
    ["Ridgeton", 758, 1012, "Town", "◆", GOLD, "Market town on the Tameless Shore. Trainer, bank, and the harbor road north."],
    ["Ashvale", 665, 1008, "Village", "◆", INK, "Forest village where the Tiuv river forks."],
    ["Praldosta", 800, 940, "Village", "◆", INK, "Fishing village on the northern rim of Mortas Bay."],
    ["Lighthouse of Ala’cul", 762, 1046, "Quest · Level 23", "!", GOLD, "The lamp has been dark for three nights. The keeper has not been seen."],
    ["Raisson", 708, 1212, "Port", "◇", INK, "Southern harbor on the Proxus Strait. Ships to Claw Pointe."],
    ["Olend", 838, 803, "Village", "◆", INK, "Hill village at the foot of the Sepulcher Hills."],
    ["Eldrin City", 880, 908, "City", "✦", GOLD, "Walled city at the head of Mortas Bay."],
    ["Marsh Haven", 836, 478, "Village", "◆", INK, "Stilt village on the shore of Lake Aonru."],
    ["Bretten", 1022, 402, "City", "✦", GOLD, "River city between the Gandireav branches."],
    ["Talav’s Benediction", 1050, 455, "Shrine", "✧", MANA, "Restores Mana and Faith once per day."],
    ["The Bastion", 1215, 1212, "Fortress", "✦", GOLD, "Fortress at the heart of Graliel’s Bulwark."],
    ["Mount Felxtra", 480, 250, "Dragon lair · Level 36", "▲", HP, "Raid encounter for a full party."],
    ["The Winter Court", 168, 598, "Rumored court", "▼", VIOLET, "Travelers speak of a court of ice beyond the Cristolach peaks."],
    ["Adania", 1815, 1452, "Desert town", "◆", INK, "Last well before the Sands of Decay."],
  ] as const
).map(([name, x, y, type, glyph, color, description]) => ({
  name,
  type,
  glyph,
  color,
  description,
  key: hexKey(pixelToHex(x, y)),
}));

export const POI_BY_HEX: Record<string, PointOfInterest> = Object.fromEntries(POINTS_OF_INTEREST.map((p) => [p.key, p]));

export type TerrainKey = "plains" | "forest" | "highlands" | "peaks" | "snow" | "desert" | "water";

export const TERRAIN_LABELS: Record<TerrainKey, string> = {
  plains: "Grassland",
  forest: "Forest",
  highlands: "Highlands",
  peaks: "Mountains",
  snow: "Snow & ice",
  desert: "Desert",
  water: "Water",
};

export const TERRAIN_COLORS: Record<TerrainKey, string> = {
  plains: "#b9c46a",
  forest: "#2f7a3a",
  highlands: "#d0623a",
  peaks: "#a3aab6",
  snow: "#eef4fa",
  desert: "#e8c27a",
  water: "#3a86b8",
};

/** Classifies a sampled map pixel's terrain from its RGB, first match wins. */
export function classifyTerrainColor(r: number, g: number, b: number): TerrainKey {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (r + g + b) / 3;
  if (g - r > 16 && Math.abs(b - g) < 18 && b > r + 10) return "water";
  if (l > 182 && mx - mn < 70) return "snow";
  if (b > r + 10 && b > g + 4) return "snow";
  if (r > 175 && g > 140 && b < 150 && r - b > 55) return "desert";
  if (r > g + 28 && r > 110) return "highlands";
  if (mx - mn < 32 && b >= r - 10 && l >= 55) return "peaks";
  if (l < 95 && r > b + 8) return "forest";
  return "plains";
}

/** Ridgeton's hex, per the handoff's own "Party start: hex 16,25 (Ridgeton), Day 14". Derived from Ridgeton's own pixel anchor as a built-in sanity check on the hex math above. */
export const PARTY_START_HEX = hexKey(pixelToHex(758, 1012));

/**
 * Maps each of our real `Encounter.id`s (see game/lore.ts) to its hex key.
 * These are the exact same pixel coordinates the old flat-image pin system
 * already used (matching `E_REG`'s tameless/tiuv/collmhor anchors), so the
 * hexes line up with zero guessing.
 */
export const ENCOUNTER_HEX_KEYS: Record<string, string> = {
  "tameless-shore-raiders": hexKey(pixelToHex(720, 1060)),
  "tiuv-forest-hunter": hexKey(pixelToHex(660, 850)),
  "collmhor-wood-marauder": hexKey(pixelToHex(330, 1230)),
};
