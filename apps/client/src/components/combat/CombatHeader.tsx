import { fleeChancePercent, type Combatant, type CombatState } from "@eridan/engine";
import { buildTurnOrderStrip } from "../../game/combatDisplay";
import type { Encounter } from "../../game/lore";

export interface CombatHeaderProps {
  state: CombatState;
  encounter: Encounter;
  /** The (solo) party member -- flee odds are always shown for them, whether or not it's currently their turn. */
  player: Combatant;
  /** True only on the player's own turn, once any resolution animation has finished. */
  canAct: boolean;
  onFlee: () => void;
}

export function CombatHeader({ state, encounter, player, canAct, onFlee }: CombatHeaderProps) {
  const chips = buildTurnOrderStrip(state);

  return (
    <header className="cbt-header">
      <div className="cbt-header-title">
        <div className="cbt-eyebrow">ENCOUNTER · {encounter.location.toUpperCase()}</div>
        <div className="cbt-title">{encounter.name}</div>
      </div>

      <div className="cbt-turn-strip">
        <div className="cbt-turn-strip-label">TURN ORDER</div>
        {chips.map((chip) =>
          chip.isDivider ? (
            <div key={chip.key} className="cbt-turn-divider">
              <div className="cbt-turn-divider-rule" />
              <div className="cbt-turn-divider-label">R{chip.round}</div>
              <div className="cbt-turn-divider-rule" />
            </div>
          ) : (
            <div
              key={chip.key}
              title={chip.name}
              className="cbt-turn-chip"
              style={{
                width: chip.size,
                height: chip.size,
                borderColor: chip.color,
                color: chip.color,
                boxShadow: chip.glow,
                opacity: chip.opacity,
              }}
            >
              {chip.tag}
            </div>
          )
        )}
      </div>

      <div className="cbt-header-right">
        <div className="cbt-round-readout">
          <div className="cbt-round-label">ROUND</div>
          <div className="cbt-round-value">{state.round}</div>
        </div>
        <button type="button" className="cbt-flee-button" disabled={!canAct} onClick={onFlee}>
          FLEE <span className="cbt-flee-chance">{fleeChancePercent(player)}%</span>
        </button>
      </div>
    </header>
  );
}
