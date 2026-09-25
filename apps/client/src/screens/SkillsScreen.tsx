import { useState } from "react";
import {
  ABILITY_NAMES,
  ACTION_BAR_SLOT_COUNT,
  assignActionBarSlot,
  clearActionBarSlot,
  getClassResource,
  type ActionKind,
  type Character,
  type CombatActionDef,
} from "@eridan/engine";
import "./SkillsScreen.css";

export interface SkillsScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

type FilterId = "all" | "attack" | "heal" | "buff" | "utility";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attack", label: "Attack" },
  { id: "heal", label: "Heal" },
  { id: "buff", label: "Buff" },
  { id: "utility", label: "Utility" },
];

const TARGET_LABELS: Record<string, string> = {
  enemy: "Enemy",
  enemies: "All Enemies",
  ally: "Ally",
  self: "Self",
  none: "None",
};

function bucketFor(kind: ActionKind): Exclude<FilterId, "all"> {
  if (kind === "attack" || kind === "save") return "attack";
  if (kind === "heal") return "heal";
  if (kind === "buff") return "buff";
  return "utility";
}

/** A short glyph standing in for real ability art, e.g. "Firebolt" -> "FI", "Arcane Shield" -> "AS". */
function iconGlyph(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The actual min-max range this action will roll for this character, from
 * its power coefficient and ability score -- plus the equipped weapon's
 * flat damage bonus, which combat.ts only ever applies to the basic Strike.
 */
function powerRange(action: CombatActionDef, abilityScore: number, weaponDamageBonus: number): [number, number] {
  const power = action.power ?? 1;
  const bonus = action.id === "strike" ? weaponDamageBonus : 0;
  return [Math.round(abilityScore * power * 0.85) + bonus, Math.round(abilityScore * power * 1.15) + bonus];
}

export function SkillsScreen({ character, onUpdateCharacter }: SkillsScreenProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(character.actions[0]?.id ?? null);
  const [placingActionId, setPlacingActionId] = useState<string | null>(null);

  const resourceConfig = getClassResource(character.classId);
  const actionBar = character.actionBarIds ?? Array(ACTION_BAR_SLOT_COUNT).fill(null);
  const actionById = new Map(character.actions.map((a) => [a.id, a]));

  const counts: Record<FilterId, number> = { all: character.actions.length, attack: 0, heal: 0, buff: 0, utility: 0 };
  for (const action of character.actions) counts[bucketFor(action.kind)]++;

  const selected: CombatActionDef | undefined = character.actions.find((a) => a.id === selectedId);
  const selectedSlotIndex = selected ? actionBar.indexOf(selected.id) : -1;
  const placingAction = placingActionId ? actionById.get(placingActionId) : undefined;

  function handleSlotClick(slotIndex: number) {
    if (placingActionId) {
      onUpdateCharacter(assignActionBarSlot(character, slotIndex, placingActionId));
      setPlacingActionId(null);
      return;
    }
    const actionId = actionBar[slotIndex];
    if (actionId) setSelectedId(actionId);
  }

  return (
    <div className="aow-skills">
      <p className="aow-eyebrow">ACTIVE ABILITIES FOR COMBAT</p>
      <h1 className="aow-h1">Skills</h1>

      <div className="aow-panel aow-action-bar-panel">
        <div className="aow-panel-header">ACTION BAR</div>
        <div className="aow-card-body">
          <p className={`aow-action-bar-hint${placingActionId ? "" : " aow-muted-text"}`}>
            {placingAction ? (
              <>
                Placing {placingAction.name}. Click a slot.{" "}
                <button type="button" className="aow-button-ghost aow-action-bar-cancel" onClick={() => setPlacingActionId(null)}>
                  Cancel
                </button>
              </>
            ) : (
              "Select a skill below, then place it on a slot to organize your bar."
            )}
          </p>
          <div className="aow-action-bar-slots">
            {actionBar.map((actionId, i) => {
              const action = actionId ? actionById.get(actionId) : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  className={`aow-action-bar-slot${placingActionId ? " placing" : ""}${
                    action && selectedId === action.id ? " active" : ""
                  }`}
                  onClick={() => handleSlotClick(i)}
                  title={action ? action.name : "Empty slot"}
                >
                  <span className="aow-action-bar-key">{i + 1}</span>
                  {action ? (
                    <span className={`aow-skill-glyph aow-skill-glyph-${bucketFor(action.kind)}`}>
                      {iconGlyph(action.name)}
                    </span>
                  ) : (
                    <span className="aow-action-bar-empty">Empty</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="aow-skills-grid">
        <div className="aow-panel aow-skills-list-panel">
          <div className="aow-panel-header">SPELLBOOK</div>
          <div className="aow-card-body">
            <div className="aow-filter-row">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`aow-filter-tab${filter === f.id ? " active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label.toUpperCase()} {counts[f.id]}
                </button>
              ))}
            </div>

            <div className="aow-skill-rows">
              {character.actions
                .filter((action) => filter === "all" || bucketFor(action.kind) === filter)
                .map((action) => {
                  const cost =
                    action.resourceCost !== undefined && resourceConfig
                      ? `${action.resourceCost} ${resourceConfig.name}`
                      : "At-will";
                  const extra = action.cooldown
                    ? `Cooldown ${action.cooldown}`
                    : action.usesPerCombat !== undefined
                      ? `${action.usesPerCombat}/fight`
                      : null;
                  const slotIndex = actionBar.indexOf(action.id);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`aow-skill-row${selectedId === action.id ? " active" : ""}`}
                      onClick={() => setSelectedId(action.id)}
                    >
                      <span className={`aow-skill-glyph aow-skill-glyph-${bucketFor(action.kind)}`}>
                        {iconGlyph(action.name)}
                      </span>
                      <span className="aow-skill-row-body">
                        <span className="aow-skill-row-name">
                          {action.name}
                          {slotIndex !== -1 && <span className="aow-skill-slot-tag">Slot {slotIndex + 1}</span>}
                        </span>
                        <span className="aow-skill-row-meta">
                          {cost}
                          {extra ? ` · ${extra}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="aow-panel aow-skill-detail-panel">
          <div className="aow-panel-header">SKILL</div>
          <div className="aow-card-body">
            {!selected ? (
              <p className="aow-muted-text">Select a skill to see its details.</p>
            ) : (
              <>
                <div className="aow-item-header">
                  <span className={`aow-skill-glyph aow-skill-glyph-${bucketFor(selected.kind)} aow-skill-glyph-lg`}>
                    {iconGlyph(selected.name)}
                  </span>
                  <div>
                    <div className="aow-item-name">{selected.name}</div>
                    <div className="aow-item-type-line">
                      {capitalize(bucketFor(selected.kind))} · {capitalize(selected.kind)}
                    </div>
                  </div>
                </div>

                <p className="aow-item-flavor">{selected.description}</p>

                <div className="aow-skill-stat-grid">
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">ABILITY</span>
                    <span>{ABILITY_NAMES[selected.ability]}</span>
                  </div>
                  <div className="aow-skill-stat">
                    <span className="aow-skill-stat-label">TARGET</span>
                    <span>{TARGET_LABELS[selected.target] ?? capitalize(selected.target)}</span>
                  </div>
                  {selected.power !== undefined && (selected.kind === "attack" || selected.kind === "heal" || selected.kind === "save") && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">{selected.kind === "heal" ? "HEALING" : "DAMAGE"}</span>
                      <span>
                        {powerRange(selected, character.abilityScores[selected.ability], character.weaponDamageBonus).join(
                          "–"
                        )}
                      </span>
                    </div>
                  )}
                  {selected.damageType && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">DAMAGE TYPE</span>
                      <span>{capitalize(selected.damageType)}</span>
                    </div>
                  )}
                  {selected.effectValue !== undefined && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">EFFECT</span>
                      <span>+{selected.effectValue} Evasion</span>
                    </div>
                  )}
                  {selected.resourceCost !== undefined && resourceConfig && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">COST</span>
                      <span>
                        {selected.resourceCost} {resourceConfig.name}
                      </span>
                    </div>
                  )}
                  {selected.cooldown !== undefined && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">COOLDOWN</span>
                      <span>{selected.cooldown} rounds</span>
                    </div>
                  )}
                  {selected.usesPerCombat !== undefined && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">USES</span>
                      <span>{selected.usesPerCombat} per fight</span>
                    </div>
                  )}
                </div>

                {selectedSlotIndex !== -1 ? (
                  <button
                    type="button"
                    className="aow-button-ghost"
                    onClick={() => onUpdateCharacter(clearActionBarSlot(character, selectedSlotIndex))}
                  >
                    Remove from Action Bar
                  </button>
                ) : (
                  <button type="button" className="aow-button-primary" onClick={() => setPlacingActionId(selected.id)}>
                    Place on Action Bar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
