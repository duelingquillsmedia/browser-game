import type { DamageType } from "./damage.js";

/**
 * The generic status-effect engine backing the AP-economy combat rebuild.
 * Deliberately has no dependency on combat.ts (not even `import type`) so it
 * stays independently testable and there's no risk of a circular module
 * dependency -- it operates on small structural interfaces that `Combatant`
 * satisfies without a cast.
 */

export type StatusEffectKind =
  | "cc"
  | "dot"
  | "hot"
  | "shield"
  /** A stacking, per-incoming-attack hit-chance reduction (Soldier's Readied, Rogue's Evasive Jab). One stack is consumed by each attack against the holder, hit or miss, until it runs out. */
  | "guard"
  /** A flat, timed evasion bonus (Warrior's Enrage, Wizard's Arcane Barrier) — ticks down like a CC but has no per-tick HP effect. */
  | "buff"
  /** Primes the holder's own next N attacks to additionally apply a linked effect (Ranger's Barbed Arrow). One stack is consumed per landed attack, independent of turn count. */
  | "proc";

export type StatusEffectId =
  | "rooted"
  | "stunned"
  | "burning"
  | "poisoned"
  | "bloom"
  | "ward"
  | "bleeding"
  | "knockedDown"
  | "readied"
  | "fortified"
  | "barbedPrimed";

export interface StatusEffectDef {
  id: StatusEffectId;
  name: string;
  kind: StatusEffectKind;
  description: string;
}

/**
 * One entry per status kind this pass needs, plus an extra CC/DoT flavor so
 * Warrior/Rogue don't have to reuse Druid/Mage's effect names. Mechanics only
 * ever branch on `kind`, never on `id` -- adding more flavors later is a
 * data-only change.
 */
export const STATUS_EFFECT_DEFS: Record<StatusEffectId, StatusEffectDef> = {
  rooted: { id: "rooted", name: "Rooted", kind: "cc", description: "Cannot act on their next turn." },
  stunned: { id: "stunned", name: "Stunned", kind: "cc", description: "Cannot act on their next turn." },
  burning: { id: "burning", name: "Burning", kind: "dot", description: "Takes damage at the start of each of their turns." },
  poisoned: { id: "poisoned", name: "Poisoned", kind: "dot", description: "Takes damage at the start of each of their turns." },
  bloom: { id: "bloom", name: "Bloom", kind: "hot", description: "Restores HP at the start of each of their turns." },
  ward: { id: "ward", name: "Ward", kind: "shield", description: "Absorbs incoming damage until their next turn." },
  bleeding: { id: "bleeding", name: "Bleeding", kind: "dot", description: "Takes damage at the start of each of their turns." },
  knockedDown: { id: "knockedDown", name: "Knocked Down", kind: "cc", description: "Cannot act on their next turn." },
  readied: {
    id: "readied",
    name: "Readied",
    kind: "guard",
    description: "The next incoming attack is much less likely to hit; each attack against them spends one stack.",
  },
  fortified: { id: "fortified", name: "Fortified", kind: "buff", description: "Evasion is temporarily increased." },
  barbedPrimed: {
    id: "barbedPrimed",
    name: "Barbed",
    kind: "proc",
    description: "Their next attacks also cause the target to bleed.",
  },
};

export interface StatusEffect {
  defId: StatusEffectId;
  /** Number of the afflicted combatant's own upcoming turns this persists through; decremented once per their turn-start tick, removed at 0. Guard/proc effects are given a long safety-net duration since they actually expire by stack count instead (see `consumeStatusStack`). */
  turnsRemaining: number;
  /** DoT/HoT: flat amount applied per tick. Shield: remaining absorb capacity (drawn down by `absorbDamage`, independent of `turnsRemaining`). Buff: flat evasion bonus (see `activeBuffAmount`). Undefined for a pure-CC effect. */
  amount?: number;
  /** Guard/proc effects only: stacks left before the effect is removed (see `consumeStatusStack`). */
  stacksRemaining?: number;
  damageType?: DamageType;
  sourceId?: string;
}

/**
 * A status effect an action applies to a target on resolution. `power`
 * multiplies the actor's scaling ability score (like `CombatActionDef.power`)
 * to compute the DoT/HoT per-tick amount, the shield's total capacity, or
 * the buff's flat evasion bonus, rolled once at application time. Omitted
 * for a pure-CC status.
 */
export interface StatusApplication {
  defId: StatusEffectId;
  turns: number;
  power?: number;
  /** Percent chance (0-100) this status actually lands, rolled independently after the action's own hit/damage resolves. Omitted = always applies. */
  chance?: number;
  /** Guard/proc effects only: how many stacks to apply (default 1) — Soldier's Readied applies 2. */
  stacks?: number;
  /**
   * Fraction of the *weapon's* average damage (not the ability score) used for the
   * DoT amount instead of `power` — the Class Style Sheet's bleed/poison ticks are
   * all "N% weapon damage" (Serrated Blade, Poisoned Throw, Barbed Arrow), a
   * different scaling basis than every other status application. Resolved against
   * whichever weapon slot the parent action's `weaponDamageSource` names.
   */
  weaponPercent?: number;
}

/** Minimal shape the functions below need -- `Combatant` satisfies this structurally, no cast required. */
export interface StatusTickTarget {
  hp: number;
  maxHp: number;
  side: "party" | "enemy";
  statusEffects: StatusEffect[];
}

export interface StatusTickEvent {
  defId: StatusEffectId;
  kind: "dot" | "hot" | "cc-expire" | "shield-expire" | "guard-expire" | "buff-expire" | "proc-expire";
  amount?: number;
}

export function hasCrowdControl(target: Pick<StatusTickTarget, "statusEffects">): boolean {
  return target.statusEffects.some((e) => STATUS_EFFECT_DEFS[e.defId].kind === "cc");
}

/** Whether `target` has any active status effect of the given kind — used for guard/buff/proc checks that don't need the effect's other details. */
export function hasActiveEffectOfKind(target: Pick<StatusTickTarget, "statusEffects">, kind: StatusEffectKind): boolean {
  return target.statusEffects.some((e) => STATUS_EFFECT_DEFS[e.defId].kind === kind);
}

/** Sum of all active "buff"-kind status effects' flat amount (Warrior's Enrage, Wizard's Arcane Barrier — a temporary evasion bonus). */
export function activeBuffAmount(target: Pick<StatusTickTarget, "statusEffects">): number {
  return target.statusEffects
    .filter((e) => STATUS_EFFECT_DEFS[e.defId].kind === "buff")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Spends one stack from an active guard/proc-kind effect (Readied, Barbed),
 * removing it once stacks reach 0. Guard/proc effects expire by stack count
 * rather than by `turnsRemaining` (see `StatusEffect.turnsRemaining`'s own
 * comment), so this — not `tickStatusEffects` — is how they actually end.
 * Returns whether a stack was present to consume.
 */
export function consumeStatusStack(target: Pick<StatusTickTarget, "statusEffects">, kind: "guard" | "proc"): boolean {
  const effect = target.statusEffects.find((e) => STATUS_EFFECT_DEFS[e.defId].kind === kind && (e.stacksRemaining ?? 0) > 0);
  if (!effect) return false;
  const stacksRemaining = (effect.stacksRemaining ?? 1) - 1;
  target.statusEffects =
    stacksRemaining > 0
      ? target.statusEffects.map((e) => (e === effect ? { ...e, stacksRemaining } : e))
      : target.statusEffects.filter((e) => e !== effect);
  return true;
}

/** Re-applying the same defId refreshes (replaces) rather than stacking a second copy. */
export function applyStatusEffect(target: Pick<StatusTickTarget, "statusEffects">, effect: StatusEffect): void {
  target.statusEffects = [...target.statusEffects.filter((e) => e.defId !== effect.defId), effect];
}

/**
 * Applies this turn's DoT/HoT tick, decrements every effect's
 * `turnsRemaining`, and drops anything that just expired. Enforces the
 * party's 1-HP DoT floor (never applies below 1 HP for `side: "party"`;
 * monsters have no floor and can be killed outright by a DoT). Mutates
 * `target` in place; returns events for the caller to log/animate.
 */
export function tickStatusEffects(target: StatusTickTarget): StatusTickEvent[] {
  const events: StatusTickEvent[] = [];
  const remaining: StatusEffect[] = [];

  for (const effect of target.statusEffects) {
    const def = STATUS_EFFECT_DEFS[effect.defId];
    if (def.kind === "dot" && effect.amount) {
      const dmg = target.side === "party" ? Math.min(effect.amount, Math.max(0, target.hp - 1)) : effect.amount;
      target.hp = Math.max(0, target.hp - dmg);
      events.push({ defId: effect.defId, kind: "dot", amount: dmg });
    } else if (def.kind === "hot" && effect.amount) {
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + effect.amount);
      events.push({ defId: effect.defId, kind: "hot", amount: target.hp - before });
    }

    const turnsLeft = effect.turnsRemaining - 1;
    if (turnsLeft <= 0) {
      if (def.kind === "shield") events.push({ defId: effect.defId, kind: "shield-expire" });
      if (def.kind === "cc") events.push({ defId: effect.defId, kind: "cc-expire" });
      if (def.kind === "guard") events.push({ defId: effect.defId, kind: "guard-expire" });
      if (def.kind === "buff") events.push({ defId: effect.defId, kind: "buff-expire" });
      if (def.kind === "proc") events.push({ defId: effect.defId, kind: "proc-expire" });
      continue;
    }
    remaining.push({ ...effect, turnsRemaining: turnsLeft });
  }

  target.statusEffects = remaining;
  return events;
}

/** Reduces incoming damage by any active Ward's remaining capacity before HP is subtracted. */
export function absorbDamage(
  target: Pick<StatusTickTarget, "statusEffects">,
  incoming: number
): { damage: number; absorbed: number } {
  const shield = target.statusEffects.find((e) => STATUS_EFFECT_DEFS[e.defId].kind === "shield" && e.amount);
  if (!shield?.amount) return { damage: incoming, absorbed: 0 };
  const absorbed = Math.min(shield.amount, incoming);
  shield.amount -= absorbed;
  return { damage: incoming - absorbed, absorbed };
}
