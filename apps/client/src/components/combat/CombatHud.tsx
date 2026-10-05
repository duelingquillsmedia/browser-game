import { useEffect, useRef, useState } from "react";
import {
  computeResourceMax,
  getClassResource,
  isActionReady,
  STATUS_EFFECT_DEFS,
  type Combatant,
  type CombatActionDef,
  type CombatLogEntry,
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

/**
 * The scrolling log entries, self-contained with its own auto-scroll-to-bottom effect -- used
 * both inline in the desktop panel and again inside the mobile log modal, each instance keeping
 * its own ref/scroll position rather than fighting over a single shared one.
 */
function LogScrollList({ state }: { state: CombatState }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  return (
    <div className="cbt-log-scroll" ref={ref}>
      {state.log.map((entry: CombatLogEntry, i: number) =>
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
  );
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
  /** Mobile only (see .cbt-log-toggle-button/.cbt-log-panel's `pointer: coarse` rules) -- the
   * permanent log panel there becomes a small button that pops this modal open instead, since
   * a whole always-visible panel doesn't fit a phone-sized combat screen. */
  const [logOpen, setLogOpen] = useState(false);

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
          {/* Wrapped so mobile can place HEALTH and the resource bar side by side instead of
              stacked -- see .cbt-bar-group-hp/-resource's `pointer: coarse` rule. Desktop's plain
              flex-column stacking is unaffected: an unstyled wrapper div around two already-
              adjacent children doesn't change how they lay out. */}
          <div className="cbt-bar-group cbt-bar-group-hp">
            <div className="cbt-bar-label-row">
              <span>HEALTH</span>
              <span className="cbt-bar-label-value">
                {Math.max(0, player.hp)} / {player.maxHp}
                {shield > 0 ? ` +${shield}` : ""}
              </span>
            </div>
            <div className="cbt-hp-track cbt-hp-track-hud">
              <div className="cbt-hp-fill" style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%` }} />
              {shield > 0 && (
                <div className="cbt-hp-shield cbt-hp-shield-hud" style={{ width: `${Math.min(100, (shield / player.maxHp) * 100)}%` }} />
              )}
            </div>
          </div>
          {resource && resourceMax !== undefined && (
            <div className="cbt-bar-group cbt-bar-group-resource">
              <div className="cbt-bar-label-row">
                <span>{resource.name.toUpperCase()}</span>
                <span className="cbt-bar-label-value">
                  {player.resource ?? 0} / {resourceMax}
                </span>
              </div>
              <div className={`cbt-resource-track cbt-resource-${resource.key} cbt-resource-track-hud`}>
                <div
                  className="cbt-resource-fill"
                  style={{ width: `${Math.max(0, Math.min(100, ((player.resource ?? 0) / resourceMax) * 100))}%` }}
                />
              </div>
            </div>
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
        <LogScrollList state={state} />
      </div>

      <button
        type="button"
        className="cbt-log-toggle-button"
        onClick={() => setLogOpen(true)}
        aria-label="Open combat log"
      >
        <span className="cbt-log-bullet" />
        LOG
      </button>

      {logOpen && (
        <div className="cbt-log-modal-backdrop" onClick={() => setLogOpen(false)}>
          <div className="cbt-panel cbt-log-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cbt-log-modal-header">
              <div className="cbt-log-header cbt-log-modal-title">
                <span className="cbt-log-bullet" />
                COMBAT LOG
              </div>
              <button
                type="button"
                className="cbt-log-modal-close"
                onClick={() => setLogOpen(false)}
                aria-label="Minimize combat log"
              >
                ×
              </button>
            </div>
            <LogScrollList state={state} />
          </div>
        </div>
      )}
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

  // Mobile has no hover to preview an ability with (see .cbt-info-text's own `pointer: coarse`
  // rule, which hides the desktop hover-preview text entirely) -- a press-and-hold shows this
  // popover instead, without arming/using the ability the way a normal tap does. `longPressRef`
  // is what tells the `onClick` that follows a long-press's `touchend` to swallow itself rather
  // than select the ability out from under the player.
  const [showPopover, setShowPopover] = useState(false);
  const pressTimerRef = useRef<number | null>(null);
  const longPressRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function handleTouchStart() {
    onHover(action.id);
    longPressRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      longPressRef.current = true;
      setShowPopover(true);
    }, 450);
  }

  useEffect(() => {
    if (!showPopover) return;
    function handleOutsideTouch(e: TouchEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) setShowPopover(false);
    }
    document.addEventListener("touchstart", handleOutsideTouch);
    return () => document.removeEventListener("touchstart", handleOutsideTouch);
  }, [showPopover]);

  const blockReason = describeBlockReason(player, action, round);

  return (
    // The popover renders as a sibling of the button, not a child of it -- a disabled/not-ready
    // slot dims itself via the button's own inline `opacity`, and since opacity < 1 forces a new
    // compositing group for its whole subtree, a popover nested *inside* that button would get
    // blended translucent against the status panel behind it too, however far outside the
    // button's own box it's positioned. This wrapper is the nearest `position: relative`
    // ancestor the popover's `position: absolute` anchors to instead, at full opacity.
    // Hover/touch listeners live on this wrapper, not the <button> itself -- a disabled native
    // button doesn't let mouse/touch events bubble (a long-standing browser quirk), so React's
    // onMouseEnter/onMouseLeave never fire on it once an ability is unaffordable/on cooldown,
    // silently breaking the hover-to-preview info line for exactly the abilities a player is
    // most likely to want a reminder about. The wrapper is never itself disabled, so it always
    // sees the hover/touch regardless of the button's own disabled state.
    <div
      ref={buttonRef}
      className="cbt-skill-slot-wrap"
      onMouseEnter={() => onHover(action.id)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={clearPressTimer}
      onTouchEnd={clearPressTimer}
    >
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
        onClick={() => {
          if (longPressRef.current) {
            longPressRef.current = false;
            return;
          }
          onSelect(action);
        }}
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
      {showPopover && (
        <div className="cbt-skill-popover" onClick={(e) => e.stopPropagation()}>
          <div className="cbt-info-name-row">
            <span className="cbt-info-name" style={{ color }}>
              {action.name}
            </span>
            <span className="cbt-info-meta">{skillMeta(player, action)}</span>
          </div>
          {blockReason && <div className="cbt-info-warn">{blockReason}</div>}
          <div className="cbt-info-desc">{action.description}</div>
        </div>
      )}
    </div>
  );
}
