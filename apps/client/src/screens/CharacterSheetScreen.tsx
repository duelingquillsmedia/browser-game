import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  CLASSES,
  ITEM_TEMPLATES,
  RACES,
  abilityMod,
  getItem,
  type Character,
  type ItemSlot,
} from "@eridan/engine";
import { HealthBar } from "../components/HealthBar";
import { ItemSlotIcon } from "../components/ItemSlotIcon";
import ribbonBanner from "../assets/ui/ribbon-banner.png";
import ribbonBannerInventory from "../assets/ui/ribbon-banner-inventory.png";

export interface CharacterSheetScreenProps {
  character: Character;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: ItemSlot) => void;
  onBack: () => void;
}

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: "Weapon",
  armor: "Armor",
  accessory: "Accessory",
};

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function CharacterSheetScreen({ character, onEquip, onUnequip, onBack }: CharacterSheetScreenProps) {
  const race = RACES[character.raceId];
  const cls = CLASSES[character.classId];

  const equippedIds = new Set(Object.values(character.equipment));

  return (
    <div className="screen character-sheet-screen">
      <div className="ribbon-banner" style={{ backgroundImage: `url(${ribbonBanner})` }}>
        <span className="ribbon-banner-text">{character.name}</span>
        <button type="button" className="ribbon-banner-close" onClick={onBack} aria-label="Back to Town" />
      </div>
      <p className="subtitle">
        Level {character.level} {race?.name ?? character.raceId} {cls?.name ?? character.classId}
      </p>

      <h2>Vitals</h2>
      <div className="preview-card">
        <HealthBar hp={character.hp} maxHp={character.maxHp} />
        <div className="stat-row">
          <span>Armor Class</span>
          <span>{character.armorClass}</span>
        </div>
        <div className="stat-row">
          <span>Proficiency Bonus</span>
          <span>{formatModifier(character.proficiencyBonus)}</span>
        </div>
      </div>

      <h2>Ability Scores</h2>
      <div className="ability-grid">
        {ABILITY_KEYS.map((key) => (
          <div key={key} className="ability-row">
            <span>{ABILITY_NAMES[key]}</span>
            <span>
              {character.abilityScores[key]} ({formatModifier(abilityMod(character, key))})
            </span>
          </div>
        ))}
      </div>

      {race && race.traits.length > 0 && (
        <>
          <h2>Race Traits</h2>
          <div className="trait-list">
            {race.traits.map((trait) => (
              <div key={trait.name} className="trait-card">
                <h3>{trait.name}</h3>
                <p className="flavor">{trait.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Abilities</h2>
      <div className="trait-list">
        {character.actions.map((action) => (
          <div key={action.id} className="trait-card">
            <h3>{action.name}</h3>
            <p className="flavor">{action.description}</p>
          </div>
        ))}
      </div>

      <h2>Equipment</h2>
      <div className="equipment-grid">
        {(Object.keys(SLOT_LABELS) as ItemSlot[]).map((slot) => {
          const itemId = character.equipment[slot];
          const item = itemId ? ITEM_TEMPLATES[itemId] : undefined;
          return (
            <div key={slot} className="equipment-slot">
              <p className="location">
                <ItemSlotIcon slot={slot} />
                {SLOT_LABELS[slot]}
              </p>
              {item ? (
                <>
                  <h3>{item.name}</h3>
                  <p className="flavor">{item.description}</p>
                  <button type="button" className="ghost" onClick={() => onUnequip(slot)}>
                    Unequip
                  </button>
                </>
              ) : (
                <p className="flavor">Nothing equipped.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="ribbon-banner ribbon-banner-inventory" style={{ backgroundImage: `url(${ribbonBannerInventory})` }} />
      <div className="inventory-list">
        {character.inventory.length === 0 && <p className="flavor">Nothing in the bag.</p>}
        {character.inventory.map((stack) => {
          const item = getItem(stack.itemId);
          const isEquipped = equippedIds.has(stack.itemId);
          return (
            <div key={stack.itemId} className="inventory-row">
              <div className="inventory-row-icon">
                <ItemSlotIcon slot={item.slot} />
              </div>
              <div>
                <h3>
                  {item.name}
                  {stack.quantity > 1 && <span className="badge">×{stack.quantity}</span>}
                  {isEquipped && <span className="badge">Equipped</span>}
                </h3>
                <p className="flavor">
                  {item.description} · {SLOT_LABELS[item.slot]} · {item.value} gp
                </p>
              </div>
              <button
                type="button"
                className="action-button"
                disabled={isEquipped}
                onClick={() => onEquip(stack.itemId)}
              >
                {isEquipped ? "Equipped" : "Equip"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
