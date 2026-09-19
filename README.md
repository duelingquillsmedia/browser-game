# Eridan

A browser-based, D&D SRD-inspired MMORPG set in the world of Eridan. Turn-based
combat, multiple fantasy races, and (eventually) guilds, PvP, and raids.

## Status: Milestone 1.5 — real accounts + persistent characters

Milestone 1 proved out the core combat loop client-side only. This pass adds
real accounts and server-side persistence via Supabase, ahead of the full
client-server milestone (combat is still resolved in the browser for now).

- 5 playable races (Human, Elf, Dwarf, Orc, Halfling) with SRD-style ability
  bonuses and traits.
- 4 classes (Fighter, Rogue, Wizard, Cleric) with distinct actions.
- SRD-style mechanics: ability modifiers, d20 attack rolls vs. AC, initiative,
  proficiency bonus, saving-throw-style flee checks, crits/fumbles.
- Turn-based combat against AI-controlled monsters, with a combat log,
  Defend/buff AC bonuses, and once-per-combat abilities (e.g. Second Wind).
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
- A character sheet: full ability scores, race traits, and current
  abilities, plus inventory and equipment slots (weapon/armor/accessory).
  Equipping gear is functional, not cosmetic — it changes AC and the
  damage die on your basic attack in combat. Every character starts with
  a class-appropriate weapon and armor already equipped, and a spare
  accessory to try swapping in.
- Real accounts (email/password via Supabase Auth) and server-side character
  storage (Postgres via Supabase, row-level security scoped to the signed-in
  user) — see [Backend](#backend).

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
4. Expanded content: more races/classes, a larger item catalog (currently
   10 starter items), currency and a shop, quests, and the full geography
   of Eridan.
5. Further art passes: character/monster sprites, and more per-location
   backgrounds as new encounters and locations get added.

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

Not yet pulled in: the Encyclopedia's full race list (Bugbears, Gnomes,
Goblins, Kobolds are canon "common races" alongside the 5 already playable),
the full 12-class list (only 4 are implemented), its magic system (Divinity/
Demonic/Wild/Arcane), named NPCs and factions, and the `Chapters` folder's
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
