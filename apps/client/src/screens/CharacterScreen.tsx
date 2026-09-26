import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  BACKGROUNDS,
  CLASSES,
  LEVEL_CAP,
  ORIGIN_FEATS,
  RACES,
  abilityMod,
  computeResourceMax,
  equipItem,
  getClassResource,
  getItem,
  unequipItem,
  xpToNextLevel,
  type AbilityKey,
  type Character,
  type ItemSlot,
  type ItemTemplate,
} from "@eridan/engine";
import { combatStatGroups, equipmentTileStyle, resistanceRows } from "../game/characterDisplay";
import { ItemIcon } from "../components/ItemIcon";
import { ItemSlotIcon } from "../components/ItemSlotIcon";
import "./CharacterScreen.css";

export interface CharacterScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

const ABILITY_HINTS: Record<AbilityKey, string> = {
  str: "Warrior attack rolls and melee damage.",
  dex: "Evasion, crit chance, initiative, and Rogue attacks.",
  vit: "Maximum HP and Second Wind-style healing.",
  int: "Mage spellcasting and Intellect saves.",
  wis: "Cleric and Druid spellcasting; Wisdom saves.",
  spi: "Spirit saves and resource regeneration.",
};

/** Slot layout matching the design handoff's paper-doll grouping. Only weapon/armor/accessory are real today. */
const LEFT_SLOTS: { id: string; label: string; real?: ItemSlot }[] = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "shoulders", label: "Shoulders" },
  { id: "chest", label: "Chest", real: "armor" },
  { id: "waist", label: "Waist" },
  { id: "legs", label: "Legs" },
];

const RIGHT_SLOTS: { id: string; label: string; real?: ItemSlot }[] = [
  { id: "cloak", label: "Cloak" },
  { id: "hands", label: "Hands" },
  { id: "feet", label: "Feet" },
  { id: "ring1", label: "Ring" },
  { id: "ring2", label: "Ring" },
  { id: "trinket", label: "Trinket", real: "accessory" },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatItemStats(item: ItemTemplate): string | null {
  const parts: string[] = [];
  if (item.damageMin !== undefined && item.damageMax !== undefined) {
    const ability = item.ability ?? "str";
    const damageType = item.damageType ?? "slashing";
    parts.push(`${item.damageMin}-${item.damageMax} Damage · ${capitalize(damageType)} (${ABILITY_NAMES[ability]})`);
  }
  if (item.evasionBonus) parts.push(`+${item.evasionBonus} Evasion`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function EquipmentSlot({
  label,
  real,
  side,
  character,
  onUpdateCharacter,
}: {
  label: string;
  real?: ItemSlot;
  side: "left" | "right" | "weapon";
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}) {
  const itemId = real ? character.equipment[real] : undefined;
  const item = itemId ? getItem(itemId) : undefined;
  const tile = equipmentTileStyle(item);
  const candidates = real
    ? character.inventory.map((stack) => getItem(stack.itemId)).filter((candidate) => candidate.slot === real && candidate.id !== itemId)
    : [];
  const size = side === "weapon" ? 52 : 44;

  const tileEl = (
    <div
      className="aow-eq-tile"
      style={{
        width: size,
        height: size,
        borderColor: tile.borderColor,
        background: tile.background,
        boxShadow: tile.boxShadow,
        color: tile.color,
      }}
      title={item ? `${item.name}${formatItemStats(item) ? ` — ${formatItemStats(item)}` : ""}` : real ? `Nothing in ${label}` : `${label} — not available yet`}
    >
      {item ? <ItemIcon itemId={item.id} slot={real!} /> : real ? <ItemSlotIcon slot={real} /> : <span className="aow-eq-tile-abbr">{label.slice(0, 3).toUpperCase()}</span>}
    </div>
  );

  const infoEl = (
    <div className={`aow-eq-info${side !== "weapon" ? " aow-eq-info-hideable" : ""}`}>
      <div className="aow-eq-slot-label">{label.toUpperCase()}</div>
      <div className="aow-eq-item-name" style={item ? { color: tile.color } : undefined}>
        {item ? item.name : "—"}
      </div>
      {side === "weapon" && item && <div className="aow-eq-value">VAL {item.value}G</div>}
    </div>
  );

  return (
    <div className={`aow-eq-row aow-eq-row-${side}`}>
      <div className="aow-eq-row-main">
        {side === "left" ? (
          <>
            {infoEl}
            {tileEl}
          </>
        ) : (
          <>
            {tileEl}
            {infoEl}
          </>
        )}
      </div>
      {real && (item || candidates.length > 0) && (
        <div className="aow-eq-row-actions">
          {item && (
            <button type="button" className="aow-eq-unequip" onClick={() => onUpdateCharacter(unequipItem(character, real))}>
              Unequip
            </button>
          )}
          {candidates.length > 0 && (
            <select
              className="aow-eq-swap"
              value=""
              onChange={(e) => e.target.value && onUpdateCharacter(equipItem(character, e.target.value))}
            >
              <option value="">{item ? "Swap to…" : "Equip…"}</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export function CharacterScreen({ character, onUpdateCharacter }: CharacterScreenProps) {
  const race = RACES[character.raceId];
  const cls = CLASSES[character.classId];
  const background = BACKGROUNDS[character.backgroundId];
  const originFeat = ORIGIN_FEATS[character.originFeatId];
  const resourceConfig = getClassResource(character.classId);
  const resourceMax = computeResourceMax(character.abilityScores, character.classId, character.level);

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100));
  const resourcePct =
    resourceConfig && resourceMax ? Math.max(0, Math.min(100, ((character.resource ?? 0) / resourceMax) * 100)) : 0;

  const atLevelCap = character.level >= LEVEL_CAP;
  const xpNeeded = atLevelCap ? 0 : xpToNextLevel(character.level);
  const xpPct = atLevelCap ? 100 : Math.max(0, Math.min(100, (character.xp / xpNeeded) * 100));

  const gearValue = (Object.values(character.equipment).filter(Boolean) as string[]).reduce(
    (sum, id) => sum + getItem(id).value,
    0,
  );

  const groups = combatStatGroups(character);
  const resists = resistanceRows(character);

  return (
    <div className="aow-character">
      <p className="aow-eyebrow">
        {character.name.toUpperCase()} · LEVEL {character.level} {race?.name?.toUpperCase() ?? character.raceId.toUpperCase()}{" "}
        {cls?.name?.toUpperCase() ?? character.classId.toUpperCase()}
      </p>
      <h1 className="aow-h1">Character</h1>

      <div className="aow-character-columns">
        <div className="aow-character-col aow-character-col-left">
          <div className="aow-panel">
            <div className="aow-card-body aow-char-identity-body">
              <div className="aow-char-identity">
                <div className="aow-char-level-diamond">
                  <span>{character.level}</span>
                </div>
                <div>
                  <div className="aow-char-name">{character.name}</div>
                  <div className="aow-char-sub">
                    {race?.name ?? character.raceId} · {cls?.name ?? character.classId}
                    {background ? ` · ${background.name}` : ""}
                  </div>
                </div>
              </div>

              <div className="aow-bar-label">
                <span>HEALTH</span>
                <span>
                  {character.hp} / {character.maxHp}
                </span>
              </div>
              <div className="aow-bar-track aow-bar-track-tall">
                <div className="aow-bar-fill hp" style={{ width: `${hpPct}%` }} />
              </div>

              {resourceConfig && (
                <>
                  <div className="aow-bar-label" style={{ marginTop: 8 }}>
                    <span>{resourceConfig.name.toUpperCase()}</span>
                    <span>
                      {character.resource ?? 0} / {resourceMax}
                    </span>
                  </div>
                  <div className="aow-bar-track aow-bar-track-tall">
                    <div className="aow-bar-fill mana" style={{ width: `${resourcePct}%` }} />
                  </div>
                </>
              )}

              <div className="aow-bar-label" style={{ marginTop: 8 }}>
                <span>EXPERIENCE</span>
                <span>{atLevelCap ? "Max Level" : `${character.xp.toLocaleString()} / ${xpNeeded.toLocaleString()}`}</span>
              </div>
              <div className="aow-bar-track aow-bar-track-xp">
                <div className="aow-bar-fill gold" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>

          <div className="aow-panel aow-attributes-panel">
            <div className="aow-panel-header aow-panel-header-plain">ATTRIBUTES</div>
            <div className="aow-attr-list">
              {ABILITY_KEYS.map((key) => (
                <div key={key} className="aow-attr-row">
                  <span className="aow-attr-abbr">{key.toUpperCase()}</span>
                  <div className="aow-attr-row-mid">
                    <div className="aow-attr-row-name">{ABILITY_NAMES[key]}</div>
                    <div className="aow-attr-row-hint">{ABILITY_HINTS[key]}</div>
                  </div>
                  <div className="aow-attr-row-value">
                    <div className="aow-attr-row-total">{character.abilityScores[key]}</div>
                    <div className="aow-attr-row-mod">{formatModifier(abilityMod(character, key))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="aow-panel aow-character-col aow-equipment-panel">
          <div className="aow-panel-header aow-eq-header">
            EQUIPMENT
            <span className="aow-eq-header-spacer" />
            <span className="aow-eq-header-meta">
              GOLD <span>{character.gold.toLocaleString()}G</span>
            </span>
            <span className="aow-eq-header-meta">
              GEAR VALUE <span>{gearValue}G</span>
            </span>
          </div>
          <div className="aow-equipment-body">
            <div className="aow-equipment-columns">
              <div className="aow-equipment-column">
                {LEFT_SLOTS.map((slot) => (
                  <EquipmentSlot key={slot.id} label={slot.label} real={slot.real} side="left" character={character} onUpdateCharacter={onUpdateCharacter} />
                ))}
              </div>
              <div className="aow-equipment-portrait">
                <span>{character.name}</span>
                <span className="aow-muted-text">
                  {race?.name ?? character.raceId} {cls?.name ?? character.classId}
                </span>
              </div>
              <div className="aow-equipment-column">
                {RIGHT_SLOTS.map((slot) => (
                  <EquipmentSlot key={slot.id} label={slot.label} real={slot.real} side="right" character={character} onUpdateCharacter={onUpdateCharacter} />
                ))}
              </div>
            </div>
            <div className="aow-weapon-row">
              <EquipmentSlot label="Melee Weapon" real="meleeWeapon" side="weapon" character={character} onUpdateCharacter={onUpdateCharacter} />
              <EquipmentSlot label="Ranged Weapon" real="rangedWeapon" side="weapon" character={character} onUpdateCharacter={onUpdateCharacter} />
            </div>
          </div>
        </div>

        <div className="aow-character-col aow-character-col-right">
          <div className="aow-panel">
            <div className="aow-panel-header aow-panel-header-plain">COMBAT</div>
            <div className="aow-combat-groups">
              {groups.map((group) => (
                <div key={group.title} className="aow-combat-group">
                  <div className="aow-combat-group-title">{group.title.toUpperCase()}</div>
                  {group.rows.map((row) => (
                    <div key={row.label} className="aow-stat-row">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="aow-panel" style={{ marginTop: 14 }}>
            <div className="aow-panel-header aow-panel-header-plain">RESISTANCES</div>
            <div className="aow-resist-body">
              {resists.length === 0 ? (
                <p className="aow-muted-text" style={{ padding: "0 14px 12px" }}>
                  No notable resistances or vulnerabilities.
                </p>
              ) : (
                resists.map((row) => (
                  <div key={row.label} className="aow-resist-row">
                    <span className="aow-resist-name">{row.label}</span>
                    <div className="aow-resist-track">
                      <div className="aow-resist-fill" style={{ width: `${row.pct}%`, background: row.color, boxShadow: `0 0 8px ${row.color}` }} />
                    </div>
                    <span className="aow-resist-value" style={{ color: row.color }}>
                      {row.valueText}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="aow-panel aow-full-width">
        <div className="aow-panel-header">BACKGROUND &amp; TRAITS</div>
        <div className="aow-card-body aow-trait-grid">
          {background && (
            <div className="aow-trait-card">
              <h3>{background.name}</h3>
              <p>{background.description}</p>
            </div>
          )}
          {originFeat && (
            <div className="aow-trait-card">
              <h3>{originFeat.name}</h3>
              <p>{originFeat.description}</p>
            </div>
          )}
          {race?.traits.map((trait) => (
            <div key={trait.name} className="aow-trait-card">
              <h3>{trait.name}</h3>
              <p>{trait.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
