import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  BACKGROUNDS,
  BASIC_ATTACK,
  CLASSES,
  DAMAGE_TYPES,
  ORIGIN_FEATS,
  RACES,
  abilityMod,
  equipItem,
  getClassResource,
  getItem,
  unequipItem,
  type AbilityKey,
  type Character,
  type DamageType,
  type ItemSlot,
} from "@eridan/engine";
import { ItemIcon } from "../components/ItemIcon";
import { ItemSlotIcon } from "../components/ItemSlotIcon";
import "./CharacterScreen.css";

export interface CharacterScreenProps {
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}

const ABILITY_HINTS: Record<AbilityKey, string> = {
  str: "Warrior attack rolls and melee damage.",
  dex: "Armor Class, initiative, and Rogue attacks.",
  vit: "Maximum HP and Second Wind-style healing.",
  int: "Mage spellcasting and Intellect saves.",
  wis: "Cleric and Druid spellcasting; Wisdom saves.",
  spi: "Spirit saves and resource regeneration.",
};

/** Slot layout matching the design handoff's paper-doll grouping. Only main/armor/accessory are real today. */
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

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatItemStats(item: ReturnType<typeof getItem>): string | null {
  const parts: string[] = [];
  if (item.damageDice) {
    const ability = item.ability ?? BASIC_ATTACK.ability;
    const damageType = item.damageType ?? BASIC_ATTACK.damageType ?? "slashing";
    parts.push(`${item.damageDice} ${capitalize(damageType)} (${ABILITY_NAMES[ability]})`);
  }
  if (item.armorClassBonus) parts.push(`+${item.armorClassBonus} AC`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function EquipmentSlot({
  label,
  real,
  character,
  onUpdateCharacter,
}: {
  label: string;
  real?: ItemSlot;
  character: Character;
  onUpdateCharacter: (next: Character) => void;
}) {
  if (!real) {
    return (
      <div className="aow-slot aow-slot-disabled" title={`${label} — not available yet`}>
        <div className="aow-slot-icon">—</div>
        <span className="aow-slot-label">{label}</span>
      </div>
    );
  }

  const itemId = character.equipment[real];
  const item = itemId ? getItem(itemId) : undefined;
  const candidates = character.inventory
    .map((stack) => getItem(stack.itemId))
    .filter((candidate) => candidate.slot === real && candidate.id !== itemId);

  return (
    <div className="aow-slot aow-slot-real">
      <div className="aow-slot-icon" title={item ? `${item.name}${formatItemStats(item) ? ` — ${formatItemStats(item)}` : ""}` : `Nothing in ${label}`}>
        {item ? <ItemIcon itemId={item.id} slot={real} /> : <ItemSlotIcon slot={real} />}
      </div>
      <span className="aow-slot-label">{label}</span>
      {item && (
        <>
          <span className="aow-slot-item-name">{item.name}</span>
          <button type="button" className="aow-slot-action" onClick={() => onUpdateCharacter(unequipItem(character, real))}>
            Unequip
          </button>
        </>
      )}
      {candidates.length > 0 && (
        <select
          className="aow-slot-swap"
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
  );
}

const RESISTANCE_TONE: Record<string, string> = {
  resistant: "aow-resist-good",
  vulnerable: "aow-resist-bad",
  immune: "aow-resist-immune",
};

export function CharacterScreen({ character, onUpdateCharacter }: CharacterScreenProps) {
  const race = RACES[character.raceId];
  const cls = CLASSES[character.classId];
  const background = BACKGROUNDS[character.backgroundId];
  const originFeat = ORIGIN_FEATS[character.originFeatId];
  const resourceConfig = getClassResource(character.classId);

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100));
  const resourcePct = resourceConfig
    ? Math.max(0, Math.min(100, ((character.resource ?? 0) / resourceConfig.max) * 100))
    : 0;

  const weaponId = character.equipment.weapon;
  const weapon = weaponId ? getItem(weaponId) : undefined;

  type NotableDamageType = { type: DamageType; kind: "resistant" | "vulnerable" | "immune" };
  const notableDamageTypes: NotableDamageType[] = DAMAGE_TYPES.flatMap((type): NotableDamageType[] => {
    if (character.damageImmunities?.includes(type)) return [{ type, kind: "immune" }];
    if (character.damageResistances?.includes(type)) return [{ type, kind: "resistant" }];
    if (character.damageVulnerabilities?.includes(type)) return [{ type, kind: "vulnerable" }];
    return [];
  });

  return (
    <div className="aow-character">
      <p className="aow-eyebrow">
        {character.name.toUpperCase()} · LEVEL {character.level} {race?.name?.toUpperCase() ?? character.raceId.toUpperCase()}{" "}
        {cls?.name?.toUpperCase() ?? character.classId.toUpperCase()}
      </p>
      <h1 className="aow-h1">Character</h1>

      <div className="aow-character-grid">
        <div className="aow-character-col">
          <div className="aow-identity">
            <div className="aow-level-diamond">
              <span>{character.level}</span>
            </div>
            <div>
              <div className="aow-character-name">{character.name}</div>
              <div className="aow-character-sub">
                {race?.name ?? character.raceId} · {cls?.name ?? character.classId}
              </div>
            </div>
          </div>

          <div className="aow-bar-label">
            <span>HEALTH</span>
            <span>
              {character.hp} / {character.maxHp}
            </span>
          </div>
          <div className="aow-bar-track">
            <div className="aow-bar-fill hp" style={{ width: `${hpPct}%` }} />
          </div>

          {resourceConfig && (
            <>
              <div className="aow-bar-label" style={{ marginTop: 8 }}>
                <span>{resourceConfig.name.toUpperCase()}</span>
                <span>
                  {character.resource ?? 0} / {resourceConfig.max}
                </span>
              </div>
              <div className="aow-bar-track">
                <div className="aow-bar-fill mana" style={{ width: `${resourcePct}%` }} />
              </div>
            </>
          )}

          <div className="aow-panel aow-attributes-panel">
            <div className="aow-panel-header">ATTRIBUTES</div>
            <div className="aow-card-body aow-attr-list">
              {ABILITY_KEYS.map((key) => (
                <div key={key} className="aow-attr-row">
                  <div>
                    <div className="aow-attr-row-name">{ABILITY_NAMES[key]}</div>
                    <div className="aow-attr-row-hint">{ABILITY_HINTS[key]}</div>
                  </div>
                  <div className="aow-attr-row-value">
                    {character.abilityScores[key]}
                    <span className="aow-attr-row-mod">{formatModifier(abilityMod(character, key))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="aow-panel aow-character-col aow-equipment-panel">
          <div className="aow-panel-header">EQUIPMENT</div>
          <div className="aow-card-body aow-equipment-body">
            <div className="aow-equipment-columns">
              <div className="aow-equipment-column">
                {LEFT_SLOTS.map((slot) => (
                  <EquipmentSlot key={slot.id} label={slot.label} real={slot.real} character={character} onUpdateCharacter={onUpdateCharacter} />
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
                  <EquipmentSlot key={slot.id} label={slot.label} real={slot.real} character={character} onUpdateCharacter={onUpdateCharacter} />
                ))}
              </div>
            </div>
            <div className="aow-weapon-row">
              <EquipmentSlot label="Main Hand" real="weapon" character={character} onUpdateCharacter={onUpdateCharacter} />
              <EquipmentSlot label="Off Hand" character={character} onUpdateCharacter={onUpdateCharacter} />
            </div>
          </div>
        </div>

        <div className="aow-character-col">
          <div className="aow-panel">
            <div className="aow-panel-header">COMBAT</div>
            <div className="aow-card-body aow-stat-list">
              <div className="aow-stat-row">
                <span>Armor Class</span>
                <span>{character.armorClass}</span>
              </div>
              <div className="aow-stat-row">
                <span>Max HP</span>
                <span>{character.maxHp}</span>
              </div>
              <div className="aow-stat-row">
                <span>Proficiency Bonus</span>
                <span>{formatModifier(character.proficiencyBonus)}</span>
              </div>
              <div className="aow-stat-row">
                <span>Initiative</span>
                <span>{formatModifier(abilityMod(character, "dex"))}</span>
              </div>
              <div className="aow-stat-row">
                <span>Speed</span>
                <span>{race?.speed ?? 30} ft</span>
              </div>
              {weapon && (
                <div className="aow-stat-row">
                  <span>Weapon</span>
                  <span>{formatItemStats(weapon)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="aow-panel" style={{ marginTop: 14 }}>
            <div className="aow-panel-header">RESISTANCES</div>
            <div className="aow-card-body">
              {notableDamageTypes.length === 0 ? (
                <p className="aow-muted-text">No notable resistances or vulnerabilities.</p>
              ) : (
                <div className="aow-resist-list">
                  {notableDamageTypes.map(({ type, kind }) => (
                    <span key={type} className={`aow-resist-tag ${RESISTANCE_TONE[kind]}`}>
                      {capitalize(type)} · {capitalize(kind)}
                    </span>
                  ))}
                </div>
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
