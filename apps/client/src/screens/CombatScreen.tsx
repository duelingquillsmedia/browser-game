import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  ACTION_BAR_SLOT_COUNT,
  computeResourceMax,
  currentCombatant,
  fleeChancePercent,
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
import { buildActionBarSlots, effectiveActionBarIds, getBasicAttackVariants } from "../game/actionBar";
import type { Encounter } from "../game/lore";
import type { CombatResult } from "../game/setup";
// Combat, like Title and Character Creation, renders outside <GameShell> (a full letterboxed
// canvas, not a screen with the left nav) -- so it imports the shared design tokens directly
// rather than relying on GameShell having already loaded them first.
import "../theme/aow-theme.css";
import "./CombatScreen.css";

export interface CombatScreenProps {
  combat: CombatState;
  encounter: Encounter;
  /** The party member's Skills-page action bar arrangement -- see game/actionBar.ts. Undefined only pre-migration; treated as all-empty (falls back to a computed default). */
  actionBarIds: (string | null)[] | undefined;
  onSubmitAction: (request: ActionRequest) => void;
  /** XP/level-up/new-ability outcome of this fight, computed by the parent once `combat.status !== "active"`; null while the fight is still active. Shown directly in the result popup. */
  combatResult: CombatResult | null;
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
    if (entry.kind === "resource-gain" && c.resource !== undefined) {
      const max = computeResourceMax(c.abilityScores, c.classId ?? "", c.level ?? 1);
      const raised = c.resource + entry.amount!;
      return { ...c, resource: max !== undefined ? Math.min(max, raised) : raised };
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
  } else if (entry.actorId && entry.kind === "buff") {
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
  } else if (entry.targetId && entry.kind === "resource-gain") {
    effects[entry.targetId] = { kind: "resource", text: `+${entry.amount}`, key: keyBase + 1 };
  }

  return effects;
}

/**
 * `scale = min(innerWidth/1600, innerHeight/900)` -- the handoff's own "contain" letterbox
 * formula, recomputed on resize. This is the *full*-viewport scale (not reduced for the mobile
 * dock below) -- the dock now overlays the bottom of a full-size artboard rather than shrinking
 * it, with the artboard shifted up (see `dockHeight`'s use on the artboard's `top` below) so the
 * combatants -- who sit right at the stage's own bottom edge, not floating mid-frame -- clear the
 * dock instead of rendering behind it. The trade explicitly asked for: some of the upper
 * background (sky, header) crops off-screen so the battlefield itself can render bigger.
 */
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

/** Tracks a element's real rendered height (0 while unmounted/unset), via ResizeObserver. */
function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setHeight(entries[0].contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return height;
}

export function CombatScreen({ combat, encounter, actionBarIds, onSubmitAction, combatResult, onContinue }: CombatScreenProps) {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const dockHeight = useElementHeight(dockRef);
  // Desktop/mouse-only experiment (see .cbt-hud-overlay-wrap's `pointer: fine` rule): the
  // in-artboard HUD overlays the bottom of the stage instead of claiming its own grid row, so
  // the battlefield itself renders taller. Measuring its real height (in the same 1600x900
  // virtual-canvas units as everything else inside `.cbt-artboard`, since ResizeObserver reports
  // layout size, not the scaled paint size) lets the stage reserve exactly that much extra bottom
  // padding -- shifting the combatants up to clear the overlay rather than vanishing behind it.
  const hudOverlayRef = useRef<HTMLDivElement | null>(null);
  const hudOverlayHeight = useElementHeight(hudOverlayRef);
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
    // the action's own animation, so a cooldown or a buff's evasion bump
    // reads as applied the instant the ability fires rather than lagging
    // behind it. HP -- and the death/flee state that's visually derived from
    // it (`isDown` below checks `hp <= 0`, not these flags) -- keeps
    // animating step by step via `applyEventToWorkingState`, since those
    // correspond to actual narrated hit/heal events.
    //
    // Resource is split into two deferred pieces instead, both held back
    // from this eager adoption and added back in step like HP:
    //  - A "resource-gain" entry (Warrior's Furious, so far) is its own
    //    narrated event -- it fires on the specific hit that triggered it,
    //    not "whenever the enemy's turn starts".
    //  - The resource cost of the party member's own action (every other
    //    class's resource gain too, from landing their own Basic Attack) has
    //    no log entry of its own, but it always lands on this batch's very
    //    first entry -- `submitPlayerAction` resolves the actor's action
    //    before any enemy turn ever gets a chance to run. Diffing the
    //    party member's final resource against their prior value, minus
    //    whatever's already accounted for by a `resource-gain` entry later
    //    in the same batch, isolates exactly that cost/gain so it can be
    //    held back the same way and applied at step 0 -- in lockstep with
    //    the ability's own cast animation instead of jumping ahead of it.
    const pendingResourceGain = new Map<string, number>();
    for (const entry of newEntries) {
      if (entry.kind === "resource-gain" && entry.targetId && entry.amount !== undefined) {
        pendingResourceGain.set(entry.targetId, (pendingResourceGain.get(entry.targetId) ?? 0) + entry.amount);
      }
    }
    const actor = combat.combatants.find((c) => c.side === "party");
    const actorPrior = actor ? visualState.combatants.find((v) => v.id === actor.id) : undefined;
    const actorDeferredDelta =
      actor && actorPrior && actor.resource !== undefined && actorPrior.resource !== undefined
        ? actor.resource - actorPrior.resource - (pendingResourceGain.get(actor.id) ?? 0)
        : 0;

    let working: CombatState = {
      ...combat,
      combatants: combat.combatants.map((c) => {
        const prior = visualState.combatants.find((v) => v.id === c.id);
        if (!prior) return c;
        const held = (pendingResourceGain.get(c.id) ?? 0) + (c.id === actor?.id ? actorDeferredDelta : 0);
        return {
          ...c,
          hp: prior.hp,
          dead: prior.dead,
          unconscious: prior.unconscious,
          fled: prior.fled,
          resource: c.resource !== undefined ? c.resource - held : c.resource,
        };
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
      if (i === 0 && actorDeferredDelta !== 0 && actor) {
        working = {
          ...working,
          combatants: working.combatants.map((c) =>
            c.id === actor.id && c.resource !== undefined ? { ...c, resource: c.resource + actorDeferredDelta } : c
          ),
        };
      }
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

  // The Skills page's own action-bar arrangement drives what shows here too --
  // see game/actionBar.ts. Resolved once per render since both the HUD and the
  // keyboard shortcuts below need the same slot contents.
  const actionBarSlots = buildActionBarSlots(effectiveActionBarIds(actionBarIds, player.actions), player.actions);

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
    // "none" (Flee, End Turn) and "enemies" (a full-team nuke) actions have nothing sensible
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
      if (e.key >= "1" && e.key <= String(ACTION_BAR_SLOT_COUNT)) {
        const slot = actionBarSlots[Number(e.key) - 1];
        if (!slot || slot.kind === "empty") return;
        handleSelectAction(slot.action);
      } else if (e.key.toLowerCase() === "q") {
        const { melee } = getBasicAttackVariants(currentActor.actions);
        if (melee) handleSelectAction(melee);
      } else if (e.key.toLowerCase() === "e") {
        const { ranged } = getBasicAttackVariants(currentActor.actions);
        if (ranged) handleSelectAction(ranged);
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
      <div className="cbt-rotate-prompt">
        <span className="cbt-rotate-glyph">⟳</span>
        <p>Rotate your device to landscape to continue the battle.</p>
      </div>
      {/*
       * The desktop header (encounter name, turn order strip, round, flee) lives inside
       * `.cbt-artboard` and is entirely cropped off-screen on mobile -- the shift that clears the
       * combatants from behind `.cbt-hud-dock` (see the artboard's `top` below) moves up further
       * than the header's own height. This real-pixel bar floats over the top of the (now cropped)
       * battlefield with just the two pieces of that header actually needed mid-fight: the round
       * counter and the flee button. CSS shows it only under `pointer: coarse`.
       */}
      {(visualState.status === "active" || isAnimating) && (
        <div className="cbt-mobile-topbar">
          <div className="cbt-mobile-round">
            <span className="cbt-mobile-round-label">ROUND</span>
            <span className="cbt-mobile-round-value">{visualState.round}</span>
          </div>
          <button type="button" className="cbt-flee-button" disabled={!canAct} onClick={handleFlee}>
            FLEE <span className="cbt-flee-chance">{fleeChancePercent(player)}%</span>
          </button>
        </div>
      )}
      <div
        className="cbt-artboard"
        style={
          {
            top: `calc(50% - ${dockHeight}px)`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            "--cbt-overlay-hud-h": `${hudOverlayHeight}px`,
          } as CSSProperties
        }
      >
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
        <div className="cbt-hud-overlay-wrap" ref={hudOverlayRef}>
          <CombatHud
            state={visualState}
            player={player}
            slots={actionBarSlots}
            hoveredActionId={hoveredActionId}
            pendingAction={pendingAction}
            canAct={!!canAct}
            onHoverAction={setHoveredActionId}
            onSelectAction={handleSelectAction}
            onEndTurn={handleEndTurn}
          />
        </div>
        {visualState.status !== "active" && !isAnimating && (
          <CombatResultOverlay
            status={visualState.status}
            round={visualState.round}
            xpGained={combatResult?.xpGained ?? 0}
            goldGained={combatResult?.goldGained ?? 0}
            levelsGained={combatResult?.levelsGained ?? 0}
            newLevel={combatResult?.character.level ?? 0}
            newlyUnlockedActions={combatResult?.newlyUnlockedActions ?? []}
            onContinue={() => onContinue?.()}
          />
        )}
      </div>
      {/*
       * `.cbt-artboard` is scaled as a single 1600x900 unit (see `scale` above), so any CSS size
       * bump inside it (e.g. a bigger skill-slot) shrinks right back down on a short phone
       * viewport. On touch devices this second HUD instance renders outside that transform, in
       * real unscaled screen pixels, as a fixed overlay on the bottom of the (now full-size,
       * shifted-up-and-cropped) battlefield instead of being squeezed inside it. CSS shows only
       * one instance at a time (`pointer: coarse`).
       */}
      {(visualState.status === "active" || isAnimating) && (
        <div className="cbt-hud-dock" ref={dockRef}>
          <CombatHud
            state={visualState}
            player={player}
            slots={actionBarSlots}
            hoveredActionId={hoveredActionId}
            pendingAction={pendingAction}
            canAct={!!canAct}
            onHoverAction={setHoveredActionId}
            onSelectAction={handleSelectAction}
            onEndTurn={handleEndTurn}
          />
        </div>
      )}
    </div>
  );
}
