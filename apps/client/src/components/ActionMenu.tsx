import type { Combatant, CombatActionDef } from "@eridan/engine";

export interface ActionMenuProps {
  actor: Combatant;
  round: number;
  pendingActionId: string | null;
  onSelectAction: (action: CombatActionDef) => void;
  onCancel: () => void;
}

export function ActionMenu({ actor, round, pendingActionId, onSelectAction, onCancel }: ActionMenuProps) {
  if (pendingActionId) {
    const action = actor.actions.find((a) => a.id === pendingActionId)!;
    return (
      <div className="action-menu">
        <p className="action-prompt">Choose a target for {action.name}.</p>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="action-menu">
      {actor.actions.map((action) => {
        const usesLeft = action.usesPerCombat !== undefined ? actor.actionUses[action.id] ?? 0 : null;
        const roundsUntilReady =
          action.cooldown !== undefined ? Math.max(0, (actor.actionCooldowns[action.id] ?? 0) - round) : 0;
        const disabled = (usesLeft !== null && usesLeft <= 0) || roundsUntilReady > 0;
        return (
          <button
            key={action.id}
            type="button"
            className="action-button"
            disabled={disabled}
            title={action.description}
            onClick={() => onSelectAction(action)}
          >
            {action.name}
            {usesLeft !== null && <span className="uses"> ({usesLeft} left)</span>}
            {roundsUntilReady > 0 && <span className="uses"> (ready in {roundsUntilReady})</span>}
          </button>
        );
      })}
    </div>
  );
}
