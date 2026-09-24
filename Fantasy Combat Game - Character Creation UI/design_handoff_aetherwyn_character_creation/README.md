# Handoff: Aetherwyn — Character Creation

## Overview
The New Game flow for Aetherwyn. A five-step wizard (Race → Class → Attributes → Appearance → Name) with a large portrait preview on the right. **NEW GAME** on the Title screen opens it. **BEGIN JOURNEY** saves the character and goes to the Home dashboard.

It shares tokens and motifs with the other Aetherwyn screens (see `design_handoff_aetherwyn_ui/README.md`). The values it uses are repeated below so this file stands alone.

## About the Design Files
`Aetherwyn Character Creation.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behavior, not production code. Recreate it in the target environment (a game engine UI layer or a web stack) using that codebase's patterns. Race, class and name data are placeholders. Move them into the game's data definitions.

The file uses a small template runtime (`support.js`): `{{ holes }}`, `<sc-for>`, `<sc-if>`, and a `class Component` whose `renderVals()` computes everything the template shows. Read `renderVals()` as the spec for derived values. Styling is inline, so every exact value is in the markup.

To view: open `Aetherwyn Character Creation.dc.html` in a browser from this folder (needs network for Google Fonts).

## Fidelity
**High-fidelity** for layout, color, type and interaction. **Placeholder** for lore text, stat numbers, name lists and the portrait.

## Canvas
- Fixed **1600×900** artboard, scaled to fit the window (`scale = min(vw/1600, vh/900)`), centered and letterboxed on `#050407`.
- Background: `radial-gradient(ellipse 70% 60% at 70% 0%, #1d1420 0%, #0b090e 65%)`.
- Rows: header 64px / body (fills) / footer 76px.
- Body columns: step rail 240px / step content (fills) / preview 440px.

---

## Design Tokens

### Colors
- Surfaces: card `#141118`, inset `#100d13`, deep inset `#0e0c11`, glyph tile `#120f16`, level/step diamond fill `#1a1216`
- Borders: card `rgba(232,200,170,.11)`, control `rgba(232,200,170,.18)`, divider `rgba(232,200,170,.08)` / `.05`, inactive step ring `#3a333f`
- Text: ink `#f3ece4`, body `#ece6df`, secondary `#d8cfc6`, tertiary `#cfc6bd`, muted `#a39a93`, faint `#8a817b`, disabled `#6b625c` / `#5a5158`
- Accent: ember `#e08a72`, ember-deep `#b85c4a`, hover link `#f2b3a1`
- Semantic: positive `#86c46f`, negative/health `#d0604a`, mana `#5fc4d6`, gold `#d9b865` (attribute bar `#8a6f35 → #d9b865`)
- Selected card: bg `rgba(184,92,74,.12)`, border = accent, shadow `0 0 0 1px <accent>, 0 0 24px rgba(184,92,74,.2)`
- Card hover: border `rgba(224,138,114,.45)`

Class colors: Cleric `#d9b865`, Warrior `#d0604a`, Rogue `#b287e6`, Mage `#5fc4d6`, Druid `#86c46f`.

### Typography
- **Cinzel** 600/700: titles, names, buttons, step labels
- **Alegreya Sans** 400/500/700 (+ italic): descriptions, body
- **JetBrains Mono** 500: eyebrows, tags, stat labels (9–11px, letter-spacing .08–.16em, uppercase)
- **Noto Sans Runic**: race and class glyphs

Key sizes: wordmark Cinzel 700 16px ls .24em; step title Cinzel 700 28px; race name Cinzel 700 20px; class detail title Cinzel 700 24px; name input Cinzel 700 24px; preview name Cinzel 700 26px.

### Shape
Radius 4px on cards, 3px on buttons and chips. Step markers and pagination dots are rotated squares (diamonds).

---

## Layout

### Header
‹ TITLE link (back to the Title screen), divider, diamond logo + AETHERWYN wordmark, then "NEW GAME · CREATE YOUR CHARACTER" on the right.

### Step rail (left)
Five rows, one per step. Each row has a diamond with the step number, the step label, and the current choice below it (or "—").
- **Current**: ember left bar, bg `rgba(184,92,74,.14)`, ember ring with glow.
- **Done**: ember-deep filled diamond.
- **Not reached**: 45% opacity, not clickable.
- Any step already reached can be clicked to jump back to it.

### Step content (center)
"STEP n OF 5" eyebrow, title, one-line subtitle, then the step body:

1. **Race**: 3 cards in a row. Each card has a glyph tile, name, tag line, description, stat chips (green `+n`, red `−n`) and a racial trait box.
2. **Class**: a 260px list of 5 classes (glyph tile in the class color, name, role) next to a detail panel. The detail panel shows the title in the class color, the description, Primary / Resource / Armor tiles, and 3 starting skills. With no class picked, the panel is a dashed placeholder.
3. **Attributes**: a read-only table (Attribute + hint, Base, race bonus, class bonus, a bar with the total). Column headers use the chosen race and class names. Next to it: tiles for Health, the class resource, Primary stat and Racial trait, and a note that points are earned by levelling.
4. **Appearance**: 3×2 grid of presets for the chosen race. Each preset shows skin, hair and eye swatches (the eye swatch is a glowing diamond) and a name. A note explains that the portrait frame accepts a custom image.
5. **Name**: 58px name input and a **RANDOM** button that picks from the race's name pool, never repeating the current name. Below: a validation hint and a summary table (Race · trait, Class · role, Appearance, Starts in Ridgeton · Day 1).

### Preview (right)
- A large portrait slot (`image-slot#cc-portrait`) that fills the column. Its border and glow take the class color once a class is chosen.
- Bottom gradient caption: the name ("Unnamed" in disabled color until one is entered) and "LV 1 · RACE · CLASS".
- Under the portrait, 3 stat tiles: Health, the class resource, and the primary stat's value.

### Footer
- **‹ TITLE** (on step 1) or **‹ BACK**.
- 5 pagination diamonds.
- The primary button reads **CONTINUE**, or **BEGIN JOURNEY** on step 5, with an "ENTER" keycap.
  - Enabled: ember-deep fill, ember border, glow.
  - Disabled: card fill, muted text, `not-allowed` cursor.

---

## Behavior
- **Validation**: Race and Class need a pick. The name must be 2–18 characters, and only letters, spaces, apostrophes and hyphens are allowed (anything else is removed as you type). Attributes and Appearance are always valid.
- **Keys**: Enter = Continue or Begin. Esc = Back, ignored while typing in the name field; on step 1 it returns to Title.
- **Changing race** resets the appearance preset to the first one, since presets differ by race.
- **Begin**: writes the character to `localStorage['aetherwyn-newchar']` as `{name, race, cls, look}`, then goes to `Aetherwyn Prototype.dc.html?page=home`.

### Derived values
- Attribute = 10 + race bonus + class bonus.
- Health = 100 + VIT × 10 + class HP bonus.
- Mana = 80 + SPI × 8 + INT × 4 for casters. Warriors use Rage and Rogues use Energy, both shown as 100.

## Data (placeholders)

Races (bonuses and trait):
- **Elf**: DEX +2, WIS +2, INT +1, VIT −1. Silverleaf Step: once per combat, the first skill costs 1 less AP.
- **Human**: +1 to every attribute. Many Roads: +10% experience.
- **Dwarf**: VIT +3, STR +2, DEX −1. Stoneblood: ignore the first Burning or Poison each combat.

Classes (bonuses, HP bonus, primary stat, resource, armor, starting skills):
- **Cleric**: WIS +4, SPI +3, VIT +1. HP +30. Wisdom. Mana + Faith. Cloth / Mail. Smite, Mend, Aegis Ward.
- **Warrior**: STR +4, VIT +3, DEX +1. HP +60. Strength. Rage. Plate. Cleave, Shield Wall, Battle Cry.
- **Rogue**: DEX +5, INT +2, STR +1. HP +20. Dexterity. Energy + Combo. Leather. Backstab, Smoke Veil, Poisoned Blade.
- **Mage**: INT +5, SPI +3. HP +0. Intellect. Mana. Cloth. Firebolt, Frost Nova, Arcane Shield.
- **Druid**: WIS +3, SPI +2, VIT +2, DEX +1. HP +30. Wisdom. Mana. Leather. Rootbind, Verdant Bloom, Thornlash.

Appearance presets are in `LOOKS`: six per race, each `[name, skin, hair, eyes]`. Name pools are in `NAMES`: eight per race.

## State
`step (0–4), visited (furthest step reached), race, cls, look (preset index), name, scale`.

## Integration notes
- The Title screen's NEW GAME entry links here.
- The Home dashboard and the other pages still show the hard-coded Kel'hos. Read `aetherwyn-newchar` (or the real save model) to fill in the name, race, class and stats.
- Starting skills should feed the Skills page and the combat action bar.

## Assets
- Portrait slot `cc-portrait`: tall image, about 3:4.
- Icons are Unicode runes (Noto Sans Runic). No icon files.

## Files
- `Aetherwyn Character Creation.dc.html`: the character creation screen
- `Aetherwyn Title.dc.html`: the Title screen (entry point via NEW GAME)
- `support.js`: template runtime needed to open the files
- `image-slot.js`: drag-and-drop portrait placeholder
