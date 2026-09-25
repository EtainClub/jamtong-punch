// A single-elimination bracket, as a pure check: the first round pairs the
// entrants in order, and every later round pairs the previous winners in
// order. Returns the champion; throws when the matches do not follow.
export type ComparisonMatch = { round: number; leftId: string; rightId: string; winner: "left" | "right" };

export const BRACKET_SIZES = [8, 16];

export function entrantsOf(matches: ComparisonMatch[]): string[] {
  return matches.filter((match) => match.round === 1).flatMap((match) => [match.leftId, match.rightId]);
}

export function validateProgression(entrants: string[], matches: ComparisonMatch[]): string {
  let contenders = [...entrants];
  let cursor = 0;
  let round = 1;
  while (contenders.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < contenders.length; index += 2) {
      const match = matches[cursor];
      if (!match) throw new Error("incomplete-bracket");
      if (match.round !== round || match.leftId !== contenders[index] || match.rightId !== contenders[index + 1]) throw new Error("invalid-bracket-match");
      next.push(match.winner === "left" ? match.leftId : match.rightId);
      cursor += 1;
    }
    contenders = next;
    round += 1;
  }
  if (cursor !== matches.length) throw new Error("invalid-bracket-match-count");
  return contenders[0];
}
