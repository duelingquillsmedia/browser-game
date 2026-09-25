import type { DamageType } from "./damage.js";

/**
 * The generic status-effect engine backing the AP-economy combat rebuild.
 * Deliberately has no dependency on combat.ts (not even `import type`) so it
 * stays independently testable and there's no risk of a circular module
 * dependency -- it operates on small structural interfaces that `Combatant`
 * satisfies without a cast.
 */

export type StatusEffectKind = "cc" | "dot" | "hot" | "shield";

export type StatusEffectId = "rooted" | "stunned" | "burning" | "poisoned" | "bloom" | "ward";

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
};

export interface StatusEffect {
  defId: StatusEffectId;
  /** Number of the afflicted combatant's own upcoming turns this persists through; decremented once per their turn-start tick, removed at 0. */
  turnsRemaining: number;
  /** DoT/HoT: flat amount applied per tick. Shield: remaining absorb capacity (drawn down by `absorbDamage`, independent of `turnsRemaining`). Undefined for a pure-CC effect. */
  amount?: number;
  damageType?: DamageType;
  sourceId?: string;
}

/**
 * A status effect an action applies to a target on resolution. `power`
 * multiplies the actor's scaling ability score (like `CombatActionDef.power`)
 * to compute the DoT/HoT per-tick amount or the shield's total capacity,
 * rolled once at application time. Omitted for a pure-CC status.
 */
export interface StatusApplication {
  defId: StatusEffectId;
  turns: number;
  power?: number;
  /** Percent chance (0-100) this status actually lands, rolled independently after the action's own hit/damage resolves. Omitted = always applies. */
  chance?: number;
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
  kind: "dot" | "hot" | "cc-expire" | "shield-expire";
  amount?: number;
}

export function hasCrowdControl(target: Pick<StatusTickTarget, "statusEffects">): boolean {
  return target.statusEffects.some((e) => STATUS_EFFECT_DEFS[e.defId].kind === "cc");
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
