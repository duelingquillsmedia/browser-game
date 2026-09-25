import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  CLASSES,
  RACES,
  computeResourceMax,
  getClassResource,
  type Character,
} from "@eridan/engine";
import { ItemIcon } from "../components/ItemIcon";
import { HOME_TOWN_DESCRIPTION, HOME_TOWN_NAME, WORLD_NAME } from "../game/lore";
import eridanMap from "../assets/world/eridan-map.jpg";
import "./HomeScreen.css";

export interface HomeScreenProps {
  character: Character;
  onVentureOut: () => void;
  onRest: () => void;
  onOpenCharacterSheet: () => void;
  onOpenInventory: () => void;
  onOpenSkills: () => void;
  onSignOut: () => void;
}

export function HomeScreen({
  character,
  onVentureOut,
  onRest,
  onOpenCharacterSheet,
  onOpenInventory,
  onOpenSkills,
  onSignOut,
}: HomeScreenProps) {
  const race = RACES[character.raceId];
  const cls = CLASSES[character.classId];
  const resourceConfig = getClassResource(character.classId);
  const resourceMax = computeResourceMax(character.abilityScores, character.classId);
  const canVenture = character.hp > 0;
  const canRest = character.hp < character.maxHp;

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100));
  const resourcePct =
    resourceConfig && resourceMax ? Math.max(0, Math.min(100, ((character.resource ?? 0) / resourceMax) * 100)) : 0;

  const equippedSlots = (["weapon", "armor", "accessory"] as const).filter((slot) => character.equipment[slot]);

  return (
    <div className="aow-home">
      <p className="aow-eyebrow">
        LEVEL {character.level} {race?.name?.toUpperCase() ?? character.raceId.toUpperCase()}{" "}
        {cls?.name?.toUpperCase() ?? character.classId.toUpperCase()}
      </p>
      <h1 className="aow-h1">{character.name}</h1>

      <div className="aow-home-row">
        <div className="aow-panel aow-card aow-card-character">
          <div className="aow-panel-header">
            CHARACTER
            <button type="button" className="aow-open" onClick={onOpenCharacterSheet}>
              OPEN ›
            </button>
          </div>
          <div className="aow-card-body">
            <div className="aow-identity">
              <div className="aow-level-diamond">
                <span>{character.level}</span>
              </div>
              <div>
                <div className="aow-character-name">{character.name}</div>
                <div className="aow-character-sub">
                  {race?.name ?? character.raceId} · {cls?.name ?? character.classId}
                </div>
              </div>
            </div>

            <div className="aow-bar-label">
              <span>HEALTH</span>
              <span>
                {character.hp} / {character.maxHp}
              </span>
            </div>
            <div className="aow-bar-track">
              <div className="aow-bar-fill hp" style={{ width: `${hpPct}%` }} />
            </div>

            {resourceConfig && (
              <>
                <div className="aow-bar-label" style={{ marginTop: 8 }}>
                  <span>{resourceConfig.name.toUpperCase()}</span>
                  <span>
                    {character.resource ?? 0} / {resourceMax}
                  </span>
                </div>
                <div className="aow-bar-track">
                  <div className="aow-bar-fill mana" style={{ width: `${resourcePct}%` }} />
                </div>
              </>
            )}

            <div className="aow-attr-grid">
              {ABILITY_KEYS.map((key) => (
                <div key={key} className="aow-attr-cell">
                  <span className="aow-attr-label">{ABILITY_NAMES[key].slice(0, 3).toUpperCase()}</span>
                  <span className="aow-attr-value">{character.abilityScores[key]}</span>
                </div>
              ))}
            </div>

            {!canVenture && <p className="aow-warning">Too wounded to venture out — rest first.</p>}
            <div className="aow-card-actions">
              <button type="button" className="aow-button-ghost" disabled={!canRest} onClick={onRest}>
                Rest
              </button>
              <button type="button" className="aow-button-ghost" onClick={onSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="aow-panel aow-card aow-card-map" onClick={onVentureOut} disabled={!canVenture}>
          <div className="aow-panel-header">
            WORLD MAP
            <span className="aow-open">OPEN ›</span>
          </div>
          <div className="aow-map-art" style={{ backgroundImage: `url(${eridanMap})` }}>
            <div className="aow-map-vignette" />
            <div className="aow-map-caption">
              <div className="aow-eyebrow">CURRENTLY AT</div>
              <div className="aow-map-place">{HOME_TOWN_NAME}</div>
              <div className="aow-map-region">{WORLD_NAME}</div>
            </div>
          </div>
        </button>
      </div>

      <div className="aow-home-row">
        <div className="aow-panel aow-card aow-card-small">
          <div className="aow-panel-header">
            INVENTORY
            <button type="button" className="aow-open" onClick={onOpenInventory}>
              OPEN ›
            </button>
          </div>
          <div className="aow-card-body">
            <div className="aow-mini-bag">
              {equippedSlots.length > 0 ? (
                equippedSlots.map((slot) => {
                  const itemId = character.equipment[slot]!;
                  return (
                    <div key={slot} className="aow-mini-cell">
                      <ItemIcon itemId={itemId} slot={slot} />
                    </div>
                  );
                })
              ) : (
                <p className="aow-muted-text">Nothing equipped.</p>
              )}
            </div>
            <p className="aow-card-meta">{character.inventory.length} ITEMS CARRIED</p>
          </div>
        </div>

        <div className="aow-panel aow-card aow-card-small">
          <div className="aow-panel-header">
            SKILLS
            <button type="button" className="aow-open" onClick={onOpenSkills}>
              OPEN ›
            </button>
          </div>
          <div className="aow-card-body">
            <ul className="aow-skill-list">
              {character.actions.slice(0, 3).map((action) => (
                <li key={action.id}>{action.name}</li>
              ))}
            </ul>
            <p className="aow-card-meta">{character.actions.length} ABILITIES KNOWN</p>
          </div>
        </div>

        <div className="aow-panel aow-card aow-card-small aow-card-soon">
          <div className="aow-panel-header">TALENTS</div>
          <div className="aow-card-body">
            <p className="aow-muted-text">Coming soon.</p>
          </div>
        </div>
      </div>

      <p className="aow-home-flavor">{HOME_TOWN_DESCRIPTION}</p>
    </div>
  );
}
