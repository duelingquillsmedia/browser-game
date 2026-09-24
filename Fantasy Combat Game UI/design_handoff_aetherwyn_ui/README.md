# Handoff: Aetherwyn — Out-of-Combat Game UI

## Overview
Aetherwyn is a high-fantasy, turn-based (tactical, tile/AP-based) RPG. This package covers the **out-of-combat menu UI** for the player character Kel'hos, a level 23 Elf Cleric: a Title screen, a Home dashboard, and five full pages — Character, Inventory, Skills, Talents, and World Map. Visual direction: dark arcane, luminous rune glyphs, warm ember accent (`#b85c4a` / `#e08a72`), dense MMO-style information layout.

## About the Design Files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behavior. They are not production code to copy directly. Your job is to **recreate these designs in the target codebase's environment** (a game engine UI layer such as Unity UI Toolkit / Godot Control nodes / Unreal UMG, or a web stack such as React) using its established patterns. If no environment exists yet, choose the most appropriate framework for the project.

The `.dc.html` files use a small in-house template runtime (`support.js`): `{{ holes }}`, `<sc-for>`, `<sc-if>`, and a `class Component` whose `renderVals()` computes everything the template shows. Read `renderVals()` as the spec for derived state. All styling is inline, so every exact value is in the markup.

To view: open `Aetherwyn Title.dc.html` or `Aetherwyn Prototype.dc.html` in a browser from this folder (needs network for Google Fonts). `?page=home|character|inventory|skills|talents|map` jumps to a page. `?char=a|b` and `?talents=a|b` force layout variants.

## Fidelity
**High-fidelity.** Colors, type, spacing and interactions are final unless noted as placeholder (see "Open items"). Recreate pixel-accurately.

---

## Design Tokens

### Colors
Surfaces
- App background `#0b090e`; header gradient `radial-gradient(ellipse 80% 50% at 50% -10%, #1d1420 0%, #0b090e 70%)`
- Panel `#141118`; inset/cell `#100d13`; deep inset `#0e0c11`; chip/avatar bg `#120f16`; level-diamond fill `#1a1216`
- Panel border `rgba(232,200,170,.11)`; dividers `rgba(232,200,170,.08)` / `.05`; control border `rgba(232,200,170,.12)`–`.18`
- Panel shadow `inset 0 1px 0 rgba(255,255,255,.03), 0 10px 30px rgba(0,0,0,.35)`
- Card hover: border `rgba(224,138,114,.55)`, shadow `0 0 0 1px rgba(224,138,114,.2), 0 10px 30px rgba(0,0,0,.35), 0 0 24px rgba(184,92,74,.18)`, transition `border-color .15s, box-shadow .15s`

Text
- Ink (headings) `#f3ece4`; body `#ece6df`; secondary `#d8cfc6`; tertiary `#cfc6bd`; muted `#a39a93`; faint `#8a817b`; disabled `#6b625c` / `#5a5158`

Accent & semantic (`C` in code)
- ember `#e08a72` (primary glow/accent), ember-deep `#b85c4a` (primary button fill, section bullet), hover link `#f2b3a1`
- hp `#d0604a` (bar gradient `#7a2f22 → #d0604a`)
- mana `#5fc4d6` (gradient `#1f5f6b → #5fc4d6`)
- gold / XP / Faith `#d9b865` (gradient `#8a6f35 → #d9b865`; empty Faith pip border `#6b5a33`)
- green `#86c46f`, violet `#b287e6`, frost `#8fc6e6`

Item rarity (`RAR`): common `#a8a29c`, uncommon `#86c46f`, rare `#6aa7e6`, epic `#b287e6`, legendary `#e6a64e`

Skill schools (`SCH`): Radiant = gold, Nature = green, Protection = mana, Racial = ember

Talent trees: Dawnward = gold, Verdant Grace = green, Aegis = mana

Rarity fill pattern: `repeating-linear-gradient(135deg, <rarity @ alpha> 0 4px, transparent 4px 8px), #120f16` (alpha .12 default, .22 selected, .18 on Home mini-bag).

Active nav: bg `rgba(184,92,74,.14)`, left bar 2px `#e08a72`, glyph `#e08a72` with `text-shadow 0 0 10px rgba(224,138,114,.9)`. Active tab/filter: bg `rgba(184,92,74,.18)`, border `#e08a72`.

### Typography (Google Fonts)
- **Cinzel** 500/600/700 (Title adds 800) — headings, labels, buttons. Uppercase labels use letter-spacing `.12em–.24em`.
- **Alegreya Sans** 400/500/700 + italic 400 — body copy, names in lists. Base body font.
- **JetBrains Mono** 400/500 — numbers, stats, keycaps, eyebrows, meta.
- **Noto Sans Runic** 400 — Elder Futhark glyphs used as nav and skill/talent icons.

Scale in use
- Logo wordmark: Cinzel 700 16px, ls .24em, `text-shadow 0 0 14px rgba(224,138,114,.45)`
- Page H1: Cinzel 700 26px/1.1, ls .06em, glow `0 0 18px rgba(224,138,114,.35)`
- Character name: Cinzel 700 22–24px, ls .04em
- Panel header: Cinzel 600 11px, ls .16em, uppercase, color `#d8cfc6`, preceded by 6px rotated-45° ember square
- Nav label: Cinzel 600 12px, ls .12em uppercase
- Body/list: Alegreya Sans 500 13–14px/1.2
- Eyebrow: JetBrains Mono 500 11px, ls .12em uppercase, muted
- Stat label: JetBrains Mono 500 10–11px; keycap chip JetBrains Mono 500 10px, 1px border `rgba(232,200,170,.12)`, radius 3, padding 3×5
- Attribute value: Cinzel 600 17px

### Radius / spacing
- Radius: panels 4px; controls/chips 3px; bars 2px. Diamonds are squares rotated 45°.
- Gaps: 14px between panels/cards; 10–12px inside; panel padding 14–16px; panel header padding 11×14.
- Main padding: desktop `22px 26px 36px`, narrow `16px 12px 86px`. Content max-width 1320px, centered.

### Motif
- Diamond (rotated square) is the recurring mark: logo, level badge, currency, talent points, list bullets, Faith pips.
- Luminous glow = `box-shadow 0 0 6–14px <color>` on fills; `text-shadow` on glyphs.

---

## Global Shell (Prototype)
- **Header** — sticky, 56px tall, bg `rgba(11,9,14,.88)` + `backdrop-filter: blur(6px)`, bottom border `rgba(232,200,170,.1)`, padding 0 18px, gap 14.
  - Left: 13px diamond outline + "AETHERWYN" wordmark.
  - Right (wide only): character chip — 34px "K" avatar (striped bg, ember border), "Kel'hos" + "LV 23 CLERIC", two 64×4px bars (HP 88%, Mana 87%).
  - Currency: gold diamond `12,480`, mana diamond `36`, `DAY {day}`.
- **Left nav** — 196px, sticky under header, full height. Items: glyph (Runic 18px), label, keycap. Order/keys: Home H ᚺ, Character C ᛗ, Inventory I ᛒ, Skills K ᚲ, Talents N ᛉ, World Map M ᛟ.
- **Page header** — eyebrow + H1; right-side contextual meta per page (Inventory: BAG 45/60, GOLD; Talents: points diamond + RESET; Map: PARTY AT, DAY).
- **Responsive** — breakpoint 820px. Below it the nav and header chip hide, padding tightens, bag cells shrink 50→34px, hex size shrinks, talents force single-tree mode, map height 62vh.
- **Keyboard** — H/C/I/K/N/M switch pages (ignored in inputs or with modifier keys).
- **Persistence** — current page saved to `localStorage['aetherwyn-page']` unless a `?page=` param is present.

## Screens

### 1. Title (`Aetherwyn Title.dc.html`)
Full-viewport, overflow hidden. Background is either the "Arcane" generated look (runes, embers) or a user-supplied key-art image (`<image-slot id="title-bg">` in the prototype; in production, a configurable image). A scrim darkens the image: centered layout uses a radial scrim, left layout uses a left-to-right linear scrim; strength 0–90%.
Menu (max 340px wide): CONTINUE (sub: "KEL'HOS · LV 23 CLERIC · DAY 14", goes to Home), NEW GAME, LOAD GAME, SETTINGS, and an exit item. Hover or arrow keys move selection; the selected row shows a glowing 8px ember diamond and a highlighted border. Unimplemented items show a toast.
Props: `background` Arcane|Custom image, `layout` Centered|Left, `scrimStrength` 0–90, `runesOverImage` bool, `embers` bool.

### 2. Home dashboard (entry page)
Two flex-wrap rows of clickable cards (whole card navigates). Card = panel + header row (bullet, TITLE, keycap, "OPEN ›" in ember).
- Row 1: **Character** (flex 1 1 360px) — level diamond "23", name, "Elf · Cleric · Verdant Grace", HP 412/468, Mana 530/610, XP 18,420/24,000 bars, 3×2 attribute grid (STR 14, DEX 18, INT 22, WIS 41, VIT 29, SPI 36). **World Map** (flex 1.5 1 460px, min-height 260) — Eridan map at 1.6× centered on the party hex, vignette, 18px glowing ember party dot at center, bottom-left "PARTY AT · DAY n / place / region · levels", bottom-right 3 nearest places with day distance.
- Row 2 (each flex 1 1 280px): **Inventory** — 10×6 mini bag at 18px cells showing item footprints in rarity colors, BAG/GOLD, rarity counts. **Skills** — 6-slot action bar with Runic glyphs + keys, first 3 bar skills with AP/MP, "N abilities known · M locked". **Talents** — points diamond, "POINTS TO SPEND", spent/23, one progress bar per tree (points / max).

### 3. Character
Two layout variants (prop `characterLayout`): **Paper doll** (default) and **Codex**.
- Left column: identity panel (level diamond, name, XP bar 6px, HP/Mana bars 10px, Faith as 5 diamond pips, 3 filled), Attributes list (name, base + gear bonus, hint text on hover).
- Center: equipment — 14 slots split Left (Head, Neck, Shoulders, Chest, Waist, Legs), Right (Cloak, Hands, Feet, Ring, Ring, Trinket), Weapons (Main hand, Off hand). Slot tile uses rarity border + stripe fill + glow; names shown only at ≥1100px.
- Right: Combat stats in groups Tempo / Offense / Defense; Resistances as bars (Fire 22, Frost 18, Nature 30, Shadow 40, Radiant 65, Arcane 15).
Exact data is in `EQUIP`, `ATTR`, `COMBAT`, `RESIST` in the logic script.

### 4. Inventory
Grid bag, 10×6 cells (50px, 34px narrow), multi-cell items (Diablo-style footprints, `x,y,w,h` in `ITEMS`). Filter tabs: All / Gear / Consumables / Materials / Quest with counts; non-matching items drop to 22% opacity. Click selects: selected item gets `0 0 0 1px <rarity>, 0 0 18px <rarity@.55>`. Stack quantities shown as `×n`.
Detail panel: name in rarity color, TYPE LINE (rarity · type · stack), item level, stat lines, green "Equip:/Use:" effect, italic flavor, compare block vs equipped (green for +, hp-red for −), requirement/sell value, primary action by category (EQUIP / USE / SPLIT STACK / TRACK QUEST).

### 5. Skills
School filter tabs (All, Radiant, Nature, Protection, Racial) with colored dots. Skill list rows: glyph tile in school color, name, "AP · MP · FAITH" meta, slot label ("SLOT n") or "LV n" if locked (locked = level > 23, 50% opacity).
Detail: glyph, name, school · rank, description, 6-cell stat grid (Action Points, Mana, Faith, Cooldown, Range, Target), "Talent modifiers" list from talent nodes that modify this skill (lit if ranked).
Action bar: 6 slots, keys 1–6. "PLACE ON ACTION BAR" arms placement: slots switch to dashed ember borders and hint "Placing X. Click a slot."; clicking a slot assigns the skill (removing it from any other slot). Clicking a filled slot while not arming selects that skill.

### 6. Talents
23 points total, 3 trees × 5 tiers × 3 columns (data in `TREES`). Rules:
- Tier t needs `4 × (t−1)` points spent in that tree's lower tiers.
- Some nodes need a parent node (`req`); drawn as a vertical link, lit in tree color when parent is ranked.
- Tier 5 is a Keystone, drawn as a diamond (78% size).
- Left-click learns; right-click unlearns only if the tree stays valid. RESET clears all.
Node states: unranked-locked (border `#3a333f`, 60% opacity), learnable (border `#8a817b`), ranked (tree-color border + glow), maxed (stronger fill + glow). Rank badge `r/max`. Selected node has 1px ink outline. Hover (desktop) selects for the detail panel.
Detail: name, TREE · TIER · Passive/Keystone, rank, current and next-rank text (`{v}` substituted), modified skill chip, lock reason.
Layout variants (prop `talentLayout`): **All trees** (3 side by side; cell 68×70, node 44) or **Focused spec** (spec tabs + one large tree; cell 112×90, node 58, plus a learned-talents list).

### 7. World Map (Eridan)
- Source image `assets/eridan.jpg`, 2048×1536. Shown at zoom 2–6× (default 4, step 0.5) inside a scroll container (height `min(74vh,780px)`, 62vh narrow).
- Pointy-top hex grid overlay (odd rows offset): hex width 46.5px (image px), grid offset (−9.25, 5.3), 46 cols × 39 rows. Distance uses axial coordinates. Calibrated so Ridgeton is exactly 2 hexes from Ashvale and from Praldosta.
- **Terrain from image**: on load, sample a 6×6 pixel grid (±15px) around each hex centre and classify with `eCls(r,g,b)` into plains / forest / highlands / peaks / snow / desert / water; majority wins, water only if ≥40% water samples. Hexes with a place are forced to land. Region = nearest region anchor (`E_REG`); water hexes get the nearest sea name (`E_SEA`). Terrain tint overlay per type at Off 0 / Subtle .2 / Strong .42 (prop `terrainTint`).
- Interaction: drag to pan (5px threshold before a drag counts), click selects a hex, hover outlines the hex under the cursor, minimap (190px, 120px narrow) shows the viewport rectangle and party dot and recentres on click. Controls: zoom −/+, readout "4×", centre-on-party. Zoom keeps the view centre fixed.
- Party token sits on its hex; a route line runs from party to the selected hex.
- Selected hex panel: place (if any), region, terrain, level range, danger (≤23 Safe green, ≤26 Moderate gold, ≤31 Dangerous ember, else Deadly hp-red), encounter chance, distance in days. Primary button "TRAVEL · N DAYS" (disabled "NEEDS A SHIP" on water, "PARTY IS HERE"). Travelling moves the party, adds days, and reveals a radius-4 disk of fog (fog of war is optional, prop `fogOfWar`, off by default).
- Places list: all `E_POIS` sorted by distance from the party; click selects and centres.
- Legend of terrain colors and a status line ("READING TERRAIN…" / "TERRAIN READ FROM MAP").
- Party start: hex `16,25` (Ridgeton), Day 14.
- A legacy procedural hex map (`mapSource: 'Hex grid'`) remains in the file; Eridan is the chosen direction.

## State (Prototype component)
`page`, `invFilter`, `selItem`, `skFilter`, `selSkill`, `arming`, `bar[6]`, `ranks{nodeId:rank}`, `selTal`, `focus` (tree id), `day`, `eParty` (hex key "c,r"), `eSel`, `eExp` (explored hex set), `zoom`, `terReady`, `w` (viewport width). Initial talent ranks in `INIT`. In production these belong in the game's save/character model; the UI should read from it.

## Assets
- `assets/eridan.jpg` — Eridan continent map (2048×1536), user-supplied.
- `uploads/Eridan _ Current.jpg`, `uploads/The Tameless Shore _ Current.jpg` — original user map exports. Tameless Shore is a regional map that was not used because its layout does not align with Eridan.
- Icons are Unicode Elder Futhark glyphs (Noto Sans Runic) plus a few geometric symbols (◆ ◇ ✦ ✧ ▲ ▼ !). No icon files.
- Character portraits and title key art are placeholders.

## Open items
- Eridan is 2048px wide and looks soft at 4×. A higher-res export (8000px+) is needed; the grid constants scale linearly with image width.
- Auto terrain misreads some grey peaks and coastlines; plan a hand-authored terrain override table per hex.
- Place descriptions, region level ranges, quest text and all item/skill numbers are placeholder content.
- Character, Inventory, Skills and Talents pages have not had detailed iteration.
- Title menu items other than CONTINUE are stubs.

## Files
- `Aetherwyn Title.dc.html` — title screen
- `Aetherwyn Prototype.dc.html` — shell + Home + all five pages (markup at top, data and logic in the script at the bottom)
- `Aetherwyn Overview.dc.html` — earlier overview board of the pages
- `support.js` — template runtime needed to open the files
- `image-slot.js` — drag-and-drop image placeholder used for the title background
- `assets/eridan.jpg`, `uploads/*` — map images
