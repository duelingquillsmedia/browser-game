# Handoff: Aetherwyn — Character Select

## Overview
The character selection screen for Aetherwyn. It has a maximum of **three character slots**. A filled slot shows the saved hero's portrait, level, race, class, progress and play time. An empty slot leads to Character Creation. From here the player enters the world (Home dashboard), creates a character or deletes one.

It shares tokens and motifs with the other Aetherwyn screens (see `design_handoff_aetherwyn_ui/README.md`). The values it uses are repeated below so this file stands alone.

## About the Design Files
`Aetherwyn Character Select.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behavior, not production code. Recreate it in the target environment (a game engine UI layer or a web stack) using that codebase's patterns. Slot data here is sample data. In production, slots come from the game's save system.

The file uses a small template runtime (`support.js`): `{{ holes }}`, `<sc-for>`, `<sc-if>`, and a `class Component` whose `renderVals()` computes everything the template shows. Styling is inline, so every exact value is in the markup.

To view: open `Aetherwyn Character Select.dc.html` in a browser from this folder (needs network for Google Fonts).

## Fidelity
**High-fidelity** for layout, color, type and interaction. **Placeholder** for the sample characters and portraits.

## Canvas
- Fixed **1600×900** artboard, scaled to fit the window (`scale = min(vw/1600, vh/900)`), centered and letterboxed on `#050407`.
- Background: `radial-gradient(ellipse 70% 60% at 50% 0%, #1d1420 0%, #0b090e 65%)`.
- Rows: header 64px / main (fills) / footer 76px.

---

## Design Tokens

### Colors
- Surfaces: card `#141118`, inset `#100d13`, deep inset `#0e0c11`, level-diamond fill `#1a1216`
- Empty slot fill: `repeating-linear-gradient(135deg, rgba(232,200,170,.025) 0 6px, transparent 6px 12px), #100d13`
- Borders: card `rgba(232,200,170,.11)`, control `rgba(232,200,170,.18)`, divider `rgba(232,200,170,.08)`, empty slot (dashed) `rgba(232,200,170,.2)`
- Text: ink `#f3ece4`, body `#ece6df`, secondary `#d8cfc6`, tertiary `#cfc6bd`, muted `#a39a93`, faint `#8a817b`, disabled `#6b625c` / `#5a5158`
- Accent: ember `#e08a72`, ember-deep `#b85c4a`
- Semantic: danger `#d0604a` (delete; button fill `#7a2f22`, hover `#8c3828`), positive `#86c46f` (NEW tag), gold XP bar `#8a6f35 → #d9b865`
- Class colors: Cleric `#d9b865`, Warrior `#d0604a`, Rogue `#b287e6`, Mage `#5fc4d6`, Druid `#86c46f`

### Typography
- **Cinzel** 600/700: page title (30px), character name (24px), buttons (12–13px, ls .16–.18em)
- **Alegreya Sans** 400: subtitle and body (14–15px)
- **JetBrains Mono** 500: tags, labels, keycaps (9–11px, ls .1–.16em, uppercase)

### Shape
Radius 4px on cards, 3px on buttons and tags. The level badge and pagination pips are rotated squares (diamonds).

---

## Layout

### Header
‹ TITLE link, divider, diamond logo + AETHERWYN wordmark, then "SELECT CHARACTER · {used} / 3 SLOTS" on the right.

### Main
- Centered title "Choose your character" and the subtitle "Select a hero to continue their journey, or begin a new one in an empty slot."
- A 3-column grid, each column up to 420px, gap 24px, centered. Cards fill the height that's left.

**Filled slot card**
- Portrait (`image-slot#cs-portrait-{id}`) fills the top. A bottom gradient fades it into the card.
- Top-left tags: "SLOT n", plus "SELECTED" (ember) or "NEW" (green) when they apply.
- Bottom of the portrait:
  - 46px level diamond: border and glow in the class color, level number in the middle.
  - Name, Cinzel 700 24px.
  - "RACE · CLASS" line, with the class in its class color.
- Stats area below the portrait:
  - Experience label with "xp / xpMax" and a 5px gold bar.
  - Three tiles: Location, Day, Played.
  - "LAST PLAYED · …" in disabled color.
- Default state: panel shadow `inset 0 1px 0 rgba(255,255,255,.03), 0 10px 30px rgba(0,0,0,.35)`.
- Hover: border `rgba(224,138,114,.5)`.
- **Selected**: ember border, shadow `0 0 0 1px #e08a72, 0 0 32px rgba(184,92,74,.28), 0 18px 40px rgba(0,0,0,.45)`.

**Empty slot card**
- Dashed border and striped fill.
- A 64px diamond outline with "+" in ember.
- "SLOT n · EMPTY", "Create New Character", "Choose a race, class and name."
- The whole card links to Character Creation. Hovering it selects the slot and turns the border ember.

### Footer
- **‹ TITLE** button.
- **DELETE** button (danger text, "DEL" keycap). At 40% opacity with a not-allowed cursor when the selected slot is empty.
- 3 pagination diamonds. The selected one is filled ember-deep with an ember border. Filled slots have a muted border, empty ones a dark border.
- "1–3 SELECT" hint.
- Primary button, 240px wide, ember-deep fill with glow and an "ENTER" keycap. It reads **ENTER WORLD**, or **CREATE CHARACTER** when the selected slot is empty.

### Delete confirmation
- The screen dims to `rgba(5,4,7,.78)`.
- A 440px panel with a danger border, glowing red diamond, "Delete {name}?" and "Level {n} {Race} {Class}. All progress in this slot will be lost. This cannot be undone."
- Buttons: **CANCEL** and **DELETE** (danger fill).
- Clicking outside the panel cancels.

---

## Behavior
- **Select**: click a card, or press **1–3**, or **← / →** (wraps around).
- **Enter world**: the primary button, **Enter**, or double-clicking a filled card. Saves the slot index to `aetherwyn-active-slot` and goes to `Aetherwyn Prototype.dc.html?page=home`. On an empty slot it opens Character Creation instead.
- **Delete**: the DELETE button, or **Delete / Backspace**, opens the confirmation. Inside it, Enter confirms and Esc cancels. After deleting, selection moves to the first filled slot.
- **Esc** (with no dialog open) returns to the Title screen.
- **Initial selection**: the first filled slot, or slot 1 if all three are empty.
- **New characters**: on load, if `aetherwyn-newchar` exists (written by Character Creation) and a slot is empty, the character goes into the first empty slot at level 1 (Ridgeton, Day 1, 0 / 800 XP) with the NEW tag. The key is then removed. If all 3 slots are full, the new character is not placed; production should block New Game or ask the player to replace a slot.
- **Persistence**: slots are saved to `localStorage['aetherwyn-slots']` as an array of 3 (`null` = empty).

## Slot data shape
```
{ id, name, race: 'elf'|'human'|'dwarf', cls: 'cleric'|'warrior'|'rogue'|'mage'|'druid',
  lvl, xp, xpMax, loc, day, played, last, fresh? }
```
Sample data:
1. Kel'hos: Elf Cleric, LV 23, 18,420 / 24,000 XP, Ridgeton, Day 14, 41h 12m, last played Today.
2. Brenna: Dwarf Warrior, LV 8, 2,140 / 3,200 XP, Ashvale, Day 5, 6h 48m, last played 3 days ago.
3. Empty.

`xpMax` is stored on each slot. Take it from the game's real XP curve.

## Screen flow
Title → (CONTINUE / LOAD GAME) → **Character Select** → Home
Character Select → empty slot → Character Creation → Home

Note: in the prototype, the Title screen's CONTINUE still goes straight to Home, and Character Creation's BEGIN goes to Home. Route both through Character Select in production.

## Assets
- Portrait slots `cs-portrait-{id}`: tall image, about 3:4.
- No icon files. Glyphs are text characters.

## Files
- `Aetherwyn Character Select.dc.html`: the character select screen
- `Aetherwyn Character Creation.dc.html`: linked from empty slots
- `Aetherwyn Title.dc.html`: the Title screen
- `support.js`: template runtime needed to open the files
- `image-slot.js`: drag-and-drop portrait placeholder
