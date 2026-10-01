import { describe, expect, it } from "vitest";
import { createMonster, getMonsterTemplate, MONSTER_TEMPLATES } from "../monsters.js";
import { LEVEL_CAP } from "../character.js";

const templates = Object.values(MONSTER_TEMPLATES);

describe("MONSTER_TEMPLATES (the 1-30 roster)", () => {
  it("every template's own key matches its id", () => {
    for (const [key, t] of Object.entries(MONSTER_TEMPLATES)) {
      expect(t.id).toBe(key);
    }
  });

  it("spans the full level range, from the Tameless Shore's level-1 start to the level-30 endgame", () => {
    const levels = templates.map((t) => t.level);
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(LEVEL_CAP);
  });

  it("has at least one template in every 5-level band up to the cap", () => {
    for (let band = 0; band < LEVEL_CAP; band += 5) {
      const inBand = templates.filter((t) => t.level > band && t.level <= band + 5);
      expect(inBand.length).toBeGreaterThan(0);
    }
  });

  it("gives every template at least one action and a non-negative HP/XP/gold", () => {
    for (const t of templates) {
      expect(t.actions.length).toBeGreaterThan(0);
      expect(t.maxHp).toBeGreaterThan(0);
      expect(t.xpValue).toBeGreaterThanOrEqual(0);
      expect(t.goldValue).toBeGreaterThanOrEqual(0);
      expect(t.armorRating).toBeGreaterThanOrEqual(0);
    }
  });

  it("generally grows tougher (HP) and more rewarding (XP) at higher levels", () => {
    const byLevel = [...templates].sort((a, b) => a.level - b.level);
    const lowTier = byLevel.filter((t) => t.level <= 5);
    const endgame = byLevel.filter((t) => t.level === LEVEL_CAP);
    const avg = (ts: typeof templates, key: "maxHp" | "xpValue") => ts.reduce((s, t) => s + t[key], 0) / ts.length;
    expect(avg(endgame, "maxHp")).toBeGreaterThan(avg(lowTier, "maxHp") * 5);
    expect(avg(endgame, "xpValue")).toBeGreaterThan(avg(lowTier, "xpValue") * 5);
  });

  it("getMonsterTemplate/createMonster work for a re-leveled legacy template and a new one", () => {
    expect(getMonsterTemplate("direWolf").level).toBe(8);
    expect(getMonsterTemplate("orcMarauder").level).toBe(20);

    const wyrm = createMonster("flightlessHorror", "m1");
    expect(wyrm.level).toBe(30);
    expect(wyrm.hp).toBe(wyrm.maxHp);
  });
});
