import warriorMeleeAttack from "../assets/ability-icons/warrior-melee-attack.png";
import warriorRangedAttack from "../assets/ability-icons/warrior-ranged-attack.png";
import warriorEnrage from "../assets/ability-icons/warrior-enrage.png";
import warriorCleave from "../assets/ability-icons/warrior-cleave.png";
import warriorSerratedBlade from "../assets/ability-icons/warrior-serrated-blade.png";
import warriorFuriousStrike from "../assets/ability-icons/warrior-furious-strike.png";
import warriorBulwarkStance from "../assets/ability-icons/warrior-bulwark-stance.png";
import warriorWarlordsReckoning from "../assets/ability-icons/warrior-warlords-reckoning.png";
import rangerMeleeAttack from "../assets/ability-icons/ranger-melee-attack.png";
import rangerRangedAttack from "../assets/ability-icons/ranger-ranged-attack.png";
import rangerBarbedArrow from "../assets/ability-icons/ranger-barbed-arrow.png";
import rangerNaturesRemedy from "../assets/ability-icons/ranger-natures-remedy.png";
import rangerPinningShot from "../assets/ability-icons/ranger-pinning-shot.png";
import rangerKillShot from "../assets/ability-icons/ranger-kill-shot.png";
import rangerEvasiveManeuvers from "../assets/ability-icons/ranger-evasive-maneuvers.png";

/**
 * Painted ability-icon art, keyed by class id then by an action's own
 * `familyId` (shared across every rank of a ranked ability) falling back to
 * its plain `id` for a single-rank ability -- the same `familyId ?? id` key
 * every other rank-collapsing lookup in this codebase already uses (see
 * `applyEquipmentEffects` in character.ts). The two Basic Attack ids
 * (`strike-melee`/`strike-ranged`) are shared by every class, which is
 * exactly why this is keyed per-class rather than one flat map -- Warrior's
 * Wild Swing and Ranger's Blade Slash need different art under the same id.
 *
 * Only Warrior (full 6-ability + both Basic Attacks) and Ranger (5 of 6
 * named abilities, both Basic Attacks -- Sharpshooter is the only one
 * still without an icon) have art so far; every other class/ability falls
 * back to the existing text-glyph treatment (see `getAbilityIcon` below).
 */
export const ABILITY_ICONS_BY_CLASS: Record<string, Record<string, string>> = {
  warrior: {
    "strike-melee": warriorMeleeAttack,
    "strike-ranged": warriorRangedAttack,
    enrage: warriorEnrage,
    cleave: warriorCleave,
    "serrated-blade": warriorSerratedBlade,
    "furious-strike": warriorFuriousStrike,
    "bulwark-stance": warriorBulwarkStance,
    "warlords-reckoning": warriorWarlordsReckoning,
  },
  ranger: {
    "strike-melee": rangerMeleeAttack,
    "strike-ranged": rangerRangedAttack,
    "barbed-arrow": rangerBarbedArrow,
    "natures-remedy": rangerNaturesRemedy,
    "pinning-shot": rangerPinningShot,
    "kill-shot": rangerKillShot,
    "evasive-maneuvers": rangerEvasiveManeuvers,
  },
};

/** The painted icon for this class/action, if any art exists for it yet -- undefined falls back to the text-glyph treatment. */
export function getAbilityIcon(classId: string | undefined, action: { id: string; familyId?: string }): string | undefined {
  if (!classId) return undefined;
  return ABILITY_ICONS_BY_CLASS[classId]?.[action.familyId ?? action.id];
}
