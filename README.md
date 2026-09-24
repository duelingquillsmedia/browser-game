# Age of Broken Wings

A browser-based, D&D SRD-inspired MMORPG set in the world of Eridan. Turn-based
combat, multiple fantasy races, and (eventually) guilds, PvP, and raids.

**A UI and combat overhaul is underway.** A full design handoff (out-of-combat
menus: Title, Home, Character, Inventory, Skills, Talents, World Map) lives in
`Fantasy Combat Game UI/design_handoff_aetherwyn_ui/` — see its own README for
the full spec. "Aetherwyn" in those files is this project's working title
before the game was renamed; treat it as synonymous with Age of Broken Wings.
The plan is to rebuild the out-of-combat UI to match that design one page at a
time (Title + Home shipped so far — see below), then design a lighter-weight,
still-turn-based combat system to replace the current D&D-SRD math. The
sections below describe what's live today, which still reflects the older
SRD-based systems except where noted.

## Status: Milestone 1.5 — real accounts + persistent characters

Milestone 1 proved out the core combat loop client-side only. This pass adds
real accounts and server-side persistence via Supabase, ahead of the full
client-server milestone (combat is still resolved in the browser for now).

- All 9 SRD 5.2.1 playable species (Human, Elf, Dwarf, Orc, Halfling,
  Dragonborn, Gnome, Goliath, Tiefling), each with speed and traits; several
  carry real mechanical hooks — a Dragonborn's fire resistance and
  once-per-fight Breath Weapon (an AoE save-for-half), a Dwarf's poison
  resistance, a Tiefling's fire resistance, an Orc's Relentless Endurance
  (survive a killing blow at 1 HP, once per fight), and a Halfling's Lucky
  trait (reroll a natural 1 on an attack roll).
- A Background system, per the SRD 2024 rules: it's your Background, not
  your species, that grants ability score increases and an Origin feat.
  The 4 backgrounds detailed in the free SRD are implemented (Acolyte,
  Criminal, Sage, Soldier), each granting +1 to three abilities and one of
  the 4 free Origin feats (Alert's initiative bonus, Magic Initiate's bonus
  cantrip, Savage Attacker's reroll-and-keep-higher damage dice, or
  Skilled).
- All 12 SRD classes (Fighter, Rogue, Wizard, Cleric, Barbarian, Bard,
  Druid, Monk, Paladin, Ranger, Sorcerer, Warlock) with distinct actions
  and SRD-accurate hit dice, primary ability, and saving throw
  proficiencies.
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
- A first real character sprite: an Elf Wizard party member now shows an
  animated idle/attack/hurt/die sprite in combat (contributed craftpix elf
  sprite sheets) instead of the generic portrait frame. Every other
  race/class combination still uses the generic portrait until more sprites
  are added.
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
- A character roster and a home-base hub: sign in, pick or create a
  character, land in Ridgeton (a logging town on the Tameless Shore),
  venture out to fight, and rest to heal between trips.
- A character sheet: full ability scores, race traits, Background and
  Origin feat, and current abilities, plus inventory and equipment slots
  (weapon/armor/accessory).
  Equipping gear is functional, not cosmetic — it changes AC and the
  damage die on your basic attack in combat. At creation, each class
  offers a choice of SRD-flavored starting loadouts (e.g. a Fighter picks
  between a longsword with a chain shirt or with lighter studded leather;
  a Monk stays unarmored either way). Whichever's picked comes already
  equipped, plus a spare accessory to try swapping in.
- Real accounts (email/password via Supabase Auth) and server-side character
  storage (Postgres via Supabase, row-level security scoped to the signed-in
  user) — see [Backend](#backend).
- The Misfit Six: every player character adventures alongside the six
  Ridgeton Tales companions (Magnus, Magnar, Kel'dos, Dondalian, Telerek,
  Valeriek), viewable and configurable from a new Party screen off the town
  hub. Each companion can be rolled (classic 4d6-drop-lowest) or left at
  their class's standard-array default, and up to three can be chosen to
  join the player on a mission — four in the field at once, counting
  yourself.
- Real multi-character combat: your active party now fights together, not
  just the player alone. Turn order interleaves every party member and every
  enemy by initiative, the ability bar and "whose turn" label switch to
  match whichever combatant is up, and a fight only ends in defeat once the
  *whole* party is down — one companion dropping doesn't end the mission.
  Each fighter's HP carries back to the town hub afterward (including
  companions who didn't fight), and resting heals the whole roster, not
  just the player.
- Class resource pools: Wizards draw on Arcane, Clerics on Divinity, and
  Druids/Paladins share a Wylde pool — all three work like a classic MMO
  mana bar (start full, spend it on spells, trickle a little back each of
  the caster's own turns). Barbarians build Rage by attacking or getting
  hit, then spend it on their hardest-hitting moves. Fighters start at 10
  of 20 Prowess, generated by their basic weapon Strike and spent on
  Slash/Second Wind — a builder/spender loop rather than a mana bar. Every
  ability bar slot shows its cost and grays out when it isn't affordable.
  Other classes (Rogue, Bard, Monk, Ranger, Sorcerer, Warlock) don't have a
  resource pool yet.
- **New UI, first slice**: a Title screen and a Home dashboard rebuilt to
  match the Aetherwyn design handoff — dark-arcane theme (Cinzel/Alegreya
  Sans/JetBrains Mono/Noto Sans Runic, ember accent), a persistent header +
  left nav (`GameShell`), and a Home page with Character/World
  Map/Inventory/Skills/Talents cards. This replaces the old Town Hub screen.
  World Map and Inventory/Skills cards currently bridge to the existing
  encounter-select and character-sheet screens (not yet rebuilt in the new
  style); Talents has no backing system yet and shows "Coming soon." The
  World Map card's background is the real Eridan map art from the design
  handoff.

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

- **Advantage/Disadvantage**: rolled as two d20s, keeping the higher/lower.
  Currently triggered by the Defend action (Disadvantage on attackers, per
  the SRD's actual Dodge action — not the flat AC bonus homebrew rule this
  used to be) and by attacking an Unconscious target (Advantage). The two
  cancel out rather than stacking, exactly per SRD.
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
  initiative; Savage Attacker rerolls a weapon hit's damage dice and keeps
  the higher result; a Halfling's Lucky trait rerolls a natural 1 on an
  attack roll; an Orc's Relentless Endurance drops them to 1 HP instead of
  Unconscious the first time they'd fall in a fight; a Dragonborn's Breath
  Weapon is a once-per-fight AoE save-for-half action built on the same
  "save" action kind as Fireball.
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
