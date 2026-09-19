import { ABILITY_KEYS, type AbilityKey, type AbilityScores } from "./abilities.js";
import { abilityModifier } from "./dice.js";
import { getRace } from "./races.js";
import { getClass, type CharacterClass } from "./classes.js";
import { BASIC_ATTACK, DEFEND_ACTION, FLEE_ACTION, type CombatActionDef } from "./actions.js";
import { getItem, type ItemSlot } from "./items.js";

export interface InventoryStack {
  itemId: string;
  quantity: number;
}

export interface Character {
  id: string;
  name: string;
  raceId: string;
  classId: string;
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

/** Recomputes armorClass and the Strike action from base stats plus whatever's currently equipped. */
function applyEquipmentEffects(character: Character, cls: CharacterClass): Character {
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
        }
      : BASIC_ATTACK;

  const withStrike = cls.actions.some((a) => a.id === BASIC_ATTACK.id)
    ? cls.actions.map((a) => (a.id === BASIC_ATTACK.id ? strike : a))
    : [...cls.actions, strike];

  const actions = [...withStrike, DEFEND_ACTION, FLEE_ACTION].filter(
    (action, index, all) => all.findIndex((a) => a.id === action.id) === index
  );

  return { ...character, armorClass, actions };
}

export function equipItem(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (!ownsItem(character, itemId)) {
    throw new Error(`"${item.name}" is not in ${character.name}'s inventory.`);
  }
  const equipped = { ...character, equipment: { ...character.equipment, [item.slot]: itemId } };
  return applyEquipmentEffects(equipped, getClass(character.classId));
}

export function unequipItem(character: Character, slot: ItemSlot): Character {
  const equipment = { ...character.equipment };
  delete equipment[slot];
  return applyEquipmentEffects({ ...character, equipment }, getClass(character.classId));
}

export interface CreateCharacterOptions {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  baseAbilityScores: AbilityScores;
  level?: number;
}

function buildStartingInventory(cls: CharacterClass): InventoryStack[] {
  const counts = new Map<string, number>();
  for (const itemId of Object.values(cls.startingEquipment)) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  for (const itemId of cls.startingInventory) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return Array.from(counts, ([itemId, quantity]) => ({ itemId, quantity }));
}

/**
 * Backfills inventory/equipment on a character persisted before those fields
 * existed, granting the same starting kit a new character of their class
 * would get. A no-op once both fields are already present.
 */
export function withStartingGearIfMissing(character: Character): Character {
  if (character.inventory && character.equipment) return character;
  const cls = getClass(character.classId);
  const withGear: Character = {
    ...character,
    inventory: character.inventory ?? buildStartingInventory(cls),
    equipment: character.equipment ?? { ...cls.startingEquipment },
  };
  return applyEquipmentEffects(withGear, cls);
}

export function createCharacter(options: CreateCharacterOptions): Character {
  const race = getRace(options.raceId);
  const cls = getClass(options.classId);
  const level = options.level ?? 1;

  const abilityScores = { ...options.baseAbilityScores };
  for (const key of ABILITY_KEYS) {
    abilityScores[key] += race.abilityBonuses[key] ?? 0;
  }

  const conMod = abilityModifier(abilityScores.con);
  const maxHp = cls.hitDie + conMod + (level - 1) * (Math.ceil(cls.hitDie / 2) + 1 + conMod);

  const base: Character = {
    id: options.id,
    name: options.name,
    raceId: race.id,
    classId: cls.id,
    level,
    abilityScores,
    maxHp,
    hp: maxHp,
    armorClass: 10,
    proficiencyBonus: 2 + Math.floor((level - 1) / 4),
    actions: [],
    actionUses: {},
    inventory: buildStartingInventory(cls),
    equipment: { ...cls.startingEquipment },
  };

  const character = applyEquipmentEffects(base, cls);
  character.actionUses = Object.fromEntries(
    character.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
  );
  return character;
}
