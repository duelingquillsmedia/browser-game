import { ACTION_BAR_SLOT_COUNT, type CombatActionDef } from "@eridan/engine";

/**
 * The two Basic Attack variants' fixed ids (see character.ts's
 * `generateBasicAttacks`) -- hardcoded here the same way characterDisplay.ts
 * already does, since both are always named exactly this regardless of class.
 */
const MELEE_STRIKE_ID = "strike-melee";
const RANGED_STRIKE_ID = "strike-ranged";

/** What a single action-bar slot actually shows, resolved from a raw stored id against a combatant's current actions. */
export type ActionBarSlot = { kind: "empty" } | { kind: "action"; action: CombatActionDef };

/**
 * The Skills page's own 6 organizational slots are the single source of
 * truth for what a fight's action bar shows -- both here and in combat's
 * own `CombatHud`. A character who has never placed anything (every slot
 * still `null`, e.g. a brand-new character, or an existing save from before
 * this feature was wired into real combat) falls back to a computed default
 * -- the first `ACTION_BAR_SLOT_COUNT` known skills -- so combat is never
 * left with an empty bar just because the player hasn't visited Skills yet.
 * The moment any slot is set, that default stops applying entirely,
 * respecting whatever the player arranged.
 */
export function effectiveActionBarIds(
  actionBarIds: (string | null)[] | undefined,
  actions: CombatActionDef[]
): (string | null)[] {
  const stored = actionBarIds ?? Array(ACTION_BAR_SLOT_COUNT).fill(null);
  if (stored.some((id) => id !== null)) return stored;
  return defaultActionBarIds(actions);
}

/**
 * Basic Attack (melee and ranged) is a permanent fixture outside the action
 * bar now -- always available on its own Q/E slots in combat (see
 * `getBasicAttackVariants` and `CombatHud`'s fixed slots) -- so it's never
 * placed on the 6-slot bar, not even by this computed default.
 */
function defaultActionBarIds(actions: CombatActionDef[]): (string | null)[] {
  const ids: (string | null)[] = Array(ACTION_BAR_SLOT_COUNT).fill(null);
  let i = 0;
  for (const action of actions) {
    if (i >= ACTION_BAR_SLOT_COUNT) break;
    if (action.kind === "flee" || action.kind === "endTurn" || action.isBasicAttack) continue;
    ids[i++] = action.familyId ?? action.id;
  }
  return ids;
}

/**
 * Resolves each of the 6 slot ids against `actions` (a `Character`'s or a
 * combat `Combatant`'s own list -- either works, they carry the same shape).
 * Keyed by `familyId ?? id` rather than the raw id alone: a ranked ability
 * (e.g. Warrior's Cleave) only ever has its single current-rank entry in
 * `actions`, under a rank-specific id (`cleave-r2`, ...) that changes on
 * every rank-up, but the player's saved slot stores the stable family id
 * (`cleave`) -- see `defaultActionBarIds` and the Skills page's own
 * `familyId ?? id` lookups -- so a rank-up swaps in the new numbers without
 * ever looking like the slot went empty. A stale id resolves to `empty`:
 * either a Basic Attack variant no longer available after unequipping its
 * weapon, or -- since Basic Attack moved off the action bar entirely -- a
 * Basic Attack id saved to a slot from before that change.
 */
export function buildActionBarSlots(actionBarIds: (string | null)[], actions: CombatActionDef[]): ActionBarSlot[] {
  const byFamily = new Map(actions.map((a) => [a.familyId ?? a.id, a]));
  return actionBarIds.map((id): ActionBarSlot => {
    if (!id) return { kind: "empty" };
    const action = byFamily.get(id);
    if (!action || action.isBasicAttack) return { kind: "empty" };
    return { kind: "action", action };
  });
}

/**
 * A character's two Basic Attack variants -- permanent fixtures outside the
 * action bar, shown on their own Q (melee) / E (ranged) slots in combat
 * (see `CombatHud`) rather than competing for one of the 6 configurable
 * slots. `ranged` is undefined with no ranged weapon equipped.
 */
export function getBasicAttackVariants(actions: CombatActionDef[]): {
  melee?: CombatActionDef;
  ranged?: CombatActionDef;
} {
  const byId = new Map(actions.map((a) => [a.id, a]));
  return { melee: byId.get(MELEE_STRIKE_ID), ranged: byId.get(RANGED_STRIKE_ID) };
}
