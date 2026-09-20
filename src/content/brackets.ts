import type { Bracket } from "@/content/schema";

export type PublishedBracket = Bracket & { status: "published" };

// A bracket has 8 or 16 unique record/policy IDs and is published with content.
export const brackets: readonly Bracket[] = [];
const byId = new Map(brackets.map((bracket) => [bracket.id, bracket]));

export function requirePublishedBracket(id: string): PublishedBracket {
  const bracket = byId.get(id);
  if (!bracket || bracket.status !== "published") throw new Error(`unknown or unpublished bracket: ${id}`);
  if (bracket.items.length !== 8 && bracket.items.length !== 16) throw new Error(`invalid bracket size: ${id}`);
  if (new Set(bracket.items.map((item) => item.id)).size !== bracket.items.length) throw new Error(`duplicate bracket item: ${id}`);
  return bracket as PublishedBracket;
}
