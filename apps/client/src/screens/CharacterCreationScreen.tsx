import { useState } from "react";
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  BACKGROUNDS,
  CLASSES,
  RACES,
  computeAbilityScores,
  computeMaxHealth,
  computeResourceMax,
  createCharacter,
  getClassResource,
  type AbilityKey,
  type AbilityScores,
  type Character,
  type CharacterClass,
  type HalfElfChoice,
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

const RACE_GLYPHS: Record<string, string> = { elf: "ᛖ", human: "ᛗ", dwarf: "ᛟ", halfElf: "ᛇ" };
const CLASS_GLYPHS: Record<string, string> = {
  cleric: "ᛋ",
  warrior: "ᛏ",
  soldier: "ᚦ",
  rogue: "ᚾ",
  ranger: "ᚱ",
  wizard: "ᚨ",
  druid: "ᛜ",
};
const CLASS_COLOR_VAR: Record<string, string> = {
  cleric: "var(--aow-gold)",
  warrior: "var(--aow-hp)",
  soldier: "var(--aow-ember)",
  rogue: "var(--aow-violet)",
  ranger: "var(--aow-mana)",
  wizard: "var(--aow-frost)",
  druid: "var(--aow-green)",
};
const CLASS_ROLE: Record<string, string> = {
  cleric: "HEALER · RADIANT CASTER",
  warrior: "FRONT-LINE · MELEE",
  soldier: "DEFENDER · MELEE",
  rogue: "STRIKER · MELEE",
  ranger: "SHARPSHOOTER · RANGED",
  wizard: "CASTER · RANGED",
  druid: "HYBRID · NATURE",
};
const CLASS_ARMOR: Record<string, string> = {
  cleric: "Cloth / Mail",
  warrior: "Plate",
  soldier: "Mail / Leather",
  rogue: "Leather",
  ranger: "Leather",
  wizard: "Cloth",
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

const BASE_ABILITY_SCORES: AbilityScores = { str: 10, dex: 10, vit: 10, int: 10, wis: 10 };

/** Same growth formula the engine actually applies at creation -- see character.ts's `computeAbilityScores`. */
function totalAbilityScores(race: Race, cls: CharacterClass, raceChoice: HalfElfChoice | undefined): AbilityScores {
  const backgroundId = DEFAULT_BACKGROUND_BY_CLASS[cls.id] ?? "soldier";
  return computeAbilityScores(BASE_ABILITY_SCORES, BACKGROUNDS[backgroundId], race, raceChoice, cls, 1);
}

/** A race's own odd-level growth, or a Half-elf's chosen substitute -- see races.ts's `HalfElfChoice`. */
function raceGrowthForDisplay(race: Race, raceChoice: HalfElfChoice | undefined): Partial<Record<AbilityKey, number>> {
  if (race.id !== "halfElf") return race.oddLevelAbilityGrowth;
  if (!raceChoice) return {};
  const growth: Partial<Record<AbilityKey, number>> = { [raceChoice.doubleAbility]: 2 };
  for (const key of raceChoice.singleAbilities) growth[key] = (growth[key] ?? 0) + 1;
  return growth;
}

function growthLabel(growth: Partial<Record<AbilityKey, number>>, perLevelSuffix: string): string {
  const parts = ABILITY_KEYS.filter((key) => growth[key]).map((key) => `${key.toUpperCase()} ${sign(growth[key]!)}`);
  return parts.length > 0 ? `${parts.join(", ")} ${perLevelSuffix}` : "None yet";
}

const DEFAULT_HALF_ELF_DOUBLE: AbilityKey = "dex";
const DEFAULT_HALF_ELF_SINGLES: [AbilityKey, AbilityKey] = ["str", "wis"];

export function CharacterCreationScreen({ onComplete, onBack }: CharacterCreationScreenProps) {
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [lookIndex, setLookIndex] = useState(0);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [halfElfDouble, setHalfElfDouble] = useState<AbilityKey>(DEFAULT_HALF_ELF_DOUBLE);
  const [halfElfSingles, setHalfElfSingles] = useState<[AbilityKey, AbilityKey]>(DEFAULT_HALF_ELF_SINGLES);
  const [halfElfPassive, setHalfElfPassive] = useState<"human" | "elf">("human");

  const race = raceId ? RACES[raceId] : undefined;
  const cls = classId ? CLASSES[classId] : undefined;
  const resourceConfig = getClassResource(classId ?? undefined);
  const looks = race ? APPEARANCE_PRESETS[race.id] : [];
  const chosenLook = looks[lookIndex];

  const raceChoice: HalfElfChoice | undefined =
    raceId === "halfElf" ? { doubleAbility: halfElfDouble, singleAbilities: halfElfSingles, passiveSource: halfElfPassive } : undefined;

  /** Swaps whichever of the three Half-elf ability slots currently holds `key` into `slot`'s old value, so all three always stay distinct. */
  function reassignHalfElfAbility(slot: "double" | 0 | 1, key: AbilityKey) {
    const triple: [AbilityKey, AbilityKey, AbilityKey] = [halfElfDouble, halfElfSingles[0], halfElfSingles[1]];
    const targetIndex = slot === "double" ? 0 : slot === 0 ? 1 : 2;
    const conflictIndex = triple.findIndex((v, i) => v === key && i !== targetIndex);
    if (conflictIndex !== -1) triple[conflictIndex] = triple[targetIndex];
    triple[targetIndex] = key;
    setHalfElfDouble(triple[0]);
    setHalfElfSingles([triple[1], triple[2]]);
  }

  const totals = race && cls ? totalAbilityScores(race, cls, raceChoice) : null;
  const raceGrowth = race ? raceGrowthForDisplay(race, raceChoice) : {};
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
        baseAbilityScores: BASE_ABILITY_SCORES,
        raceChoice,
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

  const health = cls && totals ? computeMaxHealth(totals, cls.id, 1) : 0; // Matches createCharacter's maxHp formula exactly.
  const resourceMax = cls && totals ? computeResourceMax(totals, cls.id, 1) : undefined;
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
            <>
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
                      {r.id === "halfElf" ? (
                        <span className="aow-creation-bonus-chip">Choose your growth at creation</span>
                      ) : (
                        Object.entries(r.oddLevelAbilityGrowth).map(([key, value]) => (
                          <span key={key} className={`aow-creation-bonus-chip ${value! > 0 ? "positive" : "negative"}`}>
                            {key.toUpperCase()} {sign(value!)}/odd lvl
                          </span>
                        ))
                      )}
                    </div>
                    <div className="aow-creation-trait-box">
                      <div className="aow-creation-trait-name">{r.traits[0].name}</div>
                      <p className="aow-creation-trait-desc">{r.traits[0].description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {raceId === "halfElf" && (
                <div className="aow-creation-halfelf-panel">
                  <div className="aow-creation-halfelf-title">OF TWO BLOODLINES · CHOOSE YOUR GROWTH</div>
                  <label className="aow-creation-halfelf-row">
                    <span>Doubled attribute (+2 / odd level)</span>
                    <select value={halfElfDouble} onChange={(e) => reassignHalfElfAbility("double", e.target.value as AbilityKey)}>
                      {ABILITY_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {ABILITY_NAMES[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="aow-creation-halfelf-row">
                    <span>Attribute (+1 / odd level)</span>
                    <select value={halfElfSingles[0]} onChange={(e) => reassignHalfElfAbility(0, e.target.value as AbilityKey)}>
                      {ABILITY_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {ABILITY_NAMES[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="aow-creation-halfelf-row">
                    <span>Attribute (+1 / odd level)</span>
                    <select value={halfElfSingles[1]} onChange={(e) => reassignHalfElfAbility(1, e.target.value as AbilityKey)}>
                      {ABILITY_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {ABILITY_NAMES[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="aow-creation-halfelf-row">
                    <span>Passive</span>
                    <div className="aow-creation-halfelf-passive-toggle">
                      <button
                        type="button"
                        className={`aow-button-ghost${halfElfPassive === "human" ? " selected" : ""}`}
                        onClick={() => setHalfElfPassive("human")}
                      >
                        Adaptable (+10% XP)
                      </button>
                      <button
                        type="button"
                        className={`aow-button-ghost${halfElfPassive === "elf" ? " selected" : ""}`}
                        onClick={() => setHalfElfPassive("elf")}
                      >
                        Spellcasters (+5% spell dmg)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
                      {/* cls.actions (the class definition's static list) holds only its leveled abilities now --
                          the Basic Attack, Defend, and Flee are generated per-character in character.ts, not listed here. */}
                      {cls.actions.map((a) => (
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

          {step === 2 && totals && race && cls && (
            <div className="aow-creation-attr-layout">
              <div className="aow-panel aow-creation-attr-panel">
                <div className="aow-panel-header">
                  ATTRIBUTES AT LEVEL 1 · {race.name.toUpperCase()} {cls.name.toUpperCase()}
                </div>
                <div className="aow-card-body aow-creation-attr-table">
                  {ABILITY_KEYS.map((key) => {
                    const backgroundId = DEFAULT_BACKGROUND_BY_CLASS[cls.id] ?? "soldier";
                    const backgroundDelta = BACKGROUNDS[backgroundId].abilityScores.includes(key) ? 1 : 0;
                    const raceDelta = raceGrowth[key] ?? 0;
                    return (
                      <div key={key} className="aow-creation-attr-row">
                        <span className="aow-creation-attr-name">{ABILITY_NAMES[key]}</span>
                        <span className="aow-creation-attr-base">10</span>
                        <span className={`aow-creation-attr-delta ${backgroundDelta >= 0 ? "positive" : "negative"}`}>{sign(backgroundDelta)}</span>
                        <span className={`aow-creation-attr-delta ${raceDelta >= 0 ? "positive" : "negative"}`}>{sign(raceDelta)}</span>
                        <span className="aow-creation-attr-total">{totals[key]}</span>
                      </div>
                    );
                  })}
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
                <div className="aow-creation-trait-box">
                  <div className="aow-creation-trait-name">Grows every odd level ({race.name})</div>
                  <p className="aow-creation-trait-desc">{growthLabel(raceGrowth, "")}</p>
                </div>
                <div className="aow-creation-trait-box">
                  <div className="aow-creation-trait-name">Grows every even level ({cls.name})</div>
                  <p className="aow-creation-trait-desc">{growthLabel(cls.evenLevelAbilityGrowth, "")}</p>
                </div>
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
