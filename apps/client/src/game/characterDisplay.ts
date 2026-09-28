import {
  ABILITY_NAMES,
  ARMOR_EVASION_RATIO,
  CLASS_HEALTH_BONUS,
  CLASSES,
  CRIT_DAMAGE_BASE_PERCENT,
  CRIT_DAMAGE_PERCENT_PER_POINT,
  DAMAGE_TYPES,
  computeAttackPower,
  computeCritChance,
  computeEvasion,
  equipmentAbilityBonuses,
  getClassResource,
  getItem,
  magicalAttackAbility,
  raceAbilityGrowth,
  PLAYER_AP_PER_TURN,
  type AbilityKey,
  type Character,
  type CharacterClass,
  type DamageType,
  type ItemSlot,
  type ItemTemplate,
  type Race,
} from "@eridan/engine";

/** "+2 Wisdom, +1 Strength, +1 Vitality every even level." Same formatting for a race's odd-level growth and a class's even-level growth -- undefined when there's nothing to show (a raceless Half-elf edge case that shouldn't occur in practice). */
function formatStatGrowth(growth: Partial<Record<AbilityKey, number>>, frequency: "odd" | "even"): string | undefined {
  const entries = Object.entries(growth) as [AbilityKey, number][];
  if (entries.length === 0) return undefined;
  const parts = entries.map(([key, amount]) => `+${amount} ${ABILITY_NAMES[key]}`);
  return `${parts.join(", ")} every ${frequency} level.`;
}

/** A character's actual racial ability growth, resolving a Half-elf's own creation-time pick rather than the (empty) generic table on `Race` itself. */
export function racialStatGrowthText(character: Character, race: Race): string | undefined {
  return formatStatGrowth(raceAbilityGrowth(race, character.raceChoice), "odd");
}

export function classStatGrowthText(cls: CharacterClass): string | undefined {
  return formatStatGrowth(cls.evenLevelAbilityGrowth, "even");
}

const EQUIPMENT_SLOT_LABELS: Record<ItemSlot, string> = {
  meleeWeapon: "Melee Weapon",
  rangedWeapon: "Ranged Weapon",
  armor: "Armor",
  accessory: "Accessory",
};

/** How much of a character's current ability score comes from equipped gear -- 0 when nothing equipped grants it (see `Attributes` panel, which hides its gear badge entirely in that case). */
export function gearAbilityBonus(character: Character, key: AbilityKey): number {
  return equipmentAbilityBonuses(character.equipment)[key] ?? 0;
}

/** Per-item breakdown of a gear-granted ability bonus, for the Attributes panel's hover tooltip (reuses the same `StatBreakdown`/`StatBreakdownTooltipContent` the Combat panel's stat rows already use). */
export function gearAbilityBreakdown(character: Character, key: AbilityKey): StatBreakdown {
  const factors: StatBreakdownFactor[] = [];
  let total = 0;
  for (const [slot, itemId] of Object.entries(character.equipment) as [ItemSlot, string | undefined][]) {
    if (!itemId) continue;
    const amount = getItem(itemId).abilityBonuses?.[key];
    if (!amount) continue;
    factors.push({ label: `${getItem(itemId).name} (${EQUIPMENT_SLOT_LABELS[slot]})`, value: `+${amount}` });
    total += amount;
  }
  return {
    formula: "Sum of equipped gear's bonuses to this attribute",
    factors,
    total: `+${total}`,
    hint: "Equip gear with a bonus to this attribute to increase it further.",
  };
}

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

export interface CombatStatSubgroup {
  title: string;
  rows: CombatStatRow[];
}

export interface CombatStatGroup {
  title: string;
  /** Flat rows (Tempo, Defense). Mutually exclusive with `subgroups`. */
  rows?: CombatStatRow[];
  /** Physical/Magical split (Offense only, per the Character Stats Style Sheet). */
  subgroups?: CombatStatSubgroup[];
}

/** 150% base + a per-point percentage of the relevant ability score (Strength for physical, the spellcasting ability for magical) -- see stats.ts's computeCritDamageMultiplier, which this mirrors as a percentage for display. */
function critDamagePercent(score: number): number {
  return CRIT_DAMAGE_BASE_PERCENT + score * CRIT_DAMAGE_PERCENT_PER_POINT;
}

interface AbilityInput {
  ability: AbilityKey;
  score: number;
}

/**
 * Builds the three rows of an Offense subsection. Each of Power/Critical
 * Chance/Critical Damage gets its own governing ability -- for Magical
 * they're all the same (the class's spellcasting ability), but for Physical
 * they differ: Attack Power follows whichever ability the character's own
 * weapon/Basic Attack uses, while Critical Chance is always Dexterity and
 * Critical Damage always Strength (per the Character Stats Style Sheet),
 * regardless of what powers the attack itself -- matching combat.ts's
 * `critChanceAbilityScore`/`critDamageAbilityScore` exactly.
 */
function offenseRows(
  powerLabel: "Attack Power" | "Spell Power",
  critChanceLabel: "Critical Chance" | "Magical Critical Chance",
  critDamageLabel: "Critical Damage" | "Magical Critical Damage",
  power: AbilityInput,
  critChanceInput: AbilityInput,
  critDamageInput: AbilityInput
): CombatStatRow[] {
  const powerAbilityName = ABILITY_NAMES[power.ability];
  const critChanceAbilityName = ABILITY_NAMES[critChanceInput.ability];
  const critDamageAbilityName = ABILITY_NAMES[critDamageInput.ability];
  const powerValue = computeAttackPower(power.score);
  const critChance = computeCritChance(critChanceInput.score);
  const critDamage = critDamagePercent(critDamageInput.score);
  return [
    {
      label: powerLabel,
      value: `${powerValue}`,
      breakdown: {
        formula: `${powerAbilityName} × 2`,
        factors: [{ label: `${powerAbilityName} score`, value: `${power.score}` }],
        total: `${powerValue}`,
        hint: `Raise your ${powerAbilityName} to increase this.`,
      },
    },
    {
      label: critChanceLabel,
      value: `${critChance.toFixed(1)}%`,
      breakdown: {
        formula: `5% base + (${critChanceAbilityName} × 10%)`,
        factors: [
          { label: "Base", value: "5%" },
          { label: `${critChanceAbilityName} (${critChanceInput.score})`, value: `+${(critChanceInput.score * 0.1).toFixed(1)}%` },
        ],
        total: `${critChance.toFixed(1)}%`,
        hint: `Raise your ${critChanceAbilityName} to increase this.`,
      },
    },
    {
      label: critDamageLabel,
      value: `${critDamage.toFixed(1)}%`,
      breakdown: {
        formula: `150% base + (${critDamageAbilityName} × 20%)`,
        factors: [
          { label: "Base", value: "150%" },
          { label: `${critDamageAbilityName} (${critDamageInput.score})`, value: `+${(critDamageInput.score * 0.2).toFixed(1)}%` },
        ],
        total: `${critDamage.toFixed(1)}%`,
        hint: `Raise your ${critDamageAbilityName} to increase this.`,
      },
    },
  ];
}

/**
 * Tempo / Offense (Physical + Magical) / Defense groups, per the Character
 * Stats Style Sheet. Offense splits into a Physical subsection (every
 * class) and a Magical one (Cleric/Druid/Wizard only -- see
 * classes.ts's `magicalAttackAbility`); a class with no magical attack of
 * its own simply has no Magical subsection to show.
 */
export function combatStatGroups(character: Character): CombatStatGroup[] {
  const cls = CLASSES[character.classId];
  const resourceConfig = getClassResource(character.classId);
  const dex = character.abilityScores.dex;
  const str = character.abilityScores.str;
  const vit = character.abilityScores.vit;

  // Physical Attack Power is governed by whichever ability the character's own resolved Basic
  // Attack actually uses -- mirrors real combat math exactly, including Soldier's "whichever of
  // STR/DEX is higher" rule (see character.ts's generateBasicAttacks), rather than re-deriving it
  // here. Prefers melee if equipped, else ranged, else the unarmed default (str).
  const physicalActionId = character.equipment.meleeWeapon ? "strike-melee" : character.equipment.rangedWeapon ? "strike-ranged" : "strike-melee";
  const physicalAbility: AbilityKey = character.actions.find((a) => a.id === physicalActionId)?.ability ?? "str";

  const magicAbility = magicalAttackAbility(cls);

  const dexEvasion = computeEvasion(dex);
  const armorEvasion = character.armorRating * ARMOR_EVASION_RATIO;
  const totalEvasion = Math.round(dexEvasion + armorEvasion);

  const armor = character.equipment.armor ? getItem(character.equipment.armor) : undefined;
  const accessory = character.equipment.accessory ? getItem(character.equipment.accessory) : undefined;
  const armorFactors: StatBreakdownFactor[] = [];
  if (armor?.armorRating) armorFactors.push({ label: armor.name, value: `+${armor.armorRating}` });
  if (accessory?.armorRating) armorFactors.push({ label: accessory.name, value: `+${accessory.armorRating}` });
  if (cls?.passiveArmorRating) armorFactors.push({ label: `${cls.name} passive`, value: `+${cls.passiveArmorRating}` });

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

  const subgroups: CombatStatSubgroup[] = [
    {
      title: "Physical",
      rows: offenseRows(
        "Attack Power",
        "Critical Chance",
        "Critical Damage",
        { ability: physicalAbility, score: character.abilityScores[physicalAbility] },
        { ability: "dex", score: dex },
        { ability: "str", score: str }
      ),
    },
  ];
  if (magicAbility) {
    const magicScore = character.abilityScores[magicAbility];
    subgroups.push({
      title: "Magical",
      rows: offenseRows(
        "Spell Power",
        "Magical Critical Chance",
        "Magical Critical Damage",
        { ability: magicAbility, score: magicScore },
        { ability: magicAbility, score: magicScore },
        { ability: magicAbility, score: magicScore }
      ),
    });
  }

  return [
    { title: "Tempo", rows: tempoRows },
    { title: "Offense", subgroups },
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
            formula: "(Dexterity × 50%) + (Armor × 5%)",
            factors: [
              { label: `Dexterity (${dex})`, value: `${dexEvasion.toFixed(1)}%` },
              { label: `Armor (${character.armorRating})`, value: `${armorEvasion.toFixed(1)}%` },
            ],
            total: `${totalEvasion}%`,
            hint: "Raise your Dexterity, or equip gear with higher Armor, to increase this.",
          },
        },
        {
          label: "Armor",
          value: `+${character.armorRating}`,
          breakdown: {
            formula: armorFactors.length > 0 ? "Sum of equipped armor/accessory/passive ratings" : "Nothing currently contributes",
            factors: armorFactors,
            total: `+${character.armorRating}`,
            hint: "Equip armor or an accessory with a higher rating to increase this.",
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
