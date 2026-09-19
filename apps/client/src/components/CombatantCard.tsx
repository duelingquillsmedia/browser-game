import type { Combatant } from "@eridan/engine";
import { HealthBar } from "./HealthBar";
import portraitFrameParty from "../assets/ui/portrait-frame-party.png";
import portraitFrameEnemy from "../assets/ui/portrait-frame-enemy.png";

export interface CombatantCardProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  isSelectableTarget: boolean;
  onSelect?: () => void;
}

export function CombatantCard({ combatant, isCurrentTurn, isSelectableTarget, onSelect }: CombatantCardProps) {
  const isDown = combatant.hp <= 0 || combatant.fled;
  const classNames = [
    "combatant-card",
    combatant.side,
    isCurrentTurn ? "current-turn" : "",
    isDown ? "down" : "",
    isSelectableTarget ? "selectable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initial = combatant.name.trim().charAt(0).toUpperCase();
  const portraitFrame = combatant.side === "party" ? portraitFrameParty : portraitFrameEnemy;
  const bloodied = combatant.hp > 0 && combatant.hp <= combatant.maxHp / 2;

  let statusTag: string | null = null;
  if (combatant.fled) statusTag = "Fled";
  else if (combatant.dead) statusTag = "Dead";
  else if (combatant.unconscious) statusTag = combatant.stable ? "Stable (Unconscious)" : "Unconscious — Dying";
  else if (combatant.hp <= 0) statusTag = "Defeated";

  const content = (
    <>
      <div className="combatant-portrait">
        <span className="combatant-initial">{initial}</span>
        <img src={portraitFrame} alt="" />
      </div>
      <div className="combatant-info">
        <div className="combatant-name">
          {combatant.name}
          {combatant.tempArmorClassBonus > 0 && <span className="badge">+{combatant.tempArmorClassBonus} AC</span>}
          {combatant.dodging && <span className="badge">Dodging</span>}
          {bloodied && <span className="badge badge-bloodied">Bloodied</span>}
        </div>
        <HealthBar hp={Math.max(0, combatant.hp)} maxHp={combatant.maxHp} />
        <div className="combatant-meta">AC {combatant.armorClass + combatant.tempArmorClassBonus}</div>
        {combatant.unconscious && !combatant.stable && !combatant.dead && (
          <div className="combatant-meta">
            Death saves: {combatant.deathSaveSuccesses} success{combatant.deathSaveSuccesses === 1 ? "" : "es"}, {" "}
            {combatant.deathSaveFailures} failure{combatant.deathSaveFailures === 1 ? "" : "s"}
          </div>
        )}
        {statusTag && <div className="status-tag">{statusTag}</div>}
      </div>
    </>
  );

  if (isSelectableTarget && onSelect) {
    return (
      <button type="button" className={classNames} onClick={onSelect}>
        {content}
      </button>
    );
  }

  return <div className={classNames}>{content}</div>;
}
