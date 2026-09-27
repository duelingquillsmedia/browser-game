import { useEffect, useRef } from "react";
import {
  computeResourceMax,
  getClassResource,
  isActionReady,
  STATUS_EFFECT_DEFS,
  type Combatant,
  type CombatActionDef,
  type CombatState,
} from "@eridan/engine";
import {
  buildLogSegments,
  describeBlockReason,
  initialsFor,
  schoolColor,
  skillMeta,
  statusKindColor,
} from "../../game/combatDisplay";
import type { ActionBarSlot } from "../../game/actionBar";

const ITEM_SLOTS = [
  { key: "Q", label: "HEAL", color: "var(--aow-tertiary)" },
  { key: "E", label: "MANA", color: "var(--aow-green)" },
] as const;

export interface CombatHudProps {
  state: CombatState;
  player: Combatant;
  /** The Skills page's own 6-slot arrangement, resolved against `player.actions` -- see game/actionBar.ts. */
  slots: ActionBarSlot[];
  /** Which slot's Basic Attack flyout (melee/ranged sub-buttons) is currently open, if any. */
  expandedSlot: number | null;
  onToggleExpandedSlot: (index: number) => void;
  /** The skill bar slot currently under the pointer, for the info line -- distinct from `pendingAction`, which is armed (clicked, awaiting a target). */
  hoveredActionId: string | null;
  pendingAction: CombatActionDef | null;
  /** True only on the player's own turn, once any resolution animation has finished. */
  canAct: boolean;
  onHoverAction: (id: string | null) => void;
  onSelectAction: (action: CombatActionDef) => void;
  onEndTurn: () => void;
}

function ApDiamonds({ current, max }: { current: number; max: number }) {
  return (
    <div className="cbt-pip-row">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className="cbt-pip cbt-pip-ap"
          style={
            i < current
              ? { background: "var(--aow-gold)", borderColor: "var(--aow-gold)", boxShadow: "0 0 8px rgba(217,184,101,.7)" }
              : { background: "transparent", borderColor: "#6b5a33" }
          }
        />
      ))}
    </div>
  );
}

export function CombatHud({
  state,
  player,
  slots,
  expandedSlot,
  onToggleExpandedSlot,
  hoveredActionId,
  pendingAction,
  canAct,
  onHoverAction,
  onSelectAction,
  onEndTurn,
}: CombatHudProps) {
  const logRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  const resource = getClassResource(player.classId);
  const resourceMax = computeResourceMax(player.abilityScores, player.classId ?? "", player.level ?? 1);
  const shield = player.statusEffects.find((e) => e.defId === "ward")?.amount ?? 0;

  // Every action any slot could show, flattened for the hover-info lookup below --
  // a Basic Attack slot represents two real actions (melee/ranged) at once.
  const displayedActions: CombatActionDef[] = slots.flatMap((slot) =>
    slot.kind === "action" ? [slot.action] : slot.kind === "basicAttack" ? [slot.melee, ...(slot.ranged ? [slot.ranged] : [])] : []
  );
  const infoAction = (hoveredActionId ? displayedActions.find((a) => a.id === hoveredActionId) : null) ?? pendingAction;
  const blockReason = infoAction ? describeBlockReason(player, infoAction, state.round) : null;

  return (
    <footer className="cbt-hud">
      <div className="cbt-panel cbt-status-panel">
        <div className="cbt-level-diamond">
          <div className="cbt-level-diamond-fill" />
          <span>{player.level ?? "?"}</span>
        </div>
        <div className="cbt-status-bars">
          <div className="cbt-bar-label-row">
            <span>HEALTH</span>
            <span className="cbt-bar-label-value">
              {Math.max(0, player.hp)} / {player.maxHp}
              {shield > 0 ? ` +${shield}` : ""}
            </span>
          </div>
          <div className="cbt-hp-track" style={{ height: 9 }}>
            <div className="cbt-hp-fill" style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%` }} />
            {shield > 0 && (
              <div className="cbt-hp-shield" style={{ width: `${Math.min(100, (shield / player.maxHp) * 100)}%`, height: 3 }} />
            )}
          </div>
          {resource && resourceMax !== undefined && (
            <>
              <div className="cbt-bar-label-row">
                <span>{resource.name.toUpperCase()}</span>
                <span className="cbt-bar-label-value">
                  {player.resource ?? 0} / {resourceMax}
                </span>
              </div>
              <div className={`cbt-resource-track cbt-resource-${resource.key}`} style={{ height: 7 }}>
                <div
                  className="cbt-resource-fill"
                  style={{ width: `${Math.max(0, Math.min(100, ((player.resource ?? 0) / resourceMax) * 100))}%` }}
                />
              </div>
            </>
          )}
          {player.apMax !== undefined && (
            <div className="cbt-pip-group">
              <span className="cbt-pip-label">AP</span>
              <ApDiamonds current={player.ap ?? 0} max={player.apMax} />
            </div>
          )}
          {player.statusEffects.length > 0 && (
            <div className="cbt-status-chip-row cbt-status-chip-row-hud">
              {player.statusEffects.map((e) => {
                const def = STATUS_EFFECT_DEFS[e.defId];
                const color = statusKindColor(def.kind);
                return (
                  <span
                    key={e.defId}
                    className="cbt-status-chip cbt-status-chip-hud"
                    style={{ borderColor: color, color }}
                    title={def.description}
                  >
                    {def.name} {e.turnsRemaining}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="cbt-panel cbt-actions-panel">
        <div className="cbt-info-line">
          {infoAction ? (
            <div className="cbt-info-text">
              <div className="cbt-info-name-row">
                <span className="cbt-info-name" style={{ color: schoolColor(infoAction) }}>
                  {infoAction.name}
                </span>
                <span className="cbt-info-meta">{skillMeta(player, infoAction)}</span>
                {blockReason && <span className="cbt-info-warn">{blockReason}</span>}
              </div>
              <div className="cbt-info-desc">{infoAction.description}</div>
            </div>
          ) : (
            <div className="cbt-info-idle">
              {canAct ? "Hover a skill to see its details, or press 1-6." : "Waiting…"}
            </div>
          )}
          <button type="button" className="cbt-end-turn-button" disabled={!canAct} onClick={onEndTurn}>
            <span className="cbt-end-turn-label">END TURN</span>
            <span className="cbt-end-turn-keycap">SPACE</span>
          </button>
        </div>

        <div className="cbt-skill-bar">
          {slots.map((slot, i) => {
            if (slot.kind === "empty") {
              return (
                <div key={`empty-${i}`} className="cbt-skill-slot cbt-skill-slot-empty">
                  <span className="cbt-slot-key">{i + 1}</span>
                </div>
              );
            }
            if (slot.kind === "basicAttack") {
              return (
                <BasicAttackSlot
                  key={`basic-attack-${i}`}
                  index={i}
                  melee={slot.melee}
                  ranged={slot.ranged}
                  player={player}
                  round={state.round}
                  pendingAction={pendingAction}
                  expanded={expandedSlot === i}
                  disabled={!canAct}
                  onHover={onHoverAction}
                  onSelect={onSelectAction}
                  onToggleExpand={() => onToggleExpandedSlot(i)}
                />
              );
            }
            return (
              <SkillSlot
                key={slot.action.id}
                index={i}
                action={slot.action}
                player={player}
                round={state.round}
                armed={pendingAction?.id === slot.action.id}
                disabled={!canAct}
                onHover={onHoverAction}
                onSelect={onSelectAction}
              />
            );
          })}
          <div className="cbt-hud-divider" />
          {ITEM_SLOTS.map((item) => (
            <button key={item.key} type="button" className="cbt-skill-slot cbt-item-slot" disabled title="Coming soon">
              <span className="cbt-item-label" style={{ color: item.color }}>
                {item.label}
              </span>
              <span className="cbt-slot-key">{item.key}</span>
              <span className="cbt-slot-ap">1</span>
              <span className="cbt-item-qty">×0</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cbt-panel cbt-log-panel">
        <div className="cbt-log-header">
          <span className="cbt-log-bullet" />
          COMBAT LOG
        </div>
        <div className="cbt-log-scroll" ref={logRef}>
          {state.log.map((entry, i) =>
            entry.kind === "round" ? (
              <div key={i} className="cbt-log-round">
                <div className="cbt-log-round-rule" />
                {entry.message.replace(/[—-]/g, "").trim().toUpperCase()}
                <div className="cbt-log-round-rule" />
              </div>
            ) : (
              <div key={i} className="cbt-log-line">
                {buildLogSegments(entry, state).map((seg, j) => (
                  <span key={j} style={{ color: seg.color ?? "var(--aow-muted)" }}>
                    {seg.text}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </footer>
  );
}

function SkillSlot({
  index,
  action,
  player,
  round,
  armed,
  disabled,
  onHover,
  onSelect,
  hideKey,
}: {
  index: number;
  action: CombatActionDef;
  player: Combatant;
  round: number;
  armed: boolean;
  disabled: boolean;
  onHover: (id: string | null) => void;
  onSelect: (action: CombatActionDef) => void;
  /** Suppresses the numeric slot-key badge -- for a Basic Attack flyout's melee/ranged sub-buttons, which don't have their own keyboard shortcut. */
  hideKey?: boolean;
}) {
  const ready = isActionReady(player, action, round);
  const roundsUntilReady =
    action.cooldown !== undefined ? Math.max(0, (player.actionCooldowns[action.id] ?? 0) - round) : 0;
  const onCooldown = roundsUntilReady > 0;
  const color = schoolColor(action);

  return (
    <button
      type="button"
      className="cbt-skill-slot"
      disabled={disabled || (!ready && !armed)}
      style={{
        borderColor: armed ? color : undefined,
        background: armed ? "rgba(184,92,74,.18)" : undefined,
        boxShadow: armed ? `0 0 0 1px ${color}, 0 0 18px ${color}` : "none",
        opacity: !ready && !onCooldown ? 0.4 : 1,
      }}
      onMouseEnter={() => onHover(action.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(action)}
    >
      <span className="cbt-slot-glyph" style={{ color, textShadow: `0 0 10px ${color}` }}>
        {initialsFor(action.name)}
      </span>
      {!hideKey && <span className="cbt-slot-key">{index + 1}</span>}
      {player.ap !== undefined && <span className="cbt-slot-ap">{action.apCost ?? 1}</span>}
      {action.resourceCost !== undefined && <span className="cbt-slot-mana">{action.resourceCost}</span>}
      {onCooldown && (
        <span className="cbt-slot-cooldown-overlay">
          <span className="cbt-slot-cooldown-number">{roundsUntilReady}</span>
        </span>
      )}
    </button>
  );
}

/**
 * A slot holding both Basic Attack variants at once (see game/actionBar.ts):
 * one button, labeled "Basic Attack", that -- with a ranged weapon equipped
 * -- opens a small flyout of the two real sub-actions just above it instead
 * of arming anything itself. With no ranged weapon, there's nothing to
 * choose between, so it behaves exactly like a plain melee `SkillSlot`.
 */
function BasicAttackSlot({
  index,
  melee,
  ranged,
  player,
  round,
  pendingAction,
  expanded,
  disabled,
  onHover,
  onSelect,
  onToggleExpand,
}: {
  index: number;
  melee: CombatActionDef;
  ranged?: CombatActionDef;
  player: Combatant;
  round: number;
  pendingAction: CombatActionDef | null;
  expanded: boolean;
  disabled: boolean;
  onHover: (id: string | null) => void;
  onSelect: (action: CombatActionDef) => void;
  onToggleExpand: () => void;
}) {
  const ready = isActionReady(player, melee, round);
  const color = schoolColor(melee);
  const armed = pendingAction?.id === melee.id || pendingAction?.id === ranged?.id;

  function pick(action: CombatActionDef) {
    onSelect(action);
    onToggleExpand();
  }

  return (
    <div className="cbt-basic-attack-wrapper">
      {expanded && ranged && (
        <div className="cbt-basic-attack-flyout">
          <SkillSlot
            index={index}
            action={melee}
            player={player}
            round={round}
            armed={pendingAction?.id === melee.id}
            disabled={disabled}
            onHover={onHover}
            onSelect={pick}
            hideKey
          />
          <SkillSlot
            index={index}
            action={ranged}
            player={player}
            round={round}
            armed={pendingAction?.id === ranged.id}
            disabled={disabled}
            onHover={onHover}
            onSelect={pick}
            hideKey
          />
        </div>
      )}
      <button
        type="button"
        className="cbt-skill-slot"
        disabled={disabled || !ready}
        style={{
          borderColor: armed || expanded ? color : undefined,
          background: armed ? "rgba(184,92,74,.18)" : undefined,
          boxShadow: armed ? `0 0 0 1px ${color}, 0 0 18px ${color}` : expanded ? `0 0 0 1px ${color}` : "none",
          opacity: !ready ? 0.4 : 1,
        }}
        onMouseEnter={() => onHover(melee.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => (ranged ? onToggleExpand() : onSelect(melee))}
      >
        <span className="cbt-slot-glyph" style={{ color, textShadow: `0 0 10px ${color}` }}>
          {initialsFor("Basic Attack")}
        </span>
        <span className="cbt-slot-key">{index + 1}</span>
        {player.ap !== undefined && <span className="cbt-slot-ap">{melee.apCost ?? 1}</span>}
      </button>
    </div>
  );
}
