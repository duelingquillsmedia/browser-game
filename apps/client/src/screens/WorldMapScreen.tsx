import { useState } from "react";
import { MONSTER_TEMPLATES, type Character } from "@eridan/engine";
import { ENCOUNTERS, HOME_TOWN_DESCRIPTION, HOME_TOWN_NAME, WORLD_NAME, type Encounter } from "../game/lore";
import eridanMap from "../assets/world/eridan-map.jpg";
import "./WorldMapScreen.css";

export interface WorldMapScreenProps {
  character: Character;
  onChooseEncounter: (encounter: Encounter) => void;
}

/**
 * Pin positions are percentages within eridan-map.jpg's native 2048x1536
 * canvas, taken from the design handoff's own coordinate data for these
 * exact named places (Ridgeton, The Tameless Shore, Tiuv Forest, Collmhor
 * Wood) rather than invented for this page.
 */
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1536;
const HOME_PIN = { x: (758 / MAP_WIDTH) * 100, y: (1012 / MAP_HEIGHT) * 100 };
const ENCOUNTER_PINS: Record<string, { x: number; y: number }> = {
  "tameless-shore-raiders": { x: (720 / MAP_WIDTH) * 100, y: (1060 / MAP_HEIGHT) * 100 },
  "tiuv-forest-hunter": { x: (660 / MAP_WIDTH) * 100, y: (850 / MAP_HEIGHT) * 100 },
  "collmhor-wood-marauder": { x: (330 / MAP_WIDTH) * 100, y: (1230 / MAP_HEIGHT) * 100 },
};

function describeFoes(monsterTemplateIds: string[]): string {
  const counts = new Map<string, number>();
  for (const id of monsterTemplateIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([id, count]) => {
      const name = MONSTER_TEMPLATES[id]?.name ?? id;
      return count > 1 ? `${count}x ${name}` : name;
    })
    .join(", ");
}

export function WorldMapScreen({ character, onChooseEncounter }: WorldMapScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canVenture = character.hp > 0;
  const selected = ENCOUNTERS.find((e) => e.id === selectedId);

  return (
    <div className="aow-worldmap">
      <p className="aow-eyebrow">CONTINENT OF {WORLD_NAME.toUpperCase()}</p>
      <h1 className="aow-h1">World Map</h1>

      <div className="aow-map-page-grid">
        <div className="aow-panel aow-map-panel">
          <div className="aow-panel-header">{WORLD_NAME.toUpperCase()}</div>
          <div className="aow-map-canvas" style={{ backgroundImage: `url(${eridanMap})` }}>
            <button
              type="button"
              className="aow-map-pin aow-map-pin-home"
              style={{ left: `${HOME_PIN.x}%`, top: `${HOME_PIN.y}%` }}
              onClick={() => setSelectedId(null)}
            >
              <span className="aow-map-pin-dot" />
              <span className="aow-map-pin-label">{HOME_TOWN_NAME}</span>
            </button>

            {ENCOUNTERS.map((encounter) => {
              const pin = ENCOUNTER_PINS[encounter.id];
              if (!pin) return null;
              return (
                <button
                  key={encounter.id}
                  type="button"
                  className={`aow-map-pin aow-map-pin-encounter${selectedId === encounter.id ? " active" : ""}`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  onClick={() => setSelectedId(encounter.id)}
                >
                  <span className="aow-map-pin-dot" />
                  <span className="aow-map-pin-label">{encounter.location}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="aow-panel aow-map-detail-panel">
          <div className="aow-panel-header">{selected ? "ENCOUNTER" : "HOME"}</div>
          <div className="aow-card-body">
            {!selected ? (
              <>
                <div className="aow-item-header">
                  <div>
                    <div className="aow-item-name">{HOME_TOWN_NAME}</div>
                    <div className="aow-item-type-line">Home Town · {WORLD_NAME}</div>
                  </div>
                </div>
                <p className="aow-item-flavor">{HOME_TOWN_DESCRIPTION}</p>
                <p className="aow-muted-text">Select a marked location to venture out.</p>
              </>
            ) : (
              <>
                <div className="aow-item-header">
                  <div>
                    <div className="aow-item-name">{selected.name}</div>
                    <div className="aow-item-type-line">{selected.location}</div>
                  </div>
                </div>
                <p className="aow-item-flavor">{selected.flavorText}</p>
                <div className="aow-skill-stat-grid">
                  <div className="aow-skill-stat aow-map-foes-stat">
                    <span className="aow-skill-stat-label">FOES</span>
                    <span>{describeFoes(selected.monsterTemplateIds)}</span>
                  </div>
                </div>
                {!canVenture && <p className="aow-warning">Too wounded to venture out — rest first.</p>}
                <button
                  type="button"
                  className="aow-button-primary aow-map-venture-button"
                  disabled={!canVenture}
                  onClick={() => onChooseEncounter(selected)}
                >
                  Venture Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
