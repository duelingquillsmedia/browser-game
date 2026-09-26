import type { CombatActionDef, CombatStatus } from "@eridan/engine";

export interface ResultScreenProps {
  status: Exclude<CombatStatus, "active">;
  xpGained: number;
  levelsGained: number;
  newLevel: number;
  newlyUnlockedActions: CombatActionDef[];
  onContinue: () => void;
}

const COPY: Record<Exclude<CombatStatus, "active">, { title: string; body: string }> = {
  party_won: {
    title: "Victory",
    body: "The frontier is a little quieter tonight — and a little richer, for you.",
  },
  enemies_won: {
    title: "Defeat",
    body: "Your journey through Eridan ends here, but the road is always open to another wanderer.",
  },
  party_fled: {
    title: "You Escaped",
    body: "You live to fight another day — though the road ahead is no less dangerous.",
  },
};

export function ResultScreen({ status, xpGained, levelsGained, newLevel, newlyUnlockedActions, onContinue }: ResultScreenProps) {
  const copy = COPY[status];
  return (
    <div className={`screen result-screen ${status}`}>
      <h1>{copy.title}</h1>
      <p className="subtitle">{copy.body}</p>
      {xpGained > 0 && <p className="xp-gained">+{xpGained.toLocaleString()} XP</p>}
      {levelsGained > 0 && (
        <div className="level-up-callout">
          <p className="level-up-title">Level Up! Now level {newLevel}</p>
          {newlyUnlockedActions.map((action) => (
            <p key={action.id} className="new-ability">
              New ability: {action.name}!
            </p>
          ))}
        </div>
      )}
      <button type="button" className="primary" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
