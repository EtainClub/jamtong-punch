import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { saveContent } from "@/lib/content/store";
import { broadcastPending, type AnchorMessage } from "@/lib/anchor/broadcast";
import { payloadHash, statementPayload } from "@/lib/anchor/canonical";
import { statementSchema } from "@/content/schema";
import type { AnchorVersion } from "@/lib/anchor/versions";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const created: Array<[string, string]> = [];
const anchorRef = () => db.doc("anchors/statement_an-statement");
const versions = async () => ((await anchorRef().get()).get("versions") ?? []) as AnchorVersion[];

async function save(type: Parameters<typeof saveContent>[0], data: Record<string, unknown>) {
  created.push([type, String(data.id)]);
  return saveContent(type, String(data.id), data, "anchor-test");
}

const statement = (extra: Record<string, unknown> = {}) => ({
  id: "an-statement", personId: "an-person", occurredAt: "2023-06-26", datePrecision: "day", kind: "remark",
  headline: "요약", quote: "원문", context: "맥락", citations: [{ sourceId: "an-source", startSec: 0, endSec: 53, transcript: "구간 원문", transcriptOrigin: "auto-caption" }],
  assertionType: "FACT", status: "published", ...extra,
});

(enabled ? describe : describe.skip)("anchoring statements", () => {
  beforeAll(async () => {
    await save("sources", { id: "an-source", kind: "video", title: "영상", publisher: "채널", url: "https://youtube.com/shorts/HvE8UFhy0IA", publishedAt: "2023-06-26", video: { platform: "youtube", videoId: "HvE8UFhy0IA" }, license: "public", rightsStatus: "cleared" });
    await save("people", { id: "an-person", name: "가상정", summary: "작가", status: "published" });
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const [type, id] of created) batch.delete(db.doc(`${type}/${id}`));
    batch.delete(anchorRef());
    batch.delete(db.doc("system/anchors"));
    await batch.commit();
  });

  test("publishing queues the hash of exactly what is shown", async () => {
    await save("statements", statement());
    const [v1] = await versions();
    const expected = await payloadHash(statementPayload(statementSchema.parse(statement()), { "an-source": { url: "https://youtube.com/shorts/HvE8UFhy0IA", videoId: "HvE8UFhy0IA" } }));
    expect(v1).toMatchObject({ v: 1, op: "publish", hash: expected, prev: null, txId: null });
    expect((await anchorRef().get()).get("hasPending")).toBe(true);
  });

  test("saving without a visible change adds nothing; an edit adds a linked version", async () => {
    await save("statements", statement());
    expect(await versions()).toHaveLength(1);
    await save("statements", statement({ headline: "고친 요약" }));
    const [v1, v2] = await versions();
    expect(v2).toMatchObject({ v: 2, op: "update", prev: v1.hash });
    expect(v2.hash).not.toBe(v1.hash);
  });

  test("sends pending versions in order and records the transactions", async () => {
    const sent: AnchorMessage[] = [];
    const result = await broadcastPending(async (message) => { sent.push(message); return { txId: `tx-${message.v}`, blockNum: 100 + message.v }; });
    // Other test files share the emulator, so only this record's messages are asserted.
    expect(result.failed).toBe(0);
    const mine = sent.filter((message) => message.id === "an-statement");
    expect(mine.map((message) => [message.v, message.op])).toEqual([[1, "publish"], [2, "update"]]);
    expect(mine[1].prev).toBe(mine[0].h);
    expect((await versions()).map((version) => version.txId)).toEqual(["tx-1", "tx-2"]);
    expect((await anchorRef().get()).get("hasPending")).toBe(false);
  });

  test("a failed send keeps the version queued with its error", async () => {
    await save("statements", statement({ headline: "다시 고친 요약" }));
    const result = await broadcastPending(async () => { throw new Error("node down"); });
    expect(result.failed).toBeGreaterThanOrEqual(1);
    const v3 = (await versions())[2];
    expect(v3).toMatchObject({ txId: null, error: "node down" });
  });

  test("taking a record down leaves a retract link", async () => {
    await save("statements", statement({ headline: "다시 고친 요약", status: "archived" }));
    const all = await versions();
    expect(all.at(-1)).toMatchObject({ op: "retract", hash: null, prev: all[2].hash });
  });
});
