import type { StatBreakdown } from "../game/characterDisplay";

export interface StatBreakdownTooltipContentProps {
  label: string;
  breakdown: StatBreakdown;
}

/** The hover-tooltip body for a Character screen combat stat -- shows how it's calculated and what to raise to increase it. */
export function StatBreakdownTooltipContent({ label, breakdown }: StatBreakdownTooltipContentProps) {
  return (
    <div>
      <div className="aow-item-name">{label}</div>
      <div className="aow-item-type-line">{breakdown.formula}</div>

      {breakdown.factors.length > 0 && (
        <div className="aow-stat-list" style={{ margin: "8px 0" }}>
          {breakdown.factors.map((factor) => (
            <div key={factor.label} className="aow-stat-row">
              <span>{factor.label}</span>
              <span>{factor.value}</span>
            </div>
          ))}
          <div className="aow-stat-row" style={{ borderTop: "1px solid var(--aow-divider)", marginTop: 2, paddingTop: 6 }}>
            <span>Total</span>
            <span style={{ color: "var(--aow-gold)" }}>{breakdown.total}</span>
          </div>
        </div>
      )}

      <p className="aow-item-flavor" style={{ margin: breakdown.factors.length > 0 ? 0 : "8px 0 0" }}>
        {breakdown.hint}
      </p>
    </div>
  );
}
