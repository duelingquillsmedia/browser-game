import {
  currentCombatant,
  getClassResource,
  getSchool,
  isTargetable,
  type Combatant,
  type CombatActionDef,
  type CombatLogEntry,
  type CombatState,
  type StatusEffectKind,
} from "@eridan/engine";

/** Tints a status-effect chip by its kind, independent of any one status's own flavor name. */
const STATUS_KIND_COLOR: Record<StatusEffectKind, string> = {
  cc: "var(--aow-violet)",
  dot: "var(--aow-hp)",
  hot: "var(--aow-green)",
  shield: "var(--aow-frost)",
  guard: "var(--aow-gold)",
  buff: "var(--aow-ember)",
  proc: "var(--aow-mana)",
};

export function statusKindColor(kind: StatusEffectKind): string {
  return STATUS_KIND_COLOR[kind];
}

/**
 * Pure, UI-only presentation helpers for the Combat screen, ported from the
 * Combat UI handoff's own `renderVals()`/`layout()` (see
 * `Fantasy Combat Game - Combat UI/design_handoff_aetherwyn_combat/`).
 * None of these touch or duplicate game rules -- they only reshape data the
 * engine already computes into what the handoff's exact layout needs.
 */

/** A short 1-3 letter tag standing in for real portrait art, e.g. "Cinder Cultist" -> "CC". */
export function initialsFor(name: string): string {
  // Strips punctuation (e.g. the "(Melee)"/"(Ranged)" suffix on a generated Basic Attack's
  // name) before taking initials, so a stray "(" never ends up as one of them.
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export interface TurnDividerChip {
  key: string;
  isDivider: true;
  round: number;
}

export interface TurnUnitChip {
  key: string;
  isDivider: false;
  tag: string;
  name: string;
  color: string;
  size: "44px" | "34px";
  glow: string;
  opacity: number;
}

export type TurnChip = TurnDividerChip | TurnUnitChip;

interface RawChip {
  isDivider: boolean;
  round?: number;
  combatant?: Combatant;
  current?: boolean;
}

function unitColor(combatant: Combatant, isFutureProjection: boolean): string {
  if (combatant.side === "party") return "var(--aow-ember)";
  const rooted = !isFutureProjection && combatant.statusEffects.some((e) => e.defId === "rooted");
  return rooted ? "var(--aow-green)" : "var(--aow-enemy-tag)";
}

/**
 * The header's turn-order strip: the rest of this round (starting from
 * whoever's acting now), a round divider, then next round's full order --
 * exact, not approximated, since `state.turnOrder` is rolled once in
 * `startCombat` and stays fixed for the whole fight (unlike the handoff's
 * own prototype, which has to special-case the player always going first;
 * our real interleaved initiative order needs no such special case).
 * Truncated to 12 chips, sized/glowing/faded exactly per the handoff.
 */
export function buildTurnOrderStrip(state: CombatState): TurnChip[] {
  const combatantById = new Map(state.combatants.map((c) => [c.id, c]));
  const alive = state.turnOrder.map((id) => combatantById.get(id)!).filter((c) => isTargetable(c));
  const activeId = state.status === "active" ? currentCombatant(state).id : null;
  const startIndex = activeId ? Math.max(0, alive.findIndex((c) => c.id === activeId)) : 0;
  const restOfRound = alive.slice(startIndex);

  const raw: RawChip[] = [
    ...restOfRound.map((combatant, i) => ({ isDivider: false, combatant, current: i === 0 && activeId !== null })),
    { isDivider: true, round: state.round + 1 },
    ...alive.map((combatant) => ({ isDivider: false, combatant, current: false })),
  ];

  return raw.slice(0, 12).map((chip, i): TurnChip => {
    if (chip.isDivider) return { key: `divider-${chip.round}`, isDivider: true, round: chip.round! };
    const combatant = chip.combatant!;
    const isFutureProjection = i > restOfRound.length; // past the divider -> next round's projection
    const color = unitColor(combatant, isFutureProjection);
    return {
      key: `${combatant.id}-${i}`,
      isDivider: false,
      tag: initialsFor(combatant.name),
      name: combatant.name,
      color,
      size: chip.current ? "44px" : "34px",
      glow: chip.current ? `0 0 14px ${color}` : "none",
      opacity: chip.current ? 1 : i > 6 ? 0.5 : 0.8,
    };
  });
}

/** "SELF" / "RANK" (line shape) / "AREA" / "ALLY" / "ALL ENEMIES" / "ENEMY", for the actions info line's meta text. */
export function targetTypeLabel(action: CombatActionDef): string {
  if (action.target === "self") return "SELF";
  if (action.targetShape === "line") return "RANK";
  if (action.targetShape === "area") return "AREA";
  if (action.target === "ally") return "ALLY";
  if (action.target === "enemies") return "ALL ENEMIES";
  return "ENEMY";
}

/** An action's school color, falling back to the Martial school's tone for the schoolless shared actions (Strike, Defend) the handoff's single-Cleric prototype never had to color. */
export function schoolColor(action: CombatActionDef): string {
  return action.schoolId ? getSchool(action.schoolId).color : getSchool("martial").color;
}

export interface StageLayout {
  /** true = ranks stacked top/bottom ("Rows"); false = ranks side by side ("Columns"). */
  rows: boolean;
  /** Enemy unit art's square size, clamped 48-150px. */
  unitSize: number;
  /** Enemy nameplate width, clamped 120-168px. */
  plateWidth: number;
  /** Player art height, clamped 120-400px. */
  playerHeight: number;
  playerWidth: number;
  outerDir: "column-reverse" | "row";
  innerDir: "row" | "column";
  outerGap: string;
  innerGap: string;
}

/**
 * Ported verbatim from the handoff's `layout()`: measures the stage and
 * picks whichever of "Columns" (ranks side by side) or "Rows" (ranks
 * stacked) yields the larger enemy unit size, given the actual front/back
 * counts. `stageWidth`/`stageHeight` are the stage `<main>` element's own
 * measured pixel size (1600x900-space, pre-CSS-scale) -- the footer's
 * height is content-driven, so this can't be a fixed constant and needs a
 * live measurement (see `useCanvasScale`'s ResizeObserver).
 */
export function computeStageLayout(
  stageWidth: number,
  stageHeight: number,
  frontCount: number,
  backCount: number
): StageLayout {
  const avail = stageHeight - 46 - 12;
  const enemyColumnWidth = ((stageWidth - 48) * 1.55) / 2.55;
  const n = Math.max(1, frontCount, backCount);
  const PLATE_HEIGHT_ALLOWANCE = 50;
  const LABEL_ALLOWANCE = 21;

  const columnsCandidate = Math.min(
    (avail - LABEL_ALLOWANCE - (n - 1) * 10) / n - PLATE_HEIGHT_ALLOWANCE,
    (enemyColumnWidth - 48) / 2 - 40
  );
  const rowsCandidate = Math.min(
    (avail - 2 * LABEL_ALLOWANCE - 10) / 2 - PLATE_HEIGHT_ALLOWANCE,
    (enemyColumnWidth - (n - 1) * 14) / n - 20
  );

  const rows = rowsCandidate > columnsCandidate;
  const unitSize = Math.round(Math.max(48, Math.min(150, rows ? rowsCandidate : columnsCandidate)));
  let plateWidth = Math.max(120, Math.min(168, unitSize + 28));
  if (rows) plateWidth = Math.min(plateWidth, Math.floor((enemyColumnWidth - (n - 1) * 14) / n));

  const playerHeight = Math.round(Math.max(120, Math.min(400, avail - 50)));
  const playerWidth = Math.round(Math.min(playerHeight * 0.68, (stageWidth - 48) / 2.55 - 20));

  return {
    rows,
    unitSize,
    plateWidth,
    playerHeight,
    playerWidth,
    outerDir: rows ? "column-reverse" : "row",
    innerDir: rows ? "row" : "column",
    outerGap: rows ? "8px" : "clamp(28px, 4vw, 64px)",
    innerGap: rows ? "14px" : "10px",
  };
}

/**
 * The red disabled-reason text under the actions info line. Mirrors
 * `isActionReady`'s own check order (uses, cooldown, resource, AP) but
 * returns `null` for "on cooldown" -- that's shown via the skill-bar slot's
 * own cooldown-turns overlay instead of a redundant text reason.
 */
export function describeBlockReason(actor: Combatant, action: CombatActionDef, round: number): string | null {
  if (action.usesPerCombat !== undefined && (actor.actionUses[action.id] ?? 0) <= 0) return "No uses left this fight";
  if (action.cooldown !== undefined && round < (actor.actionCooldowns[action.id] ?? 0)) return null;
  if (action.resourceCost !== undefined && (actor.resource ?? 0) < action.resourceCost) {
    const resource = getClassResource(actor.classId);
    return `Not enough ${resource?.name ?? "resource"}`;
  }
  const apCost = action.apCost ?? 1;
  if (actor.ap !== undefined && actor.ap < apCost) return "Not enough AP";
  return null;
}

/** The actions info line's meta string, e.g. "RADIANT · 2 AP · 80 DIVINITY · CD 2 · ENEMY". */
export function skillMeta(actor: Combatant, action: CombatActionDef): string {
  const resource = getClassResource(actor.classId);
  const parts = [
    action.schoolId ? getSchool(action.schoolId).name.toUpperCase() : null,
    actor.ap !== undefined ? `${action.apCost ?? 1} AP` : null,
    action.resourceCost !== undefined && resource ? `${action.resourceCost} ${resource.name.toUpperCase()}` : null,
    action.cooldown !== undefined ? `CD ${action.cooldown}` : null,
    targetTypeLabel(action),
  ];
  return parts.filter(Boolean).join(" · ");
}

export interface LogSegment {
  text: string;
  color?: string;
}

/**
 * Splits a combat-log entry's plain-English `message` into colored segments
 * -- actor name ember, target name body color, and the numeric amount
 * hp-red (damage) or green (heal) -- by locating those already-known
 * substrings in the message, rather than requiring the engine to build log
 * lines out of separate parts. Skill names aren't separately colored by
 * school (the log only carries `actorId`/`targetId`/`kind`/`amount`, not
 * which action fired), so this gets close to the handoff's segment-colored
 * log without changing the engine's log format.
 */
export function buildLogSegments(entry: CombatLogEntry, state: CombatState): LogSegment[] {
  const byId = new Map(state.combatants.map((c) => [c.id, c]));
  const actorName = entry.actorId ? byId.get(entry.actorId)?.name : undefined;
  const targetName = entry.targetId ? byId.get(entry.targetId)?.name : undefined;
  const amountColor =
    entry.kind === "heal"
      ? "var(--aow-green)"
      : entry.kind === "hit" || entry.kind === "save-fail"
        ? "var(--aow-hp)"
        : undefined;

  const markers: { text: string; color: string }[] = [];
  if (actorName) markers.push({ text: actorName, color: "var(--aow-ember)" });
  if (targetName && targetName !== actorName) markers.push({ text: targetName, color: "var(--aow-body)" });
  if (entry.amount !== undefined && amountColor) markers.push({ text: String(entry.amount), color: amountColor });

  const segments: LogSegment[] = [];
  let remaining = entry.message;
  while (remaining.length > 0) {
    let best: { index: number; marker: (typeof markers)[number] } | null = null;
    for (const marker of markers) {
      const index = remaining.indexOf(marker.text);
      if (index !== -1 && (best === null || index < best.index)) best = { index, marker };
    }
    if (!best) {
      segments.push({ text: remaining });
      break;
    }
    if (best.index > 0) segments.push({ text: remaining.slice(0, best.index) });
    segments.push({ text: best.marker.text, color: best.marker.color });
    remaining = remaining.slice(best.index + best.marker.text.length);
  }
  return segments;
}
