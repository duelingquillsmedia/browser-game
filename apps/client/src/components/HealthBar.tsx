export interface HealthBarProps {
  hp: number;
  maxHp: number;
}

export function HealthBar({ hp, maxHp }: HealthBarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const tone = pct > 50 ? "high" : pct > 20 ? "mid" : "low";

  return (
    <div className="health-bar" aria-label={`HP ${hp} of ${maxHp}`}>
      <div className={`health-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      <span className="health-bar-label">
        {hp} / {maxHp}
      </span>
    </div>
  );
}
