import { useState } from "react";
import {
  ABILITY_NAMES,
  assignActionBarSlot,
  clearActionBarSlot,
  computeAttackPower,
  computeAttackPowerBonusDamage,
  getClassResource,
  type ActionKind,
  type Character,
  type CombatActionDef,
} from "@eridan/engine";
import { buildActionBarSlots, effectiveActionBarIds } from "../game/actionBar";
import { getAbilityIcon } from "../game/abilityIcons";
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

/** A short glyph standing in for real ability art, e.g. "Arcane Bolt" -> "AB", "Wild Swing" -> "WS". */
function iconGlyph(name: string): string {
  // Strips punctuation before taking initials, so a stray character from a possessive name
  // (e.g. "Nature's Strike") never ends up as one of them.
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
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

/** Whether `powerRange` can compute anything meaningful for this action -- every attack/heal/save kind now uses one of three formula shapes (see combat.ts's `computeBaseDamage`). */
function hasComputableAmount(action: CombatActionDef): boolean {
  return (
    action.power !== undefined ||
    action.flatBase !== undefined ||
    action.percentOfAbility !== undefined ||
    action.weaponDamageSource !== undefined
  );
}

/**
 * The actual min-max range this action will roll for this character, mirroring
 * combat.ts's `computeBaseDamage`/`previewBaseDamageRange`: a weapon-scaled
 * action rolls that weapon's own advertised range plus a flat bonus, with no
 * extra variance on top -- a Basic Attack's bonus is its own named
 * `percentOfAbility` (e.g. Wild Swing: 20% of Attack Power, stored as double
 * that against the raw ability score -- see classes.ts's `BasicAttackVariant`
 * doc comment), which *replaces* the flat Attack Power bonus every other
 * weapon-scaled ability (Cleave, Serrated Blade, Evasive Jab, ...) still
 * gets; a flat-plus-percent action (Mend,
 * Wylde Healing, ...) passes through the same 85%-115% variance band as a
 * plain power-scaled one.
 */
function powerRange(action: CombatActionDef, character: Character): [number, number] {
  const abilityScore = character.abilityScores[action.ability];
  const percentAdd =
    action.percentOfAbility !== undefined ? Math.round(abilityScore * action.percentOfAbility) : 0;

  if (action.weaponDamageSource) {
    const weaponMin = action.weaponDamageSource === "ranged" ? character.rangedWeaponDamageMin : character.meleeWeaponDamageMin;
    const weaponMax = action.weaponDamageSource === "ranged" ? character.rangedWeaponDamageMax : character.meleeWeaponDamageMax;
    if (weaponMin !== undefined && weaponMax !== undefined) {
      const bonus = action.isBasicAttack ? 0 : computeAttackPowerBonusDamage(computeAttackPower(abilityScore));
      return [weaponMin + bonus + percentAdd, weaponMax + bonus + percentAdd];
    }
  }
  if (action.flatBase !== undefined || action.percentOfAbility !== undefined) {
    const base = (action.flatBase ?? 0) + percentAdd;
    return [Math.round(base * 0.85), Math.round(base * 1.15)];
  }
  const power = action.power ?? 1;
  return [Math.round(abilityScore * power * 0.85), Math.round(abilityScore * power * 1.15)];
}

export function SkillsScreen({ character, onUpdateCharacter }: SkillsScreenProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  // Basic Attack (melee/ranged) is a permanent fixture outside this page's action
  // bar now (see game/actionBar.ts) -- skip it when picking an initial selection.
  const [selectedId, setSelectedId] = useState<string | null>(
    character.actions.find((a) => !a.isBasicAttack)?.id ?? null
  );
  const [placingActionId, setPlacingActionId] = useState<string | null>(null);

  const resourceConfig = getClassResource(character.classId);
  // The Skills page's own slot arrangement is what combat's action bar reads
  // (see game/actionBar.ts) -- an untouched, all-empty bar falls back to a
  // computed default so this page and a fresh fight always agree on what's
  // shown before the player customizes anything.
  const actionBarIds = effectiveActionBarIds(character.actionBarIds, character.actions);
  const slots = buildActionBarSlots(actionBarIds, character.actions);
  const actionById = new Map(character.actions.map((a) => [a.id, a]));

  // Basic Attack doesn't compete for a bar slot anymore -- it's not listed here at all.
  // Flee and End Turn are always-available combat controls of their own (see CombatScreen.tsx's
  // dedicated Flee button and CombatHud's End Turn button), not something to place on a bar slot,
  // so they don't belong in this customization list either.
  const listActions = character.actions.filter(
    (a) => !a.isBasicAttack && a.kind !== "flee" && a.kind !== "endTurn"
  );

  const counts: Record<FilterId, number> = { all: listActions.length, attack: 0, heal: 0, buff: 0, utility: 0 };
  for (const action of listActions) counts[bucketFor(action.kind)]++;

  const selected: CombatActionDef | undefined = character.actions.find((a) => a.id === selectedId);
  const selectedIcon = selected ? getAbilityIcon(character.classId, selected) : undefined;
  const selectedSlotIndex = selected ? actionBarIds.indexOf(selected.familyId ?? selected.id) : -1;
  const placingAction = placingActionId ? actionById.get(placingActionId) : undefined;

  function handleSlotClick(slotIndex: number) {
    if (placingActionId) {
      // Stored by family id, not the exact rank id, so a later rank-up still resolves to
      // this same slot (see game/actionBar.ts's `buildActionBarSlots` for the other half).
      const slotValue = placingAction?.familyId ?? placingActionId;
      onUpdateCharacter(assignActionBarSlot({ ...character, actionBarIds }, slotIndex, slotValue));
      setPlacingActionId(null);
      return;
    }
    const slot = slots[slotIndex];
    if (slot.kind === "empty") return;
    setSelectedId(slot.action.id);
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
            {slots.map((slot, i) => {
              const isActive = slot.kind === "action" && selectedId === slot.action.id;
              const name = slot.kind === "action" ? slot.action.name : null;
              const bucket = slot.kind === "action" ? bucketFor(slot.action.kind) : null;
              const icon = slot.kind === "action" ? getAbilityIcon(character.classId, slot.action) : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  className={`aow-action-bar-slot${placingActionId ? " placing" : ""}${isActive ? " active" : ""}`}
                  onClick={() => handleSlotClick(i)}
                  title={name ?? "Empty slot"}
                >
                  <span className="aow-action-bar-key">{i + 1}</span>
                  {name && bucket ? (
                    <span className={`aow-skill-glyph aow-skill-glyph-${bucket}`}>
                      {icon ? <img src={icon} alt="" /> : iconGlyph(name)}
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
          <div className="aow-panel-header">ABILITIES</div>
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
              {listActions
                .filter((action) => filter === "all" || bucketFor(action.kind) === filter)
                .map((action) => {
                  const cost =
                    action.resourceCost !== undefined && resourceConfig
                      ? `${action.resourceCost} ${resourceConfig.name}`
                      : "Free";
                  const extra = action.cooldown
                    ? `Cooldown ${action.cooldown}`
                    : action.usesPerCombat !== undefined
                      ? `${action.usesPerCombat}/fight`
                      : null;
                  const slotIndex = actionBarIds.indexOf(action.familyId ?? action.id);
                  const name = action.name;
                  const icon = getAbilityIcon(character.classId, action);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`aow-skill-row${selectedId === action.id ? " active" : ""}`}
                      onClick={() => setSelectedId(action.id)}
                    >
                      <span className={`aow-skill-glyph aow-skill-glyph-${bucketFor(action.kind)}`}>
                        {icon ? <img src={icon} alt="" /> : iconGlyph(name)}
                      </span>
                      <span className="aow-skill-row-body">
                        <span className="aow-skill-row-name">
                          {name}
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
                    {selectedIcon ? <img src={selectedIcon} alt="" /> : iconGlyph(selected.name)}
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
                  {hasComputableAmount(selected) && (selected.kind === "attack" || selected.kind === "heal" || selected.kind === "save") && (
                    <div className="aow-skill-stat">
                      <span className="aow-skill-stat-label">{selected.kind === "heal" ? "HEALING" : "DAMAGE"}</span>
                      <span>{powerRange(selected, character).join("–")}</span>
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
                    onClick={() => onUpdateCharacter(clearActionBarSlot({ ...character, actionBarIds }, selectedSlotIndex))}
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
