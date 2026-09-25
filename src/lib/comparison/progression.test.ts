import { describe, expect, test } from "vitest";
import { entrantsOf, validateProgression, type ComparisonMatch } from "./progression";

// Plays a bracket where the left side always wins.
function play(entrants: string[]): ComparisonMatch[] {
  const matches: ComparisonMatch[] = [];
  let field = entrants;
  for (let round = 1; field.length > 1; round += 1) {
    const next: string[] = [];
    for (let index = 0; index < field.length; index += 2) {
      matches.push({ round, leftId: field[index], rightId: field[index + 1], winner: "left" });
      next.push(field[index]);
    }
    field = next;
  }
  return matches;
}

const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("bracket progression", () => {
  test("a complete bracket names its champion and its entrants", () => {
    const matches = play(eight);
    expect(matches).toHaveLength(7);
    expect(validateProgression(eight, matches)).toBe("a");
    expect(entrantsOf(matches)).toEqual(eight);
  });

  test("rejects a winner that did not win the previous round", () => {
    const matches = play(eight);
    matches[4] = { ...matches[4], leftId: "b" };
    expect(() => validateProgression(eight, matches)).toThrow("invalid-bracket-match");
  });

  test("rejects a missing or an extra match", () => {
    const matches = play(eight);
    expect(() => validateProgression(eight, matches.slice(0, -1))).toThrow("incomplete-bracket");
    expect(() => validateProgression(eight, [...matches, matches[0]])).toThrow("invalid-bracket-match-count");
  });

  test("rejects a round number out of order", () => {
    const matches = play(eight);
    matches[3] = { ...matches[3], round: 2 };
    expect(() => validateProgression(eight, matches)).toThrow("invalid-bracket-match");
  });
});
