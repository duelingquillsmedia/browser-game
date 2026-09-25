import { useState } from "react";
import {
  ABILITY_NAMES,
  equipItem,
  getItem,
  unequipItem,
  type Character,
  type ItemSlot,
  type ItemTemplate,
} from "@eridan/engine";
import { ItemIcon } from "../components/ItemIcon";
import "./InventoryScreen.css";

export interface InventoryScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

/** Bag size for the boxed inventory grid; unused slots render as empty boxes. */
const BAG_SLOT_COUNT = 20;

type FilterId = "all" | ItemSlot;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapon" },
  { id: "armor", label: "Armor" },
  { id: "accessory", label: "Accessory" },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatItemStats(item: ItemTemplate): string | null {
  const parts: string[] = [];
  if (item.damageBonus) {
    const ability = item.ability ?? "str";
    const damageType = item.damageType ?? "slashing";
    parts.push(`+${item.damageBonus} ${capitalize(damageType)} (${ABILITY_NAMES[ability]})`);
  }
  if (item.evasionBonus) parts.push(`+${item.evasionBonus} Evasion`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** What changes if `candidate` replaced whatever's currently equipped in its slot, if anything's there. */
function compareToEquipped(character: Character, candidate: ItemTemplate) {
  const equippedId = character.equipment[candidate.slot];
  if (!equippedId || equippedId === candidate.id) return null;
  const equipped = getItem(equippedId);
  if (candidate.slot === "weapon") {
    return { kind: "weapon" as const, from: formatItemStats(equipped), to: formatItemStats(candidate) };
  }
  const delta = (candidate.evasionBonus ?? 0) - (equipped.evasionBonus ?? 0);
  return { kind: "evasion" as const, delta };
}

export function InventoryScreen({ character, onUpdateCharacter }: InventoryScreenProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const equippedIds = new Set(Object.values(character.equipment));
  const counts: Record<FilterId, number> = {
    all: character.inventory.length,
    weapon: 0,
    armor: 0,
    accessory: 0,
  };
  for (const stack of character.inventory) counts[getItem(stack.itemId).slot]++;

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
            BAG OF HOLDING
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
                const matches = filter === "all" || item.slot === filter;
                const isSelected = selectedItemId === stack.itemId;
                return (
                  <button
                    key={stack.itemId}
                    type="button"
                    className={`aow-bag-cell filled${isSelected ? " selected" : ""}`}
                    style={{ opacity: matches ? 1 : 0.22 }}
                    title={`${item.name}${formatItemStats(item) ? ` — ${formatItemStats(item)}` : ""}`}
                    onClick={() => setSelectedItemId(isSelected ? null : stack.itemId)}
                  >
                    <ItemIcon itemId={item.id} slot={item.slot} />
                    {equippedIds.has(item.id) && <span className="aow-bag-equipped-dot" />}
                    {stack.quantity > 1 && <span className="aow-bag-qty">×{stack.quantity}</span>}
                  </button>
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
                      {capitalize(selectedItem.slot)}
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

                <p className="aow-item-value">Value: {selectedItem.value} gp</p>

                {equippedIds.has(selectedItem.id) ? (
                  <button
                    type="button"
                    className="aow-button-ghost"
                    onClick={() => onUpdateCharacter(unequipItem(character, selectedItem.slot))}
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
