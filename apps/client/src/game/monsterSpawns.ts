import { MONSTER_TEMPLATES, type MonsterSpawn } from "@eridan/engine";
import tamelessShoreBg from "../assets/backgrounds/tameless-shore.jpg";
import tiuvForestBg from "../assets/backgrounds/tiuv-forest.jpg";
import collmhorWoodBg from "../assets/backgrounds/collmhor-wood.jpg";
import ridgetonBg from "../assets/backgrounds/ridgeton.jpg";
import { ENCOUNTER_HEX_KEYS, HEX_BY_KEY, POI_BY_HEX, REGION_BY_ID, hexNeighbors, nearest } from "./eridanMap";
import type { TerrainSample } from "./terrainSampler";
import type { Encounter } from "./lore";

/** How many wandering monsters this character's World Map tries to keep alive at once -- homebrew, enough to feel "alive" without cluttering the map. */
const SPAWN_TARGET_COUNT = 6;

const MIN_LIFETIME_MS = 2 * 60_000;
const MAX_LIFETIME_MS = 4 * 60_000;

/** Chance a spawn whose lifetime has expired wanders to an adjacent hex instead of disappearing. */
const WANDER_CHANCE = 0.6;

/** Caps how many lifecycle events (wander/despawn) a single stale spawn resolves in one reconcile pass, so a long player absence can't loop indefinitely. */
const MAX_CATCHUP_HOPS = 5;

const FIXED_ENCOUNTER_HEXES = new Set(Object.values(ENCOUNTER_HEX_KEYS));

/** The three hand-drawn combat backdrops' own map anchors (see `REGIONS` in eridanMap.ts), for picking the closest one to a spawn's hex. No landmark art exists for the other ~25 regions yet. */
const BACKDROP_ANCHORS: { x: number; y: number; image: string }[] = [
  { x: REGION_BY_ID.tameless.x, y: REGION_BY_ID.tameless.y, image: tamelessShoreBg },
  { x: REGION_BY_ID.tiuv.x, y: REGION_BY_ID.tiuv.y, image: tiuvForestBg },
  { x: REGION_BY_ID.collmhor.x, y: REGION_BY_ID.collmhor.y, image: collmhorWoodBg },
];

function randomLifetime(rng: () => number): number {
  return MIN_LIFETIME_MS + rng() * (MAX_LIFETIME_MS - MIN_LIFETIME_MS);
}

/** A hex is open to a spawn if it's dry land, not a settlement/landmark marker, not one of the 6 fixed hand-authored encounters, and has a resolvable region (so a monster template can be chosen for it). */
function isEligibleHex(key: string, terrain: TerrainSample, excludeHexKeys: Set<string>): boolean {
  if (excludeHexKeys.has(key)) return false;
  if (terrain.terrainByHex[key] === "water") return false;
  if (POI_BY_HEX[key]) return false;
  if (FIXED_ENCOUNTER_HEXES.has(key)) return false;
  return Boolean(terrain.regionByHex[key]?.id);
}

/** Picks a random monster template leveled for `regionId` -- the same `[lo, lo+4]` band `REGIONS`' own `levelRange` labels use. Falls back to the single closest-by-level template if that band happens to be empty. */
function pickTemplateForRegion(regionId: string, rng: () => number): string {
  const region = REGION_BY_ID[regionId];
  const templates = Object.values(MONSTER_TEMPLATES);
  const band = region ? templates.filter((t) => t.level >= region.lo && t.level <= region.lo + 4) : templates;
  const pool = band.length > 0 ? band : templates;
  if (band.length === 0 && region) {
    const closest = [...templates].sort((a, b) => Math.abs(a.level - region.lo) - Math.abs(b.level - region.lo))[0];
    return closest.id;
  }
  return pool[Math.floor(rng() * pool.length)].id;
}

export interface ReconcileSpawnsInput {
  spawns: MonsterSpawn[];
  now: number;
  terrain: TerrainSample;
  exploredHexKeys: string[];
  partyHexKey: string;
  rng?: () => number;
}

export interface ReconcileSpawnsResult {
  spawns: MonsterSpawn[];
  changed: boolean;
}

let nextSpawnSeq = 0;

/** A fresh, unique-enough id for a newly created spawn. */
function newSpawnId(): string {
  nextSpawnSeq += 1;
  return `spawn-${Date.now()}-${nextSpawnSeq}`;
}

/**
 * Advances every wandering monster's lifecycle to `now`: a spawn whose
 * `nextEventAt` has passed either wanders to a random eligible adjacent hex
 * (60% of the time) or despawns, repeated as many times as real time has
 * actually moved past its due events (capped at `MAX_CATCHUP_HOPS`, so a
 * player who was away for hours doesn't force an unbounded loop here --
 * it just catches up a few hops and lets the top-up below refill the rest).
 * Once every existing spawn is resolved, tops the list back up to
 * `SPAWN_TARGET_COUNT` from the party's own explored hexes. Mirrors
 * `WorldMapScreen.tsx`'s `completeTravel` pattern: callers only persist the
 * result via `onUpdateCharacter` when `changed` is true.
 */
export function reconcileMonsterSpawns({
  spawns,
  now,
  terrain,
  exploredHexKeys,
  partyHexKey,
  rng = Math.random,
}: ReconcileSpawnsInput): ReconcileSpawnsResult {
  let changed = false;
  const occupied = new Set(spawns.map((s) => s.hexKey));
  const resolved: MonsterSpawn[] = [];

  for (const spawn of spawns) {
    let current: MonsterSpawn | null = spawn;
    let hops = 0;
    while (current && current.nextEventAt <= now && hops < MAX_CATCHUP_HOPS) {
      hops++;
      changed = true;
      occupied.delete(current.hexKey);
      const wander = rng() < WANDER_CHANCE;
      const candidates: string[] = wander
        ? hexNeighbors(current.hexKey).filter(
            (key) => !occupied.has(key) && isEligibleHex(key, terrain, new Set([partyHexKey]))
          )
        : [];
      if (candidates.length === 0) {
        current = null;
        break;
      }
      const toKey = candidates[Math.floor(rng() * candidates.length)];
      const regionId = terrain.regionByHex[toKey]?.id;
      current = {
        ...current,
        hexKey: toKey,
        templateId: regionId ? pickTemplateForRegion(regionId, rng) : current.templateId,
        since: current.nextEventAt,
        nextEventAt: current.nextEventAt + randomLifetime(rng),
      };
      occupied.add(toKey);
    }
    if (current) resolved.push(current);
  }

  const exclude = new Set([partyHexKey, ...occupied]);
  const eligiblePool = exploredHexKeys.filter((key) => isEligibleHex(key, terrain, exclude));
  while (resolved.length < SPAWN_TARGET_COUNT && eligiblePool.length > 0) {
    const index = Math.floor(rng() * eligiblePool.length);
    const hexKey = eligiblePool.splice(index, 1)[0];
    const regionId = terrain.regionByHex[hexKey]?.id;
    if (!regionId) continue;
    resolved.push({
      id: newSpawnId(),
      hexKey,
      templateId: pickTemplateForRegion(regionId, rng),
      since: now,
      nextEventAt: now + randomLifetime(rng),
    });
    occupied.add(hexKey);
    changed = true;
  }

  return { spawns: resolved, changed };
}

/** Builds an ad-hoc single-monster `Encounter` for a wandering spawn, for `beginEncounter` -- which only ever reads `id`/`monsters`, so a generic `name`/`flavorText` and a nearest-anchor backdrop are enough. */
export function buildSpawnEncounter(spawn: MonsterSpawn): Encounter {
  const hex = HEX_BY_KEY[spawn.hexKey];
  const template = MONSTER_TEMPLATES[spawn.templateId];
  const backdrop = hex ? nearest(BACKDROP_ANCHORS, hex.x, hex.y).image : ridgetonBg;
  return {
    id: spawn.id,
    name: template?.name ?? "A Wandering Threat",
    location: "The Wilds",
    flavorText: `${template?.name ?? "Something"} blocks your path, clearly as surprised to see you as you are to see it.`,
    monsters: [{ templateId: spawn.templateId }],
    backgroundImage: backdrop,
  };
}
