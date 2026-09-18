import { useEffect, useRef } from "react";
import type { CombatLogEntry } from "@eridan/engine";

export interface CombatLogProps {
  entries: CombatLogEntry[];
}

export function CombatLog({ entries }: CombatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <div className="combat-log">
      {entries.map((entry, i) => (
        <p key={i} className="log-entry">
          {entry.message}
        </p>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
