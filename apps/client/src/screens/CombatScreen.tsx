import { useEffect, useRef, useState } from "react";
import type { ActionRequest, CombatActionDef, CombatLogEntry, CombatState } from "@eridan/engine";
import { currentCombatant } from "@eridan/engine";
import { CombatantCard, type CombatantEffect } from "../components/CombatantCard";
import { CombatLog } from "../components/CombatLog";
import { ActionMenu } from "../components/ActionMenu";
import { LocationBackdrop } from "../components/LocationBackdrop";
import type { Encounter } from "../game/lore";

export interface CombatScreenProps {
  combat: CombatState;
  encounter: Encounter;
  onSubmitAction: (request: ActionRequest) => void;
  /** Called once, shortly after a finished fight's last event has finished animating. */
  onSettled?: () => void;
}

/** How long each new log entry stays on screen before the next one plays. */
const EVENT_DELAY_MS = 900;
/** Purely informational lines (round breaks, initiative) don't need as long a beat. */
const INFO_DELAY_MS = 350;

function applyEventToWorkingState(state: CombatState, entry: CombatLogEntry): CombatState {
  if (entry.amount === undefined || !entry.targetId) return state;
  const combatants = state.combatants.map((c) => {
    if (c.id !== entry.targetId) return c;
    if (entry.kind === "heal") return { ...c, hp: Math.min(c.maxHp, c.hp + entry.amount!) };
    if (entry.kind === "hit" || entry.kind === "save-fail" || entry.kind === "save-succeed") {
      return { ...c, hp: Math.max(0, c.hp - entry.amount!) };
    }
    return c;
  });
  return { ...state, combatants };
}

function effectsForEntry(entry: CombatLogEntry, keyBase: number): Record<string, CombatantEffect> {
  const effects: Record<string, CombatantEffect> = {};
  const isAttackLike = entry.kind === "hit" || entry.kind === "miss" || entry.kind === "save-fail" || entry.kind === "save-succeed";

  if (entry.actorId && isAttackLike) {
    effects[entry.actorId] = { kind: "attacking", key: keyBase };
  } else if (entry.actorId && (entry.kind === "buff" || entry.kind === "defend")) {
    effects[entry.actorId] = { kind: "buff", key: keyBase };
  }

  if (entry.targetId && entry.kind === "heal") {
    effects[entry.targetId] = { kind: "heal", text: `+${entry.amount}`, key: keyBase + 1 };
  } else if (entry.targetId && entry.amount !== undefined && isAttackLike) {
    effects[entry.targetId] = {
      kind: "hit",
      text: `-${entry.amount}${entry.crit ? "!" : ""}`,
      key: keyBase + 1,
    };
  } else if (entry.targetId && entry.kind === "miss") {
    effects[entry.targetId] = { kind: "hit", text: "Miss", key: keyBase + 1 };
  }

  return effects;
}

export function CombatScreen({ combat, encounter, onSubmitAction, onSettled }: CombatScreenProps) {
  const [pendingAction, setPendingAction] = useState<CombatActionDef | null>(null);
  const [visualState, setVisualState] = useState<CombatState>(combat);
  const [isAnimating, setIsAnimating] = useState(false);
  const [effects, setEffects] = useState<Record<string, CombatantEffect>>({});
  const revealedRef = useRef(combat.log.length);
  const effectKeyRef = useRef(0);
  const settledFiredRef = useRef(false);

  useEffect(() => {
    // Signals the fight is over only once the LAST queued event has actually finished
    // playing (not just when `combat.status` first flips), so the result screen never
    // preempts an in-progress animation. Lives here (not a separate effect keyed off
    // `isAnimating`) so there's no window where a stale `isAnimating` from a prior
    // render could race the `combat.status` prop that just updated.
    function finishIfSettled() {
      if (combat.status !== "active" && !settledFiredRef.current) {
        settledFiredRef.current = true;
        setTimeout(() => onSettled?.(), 400);
      }
    }

    if (combat.log.length <= revealedRef.current) {
      // First mount, or nothing new to animate -- just sync straight to the authoritative state.
      setVisualState(combat);
      revealedRef.current = combat.log.length;
      finishIfSettled();
      return;
    }

    const newEntries = combat.log.slice(revealedRef.current);
    const startIndex = revealedRef.current;
    let working = visualState;
    let cancelled = false;

    setIsAnimating(true);

    function playStep(i: number) {
      if (cancelled) return;
      if (i >= newEntries.length) {
        setVisualState(combat);
        revealedRef.current = combat.log.length;
        setEffects({});
        setIsAnimating(false);
        finishIfSettled();
        return;
      }

      const entry = newEntries[i];
      working = applyEventToWorkingState(working, entry);
      setVisualState({ ...working, log: combat.log.slice(0, startIndex + i + 1) });

      effectKeyRef.current += 2;
      setEffects(effectsForEntry(entry, effectKeyRef.current));

      const delay = entry.kind === "info" || entry.kind === "round" ? INFO_DELAY_MS : EVENT_DELAY_MS;
      setTimeout(() => playStep(i + 1), delay);
    }

    playStep(0);
    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs when a fresh `combat` object arrives (a new action was submitted).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat]);

  const actor = !isAnimating && visualState.status === "active" ? currentCombatant(visualState) : null;
  const party = visualState.combatants.filter((c) => c.side === "party");
  const enemies = visualState.combatants.filter((c) => c.side === "enemy");

  function handleSelectAction(action: CombatActionDef) {
    if (action.target === "self" || action.target === "none" || action.target === "enemies") {
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
                effect={effects[c.id]}
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
                effect={effects[c.id]}
                onSelect={() => handlePickTarget(c.id)}
              />
            ))}
          </div>
        </div>

        <CombatLog entries={visualState.log} />

        {isAnimating ? (
          <p className="action-prompt">Resolving…</p>
        ) : (
          actor && (
            <ActionMenu
              actor={actor}
              round={visualState.round}
              pendingActionId={pendingAction?.id ?? null}
              onSelectAction={handleSelectAction}
              onCancel={() => setPendingAction(null)}
            />
          )
        )}
      </div>
    </>
  );
}
