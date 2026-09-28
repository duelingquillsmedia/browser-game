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
import { getBasicAttackVariants, type ActionBarSlot } from "../../game/actionBar";

export interface CombatHudProps {
  state: CombatState;
  player: Combatant;
  /** The Skills page's own 6-slot arrangement, resolved against `player.actions` -- see game/actionBar.ts. */
  slots: ActionBarSlot[];
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

  // Basic Attack (melee/ranged) is a permanent fixture on its own Q/E slots below,
  // not part of the Skills-page-configurable bar -- see game/actionBar.ts.
  const { melee: basicMelee, ranged: basicRanged } = getBasicAttackVariants(player.actions);

  // Every action any slot could show, flattened for the hover-info lookup below.
  const displayedActions: CombatActionDef[] = [
    ...slots.flatMap((slot) => (slot.kind === "action" ? [slot.action] : [])),
    ...(basicMelee ? [basicMelee] : []),
    ...(basicRanged ? [basicRanged] : []),
  ];
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
          {(player.statusEffects.length > 0 || player.dodging) && (
            <div className="cbt-status-chip-row cbt-status-chip-row-hud">
              {player.dodging && (
                <span
                  className="cbt-status-chip cbt-status-chip-hud"
                  style={{ borderColor: statusKindColor("buff"), color: statusKindColor("buff") }}
                  title="Defend's own buff -- not a status effect, but shown the same way: +10% Evasion and Advantage on Flee until your next turn."
                >
                  Defending
                </span>
              )}
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
              {canAct ? "Hover a skill to see its details, or press 1-6, Q, or E." : "Waiting…"}
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
            return (
              <SkillSlot
                key={slot.action.id}
                keyLabel={String(i + 1)}
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
          {basicMelee && (
            <SkillSlot
              keyLabel="Q"
              action={basicMelee}
              player={player}
              round={state.round}
              armed={pendingAction?.id === basicMelee.id}
              disabled={!canAct}
              onHover={onHoverAction}
              onSelect={onSelectAction}
            />
          )}
          {basicRanged ? (
            <SkillSlot
              keyLabel="E"
              action={basicRanged}
              player={player}
              round={state.round}
              armed={pendingAction?.id === basicRanged.id}
              disabled={!canAct}
              onHover={onHoverAction}
              onSelect={onSelectAction}
            />
          ) : (
            <div className="cbt-skill-slot cbt-skill-slot-empty">
              <span className="cbt-slot-key">E</span>
            </div>
          )}
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
  keyLabel,
  action,
  player,
  round,
  armed,
  disabled,
  onHover,
  onSelect,
}: {
  /** The keycap badge shown on the slot -- a numeric position (1-6) for the Skills-page bar, or "Q"/"E" for the permanent Basic Attack slots. */
  keyLabel: string;
  action: CombatActionDef;
  player: Combatant;
  round: number;
  armed: boolean;
  disabled: boolean;
  onHover: (id: string | null) => void;
  onSelect: (action: CombatActionDef) => void;
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
      onTouchStart={() => onHover(action.id)}
      onClick={() => onSelect(action)}
    >
      <span className="cbt-slot-glyph" style={{ color, textShadow: `0 0 10px ${color}` }}>
        {initialsFor(action.name)}
      </span>
      <span className="cbt-slot-key">{keyLabel}</span>
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
