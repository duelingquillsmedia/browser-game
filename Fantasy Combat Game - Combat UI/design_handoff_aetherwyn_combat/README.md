# Handoff: Aetherwyn — Combat Screen

## Overview
The turn-based combat screen for Aetherwyn. Kel'hos (level 23 Elf Cleric) fights alone on the left, facing 4–6 enemies on the right split into a front rank and a back rank. The loop: pick a skill → pick a target → resolve → end turn → each enemy acts in speed order → new round.

This screen extends the out-of-combat UI (see `design_handoff_aetherwyn_ui/README.md`). It uses the same tokens, fonts and motifs, and those are repeated below so this file stands alone.

## About the Design Files
`Aetherwyn Combat.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behavior, not production code. Recreate it in the target environment (game engine UI layer such as Unity UI Toolkit, Godot or UMG, or a web stack) using that codebase's patterns. Combat rules in the prototype are placeholders. Move them into the game's real combat system and have the UI read from it.

The file uses a small template runtime (`support.js`): `{{ holes }}`, `<sc-for>`, `<sc-if>`, and a `class Component` whose `renderVals()` computes everything the template shows. Read `renderVals()` and `layout()` as the spec for derived state. Styling is inline, so every exact value is in the markup.

To view: open `Aetherwyn Combat.dc.html` in a browser from this folder (needs network for Google Fonts).

## Fidelity
**High-fidelity** for layout, color, type and interaction. **Placeholder** for all numbers (enemy stats, damage, hit/crit, flee odds), character art and the arena background.

## Canvas
- Fixed **1600×900** artboard, scaled to fit the window (`scale = min(vw/1600, vh/900)`), centered and letterboxed on `#050407`.
- Rows: header 60px / stage (fills) / HUD (auto, about 180px).

---

## Design Tokens

### Colors
Surfaces
- App `#0b090e`; letterbox `#050407`; HUD strip `#100d13`; panel `#141118`; cell/deep inset `#0e0c11`; slot fill `#120f16`; level-diamond fill `#1a1216`
- Borders: panel `rgba(232,200,170,.11)`, control `rgba(232,200,170,.16)`, divider `rgba(232,200,170,.08)`
- Header bg `radial-gradient(ellipse 80% 140% at 50% -60%, #1d1420 0%, #0b090e 70%)`
- Stripe fill `repeating-linear-gradient(135deg, rgba(232,200,170,.04) 0 4px, transparent 4px 8px), #120f16`

Text: ink `#f3ece4`, body `#ece6df`, secondary `#d8cfc6`, tertiary `#cfc6bd`, muted `#a39a93`, faint `#8a817b`, disabled `#6b625c`

Accent / semantic
- ember `#e08a72`, ember-deep `#b85c4a` (End Turn fill, bullets)
- hp `#d0604a` (bar `#7a2f22 → #d0604a`)
- mana `#5fc4d6` (bar `#1f5f6b → #5fc4d6`)
- gold `#d9b865` (AP, Faith, crits; empty pip border `#6b5a33`)
- green `#86c46f` (heals, Rooted), frost `#8fc6e6` (shield), enemy tag `#c9887a`

Schools: Radiant gold, Nature green, Protection mana, Racial ember.

### Typography
- **Cinzel** 600/700: titles, names, buttons, damage numbers
- **Alegreya Sans** 400/500: body, log, descriptions
- **JetBrains Mono** 500: labels, numbers, keycaps (9–11px, letter-spacing .06–.2em, uppercase)
- **Noto Sans Runic**: skill and status glyphs

Key sizes: encounter title Cinzel 700 17px; banner Cinzel 700 13px ls .3em; skill glyph 26px; floating damage Cinzel 700 22px (crit 30px); result title Cinzel 700 34px.

### Shape
Radius 4px on panels, 3px on buttons and chips, 2px on bars. AP and Faith pips are rotated squares (diamonds). Glows are `box-shadow 0 0 8–26px <color>`.

---

## Layout

### Header (60px)
- Left: eyebrow "ENCOUNTER · ASHEN HOLLOW", title "Cinder Cult Ambush".
- Center: **turn order** strip. Chips for the rest of this round, a divider "R{n+1}", then next round's full order, up to 12 chips, fading out to the right. Chip 34px (current actor 44px with glow). Tag = initials ("K", "CC", "AB"…). Kel'hos chip is ember; enemy chips `#c9887a`, or green while Rooted.
- Right: ROUND n, and **FLEE {chance}%**.

### Stage
- Full-bleed arena image (`image-slot#combat-arena`) with a vertical scrim `rgba(11,9,14,.7) → .05 → .1 → .85` and a faint ember floor glow.
- Banner, top center: "YOUR TURN" (ember) with a targeting hint or "{n} AP remaining", or "ENEMY TURN" (hp red) with the acting enemy's name.
- Grid `1fr : 1.55fr`, padding 46/24/12.
- **Player (left)**: tall art slot (height = available height − 50, max 400; width 0.68 × height) plus a 180px nameplate with a thin HP bar and a 2px frost shield line on top of it.
- **Enemies (right)**: front and back rank. `layout()` measures the stage and picks whichever arrangement gives larger units:
  - *Columns*: ranks side by side, units stacked; back rank raised 44px.
  - *Rows*: ranks stacked (back rank on top, indented 14%), units in a row.
  - Unit art is square, 48–150px. The nameplate (120–168px wide) shows the name, LV, an HP bar, status chips with turns left, and cur/max HP.
- Unit states:
  - Targetable: dashed ember border over the art, `cursor: crosshair`.
  - In area of effect: solid ember ring + glow, and a pale "ghost" segment on the HP bar showing the worst-case HP loss.
  - Acting: hp-red ring, a down-pointing marker above the unit, hp-red nameplate border.
  - Dead: 45% opacity and a "SLAIN" overlay.

### HUD
Columns `minmax(240,280) | 1fr | minmax(240,320)`.
1. **Status panel**: level diamond "23", name, class; Health bar (9px, frost shield overlay) with "412 / 468 +shield"; Mana bar (7px); **AP** 4 diamonds (12px); **Faith** 5 diamonds (8px); status chips (Ward, Bloom, Burning), each with turns left.
2. **Actions**:
   - Info line: the hovered or armed skill's name in its school color, meta line (school · AP · MP · Faith · CD · target type), description, and a red reason when it can't be used. With nothing selected it shows an idle hint.
   - **END TURN** sits on the right of this line (48px tall, ember fill, "SPACE" keycap).
   - Skill bar: 9 × 52px slots. Keycap top-left, AP cost top-right (gold), mana bottom-right (mana color), cooldown overlay with turns left. Unusable slots are 40% opacity. The armed slot gets a school-color border, a tinted fill and a glow.
   - Divider, then 2 item slots: HEAL (Q) and MANA (E), each with a quantity.
3. **Combat log**: panel header, 118px scroll area that auto-scrolls to the newest entry. Round separators are centered rules ("ROUND n"). Each entry is a sentence of colored segments: actor ember, skill in its school color, target in body color, numbers in hp red / green / frost.

### Result overlay
Stage dims to `rgba(11,9,14,.72)`, then a centered panel shows the round, a title, a line of text and **RESTART ENCOUNTER**.
- VICTORY (gold): shown when every enemy is dead.
- DEFEAT (hp red): Kel'hos at 0 HP.
- ESCAPED (frost): flee succeeded.

---

## Interaction

### Selecting a skill
- Click a slot or press **1–9**. Pressing the armed skill again, or **Esc**, cancels.
- A skill can't be armed while it is blocked. In order: not your turn, on cooldown, not enough AP, not enough mana, not enough Faith, nothing to purify.

### Targeting
- **Enemy skills**: every living enemy gets a click overlay.
  - Hover shows a preview to the left of the unit: "SKILL → TARGET", the damage range, HIT %, CRIT %, and notes: LETHAL / CAN KILL / KILLS ON CRIT, EXECUTE ×2, HITS n ENEMIES, the status applied.
  - Shapes: `single` hits the target. `line` hits every living enemy in the target's rank. `area` hits the target and its neighbours in the same rank.
- **Self skills**: Kel'hos's art gets a dashed mana-colored overlay and a mana ring. Hover shows the heal or shield preview; click casts.
- The empty art slots accept dropped images. Click overlays exist only while targeting, so the slots can take drops the rest of the time.

### Resolving a cast
- Pay AP, mana and Faith; start the cooldown. The prototype stores `cd+1` so the skill's own turn doesn't count.
- For each target: hit roll `max(5, hit − evasion)`, damage `rnd(min,max)`, ×2 if executing, ×1.5 on a crit. Then apply the status.
- Smite gives +1 Faith.
- Each result shows a floating number and a log line.

### Items
Cost 1 AP. Healing Draught restores 180 HP; Mana Tincture restores 220 mana. Keys **Q** and **E**.

### End turn (Space / Enter)
1. The phase switches to enemy. Living enemies act in descending speed, 380ms windup, then 520ms before the next one.
2. On each enemy's turn:
   - Consecrated: takes 30 damage first, and may die.
   - Rooted: skips its turn.
   - Otherwise it attacks. 8% dodge; Ward absorbs damage first; some enemies may apply Burning (2 turns).
3. New round:
   - AP back to 4, +40 mana, Ward expires, cooldowns tick down.
   - Bloom heals 48 (3 turns). Burning deals 18 (2 turns), and can't take Kel'hos below 1 HP.

### Flee
Chance = 35% + 10% per slain enemy, max 90%. On failure the turn ends.

### Feedback
- **Floating numbers**: rise 56px and fade over 1.35s (`dmgFloat` keyframes); horizontal jitter ±15%.
- Colors: damage ink, crit gold with "✦", heal green, shield frost, miss muted, status gold or green.
- **Hit flash**: a radial white-to-red flash over the unit, 0.45s.
- Keep both as animations whose state survives re-renders. Settings: `floatingNumbers`, `hitFlash`.

---

## Data (prototype placeholders)

Player: HP 412/468, Mana 530/610, Faith 3/5, AP 4/4. Mana regen +40 per round.

Skills (key: name, cost AP/MP/Faith, cooldown, target, effect):
1. Smite: 1/30/0, no CD, single. 64–78 damage, 95% hit, 12% crit, +1 Faith.
2. Judgment: 2/80/1, CD 2, single. 120–140 damage, ×2 below 35% HP, 90% hit, 15% crit.
3. Dawnbreak: 3/150/2, CD 4, whole rank. 150–170 damage, 100% hit, 10% crit.
4. Consecrate Ground: 2/90/0, CD 3, target + neighbours. 40–50 damage, then Consecrated for 2 turns (30 per turn).
5. Rootbind: 2/60/0, CD 3, single. 20–26 damage, Rooted for 2 turns, 85% hit.
6. Mend: 1/40/0, self. Heals 142–160.
7. Verdant Bloom: 1/55/0, CD 1, self. Heals 48 per turn for 3 turns.
8. Aegis Ward: 1/70/0, CD 2, self. Absorbs 180 until your next turn.
9. Purify: 1/35/0, CD 1, self. Removes Burning.

Enemies (`FOE_DEFS`; name, level, HP, rank, speed, attack damage, evasion, burn chance):
- Ashbound Brute: LV 24, 520 HP, front, speed 8, Cinder Slam 58–72, 0% evasion.
- Cinder Cultist (×2): LV 22, 300 HP, front, speed 12 and 11, Ember Lash 38–46, 5% evasion, 30% burn.
- Ember Wisp: LV 22, 180 HP, back, speed 18, Flicker 30–36, 20% evasion.
- Cult Pyromancer: LV 25, 340 HP, back, speed 10, Firebolt 70–86, 5% evasion, 50% burn.
- Hollow Warden: LV 26, 640 HP, back, speed 6, Grave Toll 80–96 (only in the 6-enemy lineup).

Lineups by `enemyCount`: 4 = Cultist, Brute, Wisp, Pyromancer; 5 = + second Cultist; 6 = + Warden.

## State
`hp, mana, faith, ap, shield, bloom, burning, cds{skill:turns}, qty{draught,tincture}, foes[{uid,…def,cur,st{rooted,consecrated}}], round, phase ('player'|'enemy'|'won'|'lost'|'fled'), acting, armed, hover, hoverSkill, floats[], hits{uid:count}, log[]`, plus the measured `sw/sh` and `scale`.

## Settings (props)
- `enemyCount` 4 | 5 | 6 (default 5; changing it resets the fight)
- `floatingNumbers` boolean (default true)
- `hitFlash` boolean (default true)

## Assets
- Art slots, to be filled with real art: `combat-arena` (16:9 background), `combat-kelhos` (tall, transparent PNG, facing right), `combat-foe-{uid}` (square, transparent PNG, facing left).
- Icons are Unicode runes (Noto Sans Runic). No icon files.

## Open items
- All balance numbers are placeholders.
- Enemy intent, Silverleaf Step and Sanctuary Circle are not implemented.
- The screen is not linked from the Home dashboard or the World Map yet.
- Tooltips on status chips use the native `title` attribute; replace them with styled tooltips.

## Files
- `Aetherwyn Combat.dc.html`: the combat screen
- `support.js`: template runtime needed to open the file
- `image-slot.js`: drag-and-drop art placeholder
