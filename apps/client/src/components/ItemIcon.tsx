import type { ReactElement } from "react";
import type { ItemSlot } from "@eridan/engine";

export interface ItemIconProps {
  itemId: string;
  slot: ItemSlot;
}

/**
 * A small filled sprite-style icon per item, drawn to read clearly inside a
 * boxed inventory slot. Falls back to a generic icon for the item's slot
 * type if the item id isn't one of the catalog's known items.
 */
export function ItemIcon({ itemId, slot }: ItemIconProps) {
  const icon = ITEM_ICONS[itemId];
  if (icon) return icon;
  return FALLBACK_ICONS[slot];
}

function Sword() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <polygon points="24,4 27,7 27,30 24,34 21,30 21,7" fill="#d7dde5" stroke="#8a93a3" strokeWidth="1" />
      <rect x="23" y="7" width="2" height="23" fill="#f4f7fb" opacity="0.7" />
      <rect x="15" y="30" width="18" height="4" rx="1.5" fill="#b8860b" stroke="#7a5a06" strokeWidth="1" />
      <rect x="22" y="33" width="4" height="10" rx="1.5" fill="#8a5a2b" stroke="#5c3b1a" strokeWidth="1" />
      <circle cx="24" cy="44" r="2.6" fill="#d4af37" stroke="#7a5a06" strokeWidth="1" />
    </svg>
  );
}

function Bow() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <path
        d="M16 6 C28 14 28 34 16 42"
        fill="none"
        stroke="#8a5a2b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line x1="16" y1="6" x2="16" y2="42" stroke="#e8e2c8" strokeWidth="1.5" />
      <line x1="10" y1="24" x2="38" y2="24" stroke="#c9924a" strokeWidth="2" strokeLinecap="round" />
      <polygon points="38,24 33,21.5 33,26.5" fill="#7a93a3" />
    </svg>
  );
}

function Staff() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <rect x="22" y="14" width="4" height="30" rx="1.5" fill="#8a5a2b" stroke="#5c3b1a" strokeWidth="1" />
      <circle cx="24" cy="10" r="7" fill="#7fd6e0" stroke="#3f8f99" strokeWidth="1.5" />
      <circle cx="24" cy="10" r="3" fill="#e8fbfd" opacity="0.8" />
    </svg>
  );
}

function Mace() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <rect x="22" y="20" width="4" height="24" rx="1.5" fill="#8a5a2b" stroke="#5c3b1a" strokeWidth="1" />
      <circle cx="24" cy="12" r="9" fill="#9aa4b2" stroke="#5b6472" strokeWidth="1.5" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x="22.5"
          y="1"
          width="3"
          height="6"
          fill="#5b6472"
          transform={`rotate(${deg} 24 12)`}
        />
      ))}
    </svg>
  );
}

function Dagger() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <polygon points="24,6 26,9 26,26 24,30 22,26 22,9" fill="#dcdfe8" stroke="#8a93a3" strokeWidth="1" />
      <rect x="16" y="26" width="16" height="3.5" rx="1.5" fill="#7a4fae" stroke="#4d2f70" strokeWidth="1" />
      <rect x="22.5" y="29.5" width="3" height="9" rx="1.5" fill="#8a5a2b" stroke="#5c3b1a" strokeWidth="1" />
      <circle cx="24" cy="40" r="2.2" fill="#b48be0" stroke="#4d2f70" strokeWidth="1" />
    </svg>
  );
}

function Knuckles() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      {[13, 21, 27, 35].map((cx) => (
        <circle key={cx} cx={cx} cy="18" r="6" fill="none" stroke="#c9924a" strokeWidth="3.5" />
      ))}
      <rect x="10" y="26" width="28" height="6" rx="3" fill="#c9924a" stroke="#8a5a2b" strokeWidth="1" />
    </svg>
  );
}

function ArmorVest(fill: string, stroke: string, pattern?: "studs" | "mesh") {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <path
        d="M16 8 L24 12 L32 8 L38 14 L34 20 L34 42 L14 42 L14 20 L10 14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {pattern === "studs" &&
        [18, 24, 30].map((cx) =>
          [22, 30, 38].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="#5b6472" />)
        )}
      {pattern === "mesh" && (
        <g stroke="#5b6472" strokeWidth="0.6" opacity="0.7">
          {[16, 20, 24, 28, 32].map((x) => (
            <line key={x} x1={x} y1="16" x2={x} y2="42" />
          ))}
          {[18, 24, 30, 36].map((y) => (
            <line key={y} x1="14" y1={y} x2="34" y2={y} />
          ))}
        </g>
      )}
    </svg>
  );
}

function Ring() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <circle cx="24" cy="28" r="11" fill="none" stroke="#c9ccd4" strokeWidth="4" />
      <polygon points="24,10 29,17 24,22 19,17" fill="#5fb8e0" stroke="#2f7ba3" strokeWidth="1" />
    </svg>
  );
}

function Charm() {
  return (
    <svg viewBox="0 0 48 48" className="item-icon" aria-hidden="true">
      <circle cx="24" cy="24" r="14" fill="#d4af37" stroke="#8a6d1a" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="10" fill="none" stroke="#8a6d1a" strokeWidth="1" opacity="0.6" />
      <polygon
        points="24,17 26,22 31,22 27,25 28.5,30 24,27 19.5,30 21,25 17,22 22,22"
        fill="#fff3c4"
      />
    </svg>
  );
}

const ITEM_ICONS: Record<string, ReactElement> = {
  ironLongsword: <Sword />,
  huntersShortbow: <Bow />,
  oakenStaff: <Staff />,
  ashenMace: <Mace />,
  ritualDagger: <Dagger />,
  practicedKnuckles: <Knuckles />,
  leatherArmor: ArmorVest("#7a5a2b", "#4a3417"),
  studdedLeather: ArmorVest("#6b4a22", "#3f2c12", "studs"),
  chainShirt: ArmorVest("#9aa4b2", "#5b6472", "mesh"),
  travelersRobe: ArmorVest("#5a5aa8", "#33336b"),
  luckyCharm: <Charm />,
  ringOfWarding: <Ring />,
};

const FALLBACK_ICONS: Record<ItemSlot, ReactElement> = {
  weapon: <Sword />,
  armor: ArmorVest("#7a5a2b", "#4a3417"),
  accessory: <Ring />,
};
