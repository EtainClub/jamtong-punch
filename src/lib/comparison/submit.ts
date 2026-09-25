import { Timestamp } from "firebase-admin/firestore";
import { requirePublishedBracket, requirePublishedStatement, requirePublishedTargets } from "@/lib/content/store";
import { db } from "@/lib/firebase/admin";
import { BRACKET_SIZES, entrantsOf, validateProgression } from "@/lib/comparison/progression";
import { AUTO_BRACKETS, type ComparisonInput } from "@/lib/comparison/schema";

type Resolved = { id: string; question: string; kind: "statement" | "person" };

async function resolveBracket(input: ComparisonInput): Promise<Resolved> {
  const auto = AUTO_BRACKETS[input.bracket as keyof typeof AUTO_BRACKETS];
  if (auto) {
    // A random draw: the entrants are whatever the first round names, so each
    // must be public (and a person playable), distinct, and 8 or 16 of them.
    const entrants = entrantsOf(input.matches);
    if (!BRACKET_SIZES.includes(entrants.length) || new Set(entrants).size !== entrants.length) throw new Error("invalid-bracket-size");
    if (!input.question || !(auto.questions as readonly string[]).includes(input.question)) throw new Error("invalid-bracket-question");
    await requirePublishedTargets(entrants.map((slug) => ({ kind: auto.kind, slug })));
    validateProgression(entrants, input.matches);
    return { id: input.bracket, question: input.question, kind: auto.kind };
  }
  const bracket = await requirePublishedBracket(input.bracket);
  for (const id of bracket.statementIds) await requirePublishedStatement(id);
  validateProgression(bracket.statementIds, input.matches);
  return { id: bracket.id, question: bracket.questionId, kind: "statement" };
}

// Picks go to the comparison ledger only, never to stances: a 16-entrant
// bracket must not move anyone's punch/cheer ratio 16 times.
export async function submitComparison(uid: string, input: ComparisonInput) {
  const bracket = await resolveBracket(input);
  const marker = db.doc(`users/${uid}/sessions/${input.sessionId}`);
  return db.runTransaction(async (tx) => {
    const previous = await tx.get(marker);
    if (previous.exists) return previous.get("result");
    const createdAt = Timestamp.now();
    input.matches.forEach((match, index) => tx.create(db.doc(`users/${uid}/comparisons/${input.sessionId}_${index}`), {
      bracket: bracket.id,
      question: bracket.question,
      kind: bracket.kind,
      ...match,
      createdAt,
    }));
    const result = { accepted: input.matches.length, bracket: bracket.id };
    tx.create(marker, { game: "worldcup", result, receivedAt: createdAt, expiresAt: Timestamp.fromMillis(createdAt.toMillis() + 30 * 86_400_000) });
    return result;
  });
}
