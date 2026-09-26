import {
  ABILITY_NAMES,
  CLASS_HEALTH_BONUS,
  CLASSES,
  CRIT_MULTIPLIER,
  DAMAGE_TYPES,
  computeAttackPower,
  computeCritChance,
  computeEvasion,
  getClassResource,
  getItem,
  PLAYER_AP_PER_TURN,
  type AbilityKey,
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

export interface StatBreakdownFactor {
  label: string;
  value: string;
}

export interface StatBreakdown {
  /** One-line description of how the stat is derived, e.g. "Strength × 2". */
  formula: string;
  /** The individual terms that combine into the total, in order. */
  factors: StatBreakdownFactor[];
  /** The final value, repeated here so the tooltip's last line reads as a clear "= total". */
  total: string;
  /** What to raise to increase this stat -- the whole point of the tooltip (see the "COMBAT" stat hover-tooltip pass). */
  hint: string;
}

export interface CombatStatRow {
  label: string;
  value: string;
  breakdown: StatBreakdown;
}

export interface CombatStatGroup {
  title: string;
  rows: CombatStatRow[];
}

/** Tempo / Offense / Defense groups, ported from the handoff's `COMBAT` data -- mapped onto whichever of our own derived stats are the closest real equivalent (see README's "Character screen rebuild" section for what was substituted and why). */
export function combatStatGroups(character: Character): CombatStatGroup[] {
  const cls = CLASSES[character.classId];
  const resourceConfig = getClassResource(character.classId);
  const weaponId = character.equipment.meleeWeapon ?? character.equipment.rangedWeapon;
  const weapon = weaponId ? getItem(weaponId) : undefined;
  const attackAbility: AbilityKey = weapon?.ability ?? "str";
  const attackAbilityScore = character.abilityScores[attackAbility];
  const attackPower = computeAttackPower(attackAbilityScore);
  const dex = character.abilityScores.dex;
  const critChance = computeCritChance(dex);
  const dexEvasion = computeEvasion(dex);
  const totalEvasion = Math.round(dexEvasion + character.gearEvasionBonus);

  const armor = character.equipment.armor ? getItem(character.equipment.armor) : undefined;
  const accessory = character.equipment.accessory ? getItem(character.equipment.accessory) : undefined;
  const armorFactors: StatBreakdownFactor[] = [];
  if (armor?.evasionBonus) armorFactors.push({ label: armor.name, value: `+${armor.evasionBonus}%` });
  if (accessory?.evasionBonus) armorFactors.push({ label: accessory.name, value: `+${accessory.evasionBonus}%` });
  if (cls?.passiveEvasionBonus) armorFactors.push({ label: `${cls.name} passive`, value: `+${cls.passiveEvasionBonus}%` });

  const vit = character.abilityScores.vit;
  const classHealthBonus = CLASS_HEALTH_BONUS[character.classId] ?? 0;
  // No exported per-level HP constant to read directly, so back it out from the total instead of duplicating the number.
  const levelHealthGrowth = character.maxHp - 100 - vit * 10 - classHealthBonus;

  const tempoRows: CombatStatRow[] = [
    {
      label: "Action Points",
      value: `${PLAYER_AP_PER_TURN} / turn`,
      breakdown: {
        formula: "Fixed for every character",
        factors: [],
        total: `${PLAYER_AP_PER_TURN} / turn`,
        hint: "Not affected by any attribute -- every character gets the same amount each turn.",
      },
    },
  ];
  if (resourceConfig) {
    tempoRows.push({
      label: `${resourceConfig.name} per Hit`,
      value: `+${resourceConfig.gainOnBasicAttack}`,
      breakdown: {
        formula: `Fixed per class (${cls?.name ?? character.classId})`,
        factors: [],
        total: `+${resourceConfig.gainOnBasicAttack}`,
        hint: `Not affected by any attribute -- every landed Basic Attack grants this much ${resourceConfig.name}.`,
      },
    });
  }

  return [
    { title: "Tempo", rows: tempoRows },
    {
      title: "Offense",
      rows: [
        {
          label: "Attack Power",
          value: `${attackPower}`,
          breakdown: {
            formula: `${ABILITY_NAMES[attackAbility]} × 2`,
            factors: [{ label: `${ABILITY_NAMES[attackAbility]} score`, value: `${attackAbilityScore}` }],
            total: `${attackPower}`,
            hint: weapon
              ? `Governed by your equipped weapon's ability (${ABILITY_NAMES[attackAbility]}). Raise ${ABILITY_NAMES[attackAbility]}, or equip a weapon keyed to a higher score, to increase this.`
              : `No weapon equipped, so this defaults to Strength. Raise Strength, or equip a weapon, to increase this.`,
          },
        },
        {
          label: "Critical Chance",
          value: `${critChance.toFixed(1)}%`,
          breakdown: {
            formula: "5% base + (Dexterity × 1.2%)",
            factors: [
              { label: "Base", value: "5%" },
              { label: `Dexterity (${dex})`, value: `+${(dex * 1.2).toFixed(1)}%` },
            ],
            total: `${critChance.toFixed(1)}%`,
            hint: "Raise your Dexterity to increase this.",
          },
        },
        {
          label: "Critical Effect",
          value: `${Math.round(CRIT_MULTIPLIER * 100)}%`,
          breakdown: {
            formula: "Fixed for every character",
            factors: [],
            total: `${Math.round(CRIT_MULTIPLIER * 100)}%`,
            hint: "Not affected by any attribute -- every critical hit deals this much of a normal hit's damage.",
          },
        },
      ],
    },
    {
      title: "Defense",
      rows: [
        {
          label: "Health",
          value: `${character.maxHp}`,
          breakdown: {
            formula: "100 base + (Vitality × 10) + class bonus + level growth",
            factors: [
              { label: "Base", value: "100" },
              { label: `Vitality (${vit})`, value: `+${vit * 10}` },
              { label: `${cls?.name ?? character.classId} class bonus`, value: `+${classHealthBonus}` },
              { label: `Level ${character.level} growth`, value: `+${levelHealthGrowth}` },
            ],
            total: `${character.maxHp}`,
            hint: "Raise your Vitality, or level up, to increase this.",
          },
        },
        {
          label: "Evasion",
          value: `${totalEvasion}%`,
          breakdown: {
            formula: "(Dexterity × 1.5%) + Armor Bonus",
            factors: [
              { label: `Dexterity (${dex})`, value: `${dexEvasion.toFixed(1)}%` },
              { label: "Armor Bonus", value: `+${character.gearEvasionBonus}%` },
            ],
            total: `${totalEvasion}%`,
            hint: "Raise your Dexterity, or equip gear with a higher evasion bonus, to increase this.",
          },
        },
        {
          label: "Armor Bonus",
          value: `+${character.gearEvasionBonus}`,
          breakdown: {
            formula: armorFactors.length > 0 ? "Sum of equipped armor/accessory/passive bonuses" : "Nothing currently contributes",
            factors: armorFactors,
            total: `+${character.gearEvasionBonus}`,
            hint: "Equip armor or an accessory with a higher evasion bonus to increase this.",
          },
        },
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
