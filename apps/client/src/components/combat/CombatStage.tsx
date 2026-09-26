import { useLayoutEffect, useRef, useState } from "react";
import { previewAttack, STATUS_EFFECT_DEFS, type Combatant, type CombatActionDef, type CombatState } from "@eridan/engine";
import { CharacterSprite, type SpriteState } from "../CharacterSprite";
import { getPartySprite, getMonsterSprite } from "../../game/sprites";
import { computeStageLayout, schoolColor, statusKindColor, type StageLayout } from "../../game/combatDisplay";
import type { Encounter } from "../../game/lore";
import portraitFrameParty from "../../assets/ui/portrait-frame-party.png";
import portraitFrameEnemy from "../../assets/ui/portrait-frame-enemy.png";

/** A momentary visual reaction to a combat event, keyed so React replays the animation on every occurrence. */
export interface CombatantEffect {
  kind: "attacking" | "hit" | "heal" | "buff";
  text?: string;
  key: number;
}

export interface CombatStageProps {
  state: CombatState;
  encounter: Encounter;
  /** Whoever's turn it is right now, either side -- null once resolution animation finishes moving to the next state, or the fight has ended. */
  currentActor: Combatant | null;
  pendingAction: CombatActionDef | null;
  hoveredEnemyId: string | null;
  onHoverEnemy: (id: string | null) => void;
  areaPreviewIds: Set<string> | null;
  effects: Record<string, CombatantEffect>;
  isSelectable: (c: Combatant) => boolean;
  onPickTarget: (id: string) => void;
}

function spriteStateFor(combatant: Combatant, effect?: CombatantEffect): SpriteState {
  if (combatant.dead || combatant.hp <= 0) return "die";
  if (effect?.kind === "attacking") return "attack";
  if (effect?.kind === "hit") return "hurt";
  return "idle";
}

function UnitArt({
  combatant,
  effect,
  isEnemy,
}: {
  combatant: Combatant;
  effect?: CombatantEffect;
  isEnemy: boolean;
}) {
  const sprite = isEnemy
    ? getMonsterSprite(combatant.templateId, combatant.id)
    : getPartySprite(combatant.raceId, combatant.classId);
  const frame = isEnemy ? portraitFrameEnemy : portraitFrameParty;
  const spriteState = spriteStateFor(combatant, effect);

  return (
    <div className={`cbt-unit-art ${isEnemy ? "cbt-unit-art-enemy" : ""} ${effect ? `cbt-fx-${effect.kind}` : ""}`}>
      {sprite ? (
        <CharacterSprite frames={sprite} state={spriteState} />
      ) : (
        <>
          <span className="cbt-unit-initial">{combatant.name.trim().charAt(0).toUpperCase()}</span>
          <img src={frame} alt="" className="cbt-unit-frame" />
        </>
      )}
      {effect?.text && (
        <span
          key={effect.key}
          className={`cbt-float cbt-float-${effect.kind} ${effect.text.includes("!") ? "cbt-float-crit" : ""}`}
          style={{ left: `${50 + ((effect.key * 37) % 30) - 15}%` }}
        >
          {effect.kind === "hit" && effect.text.includes("!") ? "✦ " : ""}
          {effect.text}
        </span>
      )}
      {effect?.kind === "hit" && <span key={`flash-${effect.key}`} className="cbt-hit-flash" />}
    </div>
  );
}

function HpBar({
  hp,
  maxHp,
  heightPx,
  shieldAmount,
  shieldHeightPx,
  ghostHp,
}: {
  hp: number;
  maxHp: number;
  heightPx: number;
  shieldAmount?: number;
  shieldHeightPx?: number;
  ghostHp?: number;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / maxHp) * 100))}%`;
  return (
    <div className="cbt-hp-track" style={{ height: heightPx }} aria-label={`HP ${hp} of ${maxHp}`}>
      {ghostHp !== undefined && <div className="cbt-hp-ghost" style={{ width: pct(ghostHp) }} />}
      <div className="cbt-hp-fill" style={{ width: pct(hp) }} />
      {shieldAmount !== undefined && shieldAmount > 0 && (
        <div className="cbt-hp-shield" style={{ width: pct(shieldAmount), height: shieldHeightPx }} />
      )}
    </div>
  );
}

function shieldAmountFor(combatant: Combatant): number {
  const ward = combatant.statusEffects.find((e) => e.defId === "ward");
  return ward?.amount ?? 0;
}

interface TargetingPreviewProps {
  state: CombatState;
  actor: Combatant;
  action: CombatActionDef;
  target: Combatant;
}

function TargetingPreviewTooltip({ state, actor, action, target }: TargetingPreviewProps) {
  const preview = previewAttack(state, actor.id, action, target.id);
  const notes: string[] = [];
  if (preview.isLethal) notes.push("LETHAL");
  else if (preview.canKill) notes.push("CAN KILL");
  else if (preview.killsOnCrit) notes.push("KILLS ON CRIT");
  if (preview.hitsCount > 1) notes.push(`HITS ${preview.hitsCount} ENEMIES`);
  if (preview.statusName) notes.push(`${preview.statusName.toUpperCase()} ${preview.statusTurns}`);
  const note = notes.join(" · ");
  const noteIsKillRelated = notes[0] === "LETHAL" || notes[0] === "CAN KILL" || notes[0] === "KILLS ON CRIT";

  return (
    <div className="cbt-preview cbt-preview-left">
      <div className="cbt-preview-skill" style={{ color: schoolColor(action) }}>
        {action.name.toUpperCase()} → {target.name.toUpperCase()}
      </div>
      <div className="cbt-preview-main-row">
        <div className="cbt-preview-main">
          {preview.minDamage}–{preview.maxDamage}
        </div>
        <div className="cbt-preview-unit">DAMAGE</div>
      </div>
      <div className="cbt-preview-grid">
        <div>
          HIT <span>{Math.round(preview.hitChance)}%</span>
        </div>
        <div>
          CRIT <span>{Math.round(preview.critChance)}%</span>
        </div>
      </div>
      {note && (
        <div className="cbt-preview-note" style={{ color: noteIsKillRelated ? "var(--aow-ember)" : "var(--aow-tertiary)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function SelfCastPreview({ action }: { action: CombatActionDef }) {
  return (
    <div className="cbt-preview cbt-preview-self">
      <div className="cbt-preview-skill" style={{ color: schoolColor(action) }}>
        {action.name.toUpperCase()}
      </div>
      <div className="cbt-preview-sub">{action.description}</div>
    </div>
  );
}

export function CombatStage({
  state,
  encounter,
  currentActor,
  pendingAction,
  hoveredEnemyId,
  onHoverEnemy,
  areaPreviewIds,
  effects,
  isSelectable,
  onPickTarget,
}: CombatStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const player = state.combatants.find((c) => c.side === "party")!;
  const enemies = state.combatants.filter((c) => c.side === "enemy");
  // Solo play only (see game/setup.ts's beginEncounter) -- the player is the only possible
  // "ally", so an ally-targeted heal (Mend, Wylde Healing) clicks the player's own portrait
  // exactly like a self-targeted one (Nature's Remedy) does.
  const targetsPlayerPortrait = pendingAction?.target === "self" || pendingAction?.target === "ally";
  const enemyFront = enemies.filter((c) => c.rank === "front");
  const enemyBack = enemies.filter((c) => c.rank === "back");

  const [layout, setLayout] = useState<StageLayout>(() =>
    computeStageLayout(1330, 620, Math.max(1, enemyFront.length), enemyBack.length)
  );

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setLayout(computeStageLayout(el.clientWidth, el.clientHeight, enemyFront.length, enemyBack.length));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyFront.length, enemyBack.length]);

  const isPlayerTurn = currentActor?.side === "party";
  const banner =
    state.status !== "active"
      ? null
      : isPlayerTurn && currentActor
        ? {
            title: "YOUR TURN",
            color: "var(--aow-ember)",
            sub: pendingAction
              ? targetsPlayerPortrait
                ? `Click ${currentActor.name} to cast ${pendingAction.name} · Esc to cancel`
                : `Choose a target for ${pendingAction.name} · Esc to cancel`
              : `${currentActor.ap ?? 0} AP remaining`,
          }
        : currentActor
          ? { title: "ENEMY TURN", color: "var(--aow-hp)", sub: currentActor.name }
          : null;

  const playerSelectable = targetsPlayerPortrait && isSelectable(player);
  const playerIsDown = player.hp <= 0 || player.fled;
  const playerActing = currentActor?.id === player.id && !playerIsDown;

  function renderEnemy(combatant: Combatant) {
    const isDown = combatant.hp <= 0 || combatant.dead || combatant.fled;
    const acting = currentActor?.id === combatant.id;
    const inAoe = areaPreviewIds?.has(combatant.id) ?? false;
    const targetable = isSelectable(combatant);
    const hovered = hoveredEnemyId === combatant.id;
    const showPreview = hovered && targetable && pendingAction && currentActor && !isDown;

    let ghostHp: number | undefined;
    if (inAoe && pendingAction && currentActor) {
      const worstCase = previewAttack(state, currentActor.id, pendingAction, combatant.id).maxDamage;
      ghostHp = Math.max(0, combatant.hp - worstCase);
    }

    const ringGlow = acting
      ? "0 0 0 1px var(--aow-hp), 0 0 22px rgba(208,96,74,.55)"
      : inAoe
        ? "0 0 0 1px var(--aow-ember), 0 0 24px rgba(224,138,114,.5)"
        : "none";
    const plateBorder = acting
      ? "rgba(208,96,74,.7)"
      : inAoe
        ? "rgba(224,138,114,.55)"
        : "var(--aow-panel-border)";

    return (
      <div key={combatant.id} className="cbt-enemy-unit">
        <div
          className={`cbt-unit-box${isDown ? " cbt-down" : ""}`}
          style={{ width: layout.unitSize, height: layout.unitSize, boxShadow: ringGlow }}
        >
          <UnitArt combatant={combatant} effect={effects[combatant.id]} isEnemy />
          {acting && <div className="cbt-acting-marker" />}
          {isDown && (
            <div className="cbt-slain-overlay">{combatant.fled ? "FLED" : "SLAIN"}</div>
          )}
          {targetable && !isDown && (
            <button
              type="button"
              className="cbt-target-overlay"
              style={{
                borderColor: inAoe ? "var(--aow-ember)" : "rgba(224,138,114,.45)",
                background: inAoe ? "rgba(224,138,114,.12)" : "rgba(224,138,114,.03)",
              }}
              onMouseEnter={() => onHoverEnemy(combatant.id)}
              onMouseLeave={() => onHoverEnemy(null)}
              onClick={() => onPickTarget(combatant.id)}
              aria-label={`Target ${combatant.name}`}
            />
          )}
          {showPreview && (
            <TargetingPreviewTooltip state={state} actor={currentActor!} action={pendingAction!} target={combatant} />
          )}
        </div>
        <div className="cbt-nameplate" style={{ width: layout.plateWidth, borderColor: plateBorder }}>
          <div className="cbt-nameplate-row">
            <div className="cbt-nameplate-name" style={{ color: isDown ? "var(--aow-disabled)" : "var(--aow-ink)" }}>
              {combatant.name}
            </div>
            {combatant.level !== undefined && <div className="cbt-nameplate-lv">LV {combatant.level}</div>}
          </div>
          <HpBar hp={combatant.hp} maxHp={combatant.maxHp} heightPx={5} ghostHp={ghostHp} />
          <div className="cbt-nameplate-row cbt-nameplate-bottom">
            <div className="cbt-status-chip-row">
              {combatant.statusEffects.map((e) => {
                const def = STATUS_EFFECT_DEFS[e.defId];
                const color = statusKindColor(def.kind);
                return (
                  <span key={e.defId} className="cbt-status-chip" style={{ borderColor: color, color }} title={def.description}>
                    {e.turnsRemaining}
                  </span>
                );
              })}
            </div>
            <div className="cbt-nameplate-hp-text">
              {Math.max(0, combatant.hp)}/{combatant.maxHp}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="cbt-stage" ref={stageRef}>
      <div className="cbt-stage-bg" style={{ backgroundImage: `url(${encounter.backgroundImage})` }} />
      <div className="cbt-stage-scrim" />
      <div className="cbt-stage-floor-glow" />

      {banner && (
        <div className="cbt-turn-banner">
          <div className="cbt-turn-banner-title" style={{ color: banner.color, textShadow: `0 0 14px ${banner.color}` }}>
            {banner.title}
          </div>
          <div className="cbt-turn-banner-sub">{banner.sub}</div>
        </div>
      )}

      <div className="cbt-stage-grid">
        <div className="cbt-player-column">
          <div
            className={`cbt-unit-box cbt-player-box${playerIsDown ? " cbt-down" : ""}`}
            style={{
              width: layout.playerWidth,
              height: layout.playerHeight,
              boxShadow: playerActing
                ? "0 0 0 1px var(--aow-hp), 0 0 22px rgba(208,96,74,.55)"
                : targetsPlayerPortrait
                  ? "0 0 0 1px var(--aow-mana), 0 0 28px rgba(95,196,214,.45)"
                  : "none",
            }}
          >
            <UnitArt combatant={player} effect={effects[player.id]} isEnemy={false} />
            {playerActing && <div className="cbt-acting-marker" />}
            {playerIsDown && <div className="cbt-slain-overlay">{player.fled ? "FLED" : "DOWN"}</div>}
            {playerSelectable && (
              <button
                type="button"
                className="cbt-target-overlay cbt-target-overlay-self"
                onClick={() => onPickTarget(player.id)}
                aria-label={`Cast on ${player.name}`}
              />
            )}
            {playerSelectable && pendingAction && <SelfCastPreview action={pendingAction} />}
          </div>
          <div className="cbt-nameplate cbt-player-nameplate">
            <div className="cbt-nameplate-row">
              <div className="cbt-nameplate-name">{player.name}</div>
              <div className="cbt-nameplate-lv">LV {player.level ?? "?"}</div>
            </div>
            <HpBar hp={player.hp} maxHp={player.maxHp} heightPx={6} shieldAmount={shieldAmountFor(player)} shieldHeightPx={2} />
          </div>
        </div>

        <div className="cbt-enemy-region" style={{ flexDirection: layout.outerDir, gap: layout.outerGap }}>
          {enemyBack.length > 0 && (
            <div
              className="cbt-enemy-rank"
              style={{
                flexDirection: layout.innerDir,
                gap: layout.innerGap,
                margin: layout.rows ? "0 0 0 14%" : "0 0 44px 0",
              }}
            >
              {enemyBack.map(renderEnemy)}
            </div>
          )}
          <div className="cbt-enemy-rank" style={{ flexDirection: layout.innerDir, gap: layout.innerGap }}>
            {enemyFront.map(renderEnemy)}
          </div>
        </div>
      </div>
    </main>
  );
}
