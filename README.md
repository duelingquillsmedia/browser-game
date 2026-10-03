# Age of Broken Wings

A browser-based, D&D SRD-inspired MMORPG set in the world of Eridan. Turn-based
combat, multiple fantasy races, and (eventually) guilds, PvP, and raids.

**A UI and combat overhaul is underway.** Three design handoffs live in this
repo — out-of-combat menus (`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/`),
Character Creation (`Fantasy Combat Game - Character Creation UI/design_handoff_aetherwyn_character_creation/`),
and the AP-based Combat screen (`Fantasy Combat Game - Combat UI/design_handoff_aetherwyn_combat/`)
— each with its own README for the full spec. "Aetherwyn" in those files is
this project's working title before the game was renamed; treat it as
synonymous with Age of Broken Wings. The out-of-combat UI has been rebuilt to
match its handoff one page at a time (Title, Home, Character, Inventory,
Skills, World Map, and now Character Creation — see below); Talents and the
AP-based Combat screen itself are still ahead. Building Character Creation
meant replacing the SRD species/class roster with the Character Creation
handoff's own smaller one (3 races, 5 classes — see below), so most of the
SRD-specific bullets in this section now describe superseded behavior except
where noted; the sections below describe what's live today.

## Status: Milestone 1.5 — real accounts + persistent characters

Milestone 1 proved out the core combat loop client-side only. This pass adds
real accounts and server-side persistence via Supabase, ahead of the full
client-server milestone (combat is still resolved in the browser for now).

- **Superseded by Character Creation, below**: 3 playable races (Elf, Human,
  Dwarf) carried over from the Character Creation handoff, each granting a
  flat ability score bonus (the handoff's own "10 + race + class" model, not
  the SRD's roll-or-point-buy) plus one named trait. Elf's Silverleaf Step
  (the first resource-costing action each combat costs 1 less), Dwarf's
  Stoneblood (poison resistance), and Human's Many Roads (+10% experience
  from every source, rounded, applied in `gainExperience`) are all real.
- A small Background system, loosely descended from the SRD 2024 rules'
  Background ability-score-increase mechanic: 4 backgrounds (Acolyte,
  Criminal, Sage, Soldier), each granting +1 to three named abilities. The
  Character Creation flow doesn't ask for one -- each class auto-picks a
  thematically fitting Background internally, purely for that stat bonus.
  **Origin feats (Alert, Magic Initiate, Savage Attacker, Skilled) — leftover
  SRD content layered on top of backgrounds — have been removed entirely**,
  along with the Magic Initiate "Minor Cantrip" bonus attack it granted:
  none of it was part of the Class Style Sheet reforge's own class kits, and
  it duplicated mechanics (initiative, damage variance, at-will attacks)
  those classes already have their own versions of.
- **Superseded by Character Creation, below**: 5 classes (Warrior, Rogue,
  Mage, Cleric, Druid) carried over from the Character Creation handoff,
  each with distinct actions, a class resource pool (or none, for Rogue),
  and its own flat ability score bonus. Every class's actual attack/heal/
  buff moves still resolve with the SRD-derived hit die, primary ability,
  and saving throw math described below -- only the roster and its ability
  bonuses changed; the AP-based skill kits in the Combat handoff (schools,
  ranks, statuses) await that screen's own rebuild.
- SRD 5.2.1-accurate combat resolution: ability modifiers, d20 attack rolls
  vs. AC, initiative, proficiency bonus (including on saving throws), crits
  (double damage dice) and fumbles, Advantage/Disadvantage, and damage types
  with Resistance/Vulnerability/Immunity — see [Combat Rules](#combat-rules).
- Turn-based combat against AI-controlled monsters, with a combat log, a
  proper Dodge action (Disadvantage on attackers, not a flat AC bump), an
  AoE save-for-half spell (Fireball), and once-per-combat abilities (e.g.
  Second Wind).
- Animated combat resolution: each action plays out beat-by-beat (an
  attack lunge, a hit flash and shake, floating damage/heal numbers, HP
  bars draining live) instead of jumping straight to the end state, with
  the combat log revealing one line at a time in step. The result screen
  waits for the final blow's animation to finish before appearing.
- A first real character sprite: an Elf Mage party member (Wizard's new
  name) now shows an animated idle/attack/hurt/die sprite in combat
  (contributed craftpix elf sprite sheets) instead of the generic portrait
  frame. Every other race/class combination still uses the generic portrait
  until more sprites are added.
- Goblin Raiders got the same treatment with two distinct animated models,
  so the two goblins in an encounter (e.g. Raiders on the Tameless Shore)
  read as individuals instead of copy-pasted clones. Which model a given
  Goblin Raider gets is picked deterministically from its own combatant id,
  so it stays consistent across a fight. Every other monster still uses the
  generic enemy portrait.
- A handful of low-level encounters flavored around Ridgeton's frontier —
  the Tameless Shore, Tiuv Forest, and Collmhor Wood — pulled from the
  project's own Encyclopedia of Eridan (see [Lore](#lore)).
- A first art pass: a textured background, an ornate HP bar, and portrait
  frames for party/enemy cards, drawn from a craftpix.net fantasy GUI kit
  (see [Assets](#assets)).
- Per-location battle backgrounds on the encounter-select and combat
  screens — coastline for the Tameless Shore, a wooded river valley for
  Tiuv Forest, jungle ruins for Collmhor Wood — plus a castle-towers
  skyline on the Ridgeton town hub.
- A home-base hub: sign in and land straight in Ridgeton (a logging town on
  the Tameless Shore) with your character already loaded, venture out to
  fight, and rest to heal between trips. There's no character-select step —
  Continue on the Title screen jumps directly to whichever character was
  played most recently (by `updated_at`, bumped on every save), or straight
  to Character Creation for an account that hasn't made one yet. An account
  can still hold more than one character (creating another via "New Game"
  doesn't delete the rest), there's just no roster-browsing UI to switch
  between them or delete one anymore; Sign Out moved from that removed
  screen onto the Home screen's Character card.
- A character sheet: full ability scores, race traits, Background, and
  current abilities, plus inventory and equipment slots (weapon/armor/
  accessory).
  Equipping gear is functional, not cosmetic — it changes AC and the
  damage die on your basic attack in combat. At creation, each class
  offers a choice of SRD-flavored starting loadouts (e.g. a Warrior picks
  between a longsword with a chain shirt or with lighter studded leather).
  Whichever's picked comes already equipped, plus a spare accessory to try
  swapping in.
- Real accounts (Google OAuth via Supabase Auth) and server-side character
  storage (Postgres via Supabase, row-level security scoped to the signed-in
  user) — see [Backend](#backend).
- **Cut from the interface (solo game for now)**: the Misfit Six companion
  system -- six Ridgeton Tales companions (Magnus, Magnar, Kel'dos,
  Dondalian, Telerek, Valeriek) a player could roll, configure, and bring
  along (up to three at once) from a Party screen, plus the multi-character
  combat that came with it (interleaved turn order, defeat only once the
  whole party is down, etc.). The engine-side implementation
  (`packages/engine/src/companions.ts`: `MISFIT_SIX`, `createCompanion`,
  `ensureCompanionRoster`, `setActiveParty`, and the `companions`/
  `activePartyIds` fields on `Character`) is untouched and still fully
  functional -- only the client-side UI (the old Party screen, Home's
  "Party" button, and `game/setup.ts`'s party-aware combat/rest helpers)
  was removed, so any previously-saved companion data survives in Supabase
  if this comes back later. `beginEncounter` now always fights solo.
- Class resource pools: Mages draw on Arcane, Clerics on Divinity, and
  Druids on Wylde — all three work like a classic MMO mana bar (start full,
  spend it on spells, trickle a little back each of the caster's own
  turns). Warriors build Rage from 0 by dealing or taking blows, then spend
  it on Slash/Second Wind — a builder/spender loop rather than a mana bar.
  Every ability bar slot shows its cost and grays out when it isn't
  affordable. Rogue doesn't have a resource pool yet.
- **New UI, first slice**: a Title screen and a Home dashboard rebuilt to
  match the Aetherwyn design handoff — dark-arcane theme (Cinzel/Alegreya
  Sans/JetBrains Mono/Noto Sans Runic, ember accent), a persistent header +
  left nav (`GameShell`), and a Home page with Character/World
  Map/Inventory/Skills/Talents cards. This replaces the old Town Hub screen.
  Talents has no backing system yet and shows "Coming soon." The World Map
  card's background is the real Eridan map art from the design handoff.
- **New Character page**: replaces the old character sheet, in the same
  visual system as Home. Identity + a 6-attribute list (with a one-line hint
  of what each governs), a 14-slot equipment paper-doll matching the design's
  layout, and a Background/Traits panel below. Only 3 of the 14
  slots are backed by real items today (Main Hand, Chest, Trinket) — the
  rest render as disabled placeholders rather than fake gear; equip/unequip/
  swap is fully functional on the 3 real slots via a small dropdown per
  slot. The Combat panel shows real derived stats (AC, Proficiency, DEX-based
  Initiative, Speed, equipped weapon) rather than the design's AP/tile stats,
  since combat itself hasn't been redesigned yet. Resistances/Vulnerabilities/
  Immunities are read from the character's real data.
- **New Inventory page**: a bag grid (20 cells) plus an item detail panel,
  in the same visual system. Filter tabs are by real item slot (All/Weapon/
  Armor/Accessory) rather than the design's Gear/Consumables/Materials/Quest
  split, since every item in the catalog today is equippable gear — there
  are no consumables, materials, or quest items yet. No rarity tiers or item
  levels either (the catalog doesn't have them), so items show in plain
  ink rather than rarity colors. The detail panel does show a real
  "vs. equipped" comparison (an AC delta for armor/accessories, dice/type
  for weapons) and fully-working Equip/Unequip. There's no sell/drop/gold
  economy, so those actions aren't offered. The design's 4-slot "Combat
  Belt" for battle-usable items is omitted — it depends on the AP-based
  combat system, which doesn't exist yet.
- **New Skills page**: a spellbook list plus a detail panel, in the same
  visual system, now the real destination for the Skills nav item/card
  (previously a bridge to the Character page). Filter tabs group abilities
  by their real `ActionKind` (Attack, Heal, Buff, Utility) instead of the
  design's Radiant/Nature/Protection/Racial "schools," which have no
  mechanical equivalent. Each skill's cost line reads from its actual
  resource cost and the caster's class resource name (e.g. "4 Arcane"),
  falling back to "At-will" for free actions, with cooldown/uses-per-fight
  shown when set — replacing the design's AP/MP/Faith costs and
  locked-by-level slots, since there's no AP system, Faith resource, or
  leveling-gated ability unlocks yet. The detail panel's stat grid (ability,
  target, dice, damage type, effect value) is built entirely from real
  `CombatActionDef` fields. The design's 6-slot manual action-bar assignment
  and talent-modifier sub-list are both omitted: real combat already shows
  every known action with no hotbar limit, and there's no talent system yet.
- **New World Map page**: replaces the old plain encounter-select screen,
  now wrapped in the persistent shell like every other page. It shows the
  real Eridan map art with pins at real place names pulled straight from
  the design handoff's own Eridan coordinate data — Ridgeton (home) plus
  the exact locations of the game's 3 real encounters (The Tameless Shore,
  Tiuv Forest, Collmhor Wood) — rather than inventing positions. Selecting
  a pin shows the encounter's real flavor text and foes (grouped/counted
  from its actual `monsterTemplateIds`, e.g. "2x Goblin Raider") with a
  Venture Out button that starts the fight, disabled while too wounded to
  travel, matching the old screen's behavior. The design's full hex-grid
  map — fog of war, per-region danger tiers, travel-day distances, procedural
  terrain — is omitted entirely, since none of that exists in the engine:
  there's no map-position/travel-time system, and encounter difficulty
  isn't leveled or region-gated today. The other named regions and points
  of interest from the design's map art (dungeons, shrines, other towns)
  are left unlabeled rather than turned into fake clickable content.
- **New Character Creation flow**: a 5-step wizard (Race → Class →
  Attributes → Appearance → Name) replacing the old single-page form,
  reached from a new working "NEW GAME" button on the Title screen. Building
  it meant adopting the Character Creation handoff's own smaller roster --
  3 races (Elf, Human, Dwarf) and 5 classes (Warrior, Rogue, Mage, Cleric,
  Druid) -- and its deterministic "10 + race bonus + class bonus" attribute
  model (**itself later replaced** by a per-level growth formula -- see
  "Race/Class Style Sheet: Per-Level Attribute Growth" near the bottom of
  this file), in place of the old SRD point-buy/rolled-stats step. The six
  ability scores are renamed to match (Constitution → Vitality, Charisma →
  Spirit; Strength/Dexterity/Intellect/Wisdom keep their names) -- **Spirit
  was later removed entirely** (see the Attribute-Driven Stats section
  below): it never fed any formula, save, or resource, just a flat stat
  with nothing attached, so the game now runs on five abilities, not six.
  Fighter
  and Wizard are renamed Warrior and Mage while keeping their existing
  actions and gear. Warrior's resource pool switched from the retired
  Prowess to Rage (gained on dealing *or taking* blows, matching the
  handoff's own Warrior flavor) -- freeing up the Rage pool from Barbarian,
  which was cut along with Bard, Monk, Paladin, Ranger, Sorcerer, and
  Warlock. Two Misfit Six companions changed class to fit the new roster:
  Magnar (was Barbarian) and Dondalian (was Paladin) are both Warriors now.
  The Attributes step is read-only (no more point-buy or 4d6 rolling in
  this flow -- companions still get one via `createCompanion`), and the
  Background/Origin-feat/starting-equipment choices from the old form are
  gone too; each class now auto-picks a thematically fitting Background
  internally (e.g. Mage → Sage) purely for its small stat bonus, with no
  player-facing step for it (Origin feats themselves were later removed
  entirely, per this section's own top bullet). The Appearance step's presets
  (six per race, real names/colors from the handoff's own `LOOKS` data) are
  stored on the new `Character.appearance` field but don't render a real
  portrait yet -- there's no character art pipeline, so the preview panel
  shows a race/class glyph instead of a fake photographic portrait. The
  design's per-race name pools are wired to a working Random name button.
  The actual tile/AP-based Combat screen this roster was built for is a
  separate, still-unbuilt handoff (`Fantasy Combat Game - Combat UI/`) --
  every class's moves still resolve through the existing SRD-derived attack/
  save math for now.

## Tech stack

TypeScript throughout.

- `packages/engine` — a UI-agnostic combat/character rules engine (dice,
  races, classes, characters, monsters, turn-based combat resolution). Pure
  functions with an injectable RNG, so it's fully unit-tested and reusable
  server-side once multiplayer combat needs to be authoritative.
- `apps/client` — a React + Vite single-page app that drives the engine and
  talks directly to Supabase for auth/persistence (no custom backend yet).

## Getting started

```bash
npm install
cp apps/client/.env.example apps/client/.env   # fill in your Supabase project's URL/key
npm run dev    # starts the client at http://localhost:5173
npm test       # runs the engine's unit tests
npm run build  # builds the engine and client
```

## Backend

Auth and character persistence run on Supabase (Postgres + Auth), talked to
directly from the client via `@supabase/supabase-js` — no custom server yet.

- **Schema**: one `characters` table (`id`, `user_id`, `data` jsonb, timestamps)
  in the project's `public` schema. `data` holds the full `@eridan/engine`
  `Character` object — including inventory/equipment — as schemaless jsonb,
  so adding those fields needed no migration; `id`/`user_id` are real
  Postgres columns for indexing and RLS.
- **Row-level security**: enabled, with policies restricting select/insert/
  update/delete to rows where `user_id = auth.uid()`. Verified directly
  against Postgres (simulating both the owning user and another user) that
  a user can fully manage their own characters and can't read, edit, or
  delete anyone else's.
- **Auth**: Google OAuth only via Supabase Auth (`AuthScreen`) -- the same
  button both signs up a first-time player and signs a returning one back
  in, since Supabase creates the account automatically on first Google
  sign-in. Requires one-time setup outside this repo (see below) before the
  button works.
- **Env vars**: `apps/client/.env` (gitignored) needs `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`.

### Enabling Google sign-in

The "Continue with Google" button is wired up in code, but Google is not
enabled as a provider by default — there's no API for this, it's a one-time
manual setup in two dashboards:

1. **Google Cloud Console** (`console.cloud.google.com` → APIs & Services →
   Credentials): create an OAuth 2.0 Client ID (type "Web application").
   - Add this **Authorized redirect URI**:
     `https://grhwedkojxidqrtzwdtd.supabase.co/auth/v1/callback`
   - You'll also need to configure the OAuth consent screen (app name,
     support email) if you haven't already for this Google Cloud project.
   - Copy the generated **Client ID** and **Client Secret**.
2. **Supabase Dashboard** (Authentication → Providers → Google): toggle it
   on, paste in the Client ID and Client Secret from step 1, and save.

No code changes or redeploys needed after that — it takes effect
immediately since the client just redirects to Supabase, which handles the
provider from there.

## Deployment

The site is deployed on Netlify (`ageofbrokenwings`, Git-linked to this repo)
at `ageofbrokenwings.duelingquills.com`, with a branch-preview URL per
non-production branch. Vite inlines `VITE_*` env vars at **build time**, so:

- The same two vars from `.env` must also be set as environment variables on
  the Netlify project (Site settings → Environment variables) — they don't
  come from the repo, since `.env` is gitignored.
- Changing them doesn't affect an already-built deploy — trigger a new
  deploy (push a commit, or "Trigger deploy" in the Netlify UI) afterward.

## Roadmap

1. ~~Single-player combat prototype~~ (milestone 1)
2. ~~Real accounts + persistent characters~~ (this milestone) → still to do:
   a shared zone/world and server-authoritative combat reusing
   `packages/engine` (currently combat still runs client-side).
3. Guilds, PvP duels/arenas, and group raids.
4. Expanded content: the Encyclopedia's remaining races (Bugbear, Goblin,
   Kobold), a larger item catalog (currently 13 starter items), currency
   and a shop, quests, and the full geography of Eridan.
5. Further art passes: character/monster sprites, and more per-location
   backgrounds as new encounters and locations get added.

## Combat Rules

Combat resolution (`packages/engine/src/combat.ts`) follows the **SRD 5.2.1**
(staged in Drive as `SRD_CC_v5.2.1.pdf`) wherever it fits a non-grid,
turn-based encounter. This work includes material from the System
Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd, licensed under the Creative
Commons Attribution 4.0 International License
(https://creativecommons.org/licenses/by/4.0/legalcode).

**Superseded:** the d20-vs-AC attack roll and Advantage/Disadvantage
mechanic described in this section were replaced by the percentage-based
hit/crit/save system in "Attribute-Driven Stats & Combat Math" below. The
rest of this section (damage types, saving throw proficiency, Fireball's
save-for-half shape, action cooldowns, the Unconscious condition) still
applies — only the underlying roll mechanic changed.

- **~~Advantage/Disadvantage~~ (superseded)**: previously rolled as two
  d20s, keeping the higher/lower, on the Defend action and against
  Unconscious targets. Defend now grants a flat evasion bonus instead of
  attacker Disadvantage; attacking an Unconscious target is still an
  automatic Critical Hit, just via a flag rather than a rigged roll.
- **Unconscious (homebrew, not SRD)**: a party member dropped to 0 HP falls
  Unconscious, which alone ends the fight in defeat — no Death Saving
  Throws, no chance to stabilize or claw back up mid-fight. Massive damage
  (overkill ≥ max HP) is an instant death instead, per SRD. Any hit against
  an Unconscious combatant is an automatic Critical Hit — our engine has no
  positioning, so this always applies rather than only "within 5 feet."
  Dropping the SRD's full death-save mini-game was a deliberate
  simplification: with no allies around to stabilize or heal a downed
  solo hero, rolling it out turn after turn added suspense without any
  real chance of changing the outcome.
- **Damage types + Resistance/Vulnerability/Immunity**: every attack and
  spell now has an SRD damage type (slashing, piercing, fire, radiant...).
  The resistance math (immunity zeroes, resistance halves and rounds down,
  vulnerability doubles, applied in that order) is implemented and unit
  tested against the SRD's own worked example, but no current monster has
  any — Eridan's frontier threats (goblins, wolves, orcs) are mundane and
  wouldn't in a real stat block either. It's ready for the first undead or
  elemental that should.
- **Saving throw proficiency**: each class's `savingThrowProficiencies` (already
  modeled, previously unused) now actually adds the proficiency bonus —
  e.g. a Rogue (proficient in Dex saves) is meaningfully better at Flee
  checks than a Fighter isn't.
- **Fireball**: a new Wizard spell demonstrating the SRD's save-for-half
  area rule — one damage roll, applied to every enemy, each rolling its
  own Dexterity save for half damage on a success.
- **Race hooks**: (Superseded by Character Creation, below, and then again
  by "Race/Class Style Sheet: Per-Level Attribute Growth" further down: the
  SRD-era Halfling's Lucky reroll, Orc's Relentless Endurance, and
  Dragonborn's Breath Weapon were removed along with those species; an
  Elf's Silverleaf Step — a once-per-combat resource discount — was that
  roster's own race-trait hook, later itself replaced by Elf's Spellcasters
  passive, below.) Origin feats (Alert's initiative bonus, Savage
  Attacker's reroll-and-keep-higher damage variance, Magic Initiate's bonus
  attack, Skilled) were also removed entirely — leftover SRD content that
  never belonged to the Class Style Sheet's own classes, layered awkwardly
  on top of them via Background.
- **Action cooldowns (homebrew, not SRD)**: each class's signature attack
  (Firebolt, Slash, Eldritch Blast...) is at-will, usable every turn like a
  cantrip. Bigger one-off effects (Fireball, Second Wind, Arcane Shield...)
  instead recharge on a multi-round cooldown rather than being exhausted
  for good after one or two uses. Enemies with more than one available
  attack pick between them at random instead of always the first, so a
  Goblin alternates Shortsword and Strike rather than using the identical
  move every turn.

**Deliberately not ported**, because they assume a grid this engine
doesn't have: cover, reach, opportunity attacks, and mounted/underwater
combat. Also out of scope for this pass: the SRD's full condition list
(Prone, Restrained, Poisoned, Frightened, Blinded...) beyond Unconscious,
since none of Eridan's current abilities can inflict them yet; bonus
actions/reactions as a separate action-economy slot, since no current
ability needs one; and temporary hit points, since nothing grants them.

## Attribute-Driven Stats & Combat Math (homebrew)

Design's Character Creation and Combat handoffs included stat formulas
(Health, resource pools, crit multiplier) explicitly marked as
placeholders, meant to be swapped for "the game's data definitions." This
pass (`packages/engine/src/stats.ts`) replaces the SRD's d20-vs-AC combat
roll and dice-based damage with attribute-scaled, percentage-based math
targeting the design's MMO-style numbers (health in the hundreds, hits in
the tens). The separate Combat handoff's AP-economy/ranks/schools/status-
effect system, deferred at the time this section was written, was built in
a later pass — see "AP-Economy Combat Rebuild" below.

Adopted directly from the design handoffs:
- **Health** = `100 + VIT×10 + class bonus` (class bonus: Warrior 60,
  Cleric/Druid 30, Rogue 20, Mage 0).
- **Caster resource max** (Mage/Cleric/Druid) = `80 + SPI×8 + INT×4`.
  Warrior's Rage is a flat 100-point pool instead (per the handoff's own
  flat placeholder), starting empty and filling from combat actions rather
  than regenerating each turn. (Superseded by the Class Style Sheet Reforge,
  below: every class's resource pool now uses its own formula, none of them
  reading SPI — see that section and Spirit's removal, further down.)
- **Critical hits deal ×1.5 damage**, per the Combat handoff.

Everything else numeric was invented for this pass, since the handoffs'
own values were placeholder and the engine has no grid/AP economy to hang
the originals on:
- **Evasion%** = `DEX × 1.5` (+ any gear evasion bonus), clamped 0–100.
- **Crit%** = `5 + DEX × 1.2`, clamped 0–100.
- **Hit%** = `90 − target's total evasion`, clamped to 10–99 so nothing is
  ever a guaranteed hit or an unhittable wall.
- **Save%** = `50 + (target's relevant score − caster's casting score) × 2`,
  +10 if the target is proficient in that save, +15 if also Dodging on a
  Dex save, clamped 0–100.
- **Damage/healing** = `ability score × the action's power coefficient ×
  an 85%–115% random variance`, rounded, +1.5× on a crit. Every action's
  old dice string (`"2d6"`) became a hand-tuned `power` number instead
  (e.g. Warrior Slash 1.8, Cleric Heal 3.2, basic Strike 1). Monster stat
  blocks became curated flat numbers the same way (Goblin Raider 75 HP,
  Dire Wolf 120, Orc Marauder 160), rebalanced and sanity-checked against
  the new player HP/damage range via simulated fights rather than a
  formula, since monsters were never attribute-derived to begin with.
- **Resource regen** (casters only) = `round(max × 8%)` per turn; Rage has
  no passive regen and instead fills from `gainOnBasicAttack`/
  `gainOnBeingStruck`, both raised from 3 to 15 to keep roughly the same
  "hits to fill" pacing against the new 100-point ceiling (was 20).

Field renames that came with this (engine + UI): `armorClass` →
`gearEvasionBonus` (Character) / `evasionBonus` (Monster, Combatant);
`tempArmorClassBonus` → `tempEvasionBonus`; `damageDice` → `damageBonus`
(a flat number on weapons, applied only to the basic Strike action, never
to class signature abilities); `CombatActionDef.dice` → `power`; classes'
`hitDie` was removed outright (Health no longer derives from it).
`proficiencyBonus` survives only for the Alert feat's initiative bonus and
the Flee saving throw — both still plain d20 rolls, untouched by this pass.
(Superseded further down: Origin feats, Alert included, were later removed
entirely, leaving `proficiencyBonus` feeding only the Flee saving throw.)

(Action Points, front/back ranks, skill schools, and status effects were
deferred at the time this section was written — see "AP-Economy Combat
Rebuild" below for that follow-up pass.)

## AP-Economy Combat Rebuild

Builds the piece of the Combat handoff (`Fantasy Combat Game - Combat UI/
design_handoff_aetherwyn_combat/`) deferred by the pass above: Action
Points, multi-enemy encounters in front/back ranks, a generic status-effect
engine, and skill schools — layered on top of the existing percentage-based
hit/crit/evasion math rather than replacing it. The handoff itself was
written for one hero vs. 4–6 enemies; this pass adapts it to a party-based
game with 5 classes and (for now) a single controlled character per fight.

- **Action Points**: every party member gets a 4-AP budget (`PLAYER_AP_PER_TURN`
  in `combat.ts`) that refills at the start of each of their own turns. A
  turn is no longer "pick exactly one action" — it's "spend AP across
  multiple actions, then End Turn" (a new always-available action,
  `apCost: 0`). Each action's `apCost` (new field on `CombatActionDef`,
  defaulting to 1) sits *alongside* its existing class-resource cost from
  the prior pass (Rage/Arcane/Divinity/Wylde), matching the handoff's own
  "1 AP / 30 Mana"-style skill costs — nothing about the resource-pool
  balancing from that pass was thrown out. Monsters are deliberately
  AP-exempt and keep today's one-action-per-turn AI, since the handoff's
  AP economy was only ever about the player's own turn.
- **Multi-enemy ranks**: `Combatant`/`MonsterTemplate` gained a `rank`
  ("front" | "back"). Attacks gained a `targetShape` (`single` default,
  `line` = every living member of the target's rank, `area` = the target
  plus its immediate rank-neighbors) resolved by `resolveTargetsForShape`
  in `combat.ts`. All 3 existing encounters (`apps/client/src/game/lore.ts`)
  became small mixed-rank lineups reusing two new back-rank monster
  templates (Goblin Slinger, Orc Shaman) sized against the existing
  goblin/direWolf/orcMarauder stat blocks — party-side ranks weren't
  needed yet (still a single controlled character) and aren't modeled.
- **Status effects** (`packages/engine/src/status.ts`, dependency-free from
  `combat.ts` so it's independently unit tested): a generic stackable list
  per combatant covering crowd-control (Rooted, Stunned — skips the
  afflicted combatant's next N turns), damage-over-time (Burning,
  Poisoned), heal-over-time (Bloom), and a shield (Ward, absorbing incoming
  damage until it's exhausted). Effects tick at the start of the affected
  combatant's own turn, not a global per-round tick; a DoT can never drop a
  party member below 1 HP (direct attack damage still can), but has no such
  floor against a monster — matching the design's own "can't take Kel'hos
  below 1 HP" placeholder rule, generalized. Every class gained one action
  built around a status effect it didn't have before (Warrior's Shield
  Bash → Stunned, Rogue's Venomous Strike → Poisoned, Mage's reworked
  Arcane Shield → Ward and new Chain Lightning → a `line`-shape attack,
  Cleric's Renewal → Bloom, Druid's Entangling Roots → Rooted).
- **Skill schools** (`packages/engine/src/schools.ts`): a small
  `SchoolId`/`color` registry (Radiant, Nature, Protection, Arcane,
  Martial, Shadow, Racial) matching the handoff's own school framing,
  purely presentational — an action's `schoolId` is read only by the UI for
  coloring, never by any engine mechanic.
- **UI**: `CombatScreen.tsx`'s enemy arena and side rail split into
  front/back sub-groups; hovering an enemy while a line/area attack is
  armed previews its exact affected set (via the newly-exported
  `previewTargetsForShape`) with a highlighted ring, not just the hovered
  tile. `ActionMenu.tsx` gained an always-visible End Turn button and a
  gold AP-cost badge per skill (alongside the existing resource-cost
  badge); `CombatantCard.tsx` gained rotated-diamond AP pips and a list of
  status-effect chips, replacing the single-tag status display.

**Deliberately out of scope for this pass**: combat-usable consumable
items (the handoff's Healing Draught/Mana Tincture item slots) — no
inventory-during-combat system exists yet, and this pass didn't build one.
Party-side ranks and a second, multi-character-party turn structure are
also untouched, since `apps/client/src/game/setup.ts` still builds a
single-character party on purpose (the Misfit Six companion system stays
unwired, per its own long-standing "Solo play for now" comment).

## Skills Page Action Bar

Adds the 6-slot action bar from the Out-of-Combat UI handoff's Skills page
(`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/`), matching its own
documented interaction exactly: select a skill, click "Place on Action Bar"
to arm placement (slots switch to dashed ember borders with a "Placing X.
Click a slot." hint), then click a slot to assign it — removing it from any
other slot it already occupied, so a skill only ever lives in one place.
Clicking a filled slot while nothing is armed selects that skill instead,
mirroring the spellbook list; a slotted skill's row also gets a small
"Slot N" tag. Removing is the same button, relabeled "Remove from Action
Bar" whenever the selected skill is already slotted.

This is a Skills-page organizational tool only, by design: it doesn't
change what's available in combat (`ActionMenu.tsx` still shows every
action the character knows, unchanged) — the handoff's own combat HUD skill
bar is a separate, larger 9-slot concept, and with only 3-4 real skills per
class today a 6-slot loadout wouldn't restrict anything meaningful yet
anyway. `Character` gained an `actionBarIds: (string | null)[]` field
(`ACTION_BAR_SLOT_COUNT = 6`, backfilled to all-`null` for characters saved
before this feature) and two pure helpers, `assignActionBarSlot`/
`clearActionBarSlot` in `packages/engine/src/character.ts`, following the
same `equipItem`/`unequipItem` pattern already used for gear. Persists
through the existing `onUpdateCharacter` → `updateCharacterInRoster` flow
(`apps/client/src/App.tsx`) — no Supabase migration needed, since the whole
`Character` already rides in one `data jsonb` column.

## MMO-Style Weapon Itemization

Replaces the last SRD-flavored item stat still in the engine: a weapon's
damage no longer comes from a flat bonus tacked onto the wielder's
ability-scaled Strike. Instead every weapon carries its own intrinsic
min-max damage range and type, WoW-tooltip style — `packages/engine/src/items.ts`'s
`ItemTemplate.damageMin`/`damageMax` replace the old flat `damageBonus`.
All starter weapons were renamed to a shared "Hunter's ___" line (Hunter's
Longsword, Shortbow, Staff, Mace, Knuckles, Dagger, Shortsword) marking them
as the plain baseline tier — future items are expected to add or modify
abilities on top of this, per design direction, rather than reworking this
baseline further.

- **Strike now rolls the equipped weapon's own range directly** (e.g. a
  Hunter's Shortbow's 7-10), uniformly, instead of `ability score × power ×
  variance`. A new **Attack Power** stat (`computeAttackPower` in
  `stats.ts`, `= ability score × 2`, shown on the Character sheet) converts
  the weapon's scaling ability into a flat bonus added on top of that roll
  (`computeAttackPowerBonusDamage`, `round(Attack Power × 0.15)`) — closer
  to WoW's real Attack Power model than a pure flat item bonus, without
  needing a weapon-speed/DPS system this turn-based engine has no use for.
  An unarmed Strike (no weapon equipped) falls back to the old ability-scaled
  formula unchanged, since there's no item range to roll.
- **Class abilities are untouched.** Slash, Firebolt, Smite, and every other
  signature ability still scale purely off `ability score × their own power
  coefficient × variance`, exactly as the earlier Attribute-Driven Stats
  pass left them — only the humble basic-attack Strike changed. This mirrors
  a real MMO's split between weapon-driven auto-attacks and stat-scaled
  special abilities/spells.
- **`Character`/`Combatant` gained `weaponDamageMin`/`weaponDamageMax`**
  (optional, undefined when unarmed), replacing the old single
  `weaponDamageBonus` field. Savage Attacker's "reroll and keep the higher
  result" now rerolls the weapon's own range instead of the old variance
  roll, for the same one-per-turn effect.
- Item tooltips (`InventoryScreen.tsx`, `CharacterScreen.tsx`) show the
  weapon's own advertised range verbatim (e.g. "14-20 Damage · Slashing
  (Strength)") — deliberately *not* including the Attack Power bonus, so
  the item card always reads the same regardless of who's looking at it,
  matching a real item tooltip. The Skills page shows the character's
  actual total (range + bonus) for their own Strike, since that's the
  number that matters mid-fight.

## Hex-Grid World Map

Replaces the World Map's flat background-image-with-pins placeholder with
the full pointy-top hex-grid exploration system from the Out-of-Combat UI
handoff's World Map page — not just a cosmetic hex overlay, but the whole
mechanical system: live terrain sampling, zoom/pan, a minimap, danger
tiers, day-based travel, and fog of war.

The handoff's own hex math, terrain classifier, and region/sea/POI data
were ported **verbatim** (same constants, same thresholds) from its
prototype (`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/Aetherwyn
Prototype.dc.html`), which is calibrated pixel-for-pixel against
`apps/client/src/assets/world/eridan-map.jpg` (confirmed byte-identical to
the handoff's own `assets/eridan.jpg` via checksum). The named places
aren't placeholder content either — all 28 regions, 11 seas, and 14 points
of interest were cross-checked against the project's real **Encyclopedia
of Eridan** and match genuine Eridan geography (Ridgeton, Eldrin City,
Bretten, Adania, the Winter Court, and every sea name check out).

- **`apps/client/src/game/eridanMap.ts`** — the hex geometry (axial
  coordinates, pixel↔hex conversion via cube rounding, hex distance) plus
  the region/sea/POI/terrain-color tables and the danger-tier/encounter-
  chance formulas, all pure data and math with no rendering concerns.
- **`apps/client/src/game/terrainSampler.ts`** — `sampleTerrain()` reads
  the map image's own pixels once (via an off-screen canvas) and classifies
  each of the grid's 1,794 hexes into plains/forest/highlands/peaks/snow/
  desert/water from an 11×11 sample around its center — entirely
  client-side, no hand-authored per-hex terrain data, no server round trip.
- **`Character` gained `worldMapState?: { day, partyHexKey,
  exploredHexKeys }`**, following the same optional-field-plus-backfill
  pattern as `actionBarIds`. Its starting value (Ridgeton, Day 1, a
  radius-5 fog reveal) is built client-side in
  `apps/client/src/game/setup.ts` and backfilled in `game/roster.ts`,
  rather than in the engine itself, since the hex geometry it depends on
  lives in the client's map module — no Supabase migration needed, same as
  every other character field riding in the `data jsonb` column.
- **`WorldMapScreen.tsx`** is a full rewrite: drag-to-pan (with a 5px
  threshold so a click still registers as a click), hover/select
  highlighting, zoom 2×–6× that keeps the view centered on the same point,
  a click-to-recenter minimap with a live viewport-rect indicator, a
  detail panel (region, terrain, danger tier, encounter chance, distance
  in days), a places list sorted by distance, and a terrain-color legend.

**Deliberate scope boundary**, to avoid destabilizing the existing game
loop: Home → Venture Out → fight → Result is untouched. Only the 3 hexes
matching today's real `ENCOUNTERS` (Tameless Shore, Tiuv Forest, Collmhor
Wood) show a working "Venture Out" button, reachable from anywhere on the
map with no forced travel first, exactly as before this pass. The other 13
handoff POIs (Ashvale, Eldrin City, Bretten, etc.) show real flavor text
and a working "Travel · N Days" button that advances the day counter and
reveals fog — but no fight yet, the same "not built yet" treatment already
used for Talents elsewhere in this app.

**Deliberate deviation from the prototype**: fog of war defaults **on**
here (the prototype defaults it off, since it exists for design review).
Discovering the map hex by hex fits a shipped game better than seeing the
whole continent from the first login.

## Combat UI Rebuild

Rebuilds the Combat screen's entire visual layer to match the **Combat UI
handoff** (`Fantasy Combat Game - Combat UI/design_handoff_aetherwyn_combat/`)
pixel-for-pixel, on top of the AP-economy mechanics already built earlier
this project (Action Points, multi-enemy ranks, status effects, skill
schools — all untouched by this pass). The handoff's own README turned out
to be unusually precise (exact grid formulas, exact pixel values for every
element), and a full verbatim read of its prototype source confirmed every
exact color, gradient, keyframe, and layout formula used below — and a
genuinely convenient fact: **the Combat handoff reuses the exact same
design tokens already ported into `theme/aow-theme.css`** for the World
Map/Skills/Character/Inventory pass, so Combat is now finally on the same
design system as the rest of the app instead of the older `App.css`
palette it used before.

- **Fixed 1600×900 canvas**, scaled to fit the window (`scale =
  min(innerWidth/1600, innerHeight/900)`) via a CSS `transform`, centered
  and letterboxed on `#050407` — verified by resizing the window and
  confirming both the scale and the enemy-layout algorithm below respond.
- **Turn-order strip** in the header, built from `state.turnOrder` — which
  turned out to be a better fit than the prototype's own logic: our
  initiative order is rolled once in `startCombat` and stays fixed for the
  whole fight, so "next round's order" is exact, not approximated, and
  there's no need to special-case the player always going first the way
  the prototype does.
- **Enemy layout** (`computeStageLayout` in `apps/client/src/game/combatDisplay.ts`)
  ports the handoff's exact "Columns vs. Rows, whichever yields the larger
  unit" measurement formula verbatim, driven by a `ResizeObserver` on the
  stage element exactly like the prototype's own `layout()`.
  Enlarging whichever art is on screen (real sprite or the existing
  initial-letter/portrait-frame fallback — only the Elf Mage and Goblin
  have real sprite sheets today) is a direct, intended consequence of
  adopting these sizing formulas.
- **Targeting preview tooltip** (SKILL → TARGET, damage range, HIT%/CRIT%,
  LETHAL/CAN KILL/KILLS ON CRIT/HITS n ENEMIES/status-applied notes) is
  powered by two new pure, non-mutating exports added to
  `packages/engine/src/combat.ts`: `previewAttack` (mirrors
  `resolveAttack`'s own hit/crit/damage-range math without rolling dice)
  and `fleeChancePercent` (the analytic odds behind the header's actual d20
  flee roll, not a re-invented formula). Both are covered by new tests in
  `combat.test.ts`.
- **Backgrounds**: `Encounter.backgroundImage` — already wired per
  encounter (Tameless Shore / Tiuv Forest / Collmhor Wood jpgs) — is
  exactly the same data as before; it just moved from a page-wide
  `<LocationBackdrop>` into the new stage's full-bleed arena art slot with
  the handoff's 4-stop scrim gradient. Setting a battle scene per encounter
  still works exactly as it always has.
- **Keyboard shortcuts** (1-9 arm/cancel a skill, Esc cancels, Space/Enter
  ends turn) are new, added to match the handoff's own interaction spec.

**Deliberate deviations**, all called out in code comments where they
land: Faith diamonds are omitted (Faith was a Cleric-only second resource
specific to the prototype's single showcased hero; every one of our four
classes already has exactly one resource pool, shown as the Mana-equivalent
bar); the two item slots (Heal/Mana potions) render per spec but disabled
with a "Coming soon" tooltip, since no in-combat consumable-item mechanic
exists yet — the same treatment already used for Talents nav and 13 of the
World Map's POIs; the result overlay's button stays "Continue" rather than
"Restart Encounter," since this game moves on to a rewards screen instead
of restarting the fight; and the "EXECUTE ×2" preview note is omitted, since
no execute-threshold mechanic exists in this engine.

`ActionMenu.tsx`, `CombatantCard.tsx`, `CombatLog.tsx`, `LocationBackdrop.tsx`,
`HealthBar.tsx`, and `ResourceBar.tsx` are deleted — fully superseded by the
new `components/combat/` (`CombatHeader`, `CombatStage`, `CombatHud`,
`CombatResultOverlay`) and the plain gradient bars built directly into them,
which needed sizes, shield/ghost overlays, and label formats too different
between contexts (a 6px stage nameplate bar vs. a 9px HUD bar vs. a 5px
enemy nameplate bar) for one shared component to serve cleanly.

## Character Screen Rebuild

Rebuilds the Character screen to match the **out-of-combat UI handoff**'s
"Paper Doll" Character page layout (`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/`,
`Aetherwyn Prototype.dc.html` lines 195-287) verbatim: identity panel,
attributes list, a 14-slot paper-doll equipment layout, Tempo/Offense/Defense
combat stat groups, and per-type resistance bars — all reusing
`theme/aow-theme.css`'s existing tokens, same as every other page.

- **Identity panel**: 40px glowing level diamond, 10px HP/resource bars
  (gradient fill + glow, exact colors from the handoff), attribute rows
  (`34px abbr | name+hint | total+modifier` grid) always showing their hint
  text rather than on hover — a correction found while extracting the
  prototype's actual source, since its own hint text turned out to render
  unconditionally despite the handoff README calling it "hover" text.
- **Equipment paper-doll**: 14 slots (6 unavailable-but-shown per side, plus
  Chest/Trinket/Main Hand as the three slot types this engine actually has)
  rendered as 44px (52px for the weapon row) tiles with a diagonal-stripe
  fill + border + glow colored by item rarity, ported verbatim from the
  handoff's `eqMap`/`stripe`/`hexA` helpers (now `equipmentTileStyle` in
  `apps/client/src/game/characterDisplay.ts`). Slot names hide below 1100px
  width, matching the handoff's own `window.innerWidth >= 1100` check
  (expressed here as a real `@media` query instead of a resize listener).
  Equip/unequip/swap controls — which the static handoff mockup doesn't
  need but this playable app does — are restyled to fit, not omitted.
- **Combat stat groups** (Tempo / Offense / Defense) and **Resistances**
  are computed by `combatStatGroups`/`resistanceRows` in the same
  `characterDisplay.ts`, each mapped onto whichever of the engine's real
  derived stats is the closest fit — see "Deliberate deviations" below for
  what didn't have one.

**Deliberate deviations**, since this engine's data model doesn't match the
handoff's showcased Cleric 1:1:
- **No XP bar.** This engine has no leveling/experience system at all
  (`Character.level` is fixed at creation) — an experience bar with no
  underlying value would be pure decoration, so it's omitted rather than
  faked.
- **No Faith diamonds**, for the same reason as the Combat rebuild: Faith
  was the showcased Cleric's second resource pool; every class here has
  exactly one, already shown as the HP-adjacent resource bar.
- **No item rarity.** Items have no rarity field, only a flavor `value` in
  gold — `rarityForItem` buckets that value into the handoff's five rarity
  tiers purely for tile coloring. It's a display-only, non-mechanical
  interpretation, not a fabricated game system.
- **Combat stat substitutions**: "Movement" → race `speed` in feet (this
  engine has no tile-based movement); the single "per-turn resource regen"
  → the class's own resource name (no separate Faith regen to show
  alongside it); "Armor" (a flat mitigation stat) → `gearEvasionBonus` (the
  actual flat evasion armor grants here); no separate "Healing Power" is
  shown since abilities scale off ability score + their own `power`
  coefficient rather than one dedicated healing stat.
- **Resistance bars from categorical flags, not a 0-100 scale.** The
  engine's resistances are per-damage-type resistant/vulnerable/immune
  flags (halve/double/zero incoming damage), not a hand-picked percentage
  per element — so bars show only a character's actual notable types:
  resistant → 50%, immune → a full gold bar, vulnerable → a full ember-red
  bar labeled "×2" (there's no vulnerability precedent in the source to
  copy, so this reversed-color treatment is designed, not ported).

## Class Style Sheet Reforge

Rebuilds every class from the ground up per the **Class Style Sheet**
(Google Drive, `Class Information/Age of Broken Wings - Class Style
Sheet.docx`), which defines the full release roster and replaces the old
five-class, mostly-mana-pool resource model with a **generator/spender
resource on all seven classes**: **Warrior, Soldier, Cleric, Ranger,
Rogue, Druid, Wizard** (Mage renamed in place, with a migration for
existing saves). A Basic Attack costs nothing and builds that class's
resource (more on a crit); every other action spends it. Five of the
seven pools are small fixed integers that start empty each fight —
Fury (100), Expertise (10), Prayer (5), Focus (5), Cunning (30) — a sharp
departure from the old big-mana-pool feel for Cleric in particular. Wylde
and Druid's Wizard-equivalent Arcana stay "mana-like": full at the start
of a fight, scaling with an ability score (Wisdom/Intellect × 6 — the
sheet gives no formula, so this coefficient is homebrew, same precedent
as this project's other derived-stat formulas).

- **Real dual melee/ranged weapon slots.** Every class's Basic Attack can
  now be thrown as melee or ranged, each scaling off its own equipped
  weapon — `ItemSlot` split into `meleeWeapon`/`rangedWeapon`, and
  `generateBasicAttacks` (character.ts) produces up to two concrete
  actions per character (only for slots that are actually filled; no
  "unarmed ranged" attack exists). The Character screen's weapon row
  became "Melee Weapon"/"Ranged Weapon" instead of the old single
  slot + disabled Off Hand.
- **A second damage/heal formula shape.** The sheet's numbers are all
  "50 + 10% of WIS," not the old `power × ability` coefficient — so
  `CombatActionDef` gained `flatBase`/`percentOfAbility`/
  `weaponDamageSource` fields, resolved by a new shared
  `computeBaseDamage` in combat.ts. Every pre-existing action keeps using
  the untouched original formula; only the sheet's new abilities use the
  new one. A weapon roll never gets an *extra* variance band on top of
  itself — the weapon's own min-max range already is the randomness,
  exactly like the old Basic-Attack-only special case this generalizes.
- **Level-gating is enforced for real.** Each ability's sheet-given level
  (`unlockLevel` on `CombatActionDef`) is now a hard requirement —
  `applyEquipmentEffects` filters `character.actions` by
  `character.level`. Since there's still no leveling/XP system, this
  means a level-1 character only knows their Basic Attack and lvl-1
  ability today; deliberate, so the data model doesn't need a second
  redesign once leveling ships.
- **Three new status-effect kinds** (status.ts): `guard` (Soldier's
  Readied / Rogue's Evasive Jab — a stacking flat hit-chance reduction,
  one stack spent per incoming attack regardless of outcome), `buff`
  (Warrior's Enrage / Wizard's Arcane Barrier — a flat, timed evasion
  bonus), and `proc` (Ranger's Barbed Arrow — primes the caster's own
  next N landed hits to also apply a linked effect). Guard/proc effects
  are given a long safety-net `turnsRemaining` at application time since
  they actually expire by stack count (`consumeStatusStack`), not by
  turn count.
- **Reused targeting, no new mechanic needed.** Cleave/Wylde Wrath ("every
  enemy in a row") map directly onto the existing `targetShape: "line"`;
  Radiant Beam ("target + adjacent") onto `targetShape: "area"`; Wylde
  Healing ("heal yourself or an ally") onto the existing `target: "ally"`,
  which already lets a caster select their own portrait.

**Deliberate reinterpretations**, where this engine has no real
equivalent to the sheet's mechanic:
- **Parry (Soldier) → +5 flat evasion.** The sheet gives no effect beyond
  the number, and there's no separate parry/riposte roll to hang it on.
- **"Armor" (Warrior's Enrage, Wizard's Arcane Barrier) → evasion.** Same
  substitution as the Character screen's own "Armor Bonus" stat — this
  engine has no flat damage-mitigation stat, only evasion.
- **Sharpshooter (Ranger) → applies to any ranged attack**, not
  specifically "with bows," since the engine tracks melee-vs-ranged only,
  not weapon sub-types.
- **Rogue's passive is left unimplemented.** The sheet itself says
  "Placeholder" for it — noted, not invented.

### Critical files
`packages/engine/src/resources.ts`, `stats.ts`, `status.ts`, `items.ts`,
`actions.ts`, `classes.ts`, `character.ts`, `combat.ts`, `companions.ts`;
`apps/client/src/game/sprites.ts`, `characterDisplay.ts`,
`combatDisplay.ts`, `roster.ts`; `apps/client/src/screens/
CharacterCreationScreen.tsx`, `CharacterScreen.tsx`, `InventoryScreen.tsx`,
`SkillsScreen.tsx`.

## XP & Leveling System

A WoW-style leveling loop: defeating monsters in combat grants XP,
accumulating toward each level's threshold (`xpToNextLevel(level) = 100 *
level^2` — homebrew, no prior curve existed to match) up to a **level cap
of 30**. A hunting-quest system that also awards XP through the same
`gainExperience` entry point is planned for a later pass; only
combat-victory XP is wired up so far.

- **Leveling grows max HP and resource pool only** — ability scores stay
  fixed at their creation-time value (race/class/background identity).
  `computeMaxHealth`/`computeResourceMax` (stats.ts) gained a required
  `level` parameter and now add `(level - 1) * HP_PER_LEVEL` (homebrew, 12)
  and, **only** for the two already ability-scaled "mana-like" pools
  (Wylde/Arcana), `(level - 1) * RESOURCE_PER_LEVEL` (homebrew, 8). The
  Class Style Sheet's other five pools (Fury, Expertise, Prayer, Focus,
  Cunning) are small fixed integers by design and stay exactly as
  specified, untouched by level.
- **`gainExperience(character, amount)`** (character.ts) is the single
  entry point for awarding XP from any source. It advances as many levels
  as the XP covers, discards overflow past the level cap rather than
  banking it, recomputes max HP/resource/proficiency bonus per level and
  **heals by the exact delta** (so leveling up never leaves a character
  relatively worse off than before), then rebuilds the action list via the
  same `applyEquipmentEffects` helper `equipItem`/`unequipItem` already use
  — so an ability unlocked by the new level (`unlockLevel` on
  `CombatActionDef`, from the Class Style Sheet reforge) is available
  immediately, and is reported back as `newlyUnlockedActions` for a "New
  ability learned!" UI moment.
- **Human's Many Roads trait is real.** It was authored as flavor text
  during the Race system build (`races.ts`), before any XP system existed
  to hook it into — `gainExperience` now applies its "+10% experience from
  every source" (rounded) the same way Elf's Silverleaf Step is checked in
  combat.ts: a direct `raceId === "human"` gate, since `RaceTrait` carries
  no structured effect data. The boosted amount (not the raw monster XP
  sum) is what `ExperienceGainResult.xpAwarded` reports, so the client's
  "+N XP" always shows what was actually applied.
- **Client wiring**: `apps/client/src/game/setup.ts`'s
  `applyCombatResults` only awards XP on a clean `party_won` (not a flee or
  a loss), summed from every defeated enemy's `MonsterTemplate.xpValue`
  (hand-tuned per template, same curated-stat-block precedent as their
  HP — 35 to 90 per monster in the three starting encounters). `App.tsx`
  computes it as soon as the fight ends and feeds it straight into the
  in-battle `CombatResultOverlay` popup (the dimmed-battlefield "VICTORY/
  DEFEAT/ESCAPED" panel) — there used to be a second, full-page
  `ResultScreen` shown after clicking that popup's Continue button, but a
  rewards popup and a rewards page one click apart was a redundant, jarring
  extra step, so it's gone; the popup itself now shows the XP gained and,
  on a level-up, a callout with the new level and any newly unlocked
  abilities, and Continue goes straight to Home. `HomeScreen.tsx` and
  `CharacterScreen.tsx` both got a third, thinner XP bar (reusing the
  handoff's existing gold gradient) alongside their HP/resource bars.

### Critical files
`packages/engine/src/stats.ts`, `character.ts`, `monsters.ts`, `combat.ts`;
`apps/client/src/game/setup.ts`, `App.tsx`; `apps/client/src/screens/
CharacterScreen.tsx`, `HomeScreen.tsx`, `CombatScreen.tsx`;
`apps/client/src/components/combat/CombatResultOverlay.tsx`, `CombatHud.tsx`,
`GameShell.tsx`.

## Town Hub: Gold, Potions, and Shops

A real gold economy, and an Inn/General Store/Blacksmith reachable from any
settlement on the World Map — not just the Home screen's own free Rest
button. `ItemTemplate.value` existed on every item from the start but was
explicitly flavor-only ("there's no wallet/shop yet"); this pass makes it a
real price.

- **`Character.gold`**: seeded at `STARTING_GOLD` (50, homebrew) for a new
  character; old saves backfill at 0, not the creation seed (same
  no-free-retroactive-reward precedent as XP's own backfill). Combat
  victories award gold alongside XP, summed from each defeated enemy's new
  `MonsterTemplate.goldValue` — hand-tuned like `xpValue`, with one
  deliberate exception: a Dire Wolf (a wild animal) carries none, while
  every humanoid raider does.
- **`buyItem`/`sellItem`/`useConsumable`** (character.ts) are the engine's
  new economy primitives: buying spends gold at an item's full `value` and
  adds it to inventory; selling refunds half that (`SELL_PRICE_RATIO`,
  homebrew) and throws if the item is currently equipped (unequip first);
  using a consumable applies its effect and removes it from inventory.
  `getItem(...)` throws for an unknown id exactly as before — buy/sell just
  build on top of `addItemToInventory`/`removeItemFromInventory`, new
  private helpers alongside them.
- **Potions are a new item shape, not a new slot.** `ItemTemplate.slot`
  became optional — a potion has none — plus a new `consumable: { restores:
  "hp" | "resource"; amount }` field. Two ship with this pass: Minor Healing
  Potion (80 HP) and Minor Resource Draught (40 resource, capped at
  whatever the class's pool actually holds). They're out-of-combat only —
  drunk from the General Store or later from the Inventory screen's new
  "Use" button — no changes to combat's action economy.
- **`restCharacter`** (game/setup.ts) was HP-only until now — a latent gap
  once classes got real level-scaled resource pools. It restores both HP
  and resource pool to full, free, and is shared by the Home screen's Rest
  button and every settlement's new Inn.
- **The Town Hub panel** (`apps/client/src/components/TownHubPanel.tsx`)
  appears on the World Map between the "SELECTED HEX" and "PLACES" panels,
  once the party has actually arrived at a settlement (`PointOfInterest`
  gained a `kind: "settlement" | "landmark"` field in `eridanMap.ts`, set
  from each place's existing free-text `type` — Town/City/Village/Port/
  Desert town are settlements; a Shrine, Fortress, or quest site isn't).
  Every settlement offers the same Inn/General Store/Blacksmith — no
  per-town customization yet. The Blacksmith buys and sells gear; there's
  no durability/repair system, so nothing ever needs fixing.

### Critical files
`packages/engine/src/character.ts`, `items.ts`, `monsters.ts`;
`apps/client/src/game/setup.ts`, `eridanMap.ts`;
`apps/client/src/screens/WorldMapScreen.tsx` (+ `.css`), `CharacterScreen.tsx`,
`InventoryScreen.tsx`; `apps/client/src/components/TownHubPanel.tsx`,
`ItemIcon.tsx`, `combat/CombatResultOverlay.tsx`.

## Spirit Attribute Removed

The game now runs on **five ability scores, not six** — Strength, Dexterity,
Vitality, Intellect, Wisdom. Spirit (originally Charisma, renamed during the
Character Creation rewrite — see above) was audited and confirmed to feed
no formula, save, or resource pool anywhere in the engine: a flat stat with
nothing mechanically attached to it, safe to remove outright rather than
needing a replacement mechanic.

- **`abilities.ts`**: `ABILITY_KEYS`/`ABILITY_NAMES`/`baseAbilityScores`
  drop Spirit; `STANDARD_ARRAY` (used for companion stat rolls) shrinks from
  six values to five (`[15, 14, 13, 12, 10]`, dropping the lowest).
- **Races/classes/backgrounds**: every `spi` entry in a race's, class's, or
  background's ability-score bonuses is gone, not replaced with a
  substitute stat — Human, Cleric, Druid, Wizard, and the Acolyte
  background each lose exactly the bonus points they used to grant to
  Spirit (no rebalancing pass; a straight removal, per the request).
  Cleric's `savingThrowProficiencies` drops from `["wis", "spi"]` to just
  `["wis"]` for the same reason — its Spirit entry never actually triggered
  a save anyway, since no action in the game rolls a Spirit save.
  `Background.abilityScores` changed from a fixed 3-ability tuple to a
  variable-length array so Acolyte (Spirit's only background user) can
  drop to two bonus abilities instead of needing a third invented in its
  place.
- **Monsters**: all 5 `MonsterTemplate`s drop their `spi` ability score.

### Critical files
`packages/engine/src/abilities.ts`, `races.ts`, `classes.ts`,
`backgrounds.ts`, `monsters.ts`; `apps/client/src/screens/
CharacterCreationScreen.tsx`, `CharacterScreen.tsx`.

## Race/Class Style Sheet: Per-Level Attribute Growth

Replaces the one-time flat "10 + race bonus + class bonus" attribute model
(Character Creation Rewrite, above) with the **Race Style Sheet** and an
update to the **Class Style Sheet** (both Google Drive, "Race Information"/
"Class Information"): every race and class now grows a few of its own
attributes *every level* instead of granting a fixed bonus once at
creation. Races grow on **odd levels** (1, 3, 5, ...), classes on **even
levels** (2, 4, 6, ...) — so a fresh level-1 character has only their race's
first tick of growth; the class's own growth doesn't start until level 2.

- **`Race.oddLevelAbilityGrowth`/`CharacterClass.evenLevelAbilityGrowth`**
  replace the old flat `abilityScoreBonuses` fields. **Elf**: Dex/Wis +2 per
  odd level. **Human**: all five abilities +1 per odd level. **Dwarf**:
  Str/Vit +2 per odd level. **Warrior**: Str/Vit +2, Dex +1 per even level.
  **Soldier**: Str/Dex +2, Vit +1. **Cleric**: Wis +2, Str/Vit +1.
  **Ranger**: Dex +2, Wis/Vit +1. **Rogue**: Dex +3 only. **Druid**: Wis +2,
  Vit/Dex +1. **Wizard**: Int +3 only. The Background system's own one-time
  +1×2-or-3 bonus (unrelated to either style sheet) is untouched.
- **`computeAbilityScores`** (character.ts) is the new single source of
  truth: `baseAbilityScores` (the raw creation-time stat block) plus the
  Background's flat bonus, plus the race's growth summed over every odd
  level up to the character's current level, plus the class's growth summed
  over every even level. It's **uncapped** — the old model's `Math.min(20,
  ...)` ceiling was an SRD holdover that no longer fits a character growing
  all the way to `LEVEL_CAP` (30) alongside this engine's other
  big, MMO-scale numbers (HP pools in the hundreds, resource pools scaling
  with level). `gainExperience` recomputes `abilityScores` (and derived
  max HP/resource) on every level gained, the same way it already
  recomputed max HP/resource pre-existing.
- **`Character.baseAbilityScores`** is a new stored field — the pre-Style-Sheet
  code baked race/class/background bonuses permanently into `abilityScores`
  with nothing preserving the original creation-time spread, so there was no
  way to later "regrow" a character under a different formula. A saved
  character from before this pass has its true base **recovered**
  (`recoverLegacyBaseAbilityScores`) by subtracting the old flat bonus
  tables back out of its current `abilityScores` — not perfectly exact if
  the old `Math.min(20, ...)` clamp ever silently truncated an overflow, but
  close enough for a one-time migration, and it only ever runs once per
  character.
- **Half-elf** is a new fourth playable race. Its own growth table is
  empty — instead, the player picks at creation which one ability doubles
  its racial growth (+2/odd level) and which two get the ordinary +1, plus
  borrows either Human's Adaptable or Elf's Spellcasters passive outright
  ("Of Two Bloodlines"). Modeled as `HalfElfChoice` (races.ts), threaded
  through `createCharacter`'s new `raceChoice` option and stored on
  `Character.raceChoice`. `CharacterCreationScreen.tsx` gains an inline
  chooser (three ability dropdowns that swap-on-conflict to stay distinct,
  plus a passive toggle) shown only when Half-elf is selected.
- **New race passives, resolved once via `resolveRacePassiveId`** (so a
  Half-elf's choice and a "pure" race's own passive share one code path):
  **Adaptable** (Human, or a Half-elf who chose it) is the old "Many
  Roads" +10% XP trait, renamed to match the sheet. **Spellcasters** (Elf,
  or a Half-elf who chose it) is new: +5% damage on any attack that isn't a
  weapon-scaled strike (Radiant Beam, Wylde Wrath, Elemental Shard, ...),
  replacing Elf's old Silverleaf Step (a once-per-combat resource discount,
  removed outright rather than kept alongside the new passive). **Axe-wielders**
  (Dwarf) is also new: +5 flat damage on a hit made with an equipped axe,
  replacing Dwarf's old Stoneblood poison resistance. Axes didn't exist as
  a concept in this engine before — `ItemTemplate.weaponCategory` and a new
  Dwarven Handaxe item were added so the passive has something to apply to.
- **`apps/client/src/screens/CharacterCreationScreen.tsx`**'s Attributes
  step now shows each ability's base/Background/race-at-level-1 columns
  (class contributes nothing yet at level 1) plus a plain-language "grows
  every odd/even level" summary, computed via the engine's own
  `computeAbilityScores` rather than a parallel client-side formula.

### Critical files
`packages/engine/src/races.ts`, `classes.ts`, `character.ts`, `combat.ts`,
`items.ts`; `packages/engine/src/__tests__/character.test.ts`,
`combat.test.ts`, `resources.test.ts`; `apps/client/src/game/appearance.ts`;
`apps/client/src/screens/CharacterCreationScreen.tsx` (+ `.css`),
`CharacterScreen.tsx`.

## Class Style Sheet: Official AP Costs

The Class Style Sheet (Google Drive) now states each leveled ability's AP
cost explicitly (e.g. "Cost 50 Fury & 2 AP"), replacing the homebrew AP
costs invented for the Class Style Sheet Reforge above. Most of those
homebrew guesses already matched the sheet's real numbers; three didn't and
were corrected: **Topple** (Soldier) and **Radiant Beam** (Cleric) are now
3 AP (were 2), and **Evasive Jab** (Rogue) is now 3 AP (was 2). Every other
leveled ability's AP cost was already correct and is unchanged. Basic
Attack, Defend, and Flee aren't covered by the sheet and keep their
existing default of 1 AP.

### Critical files
`packages/engine/src/classes.ts`.

## Background System Removed

The four Backgrounds (Acolyte, Criminal, Sage, Soldier) are gone. They were
leftover SRD-descended content that never surfaced as a player choice — each
class silently auto-picked one at creation purely for its flat +1-to-a-few-
abilities bonus — and added nothing else to the game. Removed outright, no
replacement mechanic or rebalancing pass, per the request: every class's
ability scores are now exactly `baseAbilityScores` plus race/class growth,
with no background bonus folded in anywhere.

- **`backgrounds.ts` deleted** and its export dropped from `index.ts`.
  `Character` and `CreateCharacterOptions` both lose `backgroundId`;
  `computeAbilityScores` drops its `background` parameter entirely.
- **`companions.ts`**: each Misfit Six template drops its `backgroundId`.
- **Legacy migration**: `recoverLegacyBaseAbilityScores` (used by
  `withStartingGearIfMissing` to reverse-engineer a pre-reforge character's
  `baseAbilityScores`) no longer subtracts a background's one-time bonus —
  an already-acknowledged source of imprecision for that migration path,
  same as its pre-existing `Math.min(20, ...)` clamp caveat.
- **Client**: `appearance.ts` drops `DEFAULT_BACKGROUND_BY_CLASS`. Character
  Creation's Attributes step loses its Background delta column (base/race/
  total remain); the Character screen's "Background & Traits" panel is now
  just "Traits" (race passive/traits only).

### Critical files
`packages/engine/src/character.ts`, `companions.ts`, `index.ts`;
`apps/client/src/game/appearance.ts`; `apps/client/src/screens/
CharacterCreationScreen.tsx` (+ `.css`), `CharacterScreen.tsx`.

## Initiative/Speed/Proficiency Bonus Dropped from the Character Screen

The Character screen's Combat panel no longer shows **Initiative**, **Speed**,
or **Proficiency Bonus** — display-only leftovers from the original SRD
character sheet that mean nothing under this engine's own combat math (a
flat percent-based hit/evasion/crit system, not d20-vs-DC). Removed from the
UI only: `proficiencyBonus` still exists on `Character` and still feeds the
Flee saving throw in `combat.ts`, and a race's `speed`/a character's
initiative modifier are still computed engine-side — none of that changed,
just what the sheet surfaces. Tempo now shows Action Points and (where the
class has one) resource-per-hit; Defense shows Health, Evasion, and Armor
Bonus.

### Critical files
`apps/client/src/game/characterDisplay.ts`.

## SRD-Flavored Naming Cleaned Up (Inventory & Skills)

A pass over the Inventory and Skills screens for more of the same kind of
leftover: no dead *stats* this time (everything numeric on both screens is
live and functional), but four D&D-flavored labels with no reason to still
say "D&D":

- **Inventory's "BAG OF HOLDING" panel** (a specific D&D magic item name) →
  **"BAG"**.
- **Item value's "gp" suffix** (D&D's gold-piece abbreviation) → **"gold"**,
  matching the game's own real gold currency.
- **Skills' "SPELLBOOK" list panel** — labeled that even for non-caster
  classes (a Warrior's kit isn't a spellbook) → **"ABILITIES"**.
- **A skill/class with no resource cost showing "At-will"** (a D&D 4e
  power-frequency term) → **"Free"** on a skill's own cost line (Skills
  screen), **"None"** on a class's resource-pool preview (Character
  Creation, the one other place the same fallback appeared).

Display-only renames; no engine or mechanical changes.

### Critical files
`apps/client/src/screens/InventoryScreen.tsx`, `SkillsScreen.tsx`,
`CharacterCreationScreen.tsx`.

## Attribute-Wiring Audit: Soldier's Basic Attack Fixed

A pass verifying every attribute is actually driving what the Class Style
Sheet and the Character screen's own hints say it does: STR into melee
weapon attacks, DEX into ranged weapon attacks plus evasion/crit chance/
initiative, and INT/WIS into Wizard/Cleric/Druid spells. Every leveled
ability's `percentOfAbility` already matched the sheet exactly (Mend/Nature's
Remedy/Wylde Healing 10%, Radiant Beam/Elemental Shard 20%, Wylde Wrath 25%,
Poisoned Throw 15%, Evasive Jab 20%, Arcane Barrier 50%), and DEX was already
correctly wired into `computeEvasion`, `computeCritChance`, and initiative
rolls -- only one real bug turned up:

- **Soldier's Basic Attack ignored "whichever of Strength/Dexterity is
  higher."** `generateBasicAttacks`'s `effectiveAbility` checked the
  equipped weapon's own default scaling ability (e.g. the starting
  shortsword's `ability: "dex"`, meant as a sensible default for whoever
  else wields it) *before* checking a class's `basicAttackAbilityMode`. A
  Soldier built for Strength would still have their Basic Attack silently
  locked onto Dexterity as long as they had a dex-tagged weapon equipped —
  which includes both of Soldier's own starting loadouts. Fixed by checking
  `basicAttackAbilityMode` first, so Soldier's own class rule always wins.

Every other class's Basic Attack was already correct: a plain weapon (no
`ability` override, e.g. the Warrior's longsword) falls back to the class's
`primaryAbility`; a caster's spellcasting-focus weapon (staff/mace) is
explicitly tagged with that class's own casting stat; every ranged weapon
is explicitly tagged `dex`. None of those paths go through
`basicAttackAbilityMode`, so they were never affected by this bug.

### Critical files
`packages/engine/src/character.ts`;
`packages/engine/src/__tests__/character.test.ts`.

## Class Style Sheet: Named, Explicitly-Scaled Basic Attack Variants

The Class Style Sheet's Basic Attack section (Google Drive, highlighted
yellow to flag the edit) went from a vague "damage based on equipped weapon
and ability scores" line to two fully named, explicitly-scaled variants per
class -- one melee, one ranged, each with its own ability and modifier %.
Detected by downloading the live `.docx` and parsing its `word/document.xml`
for `w:highlight` runs directly (Drive's plain-text export drops
formatting, so a highlight-based diff has to read the underlying XML).

| Class | Melee | Ranged |
|---|---|---|
| Warrior | Wild Swing — 20% STR | Wild Shot — 15% DEX |
| Soldier | Practiced Strike — 15% max(STR,DEX) | Steady Shot — 15% max(STR,DEX) |
| Cleric | Swinging Smite — 15% STR | Radiance — 15% WIS |
| Ranger | Blade Slash — 15% STR | Quick Shot — 20% DEX |
| Rogue | Subtle Slash — 15% STR | Quick Strike — 15% DEX |
| Druid | Nature's Strike — 15% STR | Nature's Blast — 15% WIS |
| Wizard | Arcane Smash — 15% STR | Arcane Bolt — 20% INT |

- **`classes.ts`**: new `BasicAttackVariant` type (`name`/`ability`/
  `percentOfAbility`); each class's old single `basicAttackName` string is
  replaced by `basicAttackMelee`/`basicAttackRanged`, one per row above.
- **`character.ts`'s `generateBasicAttacks`** no longer reads a weapon's own
  `ability` field at all for Basic Attack (that mechanic — "this weapon's
  default scaling stat" — belonged to the old, vaguer sheet wording); it
  names and scales strictly from the class's own variant, with Soldier's
  `basicAttackAbilityMode` overriding both variants' listed ability with
  "whichever of STR/DEX is higher" as before. An empty melee slot still
  falls back to the old unarmed, pure-ability-scaled strike (a homebrew
  fallback the sheet doesn't cover), since `weaponDamageSource`/
  `percentOfAbility` are now only set when a melee weapon is actually
  equipped.
- **Formula change, confirmed with the user**: a Basic Attack's flat bonus
  is now *exactly* its own `percentOfAbility` (e.g. Wild Swing's 20% of
  Strength), added to the weapon's own damage roll — this **replaces**,
  rather than stacks with, the homebrew "Attack Power" bonus
  (`computeAttackPowerBonusDamage`/`computeAttackPower`, ≈30% of the
  ability) that used to apply to every weapon-scaled action indiscriminately.
  Every other weapon-scaled ability the sheet doesn't cover (Cleave, Serrated
  Blade, Defensive Flourish, Topple, Evasive Jab, Poisoned Throw) keeps the
  old Attack-Power-based formula untouched, gated on the action's own
  `isBasicAttack` flag.
- **Client fix**: `SkillsScreen.tsx`'s own `powerRange` (a client-side
  mirror of `combat.ts`'s damage math, used for the Skills page's damage
  tooltip before a live `CombatState` exists) still unconditionally added
  the old Attack Power bonus, double-counting it alongside the new
  `percentOfAbility` for every Basic Attack. Fixed to skip it for
  `isBasicAttack` actions, matching the engine.

### Critical files
`packages/engine/src/classes.ts`, `character.ts`, `combat.ts`;
`packages/engine/src/__tests__/character.test.ts`, `combat.test.ts`;
`apps/client/src/screens/SkillsScreen.tsx`.

## Class Passives Surfaced on the Character Screen

The Traits panel used to show only race traits (plus a Half-elf's chosen
passive); a class's own Class Style Sheet passive — Warrior's Furious,
Soldier's Experience with a Blade, Ranger's Sharpshooter, and a
Wisdom/Intellect spellcasting note for Cleric/Druid/Wizard — existed only
as flavor text buried in `classes.ts`'s own doc comments, with no in-game
way to look it up. It's now a real, structured field.

- **`classes.ts`**: new `ClassPassive` type (`name`/`description`) and a
  `passives: ClassPassive[]` field on every class, populated from the
  sheet's own "Passive Abilities" section. Rogue's stays `[]` — the sheet
  itself still just says "Placeholder" there, so there's nothing to show
  rather than something invented. Cleric/Druid/Wizard's spellcasting note
  has no name in the sheet, so it's homebrew-titled "Spellcasting".
- **`CharacterScreen.tsx`**: the Traits panel now renders `cls.passives`
  as additional cards alongside the existing race trait(s), so a class's
  own passive is visible any time, not just recalled from memory.

### Critical files
`packages/engine/src/classes.ts`;
`packages/engine/src/__tests__/character.test.ts`;
`apps/client/src/screens/CharacterScreen.tsx`.

## World Map: Mouse Wheel Zooms Instead of Scrolling

The hex map's scrollable viewport (`overflow: auto`) used to treat the
mouse wheel as an ordinary scroll, panning the map up/down instead of
zooming it. The wheel now zooms in/out one `ZOOM_STEP` per tick (scrolling
up zooms in, down zooms out), reusing the same `changeZoom` the existing
+/- buttons already call, so behavior and bounds (`ZOOM_MIN`-`ZOOM_MAX`)
stay identical between the two. Click-and-drag panning is untouched.

React attaches its own `onWheel` as a **passive** listener, so calling
`preventDefault()` there can't actually stop the native scroll (the
browser has already committed to allowing it before the handler runs).
Worked around with a real `wheel` listener added directly to the viewport
DOM node via `addEventListener(..., { passive: false })` in a `useEffect`.

### Critical files
`apps/client/src/screens/WorldMapScreen.tsx`.

## World Map: Timed Travel with an Animated Party Dot

Selecting a distant hex used to move the party there instantly. Travel is
now timed in real-world seconds — 30 seconds per hex of distance, so a
4-hex journey takes 2 real minutes — with a dot animating smoothly along
the straight-line path of hexes between origin and destination while a
"TRAVELING" panel shows a live countdown and progress bar. Venture Out,
starting a new Travel, and the Town Hub are all disabled/hidden for the
duration; they re-enable the moment the party arrives.

The journey is stored as `WorldMapState.travel` (`{ toHexKey, startedAt,
arriveAt, days }`, epoch milliseconds) on the character itself rather than
component state, specifically so it survives navigating to another screen
and back, or a page reload — progress is always recomputed from the
current wall-clock time (`Date.now()`), never from a counter that only
ticks while mounted. A 150ms interval drives the countdown/animation and
calls the same `onUpdateCharacter` completion path once real time reaches
`arriveAt`, guarded by a ref so it can't double-fire; the actual
persistence call (`onUpdateCharacter`, which syncs to Supabase in the
background) only happens twice per journey — at start and at arrival — not
on every tick.

The dot's path is a straight line of hexes computed with the standard
cube-coordinate line-draw algorithm (lerp each endpoint's cube coordinates
at `hexDistance + 1` steps, round each to the nearest hex), added as a new
`hexLine()` helper in `eridanMap.ts` alongside a small `Cube`/`toCube`/
`cubeRound`/`cubeToOffset` coordinate-conversion set (reusing the file's
existing private `axial()` helper). The dot's on-screen position is then
linearly interpolated along that path by elapsed real time and rendered on
both the main hex map (an animated, pulsing SVG circle) and the minimap.

### Critical files
`packages/engine/src/character.ts`, `apps/client/src/game/eridanMap.ts`,
`apps/client/src/screens/WorldMapScreen.tsx` (+ `.css`).

## World Map: Venture Out Requires Actually Arriving

Selecting a hex with a quest/battle encounter used to show a "Venture Out"
button that dropped straight into combat regardless of how far away the
party actually was — travel was skipped entirely. The action button now
checks `isPartyHere` in addition to `matchedEncounter`: an encounter hex
selected from a distance still only offers "Travel · N Day(s)" (or shows
the disabled state while a journey to it is in progress), and "Venture
Out" appears only once the party has actually arrived at that hex. The
"too wounded to venture out" warning got the same `isPartyHere` guard so it
doesn't show up while merely previewing a distant encounter.

### Critical files
`apps/client/src/screens/WorldMapScreen.tsx`.

## Item Hover Tooltips (Inventory, Character, Shops)

Items previously only surfaced their name/stats via a plain browser `title`
attribute (Inventory bag cells, Character screen equipment tiles) or not at
all (Town Hub shop rows, which showed just a name and flavor line — no
stats). Hovering any item now shows a styled popup with its icon, name,
slot, stats (damage range/ability, or evasion bonus), full description,
a "vs. equipped" comparison when relevant, and its value — styled to match
the end-of-battle result popup (`CombatResultOverlay`'s `cbt-result-panel`:
dark panel, subtle border, heavy drop shadow).

A new generic `Tooltip` component (`components/Tooltip.tsx`) wraps any
hoverable element and portals the popup to `document.body` via
`createPortal`, so it's never clipped by a panel's `overflow` and always
renders above everything else. It follows the mouse, tracking `onMouseMove`
and sitting just to the left of the cursor (vertically centered on it) so
the player never has to look away to read it — flipping to the right when
there's no room on the left (e.g. hovering a bag cell near the screen's
left edge) — and clamps to the viewport so it's never cut off. The wrapper
itself uses `display: contents` so it never disturbs the grid/flex layout
of what it wraps (the Inventory bag grid, in particular, depends on this).
The tooltip panel itself is `pointer-events: none`, so moving the mouse
onto it can't flicker the hover state of the element underneath.

`ItemTooltipContent` (`components/ItemTooltipContent.tsx`) renders the
actual item info, reusing the same `.aow-item-name`/`.aow-item-stats`/
`.aow-item-flavor`/`.aow-item-compare`/`.aow-item-value` classes the
Inventory's existing item-detail panel already used, so the tooltip and
that panel stay visually consistent. `formatItemStats`/`compareToEquipped`
(previously duplicated verbatim in both `InventoryScreen.tsx` and
`CharacterScreen.tsx`) and a new `slotLabel` helper (fixing a latent
"MeleeWeapon"-with-no-space display bug along the way) moved into a shared
`game/itemDisplay.ts` module both screens — and the new tooltip — import
from.

Wired in everywhere the game shows an item: Inventory's bag cells, the
Character screen's equipment slots (including a plain-text hint for an
empty or not-yet-real slot), and every Town Hub shop row (General Store
potions, Blacksmith gear for sale, and your own gear up for sale, the last
showing its discounted sell price instead of full value).

### Critical files
`apps/client/src/components/Tooltip.tsx` (+ `.css`), `ItemTooltipContent.tsx`;
`apps/client/src/game/itemDisplay.ts`;
`apps/client/src/screens/InventoryScreen.tsx`, `CharacterScreen.tsx`;
`apps/client/src/components/TownHubPanel.tsx`.

## Combat Stat Breakdown Tooltips (Character Screen)

The Character screen's COMBAT panel (Attack Power, Critical Chance,
Critical Effect, Health, Evasion, Armor Bonus, Action Points, and the
class resource's per-hit gain) showed only a final number, so raising one
meant guessing which attribute drove it. Hovering any of these stats now
shows the same tooltip popup as items, but with a calculation breakdown
instead: the formula, each contributing term and its value (e.g. "Vitality
(11): +110"), a totaled sum, and — the actual point of this pass — a hint
naming exactly which attribute (or gear) to raise to increase it. A stat
with no real inputs (Action Points, Critical Effect, a class's fixed
resource-per-hit) still gets a tooltip, honestly labeled "Fixed for every
character" / "Fixed per class" so it's clear no attribute affects it.

`combatStatGroups` (`game/characterDisplay.ts`) now attaches a
`StatBreakdown` (`formula`/`factors`/`total`/`hint`) to every `CombatStatRow`,
computed from the same engine functions (`computeAttackPower`,
`computeCritChance`, `computeEvasion`, `CLASS_HEALTH_BONUS`) the plain
values already used — no new engine code, this only exposes the existing
math. Health's per-level growth term is backed out by subtraction
(`maxHp - 100 - vit*10 - classBonus`) rather than duplicating the engine's
private per-level constant. Armor Bonus's breakdown lists each actual
contributor (the equipped armor piece, accessory, and/or a class passive
like Soldier's) rather than just repeating the summed total. A new
`StatBreakdownTooltipContent` component renders it, reusing the same
`Tooltip` and `.aow-item-*`/`.aow-stat-row` classes the item tooltips and
plain stat rows already used, and each hoverable stat row gets a subtle
highlight + `cursor: help` on hover as a "there's more here" affordance.

### Critical files
`apps/client/src/game/characterDisplay.ts`;
`apps/client/src/components/StatBreakdownTooltipContent.tsx`;
`apps/client/src/screens/CharacterScreen.tsx` (+ `.css`).

## Character Stats Style Sheet: Physical/Magical Offense Split

The user added a **Character Stats Style Sheet** to the Google Drive
(`Statistics Information/Character Stats Style Sheet`), splitting the
Character screen's Offense into distinct Physical and Magical halves and
giving each its own formulas. This pass wires those formulas into the
actual game, not just the character sheet — confirmed with the user first,
since it changes real combat math for every fight, and that rescaling
armor's numbers (see below) was the right way to do it.

**New/changed formulas (all in `packages/engine/src/stats.ts`):**
- **Evasion**: `(Dexterity × 50%) + (Armor Rating × 5%)` — was `Dexterity × 1.5`
  with armor added at full value. `ARMOR_EVASION_RATIO = 0.05` is the new
  armor-to-evasion conversion.
- **Critical Chance**: `5% base + (ability × 10%)` — was `5 + dex × 1.2`.
  Physical keys off Dexterity as before; a new **Magical Critical Chance**
  keys off the caster's own spellcasting ability instead.
- **Critical Damage**: `150% base + (ability × 20%)` — replaces the flat
  `CRIT_MULTIPLIER = 1.5` every character used to share. Physical scales
  with Strength; a new **Magical Critical Damage** scales with the caster's
  spellcasting ability. `computeCritDamageMultiplier` replaces the old
  constant.
- **Attack Power** (`score × 2`) is unchanged in formula, but the Character
  screen's headline number is now read off the character's own *resolved*
  Basic Attack action (`character.actions.find(a => a.id === "strike-melee"
  | "strike-ranged")`) instead of re-deriving it from the equipped weapon's
  `ability` field — this automatically gets Soldier's "whichever of STR/DEX
  is higher" rule right without duplicating that logic, since the resolved
  action already has it baked in (see `generateBasicAttacks`'s
  `variantAbility`). A new **Spell Power** (same formula, INT for Wizard,
  WIS for Cleric/Druid) covers magical offense.

**Which classes get a Magical Offense section**: a new `magicalAttackAbility`
export (`classes.ts`) scans a class's Basic Attack variants and damaging
actions for a magical (INT/WIS) one; only Cleric, Druid, and Wizard have
one today (their ranged Basic Attack — Radiance/Nature's Blast/Arcane
Bolt — plus one leveled spell). Warrior/Soldier/Ranger/Rogue simply have no
Magical subsection at all, rather than showing one full of zeros.

**Real combat is now aware of physical vs. magical**: `combat.ts` picks the
crit-chance/crit-damage ability per action — a magical action (INT/WIS
`ability`) uses the caster's own matching score; every physical action uses
a fixed stat (Dexterity for chance, Strength for damage) regardless of
which ability its own base damage scales off of. This is a live gameplay
change: a Cleric's Radiant Beam now crits based on Wisdom, not Dexterity.

**Armor Rating rename + rescale**: since 5% of a small `evasionBonus` value
(e.g. Chain Shirt's old `+9`) would round to almost nothing, every such
field was renamed to `armorRating` *and* multiplied ~20× (Chain Shirt is
now `180`; Soldier's parry passive `5 → 100`) so gear still feels roughly
as impactful as before under the new 5% conversion. Renamed throughout:
`ItemTemplate.evasionBonus`, `CharacterClass.passiveEvasionBonus`,
`MonsterTemplate`/`Monster.evasionBonus`, `Character.gearEvasionBonus`, and
`Combatant.evasionBonus` all became `armorRating`/`passiveArmorRating`. No
migration was needed for existing saved characters — `armorRating` is
always recomputed from scratch on load by `withStartingGearIfMissing`
(→ `applyEquipmentEffects`), never read from the old stored field name.
Item tooltips and the Inventory/Blacksmith "vs. equipped" comparison line
now read "+N Armor" instead of "+N Evasion".

**Character screen layout**: the COMBAT panel's OFFENSE group now has
"PHYSICAL" and "MAGICAL" subheadings (the latter omitted for non-casters),
each with its own hover tooltip breakdown (reusing the existing
`StatBreakdownTooltipContent`/`Tooltip` from the prior pass) showing the
formula, the governing ability's score, and a hint on what to raise.
DEFENSE's "Armor Bonus" row was renamed "Armor" to match the sheet.

Verified with all 147 engine tests (several rewritten for the new
evasion/crit numbers, since the old ones encoded the previous formulas'
exact math), a clean build, and a live Playwright pass: a Warrior's sheet
shows only a Physical subsection while a Wizard's shows both, tooltip
breakdowns compute correctly (e.g. Wizard's Spell Power 22 = Intellect 11
× 2), item tooltips show the rescaled Armor values, and a real fight
(Warrior vs. goblins) resolves hits/misses/crits/damage without error under
the new math.

### Critical files
`packages/engine/src/stats.ts`, `abilities.ts`, `classes.ts`, `items.ts`,
`monsters.ts`, `character.ts`, `combat.ts`;
`packages/engine/src/__tests__/character.test.ts`, `combat.test.ts`,
`resources.test.ts`;
`apps/client/src/game/characterDisplay.ts`, `itemDisplay.ts`;
`apps/client/src/screens/CharacterScreen.tsx` (+ `.css`);
`apps/client/src/components/ItemTooltipContent.tsx`, `InventoryScreen.tsx`.

## Class Style Sheet: Reworded to Attack Power / Spell Power

The user reworded the Google Drive **Class Style Sheet** to describe most
class abilities as scaling off Attack Power/Spell Power (the Character
Stats Style Sheet's `ability score × 2` headline stats) instead of a raw
ability score — e.g. Wild Swing went from "20% of Strength" to "20% of
Attack Power". Wired into real combat math, same as every prior sheet pass.

**Implemented as a data-only change, no formula rewrite**: since Attack
Power and Spell Power are both just `ability score × 2`, "X% of Attack/Spell
Power" is mathematically identical to "(X×2)% of the raw ability score" —
the same score combat.ts already multiplies directly. So every affected
`percentOfAbility` (Basic Attack variants, Cleave, Mend, Radiant Beam,
Evasive Jab, Elemental Shard, Wylde Healing/Wrath, ...) and status `power`
coefficient (Arcane Barrier's evasion buff) in `classes.ts` was simply
doubled, with zero changes to `combat.ts`'s `computeBaseDamage`/
`previewBaseDamageRange` or the client's own duplicate preview formula in
`SkillsScreen.tsx`. Enrage was the one exception left undoubled — its sheet
text ties it to raw Vitality, not a Power-derived stat. Doc comments on
`BasicAttackVariant`, `CombatActionDef.percentOfAbility`, and
`StatusApplication.power` now explain the doubling convention so it isn't
mistaken for a bug later.

**Two real mechanic changes** (not just re-scaled coefficients):
- **Rogue's Basic Attack** now uses `basicAttackAbilityMode:
  "highestOfStrDex"` (the mode Soldier already had) per the sheet's "Attack
  Power = Dexterity × 2 or Strength × 2, whichever is higher."
- **Poisoned Throw**'s poison tick and **Barbed Arrow**'s bleed both moved
  from a weapon-damage basis to an ability-score basis, since the sheet now
  states them as "% of Attack Power": Poisoned Throw's `applyStatus` swapped
  `weaponPercent` for a pre-doubled `power`; Barbed Arrow's `resolveProc` in
  `combat.ts` now takes the triggering action and reads
  `actor.abilityScores[action.ability]` instead of the weapon's average
  damage roll.

**Confirmed with the user, not guessed**: Enrage and Arcane Barrier's buffs
stay a direct Evasion bonus — their sheet text now says "armor," but that's
wording, not a request to route them through the real Armor Rating stat
(which would need a further ~20× rescale to matter after the 5% conversion
from the previous pass).

Verified with all 147 engine tests (updated for the doubled coefficients and
Rogue's new tie-break ability, including a ripple into the cross-class
Basic Attack table test), clean engine/client builds, and a live Playwright
pass across Warrior/Wizard/Rogue confirming the Skills and Character screens
render the new damage ranges and Attack/Spell Power figures without error.

### Critical files
`packages/engine/src/classes.ts`, `combat.ts`, `actions.ts`, `status.ts`;
`packages/engine/src/__tests__/character.test.ts`, `combat.test.ts`.

## Combat Action Bar: Wired to the Skills Page, Basic Attack Consolidated

The user reported that rearranging skills on the Skills page's action bar had
no effect on what actually showed up in a fight. The bug: `CombatHud.tsx`
never read `Character.actionBarIds` at all -- it just took `player.actions`
in raw definition order and filled a hardcoded 9 slots positionally, while
the Skills page's own 6-slot `actionBarIds` (added in an earlier pass) sat
there purely decorative, exactly as its original README section admitted
("doesn't change what's available in combat"). Fixing that now means an
untouched `actionBarIds` (every save prior to this pass, since the field was
never functional) would otherwise leave a fresh fight with an empty bar --
handled by a computed default, not a data migration (see below).

**New shared module, `apps/client/src/game/actionBar.ts`**, is now the one
place both the Skills page and the Combat screen resolve slot contents from:
- `effectiveActionBarIds(actionBarIds, actions)`: returns the character's own
  stored bar if any slot is filled, otherwise a computed default (the first
  6 known skills, Basic Attack collapsed to one -- see below) so an
  untouched bar still fights sensibly. The computed default is never written
  back automatically; the Skills page materializes it into real stored data
  the moment the player makes their first edit (so an earlier default skill
  already shown in another slot doesn't appear to vanish).
- `buildActionBarSlots(actionBarIds, actions)`: resolves each of the 6 ids
  against a character's or a combat `Combatant`'s own action list into an
  `ActionBarSlot` (`empty` / a plain `action` / the combined `basicAttack`).

**Basic Attack no longer costs 2 of the 6 slots.** Since a class's melee and
ranged Basic Attack variants (`strike-melee`/`strike-ranged`, only both
present with a ranged weapon equipped) are really one concept, placing
either one on a slot now displays as a single "Basic Attack" entry
everywhere: the Skills page's ability list collapses them into one row (its
detail panel shows both variants' Ability/Damage side by side, under
"Melee"/"Ranged" sub-headings), and the same slot in real combat shows one
"BA" button. Clicking it -- with a ranged weapon equipped -- opens a small
flyout of the two real sub-actions just above it (`CombatHud.tsx`'s new
`BasicAttackSlot`) instead of arming anything itself; picking either sub-
action arms it exactly like any other skill and closes the flyout. With no
ranged weapon there's nothing to choose between, so the slot just behaves
like a plain single-action slot.

**Combat screen changes**: `CombatScreen`/`CombatHud` both dropped their own
ad-hoc "first 9 non-flee/endTurn actions" slot logic in favor of the shared
`buildActionBarSlots`, cutting the visible bar from a hardcoded 9 slots down
to the Skills page's real 6 (`ACTION_BAR_SLOT_COUNT`) and fixing the 1-9
keyboard shortcuts to 1-6, resolved against the same slot list (a numbered
key on a Basic Attack slot toggles its flyout, same as a click). `App.tsx`
passes the character's `actionBarIds` down to `CombatScreen` as a new prop.

Verified live: on a Ranger (whose default "bow & dagger" starting kit gives
both Basic Attack variants immediately), the Skills page's default bar
placed "Basic Attack" in slot 1 and "Defend" in slot 2 with zero manual
setup; entering a real fight showed the identical BA/DE arrangement;
clicking BA opened the flyout with "Blade Slash" (melee) and "Quick Shot"
(ranged) sub-buttons; picking Blade Slash armed it, and clicking an enemy
resolved a real hit through the engine ("Ranger hits Goblin Slinger with
Blade Slash for 9 piercing damage") -- all without a console error.

### Critical files
`apps/client/src/game/actionBar.ts` (new);
`apps/client/src/screens/SkillsScreen.tsx` (+ `.css`), `CombatScreen.tsx`
(+ `.css`);
`apps/client/src/components/combat/CombatHud.tsx`;
`apps/client/src/App.tsx`;
`apps/client/src/theme/aow-theme.css`.

## Pixel-Art Avatar Selection (Cleric)

The user added a **Character and NPC Sprites** folder to the Google Drive
with the project's first real portrait art: an 8-directional idle sprite set
for a male Cleric with black hair (`Pixel Art - Player Races/Cleric/Male -
Black Hair`). This wires up an avatar-selection system on Character
Creation's Appearance step, built to grow as more classes get art rather
than as a one-off for this single image.

**`CharacterAppearance` gained an optional `avatarId?: string`**
(`packages/engine/src/character.ts`) alongside its existing skin/hair/eyes
palette fields — purely cosmetic, same "the engine doesn't act on this
beyond storing it" contract as the rest of the interface. No other engine
change was needed: `appearance` was already a straight pass-through from
`CreateCharacterOptions` into `createCharacter`.

**New `apps/client/src/game/avatars.ts`** is the registry: `AVATARS_BY_CLASS`
maps a class id to its list of selectable `{ id, label, image }` options —
keyed by class, not race, so a player can pick this avatar regardless of
their own character's chosen race, even though the source art itself
depicts a half-elf. Only `cleric` has an entry today (the one image, saved
to `apps/client/src/assets/avatars/cleric-male-black-hair.png`); adding the
next class's art is just another array entry, no structural change. Two
helpers, `getAvatarsForClass`/`getAvatarById`, are shared by every screen
that needs to look one up.

**Character Creation** (`CharacterCreationScreen.tsx`): the Appearance step
now shows an "Avatar" grid of thumbnails above the existing "Palette" swatch
grid, only when `getAvatarsForClass(classId)` returns anything -- empty for
every class but Cleric today, so nothing changes for them beyond a reworded
note ("More pixel-art avatars are on the way for other classes..."). Picking
an avatar is optional, not required to continue. Switching class resets any
chosen avatar (`pickClass`), since options are class-specific. The live
preview panel and the final step's summary both reflect the choice; on
submit, `avatarId` rides along inside the same `appearance` object already
being built from the palette pick.

**Display**: `CharacterScreen.tsx`'s equipment portrait box (previously
name/class text only) now shows the chosen avatar image above that text,
via a new `getAvatarById(character.appearance?.avatarId)` lookup. Combat's
own sprite system (`game/sprites.ts`) was deliberately left untouched at
first, since it's keyed by `raceId:classId` and expects full
`idle/attack/hurt/die` frame sets this single idle-only portrait doesn't
have -- **now superseded by the next section**, which wires it in anyway
using the one idle frame for every state.

Verified live: creating a Cleric shows the avatar grid and lets you pick
the Black Hair option (both the live preview and the final summary reflect
it); creating any other class shows no avatar section at all; switching
from Cleric to Warrior mid-creation clears the pick; and the finished
character's screen shows the pixel portrait in its equipment frame --
all without a console error, and with all 147 engine tests still passing
(the new field is optional and additive).

### Critical files
`packages/engine/src/character.ts`;
`apps/client/src/game/avatars.ts` (new), `assets/avatars/` (new);
`apps/client/src/screens/CharacterCreationScreen.tsx` (+ `.css`),
`CharacterScreen.tsx` (+ `.css`).

## Cleric Avatar Refreshed + Wired Into Combat

The user replaced the Cleric sprite in the Google Drive with a new export
(same `Idle/rotations/south.png` shape, now 64×64 instead of 48×48) and
asked for the chosen avatar to also appear in real fights, not just
Character Creation and the Character screen.

**Art swap**: the new `south.png` was downloaded from the Drive's refreshed
`Cleric_Male_Fair-Skinned_Black_Hair/Idle` folder and now replaces
`apps/client/src/assets/avatars/cleric-male-black-hair.png` in place --
same filename, same `avatars.ts` registry entry, so nothing downstream
needed to change to pick up the new art.

**Combat wiring**: `Combatant` (`packages/engine/src/combat.ts`) gained an
optional `avatarId`, copied over in `toCombatant` from
`source.appearance?.avatarId` (party members only; monsters have none). On
the client, `game/sprites.ts` gained `getAvatarSprite(avatarId)`, which
wraps the chosen avatar's single portrait image as a `SpriteAnimationSet`
where `idle`/`attack`/`hurt`/`die` all just point at that same frame --
`CharacterSprite` already renders a length-1 sequence as a static image, so
this needed no changes there. `CombatStage.tsx`'s `UnitArt` now tries
`getAvatarSprite(combatant.avatarId)` before falling back to the existing
`raceId:classId`-keyed `getPartySprite` table, since a player's own avatar
pick is class-scoped and independent of race -- it should win regardless of
which race chose it. A new `cbt-unit-art-avatar` class keeps this native
pixel art crisp (`image-rendering: pixelated`) without affecting the
existing, already-high-resolution craftpix sprite sheets that share the
same rule.

Verified live: a Human Cleric who picked the avatar at creation now shows
the same pixel-art portrait — at its new, sharper resolution — in the
Character Creation preview, the Character screen, and, newly, standing in
for the old initials-in-a-frame placeholder in an actual fight (Raiders on
the Tameless Shore), all without a console error. Engine build/tests (147
passing) and client typecheck/build stayed clean throughout, since
`avatarId` is optional and additive everywhere it was added.

### Critical files
`packages/engine/src/combat.ts`;
`apps/client/src/assets/avatars/cleric-male-black-hair.png`;
`apps/client/src/game/sprites.ts`;
`apps/client/src/components/combat/CombatStage.tsx` (+ `CombatScreen.css`).

## Cleric Avatar: Bigger Portrait; Combat-Facing Art Deferred

The user asked for two follow-ups: make the Character screen's avatar
bigger and vertically centered, and use a south-east-facing pose in combat
so the party member visibly faces the enemies instead of the camera.

**Character screen portrait (done)**: `.aow-equipment-portrait-avatar`
grew from 140px to 220px and switched from `margin-bottom: auto` (which
pinned it to the top of the frame, flush above the name/class caption) to
`margin: auto 0`, splitting the leftover vertical space evenly above and
below it -- true centering in the portrait box, verified live.

**Combat-facing pose (infrastructure done, art blocked)**: `AvatarOption`
gained an optional `combatImage` field and `sprites.ts`'s `getAvatarSprite`
now prefers it over the south-facing `image` for combat specifically
(`combatImage ?? image`), so this is ready to use the moment real
south-east art exists. It doesn't yet, though: the Drive's south-east
export for this avatar (`Cleric_Male_Fair-Skinned_Black_Hair/Idle/rotations/
south-east.png`) came through with corrupted pixel data on **every one of
six separate download attempts** -- confirmed by decoding each attempt's
PNG and checking its IDAT chunk's zlib checksum, which failed every time
despite the file's outer container (dimensions, overall byte count) always
looking correct. Cross-comparing five independent transcriptions located
the disagreement to a couple of characters partway through the compressed
stream, and majority-voting across them got decompression to succeed for
all but the last few bytes of image data -- close, but not a clean, correct
image, and not worth shipping a subtly-broken sprite. `AVATARS_BY_CLASS`
leaves `combatImage` unset for now, so combat keeps showing the
working south-facing pose (a real sprite, just not turned toward the
enemies) rather than a blank or corrupted one. Re-exporting or re-sharing
that one file would let this finish with no other code changes needed.

### Critical files
`apps/client/src/screens/CharacterScreen.css`;
`apps/client/src/game/avatars.ts`, `sprites.ts`.

## Cleric Avatar: Combat-Facing Art Landed

The user re-exported the Cleric's south-east pose in the Drive and asked
for another attempt. The new `south-east.png` (same file ID as the six
corrupted attempts above, but a different `fileSize`/`modifiedTime` —
genuinely re-exported, not a stale reference) downloaded clean on the first
try: base64 length, decoded byte count, and every PNG chunk's CRC32 all
checked out, and PIL loaded it without error (64×64 RGBA, matching the
south-facing portrait's own new size from the pass above).

Saved as `apps/client/src/assets/avatars/cleric-male-black-hair-se.png` and
wired up as the Cleric's `combatImage` in `avatars.ts` — no other code
changes needed, since `getAvatarSprite`'s `combatImage ?? image`
preference was already built for this. The Cleric now visibly faces the
enemies in combat instead of the camera.

### Critical files
`apps/client/src/game/avatars.ts`.

## Ranged Spell Foci: Radiance, Arcane Bolt, Nature's Blast

Cleric, Druid, and Wizard have had a named ranged Basic Attack variant
(Radiance/Arcane Bolt/Nature's Blast — see "Class Style Sheet: Named,
Explicitly-Scaled Basic Attack Variants" above) since that pass, but no
starting kit ever equipped a `rangedWeapon`, so it was never actually
reachable in combat. Three new `rangedWeapon`-slot items in `items.ts` fix
that, one per class, each granting a ranged Basic Attack that deals a
distinct magical damage type (not a mundane physical one, so it reads as
genuinely a "spell" rather than a second weapon swing):

- **Radiance** (Cleric) — radiant, matching Radiant Beam's own school.
- **Arcane Bolt** (Wizard) — force, one of Elemental Shard's own damage types.
- **Nature's Blast** (Druid) — poison, distinct from Wylde Wrath's piercing
  vines so the two don't read as the same attack.

Each rolls its own small min-max damage range (9-13 for the WIS-scaled two,
matching Ashen Mace's own tier; 8-12 for Arcane Bolt, matching Oaken
Staff's), the same "weapon roll + Class Style Sheet's own percentOfAbility"
shape every other Basic Attack already uses — no combat.ts changes needed.

Cleric's and Wizard's starting equipment options now equip their class's
focus alongside whichever melee weapon the player picks, so both classes
start with a working melee **and** ranged Basic Attack. Druid's two options
diverge on purpose: "Ashen Mace, Nature's Blast & Leather Armor" gives the
melee+ranged pairing like the other two casters, while the existing
"Shortbow & Leather Armor" option is left untouched as a distinct
ranged-only, physical-arrow build for a player who wants that instead.

**Follow-up fix — item tooltips showed the wrong scaling stat.** The
Inventory/equipment tooltip (`itemDisplay.ts`'s `formatItemStats`) labeled a
weapon's scaling stat with `ABILITY_NAMES[item.ability]` — the item's own
stored `ability` field — which is stale for melee: `generateBasicAttacks`
always scales melee off the class's own `basicAttackMelee.ability` (str for
every class), never the weapon's. That made Ashen Mace's and Oaken Staff's
tooltips claim Wisdom/Intellect scaling even though their damage has always
used Strength in combat — a display-only bug, not a combat one. Fixed by
computing a display-only `powerLabel`: meleeWeapon always shows "Attack
Power"; rangedWeapon shows "Spell Power" when `isMagicalAbility(item.ability)`
(Radiance/Arcane Bolt/Nature's Blast) or "Attack Power" otherwise (Hunter's
Shortbow) — matching the Attack Power/Spell Power framing "Character Stats
Style Sheet: Physical/Magical Offense Split" already established elsewhere.
A ranged item's `ability` field is trustworthy for this (every one was set
to match its wielding class's own `basicAttackRanged.ability`), unlike
melee's.

### Critical files
`packages/engine/src/items.ts`, `classes.ts`;
`apps/client/src/components/ItemIcon.tsx`, `game/itemDisplay.ts`.

## Basic Attack: Permanent Q/E Slots Instead of an Action-Bar Slot

Reverted the previous pass's design (see "Combat Action Bar: Wired to the
Skills Page, Basic Attack Consolidated" above), per the user's own change of
mind: Basic Attack (melee and ranged) no longer competes for one of the
Skills page's 6 configurable slots at all. It's a permanent fixture instead,
always shown on its own two slots after the divider in combat -- taking over
the position and keybinds of the HEAL/MANA potion slots that were sitting
there as disabled "Coming soon" placeholders (no functioning potion-in-combat
system exists yet, so nothing real was displaced): melee on **Q**, ranged on
**E** (hidden -- rendered as a disabled empty slot -- for a character with no
ranged weapon equipped).

**`game/actionBar.ts`**: `ActionBarSlot` drops its `"basicAttack"` variant
(now just `{kind:"empty"} | {kind:"action"}`) -- `defaultActionBarIds` and
`buildActionBarSlots` both skip/blank out any `isBasicAttack` action instead
of special-casing it into a combo slot, so it can never land on the 6-slot
bar again, including for an old save with one still stored in a slot.
`getBasicAttackVariants` stays (still the one place that reads a
combatant's/character's `strike-melee`/`strike-ranged` actions), but its
role changes from "what the combo slot renders" to "what the two permanent
slots render." `BASIC_ATTACK_CANONICAL_ID`/`RANGED_STRIKE_ACTION_ID` are
gone -- nothing needs a canonical id to store on a slot anymore.

**`CombatHud.tsx`**: the old flyout (`BasicAttackSlot`, opened by clicking a
combo slot to reveal melee/ranged sub-buttons) is deleted along with the
HEAL/MANA placeholders -- `SkillSlot` itself now renders the melee/ranged
buttons directly, keyed "Q"/"E" instead of a numeric position (its `index`
prop became `keyLabel: string` to support this, and the now-pointless
`hideKey` prop -- only ever needed by the flyout's sub-buttons -- is gone
too).

**`CombatScreen.tsx`**: the `expandedSlot` state and its close-on-turn-end
effect are gone with the flyout. The keyboard handler adds plain `q`/`e`
cases (case-insensitive, alongside the existing `1`-`6`/Space/Escape) that
look up `getBasicAttackVariants(currentActor.actions)` and arm whichever
variant exists, exactly like clicking its slot.

**`SkillsScreen.tsx`**: since Basic Attack never lands on a bar slot, it's
no longer listed as a placeable ability at all -- `listActions` filters out
`isBasicAttack` actions, and all the combo-specific display logic (the
"Melee — X / Ranged — Y" detail-panel grid, the canonical-id juggling for
the ability list's "Slot N" tag) is deleted along with it. A player who
wants to see Radiance's or Arcane Bolt's numbers now does that from the
combat HUD's hover tooltip on its Q/E slot instead.

### Critical files
`apps/client/src/game/actionBar.ts`;
`apps/client/src/components/combat/CombatHud.tsx`;
`apps/client/src/screens/CombatScreen.tsx`, `SkillsScreen.tsx`.

## Resting No Longer Refills a Generator/Spender Resource Pool

"Town Hub: Gold, Potions, and Shops" above shipped `restCharacter` restoring
resource to its class's full max unconditionally -- fine for Wylde/Arcana
(Druid/Wizard), but wrong for the other five: `resources.ts` and
`stats.ts`'s own `computeResourceStart` already document that Fury/
Expertise/Prayer/Focus/Cunning (Warrior/Soldier/Cleric/Ranger/Rogue) are
generator/spender pools meant to start every fight at zero and get built up
by Basic Attacks -- `toCombatant` already uses `computeResourceStart` for a
fresh fight, but `restCharacter` bypassed that distinction entirely and
handed those five classes a full bar to spend from turn one, undoing the
whole "starts empty" design the moment the player rested.

Fixed by swapping `restCharacter`'s `computeResourceMax` call for
`computeResourceStart` -- the same function `toCombatant` already trusts for
"what should this class's resource be at the start of a fight." Resting now
reproduces exactly that: zero for the five fixed pools, a full refill for
Wylde/Arcana. HP is unaffected -- always restores to `maxHp` regardless of
class, same as before.

### Critical files
`apps/client/src/game/setup.ts`.

## Defend: +10% Evasion, Made Visible

Defend already worked mechanically (`resolveDefend` in `combat.ts` set
`dodging = true` and bumped `tempEvasionBonus`, which `effectiveEvasionBonus`
already folds into every incoming hit-chance roll against the defender) --
the user's report that it "might not do anything" was really a visibility
gap: nothing in the UI ever showed the buff was active, and its own flat
bonus (`DEFEND_EVASION_BONUS`) was 25, not the 10% asked for here.

- **`combat.ts`**: `DEFEND_EVASION_BONUS` is now `10` (was 25), and
  `resolveDefend`'s log line states the actual numbers ("+10% evasion and
  Advantage on Flee until their next turn") instead of vague flavor text.
- **`actions.ts`**: `DEFEND_ACTION.description` states the same numbers, so
  the Skills page and combat's hover tooltip show it too.
- **`CombatHud.tsx`**: the status-chip row (previously only ever populated
  from `player.statusEffects`) now also shows a "Defending" chip whenever
  `player.dodging` is true. Defend's buff isn't a real status effect (it's
  the older, bespoke `tempEvasionBonus`/`dodging` pair predating the
  status-effect system, and turning it into one wasn't needed just to fix
  its visibility) -- the chip is synthesized directly from `dodging` and
  styled with the same "buff" kind color as a real one, so it reads
  identically without changing how Defend itself is resolved.
- Updated `combat.test.ts`'s Defend hit-chance test for the new bonus (a
  foe's hit chance against a defending hero is now 90 - 7 (Dexterity
  evasion) - 10 (Defend) = 73%, not 58%).

### Critical files
`packages/engine/src/combat.ts`, `actions.ts`;
`packages/engine/src/__tests__/combat.test.ts`;
`apps/client/src/components/combat/CombatHud.tsx`.

## Goblin South-West Poses (Second Combat Variant Pipeline)

The Drive's "Goblins" folder (Character/NPC Sprites) holds two color
variants (Black Hair, Red Hair) from the same single-pose, 8-direction
mannequin generator already used for Cleric's avatar art -- a different
pipeline entirely from `goblin-1`/`goblin-2`'s existing craftpix sprite
sheets (10-frame animated idle/attack/hurt/die). Downloaded each variant's
`south-west.png` (the Red Hair one needed a second attempt -- its first
download failed the usual IDAT CRC check, same transcription-fidelity issue
documented in "Cleric Avatar: Bigger Portrait; Combat-Facing Art Deferred";
the retry came through clean) and wired them in as two more `goblin`
sprite variants, alongside the two existing animated ones, using the same
single-frame-for-every-state treatment as `getAvatarSprite` (no real
attack/hurt/die art for these either).

**South-west, not mirrored.** Enemies stand on the stage's right side and
every existing monster sprite is drawn facing right, then CSS-mirrored
(`scaleX(-1)`) to face the party on the left -- the exact mirror of why the
player's own avatar wanted a *south-east* combat pose (party stands on the
left, needs to face right, no mirror applied to party sprites at all).
South-west is already the correct facing for an enemy on the right to look
toward the party, so mirroring it would turn it the wrong way. Rather than
special-case these two variants deeper in the sprite-selection code,
`SpriteAnimationSet` gained an optional `preOriented` flag; `CombatStage.tsx`'s
`UnitArt` adds a `cbt-unit-art-preoriented` class instead of relying on the
usual enemy mirror when set, and `CombatScreen.css`'s
`.cbt-unit-art-enemy.cbt-unit-art-preoriented` rule resets the transform to
`none` (and adds `image-rendering: pixelated`, same reason the avatar rule
needs it -- small native pixel art scaled up to fill the portrait frame).

`CharacterSprite.tsx`'s `SpriteState` type was `keyof SpriteAnimationSet`,
which broke the moment a non-sequence field (`preOriented`) joined that
interface -- `frames[state]` could no longer be assumed to be a `string[]`.
Changed it to an explicit `"idle" | "attack" | "hurt" | "die"` union instead,
decoupling the animation-state type from whatever else the interface holds.

### Critical files
`apps/client/src/game/sprites.ts`;
`apps/client/src/components/combat/CombatStage.tsx`, `CharacterSprite.tsx`;
`apps/client/src/screens/CombatScreen.css`;
`apps/client/src/assets/sprites/goblin-mannequin/`.

**Follow-up, per the user's own call: the old craftpix goblin-1/goblin-2
sprite sheets are gone outright**, not kept as extra variants alongside the
two mannequin poses above. Removed `apps/client/src/assets/sprites/goblin-1`
and `goblin-2` (both the in-use PNGs and their unused `source/` originals),
and `sprites.ts`'s entire animated-sheet machinery that only those two ever
used -- the `goblin*` `import.meta.glob` calls, `groupByDir`, and
`goblinSet`. `MONSTER_SPRITE_VARIANTS.goblin` now lists only the two
`goblinMannequinSet` entries. A goblin encounter always shows one of the two
new single-pose looks now, picked the same deterministic way as before
(`pickVariant`, keyed off the combatant's own id) -- no animated
idle/attack/hurt/die goblin art exists in the project anymore.

## Dire Wolf South-West Pose

Same mannequin pipeline and treatment as the two Goblin variants above,
this time for the Tiuv Forest encounter's Dire Wolf (`direWolf` in
`monsters.ts`), which had no combat sprite at all before this (it fell back
to the generic initial-letter portrait). Only one color variant exists in
the Drive's "Dire_Wolf_Dark_Grey" folder so far, so `MONSTER_SPRITE_VARIANTS`
gets a single-entry `direWolf` array rather than the two-way pick a Goblin
fight gets.

The download needed a second attempt -- its first came through with the
same IDAT-CRC failure documented for the Cleric's and one Goblin variant's
south-east/south-west assets; the retry validated cleanly.

`goblinMannequinSet` was renamed to the class-agnostic `mannequinSet` (still
identical: wraps one image as every animation state, `preOriented: true`)
since it's no longer goblin-specific now that a second monster uses it.

### Critical files
`apps/client/src/game/sprites.ts`;
`apps/client/src/assets/sprites/direwolf-mannequin/`.

## Goblin Slinger South-West Pose

Same mannequin pipeline and treatment as the Goblin and Dire Wolf poses
above, this time for `goblinSlinger` (Tameless Shore's skirmisher, per
`monsters.ts`) -- it had no combat sprite at all before this, falling back
to the generic initial-letter portrait same as the Dire Wolf did. Sourced
from the Drive's "Goblin Crossbow" folder (`NPC_Goblin_Male_Green-Skinned_
Grey_Hair_Crossbow`), a distinct gear/hair variant from the plain Goblin's
two mannequin exports, so it gets its own `MONSTER_SPRITE_VARIANTS` entry
rather than joining `goblin`'s array. Only one variant exists for it so far,
same single-entry shape as `direWolf`.

The download validated cleanly on the very first attempt this time -- no
IDAT-CRC retry needed, unlike several of the other Drive assets pulled in
recent passes.

### Critical files
`apps/client/src/game/sprites.ts`;
`apps/client/src/assets/sprites/goblin-slinger-mannequin/`.

## World Map: Halt Travel Mid-Journey

A second button under the disabled "Traveling…" one, shown for the
duration of a timed journey (see "World Map: Timed Travel with an Animated
Party Dot" above): **Halt Travel**. Clicking it doesn't stop the party
instantly -- they can't teleport mid-hex -- so a confirmation note appears
below it ("Travel will halt at the next hex") while the journey keeps
running to that point.

Mechanically, `haltTravel` truncates the *in-progress* `TravelState` in
place rather than adding a separate "halted" completion path: it works out
how many hexes have actually elapsed (real time since `startedAt`, at the
same 30s-per-hex pacing `startTravel` set up), takes the next one along the
original route (`travelPath`, already computed for the animated dot), and
overwrites `travel` with a shorter journey ending there --
same `startedAt`, an `arriveAt` recomputed for that nearer hex, and `days`
reduced to match. The existing tick loop's `completeTravel` call needs no
changes at all: it just resolves against whatever `travel` currently holds,
so once the shortened arrival time passes, the party lands on that
intermediate hex exactly like any other arrival (fog reveal, day count,
`partyHexKey` update). Already on the final leg (nothing left to
shorten)? The click still shows the note, but the journey simply finishes
where it was already headed. `haltRequested` (and the button/note) resets
the moment a fresh journey starts via `startTravel`.

### Critical files
`apps/client/src/screens/WorldMapScreen.tsx`, `WorldMapScreen.css`.

## Character Select: Three Slots Between Title and Home

The user uploaded a new Aetherwyn design handoff to the repo
(`design_handoff_aetherwyn_character_select/`) for a Character Select
screen -- up to three character slots, standing between the Title screen
and Home, that this project didn't have before (Continue used to jump
straight to whichever character was played most recently, or straight to
Creation for an account with none). Both Title buttons (CONTINUE and NEW
GAME) now land on Character Select instead, and it's the only door into
Character Creation -- reachable solely from an empty slot -- which is what
makes the three-slot cap hold without any server-side enforcement.

**Data, not the prototype's sample/localStorage rig**: the handoff's own
`Aetherwyn Character Select.dc.html` is a static HTML reference with
hand-authored sample characters and a `localStorage['aetherwyn-slots']`
array standing in for a save system. This project already has a real one
(Supabase), so slots are the account's own characters instead --
`game/roster.ts`'s new `loadRoster()` fetches up to three, ordered
oldest-created-first so a player's first hero always lands in Slot 1, and
`deleteCharacterFromRoster()` backs the DELETE button. There's no `fresh`/
"NEW" tag: that flag exists in the prototype because its Character Creation
writes a transient `localStorage` marker Character Select reads on next
load, but this project's own Creation flow goes straight to Home after
`addCharacterToRoster`, so a hero is never actually seen freshly-made here.

**Two stats swapped for real ones**: the handoff's third stat tile is
"Played" (a play-time clock this engine has never tracked) -- swapped for
**Gold**, which the character actually has. "Last Played" reads real
`updated_at` (bumped on every save) formatted as Today/Yesterday/N days
ago, rather than the sample data's hand-written strings. "Location" reads
the party's current World Map hex through the same `POI_BY_HEX` lookup
`WorldMapScreen.tsx` already uses for its own header, pulled out into
`game/setup.ts`'s new `currentLocationName()` so both call sites share it.

**Visual porting, same pattern as every other Aetherwyn screen in this
project** (Title, Character Creation, Home, World Map, Character): fluid
layout with the shared `--aow-` design tokens (`theme/aow-theme.css`)
rather than the handoff's literal fixed 1600×900 scaled canvas, and pixel-
art portraits (`getAvatarById`, `image-rendering: pixelated`) in place of
the handoff's tall photo-style portrait crop -- falling back to a class-
colored runic glyph (mirroring Character Creation's own fallback) for the
six classes with no avatar art yet. Verified with a throwaway `sandbox.html`
Playwright pass (mock roster data, since this container's network policy
blocks outbound Supabase) confirming keyboard nav (1–3, arrows, Enter,
Delete/Backspace, Esc), slot selection, the empty-slot Create flow, and the
delete confirmation dialog including its failure path.

**Fix: hover no longer steals selection.** The handoff's own empty-slot
card selects itself on `onMouseEnter` (see its README: "Hovering it
selects the slot and turns the border ember"), ported as-is at first. In
practice that meant simply moving the mouse across an empty slot -- on the
way to anything else on the page -- silently deselected whichever filled
character was actually selected, with no click involved. Removed; an empty
slot now only reacts to an actual click (still going straight to Character
Creation, same as before), matching how every filled card already worked.

**Reachable from Home, not just Title.** A "Character Select" button sits
between Rest and Sign Out on the Home dashboard's Character card, so a
player can jump back to pick a different one of their (up to three) heroes
mid-session instead of having to sign out and back in first.

### Critical files
`apps/client/src/screens/CharacterSelectScreen.tsx` (+ `.css`);
`apps/client/src/game/roster.ts`, `setup.ts`; `apps/client/src/App.tsx`,
`apps/client/src/screens/HomeScreen.tsx`.

## Fix: Pre-Reforge "fighter" Classid Crashed On Load

Character Select surfaced a pre-existing bug the very first time the
account it hit had a real reason to load its roster and look closely at
the result: a level 1 Dwarf character named "Fighter," saved back on
2026-09-20 (`classId: "fighter"`) -- before the Character Creation reforge
even renamed that class to Warrior (see "New Character Creation flow"
above) -- crashed `getClass` with `Unknown class: "fighter"` on load,
because `withClassMigrationIfMissing` only ever handled the *later*
`mage` -> `wizard` rename from that same reforge, never `fighter` ->
`warrior` from it. Previously this was invisible: Continue's old
try/catch around `loadMostRecentCharacter` swallowed the error and quietly
dropped the player into Character Creation instead, as if they'd never
made a character at all. Nothing was ever lost -- the row sat untouched in
Supabase the whole time -- but Character Select's own error handling
surfaces load failures instead of hiding them, so this one finally became
visible instead of silently losing a real character from view.

Fixed at the root: `withClassMigrationIfMissing`'s single `mage` ->
`wizard` check became a small `LEGACY_CLASS_ID` table with both renames.
Both are safe to keep in the same one-way lookup -- `fighter` and the
original `wizard` were this engine's first SRD class names, and `wizard`
needs no entry of its own since it's meant the same class slot before and
after its own `mage` detour.

### Critical files
`packages/engine/src/character.ts`, `__tests__/character.test.ts`.

## Character Limit Enforced in the Database

Checking the fighter-classId account afterward turned up a bigger issue:
across many earlier testing sessions it had accumulated **10** characters,
not 3 -- Character Select's oldest-created-first slot assignment (see
above) surfaced the three *oldest* (mostly throwaway test characters),
leaving the account's actual, leveled-up Cleric invisible in every slot.
The user asked for the extras deleted (down to that one Cleric) and for
the three-character cap to be a real limiter rather than an assumption.

The 9 extra rows were deleted directly in Supabase. For the cap itself,
client-side gating (Character Creation only reachable from an empty slot)
was already there but isn't a real limit -- nothing stops a second tab, a
retry, or a future bug from inserting a fourth row straight past it. A
Postgres trigger closes that gap at the source: `trg_enforce_character_limit`
fires `before insert` on `characters`, counts the inserting user's existing
rows, and raises (aborting the insert) once that count is already 3. It
went in as a direct migration on the live project rather than a checked-in
SQL file, matching how the table itself was originally set up (see
"Supabase Backend" below) -- this repo has no migrations directory yet.
Verified by attempting 3 more inserts for the affected account inside a
rolled-back transaction: the third one hit the trigger's own exception
message cleanly, and the account's row count was unaffected afterward.

### Critical files
None in this repo -- a `characters` table trigger on the live Supabase
project (`grhwedkojxidqrtzwdtd`). `apps/client/src/game/roster.ts` and
`screens/CharacterSelectScreen.tsx`'s own doc comments were updated to
describe it.

## Character Screen: Racial/Class Boxes Show Actual Stat Growth

The Traits panel showed race and class passives (Spellcasters, Furious,
...) as one flat, unlabeled grid -- no indication of which came from race
vs. class, and no visibility at all into the numeric per-level ability
growth those two Style Sheets define (Race's `oddLevelAbilityGrowth`,
Class's `evenLevelAbilityGrowth` -- see "Race/Class Style Sheet: Per-Level
Attribute Growth"). The user asked to split it into a labeled Racial box
and a labeled box for the character's own class, each showing its passive
*and* its stat gains, so a player can actually see where their growth is
coming from.

Reused `.aow-skill-stat-group-label` (the same full-width group-label
treatment the Skills page already uses to split Basic Attack into
Melee/Ranged) to head each half of the grid: **RACIAL**, then the
character's own class name (**CLERIC**, **WARRIOR**, ...) -- matching the
user's own naming rather than a generic "CLASS" label. Each half gets a new
"Stat Growth" trait card alongside its existing passive card(s), reading
e.g. "+2 Wisdom, +1 Strength, +1 Vitality every even level." for a Cleric.

The one wrinkle was a Half-elf: `Race.oddLevelAbilityGrowth` is empty for
that entry (their real growth comes from the player's own creation-time
`HalfElfChoice` instead -- see races.ts), and that resolution logic
(`raceAbilityGrowth`) lived as a private helper inside `character.ts`'s
`computeAbilityScores`. Exported it rather than re-deriving the same
double/single-ability math client-side, so a Half-elf's box correctly shows
their own chosen growth (e.g. "+2 Wisdom, +1 Vitality, +1 Intellect every
odd level.") instead of an empty one.

### Critical files
`packages/engine/src/character.ts` (exports `raceAbilityGrowth`);
`apps/client/src/game/characterDisplay.ts` (new `racialStatGrowthText`/
`classStatGrowthText`); `apps/client/src/screens/CharacterScreen.tsx`.

## Ability Score Growth Audit + Gear-Granted Ability Bonuses

The user asked us to double check the Traits panel's new stat-growth math
against their own level 4 half-elf Cleric, whose Wisdom (doubled racial
growth + Cleric's own +2/even-level growth) they expected at +6 total but
saw a "+4" next to it. Traced it against the real character row in
Supabase: Wisdom was correctly 18 (10 base + 4 from two racial growth ticks
at levels 1/3, doubled since Wisdom was their chosen ability, + 4 from two
Cleric growth ticks at levels 2/4) -- exactly what `computeAbilityScores`
and its own dedicated test already lock in. The "+4" wasn't a growth total
at all: it was the classic D&D **ability modifier** (`floor((score-10)/2)`)
the Attributes panel showed next to every score, coincidentally reading
"+4" for an 18. Nothing was broken; the modifier badge was just easy to
misread as "how much this grew."

Since that badge measured something a player has little reason to care
about turn-to-turn (it isn't used in any of this engine's own math -- see
dice.ts's `abilityModifier`, kept only for the ability-check-style rolls
this system doesn't use), the user asked to replace it with something
actually actionable: **how much of this score comes from equipped gear**,
shown as a green `(+N)` badge that's hidden entirely when gear contributes
nothing, with a hover tooltip (reusing the Combat panel's own
`StatBreakdownTooltipContent`) breaking the total down per item.

**This meant actually wiring gear into ability scores for the first time**
-- previously equipment only touched armor rating, weapon damage, and
resistances; ability scores were purely race growth + class growth, gear
had no opinion on them at all. New pieces:
- **`ItemTemplate.abilityBonuses`** (items.ts): a flat per-ability bonus
  while equipped, any slot. Given to the two existing "probably magic"
  accessories that had flavor text but no mechanical hook yet: **Ring of
  Warding** (+3 Wisdom) and **Lucky Charm** (+1 Dexterity) -- homebrew
  values, not from any design doc, picked to actually exercise the new
  mechanic on gear players already own rather than shipping it dead.
- **`equipmentAbilityBonuses`** (character.ts, exported): sums every
  equipped slot's `abilityBonuses` into one `Partial<Record<AbilityKey,
  number>>`. Used both by the engine (below) and the client's new
  `gearAbilityBonus`/`gearAbilityBreakdown` (characterDisplay.ts) for the
  badge and its tooltip.
- **`applyEquipmentEffects`** (the function `equipItem`/`unequipItem`/
  `withStartingGearIfMissing`/`createCharacter` all funnel through) now
  rebuilds `abilityScores` from scratch on every call -- race/class growth
  via the existing `computeAbilityScores`, plus current gear bonuses on
  top -- rather than never touching ability scores at all. Rebuilding from
  `baseAbilityScores` each time (not adjusting incrementally) means
  repeated equip/unequip cycles can never compound or leave a stale bonus
  behind. It also now recomputes `maxHp` and clamps current `hp` to it, so
  a future Vitality-granting item stays correct immediately rather than
  waiting for the next level-up.
- **`gainExperience`** (leveling up) previously recomputed `abilityScores`
  from growth alone, which would have silently dropped any equipped gear
  bonus on every level-up. Now goes through the same gear-aware path.

**Fix: gear bonuses weren't showing up on item tooltips.** The Attributes
panel's new `(+3)` badge came straight from `equipmentAbilityBonuses`, but
`itemDisplay.ts`'s `formatItemStats` -- the shared "stat line" every item
tooltip and detail panel actually renders (Character screen's equipment
slots, the Inventory bag's tooltips, and its own Item detail panel) -- only
ever listed `damageMin`/`damageMax` and `armorRating`. It had no idea
`abilityBonuses` existed, so a Ring of Warding's tooltip showed "+120
Armor" and stopped there, with no mention of its +3 Wisdom at all. Added
an `+N {Ability}` segment per bonus to that same shared formatter, so it
now reads "+120 Armor · +3 Wisdom" everywhere the item appears.

### Critical files
`packages/engine/src/items.ts`, `character.ts` (+
`__tests__/character.test.ts`); `apps/client/src/game/characterDisplay.ts`,
`itemDisplay.ts`; `apps/client/src/screens/CharacterScreen.tsx` (+ `.css`).

## Hit Chance: WoW-Style Level-Gap Formula

The user asked how hit chance was calculated, then asked to redo it to
match World of Warcraft's own system. Researched Classic WoW's actual
mechanic (Wowpedia/Warcraft Wiki's "Weapon skill" and "Miss" pages): melee
hit is driven by **Weapon Skill vs. Defense Skill**, not a stat like
Dexterity -- 5% base miss at even skill, +0.1% per point the defender's
skill exceeds the attacker's up to a 10-point gap, then a much steeper
+0.4%/point beyond it. Both skills are just level x5 under the hood.

The catch: this engine had no monster levels at all (only a front/back
rank), so there was nothing for a level-gap formula to compare against.
Rather than guess, asked the user to pick a direction -- they chose adding
real monster levels and building the full Classic-style curve, over a
simpler Retail-style flat-penalty version or reusing existing stats as a
stand-in.

**`MonsterTemplate.level`** (new): hand-tuned per encounter tier rather
than derived from HP/XP -- `goblin`/`goblinSlinger` 1, `direWolf` 2,
`orcMarauder`/`orcShaman` 3, matching which of the three Ridgeton-frontier
encounters each appears in. Threaded through `Monster` and `createMonster`,
and `Combatant.level` (previously player-only, "monsters have no level
concept") now carries it for both sides via `toCombatant`.

**`computeLevelGapMissChance(attackerLevel, defenderLevel)`** (stats.ts):
re-derives the WoW table's shape using `level` in place of weapon/defense
skill (`gap = (defenderLevel - attackerLevel) x 5`, then the same two-piece
5%/+0.1%/+0.4% curve) -- a homebrew reproduction of the *mechanic*, not a
byte-exact match to any one patch's measured miss rates.

**Layered, not swapped in**: this engine already has a real Dexterity/
Armor-based Evasion stat with its own Character-sheet display, tooltip
breakdown, and a whole ability (Defend, "+10% Evasion, Made Visible") built
around it -- replacing hit chance with level-gap-only math would have
silently gutted all of that. Instead the two stack, mirroring WoW's own
attack table shape (a level-driven Miss bucket and a separate stat-driven
Dodge/Parry-style avoidance bucket, both subtracted from 100): `hitChance =
100 - levelGapMiss - evasion - guardReduction + rangedHitBonus`, clamped to
the existing 10-99% floor/ceiling. `BASE_HIT_CHANCE` (a flat 90) is gone;
`computeHitChance()` is the one place both the real roll and the
`previewAttack` tooltip compute it now, so they can never drift.

Verified against real game data end-to-end (character/monster creation,
not just the formula in isolation): a level 1 hero vs. the goblin/dire
wolf/orc encounters lands at 87-88% depending on each monster's own
Dexterity-based evasion, and a level 5 hero's better skill noticeably
narrows the gap against the level 3 orcs. New tests lock in the curve's
three regions (baseline, linear, steepened) and its negative-gap case, plus
an integration test through `previewAttack` itself.

### Critical files
`packages/engine/src/stats.ts`, `combat.ts`, `monsters.ts` (+
`__tests__/combat.test.ts`).

## Class Style Sheet Rebalance: Toned-Down Ability Damage (2026-09-28)

The user revised the Class Style Sheet (Google Drive) to tone down several
abilities' damage/healing numbers, then asked for those changes carried into
`classes.ts`. Re-fetched the sheet and diffed it line by line against the
existing implementation, following this file's own established transcription
conventions (`percentOfAbility`/`StatusApplication.power` store double the
sheet's stated Attack/Spell Power percentage; a weapon-scaled ability's flat
number is dropped in favor of the real weapon roll, with only its percent
surviving as `percentOfAbility` -- the existing Evasive Jab precedent).

**Flat/percent reductions** (`flatBase`/`percentOfAbility` unless noted):
- **Mend** (Cleric): 50 → 40 flat (+10% Spell Power unchanged).
- **Radiant Beam** (Cleric): 100 → 40 flat (+20% Spell Power unchanged).
- **Nature's Remedy** (Ranger): 50 → 30 flat, 10% → 20% Spell Power.
- **Wylde Healing** (Druid): 50 → 40 flat, 10% → 20% Spell Power.
- **Wylde Wrath** (Druid): 75 → 60 flat (+25% Spell Power unchanged).
- **Elemental Shard** (Wizard): 65 → 35 flat (+20% Spell Power unchanged).

**Missing weapon-scaling bonus added** (the sheet's own "X damage + Y%
Attack Power" phrasing for these two was never wired up to a
`percentOfAbility`, so they were quietly hitting for weapon damage alone):
- **Cleave** (Warrior): added `percentOfAbility: 0.4` (20% Attack Power).
- **Topple** (Soldier): added `percentOfAbility: 0.4` (20% Attack Power).

**Bleed/poison ticks doubled** (the sheet doubled these from 5% to 10% of
Attack Power): **Serrated Blade**'s bleed (`weaponPercent` 0.05 → 0.1, a
literal fraction of weapon damage, not doubled the way ability-score-based
fields are -- see `StatusApplication.weaponPercent`'s own doc comment),
**Poisoned Throw**'s poison (`power` 0.1 → 0.2), and **Barbed Arrow**'s bleed
(`combat.ts`'s `BARBED_BLEED_ABILITY_PERCENT` 0.1 → 0.2 -- this one lives
outside `classes.ts` entirely, in the dedicated `resolveProc` function that
consumes its two-charge buff).

Everything else -- resource costs, AP costs, unlock levels, both Basic
Attack variants per class, Enrage/Arcane Barrier's Vitality/Spell-Power-based
buffs, Evasive Jab, and all seven classes' Basic Attack resource generation
(resources.ts) -- was already correct and untouched. Updated the one
existing test whose hand-traced damage math assumed Cleave had no
`percentOfAbility` (`combat.test.ts`, "still applies the homebrew Attack
Power bonus... (Cleave)").

### Critical files
`packages/engine/src/classes.ts`, `combat.ts` (+
`__tests__/combat.test.ts`).

## Furious: A Visible "+N Fury" Popup on Being Struck

The user tested a Warrior and reported Fury didn't seem to build when they
were hit, despite the sheet's "Fury generated is equal to x0.25 of the
damage taken." Traced the mechanic directly (a real Goblin repeatedly
hitting a level-1 Warrior via `startCombat`/`submitPlayerAction`) and
confirmed it already worked exactly as specified -- the actual gap was
visibility: unlike every other combat event (hits, heals, buffs), a
passive resource gain from being struck never got a log entry of its own,
so the client's floating-text system had nothing to key a popup off, and a
couple of points added to a 100-point bar is easy to miss mid-fight.

**`combat.ts`**: added a `"resource-gain"` `CombatEventKind` and
`applyBeingStruckResourceGain`, which wraps the existing
`beingStruckResourceGain` + `gainResource` calls and logs the amount as its
own event (`{ kind: "resource-gain", targetId, amount }`), placed right
after the hit/save-fail/save-succeed log entry so it reads as a
consequence of that blow rather than out of order. Both call sites
(`resolveAttack`, `resolveSave`) now go through it.

**Client**: `CombatantEffect` gained a `"resource"` kind; `effectsForEntry`
(`CombatScreen.tsx`) turns a `"resource-gain"` log entry into a `+N`
floating popup, same mechanism as the existing hit/heal/buff indicators.
Styled in the Fury bar's own ember tone (`--aow-hp`, `.cbt-float-resource`
in `CombatScreen.css`) so it reads as "that hit fed your Fury," not another
flavor of damage number.

Warrior's Furious is the only passive using this today, but the mechanism
is generic to any class resource with `gainOnBeingStruckPercent` set.

### Critical files
`packages/engine/src/combat.ts` (+ `__tests__/resources.test.ts`);
`apps/client/src/screens/CombatScreen.tsx` (+ `.css`),
`components/combat/CombatStage.tsx`.

## Mobile Optimization Pass (2026-09-28)

The client was built and tuned entirely against desktop layouts; the user
asked for it to feel like a real installable mobile app, not just a
responsive webpage. Audited every screen (fixed layouts, hover-only
interactions, touch target sizes, viewport units, scroll/zoom behavior,
asset weight, PWA scaffolding) before touching anything. Confirmed with the
user: Combat/World Map keep their existing pixel-perfect landscape layout
as-is rather than a portrait redesign (a "rotate your device" prompt covers
the gap), and this goes all the way to a full installable PWA rather than
stopping at responsive/touch polish.

**Installability** (`index.html`, `vite.config.ts`, `public/icons/`):
upgraded the viewport meta (`viewport-fit=cover`, `maximum-scale=1`,
`user-scalable=no` -- app-like, no accidental pinch/double-tap-zoom on game
chrome), added `theme-color`/`apple-mobile-web-app-*` tags, and generated
192/512/512-maskable PNG icons from the existing `favicon.svg`'s star mark
(redrawn with Pillow -- no SVG renderer was available in this environment,
so the path's coordinates were hand-transcribed into a polygon). Added
`vite-plugin-pwa` (`generateSW` mode): the manifest, a service worker that
precaches only the JS/CSS/HTML/font app shell (~692KB) for an instant cold
launch, and a `CacheFirst` runtime rule for images so background art caches
lazily as it's actually seen. Supabase requests match no caching rule at
all, so auth/character data always hits the network live, same as with no
service worker.

**Touch parity for hover-only interactions**: `components/Tooltip.tsx`
(used for item/stat tooltips) gained a touch code path -- tap opens it at
the touch point, tap-outside closes it -- without ever calling
`preventDefault()`, so a trigger that's also a real button (an inventory
slot) still gets its own click alongside the preview. `CombatHud.tsx`'s
skill-bar info line now updates `onTouchStart` too. `CombatStage.tsx`'s
enemy-targeting preview (previously hover-only, meaning a tap committed to
a target with no preview ever shown) now requires a first tap to preview a
target and a second tap on that same target to commit, matching what
hovering already does on desktop.

**Touch targets & responsive layout**: bumped several under-44px controls
(`.back-button`, `.tab-button`, `.action-button` in `App.css`,
`.aow-nav-item` in `GameShell.css`) to a proper tap-height via `min-height`
rather than changing their visual size. Added the missing stacking
breakpoint (the same `max-width: 700px` pattern already used elsewhere) to
`HomeScreen.css`, `InventoryScreen.css`, and `SkillsScreen.css`, none of
which had one. `GameShell`'s nav gained a third tier: the existing
820px "wrapped top row" now further collapses, below 600px, into a fixed
bottom tab bar with safe-area padding -- the standard native-app pattern,
reachable one-handed, with keycap badges hidden since they're meaningless
on touch.

**A real bug, not just new work**: the phone-width bottom bar's `position:
fixed; bottom: 0` was rendering ~600px tall (nearly the whole screen)
instead of a slim strip. The sticky-sidebar rule's own `top: calc(56px +
safe-area)` was never cleared by either breakpoint, so with `bottom: 0`
also set, CSS's normal behavior for a positioned element with **both** top
and bottom specified and `height: auto` is to stretch to fill the gap
between them (exactly the same rule that correctly stretches the bar's
*width* between `left: 0`/`right: 0` -- just not one I'd accounted for on
the vertical axis). Fixed by explicitly setting `top: auto` in the
600px block. A second, separate bug: `.aow-main` overflowed the viewport
horizontally on **World Map** specifically (`scrollWidth` 1320px against a
390px phone) -- when `.aow-body` switches to `flex-direction: column` at
≤820px, its `align-items: flex-start` no longer stretches `.aow-main` to
fill the (now-horizontal) cross axis, so it was shrink-wrapping to its
widest descendant instead of the viewport -- invisible on every other
screen since none of their content is wider than a phone, but World Map's
hex canvas very much is. Fixed with an explicit `width: 100%` in that same
breakpoint. Both were caught by scripting a real Chromium (Playwright,
`/opt/pw-browsers`) against a temporary, untracked debug harness
(`mobile-debug.html`/`.tsx`, deleted before finishing) that rendered each
screen directly with a mock character -- real Supabase auth isn't reachable
from this sandbox's egress proxy, so this was the only way to actually
drive the app rather than just read the CSS and hope.

**Combat/World Map orientation**: added a `.cbt-rotate-prompt` overlay to
`CombatScreen.tsx`/`.css`, shown via a pure CSS `@media (orientation:
portrait) and (max-width: 900px)` query -- no JS orientation-lock API
needed, and it resolves the instant the phone turns sideways. World Map
deliberately did **not** get the same treatment: it already has its own
pan/zoom viewport (confirmed working in portrait during the audit), so a
rotate demand there would have been a regression, not a fix. Landscape
combat's existing letterbox scaling was left as-is per the user's choice;
worth noting for anyone revisiting this that on a small phone specifically
(landscape viewport as short as ~375-390px), the action-bar buttons scale
down to roughly 20px -- readable, but tighter to tap than the 44px
guideline. Fixing that fully would mean a phone-specific combat layout,
out of scope for this pass.

**Asset weight**: `assets/ui/combat-bg.png` (1.19MB, fully opaque despite
being a PNG, and loaded as the `body` background on **every** screen, not
just combat) was re-encoded as `combat-bg.jpg` at quality 85 -- 1.19MB to
80KB, a 93% cut on the single highest-impact asset in the app.
`assets/world/eridan-map.jpg` was re-encoded in place (same filename, same
dimensions -- the World Map's zoom and hex-coordinate math are both defined
against this image's pixel size) at quality 80: 1.69MB to 665KB. The four
encounter backdrops got a lighter pass at quality 82 (each only 6-8%
smaller; they were already reasonably sized).

### Critical files
`apps/client/index.html`, `vite.config.ts`, `src/index.css`,
`src/main.tsx`, `src/vite-env.d.ts`; `public/icons/*` (new);
`src/components/GameShell.tsx`+`.css`, `Tooltip.tsx`;
`src/components/combat/CombatHud.tsx`, `CombatStage.tsx`;
`src/screens/CombatScreen.tsx`+`.css`, `WorldMapScreen.css`,
`HomeScreen.css`, `InventoryScreen.css`, `SkillsScreen.css`,
`CharacterScreen.css`, `TitleScreen.css`, `CharacterSelectScreen.css`,
`CharacterCreationScreen.css`, `App.css`; `assets/ui/combat-bg.jpg` (new,
replaces `.png`), `assets/world/eridan-map.jpg`,
`assets/backgrounds/*.jpg` (all re-encoded in place).

## World Map: Pinch-to-Zoom, Desktop-Only Zoom Buttons

Follow-up to the mobile pass above: the user asked for the World Map's
zoom to work as a real pinch gesture on touch devices, with the +/-/Find
Party button row then removed there (it stays for desktop, which has no
pinch to replace it with).

**`WorldMapScreen.tsx`**: the hex viewport already tracked one pointer for
click-and-drag panning; it now tracks every active pointer in a
`Map<pointerId, {x,y}>`; a second finger landing hands off from panning to
pinching -- any in-progress single-finger drag is explicitly cleared right
then, rather than left to resolve as a (wrong) tap-to-select once its
pointer eventually lifts. Each pinch move computes the new zoom as a ratio
of the current finger distance to the distance the gesture *started* at
(`nextZoom = startZoom * (dist / startDist)`), clamped to the same
`ZOOM_MIN`/`ZOOM_MAX` as the old buttons -- ratio-based so it can't drift
the way accumulating small per-frame deltas would. It reuses the exact
same anchor trick `changeZoom` already used for the +/- buttons
(`pendingCenterRef` + a `useLayoutEffect` on `[zoom]`), just anchored on
the pinch's current midpoint instead of the viewport's center, so the map
point between your fingers stays under them as it scales -- standard
pinch-zoom feel. A tap-to-select still only fires for a genuine
single-finger tap that never moved, never as fingers lift one-by-one out
of a pinch.

**`WorldMapScreen.css`**: `.aow-hexmap-zoom-controls` (the +/-/Find Party
row) is hidden under `@media (pointer: coarse)` -- targeting touch-primary
input specifically, not just narrow screens, so a touch laptop or tablet
gets the same pinch-first treatment a phone does, while a mouse-driven
desktop keeps the buttons exactly as before.

Verified with a real Chromium driven via CDP's `Input.dispatchTouchEvent`
(genuine multi-touch, unlike synthetic `PointerEvent`s, which can't
satisfy `setPointerCapture`) against a temporary, untracked debug harness
(deleted before finishing, same approach as the mobile pass above): pinch
out grows the map content, pinch in shrinks it back, panning and tap-to-
select both still work threaded through the same handlers, and the button
row is confirmed hidden on a touch context and visible on a plain desktop
one.

### Critical files
`apps/client/src/screens/WorldMapScreen.tsx` (+ `.css`).

## Combat HUD: Bigger Action-Bar Buttons and HP/Resource Bars

Follow-up to the mobile pass: the user agreed the action-bar buttons and
the bottom-left HP/resource bars read a bit small, and asked for them
enlarged without shrinking the battlefield view above. The footer (status
panel, action bar, combat log) sits in the artboard's `grid-template-rows:
60px minmax(0, 1fr) auto` as the `auto` row -- growing anything in it
grows the whole row, which comes directly out of the battlefield's `1fr`
share of the fixed 900px-tall artboard. So every size increase here was
paired with an equal-or-greater trim elsewhere in the same footer, never
just added on top of it.

**`CombatHud.tsx`**: the HP bar went from 9px to 14px thick (its shield
sliver 3px to 5px) and the resource bar from 7px to 11px.

**`CombatScreen.css`**: `.cbt-skill-slot` (the action-bar buttons) grew
from 52px to 60px square, with its glyph font and the header/action-bar
divider bumped to match. Paid for by trimming `.cbt-info-line`'s reserved
height (50px to 42px -- the info line's real minimum is set by the End
Turn button's own 48px height regardless, so this recovered 2px, not the
full 8), `.cbt-actions-panel`'s internal gap (10px to 8px), and
`.cbt-status-panel`'s padding and internal row gap (10px to 8px, 6px to
5px) to absorb the HP/resource bars' own growth.

Verified by literally measuring `.cbt-stage`'s (the battlefield) rendered
height before and after via a temporary debug harness (same
render-directly-with-mock-data approach as the mobile pass, deleted before
finishing) rather than trusting the arithmetic: **662px in both cases,
unchanged to the pixel** -- the trims fully offset the growth. Screenshots
at both a flat 1600x900 render and a realistic 1366x768 laptop viewport
confirm the bigger controls read clearly with no cramping or overflow.

### Critical files
`apps/client/src/screens/CombatScreen.css`,
`components/combat/CombatHud.tsx`.

## Combat HUD: Collapsible Log, Press-and-Hold Ability Popover, Real-Pixel Mobile Dock

The user said mobile Combat still read small after the previous pass and
asked for three specific changes: turn the always-on combat log into a
button that pops open a modal (with a top-right minimize/close button);
replace the hover-only ability description row above the action bar with
a press-and-hold popover per ability, so the freed space can go toward
much bigger action-bar buttons; and enlarge the bottom-left HP/resource
readout to match. Unlike the previous round, the user explicitly accepted
trading some battlefield space for legibility this time.

**Log modal (`CombatHud.tsx`)**: `LogScrollList` was pulled out as its own
component (own ref, own scroll-to-bottom effect) so it can render twice --
once in the always-visible desktop `.cbt-log-panel`, once inside a
conditional `.cbt-log-modal-backdrop` opened by a `logOpen` state toggle
from a new `.cbt-log-toggle-button`. The modal closes on backdrop tap or
its `×` button; `stopPropagation` on the panel itself keeps a tap inside
the log from closing it.

**Ability popover (`SkillSlot`)**: a long-press (450ms `setTimeout`,
armed on `onTouchStart`, cleared on `onTouchMove`/`onTouchEnd`) shows a
`.cbt-skill-popover` with the same name/meta/block-reason/description the
desktop hover row shows; a `longPressRef` flag tells the `onClick` that
follows the touch's synthetic click to swallow itself instead of also
arming the ability. A `document`-level `touchstart` listener closes the
popover on any tap outside the slot.

**The scaling problem this actually turned on**: the first attempt just
grew `.cbt-skill-slot`, bar heights, etc. under the existing
`@media (pointer: coarse)` block, same as the previous round. Measuring
it on a real landscape-phone viewport (Playwright's iPhone 12 landscape,
750x340) showed the "84px" buttons rendering at **32px** on screen. The
reason: `.cbt-artboard` (header + stage + hud) is one fixed 1600x900 box
scaled as a unit via `transform: scale(min(w/1600, h/900))` -- any CSS
size bump *inside* it just gets shrunk back down by that same factor, so
no amount of enlarging elements in there can ever read as "much larger"
on a short phone. The desktop-oriented 3-column HUD grid (status | actions
| log) made it worse: squeezed into a narrow non-status column, an
8-button action bar at real 84px wrapped across 4 rows, an 467px-tall
footer on a 340px-tall screen.

The fix duplicates `<CombatHud>` as a second instance rendered *outside*
`.cbt-artboard`'s transform, in a new `.cbt-hud-dock` -- a real, unscaled,
`position: fixed` bottom bar shown only under `pointer: coarse` (the
in-artboard instance hides itself the same way). Inside the dock the HUD
uses a bespoke 2-row grid (status+log on top, full-width single-row
action bar below) instead of the desktop's 3-column layout, since a real
phone is much narrower than the >=1600px the desktop grid assumes.
Because the dock's height is real and not scaled, `useCanvasScale` and
the artboard's own vertical placement had to learn about it too --
otherwise the artboard (still sized to the *full* viewport height) simply
rendered its lower half, where combatants actually stand, behind the
opaque dock. A `ResizeObserver`-backed `useElementHeight` hook measures
the dock's actual rendered height and feeds it into both the scale
formula (`min(w/1600, (h - dockHeight)/900)`) and the artboard's `top`
offset, so the letterboxed battle scene always fits entirely *above* the
dock, never behind it. `dockHeight` is `0` on desktop (the dock is
`display: none` there), so this is a no-op change for mouse users.

**A second real bug found the same way**: the long-press popover render
inside the `<button>` inherited the button's own inline
`opacity: 0.4` (used to dim an ability that's on cooldown or unaffordable)
-- CSS opacity below 1 composites an element's *entire subtree* as one
translucent layer, so the popover came out visibly see-through against
the status panel behind it, however far outside the button's box it was
positioned. Fixed by wrapping the button in a `.cbt-skill-slot-wrap` div
(the new home for the popover's `position: absolute` anchor and the
outside-tap ref) and rendering the popover as the wrapper's second child
-- a sibling of the dimmed button, not a descendant of it.

Both bugs were only visible by actually measuring/screenshotting a real
touch-viewport render (Playwright + CDP `Input.dispatchTouchEvent` for
the long-press, same disposable-harness method as every prior mobile
round in this project) -- neither showed up in a desktop-viewport check
or from reading the CSS.

**Honest trade-off**: on the iPhone 12 landscape test viewport (750x340,
a realistically short real-world landscape height once Mobile Safari's
own chrome is accounted for), the dock's status row + single-row action
bar comes to 218px tall, leaving **~115px** for the visible battlefield
above it -- down from using nearly the viewport's full height before this
round. In exchange, action-bar buttons are genuinely 68x68 real screen
pixels (not 68px-that-renders-at-32px), the HP/resource bars and log
button are easily legible, and the ability popover is fully opaque and
readable. This is the trade the user explicitly asked for; a taller
landscape viewport (tablets, bigger phones) keeps proportionally more
battlefield since the dock's height is fixed while the available height
above it grows.

### Critical files
`apps/client/src/screens/CombatScreen.tsx` (dock render, `useCanvasScale`
+ `useElementHeight`, artboard positioning),
`apps/client/src/components/combat/CombatHud.tsx` (`LogScrollList`, log
modal, `SkillSlot` long-press + popover wrapper),
`apps/client/src/screens/CombatScreen.css` (`.cbt-hud-dock`,
`.cbt-log-modal-*`, `.cbt-skill-popover`, `.cbt-skill-slot-wrap`, the
`@media (pointer: coarse)` block's stacked mobile grid).

## Mobile Combat Dock: Responsive Sizing Instead of Fixed Pixels

The user sent a real-device screenshot right after the previous round:
the combat dock was correctly positioned and not overlapping anything,
but the battlefield above it had shrunk to a tiny letterboxed rectangle
with heavy black bars on every side -- much smaller than any of the
Playwright-emulated viewports had shown.

The dock's touch elements (skill slots, level diamond, bar thickness, end
turn button) had all been tuned as **fixed pixel values** against one
test viewport (a 340px-tall emulated landscape phone). The user's actual
browser tab -- a regular Chrome tab with its own address bar still
visible, not an installed fullscreen PWA -- left noticeably less real
height than that. A fixed-px dock doesn't notice or adapt to that: it
kept claiming the same ~218px regardless of how little was actually left
above it, and since `useCanvasScale` (added last round specifically to
keep the battlefield from rendering *behind* the dock) correctly reserves
whatever height the dock measures, an oversized fixed dock on a short
viewport meant almost nothing was left for the battlefield -- exactly
what the screenshot showed. This wasn't the overlap bug from before; it
was an honest, working reservation of way too much space.

**Fix 1 -- responsive dock sizing (`CombatScreen.css`)**: every dock
dimension that eats into the height budget (skill slot size, its glyph
font, the level diamond, HP/resource bar thickness, the end-turn button)
changed from a fixed px value to `clamp(floor, N svh, ceiling)`. The
`svh`-based middle term is calibrated so a 340px-tall viewport -- the
tallest case this was tuned against, already screenshotted and approved
-- lands on exactly the same ceiling px as before (verified: identical
68px slots, 218px total dock height at h=340, zero regression there). A
shorter real viewport shrinks every one of those numbers smoothly toward
a legible floor (44px for the tappable skill slots) instead of the fixed
dock refusing to budge and crowding out the battlefield.

**Fix 2 -- end turn moved inline**: the END TURN button sat in its own
row stacked above the ability icons (mirroring desktop's layout), costing
a whole extra row of height the dock can't spare on a short screen.
`.cbt-hud-dock .cbt-actions-panel` switched from `flex-direction: column`
to `row`, putting END TURN beside the skill bar instead of above it --
it now shares the row's height rather than adding its own on top of it.
Desktop's own `.cbt-actions-panel` (outside `.cbt-hud-dock`) was untouched
and stays a column.

Verified with a disposable Playwright harness across six synthetic
viewport heights (340 down to 240px, well past any real device) rather
than guessing: total dock height dropped from 218px to 182px at the same
340px baseline just from the inline end-turn change, and the battlefield's
share of the viewport rose from 36% to 47% there and from 27% to 40% at
the shortest, most pessimistic 240px height -- with buttons shrinking
gracefully (68px down to 48px) rather than the layout breaking or
anything overlapping at any tested height.

### Critical files
`apps/client/src/screens/CombatScreen.css` (`clamp()`-based dock sizing,
`.cbt-hud-dock .cbt-actions-panel` row layout).

## Mobile Combat Dock: Overlay Attempt, Reverted, and a Real Slimdown Instead

The user sent a second real-device screenshot: buttons were now genuinely
bigger and the dock wasn't overlapping anything, but the battlefield still
read as small. Asked whether to try floating the HUD semi-transparently
over the bottom of a full-size battlefield instead of reserving space
below it, the user said yes -- so that was built and tested first, using
the same disposable-Playwright-harness method as every prior round in
this project.

**The overlay made the actual combat invisible.** This game's battle
scenes put the player and every enemy in the lower half of the frame
(ground level), with sky/background art filling the upper half. A dock
tall enough for legible touch controls has to cover roughly the bottom
half of the screen, which is exactly where the combatants stand --
verified with a screenshot showing an empty beach, not a single
character or enemy visible, because they were all rendered directly
behind the opaque dock. This was caught before pushing: the change was
reverted via `git checkout` back to the last-good commit, and the finding
(with the screenshot) was shown to the user rather than shipping it. Given
the choice between that and continuing to shrink the reserved-space dock,
the user asked instead for two smaller, concrete layout changes.

**1. Move the LOG button down to the action row.** In
`.cbt-hud-dock .cbt-hud`'s grid, `grid-template-areas` changed from
`"status log" / "actions actions"` to `"status status" / "actions log"` --
the log button's own `grid-area: log` didn't need to change at all, only
where "log" sits in the template. It now shares the bottom row with the
action bar instead of occupying the top-right corner, appearing beside the
last ability slot exactly as asked.

**2. Slim the status row by going wide instead of tall
(`CombatHud.tsx` + `CombatScreen.css`).** HEALTH's label+bar and the
resource's label+bar were two separate stacked pairs directly inside
`.cbt-status-bars` (a flex column) -- four stacked lines total. Each pair
was wrapped in a new `.cbt-bar-group` div (`.cbt-bar-group-hp` /
`.cbt-bar-group-resource`); desktop's plain flex-column stacking is
completely unaffected by this (an unstyled wrapper around two already-
adjacent children doesn't change how they flow), but on mobile
`.cbt-status-bars` becomes a 2-column grid (`"hp resource" / "ap ap" /
"chips chips"`), putting HEALTH and the resource bar **side by side**
instead of stacked. Freed further by the LOG button move giving the status
row the full row width to spread into (no more 52px column reserved out
of it). The status row went from a multi-line block down to essentially
one bar-height row plus the AP pips beneath it.

Verified the same way as every round before it: measured across three
viewport heights (340/300/260px) via a disposable Playwright harness
before deleting it. At 340px, dock height dropped from 182px to 142px and
the battlefield's share of the screen rose from 47% to **58%** -- on top
of the two previous rounds' improvements, not instead of them. Screenshots
confirmed the log modal, tap-away-to-close, and the long-press ability
popover all still work correctly after the restructure, and a side-by-side
desktop screenshot confirmed the desktop layout is pixel-identical to
before (the status-bars grid only applies under `pointer: coarse`).

### Critical files
`apps/client/src/components/combat/CombatHud.tsx` (`.cbt-bar-group`
wrapper divs around HEALTH/resource label+bar pairs),
`apps/client/src/screens/CombatScreen.css` (`grid-template-areas` move for
the log button, `.cbt-status-bars`'s mobile grid).

## Mobile Combat: Shift-and-Crop for a Genuinely Bigger Battlefield

The user asked directly for something the earlier failed overlay attempt
hinted at but got wrong: render the battlefield at full (not reserved-
space-shrunk) scale, and shift it up until the combatants clear the dock,
accepting that some of the upper background crops off-screen. Explicitly:
"shift the battle viewport up until the models are visible... I want to
see what it looks like."

**Why a plain shift-up works where the full overlay didn't.** The earlier
overlay round discovered that combatants render in the lower half of the
frame and get fully hidden by an overlay dock. Checking `CombatScreen.css`
explains exactly why: `.cbt-player-column` uses `justify-content: flex-end`
-- the player (and, similarly, the enemies) are anchored right at the
stage's own bottom edge, not floating mid-frame. With the mobile HUD's
in-artboard row hidden, that stage's bottom edge *is* the artboard's
bottom edge. So the fix isn't an overlay at all -- it's rendering the
artboard at full scale (`useCanvasScale` dropped back to the plain
`min(w/1600, h/900)` formula, no longer reduced by the dock's height) and
then shifting the whole thing up by exactly the dock's real measured
height (`top: calc(50% - ${dockHeight}px)`, using the same `dockHeight`
ResizeObserver from two rounds ago, just applied differently): the
artboard's bottom edge lands exactly on the dock's top edge, `.cbt-
letterbox`'s existing `overflow: hidden` crops whatever scrolls above the
viewport's top, and the combatants -- anchored to that bottom edge --
clear the dock with room to spare, screenshot-verified at three viewport
heights (340/300/260px).

**Side effect, fixed with its own small overlay.** Shifting up by a full
dock-height crops off more than the desktop header's own height, so the
encounter title, turn-order strip, round counter, and flee button
disappeared entirely. Asked whether that was acceptable, the user asked
to keep a minimal version instead. A new `.cbt-mobile-topbar` (round
number + flee button only, skipping the title and turn-order strip) floats
fixed to the real viewport's top edge, sized in real px like the bottom
dock. It turned out to cost zero extra battlefield height: at every tested
viewport, the top of the now-cropped scene is either plain background art
or the empty letterbox margin beside a narrower-than-viewport artboard, so
the floating bar (with its own soft top-down gradient) doesn't obscure
anything that matters.

Verified the same way as every round in this project: real touch-viewport
screenshots at multiple heights, a log-modal and long-press-popover
functional check after the artboard positioning changed, and a side-by-
side desktop screenshot confirming zero regression there (desktop's
`useCanvasScale` behavior and `.cbt-header` are untouched).

### Critical files
`apps/client/src/screens/CombatScreen.tsx` (`useCanvasScale` back to full
scale, artboard's `top` shift, new `.cbt-mobile-topbar`),
`apps/client/src/screens/CombatScreen.css` (`.cbt-mobile-topbar` +
`.cbt-mobile-round-*` rules).

## Elf & Half-elf Cleric Avatars: 7 New Hair-Color Variants (2026-09-29)

The user added new pixel-art portraits to the Drive folder
`Character and NPC Sprites -> Pixel Art - Player Races -> Elf & Half-elf ->
Cleric`, reusing the same character models for both Elves and Half-elves
to cut down on asset count, and asked for all of it wired into the game.
The folder held 8 variant subfolders (4 female hair colors, 4 male hair
colors, all "Fair-Skinned"), each with an `Idle/rotations/` pair of
`south.png` (front-facing portrait) and `south-east.png` (combat pose),
64x64 RGBA. Per `AVATARS_BY_CLASS`'s existing design, these are
class-keyed, not race-gated -- the art depicts Elf/Half-elf models, but
any player picking Cleric (of any race) can select the look, same as the
one pre-existing Male Black Hair option.

**Transcription is unreliable at this scale -- verify every byte, and
verify against ground truth, not just self-consistency.** Copying a
~5-6KB base64 blob for a 64x64 PNG by hand from one tool result into a
`Write` call is well within the range where a single character gets
dropped, duplicated, or transposed, and the byte-length alone doesn't
catch it (a transposition preserves length). The fix was a Python
one-liner run after every write, decoding the base64 and requiring both
an exact byte-length match against Drive's own recorded `fileSize` *and*
a successful `PIL.Image.open().load()` -- PNG's per-chunk CRC32 catches
corruption that a naive size check misses. Fourteen of the sixteen
source files needed at least one re-fetch-and-rewrite cycle before
passing. Two files -- `cleric-female-red-hair`'s `south.png` and
`cleric-female-blonde-hair`'s `south-east.png` -- failed identically
across four independent re-fetches: same bytes back every time, IDAT
CRC32 mismatched against its own chunk, zlib refusing to inflate it.
That means the corruption is baked into the file as stored on Drive (or
introduced identically by the export pipeline), not a transcription
slip, and confirmed there's no second export sitting alongside it to
fall back on. **Those two images still need to be re-exported/re-
uploaded by the user** -- everything else shipped.

Of the 7 new variants, 6 are complete (male brown/blonde/red hair, female
black/brown hair, plus a refresh of the existing male black hair pair
which turned out to be stale against a later Drive re-export -- its
`south.png` had changed size, its `south-east.png` hadn't). The 7th,
Female Blonde Hair, ships with only its front portrait (`image`); its
`combatImage` is the corrupted file above and was left unset, which
`AvatarOption` already treats as "fall back to `image` in combat" so
the variant works today and can pick up its own combat pose once
re-uploaded. Female Red Hair is the one variant not wired in at all --
its front portrait, not just the combat pose, is the corrupted file,
and Character Creation has no reasonable fallback for a missing primary
portrait.

Labels for the 6 pre-existing-pattern-following entries got a gender
prefix (`Male Black Hair`, `Female Brown Hair`, etc.) now that both
sexes coexist in one flat list -- the one original entry's label
("Black Hair") was renamed to "Male Black Hair" for consistency; its
`id` (`cleric-male-black-hair`) is unchanged so no character data
migrates. No changes were needed to `CharacterCreationScreen.tsx` --
its Appearance step already maps over whatever `getAvatarsForClass`
returns.

Verified with a temporary, untracked debug harness
(`avatar-debug.html`/`.tsx`, same render-directly-with-mock-data
approach as every prior round -- deleted before finishing) driving a
real Chromium through Half-elf -> Cleric -> Appearance: all 7 new
portraits render distinctly, and selecting one (tested with Female
Blonde Hair, the partial variant) shows correctly in the side preview
with no broken image or layout shift.

### Critical files
`apps/client/src/game/avatars.ts` (imports + 7 new `AvatarOption`
entries); `apps/client/src/assets/avatars/cleric-{male,female}-
{black,brown,blonde,red}-hair[-se].png` (13 new/refreshed files; two
source images -- female red hair's front portrait, female blonde hair's
combat pose -- remain corrupted at the Drive source and are not yet
addable).

## Female Red Hair Cleric Avatar: Recovered via GitHub Instead of Drive (2026-09-29)

The previous round left two source images corrupted at the Drive end
(confirmed by repeated identical-byte re-fetches all failing PNG
CRC/zlib checks): Female Red Hair's front portrait and Female Blonde
Hair's combat pose. Told about this, the user pushed the two Female Red
Hair images (`south.png`/`south-east.png`, re-exported outside Drive)
directly into this repo instead of back through Drive.

That sidesteps the whole problem class from the previous round, not just
this one instance of it: pulling a binary file through `git fetch`/`git
pull` is exact by construction, with no base64-through-the-model-context
transcription step to corrupt -- unlike `download_file_content`, which
returns the file as a base64 string that then has to be reproduced
byte-for-byte into a `Write` call, the failure mode the last round spent
most of its effort working around. Confirmed both files decoded to
exactly the expected byte sizes (4674 / 4171, matching what Drive had
reported for this same variant) and opened cleanly as 64x64 RGBA with
PIL before wiring them in -- this time on the first try, no corruption.
`cleric-female-red-hair` is now a complete entry (portrait + combat
pose) in `AVATARS_BY_CLASS.cleric`, bringing Elf/Half-elf Cleric to all
8 of the originally-requested hair-color variants; Female Blonde Hair's
combat pose is still outstanding and would benefit from the same
git-drop approach if the user re-exports it.

### Critical files
`apps/client/src/game/avatars.ts` (new import + `cleric-female-red-hair`
entry); `apps/client/src/assets/avatars/cleric-female-red-hair.png` +
`cleric-female-red-hair-se.png` (moved and renamed from the root-level
files the user dropped into the branch).

## Female Blonde Hair Cleric Combat Pose: Last Gap Closed (2026-09-29)

The user dropped Female Blonde Hair's `south-east.png` (its combat pose,
the one file left corrupted at the Drive source from two rounds ago)
into the repo the same way as Female Red Hair. Decoded to exactly the
expected 4339 bytes and opened cleanly as 64x64 RGBA -- no corruption,
same git-transfer approach as last time. Moved into
`apps/client/src/assets/avatars/cleric-female-blonde-hair-se.png` and
added as `combatImage` on the existing `cleric-female-blonde-hair`
entry (previously portrait-only, silently falling back to the front
portrait in combat). Confirmed via the build output that the two
images now bundle as genuinely separate assets rather than one file
serving both roles. This was the last missing piece: all 8 originally-
requested Elf/Half-elf Cleric hair-color variants are now complete with
both a front portrait and a combat pose.

### Critical files
`apps/client/src/game/avatars.ts` (new import + `combatImage` on
`cleric-female-blonde-hair`); `apps/client/src/assets/avatars/cleric-
female-blonde-hair-se.png` (moved and renamed from the root-level file
the user dropped into the branch).

## Starting Gear: Armor Numbers Rescaled to Match Weapon Damage (2026-09-29)

The user wanted armor ratings on starting gear brought down to roughly
the same scale as weapon damage numbers (e.g. "leather armor = 5 armor;
studded leather = 8 armor") instead of the old 60-180 range, specifically
so there's room to scale up into meaningfully bigger numbers on better
gear later. This also applied to accessories -- Ring of Warding's armor
needed to land below 10.

**The catch, surfaced before touching anything:** armor rating isn't
displayed raw -- it feeds Evasion% at a fixed 5% conversion rate (the
Character Stats Style Sheet's "Evasion = 50% of Dexterity + 5% of armor
rating", `ARMOR_EVASION_RATIO` in `stats.ts`). Shrinking Leather Armor
from 60 to 5 without touching that conversion drops its Evasion
contribution from 3% to 0.25% -- armor becomes nearly cosmetic at these
starting-gear numbers. Asked directly whether to also rescale the
conversion (keeping armor's actual combat weight roughly where it is
today) or leave the 5% formula alone (accepting that starting armor is
now a much smaller factor, by design, until better gear raises the raw
numbers back up), the user chose to leave the formula alone -- the
Style Sheet's stat math is intentional and out of scope here; only the
item catalog's numbers were being asked to change.

New `armorRating` values (`packages/engine/src/items.ts`): Leather
Armor 60->5, Studded Leather 120->8, Chain Shirt 180->12, Traveler's
Robe 60->5, Lucky Charm 60->3, Ring of Warding 120->7 (all now below
10, as asked). Weapon damage numbers (4-20 across the starting
catalog) were left untouched -- they were already the scale being
matched against. Two engine tests hardcoded the old absolute numbers
(a level-1 Rogue's starting Leather Armor rating, and the Lucky Charm's
equip/unequip delta) and were updated to match; a third test comparing
a migrated character's armor rating against a freshly-created one
needed no change since it's self-referential. All 157 engine tests
pass, and the Character screen's Armor stat (confirmed via a temporary
debug harness, deleted after) now reads `+12` for a Warrior's starting
Chain Shirt instead of `+180`, with Evasion computed correctly off the
new small number.

### Critical files
`packages/engine/src/items.ts` (all six armor/accessory `armorRating`
values); `packages/engine/src/__tests__/character.test.ts` (two
hardcoded expectations updated to match).

## Human Cleric Avatars: 8 More Variants, This Time Racially Distinct (2026-09-29)

The user dropped 8 more pixel-art folders straight into the repo (no
Drive round-trip needed this time) -- the same 4-female/4-male hair-color
pattern as the Elf/Half-elf Cleric set, but modeled on Human instead
(`Human_Cleric_{Male,Female}_Fair-skinned_{Black,Brown,Blonde,Red}_Hair`,
each a full 8-direction "mannequin" export same as before). Unlike the
Elf/Half-elf case, this pixel model is visibly different, not a shared
asset -- rounder face, different armor shading -- so it couldn't just
extend the existing 8 `AVATARS_BY_CLASS.cleric` entries in place.

**Ids don't get renamed once shipped.** A character's chosen avatar is
stored as a plain `avatarId` string on `Character.appearance`, matched
by exact id in `getAvatarById` -- there's no race field on the avatar
option itself for it to key off. Renaming the existing `cleric-male-
black-hair`-style ids to something like `cleric-elf-male-black-hair`
would have been the cleaner naming scheme, but would silently orphan
any already-created character's saved look (this app now has real
Supabase-backed player data, not just local fixtures). So the original
8 ids stay exactly as they were; only their *labels* got an "Elf "
prefix (label is display-only, safe to change freely). The new Human
set got fresh `cleric-human-<gender>-<color>-hair` ids and "Human
"-prefixed labels, landing in the same flat `AVATARS_BY_CLASS.cleric`
list -- 16 options total now, still class-keyed rather than
race-gated, so a Human Cleric can still pick the Elf-modeled look and
vice versa if they want to.

Only `south.png`/`south-east.png` were pulled from each folder's
`Idle/rotations/`, per this project's standing avatar convention (the
remaining 6 directions and each `metadata.json` were the tail of the
same "mannequin" export format already established for pixel-art
avatars, and were deleted rather than kept at the repo root once their
two usable frames were extracted). Confirmed via PIL that all 16
south/south-east PNGs decoded as clean 64x64 RGBA before wiring
anything in -- git transferred these exactly, the way it did for the
two Drive-corrupted files recovered a round ago, so no verify-and-retry
loop was needed this time either.

Verified with the same temporary debug-harness approach as every prior
avatar round (deleted after): driving Character Creation through
Human -> Cleric -> Appearance shows all 16 portraits rendering
distinctly and correctly labeled by race, and selecting a Human
variant shows the right combat-pose preview.

### Critical files
`apps/client/src/game/avatars.ts` (8 new imports/entries, "Elf "
prefix added to the original 8 labels); `apps/client/src/assets/
avatars/cleric-human-{male,female}-{black,brown,blonde,red}-hair[-se]
.png` (16 new files, extracted and renamed from the root-level
`Human_Cleric_*` folders the user dropped in, which were removed after).

## Avatar Picker: Gated by Race, Not Just Class (2026-09-29)

With two visually distinct pixel models now sharing the Cleric avatar
list (Elf/Half-elf-modeled and Human-modeled, 8 options each), the
Appearance step was showing all 16 regardless of the character's chosen
race -- a Human player could pick the pointy-eared Elf-modeled look and
vice versa. The user asked for this gated: picking Human + Cleric
should surface only the Human Cleric portraits.

`AvatarOption` gained a `raceIds: string[]` field naming which race(s)
each look is offered for (`avatars.ts`) -- the Elf-modeled set lists
`["elf", "halfElf"]` since, per the original request that started this
avatar work, Half-elf intentionally reuses the Elf pixel model to cut
down on art; the Human-modeled set lists `["human"]`. `getAvatarsForClass`
was replaced with `getAvatarsForRaceClass(raceId, classId)`, filtering
on both instead of just class, and `CharacterCreationScreen.tsx`'s
Appearance step now calls it with the character's already-chosen race.
Since avatar options depend on race now too, `pickRace` resets `avatarId`
on change, same as `pickClass` already did, so a stale pick from a
different race's list can't survive a step back.

This only reaches the picker -- `getAvatarById` (used everywhere an
already-chosen avatar is displayed: Character Select, the Character
screen, combat sprites) is untouched and still matches by id alone, so
no existing character's saved look is affected.

Verified in a temporary debug harness (deleted after) across all four
races with a Cleric option available: Human shows only the 8 Human
portraits, Elf shows only the 8 Elf portraits, Half-elf shows that same
Elf set (shared model, as intended), and Dwarf -- with no pixel art of
its own yet -- correctly falls through to palette-only, same as before
this change.

### Critical files
`apps/client/src/game/avatars.ts` (`raceIds` field, all 16 entries
tagged, `getAvatarsForClass` -> `getAvatarsForRaceClass`);
`apps/client/src/screens/CharacterCreationScreen.tsx` (Appearance step
filters by race now, `pickRace` resets `avatarId`).

## Dwarf Cleric Avatars: Third Race Slots Straight Into the Existing Gate (2026-09-29)

The user dropped 8 more folders into the repo -- `Dwarf_Cleric_
{Male,Female}_Fair-skinned_{Black,Brown,Blonde,Red}_Hair`, same
"mannequin" 8-direction export as the Elf/Half-elf and Human sets
before it -- and asked for them wired in gated by race and class, same
as the last round already established.

Because the race-gating work landed just before this drop, adding a
third race was mechanically identical to adding the second: verify all
16 south/south-east PNGs decode as clean 64x64 RGBA (they did -- no
corruption, git transfer again), move them into `assets/avatars/` as
`cleric-dwarf-<gender>-<color>-hair[-se].png`, add 8 new
`AvatarOption` entries with `raceIds: ["dwarf"]` and "Dwarf "-prefixed
labels, delete the scaffold folders. No changes to `getAvatarsForRaceClass`,
`CharacterCreationScreen.tsx`, or the gating logic itself were needed --
that infrastructure already generalizes to any number of races per
class, it just didn't have a third one to filter yet.

Verified with the same temporary debug harness as every prior avatar
round (deleted after): Dwarf + Cleric shows exactly its own 8
portraits (bearded, stockier build, clearly distinct from both other
sets), selecting one previews correctly with its combat pose, and a
quick count confirmed Human/Elf/Half-elf still show zero Dwarf-labeled
cards -- the three sets don't leak into each other.

### Critical files
`apps/client/src/game/avatars.ts` (8 new imports/entries, `raceIds:
["dwarf"]`); `apps/client/src/assets/avatars/cleric-dwarf-
{male,female}-{black,brown,blonde,red}-hair[-se].png` (16 new files,
extracted and renamed from the root-level `Dwarf_Cleric_*` folders,
removed after).

## Half-elf Gets Both Modeled Sets, Not Just Elf's (2026-09-29)

Half-elf was already tagged onto the Elf-modeled avatar set's `raceIds`
(from the round that introduced race gating), reflecting that Elf and
Half-elf literally share that pixel model. The user pointed out that
since Half-elf sits between both parent races narratively, it should
also unlock the Human-modeled set -- letting a half-elf player lean
toward looking more elven or more human, their choice.

One-line-per-entry change: `raceIds: ["human"]` -> `raceIds: ["human",
"halfElf"]` on all 8 Human-modeled entries in `avatars.ts` (the 8
Elf-modeled entries already had `halfElf` from before). No other code
changed -- `getAvatarsForRaceClass` already unions correctly for a race
appearing in more than one option's `raceIds` array, since it just
filters, it doesn't assume one match per option.

Verified with the usual temporary debug harness (deleted after): Human
and Elf alone still show exactly their own 8 portraits each; Half-elf
now shows all 16 (the Elf set followed by the Human set); Dwarf is
unaffected. A quick label-count check across all four races confirmed
no unexpected leakage between sets.

### Critical files
`apps/client/src/game/avatars.ts` (`raceIds` on the 8 Human-modeled
entries; updated doc comment on `AvatarOption.raceIds`).

## Wizard Avatars: Second Class Onto the Existing Race-Gated System (2026-09-29)

The user's "big update" this round: 24 new pixel-art folders for the
Wizard class -- all 3 modeled races (Elf/Half-elf, Human, Dwarf) times
4 hair colors times 2 genders, the same coverage Cleric already has.
Folder naming was inconsistent this drop (`Elf_Wizard_Male_...` for
Elf, but `Wizard_Human_Male_...`/`Human_Wizard_Female_...` and
`Wizard_Dwarf_Male_...`/`Dwarf_Wizard_Female_...` for the other two --
gender and class swap position depending on the folder), so each of
the 24 was mapped explicitly by hand rather than assumed from a single
naming pattern. Metadata confirmed the same "mannequin" 64x64,
8-direction export as every prior drop, this time depicting a robed
spellcaster with a staff rather than Cleric's mace-and-shield.

Wiring this in was almost entirely mechanical because the race-gating
system built for Cleric already generalizes across classes:
`AVATARS_BY_CLASS` gained a `wizard` key with the same 24-entry shape
as `cleric` (Elf/Half-elf set with plain `wizard-*` ids since it's the
"first" race like Cleric's was, Human set with `wizard-human-*` ids and
`raceIds: ["human", "halfElf"]`, Dwarf set with `wizard-dwarf-*` ids
and `raceIds: ["dwarf"]`) -- `getAvatarsForRaceClass` needed no changes
at all, since it already filters generically on whatever `classId` key
exists.

Verified all 48 south/south-east PNGs decoded as clean 64x64 RGBA
before wiring anything in (git transfer, no corruption, consistent
with every drop since the switch away from Drive's base64 API). Then
via the usual temporary debug harness (deleted after): Human, Elf, and
Dwarf + Wizard each show exactly their own 8 portraits; Half-elf +
Wizard shows all 16 (Elf set then Human set); a Cleric regression check
confirmed the two classes' avatar lists don't interfere with each
other.

### Critical files
`apps/client/src/game/avatars.ts` (48 new imports, new `wizard` key in
`AVATARS_BY_CLASS` with 24 entries); `apps/client/src/assets/avatars/
wizard-*.png` / `wizard-human-*.png` / `wizard-dwarf-*.png` (48 new
files, extracted and renamed from the 24 root-level scaffold folders,
removed after).

## Warrior Avatars: Third Class, Consistent Folder Naming This Time (2026-09-29)

24 more pixel-art folders, this time for Warrior -- same full coverage
as Cleric and Wizard (Elf/Half-elf, Human, Dwarf x 4 hair colors x 2
genders). Unlike the Wizard drop, this one used one consistent naming
pattern throughout (`Race_Warrior_Gender_Fair-skinned_Color_Hair` for
all 24, no swapped word order to work around). Metadata's `prompt`
field describes each as "a ... barbarian ... wielding a two-handed
axe" in minimal leather armor -- flavor text for the visual archetype,
not a different class; these are still Warrior-class avatars (the
engine's Warrior is the Fury-generating melee class from the classes.ts
rewrite).

Same mechanical process as Wizard: verified all 48 south/south-east
PNGs decoded as clean 64x64 RGBA (no corruption, git transfer), moved
into `assets/avatars/` as `warrior-*.png` (Elf/Half-elf, plain ids),
`warrior-human-*.png`, and `warrior-dwarf-*.png`, added a `warrior` key
to `AVATARS_BY_CLASS` with the same 24-entry shape and `raceIds` gating
as Cleric/Wizard, deleted the 24 scaffold folders. No changes needed to
`getAvatarsForRaceClass` or any other gating logic.

Verified with the usual temporary debug harness (deleted after): Human,
Elf, and Dwarf + Warrior each show exactly their own 8 axe-wielding
portraits; Half-elf + Warrior shows all 16. Cleric and Wizard's own
avatar lists are confirmed unaffected by every prior round's regression
checks using this same pattern, so no new regression check was needed
here beyond the build/typecheck passing clean.

### Critical files
`apps/client/src/game/avatars.ts` (48 new imports, new `warrior` key in
`AVATARS_BY_CLASS` with 24 entries); `apps/client/src/assets/avatars/
warrior-*.png` / `warrior-human-*.png` / `warrior-dwarf-*.png` (48 new
files, extracted and renamed from the 24 root-level scaffold folders,
removed after).

## Title Screen: One Button, Not Three (2026-09-29)

The Title screen had three menu items -- Continue, New Game, and a
"Load Game" stub that only ever showed a toast. Looking at `App.tsx`
made the redundancy obvious: Continue and New Game were wired to the
exact same handler (`goToCharacterSelectOrAuth`), which checks for a
Supabase session and routes to Character Select if one exists, Auth if
not -- so the two buttons already did the identical thing given the
same account state. The user asked to drop Load Game outright and
collapse Continue/New Game into a single button that reads "Continue"
for a returning (already signed-in) player and "New Game" for
everyone else.

Doing this required App.tsx to know the session state *before*
rendering the Title screen, not just at click time (the existing
handler checked it lazily, which was fine when both buttons did the
same thing but not once the label itself needs to depend on it). Added
a `hasSession` state, populated once via `supabase.auth.getSession()`
on mount and kept in sync by the existing `onAuthStateChange`
listener's SIGNED_IN/SIGNED_OUT branches. `TitleScreen` now takes a
single `isReturningPlayer` boolean plus one `onContinue` handler
instead of separate `onContinue`/`onNewGame` props, and renders one
primary button whose label and subtext ("Continue / Resume your
journey" vs. "New Game / Begin your journey") switch on that flag --
Settings is the only other menu item now.

Verified with a temporary debug harness rendering `TitleScreen`
directly with both boolean states (real Supabase auth isn't reachable
from this sandbox, per this project's established pattern) -- deleted
after confirming both labels, subtext, and styling render correctly
and Load Game no longer appears in either state.

### Critical files
`apps/client/src/App.tsx` (`hasSession` state, single `TitleScreen`
prop set); `apps/client/src/screens/TitleScreen.tsx` (one primary
button instead of three menu items).

## Auth: Google-Only, Restyled to Match the Rest of the App (2026-09-29)

Two asks: drop email/password sign-up entirely (Google-only for now,
more SSO providers later), and restyle the Auth screen, which the user
pointed out "still has the old design's CSS" -- true: `AuthScreen.tsx`
was still using the pre-redesign global classes from `App.css`
(`--accent`/`--bg-panel`/etc.), never migrated to the `--aow-*` design
system the rest of the out-of-combat screens (Title, Character Select,
Character Creation, ...) were rebuilt in over earlier rounds.

**Removed**: the email/password form, its `mode` state (sign-in vs.
sign-up), the "or" divider, and the confirmation-email info message --
all of it was only reachable through that form. `onAuthenticated` also
came out of `AuthScreenProps` entirely: it was already dead for the
Google path even before this change (a successful Google redirect
navigates away from the page; `App.tsx`'s `onAuthStateChange` listener
is what actually picks the session back up on return, not a callback
from this component), and email sign-in was its only real caller.

**Restyled**: rebuilt as its own `aow-auth` screen modeled on Title's
centered-ring composition (same radial background/ring treatment, same
runic divider glyph, `Cinzel` heading) rather than Character Select's
header/footer layout, since Auth is a single focused action the same
way Title is. Copy changed from mode-dependent "Welcome Back"/"Create
an Account" to one neutral "Sign In" / "Continue with Google to create
or access your account" -- accurate now that the same button both
creates a first-time account and signs a returning player back in.
Deleted the now-orphaned `.auth-*`/`.google-button` rules from
`App.css` once nothing referenced them anymore.

Verified with a temporary debug harness rendering `AuthScreen` directly
(deleted after; real Google OAuth can't complete inside this sandbox
regardless): the redesigned screen renders correctly, matches the
ring/typography treatment used elsewhere, and the back link returns to
Title without error.

### Critical files
`apps/client/src/screens/AuthScreen.tsx` (Google-only, rebuilt on the
aow design system); `apps/client/src/screens/AuthScreen.css` (new);
`apps/client/src/App.tsx` (dropped `onAuthenticated` prop, updated
comment); `apps/client/src/App.css` (removed orphaned `.auth-*`/
`.google-button` rules).

## Character Select: Condensed for Mobile (2026-09-29)

Reported bug: on a portrait phone, Character Select ran wider than the
viewport and required scrolling right to see the rest of the screen.
Measured with a temporary debug harness at a 390px viewport: the page's
actual content was 640px wide against a 390px viewport, entirely from
`.aow-select-header` and `.aow-select-footer` -- both fixed-height flex
rows with `flex-wrap` never set, sized for desktop. The header carried a
full wordmark, a divider, a spacer, and a slot-count label all in one
row; the footer carried a redundant second "‹ TITLE" button (the header
already has one), a keyboard-only "DEL" keycap, a keyboard-only "ENTER"
keycap, a row of slot pips, a "1-3 SELECT" hint, and a 240px-min-width
play button -- none of which shrink or wrap on their own.

**Fix**: a new `@media (max-width: 600px)` block in
`CharacterSelectScreen.css`, following this app's existing phone
breakpoint convention from `GameShell.css`. On header/footer: drop the
divider, spacer, slot-count label, the duplicate "‹ TITLE" button, the
pips, the hint text, and both keycaps (all keyboard/desktop-only or
redundant with the header's own back link), leaving one condensed
header row and a footer of just Delete + a flex-filling primary button.
On cards: shrink portrait height, name/heading font sizes, the level
and empty-state diamonds, and internal padding so three slots read as a
condensed, list-like stack instead of a squeezed copy of the desktop
grid. Footer padding uses `env(safe-area-inset-bottom)` per the same
notch/home-indicator convention used elsewhere in the app.

Verified with a temporary debug harness (deleted after) rendering the
real screen at a 390x844 viewport: `document.documentElement.scrollWidth`
now equals `clientWidth` (390, down from 640 before the fix). Because
`loadRoster()`'s Supabase call hangs rather than resolving in this
sandbox, that first pass only exercised the loading-placeholder cards;
a second temporary harness rendered the actual `SlotCard` component
directly with fabricated roster data (one filled slot with a long name,
race/class, XP bar, and location/day/gold tiles, plus two empty slots)
to confirm the real empty- and filled-card layouts also fit cleanly at
390px with no overflow, before the harness and its temporary export
were removed.

### Critical files
`apps/client/src/screens/CharacterSelectScreen.css` (new
`@media (max-width: 600px)` block; no `.tsx`/logic changes).

## Combat: Bigger Battlefield via an Overlaid Action Bar (2026-10-01)

An experiment, confirmed by the user on both desktop and mobile: on mouse/
desktop, the HUD footer used to claim its own `auto`-height grid row out of
the 1600x900 artboard, shrinking the stage above it by however tall the
footer happened to be. It now instead overlaps the stage's own grid row
(pinned to the bottom via `align-self: end`) as a translucent, blurred
floating bar, so the stage gets the artboard's full remaining height and
the battlefield renders noticeably bigger -- the same trade this app's
mobile/touch combat dock already made for its own reasons (see the
"Mobile HUD redesign" comment in `CombatScreen.css`), now extended to the
primary mouse experience too.

The combatants sit right at the stage's own bottom edge, so without a
counter-measure they'd render straight under the new overlay. `CombatScreen.tsx`
measures the overlay's real rendered height via the same `useElementHeight`/
`ResizeObserver` hook the mobile dock already used for an analogous shift,
exposes it as a `--cbt-overlay-hud-h` CSS custom property on `.cbt-artboard`,
and `.cbt-stage-grid` adds that much extra bottom padding -- shifting the
party/enemies up to clear the overlay instead of disappearing behind it.

One pitfall worth recording: CSS Grid places items with an explicit
row *and* column before auto-placing the rest, so giving only the new HUD
overlay wrapper an explicit `grid-row: 2 / 3` (needed for it to pin to the
bottom of the stage's row) pushed the still-auto-placed `.cbt-stage` into
the now-mostly-empty 3rd (`auto`) row instead of sharing row 2 with it --
the battlefield visually vanished (collapsed to near-zero height) until
`.cbt-stage` was given that same explicit `grid-row: 2 / 3` placement too.

Scoped to `@media (pointer: fine)` only -- touch combat keeps its existing,
separately-tuned real-pixel dock untouched.

### Critical files
`apps/client/src/screens/CombatScreen.tsx` (`.cbt-hud-overlay-wrap` +
`hudOverlayHeight` measurement, `--cbt-overlay-hud-h` custom property);
`apps/client/src/screens/CombatScreen.css` (new `@media (pointer: fine)`
block).

## Class Balance: Elemental Shard & Wylde Wrath Resource Costs (2026-10-01)

Per an update to the project's own Class Style Sheet (Google Drive): both
abilities were landing too much damage for how little of their resource
pool they drained. Elemental Shard (Wizard) and Wylde Wrath (Druid) are
the game's only two "mana-like" resource pools (Arcana/Wylde) that start a
fight already full and scale with an ability score (`100 + 6×ability +
8×(level-1)`, see `stats.ts`'s `computeResourceMax`) rather than the small
fixed integer pools (Fury, Expertise, Prayer, Focus, Cunning) every other
class spends down from empty -- at their old costs (30 and 60) both were a
small enough fraction of that scaling pool, especially combined with the
passive resource gain from landing Basic Attacks, to be cast nearly every
turn for an entire fight with no real resource tension.

**Elemental Shard**: `resourceCost` 30 -> 50. **Wylde Wrath**:
`resourceCost` 60 -> 70. Both abilities' AP costs are unchanged (2 and 3
respectively) -- only the resource (Arcana/Wylde) cost moved.

### Critical files
`packages/engine/src/classes.ts` (`elemental-shard` and `wylde-wrath`
action defs); `packages/engine/src/__tests__/resources.test.ts` (updated
the hardcoded post-cast Arcana expectation from the old cost).

## Combat: Fury Bar No Longer Fills Ahead of the Hit Animation (2026-10-01)

Reported bug: a Warrior's Fury bar (built partly from the Furious passive --
25% of damage taken whenever struck, see `resources.ts`) visibly filled at
the start of the enemy's turn, before the hit itself had even animated.

Root cause: a Warrior's resource gain from being struck IS narrated as its
own dedicated log entry (`kind: "resource-gain"`, logged right after the
triggering hit -- see `combat.ts`'s `applyBeingStruckResourceGain`), but
`CombatScreen.tsx`'s playback loop didn't know that. Only HP (and the
death/flee state derived from it) was ever stepped through log entry by log
entry; every other field, resource included, was eagerly snapped to its
final authoritative value in one shot at the very start of a new batch of
log entries -- before any of that batch's individual hit/heal animations
had even begun to play. That eager-adopt behavior is still correct and
intentional for the player's own resource *spend* (there's no log entry to
step it through, and letting a cast cost lag behind the button press would
read as "wrong"), so the fix narrows rather than removes it.

**Fix**: before eagerly adopting each combatant's final resource value,
sum up however much of it is attributable to `resource-gain` log entries
still queued in the upcoming batch, and hold that amount back. As the
step-by-step player reaches each `resource-gain` entry -- in lockstep with
the hit that triggered it, the same way HP already does -- it adds that
entry's own `amount` back in, landing on the authoritative value exactly
when the batch finishes either way. Verified against the real engine (a
Warrior repeatedly ending their turn into enemy attacks, no mocking): the
Fury readout now holds steady through the HP-drop step of a hit and only
ticks up ~900ms later, in its own step, exactly when "generates N Fury from
the blow" becomes the newest log line -- previously it would have already
shown the post-hit value from the very first frame after End Turn was
clicked.

### Critical files
`apps/client/src/screens/CombatScreen.tsx` (`applyEventToWorkingState`'s
new `resource-gain` branch; the batch-start snapshot's `pendingResourceGain`
hold-back).

## Combat: Resource Drain/Gain Tied to the Ability's Own Step, Every Class (2026-10-01)

Follow-up to the Fury-bar fix above: the user asked to (1) check every
other class's resource gain for the same "fills before the animation"
bug, and (2) make a resource *drain* (spending resource to cast an
ability) animate in step with that ability's own cast, not separately.

**Check result**: Warrior's Furious (resource gained from being *struck*)
is the only passive, enemy-triggered resource gain in the game --
`gainOnBeingStruckPercent` in `resources.ts`'s `RESOURCE_CONFIGS` is set
for Fury alone. Every other class's only resource gain comes from landing
their *own* Basic Attack, which (like a resource cost) has no log entry of
its own -- so there was nothing else with Furious's exact "narrated event
on a *later* step" shape to fix the same way.

What those un-narrated changes (every ability's resource cost, and every
class's Basic-Attack-landing gain) still shared with the pre-fix Fury bug
was the batch-start eager-adopt: the party member's resource was always
snapped straight to its final post-batch value before any step played,
rather than being tied to the specific step where the responsible ability
actually resolves. `submitPlayerAction` resolves the acting party member's
own action *before* any enemy turn ever runs (see `combat.ts`), so that
responsible step is always, structurally, the batch's very first entry.

**Fix**: diff the party member's final resource against their prior value,
subtract out whatever's already attributed to a `resource-gain` entry
later in the same batch (so the two pieces never double-count), and hold
the remainder back the same way -- added back at step 0, in lockstep with
that ability's own cast/hit effect, instead of jumping ahead of it.

Verified against the real engine, not mocked: a Wizard's Elemental Shard
cast drains Arcana at the exact moment its own "hits ... for N fire
damage" log line appears, and a Warrior casting Serrated Blade (which also
exhausts their last 2 AP, forcing an enemy turn to resolve in that *same*
batch) drains Fury from 40 to 10 right as Serrated Blade's own hit lands --
then correctly holds at 10 through several seconds of Bleeding ticks and
the enemy's own retaliation hit, only rising once that hit's own
`resource-gain` entry gets its turn several steps later.

### Critical files
`apps/client/src/screens/CombatScreen.tsx` (`actorDeferredDelta`: the
party member's own held-back resource delta, applied at step 0 of each
batch).

## Combat: Bigger Result Popup on Mobile (2026-10-01)

Reported bug: the post-fight popup (Victory, Defeat, and Escaped all share
one component, `CombatResultOverlay.tsx`, via `RESULT_COPY`) was hard to
read on a phone. Unlike the HUD, this popup was never pulled out into its
own real-pixel dock -- it still renders inside the scaled `.cbt-artboard`,
so its CSS sizes live in the same 1600x900 virtual-canvas units as
everything else there and shrink along with the whole canvas once `scale`
(as low as ~0.4 on a small phone, since combat is letterboxed to fit the
viewport) is applied. A 34px title was rendering at barely 15 real px.

**Fix**: a new block under the existing `@media (pointer: coarse)` section
in `CombatScreen.css` roughly doubles the popup's padding and every text
size (title, subtitle, reward line, level-up box, Continue button) --
since it's all still inside the scaled artboard, fixing one component's
CSS automatically fixes all three outcomes at once, no `.tsx` changes
needed. Left untouched on mouse/desktop (`pointer: fine` doesn't match).

Verified with a temporary debug harness forcing each of the three
`CombatStatus` outcomes directly (bypassing actually winning/losing/
fleeing a fight) and screenshotting each at an iPhone-12-landscape
viewport with touch emulation (matching the `pointer: coarse` query) --
all three now read clearly, and a desktop-viewport screenshot of the same
harness confirmed the popup's size there is unchanged.

### Critical files
`apps/client/src/screens/CombatScreen.css` (new result-popup sizing inside
the existing `@media (pointer: coarse)` block; no `.tsx` changes --
`CombatResultOverlay.tsx`'s three outcomes share this one set of classes).

## Level Cap Lowered to 10 (2026-10-01)

Per the user: content will be built out ten levels at a time per class
rather than all the way to the original design's level 30, so the cap
comes down to match what's actually been built so far.

`LEVEL_CAP` (`packages/engine/src/character.ts`) is the single source of
truth every level-gated check in the app already read from --
`gainExperience`'s own leveling loop, `computeAbilityScores`'s growth
loop, and every "at level cap" check in the client (`HomeScreen`,
`CharacterScreen`, `CharacterSelectScreen`) all derive from it rather than
hardcoding 30 anywhere else, so dropping it to 10 was a one-line change.
Confirmed no ability across any class has an `unlockLevel` past 10 (the
highest today is 4), so nothing becomes unreachable by the new cap.

This only stops *future* leveling past 10 -- it doesn't retroactively
clamp a character already saved above it (none exist today, but if a
pre-cap test character ever does, this is a conscious choice, not an
oversight: silently rewriting someone's saved level felt like the wrong
call for a one-line balance knob).

### Critical files
`packages/engine/src/character.ts` (`LEVEL_CAP` 30 -> 10, doc comments).

## Warrior Built Out to Level 30: Ranked Abilities (2026-10-01)

Full build-out of the Warrior's kit from level 6 through the eventual level
30 cap (today's `LEVEL_CAP` is still 10 -- see the entry above -- so levels
11-30 aren't reachable through real play yet, but the content and the
mechanism behind it are both in place for whenever the cap is raised).

**Design shape**, per the user: a WoW-style small roster of abilities that
each level up in power (Rank 2, 3, 4, ...) rather than one-off spells added
forever. The Warrior's full kit -- 6 actives, 2 passives -- is entirely
unlocked by level 10 (using odd levels too, not just the even levels stat
growth already uses); from 11-30 no new abilities arrive, only new ranks of
these same six, staggered one rank-up per level almost the whole way to 30.

- **New actives**: Furious Strike (lvl 6, requires Enraged), Bulwark Stance
  (lvl 8, a short strong evasion buff), Warlord's Reckoning (lvl 10, a
  bigger Enraged-gated row AoE finisher). Furious Strike and Warlord's
  Reckoning finally pay off Enrage's own description, unimplemented since
  the original lvl 1-4 kit ("you can use abilities that require Enraged").
- **New passive**: Reckless (lvl 5) -- bonus Fury gain while below half HP,
  deepening further at higher ranks.
- **Every existing and new active ability** (Enrage, Cleave, Serrated
  Blade, Furious Strike, Bulwark Stance, Warlord's Reckoning) gets 2-4
  ranks across 11-30, each a modest damage/effect bump (and a small
  resource-cost bump on the damage-dealing ones) -- see classes.ts's own
  Warrior `actions` array for the full table, it's self-documenting.

**New engine mechanism (reusable by every future class)**: a ranked
ability is several `CombatActionDef` entries sharing one `familyId`, each
its own rank's numbers and `unlockLevel`; `applyEquipmentEffects` now
resolves each family down to just the single highest rank the character's
level qualifies for, so exactly one ever reaches `actions`/the action bar.
The Skills page's saved action-bar slots store that stable `familyId`
(not the exact rank's own id, which changes every rank-up) so a slot
survives a rank-up instead of going blank -- see `game/actionBar.ts`'s
`buildActionBarSlots`/`defaultActionBarIds` and `SkillsScreen.tsx`'s own
`familyId ?? id` lookups. A new `requiresStatusDefId` field on
`CombatActionDef`, checked in `isActionReady`/`performAction`, backs
"requires Enraged" generically (keyed off Enrage's own "fortified" status,
kept a separate status id from Bulwark Stance's "braced" so an unrelated
evasion buff can't accidentally satisfy the gate). Furious and Reckless's
own ranked numbers are small level-keyed helper functions in `combat.ts`
(`furiousPercent`, `recklessMultiplier`) rather than a data table, since
passives don't have ranked-family plumbing yet and Warrior is the only
class that needs one so far.

Verified with new engine tests (family resolution at several levels, the
full level-10 kit, the Enraged gate, Furious/Reckless's ranked numbers)
and against the real client: a level-10/13 Skills page shows the right
ranks and names ("Cleave (Rank 2)"), a Cleave assigned to a slot at level
2 still resolves correctly at level 13, and a live combat run (build
Fury, cast Enrage, confirm Furious Strike flips from blocked to usable)
played out exactly as designed.

### Critical files
`packages/engine/src/classes.ts` (the Warrior's full `actions`/`passives`
rewrite); `packages/engine/src/actions.ts` (`familyId`, `rank`,
`requiresStatusDefId`); `packages/engine/src/character.ts`
(`applyEquipmentEffects`'s family-resolution reduce); `packages/engine/src/combat.ts`
(`requiresStatusDefId` checks, `furiousPercent`, `recklessMultiplier`);
`packages/engine/src/status.ts` (new `braced` status); `packages/engine/src/resources.ts`
(removed the now-Warrior-specific `gainOnBeingStruckPercent`);
`apps/client/src/game/actionBar.ts` + `SkillsScreen.tsx` (family-id-keyed
action-bar slots); `apps/client/src/game/combatDisplay.ts` ("Requires X"
block-reason text); `apps/client/src/components/combat/CombatResultOverlay.tsx`
("ranked up" copy); `apps/client/src/screens/CharacterScreen.tsx`
(passives filtered by `unlockLevel`).

## Level Cap Raised Back to 30 (2026-10-01)

Per the user, now that the Warrior has full ranked-ability content
through level 30 (see the entry just above): `LEVEL_CAP` goes back to
its original design value, 30, reverting the temporary drop to 10 from
earlier today.

Every other class (Soldier, Cleric, Ranger, Rogue, Druid, Wizard) still
only has abilities through level 4 -- nothing about this change invents
content for them. A character of any other class can now level all the
way to 30, their stats/HP/resource pool keep growing the whole way per
the existing per-level formulas, but they'll plateau ability-wise after
level 4 until each gets its own build-out pass the way the Warrior just
did.

### Critical files
`packages/engine/src/character.ts` (`LEVEL_CAP` 10 -> 30, doc comment).

## Admin "Set Level" Debug Control (2026-10-01)

One account, `adminteam@duelingquills.com`, now gets a "Set Level (Admin)"
control on the Home screen's character card -- a number input plus a
button that jumps the active character straight to any level from 1 to
`LEVEL_CAP`, so a class's kit (ability unlocks, rank-ups, passives) can be
inspected at any level without grinding real XP.

This needed a new engine function, since `gainExperience` can't do it:
it's forward-only (XP accumulates, levels only go up) and refuses to run
once a character is already at `LEVEL_CAP`. The new `setCharacterLevel`
(`packages/engine/src/character.ts`) sets an arbitrary level directly, in
either direction, clamped to `[1, LEVEL_CAP]`. It mirrors
`gainExperience`'s recompute (ability scores via `abilityScoresWithGear`,
max HP/resource via `stats.ts`, proficiency bonus, then
`applyEquipmentEffects` to rebuild the action list at the new level) but
tops HP/resource back up to full and resets `xp` to 0, rather than healing
by a delta -- this isn't meant to simulate an in-fiction level-up, just let
a class be inspected at any point in its curve. A no-op (returns the same
object) when the requested level already matches.

The admin gate is client-side only, by design -- a convenience for one
test account, not a security boundary, since this repo has no
server-side role/RLS concept at all yet (confirmed via a full grep: no
"admin"/"isAdmin" anything existed before this). `App.tsx` now tracks the
signed-in user's email (`supabase.auth.getSession()`/`onAuthStateChange`,
neither of which read `.user.email` before this) and passes
`isAdmin={userEmail === ADMIN_EMAIL}` plus a new `onUpdateCharacter` prop
down to `HomeScreen`, which renders the control only when `isAdmin` is
true and persists the result through the same `updateCharacterInRoster`
path every other screen already uses.

### Critical files
`packages/engine/src/character.ts` (`setCharacterLevel`, new);
`apps/client/src/App.tsx` (`ADMIN_EMAIL`, `userEmail` state, `HomeScreen`
wiring); `apps/client/src/screens/HomeScreen.tsx`+`.css` (`isAdmin`/
`onUpdateCharacter` props, the admin row); `packages/engine/src/__tests__/character.test.ts`.

## Soldier Built Out to Level 30: Ranked Abilities (2026-10-01)

Same ranked-ability shape as the Warrior's build-out (see that dated entry
above), applied to the Soldier's existing level 1-4 kit (Defensive
Flourish, Topple, "Experience with a Blade"). The Style Sheet only
specifies Soldier abilities through level 4, same as every other class, so
everything past that is new design -- planned and shown to the user for
review before being built, same as the Warrior.

The design departs from the Warrior's in one real way: Expertise is a
fixed **10-point pool** generating only 1 per landed Basic Attack (2 on
crit) -- nothing like Fury's 100-point pool. Copying Warrior's "spend
20-75 resource per cast" pattern verbatim would be unplayable, so the
Soldier's kit stays at 5 total actives (not 6) and every cost sits in the
3-9 range:

- **Defensive Flourish** (lvl 2, existing) and **Topple** (lvl 4,
  existing) each get 4 ranks through 30, growing their weapon-damage bonus
  (and Defensive Flourish's Readied stacks, 2 -> 3) the same way Warrior's
  early abilities do.
- **Riposte Stance** (lvl 6, new) -- a self-buff, Evasion up for a few
  turns scaled off Vitality (Soldier's spellcasting stat per the sheet),
  playing the same role as Bulwark Stance. 3 ranks.
- **Counter-Strike** (lvl 8, new) -- a gated finisher requiring Riposte
  Stance's own buff active, mirroring Enrage -> Furious Strike. Needed its
  own status id, `"parrying"` (status.ts), kept distinct from
  `"fortified"`/`"braced"` so `requiresStatusDefId` can't be satisfied by a
  Warrior's unrelated buff. 3 ranks.
- **Shield Sweep** (lvl 10, new) -- the Soldier's "kit comes fully online"
  signature ability: a line-AoE weapon attack with a percent chance (50%
  rising to 65%) to knock down every enemy struck, costing most of the
  Expertise bar. 4 ranks, its last landing exactly at 30 like Warlord's
  Reckoning's did for the Warrior.

New engine tests cover family resolution across the Topple ranks, the full
5-ability kit being stable from level 10 through 30, and Counter-Strike's
Parrying gate (both the `isActionReady` check and a thrown
`submitPlayerAction`) -- same coverage shape as the Warrior's own tests.
Verified directly against the built engine package (not just the test
suite) that a level-10 and a level-30 Soldier resolve to the expected
action lists.

### Critical files
`packages/engine/src/classes.ts` (Soldier's `actions`/`passives`);
`packages/engine/src/status.ts` (`"parrying"` status id/def);
`packages/engine/src/__tests__/character.test.ts`.

## Cleric Built Out to Level 30: Ranked Abilities (2026-10-01)

Same ranked-ability shape as the Warrior/Soldier build-outs (see those
dated entries above), applied to the Cleric's existing level 1-4 kit
(Mend, Radiant Beam, "Spellcasting"). Prayer is the tightest resource of
any class so far -- a fixed **5-point pool**, +1 per landed Basic
Attack/+2 on crit -- so every new ability's cost stays in the 2-5 range,
even tighter than the Soldier's build.

This build-out needed one small, generically useful engine fix: a
`"heal"`-kind action's `applyStatus` wasn't wired to anything --
`resolveAttack` already applied its own `applyStatus` to the attack's
target, but the `"heal"` case in `submitPlayerAction` only ever called
`resolveHeal` and stopped there. Without that wiring, a heal could never
also shield or HoT the ally it healed, which blocks the entire "support
caster" half of a healer's kit. Fixed with one added line
(`resolveApplyStatus(state, actor, target, action, rng)` right after
`resolveHeal`, `packages/engine/src/combat.ts`) -- purely additive, since
no existing ability used `applyStatus` on a `"heal"`-kind action before
this, so every existing class/test is unaffected.

New actives, online by level 10 (5 total, matching the Soldier's count
rather than the Warrior's 6, for the same tight-economy reason):

- **Mend** (lvl 2, existing) and **Radiant Beam** (lvl 4, existing) each
  get 4 ranks through 30, growing their flat/percent healing and damage.
- **Ward** (lvl 6, new) -- shields an ally for a few turns, absorbing
  damage equal to a percentage of Spell Power. First real use of the
  engine's `"ward"` shield-kind status, which existed but had gone
  unclaimed by any class until now. 3 ranks.
- **Grace** (lvl 8, new) -- a small heal plus a heal-over-time on an
  ally, via a new `"grace"` HoT status (status.ts) kept distinct from
  Druid's eventual nature-flavored HoT. 3 ranks.
- **Sanctuary** (lvl 10, new) -- the signature "kit comes online"
  ability: heals an ally *and* shields them in the same cast, costing the
  full Prayer bar. 4 ranks, its last landing exactly at 30 like Warlord's
  Reckoning/Shield Sweep did for the other two classes.

New engine tests cover family resolution across the Mend ranks, the full
5-ability kit being stable from level 10 through 30, and -- since this is
the first class to actually exercise the new heal+applyStatus wiring --
dedicated tests confirming Ward's shield and Sanctuary's heal-and-shield
combo land on the healed ally with the expected amounts. Verified
directly against the built engine package that a level-10 and level-30
Cleric resolve to the expected action lists.

### Critical files
`packages/engine/src/combat.ts` (heal-kind `applyStatus` wiring);
`packages/engine/src/classes.ts` (Cleric's `actions`/`passives`);
`packages/engine/src/status.ts` (`"grace"` status id/def);
`packages/engine/src/__tests__/character.test.ts`.

## Ranger Built Out to Level 30: Ranked Abilities (2026-10-01)

Same ranked-ability shape as the Warrior/Soldier/Cleric build-outs (see
those dated entries above), applied to the Ranger's existing level 1-4 kit
(Barbed Arrow, Nature's Remedy, "Sharpshooter"). Focus is as tight a
resource as Prayer -- a fixed 5-point pool, +1 per landed Basic Attack/+2
on crit -- so this kit stays at 5 total actives with every cost in the
2-5 range, same constraint as the Cleric's build.

New actives, online by level 10:

- **Barbed Arrow** (lvl 2, existing) ranks up only its stack count (2 ->
  3 -> 4) over 3 ranks -- its per-hit bleed percent is a module-level
  constant in combat.ts (`BARBED_BLEED_ABILITY_PERCENT`), not
  per-ability data, so there was nothing else to scale per rank. Same
  choice the Soldier's Readied stacks made (mitigation% stayed flat,
  only stack count grew).
- **Nature's Remedy** (lvl 4, existing) gets the full 4 ranks, growing its
  self-heal.
- **Pinning Shot** (lvl 6, new) -- a ranged attack that roots the target
  for 1 turn, the first ability to claim the engine's "rooted" CC status
  (present since the AP-economy rebuild but unused by any class until
  now). 3 ranks.
- **Evasive Maneuvers** (lvl 8, new) -- self-buff, evasion up for a few
  turns scaled off Dexterity (a new "evasive" status, status.ts), the
  Ranger's own stance ability alongside Bulwark Stance/Riposte Stance. 3
  ranks.
- **Kill Shot** (lvl 10, new) -- the signature gated finisher, requiring
  Evasive Maneuvers active (mirroring Enrage -> Furious Strike, Riposte
  Stance -> Counter-Strike): a big ranged nuke costing most of the Focus
  bar. 4 ranks, its last landing exactly at 30.

New engine tests cover family resolution across the Nature's Remedy
ranks, the full 5-ability kit being stable from level 10 through 30, Kill
Shot's Evasive gate (both `isActionReady` and a thrown
`submitPlayerAction`), and Pinning Shot actually landing "rooted" on its
target (using a high-HP dummy foe so the hit's own damage doesn't kill it
before the status gets a chance to apply -- the first version of this
test used the shared `makeFoe()` default of 20 HP, which a level-10
Ranger's hit regularly one-shot, so the status never had a live target to
land on). Verified directly against the built engine package that a
level-10 and level-30 Ranger resolve to the expected action lists.

### Critical files
`packages/engine/src/classes.ts` (Ranger's `actions`);
`packages/engine/src/status.ts` (`"evasive"` status id/def);
`packages/engine/src/__tests__/character.test.ts`.

## Rogue Built Out to Level 30: Ranked Abilities (2026-10-01)

Same ranked-ability shape as the Warrior/Soldier/Cleric/Ranger
build-outs (see those dated entries above), applied to the Rogue's
existing level 1-4 kit (Evasive Jab, Poisoned Throw). Cunning's 30-point
pool is bigger than Prayer/Focus, but its existing abilities already cost
50-66% of it per cast -- the same "spend most of the bar" shape as the
tighter classes -- so this kit stays at 5 total actives like
Soldier/Cleric/Ranger rather than the Warrior's 6.

The Style Sheet itself just says "Placeholder" for the Rogue's passive,
so -- as when the level 1-4 kit was first built -- nothing was invented
for it; `passives` stays empty.

New actives, online by level 10:

- **Evasive Jab** (lvl 2, existing) and **Poisoned Throw** (lvl 4,
  existing) each get the full 4 ranks through 30.
- **Garrote** (lvl 6, new) -- an attack that stuns the target for 1 turn,
  claiming the engine's last unclaimed CC status, "stunned" (present
  since the AP-economy rebuild but unused by any class until now). 3
  ranks.
- **Vanish** (lvl 8, new) -- self-buff, evasion up for a few turns scaled
  off Dexterity (a new "veiled" status, status.ts) -- the Rogue's own
  stance ability, alongside Bulwark Stance/Riposte Stance/Evasive
  Maneuvers. 3 ranks.
- **Assassinate** (lvl 10, new) -- the signature gated finisher,
  requiring Vanish active (mirroring Enrage -> Furious Strike, Riposte
  Stance -> Counter-Strike, Evasive Maneuvers -> Kill Shot): a massive
  single-target strike costing most of the Cunning bar. 4 ranks, its last
  landing exactly at 30.

New engine tests cover family resolution across the Poisoned Throw ranks,
the full 5-ability kit being stable from level 10 through 30,
Assassinate's Veiled gate (both `isActionReady` and a thrown
`submitPlayerAction`), and Garrote actually landing "stunned" on its
target -- the Garrote test used a high-HP dummy foe from the start
(learned from the Ranger build's Pinning Shot test, whose first version
used the default 20-HP dummy and got one-shot before the status could
land). Verified directly against the built engine package that a
level-10 and level-30 Rogue resolve to the expected action lists.

### Critical files
`packages/engine/src/classes.ts` (Rogue's `actions`);
`packages/engine/src/status.ts` (`"veiled"` status id/def);
`packages/engine/src/__tests__/character.test.ts`.

## Druid Built Out to Level 30: Ranked Abilities (2026-10-01)

Same ranked-ability shape as the other five classes (see their own dated
entries above), applied to the Druid's existing level 1-4 kit (Wylde
Healing, Wylde Wrath, "Spellcasting"). Unlike the last four classes,
Wylde is a mana-like pool -- full at combat start, scaling with Wisdom
and level (`stats.ts`) -- not a tiny fixed pool, so this kit gets the
full **6 actives**, matching the Warrior's count rather than
Soldier/Cleric/Ranger/Rogue's 5.

New actives, online by level 10:

- **Wylde Healing** (lvl 2, existing) and **Wylde Wrath** (lvl 4,
  existing) each get the full 4 ranks through 30.
- **Entangling Roots** (lvl 6, new) -- an attack that roots the target
  for 1 turn, reusing "rooted" (already claimed by the Ranger's Pinning
  Shot). Unlike a buff's `requiresStatusDefId` gate, a CC flavor isn't
  exclusive to one class, so two classes applying the same root is fine.
  3 ranks.
- **Barkskin** (lvl 8, new) -- self-buff, evasion up for a few turns
  scaled off Wisdom (a new "barkskin" status) -- the Druid's own stance
  ability. 3 ranks.
- **Bloom** (lvl 9, new) -- heals an ally and applies a heal-over-time,
  finally claiming the engine's own "bloom" HoT status: it's existed
  since the AP-economy rebuild (an obvious Druid-flavored name even
  then) but sat unused until now. Built on the same heal+applyStatus
  wiring added for the Cleric's Ward/Grace/Sanctuary. 3 ranks.
- **Savage Growth** (lvl 10, new) -- the signature gated finisher,
  requiring Barkskin active (mirroring Enrage -> Furious Strike and
  every other class's stance/finisher pair): a big nature nuke. 4 ranks,
  its last landing exactly at 30.

New engine tests cover family resolution across the Wylde Wrath ranks,
the full 6-ability kit being stable from level 10 through 30, Savage
Growth's Barkskin gate, Entangling Roots sharing "rooted" without
conflict, and Bloom's heal+HoT combo landing on its target with the
expected amount. Verified directly against the built engine package that
a level-10 and level-30 Druid resolve to the expected action lists.

### Critical files
`packages/engine/src/classes.ts` (Druid's `actions`);
`packages/engine/src/status.ts` (`"barkskin"` status id/def);
`packages/engine/src/__tests__/character.test.ts`.

## Wizard Built Out to Level 30: Ranked Abilities -- All 7 Classes Complete (2026-10-01)

Same ranked-ability shape as the other six classes (see their own dated
entries above), applied to the Wizard's existing level 1-4 kit (Elemental
Shard, Arcane Barrier, "Spellcasting"). Arcana is a mana-like pool like
Wylde, so this kit gets the full 6 actives, matching the Warrior/Druid.
**This completes the ranked-ability build-out for all 7 classes.**

One notable choice: Arcane Barrier already applied `"fortified"` (the
Warrior's own buff id) from before this session's "each class mints its
own buff id" convention existed. Rather than migrate already-shipped
behavior, it was left as-is and Spellstrike's gate reuses the same id --
safe because a character only ever has access to their own class's
actions, so there was never any real risk of a Warrior's Enrage
satisfying a Wizard's gate (or vice versa) to begin with; the "own id per
class" habit in later classes was about thematic distinctness more than
a correctness requirement.

New actives, online by level 10:

- **Elemental Shard** (lvl 2, existing) and **Arcane Barrier** (lvl 4,
  existing) each get the full 4 ranks through 30.
- **Frostbind** (lvl 6, new) -- a cold attack that roots the target for 1
  turn, reusing "rooted" (already shared by the Ranger and Druid). 3
  ranks.
- **Arcane Nova** (lvl 8, new) -- an area attack, the Wizard's AoE option
  (every other class has had one since their own build-out). 3 ranks.
- **Immolate** (lvl 9, new) -- a fire attack with a damage-over-time,
  claiming the engine's "burning" status, present since the AP-economy
  rebuild but unused by any class until now. 3 ranks.
- **Spellstrike** (lvl 10, new) -- the signature gated finisher,
  requiring Arcane Barrier's Fortified buff active: the Wizard's biggest
  single-target nuke. 4 ranks, its last landing exactly at 30.

New engine tests cover family resolution across the Arcane Barrier
ranks, the full 6-ability kit being stable from level 10 through 30,
Spellstrike's Fortified gate, Frostbind sharing "rooted" cleanly, and
Immolate's burn landing with the expected tick amount. The Immolate test
initially failed (9 vs. an expected 11) because its 3-value rng sequence
only covered the attack's own hit/crit/damage rolls -- `resolveApplyStatus`
draws a 4th roll for the status's own variance, which `sequenceRng`
silently satisfied by wrapping back to the first (non-1.0-variance) value
instead of erroring; fixed by adding the missing 4th roll. Verified
directly against the built engine package that a level-10 and level-30
Wizard resolve to the expected action lists.

### Critical files
`packages/engine/src/classes.ts` (Wizard's `actions`);
`packages/engine/src/__tests__/character.test.ts`.

## Defend Removed: Evasion Now Comes Only From a Class's Own Kit (2026-10-01)

With every class now built out through level 30 with its own evasion/shield
tools (Bulwark Stance, Riposte Stance, Arcane Barrier, Ward, Evasive
Maneuvers, Vanish, Barkskin, ...), the free universal Defend action
(every character's own "+10% evasion and Advantage on Flee" button, no
class or resource required) no longer fits -- per the user, defensive
advantage should come from playing a class's own kit, not a freebie every
character gets regardless of class. Removed entirely, superseding the
"Defend: +10% Evasion, Made Visible" entry above.

This took out more than the action itself: Defend was the *only* thing
that ever set the `dodging` flag (Advantage on Flee attempts, and on a
party member's Dexterity saving throws), so once Defend was gone,
`dodging` itself became dead state with nothing left to set it -- removed
along with it, rather than left as inert plumbing for some future
ability to pick up. `tempEvasionBonus` stayed: buff-kind actions (Arcane
Barrier, Enrage, every other class's own stance) already write to it
independently of Defend, so it's still very much alive.

- `actions.ts`: `DEFEND_ACTION` and the `"defend"` `ActionKind` removed.
- `character.ts`: `DEFEND_ACTION` no longer spliced into every
  character's generated action list (alongside Basic Attack/Flee/End
  Turn).
- `combat.ts`: `resolveDefend`, `DEFEND_EVASION_BONUS`, the `"defend"`
  `CombatEventKind`, and the `dodging` field/its two read sites (Flee's
  Advantage roll, `fleeChancePercent`'s matching odds math, and the dex
  save-chance bonus) all removed. `dice.ts`'s `rollD20WithEdge` helper
  (advantage/disadvantage rerolling) became unused once Flee's own
  Advantage case went away, so it was removed too rather than left
  orphaned -- Flee now just rolls a plain `rollD20`.
- Client: `CombatHud.tsx`'s "Defending" status chip (synthesized from
  `player.dodging`, not a real status effect) removed; `CombatScreen.tsx`
  no longer treats a `"defend"` log-event kind as a buff-flash trigger.
  A few stale comments elsewhere (`combatDisplay.ts`,
  `CharacterCreationScreen.tsx`) updated to stop naming Defend.
- Engine tests: two tests that functionally exercised Defend (a
  hit-chance-reduction test, and a "use a free action to pass the turn"
  helper in an unrelated DoT-lethality test, which now uses End Turn
  instead) were updated or trimmed; the `dodging`-specific
  `fleeChancePercent` "Advantage" test was removed outright since the
  mechanic it tested no longer exists. Net: 199 tests (was 200 after the
  Wizard build-out), verified passing.
- Verified live: a Playwright pass against a real combat screen confirmed
  no "Defend" button appears anywhere in the action bar, and End Turn/Flee
  and the rest of the turn loop (including auto-resolved enemy turns)
  still work with no console errors.

### Critical files
`packages/engine/src/actions.ts`, `character.ts`, `combat.ts`, `dice.ts`;
`apps/client/src/components/combat/CombatHud.tsx`,
`apps/client/src/screens/CombatScreen.tsx`;
`packages/engine/src/__tests__/{character,combat,resources}.test.ts`.

## Monster Roster Spans Level 1-30; World Map Rebalanced Around It (2026-10-01)

Monsters already had a `level` field (`monsters.ts`) feeding real combat math
(`stats.ts`'s `computeLevelGapMissChance`, on both sides of every attack
roll) -- but only 5 templates existed, spanning levels 1-3, while players can
now reach 30. This adds a roster across the full range and rebuilds the
world map's region-level data to match it, per the user: Ridgeton (Tameless
Shore) is the game's only level-1 starting region; Mhistana Detritus,
Windshear Peaks, and Frostbound Wastes are the three level-30 endgame zones.

**The region level curve** (`apps/client/src/game/eridanMap.ts`'s `REGIONS`)
replaces an earlier placeholder table that predated the XP/leveling system
entirely and was never reconciled with it -- every region sat at 20-44 (past
`LEVEL_CAP`), with the home region itself tagged 20-24. The new curve is a
straight-line interpolation for each of the 28 regions between its pixel
distance to Tameless Shore (level 1) and its distance to the nearest of the
three endgame anchors (level 30), computed directly from the anchors'
existing x/y coordinates rather than hand-assigned per region. A single
region's level is deliberately *not* independently overridable in this
pass -- the whole curve is one formula from three fixed points, so a future
change to any region's intended difficulty means moving an anchor or
re-running the interpolation, not hand-editing one row.

**The monster roster** (`packages/engine/src/monsters.ts`) grew from 5 to
31 templates: Dire Wolf (was level 2) and the Orc Marauder/Shaman pair
(were level 3) got re-leveled to 8 and 20 to match Tiuv Forest's and
Collmhor Wood's new region levels, and 26 new templates fill in the rest of
the curve, each grounded in the Encyclopedia of Eridan's own geography and
two creatures its own chapter drafts had already named (Slaybear,
Flightless Horror, both now living in the Frostbound Wastes). Stats were
sized against the real player power curve at each level (HP, Strength) via
a quick reference script, not guessed -- a monster's HP/ability scores/XP
scale with its level the way a level-appropriate player's own stats do,
following the same "curated stat block" precedent the original 5 templates
set (hand-tuned, not formula-derived, but checked against real numbers).

**Encounters**: only 4 background images exist (`Ridgeton`, `Tameless
Shore`, `Tiuv Forest`, `Collmhor Wood`), so only those three combat
backdrops got new, actually-clickable World Map encounters -- one more each
for Tameless Shore (Bandit Thug/Brigand Archer), Tiuv Forest (Ironwood
Enforcer/Giant Spider), and Collmhor Wood (an Orc Warchief vanguard), each
placed on its own nearby-but-distinct hex (`ENCOUNTER_HEX_KEYS`) since two
encounters can't share one hex in the current lookup. The other ~20 new
monsters (Sepulcher Hills, Bronze Hills, the three endgame regions, ...)
are fully playable in the engine but have no clickable encounter yet --
those regions have no background art. Flagged for whenever that art exists.

New engine tests (`monsters.test.ts`) check the roster's own shape rather
than exact numbers (every key matches its own `id`, the level range spans
1 to `LEVEL_CAP`, every 5-level band has at least one template, HP/XP both
grow substantially from the low tier to the level-30 endgame tier) plus a
smoke test that a re-leveled legacy template and a new one both resolve
correctly through `getMonsterTemplate`/`createMonster`. Verified live: the
World Map's Ridgeton panel now shows "LEVEL RANGE 1–5" / "Safe" instead of
the old 20-24, and all 6 encounter hexes (3 original + 3 new) resolve to
distinct, collision-free hexes.

### Critical files
`packages/engine/src/monsters.ts`;
`apps/client/src/game/eridanMap.ts` (`REGIONS`, `ENCOUNTER_HEX_KEYS`),
`apps/client/src/game/lore.ts` (`ENCOUNTERS`);
`packages/engine/src/__tests__/monsters.test.ts`.

## World Map Spawn System: A Living, Dangerous Map (2026-10-03)

Per the user: the World Map should feel alive and dangerous, not static --
monsters should spawn out in the wilds (never on a town/landmark or one of
the 6 hand-authored encounters), linger a couple minutes, then either wander
to an adjacent hex "as if traveling themselves" or disappear. This adds that
system entirely client-side, per-character, reusing `TravelState`'s own
"persist wall-clock timestamps, recompute from `Date.now()` on mount/tick"
pattern rather than inventing a server-side tick loop -- there's no shared
Supabase "world" table to put one in, and there doesn't need to be, since
each player's own wandering monsters are just their own flavor of danger.

**Data model** (`packages/engine/src/character.ts`): a new `MonsterSpawn`
(`id`, `hexKey`, `templateId`, `since`, `nextEventAt`) and an optional
`WorldMapState.monsterSpawns` array. The engine treats every field as
opaque data -- a hex key and a template id, both plain strings -- the same
way `TravelState.toHexKey` already is; no new Supabase migration needed,
since it rides along in the same `data` JSONB column everything else does.

**Lifecycle** (new `apps/client/src/game/monsterSpawns.ts`): `reconcileMonsterSpawns`
advances every spawn whose `nextEventAt` has passed -- a 2-4 minute random
lifetime -- rolling 60% to wander to a random eligible neighbor hex (via a
new `hexNeighbors` helper in `eridanMap.ts`, built on the already-tested
`hexDisk(key, 1)` rather than new cube math) or 40% to despawn, repeated up
to `MAX_CATCHUP_HOPS` times per spawn so a player who was away for hours
doesn't force an unbounded loop -- it just catches up a few hops and lets
the top-up refill the rest. After resolving existing spawns it tops the
roster back up to a target of 6 from the party's own explored hexes.
Eligibility (`isEligibleHex`) excludes water, any `POINTS_OF_INTEREST` hex
(both settlement and landmark kinds, so a spawn marker never overlaps a
named place's own), the 6 fixed `ENCOUNTER_HEX_KEYS`, and any hex without a
resolvable region. A spawn's monster template is picked from the full
31-template roster (`MONSTER_TEMPLATES`), filtered to its hex's region's own
`[lo, lo+4]` level band -- the same band `REGIONS`' `levelRange` labels use
-- falling back to the single closest-by-level template if that band is
empty. Solo monster per spawn, not a multi-enemy encounter, so a chance
roadside threat doesn't require full-party-fight commitment to even look at.

**World Map integration** (`WorldMapScreen.tsx`): a reconciliation effect
runs once terrain is sampled and then every 10 seconds while the screen is
open, persisting via `onUpdateCharacter` only when something actually
changed. Each spawn renders as a small pulsing red dot on the hex map (CSS
animation, `WorldMapScreen.css`), visible once its hex is explored --
clicking one shows the same "ENCOUNTER" side panel a fixed encounter does
(location, flavor text, a FOES row naming the monster), with "Venture Out"
appearing once the party is actually standing on that hex. A new
`buildSpawnEncounter` helper turns a `MonsterSpawn` into an ad-hoc single-
monster `Encounter` for `beginEncounter` (which only ever reads `id`/
`monsters`, so generic flavor text is enough), picking whichever of the 3
existing combat backdrops (Tameless Shore/Tiuv Forest/Collmhor Wood) is
geographically closest to the spawn's own hex. Venturing out removes that
spawn from the character's own `monsterSpawns` before handing the ad-hoc
encounter off, so it can't reappear once combat resolves -- `onChooseEncounter`'s
signature grew a second `character` parameter (`App.tsx`'s combat-screen
transition now uses it instead of the screen's own stale `character`) so
this removal can't be lost to React's batched state updates landing after
the encounter's already been read.

**Bug fix, caught while touching this code**: `dangerTier`/`encounterChance`
(`eridanMap.ts`) still used hardcoded level breakpoints (23/26/31) from the
old pre-rebalance 20-44 region scale, never updated when `REGIONS` was
rewritten to the new 1-30 curve in the previous round -- so nearly the
entire map read "Safe" regardless of its actual region level, and even the
three level-30 endgame regions only showed "Dangerous," never "Deadly."
Rescaled to 5/15/24, matching the new curve -- directly relevant here, since
"a sense of danger" was half the point of this feature.

No test infrastructure exists in `apps/client` (confirmed: no `*.test.*`
files, no `test` script, no vitest config), so `monsterSpawns.ts`'s pure
logic was verified with a throwaway script (`tsx`, a synthetic `TerrainSample`
covering a radius-12 disk around Ridgeton, a seeded RNG): ~200 simulated
ticks confirmed the spawn count never exceeds 6, no two spawns ever share a
hex, every spawn sits on a non-water, non-POI, non-fixed-encounter hex with
a resolvable region, every wander moves to a true adjacent hex, every
template's level falls in its hex's region band, and a spawn stale by many
lifetimes still resolves in well under a second (the catch-up cap holding).
The full World Map integration was verified live with a throwaway
`sandbox.html` Playwright pass (same pattern as Character Select's own
mocked-roster verification, this container's network policy still blocking
outbound Supabase): confirmed spawns auto-populate to 6 on terrain load,
render as map markers, and that clicking one through to "Venture Out" fires
the correct ad-hoc `Encounter` and drops the spawn count from 6 to 5 with
its hex freed. Also reran the full engine test suite (205 tests) and a
clean `tsc --noEmit` + `vite build` for the client.

### Critical files
`packages/engine/src/character.ts` (`MonsterSpawn`, `WorldMapState`);
`apps/client/src/game/eridanMap.ts` (`hexNeighbors`, `dangerTier`,
`encounterChance`), `apps/client/src/game/monsterSpawns.ts` (new);
`apps/client/src/screens/WorldMapScreen.tsx`+`.css`, `apps/client/src/App.tsx`.

## Fix: Spawn Movement Now Animates Instead of Silently Teleporting (2026-10-03)

The user reported that a wandering monster's dot "only updates when the
player finishes a travel," and that a monster visible on arrival would
already be gone by the time they tried to engage it. A live timing
investigation (a throwaway Playwright harness logging every reconcile tick
with real timestamps over several 2-3 minute windows) **ruled out** the
suspected cause: `reconcileMonsterSpawns`'s 10-second interval
(`WorldMapScreen.tsx`) genuinely fires on its own schedule, correctly
computed from real elapsed time, completely independent of travel -- a
spawn's position was observed updating mid-test with no travel in progress
at all, and the "only updates on arrival" effect was unreproducible as a
timing bug.

The real explanation is simpler: a spawn's own lifetime (2-4 minutes) is
frequently *shorter* than the time it takes the party to travel to it
(`TRAVEL_SECONDS_PER_HEX` × distance), so a monster spotted several hexes
away routinely wanders off or despawns before the party arrives -- which is
the system working as designed, not a bug. But because a surviving spawn's
marker previously just snapped its `cx`/`cy` SVG attributes to the new hex
instantly on each reconcile tick, and a despawned one simply vanished from
the DOM the instant it was removed from the array, any movement that
happened while the player wasn't actively staring at that exact spot was
invisible -- it looked like nothing happened until the next thing that
caught their attention (arriving) revealed the monster was already
somewhere else.

**Fix** (`WorldMapScreen.tsx`/`.css`, no change to the reconcile logic
itself): a surviving spawn keeps the same React `key` (its own `id`) across
a wander, so its `cx`/`cy` are now set via inline `style` rather than plain
JSX attributes, with a `transition: cx 1.4s ease, cy 1.4s ease` CSS rule on
`.aow-hexmap-spawn-dot` -- the browser now visibly slides the dot hex-to-hex
over 1.4 seconds instead of popping it to the new position. A despawned
spawn is now kept around for 1.2 seconds at its last-known hex as a
short-lived "ghost" (`ghostSpawns` state, diffed against the previous
render's spawn-id set via a `useEffect`+`useRef`) with a
`aow-spawn-dot-despawn` fade-and-grow animation, instead of instantly
disappearing. Movement is now visible whenever it happens, including while
the player is mid-travel and simply has the map on screen.

Verified live: re-ran the same timing harness and confirmed (again,
independent of any travel) the interval still fires correctly and a
despawn event correctly produces a fading-then-removed marker with no
stuck ghosts; confirmed via computed-style inspection that the new
`transition: cx, cy` rule is actually applied to the live DOM nodes and
that a surviving spawn's marker is the *same* DOM node across ticks (not
remounted) -- the precondition for the CSS transition to animate rather
than snap. Didn't happen to catch a live wander event frame-by-frame in
this pass (the 40%-despawn / 60%-wander roll landed on despawn both times),
but the three confirmed facts together (transition rule applied + stable
node identity + a wander changes a surviving spawn's `hexKey` under the
same `id`, established in the previous round's own live test) are jointly
sufficient: a CSS `transition` on a changing property of a stable element
animates, by definition. Also reran the full engine suite (205 tests) and
a clean client `tsc --noEmit` + `vite build`.

### Critical files
`apps/client/src/screens/WorldMapScreen.tsx`+`.css`.

## Lore

World content is grounded in the project's own **Encyclopedia of Eridan**
(staged in the shared Drive folder, `Eridan MMO/Eridan Lore Files`), not
invented placeholder names. Currently wired in (`apps/client/src/game/lore.ts`,
plus race/monster flavor text in `packages/engine`):

- **Ridgeton**, a logging town on the Tameless Shore, as the player hub.
- Three starting encounters on real Eridan geography: the **Tameless Shore**
  (goblins out of Claw Bay), **Tiuv Forest** (a dire wolf), and **Collmhor
  Wood** (an orc marauder, per the orcs-vs-bugbears conflict noted there).
- Race flavor text tied to real locations (dwarves/Bronze Hills, halflings/
  Prakov's Gift, wood elves/Corran Woodland, orcs/Collmhor Wood & Raduna).

Not yet pulled in: the Encyclopedia's remaining race list (Bugbears,
Goblins, and Kobolds are canon "common races" alongside the 9 already
playable), its magic system (Divinity/Demonic/Wild/Arcane), named NPCs and
factions, and the `Chapters` folder's
22 narrative chapters (three POV characters — useful for tone and NPC
writing later, not consulted for this pass). The Encyclopedia also lists
"Selyria," "Synndara," and "Verach" as candidate names for the world itself,
with Eridan specifically the first/only continent — this project uses
"Eridan" throughout, matching how it's been referred to so far.

## Assets

UI art is from the craftpix.net "Fantasy RPG GUI" pack (`craftpix-500908-fantasy-rpg-gui`),
used under its standard craftpix.net license. Wired in so far
(`apps/client/src/assets/ui`): a background texture, the HP bar frame, the
party/enemy portrait frames, and — on the character sheet — two ribbon
banners cropped from the pack's Character and Inventory screen mockups (one
blank, used as the sheet's title banner with the character's name overlaid;
one with "Inventory" baked into the art, used as-is above the item list).
Both crops keep the mockups' circular close button, repurposed as the
sheet's "back to town" control. The pack doesn't include standalone item
icons, so equipment-slot glyphs (weapon/armor/accessory) are small inline
SVGs in `apps/client/src/components/ItemSlotIcon.tsx` rather than pack art.
The rest of the pack (login/registration screens, journal, map, skill tree,
etc.) is staged in the project's shared Drive folder for when those systems
get built — no point shipping unused art for screens that don't exist yet.

Battle backgrounds (`apps/client/src/assets/backgrounds`) are sourced from
craftpix.net's horizontal battle-background packs (the "Background
Environments" Drive folder holds six full packs), also under the standard
craftpix.net license, picked per encounter location: a beach/coastline
scene for the Tameless Shore, a wooded river valley for Tiuv Forest, and a
jungle-with-ruins scene for Collmhor Wood (which doubles nicely as the "old
ruins" orcs and bugbears fight over there). Ridgeton's town hub uses a
castle-towers skyline from the same "Castle Battle Arena" pack. The
remaining packs (arena floors/walls, ship interior, cave, and plains/land
variants) are staged for future locations.
