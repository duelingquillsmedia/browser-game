import { useState } from "react";
import { equipItem, getItem, unequipItem, useConsumable, type Character, type ItemSlot, type ItemTemplate } from "@eridan/engine";
import { ItemIcon } from "../components/ItemIcon";
import { ItemTooltipContent } from "../components/ItemTooltipContent";
import { Tooltip } from "../components/Tooltip";
import { compareToEquipped, formatItemStats, slotLabel } from "../game/itemDisplay";
import "./InventoryScreen.css";

export interface InventoryScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

/** Bag size for the boxed inventory grid; unused slots render as empty boxes. */
const BAG_SLOT_COUNT = 20;

type FilterId = "all" | ItemSlot | "consumable";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "meleeWeapon", label: "Melee" },
  { id: "rangedWeapon", label: "Ranged" },
  { id: "armor", label: "Armor" },
  { id: "accessory", label: "Accessory" },
  { id: "consumable", label: "Potions" },
];

/** An item's own slot, or "consumable" for a slot-less potion -- used to bucket it under a filter tab. */
function filterBucket(item: ItemTemplate): FilterId {
  return item.slot ?? "consumable";
}

export function InventoryScreen({ character, onUpdateCharacter }: InventoryScreenProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const equippedIds = new Set(Object.values(character.equipment));
  const counts: Record<FilterId, number> = {
    all: character.inventory.length,
    meleeWeapon: 0,
    rangedWeapon: 0,
    armor: 0,
    accessory: 0,
    consumable: 0,
  };
  for (const stack of character.inventory) counts[filterBucket(getItem(stack.itemId))]++;

  const selectedStack = selectedItemId ? character.inventory.find((s) => s.itemId === selectedItemId) : undefined;
  const selectedItem = selectedStack ? getItem(selectedStack.itemId) : undefined;
  const comparison = selectedItem ? compareToEquipped(character, selectedItem) : null;

  return (
    <div className="aow-inventory">
      <p className="aow-eyebrow">ITEMS CARRIED · {character.inventory.length} OF {BAG_SLOT_COUNT} CELLS USED</p>
      <h1 className="aow-h1">Inventory</h1>

      <div className="aow-inventory-grid">
        <div className="aow-panel aow-bag-panel">
          <div className="aow-panel-header">
            BAG
            <span className="aow-open">
              {character.inventory.length} / {BAG_SLOT_COUNT}
            </span>
          </div>
          <div className="aow-card-body">
            <div className="aow-filter-row">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`aow-filter-tab${filter === f.id ? " active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label.toUpperCase()} {counts[f.id]}
                </button>
              ))}
            </div>

            <div className="aow-bag-grid">
              {Array.from({ length: Math.max(BAG_SLOT_COUNT, character.inventory.length) }).map((_, index) => {
                const stack = character.inventory[index];
                if (!stack) return <div key={`empty-${index}`} className="aow-bag-cell" />;
                const item = getItem(stack.itemId);
                const matches = filter === "all" || filterBucket(item) === filter;
                const isSelected = selectedItemId === stack.itemId;
                return (
                  <Tooltip
                    key={stack.itemId}
                    content={<ItemTooltipContent item={item} character={character} quantity={stack.quantity} />}
                  >
                    <button
                      type="button"
                      className={`aow-bag-cell filled${isSelected ? " selected" : ""}`}
                      style={{ opacity: matches ? 1 : 0.22 }}
                      onClick={() => setSelectedItemId(isSelected ? null : stack.itemId)}
                    >
                      <ItemIcon itemId={item.id} slot={item.slot} />
                      {equippedIds.has(item.id) && <span className="aow-bag-equipped-dot" />}
                      {stack.quantity > 1 && <span className="aow-bag-qty">×{stack.quantity}</span>}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        <div className="aow-panel aow-item-panel">
          <div className="aow-panel-header">ITEM</div>
          <div className="aow-card-body">
            {!selectedItem || !selectedStack ? (
              <p className="aow-muted-text">Select an item to see its details.</p>
            ) : (
              <>
                <div className="aow-item-header">
                  <div className="aow-item-icon">
                    <ItemIcon itemId={selectedItem.id} slot={selectedItem.slot} />
                  </div>
                  <div>
                    <div className="aow-item-name">{selectedItem.name}</div>
                    <div className="aow-item-type-line">
                      {slotLabel(selectedItem.slot)}
                      {selectedStack.quantity > 1 ? ` · ×${selectedStack.quantity}` : ""}
                      {equippedIds.has(selectedItem.id) ? " · Equipped" : ""}
                    </div>
                  </div>
                </div>

                {formatItemStats(selectedItem) && <p className="aow-item-stats">{formatItemStats(selectedItem)}</p>}
                <p className="aow-item-flavor">{selectedItem.description}</p>

                {comparison && comparison.kind === "evasion" && comparison.delta !== 0 && (
                  <div className={`aow-item-compare ${comparison.delta > 0 ? "aow-resist-good" : "aow-resist-bad"}`}>
                    vs. equipped: {comparison.delta > 0 ? "+" : ""}
                    {comparison.delta} Evasion
                  </div>
                )}
                {comparison && comparison.kind === "weapon" && (
                  <div className="aow-item-compare aow-item-compare-weapon">
                    vs. equipped: {comparison.from ?? "—"} → {comparison.to ?? "—"}
                  </div>
                )}

                <p className="aow-item-value">Value: {selectedItem.value} gold</p>

                {selectedItem.consumable ? (
                  <button
                    type="button"
                    className="aow-button-primary"
                    onClick={() => onUpdateCharacter(useConsumable(character, selectedItem.id))}
                  >
                    Use
                  </button>
                ) : equippedIds.has(selectedItem.id) ? (
                  <button
                    type="button"
                    className="aow-button-ghost"
                    // Only real equipment is ever "equipped", so `slot` is always defined here.
                    onClick={() => onUpdateCharacter(unequipItem(character, selectedItem.slot!))}
                  >
                    Unequip
                  </button>
                ) : (
                  <button
                    type="button"
                    className="aow-button-primary"
                    onClick={() => onUpdateCharacter(equipItem(character, selectedItem.id))}
                  >
                    Equip
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
