/**
 * Skill schools are purely presentational/flavor categorization (per the
 * design handoff's Radiant/Nature/Protection/Racial framing) -- an action's
 * `schoolId` is read only by the UI for coloring and labeling. No engine
 * mechanic ever branches on it.
 */

export type SchoolId = "radiant" | "nature" | "protection" | "arcane" | "martial" | "shadow" | "racial";

export interface School {
  id: SchoolId;
  name: string;
  /** Presentation-only accent color; never read by engine mechanics. */
  color: string;
}

export const SCHOOLS: Record<SchoolId, School> = {
  radiant: { id: "radiant", name: "Radiant", color: "#d9b865" },
  nature: { id: "nature", name: "Nature", color: "#86c46f" },
  protection: { id: "protection", name: "Protection", color: "#8fc6e6" },
  arcane: { id: "arcane", name: "Arcane", color: "#5fc4d6" },
  martial: { id: "martial", name: "Martial", color: "#c9887a" },
  shadow: { id: "shadow", name: "Shadow", color: "#a08bd0" },
  racial: { id: "racial", name: "Racial", color: "#b85c4a" },
};

export function getSchool(id: SchoolId): School {
  return SCHOOLS[id];
}
