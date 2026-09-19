import type { Combatant } from "@eridan/engine";
import { HealthBar } from "./HealthBar";
import { CharacterSprite, type SpriteState } from "./CharacterSprite";
import { getPartySprite } from "../game/sprites";
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
  effect?: CombatantEffect;
  onSelect?: () => void;
}

/** The combatant's portrait/sprite as it appears on the battlefield, facing off against the other side. */
export function CombatantPortraitTile({
  combatant,
  isCurrentTurn,
  isSelectableTarget,
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
  ]
    .filter(Boolean)
    .join(" ");

  const sprite = combatant.side === "party" ? getPartySprite(combatant.raceId, combatant.classId) : undefined;
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

  if (isSelectableTarget && onSelect) {
    return (
      <button type="button" className={tileClassNames} onClick={onSelect} aria-label={combatant.name}>
        {content}
      </button>
    );
  }

  return <div className={tileClassNames}>{content}</div>;
}

export interface CombatantInfoPanelProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
}

/** The combatant's name, HP bar, AC and status, shown in the side rail off the battlefield. */
export function CombatantInfoPanel({ combatant, isCurrentTurn }: CombatantInfoPanelProps) {
  const isDown = combatant.hp <= 0 || combatant.fled;
  const rowClassNames = [
    "combatant-info-row",
    combatant.side,
    isCurrentTurn ? "current-turn" : "",
    isDown ? "down" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bloodied = combatant.hp > 0 && combatant.hp <= combatant.maxHp / 2;

  let statusTag: string | null = null;
  if (combatant.fled) statusTag = "Fled";
  else if (combatant.dead) statusTag = "Dead";
  else if (combatant.unconscious) statusTag = "Unconscious";
  else if (combatant.hp <= 0) statusTag = "Defeated";

  return (
    <div className={rowClassNames}>
      <div className="combatant-name">
        {combatant.name}
        {combatant.tempArmorClassBonus > 0 && <span className="badge">+{combatant.tempArmorClassBonus} AC</span>}
        {combatant.dodging && <span className="badge">Dodging</span>}
        {bloodied && <span className="badge badge-bloodied">Bloodied</span>}
      </div>
      <HealthBar hp={Math.max(0, combatant.hp)} maxHp={combatant.maxHp} />
      <div className="combatant-meta">AC {combatant.armorClass + combatant.tempArmorClassBonus}</div>
      {statusTag && <div className="status-tag">{statusTag}</div>}
    </div>
  );
}
