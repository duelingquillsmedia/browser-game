import { useState } from "react";
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  BACKGROUNDS,
  CLASSES,
  ITEM_TEMPLATES,
  ORIGIN_FEATS,
  RACES,
  abilityMod,
  getItem,
  type Character,
  type ItemSlot,
} from "@eridan/engine";
import { HealthBar } from "../components/HealthBar";
import { ItemSlotIcon } from "../components/ItemSlotIcon";
import { ItemIcon } from "../components/ItemIcon";
import { TabBar } from "../components/TabBar";
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

const TABS = [
  { id: "race", label: "Race Traits" },
  { id: "background", label: "Background" },
  { id: "abilities", label: "Abilities" },
  { id: "equipment", label: "Equipment" },
];

/** Bag size for the boxed inventory grid; unused slots render as empty boxes. */
const BAG_SLOT_COUNT = 20;

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function CharacterSheetScreen({ character, onEquip, onUnequip, onBack }: CharacterSheetScreenProps) {
  const [activeTab, setActiveTab] = useState("race");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const race = RACES[character.raceId];
  const cls = CLASSES[character.classId];
  const background = BACKGROUNDS[character.backgroundId];
  const originFeat = ORIGIN_FEATS[character.originFeatId];

  const equippedIds = new Set(Object.values(character.equipment));
  const selectedStack = selectedItemId
    ? character.inventory.find((stack) => stack.itemId === selectedItemId)
    : undefined;
  const selectedItem = selectedStack ? getItem(selectedStack.itemId) : undefined;

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

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      <div className="tab-panel">
        {activeTab === "race" && (
          <>
            {race && <p className="flavor">{race.description}</p>}
            <div className="trait-list">
              {race?.traits.map((trait) => (
                <div key={trait.name} className="trait-card">
                  <h3>{trait.name}</h3>
                  <p className="flavor">{trait.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "background" && background && originFeat && (
          <div className="trait-list">
            <div className="trait-card">
              <h3>{background.name}</h3>
              <p className="flavor">{background.description}</p>
            </div>
            <div className="trait-card">
              <h3>Origin Feat: {originFeat.name}</h3>
              <p className="flavor">{originFeat.description}</p>
            </div>
          </div>
        )}

        {activeTab === "abilities" && (
          <>
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

            <h2>Actions</h2>
            <div className="trait-list">
              {character.actions.map((action) => (
                <div key={action.id} className="trait-card">
                  <h3>{action.name}</h3>
                  <p className="flavor">{action.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "equipment" && (
          <>
            <h2>Equipped</h2>
            <div className="equipped-row">
              {(Object.keys(SLOT_LABELS) as ItemSlot[]).map((slot) => {
                const itemId = character.equipment[slot];
                const item = itemId ? ITEM_TEMPLATES[itemId] : undefined;
                return (
                  <div key={slot} className="equipped-slot">
                    <button
                      type="button"
                      className={item ? "inventory-slot filled equipped" : "inventory-slot"}
                      title={item ? item.name : `Nothing in ${SLOT_LABELS[slot]}`}
                      onClick={() => item && onUnequip(slot)}
                    >
                      {item ? <ItemIcon itemId={item.id} slot={slot} /> : <ItemSlotIcon slot={slot} />}
                    </button>
                    <span className="slot-label">{SLOT_LABELS[slot]}</span>
                  </div>
                );
              })}
            </div>

            <div
              className="ribbon-banner ribbon-banner-inventory"
              style={{ backgroundImage: `url(${ribbonBannerInventory})` }}
            />
            <div className="inventory-grid">
              {Array.from({ length: Math.max(BAG_SLOT_COUNT, character.inventory.length) }).map((_, index) => {
                const stack = character.inventory[index];
                if (!stack) {
                  return <div key={`empty-${index}`} className="inventory-slot" />;
                }
                const item = getItem(stack.itemId);
                const isEquipped = equippedIds.has(stack.itemId);
                const isSelected = selectedItemId === stack.itemId;
                return (
                  <button
                    key={stack.itemId}
                    type="button"
                    className={
                      "inventory-slot filled" +
                      (isEquipped ? " equipped" : "") +
                      (isSelected ? " selected" : "")
                    }
                    title={item.name}
                    onClick={() => setSelectedItemId(isSelected ? null : stack.itemId)}
                  >
                    <ItemIcon itemId={item.id} slot={item.slot} />
                    {stack.quantity > 1 && <span className="quantity-badge">×{stack.quantity}</span>}
                  </button>
                );
              })}
            </div>

            {selectedItem && selectedStack && (
              <div className="item-detail-card">
                <div className="item-detail-icon">
                  <ItemIcon itemId={selectedItem.id} slot={selectedItem.slot} />
                </div>
                <div className="item-detail-body">
                  <h3>
                    {selectedItem.name}
                    {selectedStack.quantity > 1 && <span className="badge">×{selectedStack.quantity}</span>}
                    {equippedIds.has(selectedItem.id) && <span className="badge">Equipped</span>}
                  </h3>
                  <p className="flavor">
                    {selectedItem.description} · {SLOT_LABELS[selectedItem.slot]} · {selectedItem.value} gp
                  </p>
                  {equippedIds.has(selectedItem.id) ? (
                    <button type="button" className="ghost" onClick={() => onUnequip(selectedItem.slot)}>
                      Unequip
                    </button>
                  ) : (
                    <button type="button" className="action-button" onClick={() => onEquip(selectedItem.id)}>
                      Equip
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
