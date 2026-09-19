import { useMemo, useState } from "react";
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  BACKGROUNDS,
  CLASSES,
  ORIGIN_FEATS,
  RACES,
  STANDARD_ARRAY,
  createCharacter,
  type AbilityKey,
  type AbilityScores,
  type Character,
} from "@eridan/engine";
import { BackButton } from "../components/BackButton";

function defaultAssignment(classId: string): AbilityScores {
  const primary = CLASSES[classId].primaryAbility;
  const order: AbilityKey[] = [primary, ...ABILITY_KEYS.filter((k) => k !== primary)];
  const scores = {} as AbilityScores;
  order.forEach((key, i) => {
    scores[key] = STANDARD_ARRAY[i];
  });
  return scores;
}

interface AbilityAssignerProps {
  scores: AbilityScores;
  onChange: (scores: AbilityScores) => void;
}

function AbilityAssigner({ scores, onChange }: AbilityAssignerProps) {
  function handleChange(key: AbilityKey, value: number) {
    const otherKey = ABILITY_KEYS.find((k) => k !== key && scores[k] === value)!;
    onChange({ ...scores, [key]: value, [otherKey]: scores[key] });
  }

  return (
    <div className="ability-grid">
      {ABILITY_KEYS.map((key) => (
        <label key={key} className="ability-row">
          <span>{ABILITY_NAMES[key]}</span>
          <select value={scores[key]} onChange={(e) => handleChange(key, Number(e.target.value))}>
            {STANDARD_ARRAY.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export interface CharacterCreationScreenProps {
  onComplete: (character: Character) => Promise<void>;
  onBack: () => void;
}

export function CharacterCreationScreen({ onComplete, onBack }: CharacterCreationScreenProps) {
  const [name, setName] = useState("");
  const [raceId, setRaceId] = useState("human");
  const [classId, setClassId] = useState("fighter");
  const [backgroundId, setBackgroundId] = useState("acolyte");
  const [scores, setScores] = useState<AbilityScores>(() => defaultAssignment("fighter"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const race = RACES[raceId];
  const cls = CLASSES[classId];
  const background = BACKGROUNDS[backgroundId];
  const originFeat = ORIGIN_FEATS[background.originFeatId];

  const canCreate = name.trim().length > 0;

  const preview = useMemo(() => {
    if (!canCreate) return null;
    return createCharacter({
      id: "preview",
      name: name.trim(),
      raceId,
      classId,
      backgroundId,
      baseAbilityScores: scores,
    });
  }, [canCreate, name, raceId, classId, backgroundId, scores]);

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    setScores(defaultAssignment(nextClassId));
  }

  async function handleSubmit() {
    if (!preview) return;
    setError(null);
    setSubmitting(true);
    try {
      await onComplete(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this character. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="screen creation-screen">
      <BackButton onClick={onBack} />
      <h1>Forge Your Hero</h1>
      <p className="subtitle">A wanderer steps onto the roads of Eridan for the first time.</p>

      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter a name" maxLength={24} />
      </label>

      <div className="picker-row">
        <fieldset className="picker">
          <legend>Race</legend>
          {Object.values(RACES).map((r) => (
            <button
              key={r.id}
              type="button"
              className={r.id === raceId ? "option selected" : "option"}
              onClick={() => setRaceId(r.id)}
            >
              {r.name}
            </button>
          ))}
          <p className="description">{race.description}</p>
        </fieldset>

        <fieldset className="picker">
          <legend>Class</legend>
          {Object.values(CLASSES).map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === classId ? "option selected" : "option"}
              onClick={() => handleClassChange(c.id)}
            >
              {c.name}
            </button>
          ))}
          <p className="description">{cls.description}</p>
        </fieldset>

        <fieldset className="picker">
          <legend>Background</legend>
          {Object.values(BACKGROUNDS).map((b) => (
            <button
              key={b.id}
              type="button"
              className={b.id === backgroundId ? "option selected" : "option"}
              onClick={() => setBackgroundId(b.id)}
            >
              {b.name}
            </button>
          ))}
          <p className="description">{background.description}</p>
          <p className="description">
            +1 {background.abilityScores.map((k) => ABILITY_NAMES[k]).join(", +1 ")} · Origin Feat: {originFeat.name}
          </p>
        </fieldset>
      </div>

      <div>
        <h2>Ability Scores</h2>
        <AbilityAssigner scores={scores} onChange={setScores} />
      </div>

      {preview && (
        <div className="preview-card">
          <h3>
            {preview.name} — {race.name} {cls.name}
          </h3>
          <p>
            HP {preview.maxHp} · AC {preview.armorClass}
          </p>
          <p>
            {background.name} · {originFeat.name}
          </p>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

      <button type="button" className="primary" disabled={!canCreate || submitting} onClick={handleSubmit}>
        {submitting ? "Please wait…" : "Set Out"}
      </button>
    </div>
  );
}
