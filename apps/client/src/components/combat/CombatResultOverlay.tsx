import type { CombatStatus } from "@eridan/engine";

export interface CombatResultOverlayProps {
  status: Exclude<CombatStatus, "active">;
  round: number;
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
 * game moves on to a rewards/navigation screen rather than restarting the
 * fight, so the button is restyled to match, not renamed to match a flow
 * this game doesn't have.
 */
export function CombatResultOverlay({ status, round, onContinue }: CombatResultOverlayProps) {
  const copy = RESULT_COPY[status];
  return (
    <div className="cbt-result-overlay">
      <div className="cbt-result-panel">
        <div className="cbt-result-round">ROUND {round}</div>
        <div className="cbt-result-title" style={{ color: copy.color, textShadow: `0 0 22px ${copy.color}` }}>
          {copy.title}
        </div>
        <div className="cbt-result-sub">{copy.sub}</div>
        <button type="button" className="cbt-result-button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
