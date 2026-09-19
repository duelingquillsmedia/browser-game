/**
 * The SRD 5.2.1's Origin Feats — the ones granted by a Background at
 * character creation. (The free SRD only details four; General/Fighting
 * Style/Epic Boon feats are level-gated content this engine doesn't model.)
 */
export type OriginFeatId = "alert" | "magicInitiate" | "savageAttacker" | "skilled";

export interface OriginFeat {
  id: OriginFeatId;
  name: string;
  description: string;
}

export const ORIGIN_FEATS: Record<OriginFeatId, OriginFeat> = {
  alert: {
    id: "alert",
    name: "Alert",
    description: "Always ready for danger: add your proficiency bonus to initiative rolls.",
  },
  magicInitiate: {
    id: "magicInitiate",
    name: "Magic Initiate",
    description:
      "A dabbler's grasp of the arcane grants a minor spell — an at-will attack using the best of your " +
      "Intelligence, Wisdom, or Charisma.",
  },
  savageAttacker: {
    id: "savageAttacker",
    name: "Savage Attacker",
    description:
      "Trained to hit hard: once per turn when you hit with a weapon, roll its damage dice twice and use " +
      "either result.",
  },
  skilled: {
    id: "skilled",
    name: "Skilled",
    description: "Broadly trained: proficiency in three additional skills or tools of your choice.",
  },
};

export function getOriginFeat(id: OriginFeatId): OriginFeat {
  const feat = ORIGIN_FEATS[id];
  if (!feat) throw new Error(`Unknown origin feat: "${id}"`);
  return feat;
}
