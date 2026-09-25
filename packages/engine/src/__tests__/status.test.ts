import { describe, expect, it } from "vitest";
import {
  activeBuffAmount,
  applyStatusEffect,
  consumeStatusStack,
  hasActiveEffectOfKind,
  hasCrowdControl,
  tickStatusEffects,
  absorbDamage,
  type StatusTickTarget,
} from "../status.js";

function target(overrides: Partial<StatusTickTarget> = {}): StatusTickTarget {
  return { hp: 100, maxHp: 100, side: "party", statusEffects: [], ...overrides };
}

describe("applyStatusEffect", () => {
  it("adds a new effect", () => {
    const t = target();
    applyStatusEffect(t, { defId: "burning", turnsRemaining: 2, amount: 10 });
    expect(t.statusEffects).toEqual([{ defId: "burning", turnsRemaining: 2, amount: 10 }]);
  });

  it("replaces rather than stacks a second application of the same defId", () => {
    const t = target({ statusEffects: [{ defId: "burning", turnsRemaining: 1, amount: 5 }] });
    applyStatusEffect(t, { defId: "burning", turnsRemaining: 3, amount: 20 });
    expect(t.statusEffects).toEqual([{ defId: "burning", turnsRemaining: 3, amount: 20 }]);
  });
});

describe("hasCrowdControl", () => {
  it("is true while a cc-kind effect is present", () => {
    expect(hasCrowdControl(target({ statusEffects: [{ defId: "rooted", turnsRemaining: 1 }] }))).toBe(true);
  });

  it("is false for non-cc effects", () => {
    expect(hasCrowdControl(target({ statusEffects: [{ defId: "burning", turnsRemaining: 1, amount: 5 }] }))).toBe(
      false
    );
  });
});

describe("tickStatusEffects", () => {
  it("applies a DoT's flat amount and decrements turnsRemaining", () => {
    const t = target({ hp: 100, statusEffects: [{ defId: "burning", turnsRemaining: 2, amount: 15 }] });
    const events = tickStatusEffects(t);
    expect(t.hp).toBe(85);
    expect(t.statusEffects).toEqual([{ defId: "burning", turnsRemaining: 1, amount: 15 }]);
    expect(events).toEqual([{ defId: "burning", kind: "dot", amount: 15 }]);
  });

  it("never drops a party target below 1 HP from a DoT", () => {
    const t = target({ hp: 5, side: "party", statusEffects: [{ defId: "poisoned", turnsRemaining: 1, amount: 999 }] });
    const events = tickStatusEffects(t);
    expect(t.hp).toBe(1);
    expect(events).toEqual([{ defId: "poisoned", kind: "dot", amount: 4 }]);
  });

  it("can reduce an enemy to 0 from a DoT (no floor)", () => {
    const t = target({ hp: 5, side: "enemy", statusEffects: [{ defId: "poisoned", turnsRemaining: 1, amount: 999 }] });
    tickStatusEffects(t);
    expect(t.hp).toBe(0);
  });

  it("caps a HoT at maxHp", () => {
    const t = target({ hp: 95, maxHp: 100, statusEffects: [{ defId: "bloom", turnsRemaining: 1, amount: 20 }] });
    const events = tickStatusEffects(t);
    expect(t.hp).toBe(100);
    expect(events).toEqual([{ defId: "bloom", kind: "hot", amount: 5 }]);
  });

  it("removes an effect once turnsRemaining hits 0 and reports cc-expire", () => {
    const t = target({ statusEffects: [{ defId: "rooted", turnsRemaining: 1 }] });
    const events = tickStatusEffects(t);
    expect(t.statusEffects).toEqual([]);
    expect(events).toEqual([{ defId: "rooted", kind: "cc-expire" }]);
  });

  it("removes a shield once turnsRemaining hits 0 and reports shield-expire", () => {
    const t = target({ statusEffects: [{ defId: "ward", turnsRemaining: 1, amount: 30 }] });
    const events = tickStatusEffects(t);
    expect(t.statusEffects).toEqual([]);
    expect(events).toEqual([{ defId: "ward", kind: "shield-expire" }]);
  });

  it("ticks multiple simultaneous effects independently", () => {
    const t = target({
      hp: 50,
      statusEffects: [
        { defId: "burning", turnsRemaining: 2, amount: 10 },
        { defId: "bloom", turnsRemaining: 1, amount: 4 },
      ],
    });
    const events = tickStatusEffects(t);
    expect(t.hp).toBe(44); // 50 - 10 + 4
    expect(t.statusEffects).toEqual([{ defId: "burning", turnsRemaining: 1, amount: 10 }]);
    expect(events).toEqual([
      { defId: "burning", kind: "dot", amount: 10 },
      { defId: "bloom", kind: "hot", amount: 4 },
    ]);
  });
});

describe("absorbDamage", () => {
  it("reduces incoming damage by the shield's remaining capacity", () => {
    const t = target({ statusEffects: [{ defId: "ward", turnsRemaining: 1, amount: 30 }] });
    const result = absorbDamage(t, 50);
    expect(result).toEqual({ damage: 20, absorbed: 30 });
    expect(t.statusEffects[0].amount).toBe(0);
  });

  it("lets the rest through once the shield is exhausted", () => {
    const t = target({ statusEffects: [{ defId: "ward", turnsRemaining: 1, amount: 10 }] });
    const first = absorbDamage(t, 8);
    expect(first).toEqual({ damage: 0, absorbed: 8 });
    const second = absorbDamage(t, 8);
    expect(second).toEqual({ damage: 6, absorbed: 2 });
  });

  it("passes damage through unchanged with no shield", () => {
    const t = target();
    expect(absorbDamage(t, 25)).toEqual({ damage: 25, absorbed: 0 });
  });
});

describe("guard/buff/proc mechanics (Class Style Sheet reforge)", () => {
  it("consumes one stack of a guard effect per call, removing it once stacks reach 0", () => {
    const t = target({ statusEffects: [{ defId: "readied", turnsRemaining: 99, stacksRemaining: 2 }] });
    expect(consumeStatusStack(t, "guard")).toBe(true);
    expect(t.statusEffects).toEqual([{ defId: "readied", turnsRemaining: 99, stacksRemaining: 1 }]);
    expect(consumeStatusStack(t, "guard")).toBe(true);
    expect(t.statusEffects).toEqual([]);
    // Nothing left to consume.
    expect(consumeStatusStack(t, "guard")).toBe(false);
  });

  it("only consumes stacks of the requested kind", () => {
    const t = target({ statusEffects: [{ defId: "barbedPrimed", turnsRemaining: 99, stacksRemaining: 2 }] });
    expect(consumeStatusStack(t, "guard")).toBe(false);
    expect(consumeStatusStack(t, "proc")).toBe(true);
    expect(t.statusEffects).toEqual([{ defId: "barbedPrimed", turnsRemaining: 99, stacksRemaining: 1 }]);
  });

  it("sums every active buff-kind effect's amount, ignoring other kinds", () => {
    const t = target({
      statusEffects: [
        { defId: "fortified", turnsRemaining: 3, amount: 12 },
        { defId: "ward", turnsRemaining: 1, amount: 30 },
        { defId: "rooted", turnsRemaining: 1 },
      ],
    });
    expect(activeBuffAmount(t)).toBe(12);
  });

  it("hasActiveEffectOfKind checks by kind, not defId", () => {
    const t = target({ statusEffects: [{ defId: "knockedDown", turnsRemaining: 1 }] });
    expect(hasActiveEffectOfKind(t, "cc")).toBe(true);
    expect(hasActiveEffectOfKind(t, "guard")).toBe(false);
  });

  it("tickStatusEffects reports guard/buff/proc expiry the same way it reports cc/shield expiry", () => {
    const t = target({
      statusEffects: [
        { defId: "fortified", turnsRemaining: 1, amount: 10 },
        { defId: "readied", turnsRemaining: 1, stacksRemaining: 2 },
        { defId: "barbedPrimed", turnsRemaining: 1, stacksRemaining: 1 },
      ],
    });
    const events = tickStatusEffects(t);
    expect(t.statusEffects).toEqual([]);
    expect(events).toEqual([
      { defId: "fortified", kind: "buff-expire" },
      { defId: "readied", kind: "guard-expire" },
      { defId: "barbedPrimed", kind: "proc-expire" },
    ]);
  });
});
