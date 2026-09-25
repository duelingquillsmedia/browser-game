import {
  ALL_HEXES,
  MAP_W,
  MAP_H,
  classifyTerrainColor,
  nearest,
  REGIONS,
  SEAS,
  POI_BY_HEX,
  hexPath,
  TERRAIN_COLORS,
  type TerrainKey,
} from "./eridanMap";

/**
 * One-time, synchronous terrain read off the map image's own pixels — ported
 * verbatim from the design handoff's `loadTerrain()`. Runs entirely
 * client-side via an off-screen canvas; no server round trip, no hand-authored
 * per-hex data.
 */

export interface RegionAssignment {
  /** A land hex's region id (see `REGIONS`). */
  id?: string;
  /** A water hex's nearest named sea/bay (see `SEAS`). */
  sea?: string;
}

export interface TintPath {
  terrain: TerrainKey;
  color: string;
  /** Every non-water hex of this terrain, merged into one SVG path string. */
  path: string;
}

export interface TerrainSample {
  terrainByHex: Record<string, TerrainKey>;
  regionByHex: Record<string, RegionAssignment>;
  tintPaths: TintPath[];
}

const SAMPLE_RADIUS = 15;
const SAMPLE_STEP = 6;
/** A hex counts as water once at least this fraction of its sampled points read as water. */
const WATER_THRESHOLD = 0.4;

export function sampleTerrain(image: HTMLImageElement): TerrainSample {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context for terrain sampling.");
  ctx.drawImage(image, 0, 0, MAP_W, MAP_H);
  const data = ctx.getImageData(0, 0, MAP_W, MAP_H).data;

  const terrainByHex: Record<string, TerrainKey> = {};
  const regionByHex: Record<string, RegionAssignment> = {};

  for (const hex of ALL_HEXES) {
    const counts: Partial<Record<TerrainKey, number>> = {};
    let sampled = 0;
    for (let dy = -SAMPLE_RADIUS; dy <= SAMPLE_RADIUS; dy += SAMPLE_STEP) {
      for (let dx = -SAMPLE_RADIUS; dx <= SAMPLE_RADIUS; dx += SAMPLE_STEP) {
        const x = Math.round(hex.x + dx);
        const y = Math.round(hex.y + dy);
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const i = (y * MAP_W + x) * 4;
        const terrain = classifyTerrainColor(data[i], data[i + 1], data[i + 2]);
        counts[terrain] = (counts[terrain] ?? 0) + 1;
        sampled++;
      }
    }

    let terrain: TerrainKey = "water";
    if (sampled > 0 && (counts.water ?? 0) / sampled < WATER_THRESHOLD) {
      let best = -1;
      for (const key of Object.keys(counts) as TerrainKey[]) {
        if (key === "water") continue;
        const count = counts[key] ?? 0;
        if (count > best) {
          best = count;
          terrain = key;
        }
      }
    }

    // A point of interest never sits on unwalkable water.
    if (POI_BY_HEX[hex.key] && terrain === "water") terrain = "plains";

    if (terrain === "water") {
      regionByHex[hex.key] = { sea: nearest(SEAS, hex.x, hex.y).name };
    } else {
      const region = nearest(REGIONS, hex.x, hex.y);
      regionByHex[hex.key] = { id: region.id };
      // Windshear Peaks / Thrandir Ridge read as forest at a distance; nudge those to mountains.
      if ((region.id === "windshear" || region.id === "thrandir") && terrain === "forest") terrain = "peaks";
    }

    terrainByHex[hex.key] = terrain;
  }

  const pathsByTerrain: Partial<Record<TerrainKey, string[]>> = {};
  for (const hex of ALL_HEXES) {
    const terrain = terrainByHex[hex.key];
    if (terrain === "water") continue;
    (pathsByTerrain[terrain] ??= []).push(hexPath(hex.c, hex.r));
  }

  const tintPaths: TintPath[] = (Object.keys(pathsByTerrain) as TerrainKey[]).map((terrain) => ({
    terrain,
    color: TERRAIN_COLORS[terrain],
    path: pathsByTerrain[terrain]!.join(""),
  }));

  return { terrainByHex, regionByHex, tintPaths };
}
