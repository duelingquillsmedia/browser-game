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
- A handful of low-level encounters flavored around Eridan's Ashen Coast,
  Silverwood, and Bloodmere Plains.
- A first art pass: a textured background, an ornate HP bar, and portrait
  frames for party/enemy cards, drawn from a craftpix.net fantasy GUI kit
  (see [Assets](#assets)).
- A character roster and a home-base hub: sign in, pick or create a
  character, land in Fallowmere (the frontier waypost), venture out to
  fight, and rest to heal between trips.
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
  `Character` object; `id`/`user_id` are real Postgres columns for indexing
  and RLS.
- **Row-level security**: enabled, with policies restricting select/insert/
  update/delete to rows where `user_id = auth.uid()`. Verified directly
  against Postgres (simulating both the owning user and another user) that
  a user can fully manage their own characters and can't read, edit, or
  delete anyone else's.
- **Auth**: email/password via Supabase Auth (`AuthScreen`). New sign-ups
  may require email confirmation depending on the project's auth settings —
  the UI handles both the "signed in immediately" and "check your email"
  cases.
- **Env vars**: `apps/client/.env` (gitignored) needs `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_PUBLISHABLE_KEY`; see `.env.example`.

## Roadmap

1. ~~Single-player combat prototype~~ (milestone 1)
2. ~~Real accounts + persistent characters~~ (this milestone) → still to do:
   a shared zone/world and server-authoritative combat reusing
   `packages/engine` (currently combat still runs client-side).
3. Guilds, PvP duels/arenas, and group raids.
4. Expanded content: more races/classes, items and equipment, quests, and
   the full geography of Eridan.
5. Further art passes: character/monster sprites and per-location backgrounds
   as more craftpix.net packs get added (only the GUI kit is in so far).

## Assets

UI art is from the craftpix.net "Fantasy RPG GUI" pack (`craftpix-500908-fantasy-rpg-gui`),
used under its standard craftpix.net license. Only a handful of pieces are
wired in so far (`apps/client/src/assets/ui`): a background texture, the HP
bar frame, and the party/enemy portrait frames. The rest of the pack (login/
registration screens, inventory, journal, map, skill tree, etc.) is staged
in the project's shared Drive folder for when those systems get built —
no point shipping unused art for screens that don't exist yet.
