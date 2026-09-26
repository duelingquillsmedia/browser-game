import type { CombatActionDef, CombatStatus } from "@eridan/engine";

export interface CombatResultOverlayProps {
  status: Exclude<CombatStatus, "active">;
  round: number;
  /** XP actually awarded (post race-bonus); 0 on a defeat or a flee -- see game/setup.ts's applyCombatResults. */
  xpGained: number;
  levelsGained: number;
  newLevel: number;
  newlyUnlockedActions: CombatActionDef[];
  onContinue: () => void;
}

const RESULT_COPY: Record<Exclude<CombatStatus, "active">, { title: string; color: string; sub: string }> = {
  party_won: {
    title: "VICTORY",
    color: "var(--aow-gold)",
    sub: "Victory! Review the battle, then continue whenever you're ready.",
  },
  enemies_won: {
    title: "DEFEAT",
    color: "var(--aow-hp)",
    sub: "Defeated. Review the battle, then continue whenever you're ready.",
  },
  party_fled: {
    title: "ESCAPED",
    color: "var(--aow-frost)",
    sub: "You escaped. Review the battle, then continue whenever you're ready.",
  },
};

/**
 * The handoff's "RESTART ENCOUNTER" concept becomes "Continue" here: our
 * game moves on to Home rather than restarting the fight, so the button is
 * restyled to match, not renamed to match a flow this game doesn't have.
 *
 * This is also the only post-fight screen -- there used to be a second,
 * full-page ResultScreen shown after clicking Continue here, but a rewards
 * popup and a rewards page one click apart was a redundant, jarring extra
 * step; XP/level-up/new-ability info now lives here instead, in the same
 * dimmed-battlefield popup, and clicking Continue goes straight to Home.
 */
export function CombatResultOverlay({
  status,
  round,
  xpGained,
  levelsGained,
  newLevel,
  newlyUnlockedActions,
  onContinue,
}: CombatResultOverlayProps) {
  const copy = RESULT_COPY[status];
  return (
    <div className="cbt-result-overlay">
      <div className="cbt-result-panel">
        <div className="cbt-result-round">ROUND {round}</div>
        <div className="cbt-result-title" style={{ color: copy.color, textShadow: `0 0 22px ${copy.color}` }}>
          {copy.title}
        </div>
        <div className="cbt-result-sub">{copy.sub}</div>

        {xpGained > 0 && <div className="cbt-result-xp">+{xpGained.toLocaleString()} XP</div>}

        {levelsGained > 0 && (
          <div className="cbt-result-levelup">
            <div className="cbt-result-levelup-title">Level Up! Now level {newLevel}</div>
            {newlyUnlockedActions.map((action) => (
              <div key={action.id} className="cbt-result-new-ability">
                New ability: {action.name}!
              </div>
            ))}
          </div>
        )}

        <button type="button" className="cbt-result-button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
