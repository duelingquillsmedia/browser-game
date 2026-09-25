import { computeEvasion, computeResourceMax, getClassResource, type Combatant } from "@eridan/engine";
import { HealthBar } from "./HealthBar";
import { ResourceBar } from "./ResourceBar";
import { CharacterSprite, type SpriteState } from "./CharacterSprite";
import { getPartySprite, getMonsterSprite } from "../game/sprites";
import portraitFrameParty from "../assets/ui/portrait-frame-party.png";
import portraitFrameEnemy from "../assets/ui/portrait-frame-enemy.png";

/** A momentary visual reaction to a combat event, keyed so React replays the animation on every occurrence. */
export interface CombatantEffect {
  kind: "attacking" | "hit" | "heal" | "buff";
  text?: string;
  key: number;
}

function spriteStateFor(combatant: Combatant, effect?: CombatantEffect): SpriteState {
  if (combatant.dead || combatant.hp <= 0) return "die";
  if (effect?.kind === "attacking") return "attack";
  if (effect?.kind === "hit") return "hurt";
  return "idle";
}

export interface CombatantPortraitTileProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  isSelectableTarget: boolean;
  isHovered?: boolean;
  onHoverChange?: (hovering: boolean) => void;
  effect?: CombatantEffect;
  onSelect?: () => void;
}

/** The combatant's portrait/sprite as it appears on the battlefield, facing off against the other side. */
export function CombatantPortraitTile({
  combatant,
  isCurrentTurn,
  isSelectableTarget,
  isHovered,
  onHoverChange,
  effect,
  onSelect,
}: CombatantPortraitTileProps) {
  const isDown = combatant.hp <= 0 || combatant.fled;
  const tileClassNames = [
    "combatant-tile",
    combatant.side,
    isCurrentTurn ? "current-turn" : "",
    isDown ? "down" : "",
    isSelectableTarget ? "selectable" : "",
    isHovered ? "hovered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sprite =
    combatant.side === "party"
      ? getPartySprite(combatant.raceId, combatant.classId)
      : getMonsterSprite(combatant.templateId, combatant.id);
  const portraitClassNames = [
    "combatant-portrait",
    sprite ? "has-sprite" : "",
    effect ? `fx-${effect.kind}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initial = combatant.name.trim().charAt(0).toUpperCase();
  const portraitFrame = combatant.side === "party" ? portraitFrameParty : portraitFrameEnemy;
  const spriteState = spriteStateFor(combatant, effect);

  const content = (
    <div className={portraitClassNames}>
      {sprite ? (
        <CharacterSprite frames={sprite} state={spriteState} />
      ) : (
        <>
          <span className="combatant-initial">{initial}</span>
          <img src={portraitFrame} alt="" />
        </>
      )}
      {effect?.text && (
        <span key={effect.key} className={`floating-text floating-${effect.kind}`}>
          {effect.text}
        </span>
      )}
    </div>
  );

  // Always a <button> (rather than swapping between <button> and <div> depending on
  // isSelectableTarget) so React never has to remount this subtree -- a remount would
  // reset CharacterSprite's animation, e.g. replaying a dead combatant's death pose the
  // next time the player opens a target picker.
  //
  // Non-actionable tiles are marked aria-disabled (not the native `disabled` attribute):
  // a genuinely disabled button stops receiving mouse events in most browsers, which would
  // silently break the hover-to-identify highlight below whenever nothing is targetable.
  return (
    <button
      type="button"
      className={tileClassNames}
      aria-disabled={!isSelectableTarget}
      tabIndex={isSelectableTarget ? undefined : -1}
      onClick={isSelectableTarget ? onSelect : undefined}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
      aria-label={combatant.name}
    >
      {content}
    </button>
  );
}

export interface CombatantInfoPanelProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  isHovered?: boolean;
}

/** The combatant's name, HP bar, evasion and status, shown in the side rail off the battlefield. */
export function CombatantInfoPanel({ combatant, isCurrentTurn, isHovered }: CombatantInfoPanelProps) {
  const isDown = combatant.hp <= 0 || combatant.fled;
  const rowClassNames = [
    "combatant-info-row",
    combatant.side,
    isCurrentTurn ? "current-turn" : "",
    isDown ? "down" : "",
    isHovered ? "hovered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bloodied = combatant.hp > 0 && combatant.hp <= combatant.maxHp / 2;
  const resourceConfig = getClassResource(combatant.classId);
  const resourceMax = computeResourceMax(combatant.abilityScores, combatant.classId ?? "");
  const totalEvasion = Math.round(
    computeEvasion(combatant.abilityScores.dex) + combatant.evasionBonus + combatant.tempEvasionBonus
  );

  let statusTag: string | null = null;
  if (combatant.fled) statusTag = "Fled";
  else if (combatant.dead) statusTag = "Dead";
  else if (combatant.unconscious) statusTag = "Unconscious";
  else if (combatant.hp <= 0) statusTag = "Defeated";

  return (
    <div className={rowClassNames}>
      <div className="combatant-name">
        {combatant.name}
        {combatant.tempEvasionBonus > 0 && <span className="badge">+{combatant.tempEvasionBonus} Evasion</span>}
        {combatant.dodging && <span className="badge">Dodging</span>}
        {bloodied && <span className="badge badge-bloodied">Bloodied</span>}
      </div>
      <HealthBar hp={Math.max(0, combatant.hp)} maxHp={combatant.maxHp} />
      {resourceConfig && resourceMax !== undefined && (
        <ResourceBar
          resourceKey={resourceConfig.key}
          name={resourceConfig.name}
          value={combatant.resource ?? 0}
          max={resourceMax}
        />
      )}
      <div className="combatant-meta">Evasion {totalEvasion}%</div>
      {statusTag && <div className="status-tag">{statusTag}</div>}
    </div>
  );
}
