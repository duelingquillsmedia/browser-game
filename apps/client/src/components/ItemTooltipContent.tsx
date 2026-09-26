import type { Character, ItemTemplate } from "@eridan/engine";
import { compareToEquipped, formatItemStats, slotLabel } from "../game/itemDisplay";
import { ItemIcon } from "./ItemIcon";

export interface ItemTooltipContentProps {
  item: ItemTemplate;
  /** When given, shows "· Equipped" and a vs.-equipped comparison line for a candidate that isn't already equipped. */
  character?: Character;
  quantity?: number;
  /** Overrides the "Value: N gold" line, e.g. "Sells for 8 gold" on a Blacksmith sell row. */
  priceOverride?: string;
}

/** The hover-tooltip body for an item, shown in the Inventory, Character screen equipment slots, and Town Hub shops. */
export function ItemTooltipContent({ item, character, quantity, priceOverride }: ItemTooltipContentProps) {
  const equipped = character ? Object.values(character.equipment).includes(item.id) : false;
  const comparison = character ? compareToEquipped(character, item) : null;
  const stats = formatItemStats(item);

  return (
    <div>
      <div className="aow-item-header" style={{ marginBottom: 6 }}>
        <div className="aow-item-icon">
          <ItemIcon itemId={item.id} slot={item.slot} />
        </div>
        <div>
          <div className="aow-item-name">{item.name}</div>
          <div className="aow-item-type-line">
            {slotLabel(item.slot)}
            {quantity && quantity > 1 ? ` · ×${quantity}` : ""}
            {equipped ? " · Equipped" : ""}
          </div>
        </div>
      </div>

      {stats && <p className="aow-item-stats">{stats}</p>}
      <p className="aow-item-flavor">{item.description}</p>

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

      <p className="aow-item-value">{priceOverride ?? `Value: ${item.value} gold`}</p>
    </div>
  );
}
