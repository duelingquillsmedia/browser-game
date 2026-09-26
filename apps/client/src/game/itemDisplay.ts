import { ABILITY_NAMES, getItem, type Character, type ItemSlot, type ItemTemplate } from "@eridan/engine";

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const SLOT_LABELS: Record<ItemSlot, string> = {
  meleeWeapon: "Melee Weapon",
  rangedWeapon: "Ranged Weapon",
  armor: "Armor",
  accessory: "Accessory",
};

/** An item's slot as a display label, or "Potion" for a slot-less consumable. */
export function slotLabel(slot: ItemSlot | undefined): string {
  return slot ? SLOT_LABELS[slot] : "Potion";
}

export function formatItemStats(item: ItemTemplate): string | null {
  const parts: string[] = [];
  if (item.damageMin !== undefined && item.damageMax !== undefined) {
    const ability = item.ability ?? "str";
    const damageType = item.damageType ?? "slashing";
    parts.push(`${item.damageMin}-${item.damageMax} Damage · ${capitalize(damageType)} (${ABILITY_NAMES[ability]})`);
  }
  if (item.evasionBonus) parts.push(`+${item.evasionBonus} Evasion`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type ItemComparison =
  | { kind: "weapon"; from: string | null; to: string | null }
  | { kind: "evasion"; delta: number };

/** What changes if `candidate` replaced whatever's currently equipped in its slot, if anything's there. Consumables have no slot, so nothing to compare. */
export function compareToEquipped(character: Character, candidate: ItemTemplate): ItemComparison | null {
  if (!candidate.slot) return null;
  const equippedId = character.equipment[candidate.slot];
  if (!equippedId || equippedId === candidate.id) return null;
  const equipped = getItem(equippedId);
  if (candidate.slot === "meleeWeapon" || candidate.slot === "rangedWeapon") {
    return { kind: "weapon", from: formatItemStats(equipped), to: formatItemStats(candidate) };
  }
  const delta = (candidate.evasionBonus ?? 0) - (equipped.evasionBonus ?? 0);
  return { kind: "evasion", delta };
}
