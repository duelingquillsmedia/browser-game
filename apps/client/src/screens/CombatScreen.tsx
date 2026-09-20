import { useEffect, useRef, useState } from "react";
import type { ActionRequest, CombatActionDef, CombatLogEntry, CombatState } from "@eridan/engine";
import { currentCombatant, isTargetable, type Combatant } from "@eridan/engine";
import { CombatantPortraitTile, CombatantInfoPanel, type CombatantEffect } from "../components/CombatantCard";
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
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);
  // Starts from each combatant's pre-fight HP and an empty log, rather than the fully
  // resolved state `combat` already carries on mount -- otherwise a bad initiative roll
  // (enemies acting, and possibly winning, before the player's first turn) would already
  // be baked in, and the player would never see it play out.
  const [visualState, setVisualState] = useState<CombatState>(() => ({
    ...combat,
    combatants: combat.combatants.map((c) => ({
      ...c,
      hp: combat.initialHp[c.id] ?? c.hp,
      unconscious: false,
      dead: false,
      fled: false,
      dodging: false,
      tempArmorClassBonus: 0,
    })),
    log: [],
  }));
  const [isAnimating, setIsAnimating] = useState(false);
  const [effects, setEffects] = useState<Record<string, CombatantEffect>>({});
  const revealedRef = useRef(0);
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
      // Nothing new to animate -- just sync straight to the authoritative state.
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

  function isSelectable(combatant: Combatant): boolean {
    if (!pendingAction || !isTargetable(combatant)) return false;
    if (pendingAction.target === "enemy") return combatant.side === "enemy";
    if (pendingAction.target === "ally") return combatant.side === "party";
    return false;
  }

  return (
    <>
      <LocationBackdrop image={encounter.backgroundImage} />
      <div className="screen combat-screen">
        <h1>{encounter.name}</h1>
        <p className="subtitle">{encounter.location}</p>

        <div className="battlefield">
          <div className="battlefield-rail party-rail">
            {party.map((c) => (
              <CombatantInfoPanel key={c.id} combatant={c} isCurrentTurn={actor?.id === c.id} />
            ))}
          </div>

          <div className="battlefield-arena">
            <div className="arena-party">
              {party.map((c) => (
                <CombatantPortraitTile
                  key={c.id}
                  combatant={c}
                  isCurrentTurn={actor?.id === c.id}
                  isSelectableTarget={isSelectable(c)}
                  effect={effects[c.id]}
                  onSelect={() => handlePickTarget(c.id)}
                />
              ))}
            </div>
            <div className="arena-enemy">
              {enemies.map((c) => (
                <CombatantPortraitTile
                  key={c.id}
                  combatant={c}
                  isCurrentTurn={actor?.id === c.id}
                  isSelectableTarget={isSelectable(c)}
                  isHovered={hoveredEnemyId === c.id}
                  onHoverChange={(hovering) => setHoveredEnemyId(hovering ? c.id : null)}
                  effect={effects[c.id]}
                  onSelect={() => handlePickTarget(c.id)}
                />
              ))}
            </div>
          </div>

          <div className="battlefield-rail enemy-rail">
            {enemies.map((c) => (
              <CombatantInfoPanel
                key={c.id}
                combatant={c}
                isCurrentTurn={actor?.id === c.id}
                isHovered={hoveredEnemyId === c.id}
              />
            ))}
          </div>
        </div>

        <CombatLog entries={visualState.log} />

        {isAnimating ? (
          <div className="ability-bar ability-bar-targeting">
            <p className="action-prompt">Resolving…</p>
          </div>
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
