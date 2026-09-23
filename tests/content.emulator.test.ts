import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { ContentError, deleteContent, getContent, saveContent } from "@/lib/content/store";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const actor = "content-test-ops";
const created: Array<[string, string]> = [];

async function save(type: Parameters<typeof saveContent>[0], data: Record<string, unknown>) {
  created.push([type, String(data.id)]);
  return saveContent(type, String(data.id), data, actor);
}

const person = (id: string, name: string, status = "published") => ({ id, name, summary: "국회의원", status });
const citation = { sourceId: "ct-source" };
const statement = (id: string, personId: string, quote: string, extra: Record<string, unknown> = {}) => ({
  id, personId, quote, occurredAt: "2024-06-01", datePrecision: "day", kind: "remark", headline: "요약", context: "맥락",
  citations: [citation], assertionType: "FACT", status: "published", ...extra,
});
const relationship = (id: string) => db.doc(`relationships/${id}`).get();
const refusal = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => (error instanceof ContentError ? error.status : error));

(enabled ? describe : describe.skip)("content store emulator", () => {
  beforeAll(async () => {
    await save("sources", { id: "ct-source", kind: "article", title: "기사", publisher: "언론사", url: "https://example.com/a", publishedAt: "2024-01-01", license: "public", rightsStatus: "cleared" });
    await save("people", person("ct-a", "김가나"));
    await save("people", person("ct-b", "이다라"));
    await save("people", person("ct-c", "박마바"));
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const [type, id] of created) batch.delete(db.doc(`${type}/${id}`));
    for (const id of ["ct-a__ct-b", "ct-a__ct-c", "ct-b__ct-c", "ct-a__ct-d", "ct-c__ct-d"]) batch.delete(db.doc(`relationships/${id}`));
    await batch.commit();
  });

  test("appearing together in an event does not connect people", async () => {
    await save("events", {
      id: "ct-event", title: "청문회", occurredAt: "2024-05-01", datePrecision: "day", summary: "요약", status: "published",
      participants: [{ personId: "ct-a", role: "principal" }, { personId: "ct-b", role: "participant" }],
      citations: [citation],
    });
    expect((await relationship("ct-a__ct-b")).exists).toBe(false);
  });

  test("naming someone in a quote connects the speaker to them", async () => {
    await save("statements", statement("ct-s1", "ct-c", "김가나 의원은 사과해야 합니다"));
    const pair = await relationship("ct-a__ct-c");
    expect(pair.get("evidence")[0]).toMatchObject({ type: "mention", id: "ct-s1", from: "ct-c" });
    expect((await db.doc("statements/ct-s1").get()).get("mentionedPersonIds")).toEqual(["ct-a"]);
    expect((await db.doc("people/ct-a").get()).get("counts.relations")).toBe(1);
  });

  test("an operator cannot add a mention that is not in the quote", async () => {
    expect(await refusal(saveContent("statements", "ct-x", statement("ct-x", "ct-c", "원문", { mentionedPersonIds: ["ct-b"] }), actor))).toBe(400);
    expect(await refusal(saveContent("people", "ct-x", { ...person("ct-x", "최라"), label: "친구" }, actor))).toBe(400);
    expect(await refusal(saveContent("people", "ct-x", { ...person("ct-x", "최라"), summary: "친명계 의원" }, actor))).toBe(400);
    expect(await getContent("people", "ct-x")).toBeNull();
  });

  test("a false match can be excluded", async () => {
    await save("statements", statement("ct-s1", "ct-c", "김가나 의원은 사과해야 합니다", { mentionExclusions: ["ct-a"] }));
    expect((await relationship("ct-a__ct-c")).exists).toBe(false);
    await save("statements", statement("ct-s1", "ct-c", "김가나 의원은 사과해야 합니다"));
    expect((await relationship("ct-a__ct-c")).exists).toBe(true);
  });

  test("a person registered later is linked to what was already said about them", async () => {
    await save("statements", statement("ct-s2", "ct-a", "최사아 장관의 답변을 기다립니다"));
    await save("people", person("ct-d", "최사아", "draft"));
    expect((await relationship("ct-a__ct-d")).exists).toBe(false);
    await save("people", person("ct-d", "최사아"));
    expect((await relationship("ct-a__ct-d")).get("counts")).toEqual({ mentions: 1, evaluations: 0 });
  });

  test("a registered evaluator's evaluation is also their own speech", async () => {
    await save("evaluations", {
      id: "ct-e1", targetPersonId: "ct-d", evaluator: { personId: "ct-c", name: "박마바", descriptor: "국회의원" }, occurredAt: "2024-07-01",
      datePrecision: "day", format: "column", claim: "박마바는 최사아가 책임이 있다고 말했다", citation, status: "published",
    });
    expect((await relationship("ct-c__ct-d")).get("evidence")[0]).toMatchObject({ type: "evaluation", from: "ct-c" });
  });

  test("keeps published references intact", async () => {
    expect(await refusal(save("people", { ...person("ct-a", "김가나"), status: "archived" }))).toBe(409);
    expect(await refusal(deleteContent("sources", "ct-source"))).toBe(409);
  });

  test("archiving the statement removes the edge it created", async () => {
    await save("statements", statement("ct-s1", "ct-c", "김가나 의원은 사과해야 합니다", { status: "archived" }));
    expect((await relationship("ct-a__ct-c")).exists).toBe(false);
    expect((await db.doc("people/ct-a").get()).get("counts.relations")).toBe(1);
  });
});
