import { useState } from "react";
import {
  ITEM_TEMPLATES,
  SELL_PRICE_RATIO,
  buyItem,
  computeResourceMax,
  getClassResource,
  getItem,
  sellItem,
  type Character,
} from "@eridan/engine";
import { restCharacter } from "../game/setup";

export interface TownHubPanelProps {
  townName: string;
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

type Building = "inn" | "store" | "blacksmith";

const CONSUMABLE_ITEMS = Object.values(ITEM_TEMPLATES).filter((item) => item.consumable);
const GEAR_ITEMS = Object.values(ITEM_TEMPLATES).filter((item) => !item.consumable);

/**
 * A settlement's Inn/General Store/Blacksmith, shown on the World Map once
 * the party has actually arrived there (see WorldMapScreen). Every
 * settlement offers the same three buildings -- no per-town customization
 * this pass.
 */
export function TownHubPanel({ townName, character, onUpdateCharacter }: TownHubPanelProps) {
  const [building, setBuilding] = useState<Building | null>(null);

  const resourceConfig = getClassResource(character.classId);
  const resourceMax = computeResourceMax(character.abilityScores, character.classId, character.level);
  const needsRest = character.hp < character.maxHp || (resourceMax !== undefined && (character.resource ?? 0) < resourceMax);

  const equippedIds = new Set(Object.values(character.equipment).filter(Boolean) as string[]);
  const sellableStacks = character.inventory
    .filter((stack) => stack.quantity > 0 && !equippedIds.has(stack.itemId))
    .map((stack) => ({ stack, item: getItem(stack.itemId) }))
    .filter(({ item }) => item.slot); // gear only -- potions are used, not sold, at the General Store/Inventory

  function toggle(next: Building) {
    setBuilding((current) => (current === next ? null : next));
  }

  return (
    <div className="aow-panel aow-town-hub-panel">
      <div className="aow-panel-header">
        {townName.toUpperCase()} TOWN HUB
        <span className="aow-town-hub-gold">{character.gold.toLocaleString()}G</span>
      </div>
      <div className="aow-card-body aow-town-hub-body">
        <div className="aow-town-hub-buildings">
          <button
            type="button"
            className={`aow-town-hub-building${building === "inn" ? " active" : ""}`}
            onClick={() => toggle("inn")}
          >
            <span className="aow-town-hub-building-name">Inn</span>
            <span className="aow-town-hub-building-hint">Rest &amp; recover</span>
          </button>
          <button
            type="button"
            className={`aow-town-hub-building${building === "store" ? " active" : ""}`}
            onClick={() => toggle("store")}
          >
            <span className="aow-town-hub-building-name">General Store</span>
            <span className="aow-town-hub-building-hint">Potions</span>
          </button>
          <button
            type="button"
            className={`aow-town-hub-building${building === "blacksmith" ? " active" : ""}`}
            onClick={() => toggle("blacksmith")}
          >
            <span className="aow-town-hub-building-name">Blacksmith</span>
            <span className="aow-town-hub-building-hint">Weapons &amp; armor</span>
          </button>
        </div>

        {building === "inn" && (
          <div className="aow-town-hub-section">
            <p className="aow-muted-text">
              Rest here to restore your Health{resourceConfig ? ` and ${resourceConfig.name}` : ""} to full — free, any time.
            </p>
            <button
              type="button"
              className="aow-button-primary"
              disabled={!needsRest}
              onClick={() => onUpdateCharacter(restCharacter(character))}
            >
              Rest
            </button>
          </div>
        )}

        {building === "store" && (
          <div className="aow-town-hub-section">
            {CONSUMABLE_ITEMS.map((item) => (
              <div key={item.id} className="aow-town-hub-row">
                <div>
                  <div className="aow-town-hub-row-name">{item.name}</div>
                  <div className="aow-town-hub-row-desc">{item.description}</div>
                </div>
                <button
                  type="button"
                  className="aow-button-ghost"
                  disabled={character.gold < item.value}
                  onClick={() => onUpdateCharacter(buyItem(character, item.id))}
                >
                  Buy · {item.value}G
                </button>
              </div>
            ))}
          </div>
        )}

        {building === "blacksmith" && (
          <div className="aow-town-hub-section">
            <div className="aow-town-hub-subheader">FOR SALE</div>
            {GEAR_ITEMS.map((item) => (
              <div key={item.id} className="aow-town-hub-row">
                <div>
                  <div className="aow-town-hub-row-name">{item.name}</div>
                  <div className="aow-town-hub-row-desc">{item.description}</div>
                </div>
                <button
                  type="button"
                  className="aow-button-ghost"
                  disabled={character.gold < item.value}
                  onClick={() => onUpdateCharacter(buyItem(character, item.id))}
                >
                  Buy · {item.value}G
                </button>
              </div>
            ))}

            <div className="aow-town-hub-subheader">SELL YOUR GEAR</div>
            {sellableStacks.length === 0 ? (
              <p className="aow-muted-text">Nothing unequipped to sell.</p>
            ) : (
              sellableStacks.map(({ stack, item }) => (
                <div key={item.id} className="aow-town-hub-row">
                  <div className="aow-town-hub-row-name">
                    {item.name}
                    {stack.quantity > 1 ? ` ×${stack.quantity}` : ""}
                  </div>
                  <button type="button" className="aow-button-ghost" onClick={() => onUpdateCharacter(sellItem(character, item.id))}>
                    Sell · {Math.round(item.value * SELL_PRICE_RATIO)}G
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
