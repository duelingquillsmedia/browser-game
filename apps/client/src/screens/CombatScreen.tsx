import { useState } from "react";
import type { ActionRequest, CombatActionDef, CombatState } from "@eridan/engine";
import { currentCombatant } from "@eridan/engine";
import { CombatantCard } from "../components/CombatantCard";
import { CombatLog } from "../components/CombatLog";
import { ActionMenu } from "../components/ActionMenu";
import { LocationBackdrop } from "../components/LocationBackdrop";
import type { Encounter } from "../game/lore";

export interface CombatScreenProps {
  combat: CombatState;
  encounter: Encounter;
  onSubmitAction: (request: ActionRequest) => void;
}

export function CombatScreen({ combat, encounter, onSubmitAction }: CombatScreenProps) {
  const [pendingAction, setPendingAction] = useState<CombatActionDef | null>(null);

  const actor = combat.status === "active" ? currentCombatant(combat) : null;
  const party = combat.combatants.filter((c) => c.side === "party");
  const enemies = combat.combatants.filter((c) => c.side === "enemy");

  function handleSelectAction(action: CombatActionDef) {
    if (action.target === "self" || action.target === "none") {
      onSubmitAction({ actorId: actor!.id, actionId: action.id });
      return;
    }
    setPendingAction(action);
  }

  function handlePickTarget(targetId: string) {
    if (!pendingAction || !actor) return;
    onSubmitAction({ actorId: actor.id, actionId: pendingAction.id, targetId });
    setPendingAction(null);
  }

  function isSelectable(side: "party" | "enemy"): boolean {
    if (!pendingAction) return false;
    if (pendingAction.target === "enemy") return side === "enemy";
    if (pendingAction.target === "ally") return side === "party";
    return false;
  }

  return (
    <>
      <LocationBackdrop image={encounter.backgroundImage} />
      <div className="screen combat-screen">
        <h1>{encounter.name}</h1>
        <p className="subtitle">{encounter.location}</p>

        <div className="battlefield">
          <div className="party-side">
            {party.map((c) => (
              <CombatantCard
                key={c.id}
                combatant={c}
                isCurrentTurn={actor?.id === c.id}
                isSelectableTarget={isSelectable("party")}
                onSelect={() => handlePickTarget(c.id)}
              />
            ))}
          </div>
          <div className="enemy-side">
            {enemies.map((c) => (
              <CombatantCard
                key={c.id}
                combatant={c}
                isCurrentTurn={actor?.id === c.id}
                isSelectableTarget={isSelectable("enemy")}
                onSelect={() => handlePickTarget(c.id)}
              />
            ))}
          </div>
        </div>

        <CombatLog entries={combat.log} />

        {actor && (
          <ActionMenu
            actor={actor}
            pendingActionId={pendingAction?.id ?? null}
            onSelectAction={handleSelectAction}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </div>
    </>
  );
}
