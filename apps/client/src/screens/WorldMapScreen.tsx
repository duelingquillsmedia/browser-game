import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MONSTER_TEMPLATES, type Character, type TravelState, type WorldMapState } from "@eridan/engine";
import {
  ENCOUNTERS,
  HOME_TOWN_DESCRIPTION,
  HOME_TOWN_NAME,
  WORLD_NAME,
  type Encounter,
  type EncounterMonster,
} from "../game/lore";
import {
  ALL_HEXES,
  ENCOUNTER_HEX_KEYS,
  FULL_GRID_PATH,
  HEX_BY_KEY,
  MAP_H,
  MAP_W,
  PARTY_START_HEX,
  POINTS_OF_INTEREST,
  POI_BY_HEX,
  REGION_BY_ID,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  dangerTier,
  encounterChance,
  hexDisk,
  hexDistance,
  hexKey,
  hexLine,
  hexPath,
  hexPoints,
  pixelToHex,
  type TerrainKey,
} from "../game/eridanMap";
import { sampleTerrain, type TerrainSample } from "../game/terrainSampler";
import { TownHubPanel } from "../components/TownHubPanel";
import eridanMap from "../assets/world/eridan-map.jpg";
import "./WorldMapScreen.css";

export interface WorldMapScreenProps {
  character: Character;
  onChooseEncounter: (encounter: Encounter) => void;
  onUpdateCharacter: (next: Character) => void;
}

const ZOOM_MIN = 2;
const ZOOM_MAX = 6;
const ZOOM_STEP = 0.5;
const ZOOM_DEFAULT = 4;

/** Real-world seconds a single hex of travel takes -- homebrew pacing, not an in-world time unit. */
const TRAVEL_SECONDS_PER_HEX = 30;

/** "M:SS" countdown display, floored so it never shows a misleading "0:00" before travel has actually resolved. */
function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const MINIMAP_W = 190;
const MINIMAP_H = MINIMAP_W * (MAP_H / MAP_W);
const MINIMAP_SCALE = MINIMAP_W / MAP_W;

const TERRAIN_KEYS = Object.keys(TERRAIN_LABELS) as TerrainKey[];

function describeFoes(monsters: EncounterMonster[]): string {
  const counts = new Map<string, number>();
  for (const m of monsters) counts.set(m.templateId, (counts.get(m.templateId) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([id, count]) => {
      const name = MONSTER_TEMPLATES[id]?.name ?? id;
      return count > 1 ? `${count}x ${name}` : name;
    })
    .join(", ");
}

function defaultWorldMapState(): WorldMapState {
  return { day: 1, partyHexKey: PARTY_START_HEX, exploredHexKeys: [...hexDisk(PARTY_START_HEX, 5)] };
}

interface ScrollRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function WorldMapScreen({ character, onChooseEncounter, onUpdateCharacter }: WorldMapScreenProps) {
  const mapState = character.worldMapState ?? defaultWorldMapState();

  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [selectedHexKey, setSelectedHexKey] = useState<string | null>(null);
  const [hoverHexKey, setHoverHexKey] = useState<string | null>(null);
  const [terrain, setTerrain] = useState<TerrainSample | null>(null);
  const [viewportRect, setViewportRect] = useState<ScrollRect | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    moved: boolean;
  } | null>(null);
  const pendingCenterRef = useRef<{ x: number; y: number } | null>(null);
  const didInitialCenter = useRef(false);
  const travel = mapState.travel;
  const [travelNow, setTravelNow] = useState(() => Date.now());
  const travelCompletingRef = useRef(false);
  /** True once the player's asked to stop early -- shows the confirmation note under Halt Travel until the next hex boundary resolves the (now shortened) journey. */
  const [haltRequested, setHaltRequested] = useState(false);

  const canVenture = character.hp > 0;

  // While traveling, tick a live "now" (driving the countdown + the animated dot) and complete
  // the journey the moment real time catches up to `arriveAt` -- whether that's during this tick
  // loop or immediately on mount, if it finished while the player was on a different screen.
  useEffect(() => {
    if (!travel) return;
    travelCompletingRef.current = false;
    const tick = () => {
      const now = Date.now();
      if (now >= travel.arriveAt) {
        if (travelCompletingRef.current) return;
        travelCompletingRef.current = true;
        completeTravel(travel);
        return;
      }
      setTravelNow(now);
    };
    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travel?.toHexKey, travel?.arriveAt]);

  // Sample the map image's own pixels for terrain, once, entirely client-side.
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setTerrain(sampleTerrain(image));
    };
    image.src = eridanMap;
    return () => {
      cancelled = true;
    };
  }, []);

  function syncViewportRect() {
    const vp = viewportRef.current;
    if (!vp) return;
    setViewportRect({
      left: vp.scrollLeft / zoom,
      top: vp.scrollTop / zoom,
      width: vp.clientWidth / zoom,
      height: vp.clientHeight / zoom,
    });
  }

  function scrollToCenter(imgX: number, imgY: number, z: number) {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    vp.scrollLeft = imgX * z - rect.width / 2;
    vp.scrollTop = imgY * z - rect.height / 2;
    syncViewportRect();
  }

  function centerOnHex(key: string) {
    const hex = HEX_BY_KEY[key];
    if (hex) scrollToCenter(hex.x, hex.y, zoom);
  }

  // Center on the party's hex once, as soon as the viewport has a real size.
  useLayoutEffect(() => {
    if (didInitialCenter.current) return;
    const vp = viewportRef.current;
    if (!vp || vp.clientWidth === 0) return;
    didInitialCenter.current = true;
    centerOnHex(mapState.partyHexKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the same image-space point centered across a zoom change.
  useLayoutEffect(() => {
    const pending = pendingCenterRef.current;
    if (!pending) return;
    pendingCenterRef.current = null;
    scrollToCenter(pending.x, pending.y, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function changeZoom(nextRaw: number) {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(nextRaw * 2) / 2));
    if (next === zoom) return;
    const vp = viewportRef.current;
    if (vp) {
      const rect = vp.getBoundingClientRect();
      pendingCenterRef.current = {
        x: (vp.scrollLeft + rect.width / 2) / zoom,
        y: (vp.scrollTop + rect.height / 2) / zoom,
      };
    }
    setZoom(next);
  }

  // The wheel zooms the map (instead of scrolling it up/down); click-and-drag still pans. React
  // attaches its own onWheel as a passive listener, so preventDefault() there can't actually stop
  // the native scroll -- a real, non-passive DOM listener is required instead.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      changeZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function imageCoordsFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const vp = viewportRef.current;
    if (!vp) return null;
    const rect = vp.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left + vp.scrollLeft) / zoom,
      y: (e.clientY - rect.top + vp.scrollTop) / zoom,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: vp.scrollLeft,
      startScrollTop: vp.scrollTop,
      moved: false,
    };
    vp.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const vp = viewportRef.current;
    const drag = dragRef.current;
    if (vp && drag && drag.pointerId === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) {
        vp.scrollLeft = drag.startScrollLeft - dx;
        vp.scrollTop = drag.startScrollTop - dy;
        syncViewportRect();
        setHoverHexKey(null);
        return;
      }
    }
    const coords = imageCoordsFromEvent(e);
    if (!coords) return;
    const key = hexKey(pixelToHex(coords.x, coords.y));
    setHoverHexKey((prev) => (prev === key ? prev : key));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const vp = viewportRef.current;
    const drag = dragRef.current;
    if (vp && drag && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
    if (drag && !drag.moved) {
      const coords = imageCoordsFromEvent(e);
      if (coords) setSelectedHexKey(hexKey(pixelToHex(coords.x, coords.y)));
    }
    dragRef.current = null;
  }

  function handleMinimapClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / MINIMAP_SCALE;
    const y = (e.clientY - rect.top) / MINIMAP_SCALE;
    scrollToCenter(x, y, zoom);
  }

  const exploredSet = useMemo(() => new Set(mapState.exploredHexKeys), [mapState.exploredHexKeys]);

  const fogPath = useMemo(() => {
    let d = "";
    for (const hex of ALL_HEXES) {
      if (!exploredSet.has(hex.key)) d += hexPath(hex.c, hex.r);
    }
    return d;
  }, [exploredSet]);

  const placesSorted = useMemo(() => {
    const party = HEX_BY_KEY[mapState.partyHexKey];
    return [...POINTS_OF_INTEREST].sort(
      (a, b) => hexDistance(party, HEX_BY_KEY[a.key]) - hexDistance(party, HEX_BY_KEY[b.key])
    );
  }, [mapState.partyHexKey]);

  function selectAndCenter(key: string) {
    setSelectedHexKey(key);
    centerOnHex(key);
  }

  /** Starts a timed journey instead of resolving it instantly -- see `completeTravel`. */
  function startTravel(destKey: string, days: number) {
    const now = Date.now();
    setTravelNow(now);
    setHaltRequested(false);
    onUpdateCharacter({
      ...character,
      worldMapState: {
        ...mapState,
        travel: { toHexKey: destKey, startedAt: now, arriveAt: now + days * TRAVEL_SECONDS_PER_HEX * 1000, days },
      },
    });
  }

  /**
   * Stops an in-progress journey early -- not instantly (the party can't teleport mid-hex), but
   * at the next hex boundary along the original route. Truncates the travel in place to whichever
   * hex the party is about to reach (based on real elapsed time, same 30s-per-hex pacing
   * `startTravel` used), so the existing tick loop's own `completeTravel` call resolves it exactly
   * like any other arrival -- no separate "halted" completion path needed. A no-op once already on
   * the final leg (nothing left to truncate) or if already requested.
   */
  function haltTravel() {
    if (!travel || haltRequested || !travelPath) return;
    setHaltRequested(true);
    const elapsedHexes = Math.floor((Date.now() - travel.startedAt) / (TRAVEL_SECONDS_PER_HEX * 1000));
    const stopAtIndex = Math.min(elapsedHexes + 1, travel.days);
    if (stopAtIndex >= travel.days) return;
    onUpdateCharacter({
      ...character,
      worldMapState: {
        ...mapState,
        travel: {
          toHexKey: travelPath[stopAtIndex].key,
          startedAt: travel.startedAt,
          arriveAt: travel.startedAt + stopAtIndex * TRAVEL_SECONDS_PER_HEX * 1000,
          days: stopAtIndex,
        },
      },
    });
  }

  /** Applies arrival: the same day-advance/fog-reveal/party-move `handleTravel` used to do instantly, now run once real time catches up. */
  function completeTravel(finishedTravel: TravelState) {
    const revealed = hexDisk(finishedTravel.toHexKey, 4);
    const nextExplored = new Set(mapState.exploredHexKeys);
    for (const key of revealed) nextExplored.add(key);
    onUpdateCharacter({
      ...character,
      worldMapState: {
        day: mapState.day + finishedTravel.days,
        partyHexKey: finishedTravel.toHexKey,
        exploredHexKeys: [...nextExplored],
        travel: undefined,
      },
    });
  }

  /** The path being animated along, recomputed only when a journey actually starts (not every tick). */
  const travelPath = useMemo(
    () => (travel ? hexLine(mapState.partyHexKey, travel.toHexKey) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [travel?.toHexKey]
  );

  /** Current image-space (x, y) of the traveling dot, interpolated along `travelPath` by elapsed real time. */
  function travelDotPosition(): { x: number; y: number } | null {
    if (!travel || !travelPath || travelPath.length < 2) return null;
    const totalMs = travel.arriveAt - travel.startedAt;
    const t = totalMs > 0 ? Math.min(1, Math.max(0, (travelNow - travel.startedAt) / totalMs)) : 1;
    const segT = t * (travelPath.length - 1);
    const idx = Math.min(travelPath.length - 2, Math.floor(segT));
    const localT = segT - idx;
    const a = travelPath[idx];
    const b = travelPath[idx + 1];
    return { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT };
  }

  const activeHexKey = selectedHexKey ?? mapState.partyHexKey;
  const activeHex = HEX_BY_KEY[activeHexKey];
  const partyHex = HEX_BY_KEY[mapState.partyHexKey];
  const activeTerrain = terrain?.terrainByHex[activeHexKey];
  const activeRegionInfo = terrain?.regionByHex[activeHexKey];
  const activeRegion = activeRegionInfo?.id ? REGION_BY_ID[activeRegionInfo.id] : undefined;
  const activePoi = exploredSet.has(activeHexKey) ? POI_BY_HEX[activeHexKey] : undefined;
  const isHome = activeHexKey === PARTY_START_HEX;
  const distanceDays = hexDistance(partyHex, activeHex);
  const matchedEncounterId = Object.entries(ENCOUNTER_HEX_KEYS).find(([, key]) => key === activeHexKey)?.[0];
  const matchedEncounter = matchedEncounterId ? ENCOUNTERS.find((e) => e.id === matchedEncounterId) : undefined;
  const isPartyHere = activeHexKey === mapState.partyHexKey;
  const isWater = activeTerrain === "water";

  const partyPlaceName =
    POI_BY_HEX[mapState.partyHexKey]?.name ??
    (mapState.partyHexKey === PARTY_START_HEX ? HOME_TOWN_NAME : (terrain?.regionByHex[mapState.partyHexKey]?.id && REGION_BY_ID[terrain.regionByHex[mapState.partyHexKey]!.id!]?.name) || "the wilds");

  const travelDot = travelDotPosition();
  const travelDurationMs = travel ? travel.arriveAt - travel.startedAt : 0;
  const travelRemainingMs = travel ? travel.arriveAt - travelNow : 0;
  const travelProgressPct =
    travel && travelDurationMs > 0 ? Math.min(100, Math.max(0, ((travelNow - travel.startedAt) / travelDurationMs) * 100)) : 0;
  const travelDestName =
    travel &&
    (POI_BY_HEX[travel.toHexKey]?.name ??
      (travel.toHexKey === PARTY_START_HEX
        ? HOME_TOWN_NAME
        : (terrain?.regionByHex[travel.toHexKey]?.id && REGION_BY_ID[terrain.regionByHex[travel.toHexKey]!.id!]?.name) || "the wilds"));

  return (
    <div className="aow-worldmap">
      <p className="aow-eyebrow">
        CONTINENT OF {WORLD_NAME.toUpperCase()} · PARTY AT {partyPlaceName.toUpperCase()} · DAY {mapState.day}
      </p>
      <h1 className="aow-h1">World Map</h1>

      <div className="aow-map-page-grid">
        <div className="aow-panel aow-hexmap-panel">
          <div className="aow-panel-header">
            {WORLD_NAME.toUpperCase()}
            <span className="aow-open aow-hexmap-status">{terrain ? "TERRAIN READ FROM MAP" : "READING TERRAIN…"}</span>
          </div>

          <div className="aow-hexmap-frame">
            <div
              className="aow-hexmap-viewport"
              ref={viewportRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setHoverHexKey(null)}
              onScroll={syncViewportRect}
            >
              <div className="aow-hexmap-content" style={{ width: MAP_W * zoom, height: MAP_H * zoom }}>
                <img src={eridanMap} alt="" className="aow-hexmap-image" draggable={false} />
                <svg
                  className="aow-hexmap-svg"
                  width={MAP_W * zoom}
                  height={MAP_H * zoom}
                  viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                >
                  {terrain?.tintPaths.map((t) => (
                    <path key={t.terrain} d={t.path} fill={t.color} opacity={0.2} />
                  ))}
                  {fogPath && <path d={fogPath} fill="#0b090e" opacity={0.84} />}
                  <path d={FULL_GRID_PATH} fill="none" stroke="rgba(232,200,170,0.15)" strokeWidth={0.5} />
                  {hoverHexKey && hoverHexKey !== activeHexKey && (
                    <polygon
                      points={hexPoints(HEX_BY_KEY[hoverHexKey].c, HEX_BY_KEY[hoverHexKey].r)}
                      fill="rgba(224,138,114,0.12)"
                      stroke="#e08a72"
                      strokeWidth={1.5}
                    />
                  )}
                  {selectedHexKey && selectedHexKey !== mapState.partyHexKey && !travel && (
                    <line
                      x1={partyHex.x}
                      y1={partyHex.y}
                      x2={activeHex.x}
                      y2={activeHex.y}
                      stroke="#e08a72"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                    />
                  )}
                  {travel && travelDot && (
                    <line
                      x1={partyHex.x}
                      y1={partyHex.y}
                      x2={HEX_BY_KEY[travel.toHexKey].x}
                      y2={HEX_BY_KEY[travel.toHexKey].y}
                      stroke="#d9b865"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                    />
                  )}
                  {travel && travelDot ? (
                    <>
                      <polygon points={hexPoints(HEX_BY_KEY[travel.toHexKey].c, HEX_BY_KEY[travel.toHexKey].r)} fill="none" stroke="#d9b865" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />
                      <circle className="aow-hexmap-travel-dot" cx={travelDot.x} cy={travelDot.y} r={5} fill="#d9b865" />
                    </>
                  ) : (
                    <>
                      <polygon points={hexPoints(partyHex.c, partyHex.r)} fill="none" stroke="#d9b865" strokeWidth={2.5} />
                      <circle cx={partyHex.x} cy={partyHex.y} r={4} fill="#d9b865" />
                    </>
                  )}
                  {selectedHexKey && (
                    <polygon points={hexPoints(activeHex.c, activeHex.r)} fill="none" stroke="#f3ece4" strokeWidth={2} />
                  )}
                </svg>
              </div>
            </div>

            <div className="aow-hexmap-zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="aow-button-ghost" onClick={() => changeZoom(zoom - ZOOM_STEP)}>
                −
              </button>
              <span className="aow-hexmap-zoom-readout">{zoom}×</span>
              <button type="button" className="aow-button-ghost" onClick={() => changeZoom(zoom + ZOOM_STEP)}>
                +
              </button>
              <button type="button" className="aow-button-ghost" onClick={() => centerOnHex(mapState.partyHexKey)}>
                Find Party
              </button>
            </div>

            <div
              className="aow-minimap"
              style={{ width: MINIMAP_W, height: MINIMAP_H }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleMinimapClick}
            >
              <img src={eridanMap} alt="" className="aow-minimap-image" />
              {viewportRect && (
                <div
                  className="aow-minimap-viewport-rect"
                  style={{
                    left: viewportRect.left * MINIMAP_SCALE,
                    top: viewportRect.top * MINIMAP_SCALE,
                    width: viewportRect.width * MINIMAP_SCALE,
                    height: viewportRect.height * MINIMAP_SCALE,
                  }}
                />
              )}
              <div
                className="aow-minimap-party-dot"
                style={{
                  left: (travelDot?.x ?? partyHex.x) * MINIMAP_SCALE,
                  top: (travelDot?.y ?? partyHex.y) * MINIMAP_SCALE,
                }}
              />
            </div>
          </div>

          <div className="aow-hexmap-legend">
            {TERRAIN_KEYS.map((key) => (
              <div key={key} className="aow-hexmap-legend-item">
                <span className="aow-hexmap-legend-swatch" style={{ background: TERRAIN_COLORS[key] }} />
                {TERRAIN_LABELS[key]}
              </div>
            ))}
          </div>
        </div>

        <div className="aow-map-side-column">
          {travel && (
            <div className="aow-panel aow-map-travel-panel">
              <div className="aow-panel-header">
                TRAVELING
                <span className="aow-open">{formatRemaining(travelRemainingMs)} LEFT</span>
              </div>
              <div className="aow-card-body">
                <div className="aow-item-name">En route to {travelDestName}</div>
                <div className="aow-bar-track" style={{ marginTop: 8 }}>
                  <div className="aow-bar-fill gold" style={{ width: `${travelProgressPct}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="aow-panel aow-map-detail-panel">
            <div className="aow-panel-header">{isHome ? "HOME" : matchedEncounter ? "ENCOUNTER" : "SELECTED HEX"}</div>
            <div className="aow-card-body">
              <div className="aow-item-header">
                <div>
                  <div className="aow-item-name">
                    {isHome ? HOME_TOWN_NAME : (activePoi?.name ?? (matchedEncounter ? matchedEncounter.location : "Unnamed hex"))}
                  </div>
                  <div className="aow-item-type-line">
                    {activeRegion ? activeRegion.name : activeRegionInfo?.sea ? activeRegionInfo.sea : "Uncharted"}
                    {activeTerrain ? ` · ${TERRAIN_LABELS[activeTerrain]}` : ""}
                  </div>
                </div>
              </div>

              <p className="aow-item-flavor">
                {isHome
                  ? HOME_TOWN_DESCRIPTION
                  : matchedEncounter
                    ? matchedEncounter.flavorText
                    : activePoi?.description ??
                      (isWater
                        ? "Open water. A ship would be needed to cross it."
                        : "An unremarkable stretch of Eridan, unmarked on any chart.")}
              </p>

              {matchedEncounter && (
                <div className="aow-skill-stat-grid">
                  <div className="aow-skill-stat aow-map-foes-stat">
                    <span className="aow-skill-stat-label">FOES</span>
                    <span>{describeFoes(matchedEncounter.monsters)}</span>
                  </div>
                </div>
              )}

              {!matchedEncounter && activeRegion && (
                <div className="aow-skill-stat-grid">
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">LEVEL RANGE</span>
                    <span>{activeRegion.levelRange}</span>
                  </div>
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">DANGER</span>
                    <span style={{ color: dangerTier(activeRegion.lo)[1] }}>{dangerTier(activeRegion.lo)[0]}</span>
                  </div>
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">ENCOUNTER CHANCE</span>
                    <span>{encounterChance(activeRegion.lo)}</span>
                  </div>
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">DISTANCE</span>
                    <span>
                      {distanceDays} day{distanceDays === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              )}

              {matchedEncounter && isPartyHere && !canVenture && (
                <p className="aow-warning">Too wounded to venture out — rest first.</p>
              )}

              {travel ? (
                <>
                  <button type="button" className="aow-button-primary aow-map-venture-button" disabled>
                    Traveling…
                  </button>
                  <button
                    type="button"
                    className="aow-button-ghost aow-map-halt-button"
                    disabled={haltRequested}
                    onClick={haltTravel}
                  >
                    Halt Travel
                  </button>
                  {haltRequested && (
                    <p className="aow-muted-text aow-map-halt-note">Travel will halt at the next hex.</p>
                  )}
                </>
              ) : matchedEncounter && isPartyHere ? (
                <button
                  type="button"
                  className="aow-button-primary aow-map-venture-button"
                  disabled={!canVenture}
                  onClick={() => onChooseEncounter(matchedEncounter)}
                >
                  Venture Out
                </button>
              ) : isPartyHere ? (
                <button type="button" className="aow-button-primary aow-map-venture-button" disabled>
                  Party Is Here
                </button>
              ) : isWater ? (
                <button type="button" className="aow-button-primary aow-map-venture-button" disabled>
                  Needs A Ship
                </button>
              ) : (
                <button
                  type="button"
                  className="aow-button-primary aow-map-venture-button"
                  onClick={() => startTravel(activeHexKey, distanceDays)}
                >
                  Travel · {distanceDays} Day{distanceDays === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>

          {activePoi?.kind === "settlement" && isPartyHere && !travel && (
            <TownHubPanel townName={activePoi.name} character={character} onUpdateCharacter={onUpdateCharacter} />
          )}

          <div className="aow-panel aow-map-places-panel">
            <div className="aow-panel-header">PLACES</div>
            <div className="aow-map-places-list">
              {placesSorted.map((poi) => (
                <button
                  key={poi.key}
                  type="button"
                  className={`aow-map-place-row${poi.key === activeHexKey ? " active" : ""}`}
                  onClick={() => selectAndCenter(poi.key)}
                >
                  <span className="aow-map-place-glyph" style={{ color: poi.color }}>
                    {poi.glyph}
                  </span>
                  <span className="aow-map-place-name">{poi.name}</span>
                  <span className="aow-map-place-distance">{hexDistance(partyHex, HEX_BY_KEY[poi.key])}d</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
