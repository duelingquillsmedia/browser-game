import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** Skip the tooltip entirely (e.g. an empty inventory slot with nothing to describe). */
  disabled?: boolean;
}

const GAP = 16;
const MARGIN = 12;

/**
 * Wraps `children` so hovering it shows `content` in a floating panel
 * portaled to `document.body` -- styled to match the end-of-battle result
 * popup (see CombatResultOverlay/CombatScreen.css's cbt-result-panel).
 *
 * Follows the mouse, sitting just to its left (vertically centered on it) so
 * the player never has to look away from the cursor to read it -- flipping
 * to the right if there's no room on the left, and clamped to the viewport
 * so it's never cut off. The wrapper itself uses `display: contents` (see
 * Tooltip.css) so it never disturbs a flex/grid layout of what it wraps.
 */
export function Tooltip({ content, children, disabled }: TooltipProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [style, setStyle] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!point || !panelRef.current) {
      setStyle(null);
      return;
    }
    const panel = panelRef.current.getBoundingClientRect();
    let left = point.x - GAP - panel.width;
    if (left < MARGIN) left = point.x + GAP;
    let top = point.y - panel.height / 2;
    left = Math.min(left, Math.max(MARGIN, window.innerWidth - panel.width - MARGIN));
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, window.innerHeight - panel.height - MARGIN));
    setStyle({ left, top });
    // `content` isn't referenced above, but its size drives `panel`'s measured rect, so re-measure when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, content]);

  if (disabled) return <>{children}</>;

  return (
    <span
      className="aow-tooltip-trigger"
      onMouseEnter={(e) => setPoint({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPoint({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPoint(null)}
    >
      {children}
      {point &&
        createPortal(
          <div
            ref={panelRef}
            className="aow-tooltip"
            style={style ?? { left: point.x, top: point.y, visibility: "hidden" }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
