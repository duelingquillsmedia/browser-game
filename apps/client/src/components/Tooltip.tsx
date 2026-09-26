import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Tooltip.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** Skip the tooltip entirely (e.g. an empty inventory slot with nothing to describe). */
  disabled?: boolean;
}

const GAP = 10;
const MARGIN = 12;

/**
 * Wraps `children` so hovering it shows `content` in a floating panel
 * portaled to `document.body` -- styled to match the end-of-battle result
 * popup (see CombatResultOverlay/CombatScreen.css's cbt-result-panel).
 *
 * Positioned above the hovered element by default (flipping below if there's
 * no room) and clamped to the viewport so it's never cut off. The wrapper
 * itself uses `display: contents` (see Tooltip.css) so it never disturbs a
 * flex/grid layout of the element it wraps.
 */
export function Tooltip({ content, children, disabled }: TooltipProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [style, setStyle] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !panelRef.current) {
      setStyle(null);
      return;
    }
    const panel = panelRef.current.getBoundingClientRect();
    let left = anchor.left + anchor.width / 2 - panel.width / 2;
    let top = anchor.top - panel.height - GAP;
    if (top < MARGIN) top = anchor.bottom + GAP;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, window.innerWidth - panel.width - MARGIN));
    top = Math.min(top, Math.max(MARGIN, window.innerHeight - panel.height - MARGIN));
    setStyle({ left, top });
    // `content` isn't referenced above, but its size drives `panel`'s measured rect, so re-measure when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, content]);

  if (disabled) return <>{children}</>;

  return (
    <span
      className="aow-tooltip-trigger"
      onMouseEnter={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor &&
        createPortal(
          <div
            ref={panelRef}
            className="aow-tooltip"
            style={style ?? { left: anchor.left, top: anchor.top, visibility: "hidden" }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
