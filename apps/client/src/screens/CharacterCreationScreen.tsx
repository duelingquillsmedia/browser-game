import { useMemo, useState } from "react";
import {
  ABILITY_NAMES,
  BACKGROUNDS,
  CLASSES,
  RACES,
  computeMaxHealth,
  computeResourceMax,
  createCharacter,
  getClassResource,
  type AbilityKey,
  type Character,
  type CharacterClass,
  type Race,
} from "@eridan/engine";
import { APPEARANCE_PRESETS, DEFAULT_BACKGROUND_BY_CLASS, NAME_POOLS } from "../game/appearance";
import { HOME_TOWN_NAME } from "../game/lore";
import "../theme/aow-theme.css";
import "./CharacterCreationScreen.css";

export interface CharacterCreationScreenProps {
  onComplete: (character: Character) => Promise<void>;
  onBack: () => void;
}

const RACE_GLYPHS: Record<string, string> = { elf: "ᛖ", human: "ᛗ", dwarf: "ᛟ" };
const CLASS_GLYPHS: Record<string, string> = { cleric: "ᛋ", warrior: "ᛏ", rogue: "ᚾ", mage: "ᚨ", druid: "ᛜ" };
const CLASS_COLOR_VAR: Record<string, string> = {
  cleric: "var(--aow-gold)",
  warrior: "var(--aow-hp)",
  rogue: "var(--aow-violet)",
  mage: "var(--aow-frost)",
  druid: "var(--aow-green)",
};
const CLASS_ROLE: Record<string, string> = {
  cleric: "HEALER · RADIANT CASTER",
  warrior: "FRONT-LINE · MELEE",
  rogue: "STRIKER · MELEE",
  mage: "CASTER · RANGED",
  druid: "HYBRID · NATURE",
};
const CLASS_ARMOR: Record<string, string> = {
  cleric: "Cloth / Mail",
  warrior: "Plate",
  rogue: "Leather",
  mage: "Cloth",
  druid: "Leather",
};

const STEPS = [
  { label: "RACE", title: "Choose your race", sub: "Your people shape your body, your gifts, and how the world first sees you." },
  { label: "CLASS", title: "Choose your class", sub: "Your class decides how you fight and which skills you begin with." },
  { label: "ATTRIBUTES", title: "Review your attributes", sub: "Your starting attributes come from your race and class." },
  { label: "APPEARANCE", title: "Choose your appearance", sub: "Pick a colouring preset for your character." },
  { label: "NAME", title: "Name your character", sub: "This is the name Eridan will remember." },
] as const;

const NAME_PATTERN = /[^A-Za-z' -]/g;

function sign(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

const ABILITY_KEY_LIST: AbilityKey[] = ["str", "dex", "vit", "int", "wis", "spi"];

/**
 * This flow doesn't ask for a Background (the design has no such step), but
 * `createCharacter` still auto-assigns one per class (see
 * DEFAULT_BACKGROUND_BY_CLASS) for its Origin feat and its own +1 bonus to
 * three abilities. Folding that +1 into the "class" column keeps this
 * preview numerically identical to the character that actually gets saved.
 */
function classBonusWithBackground(cls: CharacterClass): Partial<Record<AbilityKey, number>> {
  const backgroundId = DEFAULT_BACKGROUND_BY_CLASS[cls.id] ?? "soldier";
  const bonus: Partial<Record<AbilityKey, number>> = { ...cls.abilityScoreBonuses };
  for (const key of BACKGROUNDS[backgroundId].abilityScores) {
    bonus[key] = (bonus[key] ?? 0) + 1;
  }
  return bonus;
}

/**
 * The design's base-10 + race + class formula, with the class column also
 * folding in its paired Background. Applies each source's clamp-to-20
 * sequentially (background implicitly first, folded into the class bonus
 * above, then race, then class) to match createCharacter's own order.
 */
function totalAbilityScores(race: Race, cls: CharacterClass): Record<AbilityKey, number> {
  const classBonus = classBonusWithBackground(cls);
  const totals = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEY_LIST) {
    const afterRace = Math.min(20, 10 + (race.abilityScoreBonuses[key] ?? 0));
    totals[key] = Math.min(20, afterRace + (classBonus[key] ?? 0));
  }
  return totals;
}

export function CharacterCreationScreen({ onComplete, onBack }: CharacterCreationScreenProps) {
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [lookIndex, setLookIndex] = useState(0);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const race = raceId ? RACES[raceId] : undefined;
  const cls = classId ? CLASSES[classId] : undefined;
  const resourceConfig = getClassResource(classId ?? undefined);
  const looks = race ? APPEARANCE_PRESETS[race.id] : [];
  const chosenLook = looks[lookIndex];

  const totals = useMemo(() => (race && cls ? totalAbilityScores(race, cls) : null), [race, cls]);
  const classBonus = useMemo(() => (cls ? classBonusWithBackground(cls) : null), [cls]);
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2;

  function valid(i: number): boolean {
    if (i === 0) return !!raceId;
    if (i === 1) return !!classId;
    if (i === 4) return nameValid;
    return true;
  }

  function go(i: number) {
    if (i <= visited) setStep(i);
  }

  function back() {
    if (step === 0) {
      onBack();
      return;
    }
    setStep((s) => s - 1);
  }

  async function next() {
    if (!valid(step)) return;
    if (step < 4) {
      setStep((s) => s + 1);
      setVisited((v) => Math.max(v, step + 1));
      return;
    }
    // Final step: build and hand off the real character.
    if (!race || !cls) return;
    setError(null);
    setSubmitting(true);
    try {
      const character = createCharacter({
        id: "new-character",
        name: trimmedName,
        raceId: race.id,
        classId: cls.id,
        backgroundId: DEFAULT_BACKGROUND_BY_CLASS[cls.id] ?? "soldier",
        baseAbilityScores: { str: 10, dex: 10, vit: 10, int: 10, wis: 10, spi: 10 },
        appearance: chosenLook,
      });
      await onComplete(character);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this character. Please try again.");
      setSubmitting(false);
    }
  }

  function pickRace(id: string) {
    setRaceId(id);
    setLookIndex(0);
  }

  function randomName() {
    const pool = NAME_POOLS[raceId ?? "human"];
    let candidate: string;
    do {
      candidate = pool[Math.floor(Math.random() * pool.length)];
    } while (candidate === name && pool.length > 1);
    setName(candidate);
  }

  const health = cls && totals ? computeMaxHealth(totals, cls.id) : 0; // Matches createCharacter's maxHp formula exactly.
  const resourceMax = cls && totals ? computeResourceMax(totals, cls.id) : undefined;
  const primaryScore = cls && totals ? totals[cls.primaryAbility] : 0;

  const canAdvance = valid(step);

  return (
    <div className="aow aow-creation">
      <header className="aow-creation-header">
        <button type="button" className="aow-creation-back-link" onClick={onBack}>
          ‹ BACK
        </button>
        <div className="aow-creation-header-logo">
          <span className="aow-diamond aow-logo-diamond" />
          <span className="aow-wordmark">AGE OF BROKEN WINGS</span>
        </div>
        <div className="aow-creation-header-eyebrow">NEW GAME · CREATE YOUR CHARACTER</div>
      </header>

      <div className="aow-creation-body">
        <nav className="aow-creation-rail">
          {STEPS.map((s, i) => {
            const current = i === step;
            const reached = i <= visited;
            const done = i < step || (reached && valid(i) && i !== step);
            const value =
              i === 0 ? race?.name ?? "—" : i === 1 ? cls?.name ?? "—" : i === 2 ? (race && cls ? "Set" : "—") : i === 3 ? chosenLook?.presetName ?? "—" : trimmedName || "—";
            return (
              <button
                key={s.label}
                type="button"
                className={`aow-creation-step${current ? " current" : ""}${!reached ? " unreached" : ""}`}
                onClick={() => go(i)}
                disabled={!reached}
              >
                <span className={`aow-creation-step-diamond${done ? " done" : ""}${current ? " current" : ""}`}>
                  <span>{i + 1}</span>
                </span>
                <span className="aow-creation-step-text">
                  <span className="aow-creation-step-label">{s.label}</span>
                  <span className="aow-creation-step-value">{value}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="aow-creation-content">
          <p className="aow-eyebrow">STEP {step + 1} OF 5</p>
          <h1 className="aow-h1">{STEPS[step].title}</h1>
          <p className="aow-creation-sub">{STEPS[step].sub}</p>

          {step === 0 && (
            <div className="aow-creation-race-grid">
              {Object.values(RACES).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`aow-creation-card${raceId === r.id ? " selected" : ""}`}
                  onClick={() => pickRace(r.id)}
                >
                  <span className="aow-creation-card-glyph">{RACE_GLYPHS[r.id]}</span>
                  <span className="aow-creation-card-name">{r.name}</span>
                  <p className="aow-creation-card-desc">{r.description}</p>
                  <div className="aow-creation-bonus-row">
                    {Object.entries(r.abilityScoreBonuses).map(([key, value]) => (
                      <span key={key} className={`aow-creation-bonus-chip ${value! > 0 ? "positive" : "negative"}`}>
                        {key.toUpperCase()} {sign(value!)}
                      </span>
                    ))}
                  </div>
                  <div className="aow-creation-trait-box">
                    <div className="aow-creation-trait-name">{r.traits[0].name}</div>
                    <p className="aow-creation-trait-desc">{r.traits[0].description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="aow-creation-class-layout">
              <div className="aow-creation-class-list">
                {Object.values(CLASSES).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`aow-creation-class-row${classId === c.id ? " selected" : ""}`}
                    style={classId === c.id ? { borderColor: CLASS_COLOR_VAR[c.id] } : undefined}
                    onClick={() => setClassId(c.id)}
                  >
                    <span className="aow-creation-card-glyph" style={{ color: CLASS_COLOR_VAR[c.id] }}>
                      {CLASS_GLYPHS[c.id]}
                    </span>
                    <span className="aow-creation-step-text">
                      <span className="aow-creation-card-name">{c.name}</span>
                      <span className="aow-creation-class-role">{CLASS_ROLE[c.id]}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="aow-creation-class-detail">
                {!cls ? (
                  <p className="aow-muted-text">Choose a class to see its details.</p>
                ) : (
                  <>
                    <h2 className="aow-creation-class-title" style={{ color: CLASS_COLOR_VAR[cls.id] }}>
                      {cls.name}
                    </h2>
                    <p className="aow-creation-card-desc">{cls.description}</p>
                    <div className="aow-creation-tile-row">
                      <div className="aow-skill-stat">
                        <span className="aow-skill-stat-label">PRIMARY</span>
                        <span>{ABILITY_NAMES[cls.primaryAbility]}</span>
                      </div>
                      <div className="aow-skill-stat">
                        <span className="aow-skill-stat-label">RESOURCE</span>
                        <span>{resourceConfig?.name ?? "At-will"}</span>
                      </div>
                      <div className="aow-skill-stat">
                        <span className="aow-skill-stat-label">ARMOR</span>
                        <span>{CLASS_ARMOR[cls.id]}</span>
                      </div>
                    </div>
                    <div className="aow-creation-skill-list">
                      {cls.actions
                        .filter((a) => a.id !== "strike" && a.id !== "defend" && a.id !== "flee")
                        .map((a) => (
                          <div key={a.id} className="aow-trait-card">
                            <h3>{a.name}</h3>
                            <p>{a.description}</p>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && totals && classBonus && race && cls && (
            <div className="aow-creation-attr-layout">
              <div className="aow-panel aow-creation-attr-panel">
                <div className="aow-panel-header">
                  ATTRIBUTES · {race.name.toUpperCase()} {cls.name.toUpperCase()}
                </div>
                <div className="aow-card-body aow-creation-attr-table">
                  {(["str", "dex", "vit", "int", "wis", "spi"] as AbilityKey[]).map((key) => (
                    <div key={key} className="aow-creation-attr-row">
                      <span className="aow-creation-attr-name">{ABILITY_NAMES[key]}</span>
                      <span className="aow-creation-attr-base">10</span>
                      <span className={`aow-creation-attr-delta ${(race.abilityScoreBonuses[key] ?? 0) >= 0 ? "positive" : "negative"}`}>
                        {sign(race.abilityScoreBonuses[key] ?? 0)}
                      </span>
                      <span className={`aow-creation-attr-delta ${(classBonus[key] ?? 0) >= 0 ? "positive" : "negative"}`}>
                        {sign(classBonus[key] ?? 0)}
                      </span>
                      <span className="aow-creation-attr-total">{totals[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="aow-creation-tile-column">
                <div className="aow-skill-stat">
                  <span className="aow-skill-stat-label">HEALTH</span>
                  <span>{health}</span>
                </div>
                <div className="aow-skill-stat">
                  <span className="aow-skill-stat-label">{(resourceConfig?.name ?? "RESOURCE").toUpperCase()}</span>
                  <span>{resourceMax ?? "—"}</span>
                </div>
                <div className="aow-skill-stat">
                  <span className="aow-skill-stat-label">PRIMARY</span>
                  <span>{primaryScore}</span>
                </div>
                <div className="aow-skill-stat">
                  <span className="aow-skill-stat-label">RACIAL TRAIT</span>
                  <span>{race.traits[0].name}</span>
                </div>
                <p className="aow-muted-text">Further points are earned by levelling.</p>
              </div>
            </div>
          )}

          {step === 3 && race && (
            <div className="aow-creation-look-grid">
              {looks.map((look, i) => (
                <button
                  key={look.presetName}
                  type="button"
                  className={`aow-creation-card aow-creation-look-card${lookIndex === i ? " selected" : ""}`}
                  onClick={() => setLookIndex(i)}
                >
                  <div className="aow-creation-swatch-row">
                    <span className="aow-creation-swatch" style={{ background: look.skin }} />
                    <span className="aow-creation-swatch" style={{ background: look.hair }} />
                    <span className="aow-creation-swatch aow-creation-swatch-diamond" style={{ background: look.eyes }} />
                  </div>
                  <span className="aow-creation-card-name">{look.presetName}</span>
                </button>
              ))}
              <p className="aow-muted-text aow-creation-look-note">
                A custom portrait can be added later — this only picks a starting palette.
              </p>
            </div>
          )}

          {step === 4 && race && cls && (
            <div className="aow-creation-name-layout">
              <div className="aow-creation-name-input-row">
                <input
                  className="aow-creation-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(NAME_PATTERN, ""))}
                  placeholder="Enter a name"
                  maxLength={18}
                />
                <button type="button" className="aow-button-ghost" onClick={randomName}>
                  Random
                </button>
              </div>
              <p className={`aow-creation-name-hint ${nameValid ? "positive" : ""}`}>
                {nameValid ? "NAME ACCEPTED" : "AT LEAST 2 LETTERS · LETTERS, SPACES, APOSTROPHES"}
              </p>

              <div className="aow-creation-summary aow-stat-list">
                <div className="aow-stat-row">
                  <span>Race</span>
                  <span>
                    {race.name} · {race.traits[0].name}
                  </span>
                </div>
                <div className="aow-stat-row">
                  <span>Class</span>
                  <span>
                    {cls.name} · {CLASS_ROLE[cls.id]}
                  </span>
                </div>
                <div className="aow-stat-row">
                  <span>Appearance</span>
                  <span>{chosenLook?.presetName ?? "—"}</span>
                </div>
                <div className="aow-stat-row">
                  <span>Starts in</span>
                  <span>{HOME_TOWN_NAME} · Day 1</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="aow-warning">{error}</p>}
        </div>

        <div className="aow-creation-preview">
          <div className={`aow-creation-preview-frame${cls ? " has-class" : ""}`} style={cls ? { borderColor: CLASS_COLOR_VAR[cls.id] } : undefined}>
            <span className="aow-creation-preview-glyph" style={cls ? { color: CLASS_COLOR_VAR[cls.id] } : undefined}>
              {cls ? CLASS_GLYPHS[cls.id] : race ? RACE_GLYPHS[race.id] : "?"}
            </span>
            <div className="aow-creation-preview-caption">
              <div className="aow-creation-preview-name" style={{ color: trimmedName ? undefined : "var(--aow-faint)" }}>
                {trimmedName || "Unnamed"}
              </div>
              <div className="aow-creation-preview-line">
                {["LV 1", race?.name.toUpperCase(), cls?.name.toUpperCase()].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          {totals && cls && (
            <div className="aow-creation-preview-stats">
              <div className="aow-skill-stat">
                <span className="aow-skill-stat-label">HEALTH</span>
                <span>{health}</span>
              </div>
              <div className="aow-skill-stat">
                <span className="aow-skill-stat-label">{(resourceConfig?.name ?? "RESOURCE").toUpperCase()}</span>
                <span>{resourceMax ?? "—"}</span>
              </div>
              <div className="aow-skill-stat">
                <span className="aow-skill-stat-label">{cls.primaryAbility.toUpperCase()}</span>
                <span>{primaryScore}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="aow-creation-footer">
        <button type="button" className="aow-button-ghost" onClick={back}>
          ‹ BACK
        </button>
        <div className="aow-creation-pagination">
          {STEPS.map((_, i) => (
            <span key={i} className={`aow-diamond aow-creation-dot${i === step ? " current" : ""}${i < step ? " done" : ""}`} />
          ))}
        </div>
        <button type="button" className="aow-button-primary" disabled={!canAdvance || submitting} onClick={next}>
          {submitting ? "Please wait…" : step === 4 ? "Begin Journey" : "Continue"}
          <span className="aow-keycap">ENTER</span>
        </button>
      </footer>
    </div>
  );
}
