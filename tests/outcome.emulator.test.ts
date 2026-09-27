import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/lib/firebase/admin";
import { saveContent } from "@/lib/content/store";
import type { AnchorVersion } from "@/lib/anchor/versions";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const created: Array<[string, string]> = [];

async function save(type: Parameters<typeof saveContent>[0], data: Record<string, unknown>) {
  created.push([type, String(data.id)]);
  return saveContent(type, String(data.id), data, "outcome-test");
}

const statement = (status: string) => ({
  id: "oc-statement", personId: "oc-person", occurredAt: "2026-02-14", datePrecision: "day", kind: "sns",
  headline: "요약", quote: "원문", context: "맥락", citations: [{ sourceId: "oc-article" }], assertionType: "CLAIM", status,
});
const outcome = (extra: Record<string, unknown> = {}) => ({
  id: "oc-outcome", subject: { type: "statement", id: "oc-statement" }, asOf: "2026-06-30",
  summary: "상반기 서울 착공은 1만3121호였다.", figures: [{ label: "상반기 착공", value: "1만3121호" }],
  citations: [{ sourceId: "oc-data" }], status: "published", ...extra,
});

(enabled ? describe : describe.skip)("outcomes", () => {
  beforeAll(async () => {
    await save("sources", { id: "oc-article", kind: "article", title: "기사", publisher: "신문", url: "https://example.com/a", publishedAt: "2026-02-14", license: "quotable", rightsStatus: "pending" });
    await save("sources", { id: "oc-data", kind: "document", title: "통계", publisher: "국토교통부", url: "https://example.com/stat", publishedAt: "2026-07-31", license: "public", rightsStatus: "cleared" });
    await save("sources", { id: "oc-link", kind: "article", title: "링크만", publisher: "신문", url: "https://example.com/l", publishedAt: "2026-07-31", license: "link-only", rightsStatus: "pending" });
    await save("people", { id: "oc-person", name: "가결과", summary: "국회의원", status: "published" });
    await save("statements", statement("review"));
  });

  afterAll(async () => {
    const batch = db.batch();
    for (const [type, id] of created) batch.delete(db.doc(`${type}/${id}`));
    batch.delete(db.doc("anchors/outcome_oc-outcome"));
    batch.delete(db.doc("anchors/statement_oc-statement"));
    await batch.commit();
  });

  test("cannot be published while the record it follows is not", async () => {
    await expect(save("outcomes", outcome())).rejects.toThrow(/unpublished statements/);
  });

  test("need a source whose content can be shown", async () => {
    await save("statements", statement("published"));
    await expect(save("outcomes", outcome({ citations: [{ sourceId: "oc-link" }] }))).rejects.toThrow(/usable source/);
  });

  test("are anchored when published and keep the record they follow public", async () => {
    await save("outcomes", outcome());
    const versions = ((await db.doc("anchors/outcome_oc-outcome").get()).get("versions") ?? []) as AnchorVersion[];
    expect(versions[0]).toMatchObject({ v: 1, op: "publish" });
    expect((await db.doc("outcomes/oc-outcome").get()).get("sourceIds")).toEqual(["oc-data"]);
    await expect(save("statements", statement("archived"))).rejects.toThrow(/outcomes\/oc-outcome/);
  });
});
