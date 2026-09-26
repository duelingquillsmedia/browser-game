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
- Real accounts (email/password via Supabase Auth) and server-side character
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
- **Auth**: email/password and Google OAuth via Supabase Auth (`AuthScreen`).
  New email sign-ups may require confirmation depending on the project's
  auth settings — the UI handles both the "signed in immediately" and
  "check your email" cases. Google requires one-time setup outside this
  repo (see below) before the button works.
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
