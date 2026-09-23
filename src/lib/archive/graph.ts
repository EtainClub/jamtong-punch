import type { Relationship } from "@/content/schema";

// Deterministic ego-graph layout. The same relationships always produce the
// same picture, so a reader can come back and recognise it. No force
// simulation, no randomness, no colour: position encodes rank, stroke encodes
// how much was said, nothing encodes friend or foe.

export const MAX_NEIGHBOURS = 12;

export type GraphNode = { id: string; x: number; y: number; weight: number; pairId: string; stroke: 1 | 2 | 3 };
export type EgoGraph = { size: number; center: { x: number; y: number }; nodes: GraphNode[]; overflow: number };

// Fixed thresholds instead of relative ones: a line's thickness should mean
// the same thing on every person's page.
export function strokeLevel(weight: number): 1 | 2 | 3 {
  if (weight >= 6) return 3;
  if (weight >= 3) return 2;
  return 1;
}

export function neighbourOf(relationship: Pick<Relationship, "personIds">, personId: string): string {
  return relationship.personIds[0] === personId ? relationship.personIds[1] : relationship.personIds[0];
}

export function layoutEgoGraph(personId: string, relationships: Relationship[], visible: (id: string) => boolean, size = 360): EgoGraph {
  const ranked = relationships
    .map((relationship) => ({ relationship, id: neighbourOf(relationship, personId) }))
    .filter((item) => visible(item.id))
    .sort((left, right) => right.relationship.weight - left.relationship.weight || left.id.localeCompare(right.id));
  const shown = ranked.slice(0, MAX_NEIGHBOURS);
  const center = size / 2;
  const radius = size * 0.36;
  const nodes = shown.map(({ relationship, id }, index) => {
    // Strongest neighbour at twelve o'clock, then clockwise.
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / shown.length;
    return {
      id,
      x: Math.round((center + radius * Math.cos(angle)) * 10) / 10,
      y: Math.round((center + radius * Math.sin(angle)) * 10) / 10,
      weight: relationship.weight,
      pairId: relationship.pairId,
      stroke: strokeLevel(relationship.weight),
    };
  });
  return { size, center: { x: center, y: center }, nodes, overflow: ranked.length - shown.length };
}
