import type { AbilityKey, AbilityScores } from "./abilities.js";
import { abilityModifier } from "./dice.js";
import { getRace, resolveRacePassiveId, type HalfElfChoice, type Race, type RacePassiveId } from "./races.js";
import { getClass, type CharacterClass } from "./classes.js";
import { BASIC_ATTACK, DEFEND_ACTION, END_TURN_ACTION, FLEE_ACTION, type CombatActionDef } from "./actions.js";
import { getItem, type ItemSlot } from "./items.js";
import type { DamageType } from "./damage.js";
import { computeMaxHealth, computeResourceMax, computeResourceStart } from "./stats.js";

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
  /** XP accumulated toward this character's next level; resets to (any overflow past the threshold) on level-up. See `xpToNextLevel`/`gainExperience`. */
  xp: number;
  /** Currency spent at a settlement's General Store/Blacksmith (see game/setup.ts's Town Hub) and earned from combat victories. */
  gold: number;
  /** The raw stat block dealt at creation (standard array/rolled assignment), before any race/class growth -- the input to `computeAbilityScores`, recomputed into `abilityScores` below on every load and level-up. */
  baseAbilityScores: AbilityScores;
  /** Only meaningful for a Half-elf: the player's own pick of which ability doubles its racial growth, which two get the ordinary growth, and which parent race's passive to inherit (see races.ts). */
  raceChoice?: HalfElfChoice;
  /** This character's resolved racial passive -- Human/Elf/Dwarf's own, or a Half-elf's chosen one (see races.ts's `resolveRacePassiveId`). */
  racePassiveId?: RacePassiveId;
  abilityScores: AbilityScores;
  maxHp: number;
  hp: number;
  /** Flat evasion-percentage bonus from equipped armor/accessories and any class passive (e.g. a Soldier's Parry) (see stats.ts's computeEvasion for the Dexterity-based base). */
  gearEvasionBonus: number;
  /** The equipped melee/ranged weapon's own min-max damage range for the Basic Attack (see items.ts); undefined when that slot is empty. An empty melee slot falls back to an unarmed, ability-scaled strike; an empty ranged slot simply offers no ranged Basic Attack variant. */
  meleeWeaponDamageMin?: number;
  meleeWeaponDamageMax?: number;
  rangedWeaponDamageMin?: number;
  rangedWeaponDamageMax?: number;
  /** Whether the equipped melee/ranged weapon is an axe, for a Dwarf's (or a Half-elf's) Axe-wielders passive (see combat.ts). */
  meleeWeaponIsAxe?: boolean;
  rangedWeaponIsAxe?: boolean;
  /** Used only for the Alert origin feat's initiative bonus and the Flee saving throw; no longer feeds attack rolls (see stats.ts). */
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
  /** Current value in this class's resource pool (Fury/Expertise/Prayer/Focus/Cunning/Wylde/Arcana), if it has one. */
  resource?: number;
  /** This player's six Misfit Six companions, keyed by companion id. Built once via `ensureCompanionRoster`. */
  companions?: Record<string, Character>;
  /** Companion ids (up to `MAX_PARTY_SIZE - 1`) joining this player on their next mission. */
  activePartyIds?: string[];
  /** Cosmetic-only appearance preset chosen at creation; the engine doesn't act on this beyond storing it. */
  appearance?: CharacterAppearance;
  /**
   * The Skills page's action bar: fixed-length slots (see `ACTION_BAR_SLOT_COUNT`),
   * each either a known action's id or `null` for an empty slot. Purely a
   * player-facing organizational tool — combat's action menu still shows every
   * action the character knows, regardless of what's on this bar.
   */
  actionBarIds?: (string | null)[];
  /**
   * Progress on the hex-grid World Map: the in-world day count, the party's
   * current hex, and every hex fog-of-war has revealed so far. The starting
   * value (Ridgeton, day 1, a radius-5 reveal) is computed client-side (see
   * `apps/client/src/game/setup.ts`), since the hex geometry it depends on
   * lives in the client's map module, not the engine.
   */
  worldMapState?: WorldMapState;
}

export interface WorldMapState {
  day: number;
  partyHexKey: string;
  exploredHexKeys: string[];
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

/**
 * Every class's Basic Attack is generated here, not listed in `CharacterClass.actions`
 * -- one variant per filled weapon slot, named from the class's own `basicAttackName`
 * (e.g. "Wild Swing"). An empty melee slot still falls back to an unarmed,
 * ability-scaled strike (matching the old single-weapon behavior); an empty ranged
 * slot simply means no ranged variant is offered -- there's no "unarmed ranged" attack.
 */
function generateBasicAttacks(character: Character, cls: CharacterClass): CombatActionDef[] {
  const meleeWeapon = character.equipment.meleeWeapon ? getItem(character.equipment.meleeWeapon) : undefined;
  const rangedWeapon = character.equipment.rangedWeapon ? getItem(character.equipment.rangedWeapon) : undefined;

  const effectiveAbility = (weapon: ReturnType<typeof getItem> | undefined): AbilityKey => {
    if (weapon?.ability) return weapon.ability;
    if (cls.basicAttackAbilityMode === "highestOfStrDex") {
      return character.abilityScores.str >= character.abilityScores.dex ? "str" : "dex";
    }
    return cls.primaryAbility;
  };

  const attacks: CombatActionDef[] = [
    {
      ...BASIC_ATTACK,
      id: "strike-melee",
      name: `${cls.basicAttackName} (Melee)`,
      description: `A basic melee attack${meleeWeapon ? ` with your equipped ${meleeWeapon.name}` : ""}.`,
      ability: effectiveAbility(meleeWeapon),
      damageType: meleeWeapon?.damageType ?? BASIC_ATTACK.damageType,
      isBasicAttack: true,
      weaponDamageSource: "melee",
    },
  ];
  if (rangedWeapon) {
    attacks.push({
      ...BASIC_ATTACK,
      id: "strike-ranged",
      name: `${cls.basicAttackName} (Ranged)`,
      description: `A basic ranged attack with your equipped ${rangedWeapon.name}.`,
      ability: effectiveAbility(rangedWeapon),
      damageType: rangedWeapon.damageType ?? BASIC_ATTACK.damageType,
      isBasicAttack: true,
      weaponDamageSource: "ranged",
    });
  }
  return attacks;
}

/** Recomputes evasion, resistances, and actions from base stats plus race traits, class passives, level, and whatever's equipped. */
function applyEquipmentEffects(character: Character, cls: CharacterClass, race: Race): Character {
  const armor = character.equipment.armor ? getItem(character.equipment.armor) : undefined;
  const accessory = character.equipment.accessory ? getItem(character.equipment.accessory) : undefined;
  const meleeWeapon = character.equipment.meleeWeapon ? getItem(character.equipment.meleeWeapon) : undefined;
  const rangedWeapon = character.equipment.rangedWeapon ? getItem(character.equipment.rangedWeapon) : undefined;

  const gearEvasionBonus = (armor?.evasionBonus ?? 0) + (accessory?.evasionBonus ?? 0) + (cls.passiveEvasionBonus ?? 0);

  const basicAttacks = generateBasicAttacks(character, cls);
  // Enforces each ability's Class Style Sheet unlock level; a character below it simply
  // doesn't know that action yet (see classes.ts -- there's no leveling system to raise
  // `character.level` yet, so today this mostly just gates a level-1 character's kit
  // down to their Basic Attack + lvl-1 ability, ready for when leveling ships).
  const leveledActions = cls.actions.filter((a) => (a.unlockLevel ?? 1) <= character.level);

  const actions = [...basicAttacks, ...leveledActions, ...(race.actions ?? []), DEFEND_ACTION, FLEE_ACTION, END_TURN_ACTION].filter(
    (action, index, all) => all.findIndex((a) => a.id === action.id) === index
  );

  return {
    ...character,
    gearEvasionBonus,
    actions,
    meleeWeaponDamageMin: meleeWeapon?.damageMin,
    meleeWeaponDamageMax: meleeWeapon?.damageMax,
    rangedWeaponDamageMin: rangedWeapon?.damageMin,
    rangedWeaponDamageMax: rangedWeapon?.damageMax,
    meleeWeaponIsAxe: meleeWeapon?.weaponCategory === "axe",
    rangedWeaponIsAxe: rangedWeapon?.weaponCategory === "axe",
    damageResistances: race.damageResistances ?? [],
  };
}

/** A Half-elf substitutes their own `HalfElfChoice` for a race's (otherwise empty) `oddLevelAbilityGrowth` table. */
function raceAbilityGrowth(race: Race, raceChoice: HalfElfChoice | undefined): Partial<Record<AbilityKey, number>> {
  if (race.id !== "halfElf" || !raceChoice) return race.oddLevelAbilityGrowth;
  const growth: Partial<Record<AbilityKey, number>> = { [raceChoice.doubleAbility]: 2 };
  for (const key of raceChoice.singleAbilities) {
    growth[key] = (growth[key] ?? 0) + 1;
  }
  return growth;
}

/**
 * Ability scores at any level, per the Race/Class Style Sheets: `baseAbilityScores`
 * (the raw stat block from creation) plus the race's own growth summed over
 * every odd level from 1 to `level`, plus the class's own growth summed over
 * every even level from 2 to `level`. Replaces the old one-time flat "10 +
 * race bonus + class bonus" model -- including its `Math.min(20, ...)`
 * ceiling, which no longer makes sense once ability scores keep growing all
 * the way to `LEVEL_CAP` alongside the rest of this engine's big, MMO-scale
 * numbers.
 */
export function computeAbilityScores(
  baseAbilityScores: AbilityScores,
  race: Race,
  raceChoice: HalfElfChoice | undefined,
  cls: CharacterClass,
  level: number
): AbilityScores {
  const scores = { ...baseAbilityScores };
  const growth = raceAbilityGrowth(race, raceChoice);
  for (let lv = 1; lv <= level; lv += 2) {
    for (const [key, amount] of Object.entries(growth) as [AbilityKey, number][]) {
      scores[key] += amount;
    }
  }
  for (let lv = 2; lv <= level; lv += 2) {
    for (const [key, amount] of Object.entries(cls.evenLevelAbilityGrowth) as [AbilityKey, number][]) {
      scores[key] += amount;
    }
  }
  return scores;
}

export function equipItem(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (!item.slot) {
    throw new Error(`"${item.name}" can't be equipped.`);
  }
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

function addItemToInventory(character: Character, itemId: string, quantity = 1): Character {
  const existing = character.inventory.find((stack) => stack.itemId === itemId);
  const inventory = existing
    ? character.inventory.map((stack) => (stack.itemId === itemId ? { ...stack, quantity: stack.quantity + quantity } : stack))
    : [...character.inventory, { itemId, quantity }];
  return { ...character, inventory };
}

function removeItemFromInventory(character: Character, itemId: string, quantity = 1): Character {
  const existing = character.inventory.find((stack) => stack.itemId === itemId);
  if (!existing || existing.quantity < quantity) {
    throw new Error(`${character.name} doesn't have ${quantity} of "${itemId}".`);
  }
  const inventory =
    existing.quantity === quantity
      ? character.inventory.filter((stack) => stack.itemId !== itemId)
      : character.inventory.map((stack) => (stack.itemId === itemId ? { ...stack, quantity: stack.quantity - quantity } : stack));
  return { ...character, inventory };
}

/** Buys one of `itemId` from a settlement's General Store/Blacksmith at its full listed `value`. Throws if the character can't afford it. */
export function buyItem(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (character.gold < item.value) {
    throw new Error(`${character.name} can't afford "${item.name}" (needs ${item.value}, has ${character.gold}).`);
  }
  return addItemToInventory({ ...character, gold: character.gold - item.value }, itemId);
}

/** Sell-back price is half an item's listed `value` -- homebrew, the standard RPG sell-for-less convention. */
export const SELL_PRICE_RATIO = 0.5;

/** Sells one of `itemId` back to a settlement's Blacksmith for `value * SELL_PRICE_RATIO` gold. Throws if not owned, or currently equipped (unequip first). */
export function sellItem(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (!ownsItem(character, itemId)) {
    throw new Error(`"${item.name}" is not in ${character.name}'s inventory.`);
  }
  if (Object.values(character.equipment).includes(itemId)) {
    throw new Error(`Unequip "${item.name}" before selling it.`);
  }
  const sellPrice = Math.round(item.value * SELL_PRICE_RATIO);
  return removeItemFromInventory({ ...character, gold: character.gold + sellPrice }, itemId);
}

/** Drinks/uses one of `itemId`, applying its `consumable` effect and removing it from inventory. Throws if not owned or not a consumable. */
export function useConsumable(character: Character, itemId: string): Character {
  const item = getItem(itemId);
  if (!item.consumable) {
    throw new Error(`"${item.name}" can't be used.`);
  }
  if (!ownsItem(character, itemId)) {
    throw new Error(`"${item.name}" is not in ${character.name}'s inventory.`);
  }
  const consumed = removeItemFromInventory(character, itemId);

  if (item.consumable.restores === "hp") {
    return { ...consumed, hp: Math.min(consumed.maxHp, consumed.hp + item.consumable.amount) };
  }
  // "resource": a no-op amount-wise for a class with no resource pool (e.g. Rogue) --
  // there's nothing to top up, so the potion is still spent but restores nothing.
  const resourceMax = computeResourceMax(consumed.abilityScores, consumed.classId, consumed.level);
  if (resourceMax === undefined) return consumed;
  return { ...consumed, resource: Math.min(resourceMax, (consumed.resource ?? 0) + item.consumable.amount) };
}

/** Highest level a character can reach. */
export const LEVEL_CAP = 30;

/**
 * XP required to advance from `level` to `level + 1` -- homebrew, sized to
 * feel like a WoW-style escalating grind (100 XP for the 1->2 hop, ~90,000
 * for the last stretch into 30). No leveling system existed when the rest
 * of this file's derived-stat formulas were invented, so there's no prior
 * curve to match.
 */
export function xpToNextLevel(level: number): number {
  return 100 * level * level;
}

export interface ExperienceGainResult {
  character: Character;
  levelsGained: number;
  /** The actual XP applied, after race bonuses (e.g. Human's Many Roads) -- what a "+N XP" UI moment should show. */
  xpAwarded: number;
  /** Abilities whose `unlockLevel` falls in (startLevel, newLevel] -- for a "New ability learned!" UI moment. */
  newlyUnlockedActions: CombatActionDef[];
}

/**
 * Awards `amount` XP (before race bonuses -- see Many Roads below), advancing
 * as many levels as it covers (capped at `LEVEL_CAP`; any overflow past the
 * cap is discarded rather than banked). Each level gained recomputes max
 * HP/resource/proficiency bonus and heals by the exact delta, so leveling up
 * never leaves a character relatively worse off, then rebuilds the action
 * list (`applyEquipmentEffects`, same as `equipItem`/`unequipItem`) so newly
 * unlocked abilities are available immediately. A no-op for non-positive
 * `amount` or an already-capped character.
 */
export function gainExperience(character: Character, amount: number): ExperienceGainResult {
  if (amount <= 0 || character.level >= LEVEL_CAP) {
    return { character, levelsGained: 0, xpAwarded: 0, newlyUnlockedActions: [] };
  }

  // Human's (or a Half-elf who chose it) Adaptable trait: +10% XP from all sources (see races.ts).
  const awarded = character.racePassiveId === "adaptable" ? Math.round(amount * 1.1) : amount;

  const startLevel = character.level;
  let level = character.level;
  let xp = character.xp + awarded;
  while (level < LEVEL_CAP && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
  }
  if (level >= LEVEL_CAP) {
    level = LEVEL_CAP;
    xp = 0;
  }

  if (level === startLevel) {
    return { character: { ...character, xp }, levelsGained: 0, xpAwarded: awarded, newlyUnlockedActions: [] };
  }

  const cls = getClass(character.classId);
  const race = getRace(character.raceId);

  const newAbilityScores = computeAbilityScores(character.baseAbilityScores, race, character.raceChoice, cls, level);
  const oldResourceMax = computeResourceMax(character.abilityScores, cls.id, startLevel);
  const newMaxHp = computeMaxHealth(newAbilityScores, cls.id, level);
  const hpDelta = newMaxHp - character.maxHp;
  const newResourceMax = computeResourceMax(newAbilityScores, cls.id, level);
  const resourceDelta = (newResourceMax ?? 0) - (oldResourceMax ?? 0);

  const leveled: Character = {
    ...character,
    level,
    xp,
    abilityScores: newAbilityScores,
    maxHp: newMaxHp,
    hp: Math.min(newMaxHp, character.hp + hpDelta),
    resource:
      newResourceMax !== undefined ? Math.min(newResourceMax, (character.resource ?? 0) + resourceDelta) : character.resource,
    proficiencyBonus: 2 + Math.floor((level - 1) / 4),
  };

  const newlyUnlockedActions = cls.actions.filter(
    (a) => (a.unlockLevel ?? 1) > startLevel && (a.unlockLevel ?? 1) <= level
  );

  return {
    character: applyEquipmentEffects(leveled, cls, race),
    levelsGained: level - startLevel,
    xpAwarded: awarded,
    newlyUnlockedActions,
  };
}

/** Number of slots on the Skills page's action bar. */
export const ACTION_BAR_SLOT_COUNT = 6;

function emptyActionBar(): (string | null)[] {
  return Array(ACTION_BAR_SLOT_COUNT).fill(null);
}

/**
 * Places `actionId` in `slotIndex`, removing it from any other slot it
 * already occupied (a skill can only live in one slot at a time), matching
 * the design's own "clicking a slot assigns the skill" behavior.
 */
export function assignActionBarSlot(character: Character, slotIndex: number, actionId: string): Character {
  const bar = character.actionBarIds ?? emptyActionBar();
  const next = bar.map((id, i) => (i === slotIndex ? actionId : id === actionId ? null : id));
  return { ...character, actionBarIds: next };
}

export function clearActionBarSlot(character: Character, slotIndex: number): Character {
  const bar = character.actionBarIds ?? emptyActionBar();
  const next = bar.map((id, i) => (i === slotIndex ? null : id));
  return { ...character, actionBarIds: next };
}

export interface CreateCharacterOptions {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  baseAbilityScores: AbilityScores;
  /** Required when `raceId` is Half-elf; ignored otherwise. */
  raceChoice?: HalfElfChoice;
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

/** The shape a `Character`'s `equipment`/`classId` could still be in from before the Class Style Sheet reforge (single `weapon` slot, `classId: "mage"`). */
interface LegacyCharacterShape {
  classId: string;
  equipment: Partial<Record<ItemSlot, string>> & { weapon?: string };
  companions?: Record<string, Character>;
}

/**
 * Migrates a character (and every nested companion, which carries the same
 * shape) saved before the Class Style Sheet reforge: `classId: "mage"` ->
 * `"wizard"` (same class slot, new kit — see classes.ts), and the old
 * single `equipment.weapon` into `meleeWeapon`/`rangedWeapon` by looking up
 * that item's now-real slot. A no-op for an already-migrated character.
 */
export function withClassMigrationIfMissing(character: Character): Character {
  const legacy = character as unknown as LegacyCharacterShape;

  let equipment = character.equipment;
  if (legacy.equipment.weapon) {
    const { weapon, ...rest } = legacy.equipment;
    // A legacy single equipped weapon is always real gear, never a consumable, so it always has a slot.
    equipment = { ...rest, [getItem(weapon).slot!]: weapon };
  }

  const classId = legacy.classId === "mage" ? "wizard" : character.classId;
  const companions = character.companions
    ? Object.fromEntries(Object.entries(character.companions).map(([id, c]) => [id, withClassMigrationIfMissing(c)]))
    : character.companions;

  return { ...character, classId, equipment, companions };
}

/**
 * The old, one-time flat ability bonuses from before the Race/Class Style
 * Sheets' per-level growth model replaced them -- kept only so
 * `recoverLegacyBaseAbilityScores` can reverse-engineer a legacy character's
 * true creation-time `baseAbilityScores`. Never used for anything else.
 * Doesn't account for the since-removed Background system's own one-time +1
 * bonus -- a save old enough to predate both the growth model AND still be
 * missing `baseAbilityScores` today will recover a spread slightly high on
 * whichever abilities its background used to bump, same acceptable
 * imprecision as this function's `Math.min(20, ...)` clamp caveat below.
 */
const LEGACY_RACE_ABILITY_BONUSES: Record<string, Partial<Record<AbilityKey, number>>> = {
  elf: { dex: 2, wis: 2, int: 1, vit: -1 },
  human: { str: 1, dex: 1, int: 1, wis: 1, vit: 1 },
  dwarf: { vit: 3, str: 2, dex: -1 },
};
const LEGACY_CLASS_ABILITY_BONUSES: Record<string, Partial<Record<AbilityKey, number>>> = {
  warrior: { str: 4, vit: 3, dex: 1 },
  soldier: { str: 3, dex: 3, vit: 2 },
  cleric: { wis: 4, vit: 1 },
  ranger: { dex: 5, wis: 2, vit: 1 },
  rogue: { dex: 5, int: 2, str: 1 },
  druid: { wis: 3, vit: 2, dex: 1 },
  wizard: { int: 5 },
};

/**
 * Recovers a pre-Style-Sheet-reforge character's true creation-time ability
 * spread by subtracting the old flat race/class/background bonuses back out
 * of their current (already-bonused) `abilityScores`. Not perfectly exact --
 * the old model's own `Math.min(20, ...)` clamp could have silently
 * truncated an overflow, which this can't reverse -- but close enough for a
 * one-time migration; the result is stored as `baseAbilityScores` afterward,
 * so this only ever runs once per character.
 */
function recoverLegacyBaseAbilityScores(character: Character, cls: CharacterClass, race: Race): AbilityScores {
  const scores = { ...character.abilityScores };
  for (const [key, amount] of Object.entries(LEGACY_RACE_ABILITY_BONUSES[race.id] ?? {}) as [AbilityKey, number][]) {
    scores[key] -= amount;
  }
  for (const [key, amount] of Object.entries(LEGACY_CLASS_ABILITY_BONUSES[cls.id] ?? {}) as [AbilityKey, number][]) {
    scores[key] -= amount;
  }
  return scores;
}

/**
 * Backfills fields on a character persisted before this engine version:
 * inventory/equipment (added first), and `baseAbilityScores` (added by the
 * Race/Class Style Sheet reforge — recovered from the old flat bonus model,
 * see `recoverLegacyBaseAbilityScores`). `abilityScores` and `racePassiveId`
 * are recomputed from scratch every time this runs (a pure function of
 * `baseAbilityScores` + level + race/class), so a character always reflects
 * the current growth formulas on load, not just whatever was true the last
 * time it leveled up.
 */
export function withStartingGearIfMissing(character: Character): Character {
  const cls = getClass(character.classId);
  const race = getRace(character.raceId);
  const defaultEquipment = resolveStartingEquipment(cls);

  const baseAbilityScores = character.baseAbilityScores ?? recoverLegacyBaseAbilityScores(character, cls, race);
  const racePassiveId = resolveRacePassiveId(race.id, character.raceChoice);
  const abilityScores = computeAbilityScores(baseAbilityScores, race, character.raceChoice, cls, character.level);

  const withGear: Character = {
    ...character,
    baseAbilityScores,
    racePassiveId,
    abilityScores,
    inventory: character.inventory ?? buildStartingInventory(cls, defaultEquipment),
    equipment: character.equipment ?? { ...defaultEquipment },
    resource: character.resource ?? computeResourceStart(abilityScores, cls.id, character.level),
    actionBarIds: character.actionBarIds ?? emptyActionBar(),
    xp: character.xp ?? 0,
    // No free retroactive gold for old saves -- unlike createCharacter's STARTING_GOLD seed.
    gold: character.gold ?? 0,
  };
  return applyEquipmentEffects(withGear, cls, race);
}

/** Seed gold for a brand-new character -- homebrew, enough for a couple of starter potions. */
export const STARTING_GOLD = 50;

export function createCharacter(options: CreateCharacterOptions): Character {
  const race = getRace(options.raceId);
  const cls = getClass(options.classId);
  const level = options.level ?? 1;
  const raceChoice = race.id === "halfElf" ? options.raceChoice : undefined;

  const baseAbilityScores = { ...options.baseAbilityScores };
  const abilityScores = computeAbilityScores(baseAbilityScores, race, raceChoice, cls, level);
  const racePassiveId = resolveRacePassiveId(race.id, raceChoice);

  const maxHp = computeMaxHealth(abilityScores, cls.id, level);
  const equipment = resolveStartingEquipment(cls, options.equipmentOptionId);

  const base: Character = {
    id: options.id,
    name: options.name,
    raceId: race.id,
    classId: cls.id,
    level,
    xp: 0,
    gold: STARTING_GOLD,
    baseAbilityScores,
    raceChoice,
    racePassiveId,
    abilityScores,
    maxHp,
    hp: maxHp,
    gearEvasionBonus: 0,
    proficiencyBonus: 2 + Math.floor((level - 1) / 4),
    actions: [],
    actionUses: {},
    resource: computeResourceStart(abilityScores, cls.id, level),
    inventory: buildStartingInventory(cls, equipment),
    equipment: { ...equipment },
    appearance: options.appearance,
    actionBarIds: emptyActionBar(),
  };

  const character = applyEquipmentEffects(base, cls, race);
  character.actionUses = Object.fromEntries(
    character.actions.filter((a) => a.usesPerCombat).map((a) => [a.id, a.usesPerCombat!])
  );
  return character;
}
