import type { ItemSlot } from "@eridan/engine";

export interface ItemSlotIconProps {
  slot: ItemSlot;
}

/** A small gold line-art glyph per equipment slot, since the GUI kit has no dedicated item icons. */
export function ItemSlotIcon({ slot }: ItemSlotIconProps) {
  if (slot === "meleeWeapon") {
    return (
      <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20 L14 10" />
          <path d="M12 6 L18 12 L20 10 L14 4 Z" />
          <path d="M10 8 L8 6" />
          <path d="M16 14 L18 16" />
        </g>
      </svg>
    );
  }

  if (slot === "rangedWeapon") {
    return (
      <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 4 C14 8 14 16 6 20" strokeLinejoin="round" />
          <path d="M6 4 L6 20" strokeDasharray="1.5 1.8" strokeWidth="1.1" />
          <path d="M11 12 L20 12" />
          <path d="M17 9 L20 12 L17 15" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  if (slot === "armor") {
    return (
      <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
        <path
          d="M12 3 L19 6 V11 C19 16 16 19.5 12 21 C8 19.5 5 16 5 11 V6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 6 V18" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="slot-icon" aria-hidden="true">
      <circle cx="12" cy="15" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9 L12 3 L15 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="2.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
