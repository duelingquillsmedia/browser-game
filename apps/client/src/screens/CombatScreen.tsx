import { useEffect, useRef, useState } from "react";
import {
  currentCombatant,
  isTargetable,
  previewTargetsForShape,
  type ActionRequest,
  type Combatant,
  type CombatActionDef,
  type CombatLogEntry,
  type CombatState,
} from "@eridan/engine";
import { CombatHeader } from "../components/combat/CombatHeader";
import { CombatStage, type CombatantEffect } from "../components/combat/CombatStage";
import { CombatHud } from "../components/combat/CombatHud";
import { CombatResultOverlay } from "../components/combat/CombatResultOverlay";
import type { Encounter } from "../game/lore";
// Combat, like Title and Character Creation, renders outside <GameShell> (a full letterboxed
// canvas, not a screen with the left nav) -- so it imports the shared design tokens directly
// rather than relying on GameShell having already loaded them first.
import "../theme/aow-theme.css";
import "./CombatScreen.css";

export interface CombatScreenProps {
  combat: CombatState;
  encounter: Encounter;
  onSubmitAction: (request: ActionRequest) => void;
  /** Called when the player clicks Continue after a finished fight, once they're done reviewing the battlefield and log. */
  onContinue?: () => void;
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

/** `scale = min(innerWidth/1600, innerHeight/900)` -- the handoff's own "contain" letterbox formula, recomputed on resize. */
function useCanvasScale(): number {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / 1600, window.innerHeight / 900));
  useEffect(() => {
    function measure() {
      setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return scale;
}

export function CombatScreen({ combat, encounter, onSubmitAction, onContinue }: CombatScreenProps) {
  const scale = useCanvasScale();
  const [pendingAction, setPendingAction] = useState<CombatActionDef | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
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
      tempEvasionBonus: 0,
      ap: c.apMax,
      statusEffects: [],
    })),
    log: [],
  }));
  const [isAnimating, setIsAnimating] = useState(false);
  const [effects, setEffects] = useState<Record<string, CombatantEffect>>({});
  const revealedRef = useRef(0);
  const effectKeyRef = useRef(0);

  useEffect(() => {
    if (combat.log.length <= revealedRef.current) {
      // Nothing new to animate -- just sync straight to the authoritative state.
      setVisualState(combat);
      revealedRef.current = combat.log.length;
      return;
    }

    const newEntries = combat.log.slice(revealedRef.current);
    const startIndex = revealedRef.current;

    // No log entry carries a "resource/AP is now X" delta, so these fields
    // would otherwise only ever catch up once the *entire* batch below has
    // finished playing -- which can span several trailing enemy turns after
    // the player's own action. Adopt them immediately instead, in step with
    // the action's own animation, so a resource/AP cost (or a cooldown, or a
    // buff's evasion bump) reads as spent the instant the ability fires
    // rather than lagging behind it. HP -- and the death/flee state that's
    // visually derived from it (`isDown` below checks `hp <= 0`, not these
    // flags) -- keeps animating step by step via `applyEventToWorkingState`,
    // since those correspond to actual narrated hit/heal events.
    let working: CombatState = {
      ...combat,
      combatants: combat.combatants.map((c) => {
        const prior = visualState.combatants.find((v) => v.id === c.id);
        return prior ? { ...c, hp: prior.hp, dead: prior.dead, unconscious: prior.unconscious, fled: prior.fled } : c;
      }),
      log: visualState.log,
    };
    setVisualState(working);

    let cancelled = false;

    setIsAnimating(true);

    function playStep(i: number) {
      if (cancelled) return;
      if (i >= newEntries.length) {
        setVisualState(combat);
        revealedRef.current = combat.log.length;
        setEffects({});
        setIsAnimating(false);
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

  // Whoever's turn it is right now, either side -- distinct from `canAct` below, which is
  // only true when it's actually the human player's own turn (for gating the skill bar,
  // End Turn, Flee, and keyboard shortcuts). Solo play only, so there's exactly one party member.
  const currentActor = !isAnimating && visualState.status === "active" ? currentCombatant(visualState) : null;
  const player = visualState.combatants.find((c) => c.side === "party")!;
  const canAct = currentActor?.side === "party";

  // For a line/area attack, hovering one enemy previews every enemy it will
  // actually hit -- computed via the same resolution the engine itself uses.
  const areaPreviewIds =
    pendingAction && (pendingAction.targetShape === "line" || pendingAction.targetShape === "area") && hoveredEnemyId
      ? new Set(previewTargetsForShape(visualState, pendingAction, hoveredEnemyId))
      : null;

  function handleSelectAction(action: CombatActionDef) {
    if (pendingAction?.id === action.id) {
      setPendingAction(null);
      return;
    }
    // "none" (Defend, Flee) and "enemies" (a full-team nuke) actions have nothing sensible
    // to click as a target, so they fire immediately; "self" now arms and waits for a click
    // on the player's own portrait, matching the handoff's exact self-cast interaction.
    if (action.target === "none" || action.target === "enemies") {
      onSubmitAction({ actorId: currentActor!.id, actionId: action.id });
      return;
    }
    setPendingAction(action);
  }

  function handlePickTarget(targetId: string) {
    if (!pendingAction || !currentActor) return;
    onSubmitAction({ actorId: currentActor.id, actionId: pendingAction.id, targetId });
    setPendingAction(null);
  }

  function isSelectable(combatant: Combatant): boolean {
    if (!pendingAction || !isTargetable(combatant)) return false;
    if (pendingAction.target === "enemy") return combatant.side === "enemy";
    if (pendingAction.target === "ally") return combatant.side === "party";
    if (pendingAction.target === "self") return combatant.side === "party";
    return false;
  }

  function handleEndTurn() {
    if (!canAct || !currentActor) return;
    const endTurnAction = currentActor.actions.find((a) => a.kind === "endTurn");
    if (endTurnAction) onSubmitAction({ actorId: currentActor.id, actionId: endTurnAction.id });
  }

  function handleFlee() {
    if (!canAct || !currentActor) return;
    const fleeAction = currentActor.actions.find((a) => a.kind === "flee");
    if (fleeAction) onSubmitAction({ actorId: currentActor.id, actionId: fleeAction.id });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!canAct || !currentActor) return;
      if (e.key >= "1" && e.key <= "9") {
        const skillActions = currentActor.actions.filter((a) => a.kind !== "flee" && a.kind !== "endTurn");
        const action = skillActions[Number(e.key) - 1];
        if (action) handleSelectAction(action);
      } else if (e.key === "Escape") {
        setPendingAction(null);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleEndTurn();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Re-subscribes each render so the listener always closes over the latest actor/pendingAction --
    // a cheap trade for a global keydown listener, simpler than threading everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <div className="cbt-letterbox">
      <div className="cbt-artboard" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <CombatHeader state={visualState} encounter={encounter} player={player} canAct={!!canAct} onFlee={handleFlee} />
        <CombatStage
          state={visualState}
          encounter={encounter}
          currentActor={currentActor}
          pendingAction={pendingAction}
          hoveredEnemyId={hoveredEnemyId}
          onHoverEnemy={setHoveredEnemyId}
          areaPreviewIds={areaPreviewIds}
          effects={effects}
          isSelectable={isSelectable}
          onPickTarget={handlePickTarget}
        />
        <CombatHud
          state={visualState}
          player={player}
          hoveredActionId={hoveredActionId}
          pendingAction={pendingAction}
          canAct={!!canAct}
          onHoverAction={setHoveredActionId}
          onSelectAction={handleSelectAction}
          onEndTurn={handleEndTurn}
        />
        {visualState.status !== "active" && !isAnimating && (
          <CombatResultOverlay status={visualState.status} round={visualState.round} onContinue={() => onContinue?.()} />
        )}
      </div>
    </div>
  );
}
