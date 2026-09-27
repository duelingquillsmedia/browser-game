import { getItem, isMagicalAbility, type Character, type ItemSlot, type ItemTemplate } from "@eridan/engine";

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

/**
 * Every class's melee Basic Attack scales off Attack Power regardless of the
 * equipped weapon's own `ability` field (see character.ts's
 * `generateBasicAttacks` -- it always uses the class's own
 * `basicAttackMelee.ability`, str for every class today, never the weapon's).
 * A ranged weapon's `ability` field, unlike melee's, does match what its
 * Basic Attack actually scales off (every ranged item's `ability` was set to
 * mirror its wielding class's `basicAttackRanged.ability`), so it's a
 * reliable, item-only way to label Attack Power vs. Spell Power here without
 * needing the wielder's class in scope.
 */
function powerLabel(item: ItemTemplate): "Attack Power" | "Spell Power" {
  if (item.slot === "meleeWeapon") return "Attack Power";
  return isMagicalAbility(item.ability ?? "str") ? "Spell Power" : "Attack Power";
}

export function formatItemStats(item: ItemTemplate): string | null {
  const parts: string[] = [];
  if (item.damageMin !== undefined && item.damageMax !== undefined) {
    const damageType = item.damageType ?? "slashing";
    parts.push(`${item.damageMin}-${item.damageMax} Damage · ${capitalize(damageType)} (${powerLabel(item)})`);
  }
  if (item.armorRating) parts.push(`+${item.armorRating} Armor`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type ItemComparison =
  | { kind: "weapon"; from: string | null; to: string | null }
  | { kind: "armor"; delta: number };

/** What changes if `candidate` replaced whatever's currently equipped in its slot, if anything's there. Consumables have no slot, so nothing to compare. */
export function compareToEquipped(character: Character, candidate: ItemTemplate): ItemComparison | null {
  if (!candidate.slot) return null;
  const equippedId = character.equipment[candidate.slot];
  if (!equippedId || equippedId === candidate.id) return null;
  const equipped = getItem(equippedId);
  if (candidate.slot === "meleeWeapon" || candidate.slot === "rangedWeapon") {
    return { kind: "weapon", from: formatItemStats(equipped), to: formatItemStats(candidate) };
  }
  const delta = (candidate.armorRating ?? 0) - (equipped.armorRating ?? 0);
  return { kind: "armor", delta };
}
