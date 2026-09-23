import { Timestamp } from "firebase-admin/firestore";
import { requirePublishedBracket, requirePublishedStatement } from "@/lib/content/store";
import { db } from "@/lib/firebase/admin";
import type { ComparisonInput } from "@/lib/comparison/schema";

type ExpectedMatch = { round: number; leftId: string; rightId: string };

function expectedMatch(state: string[], round: number): ExpectedMatch[] {
  return state.reduce<ExpectedMatch[]>((matches, leftId, index) => {
    if (index % 2 === 0) matches.push({ round, leftId, rightId: state[index + 1] });
    return matches;
  }, []);
}

async function validateBracket(input: ComparisonInput) {
  const bracket = await requirePublishedBracket(input.bracket);
  for (const id of bracket.statementIds) await requirePublishedStatement(id);
  let contenders = [...bracket.statementIds];
  let cursor = 0;
  let round = 1;
  while (contenders.length > 1) {
    const expected = expectedMatch(contenders, round);
    const received = input.matches.slice(cursor, cursor + expected.length);
    if (received.length !== expected.length) throw new Error("incomplete-bracket");
    const next: string[] = [];
    for (let index = 0; index < expected.length; index += 1) {
      const match = received[index];
      const shape = expected[index];
      if (match.round !== shape.round || match.leftId !== shape.leftId || match.rightId !== shape.rightId) throw new Error("invalid-bracket-match");
      next.push(match.winner === "left" ? match.leftId : match.rightId);
    }
    cursor += expected.length;
    contenders = next;
    round += 1;
  }
  if (cursor !== input.matches.length) throw new Error("invalid-bracket-match-count");
  return bracket;
}

export async function submitComparison(uid: string, input: ComparisonInput) {
  const bracket = await validateBracket(input);
  const marker = db.doc(`users/${uid}/sessions/${input.sessionId}`);
  return db.runTransaction(async (tx) => {
    const previous = await tx.get(marker);
    if (previous.exists) return previous.get("result");
    const createdAt = Timestamp.now();
    input.matches.forEach((match, index) => tx.create(db.doc(`users/${uid}/comparisons/${input.sessionId}_${index}`), {
      bracket: bracket.id,
      question: bracket.questionId,
      ...match,
      createdAt,
    }));
    const result = { accepted: input.matches.length, bracket: bracket.id };
    tx.create(marker, { game: "worldcup", result, receivedAt: createdAt, expiresAt: Timestamp.fromMillis(createdAt.toMillis() + 30 * 86_400_000) });
    return result;
  });
}
