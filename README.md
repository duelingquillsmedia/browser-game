# Eridan

A browser-based, D&D SRD-inspired MMORPG set in the world of Eridan. Turn-based
combat, multiple fantasy races, and (eventually) guilds, PvP, and raids.

## Status: Milestone 1 — single-player combat prototype

This first milestone proves out the core combat loop with no networking or
database yet: create a character, pick an encounter, and fight it out.

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

## Tech stack

TypeScript throughout.

- `packages/engine` — a UI-agnostic combat/character rules engine (dice,
  races, classes, characters, monsters, turn-based combat resolution). Pure
  functions with an injectable RNG, so it's fully unit-tested and reusable
  server-side once multiplayer combat needs to be authoritative.
- `apps/client` — a React + Vite single-page app that drives the engine for
  the single-player prototype.

Future milestones add a Node.js backend (`apps/server`) reusing
`packages/engine`, WebSockets for realtime play, and Postgres for persistence.

## Getting started

```bash
npm install
npm run dev    # starts the client at http://localhost:5173
npm test       # runs the engine's unit tests
npm run build  # builds the engine and client
```

## Roadmap

1. ~~Single-player combat prototype~~ (this milestone)
2. Client-server skeleton: accounts/login, persistent characters, a shared
   zone, server-authoritative combat reusing `packages/engine`.
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
