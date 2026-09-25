import {
  CRIT_MULTIPLIER,
  DAMAGE_TYPES,
  RACES,
  computeAttackPower,
  computeCritChance,
  computeEvasion,
  computeResourceRegenPerTurn,
  getClassResource,
  getItem,
  initiativeModifier,
  PLAYER_AP_PER_TURN,
  type Character,
  type DamageType,
  type ItemTemplate,
} from "@eridan/engine";

/**
 * The design handoff colors equipment-slot tiles by item rarity (common/uncommon/
 * rare/epic/legendary), but this engine's items have no rarity field -- only a
 * flavor `value` in gold. We derive a display-only rarity tier from that value so
 * equipped gear still reads with the handoff's varied tile coloring instead of a
 * flat single color; it never affects gameplay, only the tile's border/fill/glow.
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Hex values mirror `--aow-rarity-*` in aow-theme.css -- keep both in sync. */
const RARITY_COLOR: Record<Rarity, string> = {
  common: "#a8a29c",
  uncommon: "#86c46f",
  rare: "#6aa7e6",
  epic: "#b287e6",
  legendary: "#e6a64e",
};

export function rarityForItem(item: ItemTemplate): Rarity {
  if (item.value >= 30) return "epic";
  if (item.value >= 20) return "rare";
  if (item.value >= 10) return "uncommon";
  return "common";
}

export function rarityColor(rarity: Rarity): string {
  return RARITY_COLOR[rarity];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Slot tile visuals, ported from the handoff's `eqMap`: a diagonal-stripe fill of the rarity color plus a matching glow. */
export function equipmentTileStyle(item: ItemTemplate | undefined): { borderColor: string; background: string; boxShadow?: string; color: string } {
  if (!item) {
    return { borderColor: "rgba(232, 200, 170, 0.15)", background: "#100d13", color: "#6b625c" };
  }
  const color = rarityColor(rarityForItem(item));
  return {
    borderColor: color,
    background: `repeating-linear-gradient(135deg, ${rgba(color, 0.14)} 0 4px, transparent 4px 8px), #120f16`,
    boxShadow: `0 0 10px ${rgba(color, 0.25)}`,
    color,
  };
}

export interface CombatStatRow {
  label: string;
  value: string;
}

export interface CombatStatGroup {
  title: string;
  rows: CombatStatRow[];
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Tempo / Offense / Defense groups, ported from the handoff's `COMBAT` data -- mapped onto whichever of our own derived stats are the closest real equivalent (see README's "Character screen rebuild" section for what was substituted and why). */
export function combatStatGroups(character: Character): CombatStatGroup[] {
  const race = RACES[character.raceId];
  const resourceConfig = getClassResource(character.classId);
  const resourceRegen = computeResourceRegenPerTurn(character.abilityScores, character.classId);
  const weaponId = character.equipment.weapon;
  const weapon = weaponId ? getItem(weaponId) : undefined;
  const attackPower = computeAttackPower(character.abilityScores[weapon?.ability ?? "str"]);
  const totalEvasion = Math.round(computeEvasion(character.abilityScores.dex) + character.gearEvasionBonus);

  const tempoRows: CombatStatRow[] = [
    { label: "Action Points", value: `${PLAYER_AP_PER_TURN} / turn` },
    { label: "Initiative", value: formatModifier(initiativeModifier(character)) },
    { label: "Speed", value: `${race?.speed ?? 30} ft` },
  ];
  if (resourceConfig) {
    tempoRows.push({ label: `${resourceConfig.name} per turn`, value: `+${resourceRegen}` });
  }

  return [
    { title: "Tempo", rows: tempoRows },
    {
      title: "Offense",
      rows: [
        { label: "Attack Power", value: `${attackPower}` },
        { label: "Critical Chance", value: `${computeCritChance(character.abilityScores.dex).toFixed(1)}%` },
        { label: "Critical Effect", value: `${Math.round(CRIT_MULTIPLIER * 100)}%` },
      ],
    },
    {
      title: "Defense",
      rows: [
        { label: "Health", value: `${character.maxHp}` },
        { label: "Evasion", value: `${totalEvasion}%` },
        { label: "Armor Bonus", value: `+${character.gearEvasionBonus}` },
        { label: "Proficiency Bonus", value: formatModifier(character.proficiencyBonus) },
      ],
    },
  ];
}

export interface ResistanceRow {
  label: string;
  pct: number;
  color: string;
  valueText: string;
}

/**
 * The handoff shows Resistances as flat-colored bars per elemental school (Fire/Frost/
 * Nature/Shadow/Radiant/Arcane) with hand-picked percentages -- a stat this engine
 * doesn't have. What the engine does have is per-damage-type resistant/vulnerable/immune
 * flags that halve, double, or zero incoming damage. We reuse the bar visual for those
 * real flags: resistant -> 50%, immune -> a full gold bar labeled "IMMUNE", vulnerable ->
 * a full ember-red bar labeled "x2" (there's no vulnerability bar in the source to copy,
 * so this reversed-color treatment is our own, not ported).
 */
export function resistanceRows(character: Character): ResistanceRow[] {
  const rows: ResistanceRow[] = [];
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  for (const type of DAMAGE_TYPES as readonly DamageType[]) {
    if (character.damageImmunities?.includes(type)) {
      rows.push({ label: capitalize(type), pct: 100, color: "#d9b865", valueText: "IMMUNE" });
    } else if (character.damageResistances?.includes(type)) {
      rows.push({ label: capitalize(type), pct: 50, color: "#86c46f", valueText: "50%" });
    } else if (character.damageVulnerabilities?.includes(type)) {
      rows.push({ label: capitalize(type), pct: 100, color: "#d0604a", valueText: "×2" });
    }
  }
  return rows;
}
