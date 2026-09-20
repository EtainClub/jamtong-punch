export const STANCES = ["punch", "cheer", "unknown"] as const;
export const GAMES = ["reflex", "swipe", "static"] as const;
export const KINDS = ["person", "policy"] as const;

export type Stance = (typeof STANCES)[number];
export type Game = (typeof GAMES)[number];
export type Kind = (typeof KINDS)[number];
export type PreviousStance = { stance: Stance; date: string; game?: Game };
export type StateEntry = { s: Stance; d: string };
export type Windows = Record<"d7" | "d30" | "all", Record<Stance, number>>;
