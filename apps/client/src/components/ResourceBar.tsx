import type { ResourceKey } from "@eridan/engine";

export interface ResourceBarProps {
  resourceKey: ResourceKey;
  name: string;
  value: number;
  max: number;
}

/** A class resource pool (Arcane/Divinity/Wylde/Rage), rendered as a small labeled bar. */
export function ResourceBar({ resourceKey, name, value, max }: ResourceBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="resource-bar" aria-label={`${name} ${value} of ${max}`}>
      <div className="resource-bar-track">
        <div className={`resource-bar-fill resource-${resourceKey}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="resource-bar-label">
        {name} {value}/{max}
      </span>
    </div>
  );
}
