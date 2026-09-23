export const STANCES = ["punch", "cheer", "unknown"] as const;
export const GAMES = ["reflex", "swipe", "static"] as const;
export const KINDS = ["person", "statement"] as const;

export type Stance = (typeof STANCES)[number];
export type Game = (typeof GAMES)[number];
export type Kind = (typeof KINDS)[number];
export type PreviousStance = { stance: Stance; date: string; game?: Game };
export type StateEntry = { s: Stance; d: string };
export type Windows = Record<"d7" | "d30" | "all", Record<Stance, number>>;

// The public list index (`subjectStats/_index`) is one document read by the
// people directory. Statements grow into the thousands and are read per card,
// so only people are listed there. Ledgers written before statements existed
// carry no kind and are people.
export function listedInIndex(kind: Kind | undefined): boolean {
  return kind !== "statement";
}
