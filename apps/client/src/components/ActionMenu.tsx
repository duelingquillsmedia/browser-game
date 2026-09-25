import { getClassResource, type Combatant, type CombatActionDef } from "@eridan/engine";

export interface ActionMenuProps {
  actor: Combatant;
  round: number;
  pendingActionId: string | null;
  onSelectAction: (action: CombatActionDef) => void;
  onCancel: () => void;
}

/** A short glyph standing in for real ability art in each ability-bar slot (e.g. "Firebolt" -> "FI", "Arcane Shield" -> "AS"). */
function iconGlyph(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function ActionMenu({ actor, round, pendingActionId, onSelectAction, onCancel }: ActionMenuProps) {
  if (pendingActionId) {
    const action = actor.actions.find((a) => a.id === pendingActionId)!;
    return (
      <div className="ability-bar ability-bar-targeting">
        <p className="action-prompt">Choose a target for {action.name}.</p>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  const resourceConfig = getClassResource(actor.classId);
  const endTurnAction = actor.actions.find((a) => a.kind === "endTurn");
  const skillActions = actor.actions.filter((a) => a.kind !== "endTurn");

  return (
    <div className="ability-bar">
      <div className="ability-bar-header">
        <p className="actor-turn-label">{actor.name}'s Turn</p>
        {endTurnAction && (
          <button type="button" className="end-turn-button" onClick={() => onSelectAction(endTurnAction)}>
            End Turn
          </button>
        )}
      </div>
      {skillActions.map((action) => {
        const usesLeft = action.usesPerCombat !== undefined ? actor.actionUses[action.id] ?? 0 : null;
        const roundsUntilReady =
          action.cooldown !== undefined ? Math.max(0, (actor.actionCooldowns[action.id] ?? 0) - round) : 0;
        const onCooldown = roundsUntilReady > 0;
        const canAfford = action.resourceCost === undefined || (actor.resource ?? 0) >= action.resourceCost;
        const apCost = action.apCost ?? 1;
        const canAffordAp = actor.ap === undefined || actor.ap >= apCost;
        const disabled = (usesLeft !== null && usesLeft <= 0) || onCooldown || !canAfford || !canAffordAp;
        const costParts = [
          actor.ap !== undefined ? `${apCost} AP` : null,
          action.resourceCost !== undefined && resourceConfig ? `${action.resourceCost} ${resourceConfig.name}` : null,
        ].filter(Boolean);
        const title =
          costParts.length > 0
            ? `${action.name} — ${action.description} (${costParts.join(", ")})`
            : `${action.name} — ${action.description}`;
        return (
          <button
            key={action.id}
            type="button"
            className="ability-slot"
            disabled={disabled}
            title={title}
            onClick={() => onSelectAction(action)}
          >
            <span className="ability-icon">{iconGlyph(action.name)}</span>
            <span className="ability-name">{action.name}</span>
            {usesLeft !== null && <span className="ability-badge">{usesLeft}</span>}
            {actor.ap !== undefined && (
              <span className={`ability-cost-badge ap${canAffordAp ? "" : " unaffordable"}`}>{apCost}</span>
            )}
            {action.resourceCost !== undefined && (
              <span className={`ability-cost-badge${canAfford ? "" : " unaffordable"}`}>{action.resourceCost}</span>
            )}
            {onCooldown && (
              <>
                <span className="ability-cooldown-overlay" />
                <span className="ability-cooldown-number">{roundsUntilReady}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
