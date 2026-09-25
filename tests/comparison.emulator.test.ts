import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { saveContent } from "@/lib/content/store";
import type { ComparisonMatch } from "@/lib/comparison/progression";
import { submitComparison } from "@/lib/comparison/submit";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const ops = "cmp-test-ops";
const uid = "cmp-test-user";
const people = Array.from({ length: 9 }, (_, index) => `cmp-p${index}`);
const statements = Array.from({ length: 8 }, (_, index) => `cmp-s${index}`);
const image = { path: "https://example.com/p.jpg", sourceUrl: "https://example.com/p", license: "public", rightsStatus: "cleared", credit: null };

function play(entrants: string[]): ComparisonMatch[] {
  const matches: ComparisonMatch[] = [];
  let field = entrants;
  for (let round = 1; field.length > 1; round += 1) {
    const next: string[] = [];
    for (let index = 0; index < field.length; index += 2) {
      matches.push({ round, leftId: field[index], rightId: field[index + 1], winner: index % 4 === 0 ? "left" : "right" });
      next.push(index % 4 === 0 ? field[index] : field[index + 1]);
    }
    field = next;
  }
  return matches;
}
const submit = (bracket: string, entrants: string[], question?: string) =>
  submitComparison(uid, { sessionId: crypto.randomUUID(), bracket, question: question as never, matches: play(entrants) });
const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => (error instanceof Error ? error.message : String(error)));

(enabled ? describe : describe.skip)("random world cup brackets", () => {
  beforeAll(async () => {
    await saveContent("sources", "cmp-source", { id: "cmp-source", kind: "article", title: "기사", publisher: "언론사", url: "https://example.com/cmp", publishedAt: "2024-01-01", license: "public", rightsStatus: "cleared" }, ops);
    for (const [index, id] of people.entries()) {
      // The last person has a photo but is not a game target.
      await saveContent("people", id, { id, name: `인물${index}`, summary: "국회의원", status: "published", image, playable: index < 8 }, ops);
    }
    for (const id of statements) {
      await saveContent("statements", id, { id, personId: "cmp-p0", quote: "원문", occurredAt: "2024-06-01", datePrecision: "day", kind: "remark", headline: "요약", context: "맥락", citations: [{ sourceId: "cmp-source" }], assertionType: "FACT", status: "published" }, ops);
    }
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const id of people) batch.delete(db.doc(`people/${id}`));
    for (const id of statements) {
      batch.delete(db.doc(`statements/${id}`));
      batch.delete(db.doc(`anchors/statement_${id}`));
    }
    batch.delete(db.doc("sources/cmp-source"));
    await batch.commit();
  });

  test("people and statements drawn at random are accepted with a fixed question", async () => {
    expect(await submit("auto-people", people.slice(0, 8), "more-punch")).toMatchObject({ accepted: 7, bracket: "auto-people" });
    expect(await submit("auto-statements", statements, "more-problematic")).toMatchObject({ accepted: 7 });
    const stored = await db.collection(`users/${uid}/comparisons`).where("bracket", "==", "auto-people").limit(1).get();
    expect(stored.docs[0].data()).toMatchObject({ kind: "person", question: "more-punch" });
  });

  test("a person who is not a game target, a wrong size or a question from another kind is refused", async () => {
    expect(await failure(submit("auto-people", [...people.slice(0, 7), "cmp-p8"], "more-cheer"))).toContain("not playable");
    expect(await failure(submit("auto-people", [...people.slice(0, 6), "cmp-p0", "cmp-p1"], "more-cheer"))).toBe("invalid-bracket-size");
    expect(await failure(submit("auto-people", people.slice(0, 8), "more-problematic"))).toBe("invalid-bracket-question");
    expect(await failure(submit("auto-statements", statements, undefined))).toBe("invalid-bracket-question");
  });

  test("stances are untouched", async () => {
    expect((await db.collection(`users/${uid}/stances`).get()).size).toBe(0);
  });
});
