import { ACTION_BAR_SLOT_COUNT, type CombatActionDef } from "@eridan/engine";

/**
 * The two Basic Attack variants' fixed ids (see character.ts's
 * `generateBasicAttacks`) -- hardcoded here the same way characterDisplay.ts
 * already does, since both are always named exactly this regardless of class.
 */
const MELEE_STRIKE_ID = "strike-melee";
const RANGED_STRIKE_ID = "strike-ranged";

/**
 * What a single action-bar slot actually shows, resolved from a raw stored
 * id against a combatant's current actions. `basicAttack` collapses both
 * Basic Attack variants into one slot (see `buildActionBarSlots`) -- `ranged`
 * is undefined for a character with no ranged weapon equipped, in which case
 * the slot behaves like a plain single action.
 */
export type ActionBarSlot =
  | { kind: "empty" }
  | { kind: "action"; action: CombatActionDef }
  | { kind: "basicAttack"; melee: CombatActionDef; ranged?: CombatActionDef };

/**
 * The Skills page's own 6 organizational slots are the single source of
 * truth for what a fight's action bar shows -- both here and in combat's
 * own `CombatHud`. A character who has never placed anything (every slot
 * still `null`, e.g. a brand-new character, or an existing save from before
 * this feature was wired into real combat) falls back to a computed default
 * -- the first `ACTION_BAR_SLOT_COUNT` known skills, Basic Attack collapsed
 * to one -- so combat is never left with an empty bar just because the
 * player hasn't visited Skills yet. The moment any slot is set, that
 * default stops applying entirely, respecting whatever the player arranged.
 */
export function effectiveActionBarIds(
  actionBarIds: (string | null)[] | undefined,
  actions: CombatActionDef[]
): (string | null)[] {
  const stored = actionBarIds ?? Array(ACTION_BAR_SLOT_COUNT).fill(null);
  if (stored.some((id) => id !== null)) return stored;
  return defaultActionBarIds(actions);
}

function defaultActionBarIds(actions: CombatActionDef[]): (string | null)[] {
  const ids: (string | null)[] = Array(ACTION_BAR_SLOT_COUNT).fill(null);
  let sawBasicAttack = false;
  let i = 0;
  for (const action of actions) {
    if (i >= ACTION_BAR_SLOT_COUNT) break;
    if (action.kind === "flee" || action.kind === "endTurn") continue;
    if (action.isBasicAttack) {
      if (sawBasicAttack) continue;
      sawBasicAttack = true;
    }
    ids[i++] = action.id;
  }
  return ids;
}

/**
 * Resolves each of the 6 slot ids against `actions` (a `Character`'s or a
 * combat `Combatant`'s own list -- either works, they carry the same shape).
 * A stale id (e.g. a Basic Attack variant no longer available after
 * unequipping its weapon) resolves to `empty`, same as the Skills page
 * already tolerated before this module existed. If a slot holds either
 * Basic Attack variant, it's shown as the single combined `basicAttack`
 * entry -- and since only one such id can ever mean anything, a second slot
 * that also resolves to a Basic Attack variant (only possible from data
 * saved before this consolidation) is treated as empty rather than shown
 * twice.
 */
export function buildActionBarSlots(actionBarIds: (string | null)[], actions: CombatActionDef[]): ActionBarSlot[] {
  const { melee, ranged } = getBasicAttackVariants(actions);
  const byId = new Map(actions.map((a) => [a.id, a]));
  let usedBasicAttack = false;

  return actionBarIds.map((id): ActionBarSlot => {
    if (!id) return { kind: "empty" };
    const action = byId.get(id);
    if (!action) return { kind: "empty" };
    if (action.isBasicAttack) {
      if (usedBasicAttack || !melee) return { kind: "empty" };
      usedBasicAttack = true;
      return { kind: "basicAttack", melee, ranged };
    }
    return { kind: "action", action };
  });
}

/** A character's two Basic Attack variants, if known -- `ranged` is undefined with no ranged weapon equipped. */
export function getBasicAttackVariants(actions: CombatActionDef[]): {
  melee?: CombatActionDef;
  ranged?: CombatActionDef;
} {
  const byId = new Map(actions.map((a) => [a.id, a]));
  return { melee: byId.get(MELEE_STRIKE_ID), ranged: byId.get(RANGED_STRIKE_ID) };
}

/** The canonical id to store when placing the Basic Attack combo on a slot -- always the melee variant, since it's the one every class always has. */
export const BASIC_ATTACK_CANONICAL_ID = MELEE_STRIKE_ID;

/** The id folded into the Basic Attack combo everywhere it'd otherwise appear as its own separate entry (the Skills page's ability list). */
export const RANGED_STRIKE_ACTION_ID = RANGED_STRIKE_ID;
