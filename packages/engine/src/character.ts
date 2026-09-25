import type { AbilityKey, AbilityScores } from "./abilities.js";
import { abilityModifier } from "./dice.js";
import { getRace, type Race } from "./races.js";
import { getClass, type CharacterClass } from "./classes.js";
import { getBackground } from "./backgrounds.js";
import type { OriginFeatId } from "./feats.js";
import { BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION, type CombatActionDef } from "./actions.js";
import { getItem, type ItemSlot } from "./items.js";
import type { DamageType } from "./damage.js";
import { getClassResource } from "./resources.js";

export interface InventoryStack {
  itemId: string;
  quantity: number;
}

export interface Character {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  /** The Background chosen at creation — grants ability score increases and an Origin feat (SRD 5.2.1). */
  backgroundId: string;
  originFeatId: OriginFeatId;
  level: number;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  armorClass: number;
  proficiencyBonus: number;
  actions: CombatActionDef[];
  /** Tracks remaining uses for actions with `usesPerCombat`; reset at combat start. */
  actionUses: Record<string, number>;
  /** Everything the character owns, equipped or not. */
  inventory: InventoryStack[];
  /** Which owned item (by id) is worn in each slot, if any. */
  equipment: Partial<Record<ItemSlot, string>>;
  damageResistances?: DamageType[];
  damageVulnerabilities?: DamageType[];
  damageImmunities?: DamageType[];
  /** Current value in this class's resource pool (Arcane/Divinity/Wylde/Rage), if it has one. */
  resource?: number;
  /** This player's six Misfit Six companions, keyed by companion id. Built once via `ensureCompanionRoster`. */
  companions?: Record<string, Character>;
  /** Companion ids (up to `MAX_PARTY_SIZE - 1`) joining this player on their next mission. */
  activePartyIds?: string[];
  /** Cosmetic-only appearance preset chosen at creation; the engine doesn't act on this beyond storing it. */
  appearance?: CharacterAppearance;
}

export interface CharacterAppearance {
  presetName: string;
  skin: string;
  hair: string;
  eyes: string;
}

export function abilityMod(character: Character, key: AbilityKey): number {
  return abilityModifier(character.abilityScores[key]);
}

export function initiativeModifier(character: Character): number {
  return abilityMod(character, "dex");
}

export function ownsItem(character: Character, itemId: string): boolean {
  return character.inventory.some((stack) => stack.itemId === itemId && stack.quantity > 0);
}

/** The best of Intellect, Wisdom, or Spirit — used by the Magic Initiate origin feat's bonus cantrip. */
function bestMagicInitiateAbility(abilityScores: AbilityScores): AbilityKey {
  const candidates: AbilityKey[] = ["int", "wis", "spi"];
  return candidates.reduce((best, key) =>
    abilityModifier(abilityScores[key]) > abilityModifier(abilityScores[best]) ? key : best
  );
}

function buildMagicInitiateAction(character: Pick<Character, "abilityScores">): CombatActionDef {
  return {
    id: "minor-cantrip",
    name: "Minor Cantrip",
    description: "A flicker of borrowed magic from your background's Magic Initiate feat.",
    kind: "attack",
    target: "enemy",
    ability: bestMagicInitiateAbility(character.abilityScores),
    dice: "1d6",
    damageType: "force",
  };
}

/** Recomputes armorClass, resistances, and actions from base stats plus race/feat traits and whatever's equipped. */
function applyEquipmentEffects(character: Character, cls: CharacterClass, race: Race): Character {
  const dexMod = abilityModifier(character.abilityScores.dex);
  const armor = character.equipment.armor ? getItem(character.equipment.armor) : undefined;
  const accessory = character.equipment.accessory ? getItem(character.equipment.accessory) : undefined;
  const weapon = character.equipment.weapon ? getItem(character.equipment.weapon) : undefined;

  const armorClass = 10 + dexMod + (armor?.armorClassBonus ?? 0) + (accessory?.armorClassBonus ?? 0);

  const strike: CombatActionDef =
    weapon?.damageDice !== undefined
      ? {
          ...BASIC_ATTACK,
          name: weapon.name,
          description: `A basic attack with your equipped ${weapon.name}.`,
          ability: weapon.ability ?? BASIC_ATTACK.ability,
          dice: weapon.damageDice,
          damageType: weapon.damageType ?? BASIC_ATTACK.damageType,
        }
      : BASIC_ATTACK;

  const withStrike = cls.actions.some((a) => a.id === BASIC_ATTACK.id)
    ? cls.actions.map((a) => (a.id === BASIC_ATTACK.id ? strike : a))
    : [...cls.actions, strike];

  const bonusActions = [...(race.actions ?? [])];
  // Mages already have an at-will cantrip attack of their own (Firebolt) --
  // a Magic Initiate cantrip on top of that would just be a redundant duplicate.
  if (character.originFeatId === "magicInitiate" && character.classId !== "mage") {
    bonusActions.push(buildMagicInitiateAction(character));
  }

  const actions = [...withStrike, ...bonusActions, DEFEND_ACTION, FLEE_ACTION].filter(
    (action, index, all) => all.findIndex((a) => a.id === action.id) === index
  );

  return { ...character, armorClass, actions, damageResistances: race.damageResistances ?? [] };
}

export function equipItem(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (!ownsItem(character, itemId)) {
    throw new Error(`"${item.name}" is not in ${character.name}'s inventory.`);
  }
  const equipped = { ...character, equipment: { ...character.equipment, [item.slot]: itemId } };
  return applyEquipmentEffects(equipped, getClass(character.classId), getRace(character.raceId));
}

export function unequipItem(character: Character, slot: ItemSlot): Character {
  const equipment = { ...character.equipment };
  delete equipment[slot];
  return applyEquipmentEffects({ ...character, equipment }, getClass(character.classId), getRace(character.raceId));
}

export interface CreateCharacterOptions {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  backgroundId: string;
  baseAbilityScores: AbilityScores;
  level?: number;
  /** Which of the class's startingEquipmentOptions to start with; defaults to the first. */
  equipmentOptionId?: string;
  appearance?: CharacterAppearance;
}

/** The class's chosen (or default) starting gear package. Falls back to the first option for an unknown id. */
export function resolveStartingEquipment(
  cls: CharacterClass,
  equipmentOptionId?: string
): Partial<Record<ItemSlot, string>> {
  const option = equipmentOptionId
    ? (cls.startingEquipmentOptions.find((o) => o.id === equipmentOptionId) ?? cls.startingEquipmentOptions[0])
    : cls.startingEquipmentOptions[0];
  return option.equipment;
}

function buildStartingInventory(cls: CharacterClass, equipment: Partial<Record<ItemSlot, string>>): InventoryStack[] {
  const counts = new Map<string, number>();
  for (const itemId of Object.values(equipment)) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  for (const itemId of cls.startingInventory) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return Array.from(counts, ([itemId, quantity]) => ({ itemId, quantity }));
}

/**
 * Backfills fields on a character persisted before this engine version:
 * inventory/equipment (added first), and background/origin feat (added
 * later — defaults to Acolyte since the original data has no equivalent).
 * A no-op once every field is already present.
 */
export function withStartingGearIfMissing(character: Character): Character {
  const cls = getClass(character.classId);
  const race = getRace(character.raceId);
  const backgroundId = character.backgroundId ?? "acolyte";
  const defaultEquipment = resolveStartingEquipment(cls);
  const withGear: Character = {
    ...character,
    backgroundId,
    originFeatId: character.originFeatId ?? getBackground(backgroundId).originFeatId,
    inventory: character.inventory ?? buildStartingInventory(cls, defaultEquipment),
    equipment: character.equipment ?? { ...defaultEquipment },
    resource: character.resource ?? getClassResource(cls.id)?.start,
  };
  return applyEquipmentEffects(withGear, cls, race);
}

export function createCharacter(options: CreateCharacterOptions): Character {
  const race = getRace(options.raceId);
  const cls = getClass(options.classId);
  const background = getBackground(options.backgroundId);
  const level = options.level ?? 1;

  const abilityScores = { ...options.baseAbilityScores };
  for (const key of background.abilityScores) {
    abilityScores[key] = Math.min(20, abilityScores[key] + 1);
  }
  for (const [key, bonus] of Object.entries(race.abilityScoreBonuses) as [AbilityKey, number][]) {
    abilityScores[key] = Math.min(20, abilityScores[key] + bonus);
  }
  for (const [key, bonus] of Object.entries(cls.abilityScoreBonuses) as [AbilityKey, number][]) {
    abilityScores[key] = Math.min(20, abilityScores[key] + bonus);
  }

  const vitMod = abilityModifier(abilityScores.vit);
  const maxHp = cls.hitDie + vitMod + (level - 1) * (Math.ceil(cls.hitDie / 2) + 1 + vitMod);
  const equipment = resolveStartingEquipment(cls, options.equipmentOptionId);

  const base: Character = {
    id: options.id,
    name: options.name,
    raceId: race.id,
    classId: cls.id,
    backgroundId: background.id,
    originFeatId: background.originFeatId,
    level,
    abilityScores,
    maxHp,
    hp: maxHp,
    armorClass: 10,
    proficiencyBonus: 2 + Math.floor((level - 1) / 4),
    actions: [],
    actionUses: {},
    resource: getClassResource(cls.id)?.start,
    inventory: buildStartingInventory(cls, equipment),
    equipment: { ...equipment },
    appearance: options.appearance,
  };

  const character = applyEquipmentEffects(base, cls, race);
  character.actionUses = Object.fromEntries(
    character.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
  );
  return character;
}
