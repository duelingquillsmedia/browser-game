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
  (the first resource-costing action each combat costs 1 less) and Dwarf's
  Stoneblood (poison resistance) are real; Human's Many Roads (+10%
  experience) is flavor-only, since there's no leveling/XP system yet.
- A Background system, per the SRD 2024 rules: it's your Background, not
  your species, that grants ability score increases and an Origin feat.
  The 4 backgrounds detailed in the free SRD are implemented (Acolyte,
  Criminal, Sage, Soldier), each granting +1 to three abilities and one of
  the 4 free Origin feats (Alert's initiative bonus, Magic Initiate's bonus
  cantrip, Savage Attacker's reroll-and-keep-higher damage dice, or
  Skilled). The new Character Creation flow no longer asks for one --
  each class auto-picks a thematically fitting Background internally.
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
- A character sheet: full ability scores, race traits, Background and
  Origin feat, and current abilities, plus inventory and equipment slots
  (weapon/armor/accessory).
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
  model, in place of the old SRD point-buy/rolled-stats step. The six
  ability scores are renamed to match (Constitution → Vitality, Charisma →
  Spirit; Strength/Dexterity/Intellect/Wisdom keep their names), and Fighter
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
  internally (e.g. Mage → Sage) purely for its Origin feat and small stat
  bonus, with no player-facing step for it. The Appearance step's presets
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
- **Race and Origin feat hooks**: Alert adds its proficiency bonus to
  initiative (unchanged, still a d20 roll); Savage Attacker rolls the
  attack's damage variance twice and keeps the higher result (updated from
  "rerolls damage dice" now that damage has no dice to reroll — see below).
  (Superseded by Character Creation, below: the SRD-era
  Halfling's Lucky reroll, Orc's Relentless Endurance, and Dragonborn's
  Breath Weapon were removed along with those species; an Elf's Silverleaf
  Step is the new roster's equivalent race-trait hook, discounting the
  first resource-costing action each combat by 1.)
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
  than regenerating each turn.
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
