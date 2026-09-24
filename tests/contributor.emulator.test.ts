import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { type Actor, ContentError, deleteContent, listContentFor, pendingReviewCount, rejectContent, rejectedCountFor, saveContent } from "@/lib/content/store";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const ops: Actor = { uid: "cb-test-ops", isOps: true };
const alice: Actor = { uid: "cb-alice", isOps: false, nickname: "앨리스" };
const bob: Actor = { uid: "cb-bob", isOps: false, nickname: "밥" };
const ids: Array<[string, string]> = [["sources", "cb-source"], ["people", "cb-a"], ["people", "cb-new"], ["statements", "cb-s1"], ["statements", "cb-s2"], ["statements", "cb-s3"], ["events", "cb-event"]];

const refusal = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => (error instanceof ContentError ? error.status : error));
const statement = (id: string, status: string) => ({
  id, personId: "cb-a", quote: "원문", occurredAt: "2024-06-01", datePrecision: "day", kind: "remark", headline: "요약", context: "맥락",
  citations: [{ sourceId: "cb-source" }], assertionType: "FACT", status,
});

(enabled ? describe : describe.skip)("contributor rules", () => {
  beforeAll(async () => {
    await saveContent("sources", "cb-source", { id: "cb-source", kind: "article", title: "기사", publisher: "언론사", url: "https://example.com/cb", publishedAt: "2024-01-01", license: "public", rightsStatus: "cleared" }, ops);
    await saveContent("people", "cb-a", { id: "cb-a", name: "가나다", summary: "국회의원", status: "published" }, ops);
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const [type, id] of ids) batch.delete(db.doc(`${type}/${id}`));
    await batch.commit();
  });

  test("a contributor can submit for review but not publish", async () => {
    expect(await refusal(saveContent("statements", "cb-s1", statement("cb-s1", "published"), alice))).toBe(403);
    const saved = await saveContent("statements", "cb-s1", statement("cb-s1", "review"), alice);
    expect((saved as { status?: string }).status).toBe("review");
    const stored = await db.doc("statements/cb-s1").get();
    expect(stored.get("contributor")).toEqual({ uid: "cb-alice", nickname: "앨리스" });
    expect(stored.get("createdBy")).toBe("cb-alice");
  });

  test("a contributor cannot touch someone else's submission", async () => {
    expect(await refusal(saveContent("statements", "cb-s1", statement("cb-s1", "draft"), bob))).toBe(403);
    expect(await refusal(deleteContent("statements", "cb-s1", bob))).toBe(403);
  });

  test("operators keep the contributor credit when publishing, and the contributor loses edit rights", async () => {
    await saveContent("statements", "cb-s1", statement("cb-s1", "published"), ops);
    const stored = await db.doc("statements/cb-s1").get();
    expect(stored.get("contributor")).toEqual({ uid: "cb-alice", nickname: "앨리스" });
    expect(stored.get("createdBy")).toBe("cb-alice");
    expect(await refusal(saveContent("statements", "cb-s1", statement("cb-s1", "review"), alice))).toBe(403);
    expect(await refusal(deleteContent("statements", "cb-s1", alice))).toBe(403);
  });

  test("a contributor can register a person but not add a photo or edit published people", async () => {
    const image = { path: "https://example.com/p.jpg", sourceUrl: "https://example.com", license: "public", rightsStatus: "cleared", credit: null };
    expect(await refusal(saveContent("people", "cb-new", { id: "cb-new", name: "라마바", summary: "시민", status: "review", image }, alice))).toBe(403);
    await saveContent("people", "cb-new", { id: "cb-new", name: "라마바", summary: "시민", status: "review" }, alice);
    expect(await refusal(saveContent("people", "cb-a", { id: "cb-a", name: "가나다", summary: "시민", status: "review" }, alice))).toBe(403);
  });

  test("an operator sends a submission back with a note; the contributor fixes and resubmits", async () => {
    await saveContent("statements", "cb-s3", statement("cb-s3", "review"), alice);
    expect(await pendingReviewCount()).toBeGreaterThanOrEqual(1);
    expect(await refusal(rejectContent("statements", "cb-s3", "출처 구간을 확인해 주세요", alice))).toBe(403);
    expect(await refusal(rejectContent("statements", "cb-s3", "  ", ops))).toBe(400);
    expect(await refusal(saveContent("statements", "cb-s3", statement("cb-s3", "rejected"), ops))).toBe(400);
    await rejectContent("statements", "cb-s3", "출처 구간을 확인해 주세요", ops);
    expect(await rejectedCountFor("cb-alice")).toBe(1);
    const listed = (await listContentFor("statements", alice)).find((item) => item.id === "cb-s3");
    expect(listed).toMatchObject({ status: "rejected", rejection: { note: "출처 구간을 확인해 주세요", by: "cb-test-ops" } });

    // Bob cannot see or touch it; Alice can resubmit, and the note stays for the next review.
    expect((await listContentFor("statements", bob)).some((item) => item.id === "cb-s3")).toBe(false);
    expect(await refusal(saveContent("statements", "cb-s3", statement("cb-s3", "review"), bob))).toBe(403);
    await saveContent("statements", "cb-s3", statement("cb-s3", "review"), alice);
    expect((await db.doc("statements/cb-s3").get()).get("rejection.note")).toBe("출처 구간을 확인해 주세요");
    expect(await rejectedCountFor("cb-alice")).toBe(0);

    // Publishing clears it; public records cannot be rejected.
    await saveContent("statements", "cb-s3", statement("cb-s3", "published"), ops);
    expect((await db.doc("statements/cb-s3").get()).get("rejection")).toBeUndefined();
    expect(await refusal(rejectContent("statements", "cb-s3", "늦은 반려", ops))).toBe(409);
  });

  test("events stay with operators and contributor drafts can be withdrawn", async () => {
    expect(await refusal(saveContent("events", "cb-event", { id: "cb-event", title: "사건", occurredAt: "2024-05-01", datePrecision: "day", summary: "요약", status: "draft", participants: [], citations: [{ sourceId: "cb-source" }] }, alice))).toBe(403);
    await saveContent("statements", "cb-s2", statement("cb-s2", "draft"), alice);
    await deleteContent("statements", "cb-s2", alice);
    expect((await db.doc("statements/cb-s2").get()).exists).toBe(false);
  });
});
